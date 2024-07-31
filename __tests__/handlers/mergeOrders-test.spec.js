const { mergeProfilesDACH } = require('../../merge_profiles_DACH.js');
const { createTestProfileFull, createTestProfileLite } = require('../utility.js');
const { expect } = require('@jest/globals');
const matchers = require('jest-extended');
expect.extend(matchers);

describe('DACH PREF merge orders', () => {
    test('Test orders field with 2 profiles with different orders', () => {
        const Profile1 = createTestProfileFull({
            domain: 'DENUTRICIA',
            data: {
                clubId: 'DE NUTRICIA',
                orders: [
                    {
                        id: '123456',
                        orderNumber: '123456',
                        orderDate: '2021-01-01T00:00:00.000Z',
                        orderTotal: 100,
                        orderCurrency: 'EUR',
                        orderStatus: 'Shipped'
                    }
                ]
            },
            lastUpdated: '2021-01-01T00:00:00.000Z'
        });
        const Profile2 = createTestProfileFull({
            domain: 'DELOPROFIN',
            data: {
                clubId: 'DE LOPROFIN',
                orders: [
                    {
                        id: '1234567',
                        orderNumber: '1234567',
                        orderDate: '2021-02-01T00:00:00.000Z',
                        orderTotal: 200,
                        orderCurrency: 'EUR',
                        orderStatus: 'Shipped'
                    }
                ]
            },
            lastUpdated: '2021-02-01T00:00:00.000Z'
        });
        const result = mergeProfilesDACH([Profile1, Profile2]);
        expect(result).toEqual(expect.objectContaining({
            data: expect.objectContaining({
                orders: expect.toIncludeSameMembers([
                    {
                        id: '123456',
                        orderNumber: '123456',
                        orderDate: '2021-01-01T00:00:00.000Z',
                        orderTotal: 100,
                        orderCurrency: 'EUR',
                        orderStatus: 'Shipped',
                        source: 'DENUTRICIA'
                    },
                    {
                        id: '1234567',
                        orderNumber: '1234567',
                        orderDate: '2021-02-01T00:00:00.000Z',
                        orderTotal: 200,
                        orderCurrency: 'EUR',
                        orderStatus: 'Shipped',
                        source: 'DELOPROFIN'
                    },
                ])
            })
        }));
    });
});