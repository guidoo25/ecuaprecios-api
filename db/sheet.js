const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const creds = require('../const/go.json'); 

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',

];


async function authenticateGoogleSheets() {
  const jwtClient = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/gm, '\n'),
    scopes: SCOPES,
});
const doc = new GoogleSpreadsheet('1YbS8EcG5NPphKN6_qqV0IAE8qBjv_Jujl3jIrFsr4fE', jwtClient);
await doc.loadInfo(); 
return doc;
}


module.exports = { authenticateGoogleSheets };