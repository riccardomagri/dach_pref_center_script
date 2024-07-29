const { describe, test, expect } = require('@jest/globals');

const {
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
    readAndProcessFiles
} = require('../merge_profiles_DE.js');

const { v4: uuidv4 } = require('uuid');

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

describe('Profile Merging', () => {

    // Helper function to create a test profile
    const createTestProfile = (overrides = {}) => ({
        UID: overrides.UID || uuidv4(),
        data: {
            clubId: overrides?.data?.clubId || 'DE APTA',
            children: overrides.data?.children || [],
            addresses: overrides.data?.addresses || [],
            orders: overrides.data?.orders || [],
            regSource: overrides.data?.regSource || 'Website',
            cMarketingCode: overrides.data?.cMarketingCode || 'standard',
            typeOfMember: overrides.data?.typeOfMember || 'Consumer',
            brand: overrides.data?.brand || 'Aptamil',
            division: 'SN',
            region: 'EMEA',
            countryDivision: 'DE',
            lastSystemUpdatedProfile: overrides.lastSystemUpdatedProfile || new Date().toISOString(),
            preferredLanguage: overrides.data?.preferredLanguage || 'de_de',
            created: overrides.created || new Date().toISOString()
        },
        preferences: overrides.preferences || {},
        isRegistered: overrides.isRegistered || false,
        hasLiteAccount: overrides.hasLiteAccount || true,
        lastUpdated: overrides.lastUpdated || new Date().toISOString()
    });

    test('determineWinningProfile should keep FULL profile over LITE', () => {
        const fullProfile = createTestProfile({ isRegistered: true, hasLiteAccount: false });
        const liteProfile = createTestProfile({ isRegistered: false, hasLiteAccount: true });
        const [winner, loser] = determineWinningProfile(fullProfile, liteProfile);

        expect(winner).toBe(fullProfile);
        expect(loser).toBe(liteProfile);
    });

    test('determineWinningProfile should keep most recent FULL profile', () => {
        const olderFullProfile = createTestProfile({ isRegistered: true, hasLiteAccount: false, lastUpdated: '2023-01-01T00:00:00Z' });
        const newerFullProfile = createTestProfile({ isRegistered: true, hasLiteAccount: false, lastUpdated: '2023-02-01T00:00:00Z' });
        const [winner, loser] = determineWinningProfile(olderFullProfile, newerFullProfile);

        expect(winner).toBe(newerFullProfile);
        expect(loser).toBe(olderFullProfile);
    });

    test('determineWinningProfile should keep most recent LITE profile when both are LITE', () => {
        const olderLiteProfile = createTestProfile({ isRegistered: false, hasLiteAccount: true, lastUpdated: '2023-01-01T00:00:00Z' });
        const newerLiteProfile = createTestProfile({ isRegistered: false, hasLiteAccount: true, lastUpdated: '2023-02-01T00:00:00Z' });
        const [winner, loser] = determineWinningProfile(olderLiteProfile, newerLiteProfile);

        expect(winner).toBe(newerLiteProfile);
        expect(loser).toBe(olderLiteProfile);
    });

    test('mergeTechnicalFields should keep most recent field values', () => {
        const profile1 = createTestProfile({
            data: {
                regSource: 'Website',
                cMarketingCode: 'standard',
                typeOfMember: 'Consumer'
            },
            lastUpdated: '2023-01-01T00:00:00Z'
        });
        const profile2 = createTestProfile({
            data: {
                regSource: 'Offline',
                cMarketingCode: 'survey',
                typeOfMember: 'Patient'
            },
            lastUpdated: '2023-02-01T00:00:00Z'
        });

        const mergedProfile = mergeTechnicalFields(profile1, profile2);

        expect(mergedProfile.data.regSource).toBe('Offline');
        expect(mergedProfile.data.cMarketingCode).toBe('survey');
        expect(mergedProfile.data.typeOfMember).toBe('Patient');
    });

    test('mergeChildren should correctly merge children objects', () => {
        const profile1 = createTestProfile({
            data: {
                children: [
                    { dateOfBirth: '2022-01-01' }
                ]
            }
        });
        const profile2 = createTestProfile({
            data: {
                children: [
                    { dateOfBirth: '2022-01-01' },
                    { dateOfBirth: '2023-01-01' }
                ]
            }
        });

        const mergedChildren = mergeChildren(profile1, profile2);

        expect(mergedChildren.length).toBe(2);
    });

    test('mergeChildren should handle overlapping children dates', () => {
        const profile1 = createTestProfile({
            data: {
                children: [
                    { dateOfBirth: '2022-01-01' },
                    { dueDate: '2023-02-01' }
                ]
            }
        });
        const profile2 = createTestProfile({
            data: {
                children: [
                    { dateOfBirth: '2022-01-15' },
                    { dueDate: '2023-01-01' }
                ]
            }
        });
        console.log(profile1);
        console.log(profile2);

        const mergedChildren = mergeChildren(profile1, profile2);

        expect(mergedChildren.length).toBe(2);
    });

    test('mergeAddresses should correctly merge addresses objects', () => {
        const profile1 = createTestProfile({
            data: {
                addresses: [
                    { addressLine: 'Address 1' }
                ]
            }
        });
        const profile2 = createTestProfile({
            data: {
                addresses: [
                    { addressLine: 'Address 2' }
                ]
            }
        });

        const mergedAddresses = mergeAddresses(profile1, profile2);

        expect(mergedAddresses.length).toBe(2);
    });

    test('mergeOrders should correctly merge orders objects', () => {
        const profile1 = createTestProfile({
            data: {
                clubId: 'DE APTA',
                orders: [
                    { id: 'order1' }
                ]
            }
        });
        const profile2 = createTestProfile({
            data: {
                clubId: 'DE MILUPA',
                orders: [
                    { id: 'order2' }
                ]
            }
        });

        const mergedOrders = mergeOrders(profile1, profile2);

        expect(mergedOrders.length).toBe(2);
    });

    test('processProfile should correctly process a profile', async () => {
        const profile1 = createTestProfile({
            data: {
                clubId: 'DE APTA',
                children: [{ dateOfBirth: '2022-01-01' }],
                addresses: [{ addressLine: 'Address 1' }],
                orders: [{ id: 'order1' }]
            },
            preferences: { optinEmail: { isConsentGranted: true, lastConsentModified: '2023-01-01T00:00:00Z' } }
        });
        const profile2 = createTestProfile({
            data: {
                clubId: 'DE MILUPA',
                children: [{ dateOfBirth: '2023-01-01' }],
                addresses: [{ addressLine: 'Address 2' }],
                orders: [{ id: 'order2' }]
            },
            preferences: { optinEmail: { isConsentGranted: true, lastConsentModified: '2023-02-01T00:00:00Z' } }
        });

        const mergedStream = { write: jest.fn(), end: jest.fn() };
        const oldDataStream = { write: jest.fn(), end: jest.fn() };

        await processProfile([profile1, profile2], mergedStream, oldDataStream);

        expect(mergedStream.write).toHaveBeenCalled();
        expect(oldDataStream.write).toHaveBeenCalled();
    });

    test('processOptin should correctly process optin preferences', () => {
        const profile = createTestProfile({
            data: {
                clubId: 'DE APTA',
            },
            preferences: {
                optinEmail: { isConsentGranted: true, lastConsentModified: '2023-01-01T00:00:00Z' },
                optinPostal: { isConsentGranted: true, lastConsentModified: '2023-02-01T00:00:00Z' }
            }
        });

        const result = {
            preferences: {}
        };

        processOptin(profile, result, clubMapping);

        expect(result.preferences.optinAptamil).toBeDefined();
        expect(result.preferences.optinAptamil.entitlements).toContain('optinEmail');
        expect(result.preferences.optinAptamil.entitlements).toContain('optinPostal');
    });

    test('createOptinPreference should create a valid optin preference', () => {
        const mostRecentConsent = {
            lastConsentModified: '2023-01-01T00:00:00Z',
            actionTimestamp: '2023-01-01T00:00:00Z',
            docDate: '2023-01-01T00:00:00Z',
            customData: [],
            tags: []
        };

        const optinPreference = createOptinPreference(mostRecentConsent);

        expect(optinPreference.isConsentGranted).toBe(true);
        expect(optinPreference.lastConsentModified).toBe(mostRecentConsent.lastConsentModified);
        expect(optinPreference.actionTimestamp).toBe(mostRecentConsent.actionTimestamp);
    });

    test('getMostRecentConsent should return the most recent consent', () => {
        const preferences = {
            optinEmail: { lastConsentModified: '2023-01-01T00:00:00Z' },
            optinPostal: { lastConsentModified: '2023-02-01T00:00:00Z' }
        };

        const mostRecentConsent = getMostRecentConsent(preferences);

        expect(mostRecentConsent.lastConsentModified).toBe('2023-02-01T00:00:00Z');
    });

});
