const { mergeProfilesDACH } = require('../../merge_profiles_DACH.js');
const { createTestProfileFull, createTestProfileLite } = require('../utility.js');
const { expect } = require('@jest/globals');

describe('DACH PREF merge technical fields', () => {
    test('Profile1 FULL vs Profile2 LITE', () => {
        const Profile1 = createTestProfileFull({
            data: {
                division: 'Pluto',
                region: 'Topolino',
                countryDivision: 'Disney',
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            data: {
                division: 'Pippo',
                region: 'Paperino',
                countryDivision: 'Paperopoli',
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                division: 'SN',
                region: 'EMEA',
                countryDivision: 'DE',
            }),
            isRegistered: true,
            lastUpdated: '2021-02-01T00:00:00.000Z'
        }));
    });
    test('Concatenation of technical fields', () => {
        const Profile1 = createTestProfileFull({
            data: {
                regSource: 'OFFLINE',
                cMarketingCode: 'WelcomePackage',
                brand: 'Loprofin',
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            data: {
                regSource: 'Website',
                cMarketingCode: 'standard',
                brand: "Aptamil"
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                regSource: 'Website|Offline',
                cMarketingCode: 'standard|WelcomePackage',
                brand: "Aptamil|Loprofin"
            }),
            lastUpdated: '2021-02-01T00:00:00.000Z'
        }));
    });
    test('Concatenation of technical fields with 3 profiles', () => {
        const Profile1 = createTestProfileFull({
            data: {
                regSource: 'OFFLINE',
                cMarketingCode: 'WelcomePackage',
                brand: 'Loprofin',
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            data: {
                regSource: 'Website',
                cMarketingCode: 'standard',
                brand: "Aptamil"
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileLite({
            data: {
                regSource: 'Phone',
                cMarketingCode: 'Migrated',
                brand: "Milupa"
            },
            lastUpdated: '2021-03-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                regSource: 'Website|Phone|Offline',
                cMarketingCode: 'standard|WelcomePackage',
                brand: "Aptamil|Milupa|Loprofin"
            })
        }));
    });
    test('Concatenation of same technical fields with 2 profiles', () => {
        const Profile1 = createTestProfileFull({
            data: {
                regSource: 'OFFLINE',
                cMarketingCode: 'WelcomePackage',
                brand: 'Loprofin',
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            data: {
                regSource: 'OFFLINE',
                cMarketingCode: 'WelcomePackage',
                brand: 'Loprofin'
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                regSource: 'Offline',
                cMarketingCode: 'WelcomePackage',
                brand: 'Loprofin'
            })
        }));
    });
    test('Profile 1 with missing technical fields vs Profile 2 with filled technical fields', () => {
        const Profile1 = createTestProfileFull({
            data: {},
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            data: {
                regSource: 'OFFLINE',
                cMarketingCode: 'WelcomePackage',
                brand: 'Loprofin'
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                regSource: 'Offline',
                cMarketingCode: 'WelcomePackage',
                brand: 'Loprofin'
            })
        }));
    });
    test('Profile 1 with missing technical fields vs Profile 2 with missing technical fields', () => {
        const Profile1 = createTestProfileFull({
            data: {},
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            data: {},
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.not.objectContaining({
                regSource : expect.anything(), 
                cMarketingCode : expect.anything(),
                brand : expect.anything()}),
        }));
    });
    test('Test typeOfMember field with 2 profiles DENUTRICIA vs DELOPROFIN', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA',
                typeOfMember: 'HCP'
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN',
                typeOfMember: 'HCPatient'
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                typeOfMember: 'HCP'
            })
        }));
    });
    test('Test typeOfMember field with 2 profiles DENUTRICIA (consumer) vs DELOPROFIN', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA',
                typeOfMember: 'Consumer'
            },
            lastUpdated: '2021-01-01T01:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN',
                typeOfMember: 'HCPatient'
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                typeOfMember: 'Consumer'
            })
        }));
    });
    test('Test typeOfMember field with 2 profiles DENUTRICIA vs DEAPTA', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA',
                typeOfMember: 'HCCarer'
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE APTA',
                typeOfMember: 'Consumer'
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                typeOfMember: 'Carer'
            })
        }));
    });
    test('Test typeOfMember field with 2 profiles DENUTRICIA vs DEMILUPA', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA',
                typeOfMember: 'HCCarer'
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA',
                typeOfMember: 'Consumer'
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                typeOfMember: 'Carer'
            })
        }));
    });
    test('Test typeOfMember field with 2 profiles DELOPROFIN vs DEAPTA', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA',
                typeOfMember: 'Consumer'
            },
            lastUpdated: '2021-02-01T01:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN',
                typeOfMember: 'HCPatient'
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                typeOfMember: 'Patient'
            })
        }));
    });

    test('Test typeOfMember field with 2 profiles DELOPROFIN vs DEMILUPA', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA',
                typeOfMember: 'Consumer'
            },
            lastUpdated: '2021-02-01T01:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN',
                typeOfMember: 'HCPatient'
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                typeOfMember: 'Patient'
            })
        }));
    });
    test('Test preferredLanguage field with 2 profiles one without and one filled', () => {
        const Profile1 = createTestProfileFull({
            data: {
                preferredLanguage: 'de_de'
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {},
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                preferredLanguage: 'de_de'
            })
        }));
    });
    test('Test preferredLanguage field with 1 profiles one filled and one without', () => {
        const Profile1 = createTestProfileFull({
            data: {
                preferredLanguage: 'German'
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {},
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                preferredLanguage: 'de_de'
            })
        }));
    });
    test('Test preferredLanguage field with 2 profiles without', () => {
        const Profile1 = createTestProfileFull({
            data: {},
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {},
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.not.objectContaining({
                preferredLanguage: expect.anything()
            })
        }));
    });
    test('Test preferredLanguage field with 3 profiles two filled and one without', () => {
        const Profile1 = createTestProfileFull({
            data: {},
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                preferredLanguage: 'de_de'
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileFull({
            data: {
                preferredLanguage: 'de_de'
            },
            lastUpdated: '2021-03-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                preferredLanguage: 'de_de'
            })
        }));
    });
    test('Test preferredLanguage field with 3 profiles one filled and two without', () => {
        const Profile1 = createTestProfileLite({
            data: {
                preferredLanguage: 'de_de'
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {},
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileFull({
            data: {},
            lastUpdated: '2021-03-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                preferredLanguage: 'de_de'
            })
        }));
    });
    test('Test clubId field with one profile created before and one after', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA'
            },
            created: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA'
            },
            created: '2021-02-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                clubId: 'DE APTA'
            })
        }));
    });
    test('Test clubId field with 2 profiles older and 1 profile newer', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA'
            },
            created: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA'
            },
            created: '2021-02-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA'
            },
            created: '2021-03-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                clubId: 'DE APTA'
            })
        }));
    });
    test('Test clubId field with 2 profiles newer and 1 profile older', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA'
            },
            created: '2021-03-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            data: {
                clubId: 'DE MILUPA'
            },
            created: '2021-02-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA'
            },
            created: '2021-01-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                clubId: 'DE NUTRICIA'
            })
        }));
    });
    test('Test clubId field with 2 profiles older and 2 profile newer', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA'
            },
            created: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            data: {
                clubId: 'DE MILUPA'
            },
            created: '2021-02-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA'
            },
            created: '2021-03-01T00:00:00.000Z'
        });
        const Profile4 = createTestProfileLite({
            data: {
                clubId: 'DE LOPROFIN'
            },
            created: '2021-04-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3, Profile4]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                clubId: 'DE APTA'
            })
        }));
    });
});