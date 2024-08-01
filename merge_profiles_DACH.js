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


const writeToFile = async (outputCsvStreamWriter, mergedJsonStreamWriter, mergedProfile, originalProfiles) => {
    outputCsvStreamWriter.write({
        old_UID: mergedProfile?.UID,
        old_clubId: mergedProfile?.data?.clubId,
        new_UID: mergedProfile?.UID,
        new_clubId: mergedProfile?.data?.clubId,
        email: mergedProfile?.profile?.email.toLowerCase()
    });

    for (const otherProfile of originalProfiles) {
        outputCsvStreamWriter.write({
            old_UID: otherProfile?.UID,
            old_clubId: otherProfile?.data?.clubId,
            new_UID: mergedProfile?.UID,
            new_clubId: mergedProfile?.data?.clubId,
            email: mergedProfile?.profile?.email.toLowerCase()
        });
    }

    if (mergedProfile) {
        mergedJsonStreamWriter.write(mergedProfile);
    } else {
        console.error('Undefined result when trying to write to mergedStream:', res);
    }
};

/**
 * mergeChildren è una funzione che prende due profili e restituisce un array di figli combinati
 * I figli vengono combinati in base alla data di nascita o alla data di parto 
 * Se la differenza tra le date è inferiore a 9 mesi, il figlio più giovane viene scartato
 * Se un figlio ha una data di nascita e l'altro ha una data di parto, la data di parto viene considerata come data di nascita
 */
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


const mergeArrays = (accData, currData, field) => {
    let mergedArray = [...accData.data[field], ...currData.data[field]];

    return mergedArray;
}


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
        curr.data.addresses &&= mergeArrays(acc, curr, 'addresses');
        curr.data.orders &&= mergeArrays(acc, curr, 'orders');
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

    if (accData[field] === 'Migrated') {
        return accData[field];
    }
    
    return accData[field].includes(currData[field]) ? accData[field] : `${accData[field]}|${currData[field]}`;
}


const normalizeField = (data, clubId) => {
    if(data === 'HCCarer') {
        data = "Carer";
    } else if(data === 'HCPatient') {
        data = "Patient";
    } else if(data === undefined && (clubId === 'DE NUTRICIA' || clubId === 'DE LOPROFIN')) {
        data = "Patient";
    } else if([undefined, 'C'].includes(data) && (clubId === 'DE APTA' || clubId === 'DE MILUPA')) {
        data = "Consumer";
    } if (['OFFLINES', 'Offlines', 'OFFLINE'].includes(data)) {
        return 'Offline';
    } else if (['Hebnews Mailchinp', 'HebnewsMailchinp'].includes(data)) {
        return 'Hebnews Mailchimp';
    } else if(data === 'Migrated') {
        return undefined;
    }
    return data;
};


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
    let mergedProfile = profilesToMerge
        .sort(byIsLiteAndByLastUpdated)
        .map(fillArrayWithSourceAndNormalizeFields)
        .map(optinsToEntitlementsOfDomainOptins)
        .reduce(toOneApplyingMergeRules(), {});
    mergedProfile.preferences.terms !== undefined ? mergedProfile.preferences.terms.TermsOfUse_v2 = mergedProfile?.preferences?.terms?.TermsOfUse : null;

    return mergedProfile;
};

const createNewOutputFile = (type, index) => {
    const fileName = type === 'json' ? `user-DE-merged_${index}.json` : `oldData_merged_profile.csv`;
    const filePath = path.join(outputFolder, fileName);
    const fileStream = type === 'json' ? JSONStream.stringify('[\n', ',\n', '\n]\n') : csvStream();
    const outputStream = fs.createWriteStream(filePath);
    fileStream.pipe(outputStream);
    return { fileStream, outputStream };
};
const fillArrayWithSourceAndNormalizeFields = profile => {
    const source = profile.domain;
    profile.data.cMarketingCode &&= normalizeField(profile.data.cMarketingCode, profile.data.clubId);
    profile.data.regSource &&= normalizeField(profile.data.regSource, profile.data.clubId);
    profile.data.typeOfMember &&= normalizeField(profile.data.typeOfMember, profile.data.clubId);
    profile.data.children &&= profile.data.children.map(child => ({ ...child, source }));
    profile.data.addresses &&= profile.data.addresses.map(address => ({ ...address, source }));
    profile.data.orders &&= profile.data.orders.map(order => ({ ...order, source }));
    profile.data.abbandonatedCart &&= profile.data.abbandonatedCart.map(cart => ({ ...cart, source }));
    profile.data.events &&= profile.data.events.map(event => ({ ...event, source }));
    return profile;
}

const mergeProfiles = async () => {
    let userCount = 0;
    let fileIndex = 1;
    let mergedProfile = {};

    let { fileStream: mergedJsonStreamWriter, outputStream: mergedOutput } = createNewOutputFile('json', fileIndex);
    let { fileStream: outputCsvStreamWriter, outputStream: oldDataOutput } = createNewOutputFile('csv', fileIndex);

    for (const [email, originalProfiles] of profilesByEmail) {
        if (userCount >= MAX_USERS_PER_FILE) {
            console.log(`Processed ${userCount} users, creating new output JSON file.`);
            mergedJsonStreamWriter.end();
            fileIndex++;
            userCount = 0;

            ({ fileStream: mergedJsonStreamWriter, outputStream: mergedOutput } = createNewOutputFile('json', fileIndex));
        }

        if (originalProfiles.length >= 1) {
            mergedProfile = mergeProfilesDACH(originalProfiles);
        }

        await writeToFile(outputCsvStreamWriter, mergedJsonStreamWriter, mergedProfile, originalProfiles);

        profilesByEmail.delete(email);
        userCount++;
    }

    await generateGigyaInput(mergedJsonStreamWriter, outputCsvStreamWriter);

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
    mergeChildren,
    mergeProfiles,
    generateGigyaInput,
    readAndProcessFiles,
    mergeProfilesDACH
};

