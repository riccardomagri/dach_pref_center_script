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
    test('DELOPROFIN vs DEAPTA vs DENUTRICIA', () => {
        const DELOPROFIN = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN'
            },
            preferences: {
                terms: {
                    TermsOfUse: {
                        isConsentGranted: true,
                        entitlements: [],
                        lastConsentModified: "2021-01-01T00:00:00.000Z"
                    }
                },
                optinProgramMarketing4: {
                    isConsentGranted: true,
                    entitlements: [],
                    lastConsentModified: "2021-03-01T00:00:00.000Z"
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
                        lastConsentModified: "2021-02-01T00:00:00.000Z"
                    }
                },
                optinPostal: {
                    isConsentGranted: true,
                    entitlements: [],
                    lastConsentModified: "2021-04-01T00:00:00.000Z"
                }
            }
        });
        const DENUTRICIA = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA'
            },
            preferences: {
                terms: {
                    TermsOfUse: {
                        isConsentGranted: true,
                        entitlements: [],
                        lastConsentModified: "2022-03-01T00:00:00.000Z"
                    }
                },
                optinProgramMarketing4: {
                    isConsentGranted: true,
                    entitlements: [],
                    lastConsentModified: "2022-04-01T00:00:00.000Z"
                }
            }
        });
        const result = mergeProfilesDACH([DELOPROFIN, DEAPTA, DENUTRICIA]);
        expect(result).toEqual(expect.objectContaining({
            preferences: {
                    terms: expect.objectContaining({ 
                        TermsOfUse: expect.objectContaining({ isConsentGranted: true }), 
                        TermsOfUse_v2: expect.objectContaining({ isConsentGranted: true }) 
                    }),
                    optinLoprofin: expect.objectContaining({ isConsentGranted: true, entitlements: ["optinProgramMarketing4"], lastConsentModified: "2021-03-01T00:00:00.000Z" }),
                    optinAptamil: expect.objectContaining({ isConsentGranted: true, entitlements: ["optinPostal"], lastConsentModified: "2021-04-01T00:00:00.000Z" }),
                    optinNutricia: expect.objectContaining({ isConsentGranted: true, entitlements: ["optinProgramMarketing4"], lastConsentModified: "2022-04-01T00:00:00.000Z" })
                }
        }));
    });
    test('DELOPROFIN vs DEAPTA vs DENUTRICIA vs DEMILUPA', () => {
        const DELOPROFIN = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN'
            },
            preferences: {
                terms: {
                    TermsOfUse: {
                        isConsentGranted: true,
                        entitlements: [],
                        lastConsentModified: "2021-01-01T00:00:00.000Z"
                    }
                },
                optinProgramMarketing4: {
                    isConsentGranted: true,
                    entitlements: [],
                    lastConsentModified: "2021-03-01T00:00:00.000Z"
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
                        lastConsentModified: "2021-02-01T00:00:00.000Z"
                    }
                },
                optinPostal: {
                    isConsentGranted: true,
                    entitlements: [],
                    lastConsentModified: "2021-04-01T00:00:00.000Z"
                }
            }
        });
        const DENUTRICIA = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA'
            },
            preferences: {
                terms: {
                    TermsOfUse: {
                        isConsentGranted: true,
                        entitlements: [],
                        lastConsentModified: "2022-03-01T00:00:00.000Z"
                    }
                },
                optinProgramMarketing3: {
                    isConsentGranted: true,
                    entitlements: [],
                    lastConsentModified: "2022-04-01T00:00:00.000Z"
                }
            }
        });
        const DEMILUPA = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA'
            },
            preferences: {
                terms: {
                    TermsOfUse: {
                        isConsentGranted: true,
                        entitlements: [],
                        lastConsentModified: "2023-03-01T00:00:00.000Z"
                    }
                },
                optinProgramMarketing2: {
                    isConsentGranted: true,
                    entitlements: [],
                    lastConsentModified: "2023-04-01T00:00:00.000Z"
                }
            }
        });
        const result = mergeProfilesDACH([DELOPROFIN, DEAPTA, DENUTRICIA, DEMILUPA]);
        expect(result).toEqual(expect.objectContaining({
            preferences: {
                    terms: expect.objectContaining({ 
                        TermsOfUse: expect.objectContaining({ isConsentGranted: true }), 
                        TermsOfUse_v2: expect.objectContaining({ isConsentGranted: true }) 
                    }),
                    optinLoprofin: expect.objectContaining({ isConsentGranted: true, entitlements: ["optinProgramMarketing4"], lastConsentModified: "2021-03-01T00:00:00.000Z" }),
                    optinAptamil: expect.objectContaining({ isConsentGranted: true, entitlements: ["optinPostal"], lastConsentModified: "2021-04-01T00:00:00.000Z" }),
                    optinNutricia: expect.objectContaining({ isConsentGranted: true, entitlements: ["optinProgramMarketing3"], lastConsentModified: "2022-04-01T00:00:00.000Z" }),
                    optinMilupa: expect.objectContaining({ isConsentGranted: true, entitlements: ["optinProgramMarketing2"], lastConsentModified: "2023-04-01T00:00:00.000Z" })
                }
        }));
    });
});