const assert = require('node:assert/strict');

global.window = {};
require('./csv-import.js');

const importer = global.window.WorkgroupCsvImport;

assert.deepEqual(
  importer.selectOrganisationUrls('https://www.linkedin.com/company/example; https://www.example.com/about'),
  {
    domain: 'example.com',
    linkedin: 'https://www.linkedin.com/company/example'
  }
);

assert.deepEqual(
  importer.selectOrganisationUrls('https://www.linkedin.com/company/example'),
  {
    domain: '',
    linkedin: 'https://www.linkedin.com/company/example'
  }
);

const headers = ['First name', 'Last name', 'Company', 'Company URLs'];
const mapped = importer.mapContact({
  'First name': 'Ava',
  'Last name': 'Jones',
  Company: 'Example Ltd',
  'Company URLs': 'https://linkedin.com/company/example | https://example.com/contact'
}, headers);

assert.equal(mapped.organisationName, 'Example Ltd');
assert.equal(mapped.organisationDomain, 'example.com');
assert.equal(mapped.organisationLinkedin, 'https://linkedin.com/company/example');

console.log('CRM CSV import tests passed');
