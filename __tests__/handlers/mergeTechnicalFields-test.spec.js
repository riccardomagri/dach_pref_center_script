const { mergeProfilesDACH } = require('../../merge_profiles_DACH.js');
const { createTestProfileFull, createTestProfileLite } = require('../utility.js');
const { expect } = require('@jest/globals');

describe('DACH PREF merge technical fields', () => {
    test('Profile1 FULL vs Profile2 LITE', () => {
        const Profile1 = createTestProfileFull({
            data: {
                regSource: 'OFFLINE',
                clubId: 'DE LOPROFIN',
                cMarketingCode: 'standard',
                typeOfMember: 'Patient',
                brand: 'Loprofin',
                division: 'SN',
                region: 'EMEA',
                countryDivision: 'DE',
                preferredLanguage: 'de_de',
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            data: {
                regSource: 'Website',
                clubId: 'DE APTA',
                cMarketingCode: 'DoNotContact',
                typeOfMember: 'HCP',
                brand: 'Aptamil',
                division: 'SN',
                region: 'EMEA',
                countryDivision: 'DE',
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                regSource: 'OFFLINE',
                clubId: 'DE LOPROFIN',
                cMarketingCode: 'standard|DoNotContact',
                typeOfMember: 'Patient',
                brand: 'Loprofin|Aptamil',
                division: 'SN',
                region: 'EMEA',
                countryDivision: 'DE',
                preferredLanguage: 'de_de',
            }),
            isRegistered: true,
            lastUpdated: '2021-02-01T00:00:00.000Z'
        }));
    });
});