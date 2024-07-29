const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Funzione per creare la directory se non esiste
const ensureDirectoryExistence = (filePath) => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
};

// Leggi il file JSON e convertilo in un array di oggetti
const readJsonFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          const records = JSON.parse(data);
          resolve(records.map(record => ({ ...record, filePath })));
        } catch (parseError) {
          reject(parseError);
        }
      }
    });
  });
};

const writeCsvFile = (filePath, data) => {
  ensureDirectoryExistence(filePath); // Assicurati che la directory esista
  
  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      {id: 'email', title: 'email'},
      {id: 'isPresentInDEAPTA', title: 'isPresentInDEAPTA'},
      {id: 'typeOfMemberDEAPTA', title: 'typeOfMemberDEAPTA'},
      {id: 'childrenDEAPTA', title: 'childrenDEAPTA'},
      {id: 'isPresentInDEMILUPA', title: 'isPresentInDEMILUPA'},
      {id: 'typeOfMemberDEMILUPA', title: 'typeOfMemberDEMILUPA'},
      {id: 'childrenDEMILUPA', title: 'childrenDEMILUPA'},
      {id: 'isPresentInDELOPROFIN', title: 'isPresentInDELOPROFIN'},
      {id: 'typeOfMemberDELOPROFIN', title: 'typeOfMemberDELOPROFIN'},
      {id: 'childrenDELOPROFIN', title: 'childrenDELOPROFIN'},
      {id: 'isPresentInDENUTRICIA', title: 'isPresentInDENUTRICIA'},
      {id: 'typeOfMemberDENUTRICIA', title: 'typeOfMemberDENUTRICIA'}
    ]
  });

  const formatChildren = (children) => {
    return children.map(child => {
      return `${child.dateOfBirth !== undefined ? 'dateOfBirth: ' + child.dateOfBirth: ''}${child.dueDate !== undefined ? ', dueDate: ' + child.dueDate: ''}${child.firstName !== undefined ? ', firstName: ' + child.firstName : ''}${child.gender !== undefined ? ', gender: ' + child.gender : ''}`;
    }).join(' | ');
  };

  const csvRows = data.map(row => ({
    email: row.email,
    isPresentInDEAPTA: row.isPresentInDEAPTA ? 'true' : 'false',
    typeOfMemberDEAPTA: row.typeOfMemberDEAPTA ? row.typeOfMemberDEAPTA : 'Not present',
    childrenDEAPTA: row.childrenDEAPTA ? formatChildren(row.childrenDEAPTA) : '',
    isPresentInDEMILUPA: row.isPresentInDEMILUPA ? 'true' : 'false',
    typeOfMemberDEMILUPA: row.typeOfMemberDEMILUPA ? row.typeOfMemberDEMILUPA : 'Not present',
    childrenDEMILUPA: row.childrenDEMILUPA ? formatChildren(row.childrenDEMILUPA) : '',
    isPresentInDELOPROFIN: row.isPresentInDELOPROFIN ? 'true' : 'false',
    typeOfMemberDELOPROFIN: row.typeOfMemberDELOPROFIN ? row.typeOfMemberDELOPROFIN : 'Not present',
    childrenDELOPROFIN: row.childrenDELOPROFIN ? formatChildren(row.childrenDELOPROFIN) : '',
    isPresentInDENUTRICIA: row.isPresentInDENUTRICIA ? 'true' : 'false',
    typeOfMemberDENUTRICIA: row.typeOfMemberDENUTRICIA ? row.typeOfMemberDENUTRICIA : 'Not present'
    }));

  csvWriter.writeRecords(csvRows)
    .then(() => {
      console.log('...CSV file written successfully');
    });
};

const getEmails = (row) => {
  const emails = [];
  if (row.email) {
    emails.push(row.email);
  }
  return emails;
};

const deduplicateRecords = (records) => {
  const emailMap = new Map();

  records.forEach(record => {
    const emails = getEmails(record);
    const typeOfMember = record.typeOfMember;
    const children = record.children || [];
    const brand = path.basename(record.filePath).split('_')[2].replace('.json', '').toUpperCase(); // Estrae il brand dal nome del file

    emails.forEach(email => {
      if (!emailMap.has(email)) {
        emailMap.set(email, {
          email,
          isPresentInDEAPTA: false,
          typeOfMemberDEAPTA: 'Not present',
          childrenDEAPTA: [],
          isPresentInDEMILUPA: false,
          typeOfMemberDEMILUPA: 'Not present',
          childrenDEMILUPA: [],
          isPresentInDELOPROFIN: false,
          typeOfMemberDELOPROFIN: 'Not present',
          childrenDELOPROFIN: [],
          isPresentInDENUTRICIA: false,
          typeOfMemberDENUTRICIA: 'Not present',
        });
      }
      const emailRecord = emailMap.get(email);
      emailRecord[`isPresentIn${brand}`] = true;
      emailRecord[`typeOfMember${brand}`] = typeOfMember || 'Not present';
      emailRecord[`children${brand}`] = children.map(child => ({
        dateOfBirth: child.dateOfBirth,
        dueDate: child.dueDate,
        firstName: child.firstName,
        gender: child.gender
      }));
    });
  });

  // Filtra le email presenti in più di un brand
  const duplicateEmails = Array.from(emailMap.values()).filter(emailRecord => (
    [emailRecord.isPresentInDEAPTA, emailRecord.isPresentInDEMILUPA, emailRecord.isPresentInDELOPROFIN, emailRecord.isPresentInDENUTRICIA].filter(Boolean).length > 1
  ));

  return { duplicateEmails };
};

// Lista dei file JSON
const jsonFiles = [
  './input/extract_from_DEAPTA.json',
  './input/extract_from_DEMILUPA.json',
  './input/extract_from_DELOPROFIN.json',
  './input/extract_from_DENUTRICIA.json'
];

// Leggi tutti i file JSON
Promise.all(jsonFiles.map(readJsonFile)).then((allRecords) => {
  const combinedRecords = allRecords.flat();
  const { duplicateEmails } = deduplicateRecords(combinedRecords);

  writeCsvFile('./output/duplicateEmails.csv', duplicateEmails);

  console.log('Email duplicate trovate e salvate in duplicateEmails.csv');
}).catch((error) => {
  console.error('Errore nella lettura dei file JSON:', error);
});
