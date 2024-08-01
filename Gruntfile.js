module.exports = function (grunt) {
    const num = grunt.option('num') || "1"
    const clubId = grunt.option('clubId') || "DE APTA"
    const { fakerDE } = require('@faker-js/faker');
    const JSONStream = require('JSONStream');
    const fs = require('fs');
    const { Transform, pipeline } = require('stream');

    function* generateIsLite() {
        while (true) {
            let isLite = Math.random() > 0.5;
            yield isLite;
            isLite = !isLite;
            yield isLite;
        }
    }
    const isLiteGenerator = generateIsLite();

    const typeOfMemberMap = new Map([
        ["DE APTA", ["Consumer"]],
        ["DE MILUPA", ["Consumer"]],
        ["DE LOPROFIN", ["HCPatient"]],
        ["DE NUTRICIA", ["HCP", "HCCarer", "Patient", "HCPatient", "Consumer"]]
    ]);


    grunt.initConfig({

        jsonschema_faker: {
            options: {
                indent: 2
            },
            target: {
                src: ['./schemas/**/*.json'],
                dest: `./input/file_${clubId.replace(" ", "")}.json`,
                options: {
                    size: num,
                    extend: function (jsf) {
                        jsf.option({
                            'optionalsProbability': '0.96'
                        })
                        jsf.extend('faker', () => {
                            fakerDE.custom = {
                                clubId: () => clubId,
                                isLite: () => isLiteGenerator.next().value,
                                datetime: () => fakerDE.date.future().toISOString(),
                                date: () => fakerDE.date.future().toISOString().split("T")[0],
                                typeOfMember: () => {
                                    let possibleValues = typeOfMemberMap.get(clubId);
                                    return possibleValues[Math.floor(Math.random() * possibleValues.length)]
                                }
                            }
                            fakerDE.setDefaultRefDate('2020-01-01T00:00:00.000Z');
                            return fakerDE
                        })
                    }
                }
            }
        },
        clean: ['./input/*', './output/*']
    });

    grunt.loadNpmTasks('grunt-jsonschema-faker');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('create-profiles', ['jsonschema_faker']);
    grunt.registerTask('bonificaFile', function (clubId) {
        const done = this.async();
        const readStream = fs.createReadStream(`./input/user-profiles_${clubId.replace(' ', '')}.json`);
        const jsonParser = JSONStream.parse('*');
        const transformStream = new Transform({
            objectMode: true, transform(chunk, encoding, callback) {
                if (!chunk.data) {
                    chunk.data = {};
                }
                if (!chunk.profile.email) {
                    console.log(chunk);
                }
                if (!chunk.preferences) {
                    chunk.preferences = {
                        terms: {
                            TermsOfUse: {
                                isConsentGranted: true
                            }
                        }
                    }
                }
                if(!chunk.lastUpdated) {
                    chunk.lastUpdated = new Date(chunk.lastUpdated).toISOString();
                }
                chunk.data.clubId = clubId;
                this.push(chunk);
                callback();
            }
        });
        const stringifyStream = JSONStream.stringify('[\n', ',\n', '\n]\n');
        const writeStream = fs.createWriteStream(`./output/user-profiles_${clubId.replace(' ', '')}_output.json`);
        pipeline(readStream, jsonParser, transformStream, stringifyStream, writeStream, (err) => {
            if (err) {
                console.error(err);
            }
            done();
        });
    });
};