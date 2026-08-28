(() => {
  'use strict';

  const ALIASES = {
    firstName: ['first name', 'firstname', 'given name'],
    lastName: ['last name', 'lastname', 'surname', 'family name'],
    fullName: ['full name', 'name', 'contact name', 'person'],
    email: ['email', 'emails', 'email address', 'email 1', 'primary email'],
    phone: ['phone', 'phones', 'phone number', 'phone 1', 'mobile'],
    jobTitle: ['job title', 'title', 'position', 'role'],
    organisation: ['company', 'companies', 'company name', 'organisation', 'organization', 'employer'],
    organisationDomain: ['company url', 'company urls', 'company website', 'company domain', 'organisation url', 'organisation website', 'organization url', 'organization website'],
    organisationLinkedin: ['company linkedin', 'company linkedin url', 'organisation linkedin', 'organisation linkedin url', 'organization linkedin', 'organization linkedin url'],
    linkedin: ['linkedin', 'linkedin url', 'linkedin profile'],
    urls: ['url', 'urls', 'website', 'websites'],
    headshotUrl: ['profile picture', 'profile picture url', 'photo', 'photo url', 'avatar', 'headshot'],
    owner: ['owner', 'contact owner', 'member', 'assigned to', 'strongest connection'],
    notes: ['notes', 'note', 'description'],
    groups: ['groups', 'group', 'lists', 'list'],
    sourceId: ['folk id', 'folk contact id', 'contact id', 'person id', 'id'],
    createdAt: ['created at', 'date created']
  };

  const normaliseHeader = value => String(value || '')
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  function parse(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    const source = String(text || '').replace(/^\uFEFF/, '');
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (char === '"') {
        if (quoted && source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === ',' && !quoted) {
        row.push(field);
        field = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && source[index + 1] === '\n') index += 1;
        row.push(field);
        if (row.some(value => String(value).trim())) rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
    row.push(field);
    if (row.some(value => String(value).trim())) rows.push(row);
    const headers = (rows.shift() || []).map((header, index) => String(header || `Column ${index + 1}`).trim());
    const records = rows.map(values => Object.fromEntries(headers.map((header, index) => [header, String(values[index] || '').trim()])));
    return { headers, rows: records };
  }

  function headerFor(headers, aliases) {
    const lookup = new Map(headers.map(header => [normaliseHeader(header), header]));
    return aliases.map(alias => lookup.get(normaliseHeader(alias))).find(Boolean) || '';
  }

  function read(row, headers, key) {
    const header = headerFor(headers, ALIASES[key] || []);
    return header ? String(row[header] || '').trim() : '';
  }

  function splitValues(value) {
    return String(value || '').split(/\s*[;|]\s*|\s*,\s*(?=[^,]+(?:@|https?:|www\.))/i).map(item => item.trim()).filter(Boolean);
  }

  function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return { firstName: parts[0] || '', lastName: '' };
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) };
  }

  function hostname(value) {
    const input = String(value || '').trim();
    if (!input) return '';
    const embeddedUrl = input.match(/(?:https?:\/\/|www\.)[^\s,;|]+/i)?.[0];
    const candidate = embeddedUrl || input.replace(/^[a-z ]+:\s*/i, '');
    try {
      return new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`)
        .hostname
        .replace(/^www\./i, '')
        .toLowerCase();
    } catch {
      return '';
    }
  }

  function isSocialCompanyUrl(value) {
    const domain = hostname(value);
    return /(^|\.)(linkedin\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com)$/.test(domain);
  }

  function selectOrganisationUrls(value) {
    const values = splitValues(value);
    const linkedin = values.find(item => /(^|\.)linkedin\.com$/i.test(hostname(item))) || '';
    const website = values.find(item => hostname(item) && !isSocialCompanyUrl(item)) || '';
    return { domain: hostname(website), linkedin };
  }

  function classify(fileName, headers) {
    if (/notes?/i.test(fileName)) return 'notes';
    const hasNote = Boolean(headerFor(headers, ['note', 'notes', 'content', 'body']));
    const hasPerson = Boolean(headerFor(headers, [...ALIASES.firstName, ...ALIASES.lastName, ...ALIASES.email]));
    return hasNote && !hasPerson ? 'notes' : 'contacts';
  }

  function mapContact(row, headers) {
    const used = new Set();
    const take = key => {
      const header = headerFor(headers, ALIASES[key] || []);
      if (header) used.add(header);
      return header ? String(row[header] || '').trim() : '';
    };
    let firstName = take('firstName');
    let lastName = take('lastName');
    const fullName = take('fullName');
    if (!firstName && !lastName && fullName) ({ firstName, lastName } = splitName(fullName));
    const email = splitValues(take('email')).find(value => /@/.test(value)) || '';
    const urls = splitValues(take('urls'));
    const linkedin = take('linkedin') || urls.find(value => /linkedin\.com/i.test(value)) || '';
    const organisationUrls = selectOrganisationUrls(take('organisationDomain'));
    const organisationLinkedin = take('organisationLinkedin') || organisationUrls.linkedin;
    const mapped = {
      firstName,
      lastName,
      email,
      phone: splitValues(take('phone'))[0] || '',
      jobTitle: take('jobTitle'),
      organisationName: splitValues(take('organisation'))[0] || '',
      organisationDomain: organisationUrls.domain,
      organisationLinkedin,
      linkedin,
      headshotUrl: take('headshotUrl'),
      owner: take('owner'),
      notes: take('notes'),
      groups: splitValues(take('groups')),
      sourceId: take('sourceId'),
      createdAt: take('createdAt')
    };
    mapped.customFields = Object.fromEntries(
      headers.filter(header => !used.has(header) && String(row[header] || '').trim())
        .map(header => [header, String(row[header]).trim()])
    );
    return mapped;
  }

  function mapNote(row, headers) {
    const noteHeader = headerFor(headers, ['note', 'notes', 'content', 'body', 'text']);
    return {
      text: noteHeader ? String(row[noteHeader] || '').trim() : '',
      sourceId: read(row, headers, 'sourceId'),
      email: read(row, headers, 'email'),
      personName: read(row, headers, 'fullName'),
      createdAt: read(row, headers, 'createdAt')
    };
  }

  window.WorkgroupCsvImport = Object.freeze({
    normaliseHeader,
    parse,
    classify,
    hostname,
    isSocialCompanyUrl,
    selectOrganisationUrls,
    mapContact,
    mapNote
  });
})();
