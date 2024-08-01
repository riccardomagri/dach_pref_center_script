const fs = require('fs');
const { Writable } = require('stream')
const path = require('path');
const csvStream = require('csv-write-stream');
const JSONStream = require('JSONStream');
const es = require('event-stream');
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

/** 
*  An object representing the user
 * @typedef {Object} Profile
 * @property {Data} data - Object containing the user info
 * @property {Preferences} preferences 
 */

/**
 * @typedef {Object} Data 
 * @property {Object[]} children
 * @property {Object[]} addresses
 */

/**
 * An object containing the optins
 * @typedef {Object} Preferences 
 * @property {Object} terms - Object containing the terms of use
 * @property {Optin} [optin$] - a generic optin where $ is the optin name
 */

/**
 * @typedef {Object} Optin
 * @property {boolean} isConsentGranted
 */



/**
 * @param {Preferences} preferences 
 * @returns {Optin}
 */
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


/**
 * @param {Optin} mostRecentConsent 
 * @returns {Optin} 
 */
const createOptinPreference = (mostRecentConsent) => ({
    isConsentGranted: true,
    lastConsentModified: mostRecentConsent?.lastConsentModified || new Date().toISOString(),
    entitlements: [],
    actionTimestamp: mostRecentConsent?.actionTimestamp || new Date().toISOString(),
    docDate: mostRecentConsent?.docDate || "2020-09-21T00:00:00Z",
    customData: mostRecentConsent?.customData || [],
    tags: mostRecentConsent?.tags || []
});


/**
 * 
 * @param {Writable} outputCsvStreamWriter 
 * @param {Writable} mergedJsonStreamWriter 
 * @param {Profile} mergedProfile 
 * @param {Profile[]} originalProfiles 
 */
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
 * @param {Profile} accDataChildren
 * @param {Profile} currDataChildren
 * @return {Object[]} children
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


/**
 * 
 * @param {Profile} acc 
 * @param {Profile} curr 
 * @param {string} field 
 * @returns {Object[]} 
 */
const concatArrays = (acc, curr, field) => {
    return [...acc.data[field], ...curr.data[field]];
}


/**
 * @param {Profile} a 
 * @param {Profile} b 
 * @returns {number} 
 */
const byIsLiteAndByLastUpdated = (a, b) => {
    if (a.hasLiteAccount && b.isRegistered) {
        return -1;
    } else if (a.isRegistered && b.hasLiteAccount) {
        return 1;
    } else {
        return new Date(a.lastUpdated) - new Date(b.lastUpdated);
    }
};

/**
 * @returns {(acc: Profile, curr: Profile) => Profile} - reducer function
 */
const toOneApplyingMergeRules = () => {
    const ruler = new Ruler();
    return (acc, curr) => {
        curr.data ??= {};
        curr.data.children &&= mergeChildren(acc, curr);
        curr.data.addresses &&= concatArrays(acc, curr, 'addresses');
        curr.data.orders &&= concatArrays(acc, curr, 'orders');
        curr.data.clubId &&= clubIdRule(acc, curr);
        curr.data.regSource &&= concatFieldRule(acc, curr, 'regSource');
        curr.data.cMarketingCode &&= concatFieldRule(acc, curr, 'cMarketingCode');
        curr.data.brand &&= concatFieldRule(acc, curr, 'brand');
        curr.data.division = "SN";
        curr.data.region = "EMEA";
        curr.data.countryDivision = "DE";
        curr.data.typeOfMember &&= ruler.applyTypeOfMemberRule(acc, curr);
        return merge({}, acc, curr);
    }
};

/**
 * 
 * @param {Profile} acc  The accumulator data
 * @param {Profile} curr  The current data
 * @param {string} field  The field to concatenate
 * @returns  The concatenated field
 */
const concatFieldRule = (acc, curr, field) => {

    if (acc.data[field] === 'Migrated') {
        return acc.data[field];
    }
    
    return acc.data[field].includes(curr.data[field])
        ? acc.data[field]
        : `${acc.data[field]}|${curr.data[field]}`;
}


/**
 * 
 * @param {string} data 
 * @param {string} clubId 
 * @returns 
 */
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
 * create an object remembering some info
 * of the object received as arguments in its methods
 */
class Ruler {
    #typeOfMemberRegistry = new Map();
    applyTypeOfMemberRule(...profiles) {
        profiles.filter(profile => profile.data.typeOfMember !== undefined).forEach(profile =>
            this.#typeOfMemberRegistry.set(profile.data.clubId, profile.data.typeOfMember)
        );

        if (this.#typeOfMemberRegistry.has("DE NUTRICIA")) {
            return this.#typeOfMemberRegistry.get("DE NUTRICIA");
        } else if (this.#typeOfMemberRegistry.has("DE LOPROFIN")) {
            return this.#typeOfMemberRegistry.get("DE LOPROFIN");
        } else if (this.#typeOfMemberRegistry.has("DE APTA")) {
            return this.#typeOfMemberRegistry.get("DE APTA");
        } else if (this.#typeOfMemberRegistry.has("DE MILUPA")) {
            return this.#typeOfMemberRegistry.get("DE MILUPA");
        }
    }
}

/**
 * 
 * @param {Profile} acc 
 * @param {Profile} curr 
 * @returns {string} 
 */
const clubIdRule = (acc, curr) => {
    if (curr?.data?.clubId !== undefined) {
        if (acc.created < curr.created) {
            return acc.data.clubId;
        } else {
            return curr.data.clubId;
        }
    }
}


/**
 * 
 * @param {Profile} profile 
 * @returns {Profile}
 */
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
 * @param {Profile[]} profilesToMerge - a list of profile to merge, each profile has different clubId
 * @returns {Profile} the merged profile
 */
const mergeProfilesDACH = (profilesToMerge) => {
    let mergedProfile = profilesToMerge
        .sort(byIsLiteAndByLastUpdated)
        .map(fillArrayWithSourceAndNormalizeFields)
        .map(optinsToEntitlementsOfDomainOptins)
        .reduce(toOneApplyingMergeRules());
    mergedProfile.preferences.terms !== undefined ? mergedProfile.preferences.terms.TermsOfUse_v2 = mergedProfile?.preferences?.terms?.TermsOfUse : null;

    return mergedProfile;
};

/**
 * 
 * @param {string} type 
 * @param {number} index 
 * @returns 
 */
const createNewOutputFile = (type, index) => {
    const fileName = type === 'json' ? `user-DE-merged_${index}.json` : `oldData_merged_profile.csv`;
    const filePath = path.join(outputFolder, fileName);
    const fileStream = type === 'json' ? JSONStream.stringify('[\n', ',\n', '\n]\n') : csvStream();
    const outputStream = fs.createWriteStream(filePath);
    fileStream.pipe(outputStream);
    return { fileStream, outputStream };
};

/**
 * 
 * @param {Profile} profile 
 * @returns {Profile} 
 */
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


/**
 * ```
 * 1. read the Map where the profiles to merge are loaded
 * 2. write the merged profile on json and csv on /output folder
 * 3. delete the Map entry to save memory
 * ```
 */
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

/**
 * close the Writable streams 
 * @param {Writable} mergedStream 
 * @param {Writable} oldDataStream 
 */
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

/**
 * ```
 * 1. read each file in the /input folder 
 * 2. for each file store the profile in an array of a Map using the email as key
 * 3. call the function that will consume that Map 
 * ```
 */
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


module.exports = {
    getMostRecentConsent,
    createOptinPreference,
    mergeChildren,
    mergeProfiles,
    generateGigyaInput,
    readAndProcessFiles,
    mergeProfilesDACH
};

