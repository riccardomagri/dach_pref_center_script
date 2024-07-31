const { v4: uuidv4 } = require('uuid');
const merge = require('lodash.merge');

const createTestProfile = (overrides = {}) => {
    let profile = {
    UID: overrides.UID || uuidv4(),
    data: {
        clubId: 'DE APTA',
        children: [],
        addresses: [],
        orders: [],
        typeOfMember: 'Consumer',
        division: 'SN',
        region: 'EMEA',
        countryDivision: 'DE',
        lastSystemUpdatedProfile: new Date().toISOString(),
        created: new Date().toISOString()
    },
    preferences: {'terms' : {'TermsOfUse': {'isConsentGranted': true}}},
    isRegistered: false,
    hasLiteAccount: false,
    lastUpdated: new Date().toISOString()
}
    merge(profile, overrides);
    return profile;
};

const createTestProfileFull = (overrides = {}) => createTestProfile({ isRegistered: true, hasLiteAccount: false, ...overrides });
const createTestProfileLite = (overrides = {}) => createTestProfile({ isRegistered: false, hasLiteAccount: true, ...overrides });

module.exports = { createTestProfile, createTestProfileFull, createTestProfileLite };