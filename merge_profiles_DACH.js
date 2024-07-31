const fs = require('fs');
const path = require('path');
const csvStream = require('csv-write-stream');
const JSONStream = require('JSONStream');
const { v4: uuidv4 } = require('uuid');
const es = require('event-stream');
const { profile } = require('console');
const merge = require('lodash.merge');

const inputFolder = './input/';
const outputFolder = './output/';
const MAX_USERS_PER_FILE = 180000; // 180 mila utenti
let profilesByEmail = new Map();

const clubMapping = {
    "DE APTA": "optinAptamil",
    "DE MILUPA": "optinMilupa",
    "DE NUTRICIA": "optinNutricia",
    "DE LOPROFIN": "optinLoprofin",
    "DE ACTIVIA": "optinActivia",
    "DE VOLVIC": "optinVolvic",
    "DE YOPRO": "optinYoPro",
    "DE ACTIMEL": "optinActimel",
    "DE DANONINO": "optinDanonino"
};

const getMostRecentConsent = (preferences) => {
    let mostRecentConsent = null;

    for (const key in preferences) {
        if (preferences[key]?.lastConsentModified) {
            if (!mostRecentConsent || new Date(preferences[key].lastConsentModified) > new Date(mostRecentConsent.lastConsentModified)) {
                mostRecentConsent = preferences[key];
            }
        }
    }

    return mostRecentConsent;
};


const createOptinPreference = (mostRecentConsent) => ({
    isConsentGranted: true,
    lastConsentModified: mostRecentConsent?.lastConsentModified || new Date().toISOString(),
    entitlements: [],
    actionTimestamp: mostRecentConsent?.actionTimestamp || new Date().toISOString(),
    docDate: mostRecentConsent?.docDate || "2020-09-21T00:00:00Z",
    customData: mostRecentConsent?.customData || [],
    tags: mostRecentConsent?.tags || []
});

const processOptin = (profile, res) => {
    const preferences = profile.preferences;
    const clubKey = clubMapping[profile.data.clubId];

    if (clubKey) {
        const mostRecentConsent = getMostRecentConsent(preferences);
        res.preferences[clubKey] = createOptinPreference(mostRecentConsent);

        for (const entitlement in preferences) {
            if (preferences[entitlement].isConsentGranted) {
                res.preferences[clubKey].entitlements.push(entitlement);
            }
        }
    }
};

// loadOptin è una funzione che prende un profilo e restituisce un profilo con i dati di optin aggiornati
// Se il profilo ha un clubId che corrisponde a un clubMapping, viene aggiunto un optin per quel club
// Se il profilo ha altri profili con lo stesso email, vengono aggiunti gli optin per quei club
// Se il profilo ha più optin per lo stesso club, viene aggiunto solo l'optin più recente
const loadOptin = async (winner, others) => {
    const preferencesA = winner?.preferences;
    const newUID = uuidv4();
    const res = {
        ...winner,
        UID: newUID,
        preferences: {
            terms: {
                TermsOfUse_v2: {
                    isConsentGranted: true,
                    actionTimestamp: preferencesA?.terms?.TermsOfUse?.actionTimestamp || new Date().toISOString(),
                    lastConsentModified: preferencesA?.terms?.TermsOfUse?.lastConsentModified || new Date().toISOString(),
                    entitlements: preferencesA?.terms?.TermsOfUse?.entitlements || [],
                    docDate: preferencesA?.terms?.TermsOfUse?.docDate || "2020-09-21T00:00:00Z",
                    customData: preferencesA?.terms?.TermsOfUse?.customData || [],
                    tags: preferencesA?.terms?.TermsOfUse?.tags || []
                }
            }
        }
    };
    processOptin(winner, res, clubMapping);
    for (const otherProfile of others) {
        processOptin(otherProfile, res, clubMapping);
    }

    return res;
};

const writeToFile = async (oldDataStream, mergedStream, winner, others, res) => {
    oldDataStream.write({
        old_UID: winner?.UID,
        old_clubId: winner?.data?.clubId,
        new_UID: res?.UID,
        new_clubId: winner?.data?.clubId,
        email: winner?.profile?.email.toLowerCase()
    });

    for (const otherProfile of others) {
        oldDataStream.write({
            old_UID: otherProfile?.UID,
            old_clubId: otherProfile?.data?.clubId,
            new_UID: res?.UID,
            new_clubId: winner?.data?.clubId,
            email: winner?.profile?.email.toLowerCase()
        });
        processOptin(otherProfile, res, clubMapping);
    }

    if (res) {
        mergedStream.write(res);
    } else {
        console.error('Undefined result when trying to write to mergedStream:', res);
    }
};

// mergeTechnicalFields è una funzione che prende due profili e restituisce un profilo combinato
// I campi tecnici vengono combinati in base alla data di aggiornamento
// Alcuni campi vengono combinati in base alla priorità
// Altri vengono concatenati con un pipe se non sono già presenti
const mergeTechnicalFields = (user1, user2) => {
    const fields = [
        'regSource',
        'cMarketingCode',
        'typeOfMember',
        'clubId',
        'brand',
        'division',
        'region',
        'countryDivision',
        'lastSystemUpdatedProfile',
        'preferredLanguage'
    ];

    fields.forEach(field => {
        if (user1.data[field] && user2.data[field]) {
            if (['regSource', 'cMarketingCode', 'brand'].includes(field)) {
                if (!user1.data[field].includes('|')) {
                    user1.data[field] = `|${user1.data[field]}|${user2.data[field]}`;
                } else {
                    user1.data[field] = `${user1.data[field]}|${user2.data[field]}`;
                }
            } else if (field === 'typeOfMember') {
                const valuesPriority = ['HCP', 'Carer', 'Patient', 'Consumer'];
                const user1Index = valuesPriority.indexOf(user1.data[field]);
                const user2Index = valuesPriority.indexOf(user2.data[field]);
                user1.data[field] = user1Index < user2Index ? user1.data[field] : user2.data[field];
            } else {
                user1.data[field] = new Date(user1.lastUpdated) > new Date(user2.lastUpdated) ? user1.data[field] : user2.data[field];
            }
        } else {
            user1.data[field] = user1.data[field] || user2.data[field];
        }
    });

    // Imposta valori fissi per division, region, e countryDivision
    user1.data.division = "SN";
    user1.data.region = "EMEA";
    user1.data.countryDivision = "DE";

    // Aggiorna lastUpdated se necessario
    if (new Date(user1.lastUpdated) < new Date(user2.lastUpdated)) {
        user1.lastUpdated = user2.lastUpdated;
    }

    // Aggiorna clubId se necessario
    if (new Date(user1.created) > new Date(user2.created)) {
        user1.data.clubId = user2.data.clubId;
    }

    return user1;
};

// mergeChildren è una funzione che prende due profili e restituisce un array di figli combinati
// I figli vengono combinati in base alla data di nascita o alla data di parto
// Se la differenza tra le date è inferiore a 9 mesi, il figlio più giovane viene scartato
// Se la differenza è maggiore di 9 mesi, entrambi i figli vengono mantenuti
// Se un figlio ha una data di nascita e l'altro ha una data di parto, la data di parto viene considerata come data di nascita
const mergeChildren = (accDataChildren, currDataChildren) => {

    let mergedChildren = [...accDataChildren.data.children];
    const lastUpdated1 = new Date(accDataChildren.lastUpdated);
    const lastUpdated2 = new Date(currDataChildren.lastUpdated);
    currDataChildren.data.children.forEach(child2 => {
        let shouldAddChild2 = true;

        mergedChildren = mergedChildren.filter(child1 => {
            const date1 = child1.dateOfBirth ? new Date(child1.dateOfBirth) : new Date(child1.dueDate);
            const date2 = child2.dateOfBirth ? new Date(child2.dateOfBirth) : new Date(child2.dueDate);

            if (date1.getTime() === date2.getTime()) {

                if (lastUpdated1 < lastUpdated2) {
                    return false; // Remove child1
                } else {
                    shouldAddChild2 = false; // Do not add child2
                }
            }
            return true;
        });

        if (shouldAddChild2) {
            mergedChildren.push(child2);
        }
    });

    mergedChildren.sort((a, b) => {
        const dateA = a.dateOfBirth ? new Date(a.dateOfBirth) : new Date(a.dueDate);
        const dateB = b.dateOfBirth ? new Date(b.dateOfBirth) : new Date(b.dueDate);
        return dateA - dateB;
    });

    mergedChildren.forEach((child, index) => {
        child.isFirstBaby = index === 0 ? 1 : 0;
    });

    return mergedChildren;
};

// mergeAddresses è una funzione che prende due profili e restituisce un array di indirizzi combinati
const mergeAddresses = (accDataAddresses, currDataAddresses) => {
    let mergedAddresses = [];

    let addressMap = {};
    const addOrUpdateOrder = (address) => {
        if (addressMap[address.id]) {
            addressMap[address.id] = { ...addressMap[address.id], ...address };
        } else {
            addressMap[address.id] = { ...address };
        }
    };

    accDataAddresses.data.addresses.forEach(address => addOrUpdateOrder(address));
    currDataAddresses.data.addresses.forEach(address => addOrUpdateOrder(address));

    mergedAddresses = Object.values(addressMap);

    return mergedAddresses;
};

const mergeOrders = (accDataOrders, currDataOrders) => {
    let mergedOrders = [];

    let orderMap = {};
    const addOrUpdateOrder = (order) => {
        if (orderMap[order.id]) {
            orderMap[order.id] = { ...orderMap[order.id], ...order };
        } else {
            orderMap[order.id] = { ...order};
        }
    };

    accDataOrders.data.orders.forEach(order => addOrUpdateOrder(order));
    currDataOrders.data.orders.forEach(order => addOrUpdateOrder(order));

    mergedOrders = Object.values(orderMap);

    return mergedOrders;
};

const processProfile = async (profiles, mergedStream, oldDataStream) => {
    let [mergedProfile, winningProfile, others] = await buildProfiles(profiles[0], profiles);
    await writeToFile(oldDataStream, mergedStream, winningProfile, others, mergedProfile);
};

const buildProfiles = async (profile, profilesToMerge) => {
    let losingProfile = null;
    let others = [];
    let winningProfile = profile;
    let lastUpdatedProfile = profile;
    for (let i = 1; i < profilesToMerge.length; i++) {
        [winningProfile, losingProfile] = mergeUsers(winningProfile, profilesToMerge[i]);
        if (new Date(winningProfile.lastUpdated) > new Date(lastUpdatedProfile.lastUpdated)) {
            lastUpdatedProfile = winningProfile;
        } else {
            lastUpdatedProfile = losingProfile;
        }
        others.push(losingProfile);
    }
    winningProfile = mergeTechnicalFields(winningProfile, lastUpdatedProfile);
    let mergedProfile = await loadOptin(winningProfile, others);
    return [mergedProfile, winningProfile, others];
};

const byIsLiteAndByLastUpdated = (a, b) => {
    if (a.hasLiteAccount && b.isRegistered) {
        return -1;
    } else if (a.isRegistered && b.hasLiteAccount) {
        return 1;
    } else {
        return new Date(a.lastUpdated) - new Date(b.lastUpdated);
    }
};

const toOneApplyingMergeRules = () => {
    const typeOfMemberRegistry = new Map();
    return (acc, curr) => {
        if (curr.data.typeOfMember !== undefined) {
            typeOfMemberRegistry.set(curr.data.clubId, curr.data.typeOfMember);
        }
        if (JSON.stringify(acc) === "{}") {
            return curr;
        }
        curr.data ??= {};
        curr.data.children &&= mergeChildren(acc, curr);
        curr.data.addresses &&= mergeAddresses(acc, curr);
        curr.data.orders &&= mergeOrders(acc, curr);
        curr.data.clubId &&= clubIdRule(acc, curr);
        curr.data.regSource &&= concatFieldRule(acc.data, curr.data, 'regSource');
        curr.data.cMarketingCode &&= concatFieldRule(acc.data, curr.data, 'cMarketingCode');
        curr.data.brand &&= concatFieldRule(acc.data, curr.data, 'brand');
        curr.data.division = "SN";
        curr.data.region = "EMEA";
        curr.data.countryDivision = "DE";
        curr.data.typeOfMember &&= typeOfMemberRule(typeOfMemberRegistry);
        return merge({}, acc, curr);
    }
};

/**
 * 
 * @param {*} accData  The accumulator data
 * @param {*} currData  The current data
 * @param {*} field  The field to concatenate
 * @returns  The concatenated field
 */
const concatFieldRule = (accData, currData, field) => {
    return accData[field].includes(currData[field]) ? accData[field] : `${accData[field]}|${currData[field]}`
}

/**
 * 
 * @param {Map} registry  The registry of type of members
 * @returns  The type of member
 */
const typeOfMemberRule = (registry) => {
    if (registry.has("DE NUTRICIA")) {
        return registry.get("DE NUTRICIA");
    } else if (registry.has("DE LOPROFIN")) {
        return registry.get("DE LOPROFIN");
    } else if (registry.has("DE APTA")) {
        return registry.get("DE APTA");
    } else if (registry.has("DE MILUPA")) {
        return registry.get("DE MILUPA");
    }
}

const clubIdRule = (acc, curr) => {
    if (curr?.data?.clubId !== undefined) {
        if (acc.created < curr.created) {
            return acc.data.clubId;
        } else {
            return curr.data.clubId;
        }
    }
}


const optinsToEntitlementsOfDomainOptins = profile => {
    const optinKey = clubMapping[profile.data.clubId];
    if (optinKey) {
        profile.preferences[optinKey] = createOptinPreference(getMostRecentConsent(profile.preferences));
    }
    for (const entitlement in profile.preferences) {
        if (entitlement !== 'terms' && entitlement !== optinKey) {
            if (profile.preferences[entitlement].isConsentGranted) {
                profile.preferences[optinKey].entitlements.push(entitlement);
            }
            delete profile.preferences[entitlement];
        }
    }
    return profile;
};
/**
 * @param {object[]} profilesToMerge
 */
const mergeProfilesDACH = (profilesToMerge) => {
    profilesToMerge.forEach(fillArrayWithSource);
    let res = profilesToMerge
        .sort(byIsLiteAndByLastUpdated)
        .map(optinsToEntitlementsOfDomainOptins)
        .reduce(toOneApplyingMergeRules(), {});
    res.preferences.terms !== undefined ? res.preferences.terms.TermsOfUse_v2 = res?.preferences?.terms?.TermsOfUse : null;

    return res;
};

const createNewOutputFile = (type, index) => {
    const fileName = type === 'json' ? `user-user-DE-merged_${index}.json` : `oldData_merged_profile.csv`;
    const filePath = path.join(outputFolder, fileName);
    const fileStream = type === 'json' ? JSONStream.stringify('[\n', ',\n', '\n]\n') : csvStream();
    const outputStream = fs.createWriteStream(filePath);
    fileStream.pipe(outputStream);
    return { fileStream, outputStream };
};
const fillArrayWithSource = profile => {
    const source = profile.domain;
    profile.data.children &&= fillArrayWithSourceHelper(profile.data.children, source);
    profile.data.addresses &&= fillArrayWithSourceHelper(profile.data.addresses, source);
    profile.data.orders &&= fillArrayWithSourceHelper(profile.data.orders, source);
    profile.data.abbandonatedCart &&= fillArrayWithSourceHelper(profile.data.abbandonatedCart, source);
    profile.data.events &&= fillArrayWithSourceHelper(profile.data.events, source);
    return profile;
}
const fillArrayWithSourceHelper = (array, source) => {
    return array.map(item => ({ ...item, source }));
}
const mergeProfiles = async () => {
    let userCount = 0;
    let fileIndex = 1;

    let { fileStream: mergedStream, outputStream: mergedOutput } = createNewOutputFile('json', fileIndex);
    let { fileStream: oldDataStream, outputStream: oldDataOutput } = createNewOutputFile('csv', fileIndex);

    for (const [email, profiles] of profilesByEmail) {
        if (userCount >= MAX_USERS_PER_FILE) {
            console.log(`Processed ${userCount} users, creating new output JSON file.`);
            mergedStream.end();
            fileIndex++;
            userCount = 0;

            ({ fileStream: mergedStream, outputStream: mergedOutput } = createNewOutputFile('json', fileIndex));
        }

        if (profiles.length > 1) {
            await processProfile(profiles, mergedStream, oldDataStream);
        } else {
            await processProfile([profiles[0]], mergedStream, oldDataStream);
        }
        profilesByEmail.delete(email);
        userCount++;
    }

    await generateGigyaInput(mergedStream, oldDataStream);

    console.log("All profiles have been merged and files have been written.");
};

const generateGigyaInput = async (mergedStream, oldDataStream) => {
    console.log('Generating gigya input array');
    await new Promise(resolve => {
        mergedStream.on('finish', resolve);
        mergedStream.end();
    });
    await new Promise(resolve => {
        oldDataStream.on('finish', resolve);
        oldDataStream.end();
    });
};

const readAndProcessFiles = async () => {
    console.log("readAndProcessFiles: Starting to read files from input folder");
    const files = await fs.promises.readdir(inputFolder);

    for (const file of files) {
        const fullPath = path.join(inputFolder, file);
        console.log("Reading file:", fullPath);

        await new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(fullPath, { encoding: 'utf8' });
            const jsonParser = JSONStream.parse('*');
            readStream.pipe(jsonParser)
                .pipe(es.mapSync((jsonObject) => {
                    if (!profilesByEmail.has(jsonObject.profile.email.toLowerCase())) {
                        profilesByEmail.set(jsonObject.profile.email.toLowerCase(), []);
                    }
                    profilesByEmail.get(jsonObject.profile.email.toLowerCase()).push(jsonObject);
                }))
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`Finished reading ${fullPath}`);
    }

    if (profilesByEmail.size > 0) {
        await mergeProfiles();
    }

    console.log("All files have been read.");
};

/*
(async () => {
    console.log("Starting the merging process");
    await readAndProcessFiles();
    console.log("Merging process completed");
})();
*/

module.exports = {
    getMostRecentConsent,
    createOptinPreference,
    processOptin,
    loadOptin,
    mergeTechnicalFields,
    mergeChildren,
    mergeAddresses,
    mergeOrders,
    determineWinningProfile,
    mergeUsers,
    processProfile,
    buildProfiles,
    mergeProfiles,
    generateGigyaInput,
    readAndProcessFiles,
    mergeProfilesDACH
};

