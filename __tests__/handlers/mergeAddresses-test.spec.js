const { mergeProfilesDACH } = require('../../merge_profiles_DACH.js');
const { createTestProfileFull, createTestProfileLite } = require('../utility.js');
const { expect } = require('@jest/globals');
const matchers = require('jest-extended');
expect.extend(matchers);

describe('DACH PREF merge addresses', () => {
    test('Test addresses field with 2 profiles with different addresses', () => {
        const Profile1 = createTestProfileFull({
            domain: 'DENUTRICIA',
            data: {
                clubId: 'DE NUTRICIA',
                addresses: [
                    {
                        id: '123456',
                        street: 'Via Roma',
                        city: 'Milano',
                        zipCode: '20100',
                        countryISO2C: 'Italy'
                    }
                ]
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            domain: 'DELOPROFIN',
            data: {
                clubId: 'DE LOPROFIN',
                addresses: [
                    {
                        id: '1234567',
                        street: 'Via Garibaldi',
                        city: 'Roma',
                        zipCode: '00100',
                        countryISO2C: 'Italy'
                    }
                ]
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                addresses: expect.toIncludeSameMembers([
                    {
                        id: '123456',
                        street: 'Via Roma',
                        city: 'Milano',
                        zipCode: '20100',
                        countryISO2C: 'Italy',
                        source: 'DENUTRICIA'
                    },
                    {
                        id: '1234567',
                        street: 'Via Garibaldi',
                        city: 'Roma',
                        zipCode: '00100',
                        countryISO2C: 'Italy',
                        source: 'DELOPROFIN'
                    }
                ])
            })
        }));
    });
    test('Test addresses field with 1 profile with address and 1 profile without address', () => {
        const Profile1 = createTestProfileFull({
            domain: 'DENUTRICIA',
            data: {
                clubId: 'DE NUTRICIA',
                addresses: [
                    {
                        id: '123456',
                        street: 'Via Roma',
                        city: 'Milano',
                        zipCode: '20100',
                        countryISO2C: 'Italy'
                    }
                ]
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            domain: 'DELOPROFIN',
            data: {
                clubId: 'DE LOPROFIN'
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                addresses: [
                    {
                        id: '123456',
                        street: 'Via Roma',
                        city: 'Milano',
                        zipCode: '20100',
                        countryISO2C: 'Italy',
                        source: 'DENUTRICIA'
                    }
                ]
            })
        }));
    });
    test('Test addresses field with 1 profile with address and 1 profile with empty addresses and 1 profile with different address', () => {
        const Profile1 = createTestProfileFull({
            domain: 'DENUTRICIA',
            data: {
                clubId: 'DE NUTRICIA',
                addresses: [
                    {
                        id: '123456',
                        street: 'Via Roma',
                        city: 'Milano',
                        zipCode: '20100',
                        countryISO2C: 'Italy'
                    }
                ]
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileLite({
            domain: 'DELOPROFIN',
            data: {
                clubId: 'DE LOPROFIN',
                addresses: []
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const Profile3 = createTestProfileLite({
            domain: 'DELOPROFIN',
            data: {
                clubId: 'DE LOPROFIN',
                addresses: [
                    {
                        id: '1234567',
                        street: 'Via Garibaldi',
                        city: 'Roma',
                        zipCode: '00100',
                        countryISO2C: 'Italy'
                    }
                ]
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2, Profile3]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                addresses: expect.toIncludeSameMembers([
                    {
                        id: '123456',
                        street: 'Via Roma',
                        city: 'Milano',
                        zipCode: '20100',
                        countryISO2C: 'Italy',
                        source: 'DENUTRICIA'
                    },
                    {
                        id: '1234567',
                        street: 'Via Garibaldi',
                        city: 'Roma',
                        zipCode: '00100',
                        countryISO2C: 'Italy',
                        source: 'DELOPROFIN'
                    }
                ])
            })
        }));
    });
});