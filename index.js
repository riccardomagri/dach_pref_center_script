const { readAndProcessFiles } = require('./merge_profiles_DACH.js');

const {createTestProfileFull, createTestProfileLite} = require('./__tests__/utility.js')
const fs  = require('fs');
const { Readable, PassThrough } = require('stream');


(async () => {
    console.log("Starting the merging process");
    await readAndProcessFiles();
    console.log("Merging process completed");
})();