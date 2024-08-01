const { readAndProcessFiles } = require('./merge_profiles_DACH.js');

(async () => {
    console.log("Starting the merging process");
    await readAndProcessFiles();
    console.log("Merging process completed");
})();