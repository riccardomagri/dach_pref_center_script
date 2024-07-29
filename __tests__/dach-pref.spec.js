const { mergeProfilesDACH } = require('../merge_profiles_DACH.js');
const { v4: uuidv4 } = require('uuid');

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
    isRegistered: overrides.isRegistered ?? false,
    hasLiteAccount: overrides.hasLiteAccount ?? false,
    lastUpdated: overrides.lastUpdated || new Date().toISOString()
});

const createTestProfileFull = (overrides = {}) => createTestProfile({ isRegistered: true, hasLiteAccount: false, ...overrides });
const createTestProfileLite = (overrides = {}) => createTestProfile({ isRegistered: false, hasLiteAccount: true, ...overrides });

describe('DACH PREF', () => {
    beforeAll(() => {
        console.log = jest.fn();
    });
    test('LITE vs LITE', () => {
        const mostRecent = createTestProfileLite({ lastUpdated: '2021-02-01T00:00:00.000Z'});
        const lessRecent = createTestProfileLite({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([mostRecent, lessRecent]);
        expect(result).toBe(mostRecent);
    });  
    test('FULL vs FULL', () => {
        const mostRecent = createTestProfileFull({ lastUpdated: '2021-02-01T00:00:00.000Z'});
        const lessRecent = createTestProfileFull({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([mostRecent, lessRecent]);
        expect(result).toBe(mostRecent);
    });
    test('LITE vs FULL', () => {
        const mostRecentLITE = createTestProfileLite({ lastUpdated: '2021-02-01T00:00:00.000Z'});
        const lessRecentFULL = createTestProfileFull({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([mostRecentLITE, lessRecentFULL]);
        expect(result).toBe(lessRecentFULL);
    });
    test('LITE vs LITE vs FULL', () => {
        const mostRecentLITE = createTestProfileLite({ lastUpdated: '2021-02-01T00:00:00.000Z'});
        const lessRecentLITE = createTestProfileLite({ lastUpdated: '2021-03-01T00:00:00.000Z' });
        const lessRecentFULL = createTestProfileFull({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([mostRecentLITE, lessRecentLITE, lessRecentFULL]);
        expect(result).toBe(lessRecentFULL);
    });
    test('FULL vs LITE vs FULL', () => {
        const mostRecentFULL = createTestProfileFull({ lastUpdated: '2021-02-01T00:00:00.000Z'});
        const lessRecentLITE = createTestProfileLite({ lastUpdated: '2021-03-01T00:00:00.000Z' });
        const lessRecentFULL = createTestProfileFull({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([mostRecentFULL, lessRecentLITE, lessRecentFULL]);
        expect(result).toBe(mostRecentFULL);
    });
});
