const { mergeProfilesDACH } = require('../../merge_profiles_DACH.js');
const { createTestProfileFull, createTestProfileLite } = require('../utility.js');
const { expect } = require('@jest/globals');

describe('DACH PREF merge Children', () => {
    test('Test 2 profile with children field filled and DOB of the two > 9 months', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA',
                children: [
                    {
                        id: '123456',
                        firstName: 'Mario',
                        dateOfBirth: '2020-01-01'
                    }
                ]
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA',
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dateOfBirth: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                children: [
                    {
                        id: '123456',
                        firstName: 'Mario',
                        dateOfBirth: '2020-01-01',
                        isFirstBaby: 1,
                        source: 'DEAPTA'
                    },
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dateOfBirth: '2022-01-01',
                        isFirstBaby: 0,
                        source: 'DEMILUPA'
                    }
                ]
            })
        }));
    });
    test('Test 2 profile with children field filled and DOB of the two < 9 months', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA',
                children: [
                    {
                        id: '123456',
                        firstName: 'Mario',
                        dateOfBirth: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA',
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dateOfBirth: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dateOfBirth: '2022-01-01',
                        source: 'DEMILUPA',
                        isFirstBaby: 1
                    }
                ]
            })
        }));
    });
    test('Test 2 profile with children field filled and DOB of the two > 9 months and 1 profile with dueDate', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA',
                children: [
                    {
                        id: '123456',
                        firstName: 'Mario',
                        dateOfBirth: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA',
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dateOfBirth: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN',
                children: [
                    {
                        id: '12345678',
                        firstName: 'Paperino',
                        dueDate: '2024-01-01'
                    }
                ]
            },
            lastUpdated: '2021-03-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dateOfBirth: '2022-01-01',
                        isFirstBaby: 1,
                        source: 'DEMILUPA'
                    },
                    {
                        id: '12345678',
                        firstName: 'Paperino',
                        dueDate: '2024-01-01',
                        isFirstBaby: 0,
                        source: 'DELOPROFIN'
                    }
                ]
            })
        }));
    });
    test('Test 2 profile with children field filled and DOB of the two > 9 months and 1 profile with dueDate and 1 profile with DOB < 9 months', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA',
                children: [
                    {
                        id: '123456',
                        firstName: 'Mario',
                        dateOfBirth: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA',
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dateOfBirth: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN',
                children: [
                    {
                        id: '12345678',
                        firstName: 'Paperino',
                        dueDate: '2023-01-01'
                    }
                ]
            },
            lastUpdated: '2021-03-01T00:00:00.000Z'
        });
        const Profile4 = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA',
                children: [
                    {
                        id: '123456789',
                        firstName: 'Disney',
                        dateOfBirth: '2023-01-01'
                    }
                ]
            },
            lastUpdated: '2021-04-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3, Profile4]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dateOfBirth: '2022-01-01',
                        isFirstBaby: 1,
                        source: 'DEMILUPA'
                    },
                    {
                        id: '123456789',
                        firstName: 'Disney',
                        dateOfBirth: '2023-01-01',
                        dueDate: '2023-01-01',
                        isFirstBaby: 0,
                        source: 'DENUTRICIA'
                    }
                ]
            })
        }));
    });
    test('Test 2 profiles with children field filled and dueDate of the two < 9 months and 1 profile with dueDate and 1 profile with DOB > 9 months', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA',
                children: [
                    {
                        id: '123456',
                        firstName: 'Mario',
                        dueDate: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA',
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dueDate: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN',
                children: [
                    {
                        id: '12345678',
                        firstName: 'Paperino',
                        dateOfBirth: '2023-01-01'
                    }
                ]
            },
            lastUpdated: '2021-03-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dueDate: '2022-01-01',
                        isFirstBaby: 1,
                        source: 'DEMILUPA'
                    },
                    {
                        id: '12345678',
                        firstName: 'Paperino',
                        dateOfBirth: '2023-01-01',
                        isFirstBaby: 0,
                        source: 'DELOPROFIN'
                    }
                ]
            })
        }));
    });
    test('Test 2 profiles with children field filled and dueDate of the two < 9 months and 1 profile with dueDate and 1 profile with DOB < 9 months', () => {
        const Profile1 = createTestProfileFull({
            data: {
                clubId: 'DE APTA',
                children: [
                    {
                        id: '123456',
                        firstName: 'Mario',
                        dueDate: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            data: {
                clubId: 'DE MILUPA',
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dueDate: '2022-01-01'
                    }
                ]
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileFull({
            data: {
                clubId: 'DE LOPROFIN',
                children: [
                    {
                        id: '12345678',
                        firstName: 'Paperino',
                        dueDate: '2023-01-01'
                    }
                ]
            },
            lastUpdated: '2021-03-01T00:00:00.000Z'
        });
        const Profile4 = createTestProfileFull({
            data: {
                clubId: 'DE NUTRICIA',
                children: [
                    {
                        id: '123456789',
                        firstName: 'Disney',
                        dueDate: '2023-01-01'
                    }
                ]
            },
            lastUpdated: '2021-04-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3, Profile4]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                children: [
                    {
                        id: '1234567',
                        firstName: 'Pluto',
                        dueDate: '2022-01-01',
                        isFirstBaby: 1,
                        source: 'DEMILUPA'
                    },
                    {
                        id: '123456789',
                        firstName: 'Disney',
                        dueDate: '2023-01-01',
                        isFirstBaby: 0,
                        source: 'DENUTRICIA'
                    }
                ]
            })
        }));
    });
});