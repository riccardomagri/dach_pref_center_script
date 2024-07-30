const { mergeProfilesDACH } = require('../merge_profiles_DACH.js');
const { expect } = require('@jest/globals');
const { createTestProfileFull, createTestProfileLite } = require('./utility.js');

describe('DACH PREF', () => {
    beforeAll(() => {
        console.log = jest.fn();
    });
    test('LITE vs LITE', () => {
        const mostRecent = createTestProfileLite({ lastUpdated: '2021-02-01T00:00:00.000Z'});
        const lessRecent = createTestProfileLite({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([mostRecent, lessRecent]);
        expect(result).toStrictEqual(lessRecent);
    });  
    test('FULL vs FULL', () => {
        const mostRecent = createTestProfileFull({ lastUpdated: '2021-02-01T00:00:00.000Z'});
        const lessRecent = createTestProfileFull({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([mostRecent, lessRecent]);
        expect(result).toStrictEqual(lessRecent);
    });
    test('LITE vs FULL', () => {
        const mostRecentLITE = createTestProfileLite({ lastUpdated: '2021-02-01T00:00:00.000Z'});
        const lessRecentFULL = createTestProfileFull({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([mostRecentLITE, lessRecentFULL]);
        expect(result).toStrictEqual(lessRecentFULL);
    });
    test('LITE vs LITE vs FULL', () => {
        const mostRecentLITE = createTestProfileLite({ lastUpdated: '2021-02-01T00:00:00.000Z'});
        const lessRecentLITE = createTestProfileLite({ lastUpdated: '2021-03-01T00:00:00.000Z' });
        const lessRecentFULL = createTestProfileFull({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([mostRecentLITE, lessRecentLITE, lessRecentFULL]);
        expect(result).toStrictEqual(lessRecentFULL);
    });
    test('FULL vs LITE vs FULL', () => {
        const mostRecentFULL = createTestProfileFull({ lastUpdated: '2021-02-01T00:00:00.000Z'});
        const lessRecentLITE = createTestProfileLite({ lastUpdated: '2021-03-01T00:00:00.000Z' });
        const lessRecentFULL = createTestProfileFull({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([mostRecentFULL, lessRecentLITE, lessRecentFULL]);
        expect(result).toStrictEqual(mostRecentFULL);
    });
    test('FULL with missing field vs LITE with filled field', () => {
        const FULL = createTestProfileFull({});
        const LITE = createTestProfileLite({ data: { firstName: "Pippo" }});
        const result = mergeProfilesDACH([FULL, LITE]);
        expect(result).toEqual(expect.objectContaining({ data: expect.objectContaining({ firstName: "Pippo" })}));
    });
    test('LITE with filled field vs LITE with missing field', () => {
        const LITE1 = createTestProfileLite({ lastUpdated: '2021-02-01T00:00:00.000Z', data: { firstName: "Pippo" }});
        const LITE2 = createTestProfileLite({ lastUpdated: '2021-03-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([LITE1, LITE2]);
        expect(result).toEqual(expect.objectContaining({ lastUpdated: '2021-03-01T00:00:00.000Z', data: expect.objectContaining({ firstName: "Pippo" })}));
    });
    test('FULL with filled field vs FULL with missing field', () => {
        const FULL1 = createTestProfileFull({ lastUpdated: '2021-02-01T00:00:00.000Z', data: { firstName: "Pippo" }});
        const FULL2 = createTestProfileFull({ lastUpdated: '2021-03-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([FULL1, FULL2]);
        expect(result).toEqual(expect.objectContaining({ lastUpdated: '2021-03-01T00:00:00.000Z', data: expect.objectContaining({ firstName: "Pippo" })}));
    });
    test('LITE with filled field vs LITE with same filled field vs FULL without fields', () => {
        const LITE1 = createTestProfileLite({ lastUpdated: '2021-02-01T00:00:00.000Z', data: { firstName: "Pippo" }});
        const LITE2 = createTestProfileLite({ lastUpdated: '2021-03-01T00:00:00.000Z', data: { firstName: "Pluto" }});
        const FULL = createTestProfileFull({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([LITE1, LITE2, FULL]);
        expect(result).toEqual(expect.objectContaining({ lastUpdated: '2021-01-01T00:00:00.000Z', data: expect.objectContaining({ firstName: "Pluto" })}));
    });
    test('LITE with filled field vs LITE with different filled field vs FULL without field', () => {
        const LITE1 = createTestProfileLite({ lastUpdated: '2021-02-01T00:00:00.000Z', data: { firstName: "Pippo" }});
        const LITE2 = createTestProfileLite({ lastUpdated: '2021-03-01T00:00:00.000Z', data: { lastName: "Pluto" }});
        const FULL = createTestProfileFull({ lastUpdated: '2021-01-01T00:00:00.000Z' });
        const result = mergeProfilesDACH([LITE1, LITE2, FULL]);
        expect(result).toEqual(expect.objectContaining({ lastUpdated: '2021-01-01T00:00:00.000Z', data: expect.objectContaining({ firstName: "Pippo", lastName: "Pluto" })}));
    });
    test('FULL with filled field vs FULL with same filled field', () => {
        const FULL1 = createTestProfileFull({ lastUpdated: '2021-02-01T00:00:00.000Z', data: { firstName: "Pippo" }});
        const FULL2 = createTestProfileFull({ lastUpdated: '2021-03-01T00:00:00.000Z', data: { firstName: "Pluto" }});
        const result = mergeProfilesDACH([FULL1, FULL2]);
        expect(result).toEqual(expect.objectContaining({ lastUpdated: '2021-03-01T00:00:00.000Z', data: expect.objectContaining({ firstName: "Pluto" })}));
    });
});
