const { mergeProfilesDACH } = require('../merge_profiles_DACH.js');
const { expect } = require('@jest/globals');
const { createTestProfileFull, createTestProfileLite } = require('./utility.js');

describe('DACH PREF optins', () => {
    test('DELOPROFIN vs DEAPTA', () => {
        const DELOPROFIN = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN'
            },
            preferences: {
                terms: {
                    TermsOfUse: {
                        isConsentGranted: true,
                        entitlements: [],
                        lastConsentModified: new Date().toISOString()
                    }
                },
                optinProgramMarketing4: {
                    isConsentGranted: true,
                    entitlements: [],
                    lastConsentModified: new Date().toISOString()
                }
            }
        });
        const DEAPTA = createTestProfileFull({
            data: {
                clubId: 'DE APTA'
            },
            preferences: {
                terms: {
                    TermsOfUse: {
                        isConsentGranted: true,
                        entitlements: [],
                        lastConsentModified: new Date().toISOString()
                    }
                },
                optinPostal: {
                    isConsentGranted: true,
                    entitlements: [],
                    lastConsentModified: new Date().toISOString()
                }
            }
        });
        const result = mergeProfilesDACH([DELOPROFIN, DEAPTA]);
        expect(result).toEqual(expect.objectContaining({
            preferences: {
                    terms: expect.objectContaining({ 
                        TermsOfUse: expect.objectContaining({ isConsentGranted: true }), 
                        TermsOfUse_v2: expect.objectContaining({ isConsentGranted: true }) 
                    }),
                    optinLoprofin: expect.objectContaining({ isConsentGranted: true, entitlements: ["optinProgramMarketing4"] }),
                    optinAptamil: expect.objectContaining({ isConsentGranted: true, entitlements: ["optinPostal"] })
                }
        }));
    });
});