(() => {
  'use strict';

  const STORAGE_KEY = 'workgroup-event-contacts-preview-v5';
  const SPEAKER_STAGES = ['Researching', 'To contact', 'Invited', 'Confirmed', 'Declined'];
  const SPONSOR_STAGES = ['Researching', 'Contacting', 'Discussing', 'Confirmed', 'Passed'];
  const SPONSOR_RELATIONSHIP_STATUSES = ['Prospect', 'Active partner', 'Previous partner', 'Do not contact'];
  const ROLE_TABS = ['All', 'Attendee', 'Facilitator', 'Sponsor', 'Speaker', 'Staff'];
  const EVENT_ROLES = ['Attendee', 'Facilitator', 'Sponsor', 'Speaker', 'Staff'];
  const GROUP_STATUSES = ['Researching', 'To contact', 'Invited', 'Reached out', 'Discussing', 'Meeting booked', 'Interested', 'Confirmed', 'No response', 'Declined'];
  const GROUP_FIXED_COLUMNS = [
    { id: 'organisation', label: 'Organisation' },
    { id: 'jobTitle', label: 'Job title' },
    { id: 'email', label: 'Email' },
    { id: 'status', label: 'Status' },
    { id: 'owner', label: 'Owner' },
    { id: 'source', label: 'Method / source' },
    { id: 'lastInteraction', label: 'Last interaction' },
    { id: 'notes', label: 'Notes' }
  ];
  const LIVE_ENRICHMENT_PROVIDERS = [
    { id: 'provider-domain', name: 'Logo.dev company search', capability: 'Find the official company domain while a user types.', status: 'Connected' },
    { id: 'provider-assets', name: 'Logo.dev brand images', capability: 'Display a matched company logo with an initial fallback.', status: 'Connected' },
    { id: 'provider-company', name: 'Official website research', capability: 'Prepare sourced organisation details for approval.', status: 'Integration ready' },
    { id: 'provider-ai', name: 'People enhancement', capability: 'Reserved for a fixed-cost provider; no pay-as-you-go service is enabled.', status: 'Not connected' }
  ];

  const view = document.getElementById('view');
  const modalRoot = document.getElementById('modalRoot');
  const nav = document.getElementById('primaryNav');
  const pageTitle = document.getElementById('pageTitle');
  const pageEyebrow = document.getElementById('pageEyebrow');
  const eventSwitcher = document.getElementById('eventSwitcher');
  const eventGroupNav = document.getElementById('eventGroupNav');
  const globalSearch = document.getElementById('globalSearch');
  const connectionButton = document.getElementById('crmConnection');

  const ui = {
    view: 'overview',
    eventId: '',
    query: '',
    role: 'All',
    attendance: 'all',
    owner: 'all',
    groupId: '',
    groupSection: 'all',
    groupView: 'all',
    groupStatus: 'all',
    groupOwner: 'all',
    messageTab: 'Campaigns',
    organisationSearchResults: [],
    brandfetchLogoResults: [],
    brandfetchLogoOrganisationId: '',
    folkImport: null
  };

  const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const initials = name => String(name || '?').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const today = offset => {
    const date = new Date();
    date.setDate(date.getDate() + Number(offset || 0));
    return date.toISOString().slice(0, 10);
  };
  const formatDate = value => value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'No date';
  const fullName = person => person ? `${person.firstName} ${person.lastName}` : 'Unknown person';
  const matches = (...values) => !ui.query || values.some(value => String(value || '').toLowerCase().includes(ui.query.toLowerCase()));

  function seed() {
    return {
      version: 6,
      events: [
        { id: 'event-cmo-london', eventflowId: 'event-cmo-london-nov-2026', name: 'CMO London · November 2026', branch: 'CMO', date: '2026-11-19', venue: 'London · venue TBC', owner: 'Charlotte' },
        { id: 'event-legal-york', eventflowId: 'event-legal-york-autumn-2026', name: 'Legal York · Autumn 2026', branch: 'Legal', date: '2026-10-08', venue: 'York · venue TBC', owner: 'Nix' },
        { id: 'event-cfo-winter', eventflowId: 'event-cfo-london-winter-2027', name: 'CFO London · Winter 2027', branch: 'CFO', date: '2027-02-11', venue: 'London · venue TBC', owner: 'Zenia' }
      ],
      organisations: [
        { id: 'org-northstar', name: 'Northstar Systems', domain: 'northstar.example', industry: 'Technology', employeeRange: '1,000–5,000', logo: 'NS', logoUrl: 'assets/companies/northstar-systems.webp', enrichment: 'Complete', notes: 'Previous Workgroup participant.' },
        { id: 'org-kinetic', name: 'Kinetic Partners', domain: 'kinetic.example', industry: 'Professional services', employeeRange: '500–1,000', logo: 'KP', logoUrl: 'assets/companies/kinetic-partners.webp', enrichment: 'Complete', notes: 'Warm sponsor relationship.' },
        { id: 'org-riverstone', name: 'Riverstone Group', domain: 'riverstone.example', industry: 'Financial services', employeeRange: '5,000–10,000', logo: 'RG', logoUrl: 'assets/companies/riverstone-group.webp', enrichment: 'Complete', notes: '' },
        { id: 'org-clarity', name: 'Clarity Health', domain: 'clarity.example', industry: 'Healthcare', employeeRange: '1,000–5,000', logo: 'CH', logoUrl: 'assets/companies/clarity-health.webp', enrichment: 'Review', notes: 'Company details need checking.' },
        { id: 'org-civic', name: 'Civic & Co', domain: 'civic.example', industry: 'Legal services', employeeRange: '100–500', logo: 'C&', logoUrl: 'assets/companies/civic-and-co.webp', enrichment: 'Complete', notes: '' },
        { id: 'org-meridian', name: 'Meridian Labs', domain: 'meridian.example', industry: 'Data & analytics', employeeRange: '500–1,000', logo: 'ML', logoUrl: 'assets/companies/meridian-labs.webp', enrichment: 'Complete', notes: '' },
        { id: 'org-ember', name: 'Ember Energy', domain: 'ember.example', industry: 'Energy', employeeRange: '1,000–5,000', logo: 'EE', logoUrl: 'assets/companies/ember-energy.webp', enrichment: 'Missing logo', notes: '' },
        { id: 'org-arc', name: 'Arc Advisory', domain: 'arc.example', industry: 'Consulting', employeeRange: '100–500', logo: 'AA', logoUrl: 'assets/companies/arc-advisory.webp', enrichment: 'Complete', notes: '' }
      ],
      people: [
        { id: 'person-maya', firstName: 'Maya', lastName: 'Patel', jobTitle: 'Chief Marketing Officer', email: 'maya@northstar.example', phone: '', linkedin: 'linkedin.com/in/maya-patel-example', headshotUrl: 'assets/people/maya-patel.webp', organisationId: 'org-northstar', owner: 'Charlotte', lastInteraction: today(-3), notes: 'Interested in practical peer-led discussions.' },
        { id: 'person-daniel', firstName: 'Daniel', lastName: 'Reed', jobTitle: 'Marketing Director', email: 'daniel@kinetic.example', phone: '', linkedin: '', headshotUrl: 'assets/people/daniel-reed.webp', organisationId: 'org-kinetic', owner: 'Charlotte', lastInteraction: today(-8), notes: '' },
        { id: 'person-iman', firstName: 'Iman', lastName: 'Khan', jobTitle: 'General Counsel', email: 'iman@riverstone.example', phone: '', linkedin: 'linkedin.com/in/iman-khan-example', headshotUrl: 'assets/people/iman-khan.webp', organisationId: 'org-riverstone', owner: 'Nix', lastInteraction: today(-1), notes: 'Potential workgrouper.' },
        { id: 'person-leo', firstName: 'Leo', lastName: 'Barnes', jobTitle: 'Commercial Director', email: 'leo@clarity.example', phone: '', linkedin: '', headshotUrl: 'assets/people/leo-barnes.webp', organisationId: 'org-clarity', owner: 'Charlotte', lastInteraction: today(-12), notes: 'Discussing a sponsorship package.' },
        { id: 'person-olivia', firstName: 'Olivia', lastName: 'Morgan', jobTitle: 'VP Marketing', email: 'olivia@civic.example', phone: '', linkedin: '', headshotUrl: 'assets/people/olivia-morgan.webp', organisationId: 'org-civic', owner: 'Charlotte', lastInteraction: today(-5), notes: '' },
        { id: 'person-sam', firstName: 'Sam', lastName: 'Ellis', jobTitle: 'Chief Growth Officer', email: 'sam@meridian.example', phone: '', linkedin: '', headshotUrl: 'assets/people/sam-ellis.webp', organisationId: 'org-meridian', owner: 'Charlotte', lastInteraction: today(-16), notes: '' },
        { id: 'person-aisha', firstName: 'Aisha', lastName: 'Cole', jobTitle: 'Chief Financial Officer', email: 'aisha@ember.example', phone: '', linkedin: '', headshotUrl: 'assets/people/aisha-cole.webp', organisationId: 'org-ember', owner: 'Zenia', lastInteraction: today(-2), notes: '' },
        { id: 'person-james', firstName: 'James', lastName: 'Wright', jobTitle: 'Finance Director', email: 'james@arc.example', phone: '', linkedin: '', headshotUrl: 'assets/people/james-wright.webp', organisationId: 'org-arc', owner: 'Zenia', lastInteraction: today(-19), notes: '' },
        { id: 'person-nora', firstName: 'Nora', lastName: 'Shaw', jobTitle: 'Legal Director', email: 'nora@civic.example', phone: '', linkedin: '', headshotUrl: 'assets/people/nora-shaw.webp', organisationId: 'org-civic', owner: 'Nix', lastInteraction: today(-6), notes: '' },
        { id: 'person-eli', firstName: 'Eli', lastName: 'Turner', jobTitle: 'Head of Brand', email: 'eli@northstar.example', phone: '', linkedin: '', headshotUrl: 'assets/people/eli-turner.webp', organisationId: 'org-northstar', owner: 'Charlotte', lastInteraction: today(-9), notes: '' },
        { id: 'person-mara', firstName: 'Mara', lastName: 'Jones', jobTitle: 'General Counsel', email: 'mara@meridian.example', phone: '', linkedin: '', headshotUrl: 'assets/people/mara-jones.webp', organisationId: 'org-meridian', owner: 'Nix', lastInteraction: today(-21), notes: '' },
        { id: 'person-maya-duplicate', firstName: 'Maya', lastName: 'Patel', jobTitle: 'CMO', email: 'maya.patel@northstar.example', phone: '', linkedin: '', headshotUrl: 'assets/people/maya-patel-alt.webp', organisationId: 'org-northstar', owner: 'Charlotte', lastInteraction: '', notes: '' }
      ],
      eventPeople: [
        { id: 'ep-1', eventId: 'event-cmo-london', personId: 'person-maya', role: 'Speaker', status: 'Confirmed', source: 'Previous event', owner: 'Charlotte', workgroup: 'Brand trust', diaryInvite: true },
        { id: 'ep-2', eventId: 'event-cmo-london', personId: 'person-daniel', role: 'Attendee', status: 'Invited', source: 'Referral', owner: 'Charlotte', workgroup: '', diaryInvite: true },
        { id: 'ep-3', eventId: 'event-cmo-london', personId: 'person-leo', role: 'Attendee', status: 'Discussing', source: 'Sponsor contact', owner: 'Charlotte', workgroup: '', diaryInvite: false },
        { id: 'ep-4', eventId: 'event-cmo-london', personId: 'person-olivia', role: 'Speaker', status: 'Invited', source: 'Research', owner: 'Charlotte', workgroup: 'AI & marketing', diaryInvite: false },
        { id: 'ep-5', eventId: 'event-cmo-london', personId: 'person-sam', role: 'Facilitator', status: 'Confirmed', source: 'Previous attendee', owner: 'Charlotte', workgroup: 'Growth efficiency', diaryInvite: true, moderator: false, panelist: true },
        { id: 'ep-6', eventId: 'event-cmo-london', personId: 'person-eli', role: 'Attendee', status: 'No response', source: 'LinkedIn', owner: 'Charlotte', workgroup: '', diaryInvite: false },
        { id: 'ep-7', eventId: 'event-legal-york', personId: 'person-iman', role: 'Facilitator', status: 'Confirmed', source: 'Previous event', owner: 'Nix', workgroup: 'Legal operations', diaryInvite: true, moderator: true, panelist: false },
        { id: 'ep-8', eventId: 'event-legal-york', personId: 'person-nora', role: 'Speaker', status: 'Invited', source: 'Referral', owner: 'Nix', workgroup: 'Leadership', diaryInvite: false },
        { id: 'ep-9', eventId: 'event-legal-york', personId: 'person-mara', role: 'Attendee', status: 'Discussing', source: 'Mailchimp', owner: 'Nix', workgroup: '', diaryInvite: false },
        { id: 'ep-10', eventId: 'event-cfo-winter', personId: 'person-aisha', role: 'Speaker', status: 'Confirmed', source: 'Previous event', owner: 'Zenia', workgroup: 'Transformation', diaryInvite: true },
        { id: 'ep-11', eventId: 'event-cfo-winter', personId: 'person-james', role: 'Attendee', status: 'Invited', source: 'Research', owner: 'Zenia', workgroup: '', diaryInvite: false }
      ],
      groups: [],
      groupMembers: [],
      workgroupParticipation: [
        { id: 'wg-1', personId: 'person-maya', workgroupName: 'Brand trust', capacity: 'Facilitated', eventId: 'event-cmo-london', eventName: 'CMO London · November 2026', participationDate: '2026-11-19', notes: '' },
        { id: 'wg-2', personId: 'person-sam', workgroupName: 'Growth efficiency', capacity: 'Attended', eventId: 'event-cmo-london', eventName: 'CMO London · November 2026', participationDate: '2026-11-19', notes: '' },
        { id: 'wg-3', personId: 'person-iman', workgroupName: 'Legal operations', capacity: 'Facilitated', eventId: 'event-legal-york', eventName: 'Legal York · Autumn 2026', participationDate: '2026-10-08', notes: '' },
        { id: 'wg-4', personId: 'person-aisha', workgroupName: 'Finance transformation', capacity: 'Facilitated', eventId: 'event-cfo-winter', eventName: 'CFO London · Winter 2027', participationDate: '2027-02-11', notes: '' }
      ],
      speakerProspects: [
        { id: 'sp-1', eventId: 'event-cmo-london', personId: 'person-maya', stage: 'Confirmed', topic: 'Brand trust', owner: 'Charlotte' },
        { id: 'sp-2', eventId: 'event-cmo-london', personId: 'person-olivia', stage: 'Invited', topic: 'AI & marketing', owner: 'Charlotte' },
        { id: 'sp-3', eventId: 'event-cmo-london', personId: 'person-sam', stage: 'To contact', topic: 'Growth efficiency', owner: 'Charlotte' },
        { id: 'sp-4', eventId: 'event-legal-york', personId: 'person-nora', stage: 'Invited', topic: 'Legal leadership', owner: 'Nix' },
        { id: 'sp-5', eventId: 'event-cfo-winter', personId: 'person-aisha', stage: 'Confirmed', topic: 'Finance transformation', owner: 'Zenia' }
      ],
      sponsorships: [
        { id: 'sponsor-1', eventId: 'event-cmo-london', organisationId: 'org-kinetic', stage: 'Discussing', category: 'Technology partner', owner: 'Charlotte', probability: 65, notes: 'Package options shared.' },
        { id: 'sponsor-2', eventId: 'event-cmo-london', organisationId: 'org-clarity', stage: 'Contacting', category: 'Content partner', owner: 'Charlotte', probability: 35, notes: 'Follow up next week.' },
        { id: 'sponsor-3', eventId: 'event-cmo-london', organisationId: 'org-meridian', stage: 'Researching', category: 'Data partner', owner: 'Charlotte', probability: 15, notes: '' },
        { id: 'sponsor-4', eventId: 'event-cmo-london', organisationId: 'org-northstar', stage: 'Confirmed', category: 'Headline partner', owner: 'Charlotte', probability: 100, notes: 'Confirmed in principle.' },
        { id: 'sponsor-5', eventId: 'event-legal-york', organisationId: 'org-civic', stage: 'Discussing', category: 'Legal technology', owner: 'Nix', probability: 60, notes: '' }
      ],
      sponsorDirectory: [
        { id: 'sponsor-directory-kinetic', organisationId: 'org-kinetic', relationshipStatus: 'Prospect', category: 'Technology partner', owner: 'Charlotte', notes: 'Package options shared.' },
        { id: 'sponsor-directory-clarity', organisationId: 'org-clarity', relationshipStatus: 'Prospect', category: 'Content partner', owner: 'Charlotte', notes: '' },
        { id: 'sponsor-directory-meridian', organisationId: 'org-meridian', relationshipStatus: 'Prospect', category: 'Data partner', owner: 'Charlotte', notes: '' },
        { id: 'sponsor-directory-northstar', organisationId: 'org-northstar', relationshipStatus: 'Active partner', category: 'Headline partner', owner: 'Charlotte', notes: 'Confirmed in principle.' },
        { id: 'sponsor-directory-civic', organisationId: 'org-civic', relationshipStatus: 'Prospect', category: 'Legal technology', owner: 'Nix', notes: '' }
      ],
      segments: [
        { id: 'segment-cmo-confirmed', name: 'CMO confirmed attendees', eventId: 'event-cmo-london', type: 'Dynamic', rule: 'Role is Attendee or Workgrouper · Status is Confirmed', purpose: 'Event communications' },
        { id: 'segment-cmo-invited', name: 'CMO invited — needs response', eventId: 'event-cmo-london', type: 'Dynamic', rule: 'Status is Invited or No response', purpose: 'Chaser email' },
        { id: 'segment-cmo-speakers', name: 'CMO speakers', eventId: 'event-cmo-london', type: 'Dynamic', rule: 'Role is Speaker', purpose: 'Speaker communications' },
        { id: 'segment-all-mailchimp', name: 'All Mailchimp contacts', eventId: '', type: 'Saved list', rule: 'Marketing status is subscribed', purpose: 'Mailchimp export' }
      ],
      activities: [
        { id: 'act-1', eventId: 'event-cmo-london', personId: 'person-olivia', type: 'Email', text: 'Chase speaker invitation', due: today(0), owner: 'Charlotte', done: false },
        { id: 'act-2', eventId: 'event-cmo-london', personId: 'person-leo', type: 'Call', text: 'Discuss sponsorship options', due: today(1), owner: 'Charlotte', done: false },
        { id: 'act-3', eventId: 'event-cmo-london', personId: 'person-maya', type: 'Note', text: 'Speaker confirmed for Brand trust panel', due: today(-2), owner: 'Charlotte', done: true },
        { id: 'act-4', eventId: 'event-legal-york', personId: 'person-nora', type: 'Email', text: 'Send proposed panel outline', due: today(2), owner: 'Nix', done: false }
      ],
      duplicateCandidates: [
        { id: 'dup-1', personIds: ['person-maya', 'person-maya-duplicate'], reason: 'Same name and organisation', confidence: 'High', status: 'Open' }
      ],
      mailConnection: { provider: 'Microsoft Outlook', status: 'Not connected', accountEmail: '' },
      emailCampaigns: [
        { id: 'mail-1', eventId: 'event-cmo-london', name: 'CMO speaker information', audience: 'CMO speakers', subject: 'Speaker information for Workgroup CMO London', status: 'Draft', recipientCount: 2, steps: 1, sender: 'Charlotte', updatedAt: today(0) },
        { id: 'mail-2', eventId: 'event-cmo-london', name: 'Attendee workgroup choices', audience: 'Confirmed attendees', subject: 'Choose your Workgroup', status: 'Ready to send', recipientCount: 3, steps: 2, sender: 'Charlotte', updatedAt: today(-1) },
        { id: 'mail-3', eventId: 'event-legal-york', name: 'Legal York save the date', audience: 'Legal York contacts', subject: 'Save the date: Workgroup Legal York', status: 'Sent', recipientCount: 42, steps: 1, sender: 'Nix', updatedAt: today(-7) }
      ],
      emailTemplates: [
        { id: 'template-save-date', name: 'Save the date', subject: 'Save the date: {{event.name}}', body: 'Hi {{first_name}},\\n\\nPlease save the date for {{event.name}} on {{event.date}}.\\n\\nBest,\\n{{sender.name}}' },
        { id: 'template-speaker', name: 'Speaker invitation', subject: 'Invitation to speak at {{event.name}}', body: 'Hi {{first_name}},\\n\\nWe would love to invite you to speak at {{event.name}}.\\n\\nBest,\\n{{sender.name}}' },
        { id: 'template-chaser', name: 'Event invitation chaser', subject: 'A quick reminder about {{event.name}}', body: 'Hi {{first_name}},\\n\\nI wanted to follow up on your invitation to {{event.name}}.\\n\\nBest,\\n{{sender.name}}' }
      ],
      enrichmentProviders: structuredClone(LIVE_ENRICHMENT_PROVIDERS),
      enrichmentJobs: [
        { id: 'enrich-job-1', eventId: 'event-cmo-london', status: 'Suggestions ready', requestedAt: today(0), entityCount: 8 },
        { id: 'enrich-job-2', eventId: 'event-legal-york', status: 'Ready to run', requestedAt: '', entityCount: 5 },
        { id: 'enrich-job-3', eventId: 'event-cfo-winter', status: 'Ready to run', requestedAt: '', entityCount: 4 }
      ],
      enrichmentSuggestions: [
        { id: 'suggestion-logo-ember', eventId: 'event-cfo-winter', entityType: 'organisation', entityId: 'org-ember', field: 'logoUrl', fieldLabel: 'Company logo', currentValue: '', suggestedValue: 'assets/companies/ember-energy.webp', valueLabel: 'Ember Energy logo candidate', confidence: 94, sourceLabel: 'Official website', sourceUrl: 'https://ember.example', provider: 'Logo discovery adapter', status: 'Pending' },
        { id: 'suggestion-description-clarity', eventId: 'event-cmo-london', entityType: 'organisation', entityId: 'org-clarity', field: 'description', fieldLabel: 'Company summary', currentValue: '', suggestedValue: 'Healthcare technology organisation focused on connected patient services.', valueLabel: 'Healthcare technology organisation focused on connected patient services.', confidence: 88, sourceLabel: 'Company website', sourceUrl: 'https://clarity.example', provider: 'Organisation research adapter', status: 'Pending' },
        { id: 'suggestion-linkedin-daniel', eventId: 'event-cmo-london', entityType: 'person', entityId: 'person-daniel', field: 'linkedin', fieldLabel: 'LinkedIn profile', currentValue: '', suggestedValue: 'linkedin.com/in/daniel-reed-example', valueLabel: 'linkedin.com/in/daniel-reed-example', confidence: 82, sourceLabel: 'Professional profile candidate', sourceUrl: 'https://linkedin.com/in/daniel-reed-example', provider: 'Contact verification adapter', status: 'Pending' },
        { id: 'suggestion-linkedin-olivia', eventId: 'event-cmo-london', entityType: 'person', entityId: 'person-olivia', field: 'linkedin', fieldLabel: 'LinkedIn profile', currentValue: '', suggestedValue: 'linkedin.com/in/olivia-morgan-example', valueLabel: 'linkedin.com/in/olivia-morgan-example', confidence: 79, sourceLabel: 'Professional profile candidate', sourceUrl: 'https://linkedin.com/in/olivia-morgan-example', provider: 'Contact verification adapter', status: 'Pending' }
      ]
    };
  }

  function ensureSponsorDirectory(data) {
    if (Array.isArray(data.sponsorDirectory)) return data;
    const byOrganisation = new Map();
    (data.sponsorships || []).forEach(item => {
      const existing = byOrganisation.get(item.organisationId);
      const active = item.stage === 'Confirmed';
      if (!existing) {
        byOrganisation.set(item.organisationId, {
          id: uid('sponsor-directory'),
          organisationId: item.organisationId,
          relationshipStatus: active ? 'Active partner' : 'Prospect',
          category: item.category || '',
          owner: item.owner || '',
          notes: item.notes || ''
        });
        return;
      }
      if (active) existing.relationshipStatus = 'Active partner';
      if (!existing.category && item.category) existing.category = item.category;
      if (!existing.owner && item.owner) existing.owner = item.owner;
    });
    data.sponsorDirectory = [...byOrganisation.values()];
    return data;
  }

  function groupFieldId(label) {
    return String(label || 'field').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid('field');
  }

  function ensureGroups(data) {
    data.version = 6;
    data.groups ||= [];
    data.groupMembers ||= [];
    const defaultFields = [
      { id: 'reached-out', label: 'Reached out', type: 'select', options: ['', 'Yes', 'No'] },
      { id: 'meeting-scheduled', label: 'Meeting scheduled', type: 'select', options: ['', 'Not yet', 'Agreed to meet', 'Meeting booked', 'Had meeting'] },
      { id: 'attending', label: 'Attending', type: 'select', options: ['', 'Yes', 'No', 'Maybe'] },
      { id: 'contact-type', label: 'Event role', type: 'select', options: ['', 'Attendee', 'Facilitator', 'Sponsor', 'Speaker', 'Staff'] },
      { id: 'moderator', label: 'Moderator', type: 'select', options: ['', 'Yes', 'No'] },
      { id: 'panelist', label: 'Panelist', type: 'select', options: ['', 'Yes', 'No'] },
      { id: 'workgroup-ideas', label: 'Proposed workgroup ideas', type: 'text', options: [] },
      { id: 'diary-invite', label: 'Diary invite sent', type: 'select', options: ['', 'Yes', 'No'] }
    ];
    (data.events || []).forEach(eventItem => {
      let group = data.groups.find(item => item.eventId === eventItem.id);
      if (!group) {
        group = {
          id: `group-${eventItem.id}`,
          name: eventItem.name,
          eventId: eventItem.id,
          description: 'Planning contacts for this Eventfrog event.',
          colour: 'pink',
          columns: ['organisation', 'jobTitle', 'status', 'contact-type', 'moderator', 'panelist', 'email', 'reached-out', 'meeting-scheduled', 'attending', 'notes'],
          customFields: structuredClone(defaultFields),
          createdAt: today(0)
        };
        data.groups.push(group);
      }
      group.columns ||= ['organisation', 'jobTitle', 'status', 'email', 'owner', 'notes'];
      group.customFields ||= [];
      defaultFields.forEach(field => {
        if (!group.customFields.some(item => item.id === field.id)) group.customFields.push(structuredClone(field));
      });
      if (!group.roleFieldsReady) {
        ['contact-type', 'moderator', 'panelist'].forEach(columnId => {
          if (!group.columns.includes(columnId)) group.columns.push(columnId);
        });
        group.roleFieldsReady = true;
      }
      (data.eventPeople || []).filter(item => item.eventId === eventItem.id).forEach(eventPerson => {
        if (eventPerson.role === 'Workgrouper') eventPerson.role = 'Facilitator';
        eventPerson.moderator = Boolean(eventPerson.moderator);
        eventPerson.panelist = Boolean(eventPerson.panelist);
        const existingMember = data.groupMembers.find(item => item.groupId === group.id && item.personId === eventPerson.personId);
        if (existingMember) {
          existingMember.values ||= {};
          existingMember.values['contact-type'] = eventPerson.role || '';
          existingMember.values.moderator = eventPerson.moderator ? 'Yes' : 'No';
          existingMember.values.panelist = eventPerson.panelist ? 'Yes' : 'No';
          return;
        }
        data.groupMembers.push({
          id: uid('group-member'),
          groupId: group.id,
          personId: eventPerson.personId,
          status: eventPerson.status || 'To contact',
          owner: eventPerson.owner || eventItem.owner || '',
          source: eventPerson.source || '',
          notes: '',
          values: {
            'attending': eventPerson.status === 'Confirmed' ? 'Yes' : eventPerson.status === 'Declined' ? 'No' : '',
            'contact-type': eventPerson.role || '',
            'moderator': eventPerson.moderator ? 'Yes' : 'No',
            'panelist': eventPerson.panelist ? 'Yes' : 'No',
            'diary-invite': eventPerson.diaryInvite ? 'Yes' : 'No',
            'workgroup-ideas': eventPerson.workgroup || ''
          }
        });
      });
    });
    const folkGroupNames = [...new Set((data.people || []).flatMap(contact => contact.folkGroups || []).map(name => String(name || '').trim()).filter(Boolean))];
    folkGroupNames.forEach(name => {
      let group = data.groups.find(item => item.name.trim().toLowerCase() === name.toLowerCase());
      if (!group) {
        const contacts = data.people.filter(contact => (contact.folkGroups || []).some(groupName => String(groupName).trim().toLowerCase() === name.toLowerCase()));
        const importedFields = [...new Set(contacts.flatMap(contact => Object.keys(contact.customFields || {})))];
        group = {
          id: uid('group'),
          name,
          eventId: '',
          description: 'Imported from Folk.',
          colour: 'purple',
          columns: ['organisation', 'jobTitle', 'email', 'status', ...importedFields.slice(0, 5).map(groupFieldId), 'notes'],
          customFields: importedFields.map(label => ({ id: groupFieldId(label), label, type: 'text', options: [] })),
          createdAt: today(0)
        };
        data.groups.push(group);
      }
      data.people.filter(contact => (contact.folkGroups || []).some(groupName => String(groupName).trim().toLowerCase() === name.toLowerCase())).forEach(contact => {
        if (data.groupMembers.some(item => item.groupId === group.id && item.personId === contact.id)) return;
        const values = Object.fromEntries((group.customFields || []).map(field => [field.id, contact.customFields?.[field.label] || '']));
        data.groupMembers.push({ id: uid('group-member'), groupId: group.id, personId: contact.id, status: 'To contact', owner: contact.owner || '', source: 'Folk import', notes: '', values });
      });
    });
    data.groupMembers.forEach(item => {
      item.values ||= {};
      item.status ||= 'To contact';
      item.owner ||= '';
      item.source ||= '';
      item.notes ||= '';
    });
    return data;
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if ([5, 6].includes(saved?.version)) {
        saved.enrichmentProviders = structuredClone(LIVE_ENRICHMENT_PROVIDERS);
        saved.workgroupParticipation ||= [];
        return ensureGroups(ensureSponsorDirectory(saved));
      }
    } catch {}
    return ensureGroups(ensureSponsorDirectory(seed()));
  }
  let state = load();
  const connection = { mode: 'connecting', message: 'Checking secure workspace', user: null, role: '' };
  let connectionBusy = false;
  ui.eventId = state.events[0]?.id || '';
  ui.groupId = state.groups.find(item => item.eventId === ui.eventId)?.id || state.groups[0]?.id || '';
  const saveLocal = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const save = () => {
    saveLocal();
    window.WorkgroupCrmData?.scheduleSave(state);
  };
  const event = id => state.events.find(item => item.id === id);
  const currentEvent = () => event(ui.eventId);
  const person = id => state.people.find(item => item.id === id);
  const organisation = id => state.organisations.find(item => item.id === id);
  const memberships = () => state.eventPeople.filter(item => item.eventId === ui.eventId);
  const currentGroup = () => state.groups.find(item => item.id === ui.groupId) || state.groups[0] || null;
  const groupMemberships = groupId => state.groupMembers.filter(item => item.groupId === (groupId || currentGroup()?.id));
  const organisationFor = personItem => organisation(personItem?.organisationId);
  const personAvatar = contact => `<span class="avatar"><span>${initials(fullName(contact))}</span>${contact?.headshotUrl ? `<img src="${esc(contact.headshotUrl)}" alt="">` : ''}</span>`;
  const organisationLogo = org => `<span class="company-mark"><span>${esc(org?.logo || initials(org?.name))}</span>${org?.logoUrl ? `<img src="${esc(org.logoUrl)}" alt="">` : ''}</span>`;
  const organisationMatch = input => window.WorkgroupOrganisationMatcher?.findBest(input, state.organisations) || null;

  function eventBundle(eventflowEventId) {
    const eventItem = state.events.find(item => item.eventflowId === eventflowEventId || item.id === eventflowEventId);
    if (!eventItem) return null;
    const eventContacts = state.eventPeople.filter(item => item.eventId === eventItem.id);
    const sponsors = state.sponsorships.filter(item => item.eventId === eventItem.id);
    return {
      eventflowEventId: eventItem.eventflowId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalContacts: eventContacts.length,
        confirmedContacts: eventContacts.filter(item => item.status === 'Confirmed').length,
        speakerCount: eventContacts.filter(item => item.role === 'Speaker' || item.moderator || item.panelist).length,
        confirmedSponsorCount: sponsors.filter(item => item.stage === 'Confirmed').length
      },
      contacts: eventContacts.map(item => {
        const contact = person(item.personId);
        const org = organisationFor(contact);
        return {
          contactId: contact?.id || item.personId,
          fullName: fullName(contact),
          jobTitle: contact?.jobTitle || '',
          email: contact?.email || '',
          headshotAssetUrl: contact?.headshotUrl || '',
          organisationId: org?.id || '',
          organisationName: org?.name || '',
          eventRole: item.role,
          isModerator: Boolean(item.moderator),
          isPanelist: Boolean(item.panelist),
          eventStatus: item.status || '',
          workgroup: item.workgroup || '',
          owner: item.owner || '',
          lastInteractionAt: contact?.lastInteraction || ''
        };
      }),
      sponsors: sponsors.map(item => {
        const org = organisation(item.organisationId);
        return {
          sponsorshipId: item.id,
          organisationId: item.organisationId,
          organisationName: org?.name || '',
          logoAssetUrl: org?.logoUrl || '',
          stage: item.stage,
          category: item.category || '',
          owner: item.owner || ''
        };
      }),
      segments: state.segments.filter(item => !item.eventId || item.eventId === eventItem.id).map(item => ({
        segmentId: item.id,
        name: item.name,
        purpose: item.purpose || '',
        contactCount: segmentCount(item)
      }))
    };
  }

  function upsertEventFromEventFlow(incoming = {}) {
    const eventflowId = String(incoming.eventflowEventId || incoming.eventflowId || '').trim();
    const name = String(incoming.name || '').trim();
    if (!eventflowId || !name) throw new Error('Eventfrog event ID and name are required');
    let eventItem = state.events.find(item => item.eventflowId === eventflowId);
    if (!eventItem) {
      eventItem = { id: uid('event'), eventflowId, name, branch: '', date: '', venue: '', owner: '' };
      state.events.push(eventItem);
    }
    ['name', 'branch', 'date', 'venue', 'owner'].forEach(field => {
      if (incoming[field] !== undefined) eventItem[field] = String(incoming[field] || '');
    });
    ensureGroups(state);
    save();
    render();
    window.dispatchEvent(new CustomEvent('workgroup:crm-event-space-ready', { detail: { eventId: eventItem.id, eventflowEventId: eventItem.eventflowId } }));
    return structuredClone(eventItem);
  }

  function accountOwner() {
    const user = connection.user;
    const metadata = user?.user_metadata || {};
    const savedName = String(metadata.name || metadata.full_name || metadata.display_name || '').trim();
    if (savedName) return savedName;
    const emailName = String(user?.email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
    if (emailName) return emailName.replace(/\b\w/g, letter => letter.toUpperCase());
    return currentEvent()?.owner || 'Unassigned';
  }

  function ownerPicker() {
    const owner = accountOwner();
    return `<div class="owner-picker" data-owner-picker>
      <span class="owner-chip" data-owner-chip><span>${esc(owner)}</span><button type="button" data-clear-owner aria-label="Remove ${esc(owner)} as contact owner">×</button></span>
      <input name="owner" data-owner-input value="${esc(owner)}" aria-label="Contact owner" hidden>
    </div><small>Defaults to your signed-in account. Remove it to enter a different owner.</small>`;
  }

  function resolveOrganisation(input, details = {}, forceNew = false) {
    const typed = String(input || '').trim();
    if (!typed) return { organisation: null, created: false, confidence: 0 };
    const match = forceNew ? null : organisationMatch(typed);
    if (match) {
      const org = match.organisation;
      org.aliases ||= [];
      if (window.WorkgroupOrganisationMatcher.normalise(typed) !== window.WorkgroupOrganisationMatcher.normalise(org.name)
        && !org.aliases.some(alias => window.WorkgroupOrganisationMatcher.normalise(alias) === window.WorkgroupOrganisationMatcher.normalise(typed))) {
        org.aliases.push(typed);
      }
      Object.entries(details).forEach(([field, value]) => {
        if (value !== undefined && value !== null && value !== '' && !org[field]) org[field] = value;
      });
      return { organisation: org, created: false, confidence: match.confidence };
    }
    const org = {
      id: uid('org'),
      ...window.WorkgroupOrganisationMatcher.createDraft(typed),
      ...details
    };
    org.logo ||= initials(org.name);
    org.enrichment = 'Ready to enhance';
    state.organisations.push(org);
    return { organisation: org, created: true, confidence: 0 };
  }

  async function queueOrganisationEnhancement(org) {
    if (!org) return;
    org.enrichment = 'Ready to enhance';
    save();
    if (!window.WorkgroupEnrichment?.isConfigured()) return;
    try {
      const result = await window.WorkgroupEnrichment.request({
        workspaceId: window.CRM_CONFIG?.workspaceId || '',
        eventflowEventId: currentEvent()?.eventflowId || '',
        entityType: 'organisation',
        entityId: org.id,
        name: org.name,
        domain: org.domain || '',
        websiteUrl: org.domain ? (/^https?:\/\//i.test(org.domain) ? org.domain : `https://${org.domain}`) : '',
        fields: ['domain', 'logoUrl', 'industry', 'employeeRange', 'description']
      });
      result.suggestions.forEach(suggestion => state.enrichmentSuggestions.unshift({
        id: uid('suggestion'),
        eventId: ui.eventId,
        status: 'Pending',
        ...suggestion
      }));
      org.enrichment = result.suggestions.length ? 'Review' : 'Ready to enhance';
      save();
      if (['organisations', 'enrichment'].includes(ui.view)) render();
      if (result.suggestions.length) toast(`${result.suggestions.length} company details ready to review`);
    } catch {
      org.enrichment = 'Ready to enhance';
      save();
    }
  }

  function organisationPicker(required = false) {
    return `<div class="organisation-picker"><input name="organisationName" data-organisation-search autocomplete="off" placeholder="Start typing a company name" aria-label="Organisation" aria-expanded="false"${required ? ' required' : ''}>
      <div class="organisation-suggestions" data-organisation-suggestions hidden></div></div>
      <small>Choose a live match to link its website, logo and details, or add a genuinely new company.</small>`;
  }

  function drawOrganisationSuggestions(input, localMatches, externalMatches = [], loading = false) {
    const panel = input.closest('.organisation-picker')?.querySelector('[data-organisation-suggestions]');
    if (!panel) return;
    ui.organisationSearchResults = externalMatches;
    const typed = input.value.trim();
    const localRows = localMatches.map(item => {
      const org = item.organisation;
      return `<button type="button" class="company-suggestion" data-select-organisation="${org.id}">
        ${organisationLogo(org)}<span><strong>${esc(org.name)}</strong><small>${esc(org.domain || org.industry || 'Existing CRM organisation')}</small></span><b>${item.confidence}% match</b></button>`;
    }).join('');
    const externalRows = externalMatches.map((item, index) => `<button type="button" class="company-suggestion external" data-select-company-result="${index}">
      ${organisationLogo({ name: item.name, logo: initials(item.name), logoUrl: item.logoUrl })}<span><strong>${esc(item.name)}</strong><small>${esc(item.domain || item.industry || item.sourceLabel)}</small></span><b>${item.confidence ? `${item.confidence}%` : 'Web result'}</b></button>`).join('');
    const externalHeading = externalRows ? '<div class="suggestion-heading">Company search</div>' : '';
    const providerMessage = loading ? '<div class="suggestion-message">Searching internet company sources…</div>' : '';
    panel.innerHTML = `${localRows ? '<div class="suggestion-heading">Existing CRM matches</div>' : ''}${localRows}${externalHeading}${externalRows}${providerMessage}
      <button type="button" class="company-suggestion create" data-use-new-organisation><span class="new-company-mark">+</span><span><strong>Add “${esc(typed)}” as a new organisation</strong><small>It will be queued for logo and company-detail enrichment</small></span></button>`;
    panel.hidden = !typed;
    input.setAttribute('aria-expanded', String(Boolean(typed)));
  }

  async function searchOrganisationsLive(input, sequence) {
    const query = input.value.trim();
    if (!query) {
      const panel = input.closest('.organisation-picker')?.querySelector('[data-organisation-suggestions]');
      if (panel) panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      return;
    }
    delete input.dataset.selectedOrganisationId;
    delete input.dataset.selectedCompanyResult;
    delete input.dataset.useNewOrganisation;
    const localMatches = window.WorkgroupOrganisationMatcher.search(query, state.organisations);
    const live = Boolean(window.WorkgroupEnrichment?.isCompanySearchConfigured());
    drawOrganisationSuggestions(input, localMatches, [], live);
    if (!live) return;
    try {
      const externalMatches = await window.WorkgroupEnrichment.searchOrganisations(query);
      if (sequence !== organisationSearchSequence || input.value.trim() !== query) return;
      drawOrganisationSuggestions(input, localMatches, externalMatches, false);
    } catch {
      if (sequence !== organisationSearchSequence) return;
      drawOrganisationSuggestions(input, localMatches, [], false);
    }
  }

  function selectOrganisationSuggestion(target) {
    const input = target.closest('.organisation-picker')?.querySelector('[data-organisation-search]')
      || modalRoot.querySelector('[data-organisation-search]');
    if (!input) return;
    if (target.dataset.selectOrganisation) {
      const org = organisation(target.dataset.selectOrganisation);
      if (!org) return;
      input.value = org.name;
      input.dataset.selectedOrganisationId = org.id;
    }
    if (target.dataset.selectCompanyResult !== undefined) {
      const result = ui.organisationSearchResults[Number(target.dataset.selectCompanyResult)];
      if (!result) return;
      input.value = result.name;
      input.dataset.selectedCompanyResult = String(target.dataset.selectCompanyResult);
    }
    if (target.hasAttribute('data-use-new-organisation')) input.dataset.useNewOrganisation = 'true';
    const panel = input.closest('.organisation-picker')?.querySelector('[data-organisation-suggestions]');
    if (panel) panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  function heading(eyebrow, title) {
    pageEyebrow.textContent = eyebrow;
    pageTitle.textContent = title;
  }

  function pill(value) {
    const text = String(value || 'Not set');
    const colour = /confirm|complete|ready|accepted|connected|active partner/i.test(text) ? 'green'
      : /discuss|contact|review/i.test(text) ? 'orange'
      : /invite|research|no response/i.test(text) ? 'blue'
      : /speaker|workgroup/i.test(text) ? 'purple' : '';
    return `<span class="status-pill ${colour}">${esc(text)}</span>`;
  }

  function metric(label, value, note, accent = 'var(--pink)') {
    return `<article class="metric-card" style="--accent:${accent}">
      <div class="metric-label">${esc(label)}</div><div class="metric-value">${esc(value)}</div>
      <div class="metric-note">${esc(note)}</div></article>`;
  }

  function eventBanner() {
    const item = currentEvent();
    const list = memberships();
    const confirmed = list.filter(entry => entry.status === 'Confirmed').length;
    return `<section class="event-banner">
      <div><small>${esc(item.branch)} event contact workspace</small><h2>${esc(item.name)}</h2>
      <p>${formatDate(item.date)} · ${esc(item.venue)} · Event owner ${esc(item.owner)}</p></div>
      <div class="event-health"><span>${list.length} people</span><span>${confirmed} confirmed</span><span>${state.sponsorships.filter(s => s.eventId === item.id && s.stage === 'Confirmed').length} sponsors</span></div>
    </section>`;
  }

  function activityRow(item) {
    const contact = person(item.personId);
    return `<div class="activity-row">
      <div class="activity-icon">${item.type === 'Call' ? '☎' : item.type === 'Note' ? '•' : '↗'}</div>
      <div><strong>${esc(item.text)}</strong><small>${esc(fullName(contact))} · ${formatDate(item.due)} · ${esc(item.owner)}</small></div>
      ${pill(item.done ? 'Complete' : 'Open')}</div>`;
  }

  function renderOverview() {
    heading('Event relationships', 'Contact overview');
    const list = memberships();
    const speakers = list.filter(item => item.role === 'Speaker');
    const confirmed = list.filter(item => item.status === 'Confirmed');
    const sponsors = state.sponsorships.filter(item => item.eventId === ui.eventId);
    const ready = state.people.filter(item => organisationFor(item)?.enrichment === 'Complete').length;
    const roleCounts = ROLE_TABS.slice(1).map(role => ({ role, count: list.filter(item => item.role === role).length }));
    const actions = state.activities.filter(item => item.eventId === ui.eventId && !item.done).sort((a, b) => a.due.localeCompare(b.due));
    view.innerHTML = `${eventBanner()}
      <div class="cards">
        ${metric('Event contacts', list.length, `${confirmed.length} confirmed`, 'var(--pink)')}
        ${metric('Speakers', speakers.length, `${speakers.filter(item => item.status === 'Confirmed').length} confirmed`, 'var(--purple)')}
        ${metric('Sponsor organisations', sponsors.length, `${sponsors.filter(item => item.stage === 'Confirmed').length} confirmed`, 'var(--orange)')}
        ${metric('Enrichment ready', ready, `${state.people.length - ready} records need review`, 'var(--green)')}
      </div>
      <div class="dashboard-grid">
        <section class="panel"><div class="panel-head"><div><h3>Event contact mix</h3><p>One contact can have a different role at each event</p></div><button class="button ghost small" data-view-link="event-contacts">Open list</button></div>
          <div class="panel-body">${roleCounts.map((item, index) => `<div class="progress-row"><label>${item.role}s</label><div class="progress"><i style="width:${list.length ? Math.max(6, item.count / list.length * 100) : 0}%;--accent:${['var(--pink)', 'var(--purple)', 'var(--blue)', 'var(--green)'][index]}"></i></div><b>${item.count}</b></div>`).join('')}</div>
        </section>
        <section class="panel"><div class="panel-head"><div><h3>Next relationship actions</h3><p>${actions.length} open for this event</p></div><button class="button ghost small" data-add="activity">+ Add</button></div>
          <div class="panel-body">${actions.length ? actions.slice(0, 5).map(activityRow).join('') : '<div class="empty"><strong>Nothing due</strong>Your event relationships are up to date.</div>'}</div>
        </section>
      </div>`;
  }

  function personRow(entry) {
    const contact = person(entry.personId);
    const org = organisationFor(contact);
    return `<tr data-person="${contact.id}">
      <td><div class="person-cell">${personAvatar(contact)}<div><strong>${esc(fullName(contact))}</strong><small>${esc(contact.jobTitle)}</small></div></div></td>
      <td><div class="organisation-cell">${organisationLogo(org)}<span>${esc(org?.name || '—')}</span></div></td><td><div class="role-pills">${pill(entry.role)}${entry.moderator ? pill('Moderator') : ''}${entry.panelist ? pill('Panelist') : ''}</div></td><td>${pill(entry.status)}</td>
      <td>${esc(entry.source || '—')}</td><td>${esc(entry.owner || '—')}</td><td>${formatDate(contact.lastInteraction)}</td>
      <td>${entry.diaryInvite ? pill('Sent') : pill('Not sent')}</td></tr>`;
  }

  function renderEventContacts() {
    heading('Event workspace', 'Event contacts');
    const filtered = memberships().filter(entry => {
      const contact = person(entry.personId);
      const org = organisationFor(contact);
      return (ui.role === 'All' || entry.role === ui.role)
        && (ui.attendance === 'all' || entry.status === ui.attendance)
        && (ui.owner === 'all' || entry.owner === ui.owner)
        && matches(fullName(contact), contact.email, contact.jobTitle, org?.name, entry.role, entry.status, entry.source);
    });
    const owners = [...new Set(memberships().map(item => item.owner))];
    const statuses = [...new Set(memberships().map(item => item.status))];
    view.innerHTML = `<div class="view-intro"><div><h2>${esc(currentEvent().name)}</h2><p>Manage attendees, facilitators, sponsor contacts and speakers without duplicating their master contact record.</p></div>
      <div class="intro-actions"><button class="button secondary" data-export="event-contacts">Export CSV</button><button class="button secondary" data-email-segment>Prepare email</button><button class="button primary" data-add="event-person">+ Add to event</button></div></div>
      <div class="tabs">${ROLE_TABS.map(role => `<button class="${ui.role === role ? 'active' : ''}" data-role-tab="${role}">${role}${role === 'All' ? ` (${memberships().length})` : ''}</button>`).join('')}</div>
      <div class="toolbar"><input id="listSearch" type="search" placeholder="Search this event" value="${esc(ui.query)}">
        <select id="attendanceFilter"><option value="all">All statuses</option>${statuses.map(status => `<option value="${esc(status)}" ${ui.attendance === status ? 'selected' : ''}>${esc(status)}</option>`).join('')}</select>
        <select id="ownerFilter"><option value="all">All owners</option>${owners.map(owner => `<option value="${esc(owner)}" ${ui.owner === owner ? 'selected' : ''}>${esc(owner)}</option>`).join('')}</select>
        <span class="status-pill toolbar-spacer">${filtered.length} shown</span></div>
      <section class="panel table-wrap"><table class="record-table"><thead><tr><th>Person</th><th>Organisation</th><th>Role / appearance</th><th>Status</th><th>Source</th><th>Owner</th><th>Last interaction</th><th>Diary invite</th></tr></thead>
      <tbody>${filtered.length ? filtered.map(personRow).join('') : '<tr><td colspan="8"><div class="empty"><strong>No matches</strong>Try changing the view or filters.</div></td></tr>'}</tbody></table></section>`;
  }

  function groupMemberCell(member, columnId, group) {
    const contact = person(member.personId);
    const org = organisationFor(contact);
    if (columnId === 'organisation') return `<div class="organisation-cell">${organisationLogo(org)}<span>${esc(org?.name || '—')}</span></div>`;
    if (columnId === 'jobTitle') return esc(contact?.jobTitle || '—');
    if (columnId === 'email') return contact?.email ? `<a class="table-link" href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>` : '—';
    if (columnId === 'status') return `<select class="inline-field status-field" data-group-member-field="${member.id}" data-field="status" aria-label="Status for ${esc(fullName(contact))}">${GROUP_STATUSES.map(status => `<option ${member.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select>`;
    if (columnId === 'owner') return `<input class="inline-field" data-group-member-field="${member.id}" data-field="owner" value="${esc(member.owner || '')}" placeholder="Unassigned" aria-label="Owner for ${esc(fullName(contact))}">`;
    if (columnId === 'source') return `<input class="inline-field" data-group-member-field="${member.id}" data-field="source" value="${esc(member.source || '')}" placeholder="Add source" aria-label="Source for ${esc(fullName(contact))}">`;
    if (columnId === 'lastInteraction') return formatDate(contact?.lastInteraction);
    if (columnId === 'notes') return `<input class="inline-field notes-field" data-group-member-field="${member.id}" data-field="notes" value="${esc(member.notes || '')}" placeholder="Add a note" aria-label="Notes for ${esc(fullName(contact))}">`;
    const field = (group.customFields || []).find(item => item.id === columnId);
    if (!field) return '—';
    const value = member.values?.[field.id] || '';
    if (field.type === 'select') return `<select class="inline-field" data-group-member-custom="${member.id}" data-field="${esc(field.id)}" aria-label="${esc(field.label)} for ${esc(fullName(contact))}">${(field.options || ['']).map(option => `<option value="${esc(option)}" ${value === option ? 'selected' : ''}>${esc(option || 'Not set')}</option>`).join('')}</select>`;
    return `<input class="inline-field" data-group-member-custom="${member.id}" data-field="${esc(field.id)}" value="${esc(value)}" placeholder="Add ${esc(field.label.toLowerCase())}" aria-label="${esc(field.label)} for ${esc(fullName(contact))}">`;
  }

  function renderGroups() {
    const group = currentGroup();
    heading('Event contact lists', group?.name || 'Events');
    if (!group) {
      view.innerHTML = '<div class="empty"><strong>No events are available</strong>Events from Eventfrog will appear here automatically.</div>';
      return;
    }
    ui.groupId = group.id;
    const allMembers = groupMemberships(group.id).filter(member => person(member.personId));
    const actionStatuses = ['Researching', 'To contact', 'Invited', 'Reached out', 'Discussing', 'No response'];
    const viewMembers = allMembers.filter(member => {
      const contact = person(member.personId);
      const org = organisationFor(contact);
      const eventPerson = state.eventPeople.find(item => item.eventId === group.eventId && item.personId === member.personId);
      const sectionMatch = ui.groupSection === 'all'
        || (ui.groupSection === 'workgroupers' && (eventPerson?.role === 'Facilitator' || eventPerson?.role === 'Speaker' || eventPerson?.moderator || eventPerson?.panelist))
        || (ui.groupSection === 'attendees' && eventPerson?.role === 'Attendee')
        || (ui.groupSection === 'sponsors' && eventPerson?.role === 'Sponsor');
      const viewMatch = ui.groupView === 'all'
        || (ui.groupView === 'action' && actionStatuses.includes(member.status))
        || (ui.groupView === 'confirmed' && member.status === 'Confirmed')
        || (ui.groupView === 'declined' && member.status === 'Declined');
      return sectionMatch && viewMatch
        && (ui.groupStatus === 'all' || member.status === ui.groupStatus)
        && (ui.groupOwner === 'all' || member.owner === ui.groupOwner)
        && matches(fullName(contact), contact.email, contact.jobTitle, org?.name, member.status, member.owner, member.source, member.notes, ...Object.values(member.values || {}));
    });
    const owners = [...new Set(allMembers.map(item => item.owner).filter(Boolean))].sort();
    const statuses = [...new Set(allMembers.map(item => item.status).filter(Boolean))];
    const columns = (group.columns || []).filter(columnId => GROUP_FIXED_COLUMNS.some(item => item.id === columnId) || (group.customFields || []).some(item => item.id === columnId));
    const columnLabel = columnId => GROUP_FIXED_COLUMNS.find(item => item.id === columnId)?.label
      || group.customFields?.find(item => item.id === columnId)?.label
      || columnId;
    const linkedEvent = event(group.eventId);
    const eventPersonFor = member => state.eventPeople.find(item => item.eventId === group.eventId && item.personId === member.personId);
    const sectionCounts = {
      all: allMembers.length,
      workgroupers: allMembers.filter(member => {
        const item = eventPersonFor(member);
        return item?.role === 'Facilitator' || item?.role === 'Speaker' || item?.moderator || item?.panelist;
      }).length,
      attendees: allMembers.filter(member => eventPersonFor(member)?.role === 'Attendee').length,
      sponsors: allMembers.filter(member => eventPersonFor(member)?.role === 'Sponsor').length
    };
    view.innerHTML = `<div class="view-intro group-intro"><div><div class="group-title-line"><span class="group-dot ${esc(group.colour || 'pink')}"></span><h2>${esc(group.name)}</h2></div><p>${esc(group.description || 'An event-specific contact workspace.')}${linkedEvent ? ` Linked to Eventfrog ID ${esc(linkedEvent.eventflowId)}.` : ''}</p></div>
      <div class="intro-actions"><button class="button secondary" data-export="group">Export CSV</button><button class="button secondary" data-email-group="${group.id}" ${allMembers.some(member => person(member.personId)?.email) ? '' : 'disabled'}>Email list</button><button class="button secondary" data-group-columns="${group.id}">Fields & columns</button><button class="button primary" data-add-group-people="${group.id}">+ Add people</button></div></div>
      <div class="group-summary"><span>${allMembers.length} people</span><span>${allMembers.filter(item => item.status === 'Confirmed').length} confirmed</span><span>${allMembers.filter(item => actionStatuses.includes(item.status)).length} need action</span>${linkedEvent ? `<span>${formatDate(linkedEvent.date)}</span>` : '<span>Standalone list</span>'}</div>
      <div class="tabs event-space-tabs">${[
        ['all', 'All contacts'],
        ['workgroupers', 'Workgroupers & Panelists'],
        ['attendees', 'Attendee list'],
        ['sponsors', 'Sponsors']
      ].map(([id, label]) => `<button class="${ui.groupSection === id ? 'active' : ''}" data-group-section="${id}">${label} (${sectionCounts[id]})</button>`).join('')}</div>
      <div class="toolbar"><input id="listSearch" type="search" placeholder="Search this event list" value="${esc(ui.query)}">
        <select id="groupProgressFilter"><option value="all">All progress</option><option value="action" ${ui.groupView === 'action' ? 'selected' : ''}>Needs action</option><option value="confirmed" ${ui.groupView === 'confirmed' ? 'selected' : ''}>Confirmed</option><option value="declined" ${ui.groupView === 'declined' ? 'selected' : ''}>Declined</option></select>
        <select id="groupStatusFilter"><option value="all">All statuses</option>${statuses.map(status => `<option value="${esc(status)}" ${ui.groupStatus === status ? 'selected' : ''}>${esc(status)}</option>`).join('')}</select>
        <select id="groupOwnerFilter"><option value="all">All owners</option>${owners.map(owner => `<option value="${esc(owner)}" ${ui.groupOwner === owner ? 'selected' : ''}>${esc(owner)}</option>`).join('')}</select>
        <span class="status-pill toolbar-spacer">${viewMembers.length} shown</span></div>
      <section class="panel table-wrap group-table-wrap"><table class="record-table group-table"><thead><tr><th>Person</th>${columns.map(columnId => `<th>${esc(columnLabel(columnId))}</th>`).join('')}<th></th></tr></thead><tbody>
      ${viewMembers.length ? viewMembers.map(member => {
        const contact = person(member.personId);
        return `<tr><td><button class="person-link-cell" data-person="${contact.id}">${personAvatar(contact)}<span><strong>${esc(fullName(contact))}</strong><small>${esc(contact.jobTitle || organisationFor(contact)?.name || 'Contact')}</small></span></button></td>${columns.map(columnId => `<td>${groupMemberCell(member, columnId, group)}</td>`).join('')}<td><button class="row-remove" data-remove-group-member="${member.id}" aria-label="Remove ${esc(fullName(contact))} from this event list">×</button></td></tr>`;
      }).join('') : `<tr><td colspan="${columns.length + 2}"><div class="empty"><strong>${allMembers.length ? 'No matches' : 'No people in this event yet'}</strong>${allMembers.length ? 'Try changing the filters.' : 'Add existing CRM contacts to start planning this event.'}</div></td></tr>`}</tbody></table></section>
      <div class="table-add-row"><button data-add-group-people="${group.id}">+ Add person</button><button data-group-columns="${group.id}">+ Add or show a field</button></div>`;
  }

  function boardCardForSpeaker(item) {
    const contact = person(item.personId);
    const org = organisationFor(contact);
    return `<article class="board-card" data-person="${contact.id}"><div class="board-identity">${personAvatar(contact)}<div><h4>${esc(fullName(contact))}</h4><p>${esc(contact.jobTitle)}<br>${esc(org?.name || 'No organisation')}</p></div></div>
      <div class="board-card-foot"><span>${esc(item.topic || 'Topic TBC')}</span><span>${esc(item.owner)}</span></div>
      <select data-speaker-stage="${item.id}" aria-label="Change speaker status">${SPEAKER_STAGES.map(stage => `<option ${item.stage === stage ? 'selected' : ''}>${stage}</option>`).join('')}</select></article>`;
  }

  function renderSpeakers() {
    heading('Speaker planning', 'Speakers');
    const eventSpeakers = state.speakerProspects.filter(item => item.eventId === ui.eventId);
    view.innerHTML = `<div class="view-intro"><div><h2>Speaker planning</h2><p>Research, invite and confirm speakers while keeping their event topic and master contact history together.</p></div>
      <div class="intro-actions"><button class="button secondary" data-export="speakers">Export speaker sheet</button><button class="button primary" data-add="speaker">+ Add speaker</button></div></div>
      <div class="board">${SPEAKER_STAGES.map(stage => {
        const items = eventSpeakers.filter(item => item.stage === stage);
        return `<section class="board-column"><div class="board-head"><strong>${stage}</strong><span>${items.length}</span></div>${items.map(boardCardForSpeaker).join('') || '<div class="empty">No speakers</div>'}</section>`;
      }).join('')}</div>`;
  }

  function sponsorCard(item) {
    const org = organisation(item.organisationId);
    return `<article class="board-card" data-organisation="${org.id}"><div class="board-identity">${organisationLogo(org)}<div><h4>${esc(org.name)}</h4><p>${esc(item.category)}<br>${esc(org.industry)}</p></div></div>
      <div class="board-card-foot"><span>${item.probability}% chance</span><span>${esc(item.owner)}</span></div>
      <select data-sponsor-stage="${item.id}" aria-label="Change sponsor status">${SPONSOR_STAGES.map(stage => `<option ${item.stage === stage ? 'selected' : ''}>${stage}</option>`).join('')}</select></article>`;
  }

  function renderSponsors() {
    heading('Organisation workflow', 'Sponsors');
    const eventSponsors = state.sponsorships.filter(item => item.eventId === ui.eventId);
    view.innerHTML = `<div class="view-intro"><div><h2>Sponsorship organisations</h2><p>Track companies against an event, with their category, owner, likelihood and related contacts.</p></div>
      <div class="intro-actions"><button class="button secondary" data-export="sponsors">Export sponsor list</button><button class="button primary" data-add="sponsor">+ Add organisation</button></div></div>
      <div class="board">${SPONSOR_STAGES.map(stage => {
        const items = eventSponsors.filter(item => item.stage === stage);
        return `<section class="board-column"><div class="board-head"><strong>${stage}</strong><span>${items.length}</span></div>${items.map(sponsorCard).join('') || '<div class="empty">No organisations</div>'}</section>`;
      }).join('')}</div>`;
  }

  function renderSponsorDirectory() {
    heading('Master directory', 'Sponsor directory');
    const records = (state.sponsorDirectory || []).map(directoryEntry => ({
      directoryEntry,
      org: organisation(directoryEntry.organisationId)
    })).filter(item => item.org && matches(
      item.org.name,
      item.org.industry,
      item.directoryEntry.relationshipStatus,
      item.directoryEntry.category,
      item.directoryEntry.owner,
      item.directoryEntry.notes
    ));
    const activeCount = (state.sponsorDirectory || []).filter(item => item.relationshipStatus === 'Active partner').length;
    const currentEventCount = new Set(state.sponsorships.filter(item => item.eventId === ui.eventId).map(item => item.organisationId)).size;
    view.innerHTML = `<div class="view-intro"><div><h2>${(state.sponsorDirectory || []).length} sponsor organisations</h2><p>A single sponsor relationship record across every event, including previous partners and future prospects.</p></div>
      <button class="button primary" data-add="sponsor-directory">+ Add sponsor organisation</button></div>
      <div class="cards">
        ${metric('Directory organisations', (state.sponsorDirectory || []).length, 'One master relationship per company', 'var(--pink)')}
        ${metric('Active partners', activeCount, 'Current organisation-level relationships', 'var(--green)')}
        ${metric('On this event', currentEventCount, currentEvent().name, 'var(--blue)')}
        ${metric('Event records', state.sponsorships.length, 'Sponsorship history across Eventfrog events', 'var(--purple)')}
      </div>
      <div class="toolbar"><input id="listSearch" type="search" placeholder="Search sponsor organisations" value="${esc(ui.query)}"><span class="status-pill">${records.length} shown</span></div>
      <section class="panel table-wrap"><table class="record-table"><thead><tr><th>Organisation</th><th>Relationship</th><th>Category</th><th>Event history</th><th>Current event</th><th>Contacts</th><th>Owner</th></tr></thead><tbody>
      ${records.map(({ directoryEntry, org }) => {
        const sponsorshipHistory = state.sponsorships.filter(item => item.organisationId === org.id);
        const currentSponsorship = sponsorshipHistory.find(item => item.eventId === ui.eventId);
        const contactCount = state.people.filter(item => item.organisationId === org.id).length;
        return `<tr data-sponsor-directory="${directoryEntry.id}"><td><div class="organisation-cell">${organisationLogo(org)}<span><strong>${esc(org.name)}</strong><small>${esc(org.industry || org.domain || 'Organisation')}</small></span></div></td><td>${pill(directoryEntry.relationshipStatus)}</td><td>${esc(directoryEntry.category || 'Not set')}</td><td>${sponsorshipHistory.length} event${sponsorshipHistory.length === 1 ? '' : 's'}</td><td>${currentSponsorship ? pill(currentSponsorship.stage) : '—'}</td><td>${contactCount}</td><td>${esc(directoryEntry.owner || 'Unassigned')}</td></tr>`;
      }).join('') || '<tr><td colspan="7"><div class="empty"><strong>No sponsor organisations found</strong>Add an existing organisation or change the search.</div></td></tr>'}</tbody></table></section>`;
  }

  function renderPeople() {
    heading('Master directory', 'All people');
    const rows = state.people.filter(contact => {
      const org = organisationFor(contact);
      return matches(fullName(contact), contact.email, contact.jobTitle, org?.name, contact.owner);
    });
    view.innerHTML = `<div class="view-intro"><div><h2>${state.people.length} master contacts</h2><p>Each person exists once, even when they attend several events or hold different event roles.</p></div><button class="button primary" data-add="person">+ Add person</button></div>
      <div class="toolbar"><input id="listSearch" type="search" placeholder="Search all people" value="${esc(ui.query)}"><span class="status-pill">${rows.length} shown</span></div>
      <section class="panel table-wrap"><table class="record-table"><thead><tr><th>Person</th><th>Organisation</th><th>Email</th><th>Owner</th><th>Events</th><th>Last interaction</th><th>Enrichment</th></tr></thead><tbody>
      ${rows.map(contact => {
        const org = organisationFor(contact);
        const eventCount = state.eventPeople.filter(item => item.personId === contact.id).length;
        return `<tr data-person="${contact.id}"><td><div class="person-cell">${personAvatar(contact)}<div><strong>${esc(fullName(contact))}</strong><small>${esc(contact.jobTitle)}</small></div></div></td><td><div class="organisation-cell">${organisationLogo(org)}<span>${esc(org?.name || '—')}</span></div></td><td>${esc(contact.email || '—')}</td><td>${esc(contact.owner || '—')}</td><td>${eventCount}</td><td>${formatDate(contact.lastInteraction)}</td><td>${pill(org?.enrichment || 'Needs review')}</td></tr>`;
      }).join('')}</tbody></table></section>`;
  }

  function renderOrganisations() {
    heading('Master directory', 'Organisations');
    const rows = state.organisations.filter(org => matches(org.name, org.industry, org.domain, org.employeeRange));
    view.innerHTML = `<div class="view-intro"><div><h2>${state.organisations.length} organisations</h2><p>Company details, logos and enrichment are shared across every event and sponsorship workflow.</p></div><button class="button primary" data-add="organisation">+ Add organisation</button></div>
      <div class="toolbar"><input id="listSearch" type="search" placeholder="Search organisations" value="${esc(ui.query)}"><span class="status-pill">${rows.length} shown</span></div>
      <div class="organisation-grid">${rows.map(org => {
        const peopleCount = state.people.filter(item => item.organisationId === org.id).length;
        const eventCount = new Set(state.eventPeople.filter(item => state.people.find(personItem => personItem.id === item.personId)?.organisationId === org.id).map(item => item.eventId)).size;
        return `<article class="organisation-card" data-organisation="${org.id}"><div class="organisation-top">${organisationLogo(org)}${pill(org.enrichment)}</div><h3>${esc(org.name)}</h3><p>${esc(org.industry)} · ${esc(org.employeeRange)}<br>${esc(org.domain)}</p><div class="organisation-meta"><span>${peopleCount} people</span><strong>${eventCount} events</strong></div></article>`;
      }).join('')}</div>`;
  }

  function segmentCount(segment) {
    if (segment.id === 'segment-all-mailchimp') return state.people.filter(item => item.email).length;
    const list = state.eventPeople.filter(item => item.eventId === segment.eventId);
    if (/speakers/i.test(segment.name)) return list.filter(item => item.role === 'Speaker').length;
    if (/needs response/i.test(segment.name)) return list.filter(item => ['Invited', 'No response'].includes(item.status)).length;
    return list.filter(item => ['Attendee', 'Workgrouper'].includes(item.role) && item.status === 'Confirmed').length;
  }

  function renderSegments() {
    heading('Saved audiences', 'Segments');
    const segments = state.segments.filter(item => !item.eventId || item.eventId === ui.eventId);
    view.innerHTML = `<div class="view-intro"><div><h2>Reusable contact segments</h2><p>Replace duplicate Mailchimp groups with saved lists and dynamic audiences that update as event records change.</p></div><button class="button primary" data-add="segment">+ New segment</button></div>
      <div class="segment-grid">${segments.map(item => `<article class="segment-card" data-segment="${item.id}"><div class="segment-icon">≡</div><h3>${esc(item.name)}</h3><p>${esc(item.rule)}</p><div class="segment-meta"><span>${esc(item.type)} · ${esc(item.purpose)}</span><strong>${segmentCount(item)} people</strong></div></article>`).join('')}</div>`;
  }

  function suggestionEntity(item) {
    return item.entityType === 'person' ? person(item.entityId) : organisation(item.entityId);
  }

  function suggestionEntityName(item) {
    const entity = suggestionEntity(item);
    return item.entityType === 'person' ? fullName(entity) : entity?.name || 'Unknown organisation';
  }

  function suggestionEntityVisual(item) {
    const entity = suggestionEntity(item);
    return item.entityType === 'person' ? personAvatar(entity) : organisationLogo(entity);
  }

  function renderEnrichment() {
    heading('Research and assets', 'AI enhancer');
    const eventPersonIds = memberships().map(item => item.personId);
    const eventOrganisationIds = new Set([
      ...eventPersonIds.map(id => person(id)?.organisationId).filter(Boolean),
      ...state.sponsorships.filter(item => item.eventId === ui.eventId).map(item => item.organisationId)
    ]);
    const eventPeople = state.people.filter(item => eventPersonIds.includes(item.id));
    const eventOrganisations = state.organisations.filter(item => eventOrganisationIds.has(item.id));
    const suggestions = state.enrichmentSuggestions.filter(item => item.eventId === ui.eventId);
    const pending = suggestions.filter(item => item.status === 'Pending');
    const missingLogos = eventOrganisations.filter(item => item.enrichment === 'Missing logo' || !item.logoUrl).length;
    const incompletePeople = eventPeople.filter(item => !item.linkedin || !item.jobTitle || !item.headshotUrl).length;
    const job = state.enrichmentJobs.find(item => item.eventId === ui.eventId);
    const gatewayConnected = Boolean(window.WorkgroupEnrichment?.isConfigured());
    view.innerHTML = `<div class="view-intro"><div><h2>Find missing details, then approve them</h2><p>Search for official websites, logos, headshots and contact details. Every result keeps its source and confidence score; nothing overwrites the CRM until a person accepts it.</p></div>
      <div class="intro-actions"><button class="button secondary" data-configure-enrichment>Configure providers</button><button class="button primary" data-run-enrichment>✦ Enhance this event</button></div></div>
      <section class="enrichment-notice"><div class="enhancer-mark">✦</div><div><strong>Suggestion-first by design</strong><p>The live service will run through a secure server endpoint. Provider keys never sit in this page, and low-confidence or conflicting results stay in the review queue.</p></div>${pill(job?.status || 'Ready to run')}</section>
      <div class="cards">
        ${metric('Event organisations', eventOrganisations.length, `${missingLogos} missing an approved logo`, 'var(--pink)')}
        ${metric('Event people', eventPeople.length, `${incompletePeople} records can be improved`, 'var(--purple)')}
        ${metric('Pending suggestions', pending.length, `${suggestions.filter(item => item.status === 'Accepted').length} accepted`, 'var(--orange)')}
        ${metric('Secure gateway', gatewayConnected ? 'Connected' : 'Ready', `${state.enrichmentProviders.length} provider stages prepared`, 'var(--green)')}
      </div>
      <section class="panel enrichment-providers"><div class="panel-head"><div><h3>Enhancement pipeline</h3><p>Provider-neutral stages can be connected or replaced independently</p></div>${pill('Integration ready')}</div>
        <div class="provider-grid">${state.enrichmentProviders.map((provider, index) => `<article class="provider-card"><span>${index + 1}</span><div><h4>${esc(provider.name)}</h4><p>${esc(provider.capability)}</p></div>${pill(provider.status)}</article>`).join('')}</div>
      </section>
      <section class="panel enrichment-queue"><div class="panel-head"><div><h3>Suggested changes</h3><p>Preview data demonstrates the same review workflow the live providers will use</p></div>${pill(`${pending.length} awaiting review`)}</div>
        <div class="table-wrap"><table class="record-table"><thead><tr><th>Record</th><th>Suggested field</th><th>Result</th><th>Source</th><th>Confidence</th><th>Status</th><th></th></tr></thead><tbody>
        ${suggestions.length ? suggestions.map(item => `<tr><td><div class="person-cell">${suggestionEntityVisual(item)}<div><strong>${esc(suggestionEntityName(item))}</strong><small>${esc(item.entityType === 'person' ? 'Person' : 'Organisation')}</small></div></div></td>
          <td><strong>${esc(item.fieldLabel)}</strong></td><td class="suggestion-value">${esc(item.valueLabel || item.suggestedValue)}</td>
          <td><a class="source-link" href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">${esc(item.sourceLabel)}</a><small class="source-provider">${esc(item.provider)}</small></td>
          <td><div class="confidence"><i style="width:${Number(item.confidence) || 0}%"></i></div><strong>${Number(item.confidence) || 0}%</strong></td><td>${pill(item.status)}</td>
          <td>${item.status === 'Pending' ? `<button class="button secondary small" data-review-suggestion="${item.id}">Review</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="7"><div class="empty"><strong>No suggestions yet</strong>Run the enhancer for this event to prepare a review queue.</div></td></tr>'}
        </tbody></table></div>
      </section>`;
  }

  function renderMessages() {
    heading('Outlook communications', 'Email');
    const connected = state.mailConnection.status === 'Connected';
    const campaigns = state.emailCampaigns.filter(item => !item.eventId || item.eventId === ui.eventId);
    const shown = ui.messageTab === 'Drafts'
      ? campaigns.filter(item => item.status !== 'Sent')
      : ui.messageTab === 'Templates' ? state.emailTemplates : campaigns;
    view.innerHTML = `<div class="view-intro"><div><h2>Email contacts from their event context</h2><p>Write individual messages or personalised campaigns using contacts, event segments and reusable templates.</p></div>
      <div class="intro-actions"><button class="button secondary" data-connect-outlook>${connected ? `Outlook · ${esc(state.mailConnection.accountEmail)}` : 'Connect Outlook'}</button><button class="button primary" data-compose-email>+ New email</button></div></div>
      <section class="mail-connection ${connected ? 'connected' : ''}"><div><span class="connection-dot"></span><strong>${connected ? 'Outlook connected' : 'Outlook connection required for sending'}</strong><p>${connected ? 'Messages are sent through the connected mailbox and saved in Sent Items.' : 'Drafting and recipient selection work now. Sending activates after the Microsoft Entra app is connected.'}</p></div>${pill(connected ? 'Connected' : 'Not connected')}</section>
      <div class="tabs">${['Campaigns', 'Drafts', 'Templates'].map(tab => `<button class="${ui.messageTab === tab ? 'active' : ''}" data-message-tab="${tab}">${tab}</button>`).join('')}</div>
      ${ui.messageTab === 'Templates'
        ? `<div class="segment-grid">${shown.map(item => `<article class="segment-card" data-template-email="${item.id}"><div class="segment-icon">↗</div><h3>${esc(item.name)}</h3><p>${esc(item.subject)}</p><div class="segment-meta"><span>Reusable template</span><strong>Use template</strong></div></article>`).join('')}</div>`
        : `<section class="panel table-wrap"><table class="record-table"><thead><tr><th>Name</th><th>Audience</th><th>Status</th><th>Recipients</th><th>Steps</th><th>Sender</th><th>Last update</th></tr></thead><tbody>
          ${shown.map(item => `<tr data-email-campaign="${item.id}"><td><strong>${esc(item.name)}</strong><br><small>${esc(item.subject)}</small></td><td>${esc(item.audience)}</td><td>${pill(item.status)}</td><td>${item.recipientCount}</td><td>${item.steps}</td><td>${esc(item.sender)}</td><td>${formatDate(item.updatedAt)}</td></tr>`).join('') || '<tr><td colspan="7"><div class="empty"><strong>No messages</strong>Create an email for this event.</div></td></tr>'}</tbody></table></section>`}`;
  }

  function renderQuality() {
    heading('Clean and enrich', 'Data quality');
    const missingEmail = state.people.filter(item => !item.email).length;
    const missingLinkedIn = state.people.filter(item => !item.linkedin).length;
    const incompleteCompanies = state.organisations.filter(item => item.enrichment !== 'Complete').length;
    const openDuplicates = state.duplicateCandidates.filter(item => item.status === 'Open');
    view.innerHTML = `<div class="view-intro"><div><h2>Data quality centre</h2><p>Resolve duplicates and incomplete records before importing Folk data or using contacts in Eventfrog.</p></div><button class="button secondary" data-run-quality>Run checks</button></div>
      <div class="quality-grid">
        <article class="quality-card"><h3>Possible duplicates</h3><strong class="big">${openDuplicates.length}</strong><p>Potential pairs awaiting review.</p></article>
        <article class="quality-card"><h3>Missing LinkedIn</h3><strong class="big">${missingLinkedIn}</strong><p>People without a profile URL.</p></article>
        <article class="quality-card"><h3>Company enrichment</h3><strong class="big">${incompleteCompanies}</strong><p>Organisations with missing or unverified details.</p></article>
      </div>
      <section class="panel" style="margin-top:15px"><div class="panel-head"><div><h3>Review queue</h3><p>Nothing is merged or overwritten automatically</p></div>${pill(`${openDuplicates.length + incompleteCompanies + missingEmail} checks`)}</div>
        <div class="panel-body quality-list">${openDuplicates.map(item => {
          const people = item.personIds.map(person).filter(Boolean);
          return `<div class="quality-item"><div><strong>${people.map(fullName).join(' / ')}</strong><small>${esc(item.reason)} · ${esc(item.confidence)} confidence</small></div><button class="button secondary small" data-review-duplicate="${item.id}">Review</button></div>`;
        }).join('')}
        ${state.organisations.filter(item => item.enrichment !== 'Complete').map(org => `<div class="quality-item"><div><strong>${esc(org.name)}</strong><small>${esc(org.enrichment)} · Company record</small></div><button class="button secondary small" data-organisation="${org.id}">Open</button></div>`).join('')}</div>
      </section>`;
  }

  function renderEventFlow() {
    heading('Shared event data', 'Eventfrog connection');
    const linked = state.events.filter(item => item.eventflowId).length;
    view.innerHTML = `<div class="connection-hero"><div><span>Workgroup Contacts ↔ Eventfrog</span><h2>One event, one relationship dataset</h2><p>Eventfrog creates the event and its matching CRM space appears automatically. Contact roles, moderator and panelist positions, sponsorship and relationship status use the same event ID in both areas.</p></div><div class="connection-state">● ${linked} events mapped</div></div>
      <div class="dashboard-grid">
        <section class="panel"><div class="panel-head"><div><h3>Data ownership</h3><p>Clear boundaries prevent duplicate task and contact systems</p></div></div>
          <div class="panel-body mapping-list">
            <div class="mapping-row"><span>New Eventfrog event</span><b>→</b><span>CRM event space with three contact tabs</span></div>
            <div class="mapping-row"><span>CRM contact role or status</span><b>↔</b><span>Native Eventfrog contact panel</span></div>
            <div class="mapping-row"><span>“Confirm speakers” task</span><b>↔</b><span>Speaker planning board</span></div>
            <div class="mapping-row"><span>“Send attendee email” task</span><b>↔</b><span>Saved attendee segment</span></div>
            <div class="mapping-row"><span>“Submit sponsor logos” task</span><b>↔</b><span>Approved organisation assets</span></div>
          </div>
        </section>
        <section class="panel"><div class="panel-head"><div><h3>Current event mappings</h3><p>CRM records are ready to reference Eventfrog IDs</p></div></div>
          <div class="panel-body">${state.events.map(item => `<div class="quality-item"><div><strong>${esc(item.name)}</strong><small>${esc(item.eventflowId)}</small></div>${pill('Mapped')}</div>`).join('')}</div>
        </section>
      </div>`;
  }

  const renderers = {
    overview: renderOverview,
    groups: renderGroups,
    'event-contacts': renderEventContacts,
    speakers: renderSpeakers,
    sponsors: renderSponsors,
    people: renderPeople,
    organisations: renderOrganisations,
    'sponsor-directory': renderSponsorDirectory,
    segments: renderSegments,
    enrichment: renderEnrichment,
    messages: renderMessages,
    quality: renderQuality,
    eventflow: renderEventFlow
  };

  function syncEventSwitcher() {
    eventSwitcher.innerHTML = state.events.map(item => `<option value="${item.id}" ${item.id === ui.eventId ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
  }

  function syncEventGroupNav() {
    if (!eventGroupNav) return;
    const eventGroups = state.groups.filter(item => item.eventId);
    const otherGroups = state.groups.filter(item => !item.eventId);
    const groupButton = group => {
      const linkedEvent = event(group.eventId);
      const label = linkedEvent?.name || group.name;
      return `<button class="${ui.view === 'groups' && currentGroup()?.id === group.id ? 'active' : ''}" data-event-group="${group.id}" title="${esc(label)}"><span class="event-nav-dot ${esc(group.colour || 'pink')}"></span><span class="event-nav-copy"><strong>${esc(label)}</strong><small>${groupMemberships(group.id).length} people</small></span></button>`;
    };
    eventGroupNav.innerHTML = `${eventGroups.map(groupButton).join('')}${otherGroups.length ? `<p>Other lists</p>${otherGroups.map(groupButton).join('')}` : ''}`;
  }

  function updateQualityCount() {
    const count = state.duplicateCandidates.filter(item => item.status === 'Open').length
      + state.organisations.filter(item => item.enrichment !== 'Complete').length
      + state.people.filter(item => !item.email).length;
    document.getElementById('qualityCount').textContent = count;
  }

  function syncConnectionUi() {
    if (!connectionButton) return;
    const labels = {
      connecting: 'Connecting…',
      connected: 'Shared CRM',
      'signed-out': 'Sign in',
      'setup-required': 'Setup required',
      'access-denied': 'No access',
      conflict: 'Syncing…',
      error: 'Connection issue',
      local: 'Local preview'
    };
    connectionButton.querySelector('span').textContent = labels[connection.mode] || 'Local preview';
    connectionButton.classList.toggle('connected', connection.mode === 'connected');
    connectionButton.classList.toggle('warning', ['setup-required', 'access-denied', 'error'].includes(connection.mode));
  }

  function render() {
    nav.querySelectorAll('button[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === ui.view));
    syncEventSwitcher();
    syncEventGroupNav();
    updateQualityCount();
    syncConnectionUi();
    (renderers[ui.view] || renderOverview)();
  }

  function openModal(content, wide = false) {
    modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal ${wide ? 'wide' : ''}">${content}</div></div>`;
  }
  function closeModal() { modalRoot.innerHTML = ''; }
  function options(items, selected = '', label = item => item.name) {
    return items.map(item => `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${esc(label(item))}</option>`).join('');
  }
  function modalHeader(title, copy) {
    return `<div class="modal-head"><div><h2>${esc(title)}</h2><p>${esc(copy)}</p></div><button class="modal-close" data-close aria-label="Close">×</button></div>`;
  }

  function addMenu() {
    openModal(`${modalHeader('Add to the contact workspace', 'Choose the record you want to create.')}
      <div class="modal-body add-grid">
        <button class="add-choice" data-add="person"><strong>Person</strong><span>Create a reusable master contact</span></button>
        <button class="add-choice" data-add="organisation"><strong>Organisation</strong><span>Create a company and enrichment record</span></button>
        <button class="add-choice" data-add="sponsor-directory"><strong>Sponsor organisation</strong><span>Add an existing company to the global sponsor directory</span></button>
        <button class="add-choice" data-add="event-person"><strong>Person for this event</strong><span>Give an existing contact an event role</span></button>
        <button class="add-choice" data-add="activity"><strong>Relationship action</strong><span>Add a note, call or follow-up</span></button>
        <button class="add-choice full" data-import-folk><strong>Import Folk data</strong><span>Upload exported contact and notes CSV files with a review before anything is added</span></button>
      </div>`);
  }

  function addGroupPeopleModal(groupId) {
    const group = state.groups.find(item => item.id === groupId);
    if (!group) return;
    const existingIds = new Set(groupMemberships(group.id).map(item => item.personId));
    const available = state.people.filter(contact => !existingIds.has(contact.id)).sort((left, right) => fullName(left).localeCompare(fullName(right)));
    openModal(`${modalHeader(`Add people to ${group.name}`, 'Choose one or more existing CRM contacts. Their master record is not duplicated.')}
      <form class="modal-body" data-form="group-people" data-group-id="${group.id}">
        ${available.length ? `<div class="group-person-picker">${available.map(contact => {
          const org = organisationFor(contact);
          return `<label><input type="checkbox" name="personIds" value="${contact.id}">${personAvatar(contact)}<span><strong>${esc(fullName(contact))}</strong><small>${esc(contact.jobTitle || 'Contact')}${org ? ` · ${esc(org.name)}` : ''}</small></span></label>`;
        }).join('')}</div>${group.eventId ? `<div class="group-add-role"><div class="form-grid"><div class="field"><label>Main event role</label><select name="role">${EVENT_ROLES.map(role => `<option>${role}</option>`).join('')}</select></div><div class="field"><label>Status</label><select name="status"><option>Researching</option><option>Invited</option><option>Discussing</option><option>Confirmed</option><option>No response</option><option>Declined</option></select></div>
          <div class="field full"><label>Speaking position (optional)</label><div class="role-toggle-grid"><label><input type="checkbox" name="moderator" value="true"><span><strong>Moderator</strong><small>Chairs or moderates a session</small></span></label><label><input type="checkbox" name="panelist" value="true"><span><strong>Panelist</strong><small>Appears on a panel</small></span></label></div></div></div></div>` : ''}` : '<div class="empty"><strong>Everyone is already included</strong>Create a new person first if someone is missing.</div>'}
        <div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button>${available.length ? '<button class="button primary">Add selected people</button>' : '<button type="button" class="button primary" data-add="person">+ Create person</button>'}</div>
      </form>`, true);
  }

  function groupColumnsModal(groupId) {
    const group = state.groups.find(item => item.id === groupId);
    if (!group) return;
    const selected = new Set(group.columns || []);
    const checkbox = item => `<label class="column-choice"><input type="checkbox" name="columns" value="${esc(item.id)}" ${selected.has(item.id) ? 'checked' : ''}><span><strong>${esc(item.label)}</strong><small>${GROUP_FIXED_COLUMNS.some(field => field.id === item.id) ? 'Contact or event-list field' : `Custom ${item.type || 'text'} field`}</small></span></label>`;
    openModal(`${modalHeader('Fields and columns', `Choose what the ${group.name} event list displays and add event-specific fields.`)}
      <form class="modal-body" data-form="group-columns" data-group-id="${group.id}">
        <div class="column-choice-grid">${GROUP_FIXED_COLUMNS.map(checkbox).join('')}${(group.customFields || []).map(checkbox).join('')}</div>
        <div class="new-field-box"><strong>Add an event-specific field</strong><p>Use this for things such as “Reached out”, “Attending?” or a proposed workgroup topic.</p>
          <div class="form-grid"><div class="field"><label>Field name</label><input name="newFieldLabel" placeholder="e.g. Meeting scheduled?"></div>
          <div class="field"><label>Field type</label><select name="newFieldType"><option value="text">Free text</option><option value="select">Dropdown choices</option></select></div>
          <div class="field full"><label>Dropdown choices</label><input name="newFieldOptions" placeholder="Not yet, Agreed to meet, Had meeting"><small>Only needed for a dropdown field; separate choices with commas.</small></div></div>
        </div>
        <div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Save fields</button></div>
      </form>`, true);
  }

  function folkImportModal() {
    ui.folkImport = null;
    openModal(`${modalHeader('Import your current Folk data', 'Bring the real records across safely so the CRM can be shaped around them.')}
      <div class="modal-body"><div class="import-drop">
        <strong>Choose your Folk CSV files</strong>
        <p>Folk exports each group as a ZIP containing contacts and notes. Unzip it, then select both CSV files. You can select files from several groups together.</p>
        <label class="button primary" for="folkImportFiles">Choose CSV files</label>
        <input id="folkImportFiles" data-folk-import-files type="file" accept=".csv,text/csv" multiple hidden>
      </div>
      <div class="connection-setup"><b>✓</b><div><strong>Duplicates are matched first</strong><p>Email addresses and Folk IDs are checked before new people or organisations are created.</p></div></div>
      <div class="connection-setup"><b>✓</b><div><strong>Nothing useful is thrown away</strong><p>Unrecognised Folk columns are kept as imported custom fields so we can decide how the final CRM should use them.</p></div></div>
      <div class="form-actions"><button class="button secondary" data-close>Cancel</button></div></div>`);
  }

  function folkImportReview() {
    const files = ui.folkImport?.files || [];
    const contactFiles = files.filter(file => file.type === 'contacts');
    const noteFiles = files.filter(file => file.type === 'notes');
    const contactCount = contactFiles.reduce((sum, file) => sum + file.rows.length, 0);
    const noteCount = noteFiles.reduce((sum, file) => sum + file.rows.length, 0);
    const columns = [...new Set(contactFiles.flatMap(file => file.headers))];
    openModal(`${modalHeader('Review Folk import', `${files.length} file${files.length === 1 ? '' : 's'} ready to analyse and import.`)}
      <div class="modal-body"><div class="cards import-metrics">
        ${metric('Contact rows', contactCount, `${contactFiles.length} contact file${contactFiles.length === 1 ? '' : 's'}`, 'var(--pink)')}
        ${metric('Notes', noteCount, `${noteFiles.length} notes file${noteFiles.length === 1 ? '' : 's'}`, 'var(--purple)')}
      </div>
      <section class="panel"><div class="panel-head"><div><h3>Files selected</h3><p>The original file names are retained as import source information</p></div></div>
      <div class="panel-body import-file-list">${files.map(file => `<div><strong>${esc(file.name)}</strong><span>${file.rows.length} rows · ${file.type === 'notes' ? 'Notes' : 'Contacts'}</span></div>`).join('')}</div></section>
      <div class="field full import-columns"><label>Contact columns found</label><div>${columns.map(column => `<span class="tag">${esc(column)}</span>`).join('') || '<span class="tag">No contact columns recognised</span>'}</div>
      <small>First/last name, email, phone, title, company, URLs, owner, groups and notes are matched automatically. Other columns are preserved as custom fields.</small></div>
      <p class="review-note">This import creates a restore point first. It does not change Folk or Eventfrog.</p>
      <div class="form-actions"><button class="button secondary" data-import-folk>Choose different files</button><button class="button primary" data-confirm-folk-import ${contactCount ? '' : 'disabled'}>Import ${contactCount} contacts</button></div></div>`, true);
  }

  async function readFolkFiles(fileList) {
    const files = [];
    for (const file of [...fileList]) {
      const parsed = window.WorkgroupCsvImport.parse(await file.text());
      files.push({
        name: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        type: window.WorkgroupCsvImport.classify(file.name, parsed.headers)
      });
    }
    ui.folkImport = { files };
    folkImportReview();
  }

  function mergeImportedValue(record, field, value) {
    if (value && !record[field]) record[field] = value;
  }

  async function importFolkData() {
    const files = ui.folkImport?.files || [];
    if (!files.length) return;
    if (window.WorkgroupCrmData) {
      await window.WorkgroupCrmData.createBackup(state, 'before Folk CSV import').catch(() => {});
    }
    let created = 0;
    let updated = 0;
    let notesAdded = 0;
    const sourceIndex = new Map(state.people.filter(item => item.sourceId).map(item => [String(item.sourceId), item]));
    const emailIndex = new Map(state.people.filter(item => item.email).map(item => [String(item.email).trim().toLowerCase(), item]));
    files.filter(file => file.type === 'contacts').forEach(file => {
      file.rows.forEach(row => {
        const mapped = window.WorkgroupCsvImport.mapContact(row, file.headers);
        if (!mapped.firstName && !mapped.lastName && !mapped.email) return;
        const emailKey = String(mapped.email || '').trim().toLowerCase();
        let contact = (mapped.sourceId && sourceIndex.get(mapped.sourceId)) || (emailKey && emailIndex.get(emailKey));
        const organisationInput = mapped.organisationName || mapped.organisationDomain;
        const resolution = resolveOrganisation(organisationInput, {
          domain: mapped.organisationDomain,
          linkedinUrl: mapped.organisationLinkedin
        });
        if (contact) {
          mergeImportedValue(contact, 'firstName', mapped.firstName);
          mergeImportedValue(contact, 'lastName', mapped.lastName);
          mergeImportedValue(contact, 'email', mapped.email);
          mergeImportedValue(contact, 'phone', mapped.phone);
          mergeImportedValue(contact, 'jobTitle', mapped.jobTitle);
          mergeImportedValue(contact, 'linkedin', mapped.linkedin);
          mergeImportedValue(contact, 'headshotUrl', mapped.headshotUrl);
          mergeImportedValue(contact, 'owner', mapped.owner);
          mergeImportedValue(contact, 'organisationId', resolution.organisation?.id);
          mergeImportedValue(contact, 'sourceId', mapped.sourceId);
          if (mapped.notes && !String(contact.notes || '').includes(mapped.notes)) contact.notes = [contact.notes, mapped.notes].filter(Boolean).join('\n\n');
          contact.folkGroups = [...new Set([...(contact.folkGroups || []), ...mapped.groups])];
          contact.customFields = { ...(mapped.customFields || {}), ...(contact.customFields || {}) };
          contact.sourceSystem ||= 'folk';
          updated += 1;
        } else {
          contact = {
            id: uid('person'),
            firstName: mapped.firstName || String(mapped.email).split('@')[0] || 'Unknown',
            lastName: mapped.lastName,
            email: mapped.email,
            phone: mapped.phone,
            jobTitle: mapped.jobTitle,
            linkedin: mapped.linkedin,
            headshotUrl: mapped.headshotUrl,
            organisationId: resolution.organisation?.id || '',
            owner: mapped.owner || accountOwner(),
            notes: mapped.notes,
            lastInteraction: '',
            sourceSystem: 'folk',
            sourceId: mapped.sourceId,
            folkGroups: mapped.groups,
            customFields: mapped.customFields,
            importedFrom: file.name
          };
          state.people.push(contact);
          created += 1;
        }
        if (mapped.sourceId) sourceIndex.set(mapped.sourceId, contact);
        if (emailKey) emailIndex.set(emailKey, contact);
      });
    });
    files.filter(file => file.type === 'notes').forEach(file => {
      file.rows.forEach(row => {
        const note = window.WorkgroupCsvImport.mapNote(row, file.headers);
        if (!note.text) return;
        const emailKey = String(note.email || '').trim().toLowerCase();
        const normalisedName = String(note.personName || '').trim().toLowerCase();
        const contact = (note.sourceId && sourceIndex.get(note.sourceId))
          || (emailKey && emailIndex.get(emailKey))
          || state.people.find(item => fullName(item).trim().toLowerCase() === normalisedName);
        if (!contact || String(contact.notes || '').includes(note.text)) return;
        contact.notes = [contact.notes, note.text].filter(Boolean).join('\n\n');
        notesAdded += 1;
      });
    });
    ensureGroups(state);
    save();
    closeModal();
    ui.folkImport = null;
    ui.view = 'people';
    render();
    toast(`${created} contacts added · ${updated} matched · ${notesAdded} notes linked`);
  }

  function composeEmail({ personId = '', segmentId = '', groupId = '', templateId = '', campaignId = '' } = {}) {
    const contact = person(personId);
    const targetGroup = state.groups.find(item => item.id === groupId);
    const template = state.emailTemplates.find(item => item.id === templateId);
    const campaign = state.emailCampaigns.find(item => item.id === campaignId);
    const eventSegments = state.segments.filter(item => !item.eventId || item.eventId === ui.eventId);
    const selectedAudience = personId ? `person:${personId}` : segmentId ? `segment:${segmentId}` : groupId ? `group:${groupId}` : campaign?.audienceKey || `event:${ui.eventId}`;
    const connected = state.mailConnection.status === 'Connected';
    openModal(`${modalHeader(campaign ? 'Edit email campaign' : 'Compose email', currentEvent().name)}
      <form class="modal-body" data-form="email" ${campaign ? `data-campaign-id="${campaign.id}"` : ''}><div class="form-grid">
        <div class="field full"><label>Recipients</label><select name="audience" required>
          ${contact ? `<option value="person:${contact.id}" selected>${esc(fullName(contact))} · ${esc(contact.email || 'No email')}</option>` : ''}
          ${targetGroup ? `<option value="group:${targetGroup.id}" selected>${esc(targetGroup.name)} · ${groupMemberships(targetGroup.id).filter(item => person(item.personId)?.email).length}</option>` : ''}
          <option value="event:${ui.eventId}" ${selectedAudience === `event:${ui.eventId}` ? 'selected' : ''}>All contacts for ${esc(currentEvent().name)} · ${memberships().filter(item => person(item.personId)?.email).length}</option>
          ${eventSegments.map(item => `<option value="segment:${item.id}" ${selectedAudience === `segment:${item.id}` ? 'selected' : ''}>${esc(item.name)} · ${segmentCount(item)}</option>`).join('')}
        </select><small>Each recipient receives an individual personalised message; addresses are not exposed to other contacts.</small></div>
        <div class="field"><label>From</label><input value="${connected ? esc(state.mailConnection.accountEmail) : 'Connect Outlook to choose sender'}" disabled></div>
        <div class="field"><label>Template</label><select id="emailTemplatePicker"><option value="">No template</option>${state.emailTemplates.map(item => `<option value="${item.id}" ${template?.id === item.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></div>
        <div class="field full"><label>Campaign name</label><input name="name" value="${esc(campaign?.name || template?.name || '')}" placeholder="Internal name for this email" required></div>
        <div class="field full"><label>Subject</label><input name="subject" value="${esc(campaign?.subject || template?.subject || '')}" required></div>
        <div class="field full"><label>Message</label><textarea name="body" class="email-body" required>${esc(campaign?.body || template?.body || '')}</textarea><small>Available fields: {{first_name}}, {{organisation.name}}, {{event.name}}, {{event.date}}, {{sender.name}}</small></div>
        <div class="field"><label>Sequence steps</label><select name="steps"><option value="1">Single email</option><option value="2" ${campaign?.steps === 2 ? 'selected' : ''}>Email + follow-up</option></select></div>
        <div class="field"><label>Send timing</label><select name="timing"><option>Send manually</option><option>Schedule for later</option></select></div>
      </div><div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button type="submit" class="button secondary" name="action" value="draft">Save draft</button>${connected ? '<button type="submit" class="button primary" name="action" value="send">Send with Outlook</button>' : '<button type="button" class="button primary" data-connect-outlook>Connect Outlook to send</button>'}</div></form>`, true);
  }

  function outlookConnectionModal() {
    openModal(`${modalHeader('Connect Microsoft Outlook', 'Each team member connects their own Workgroup mailbox.')}
      <div class="modal-body"><div class="connection-setup"><b>1</b><div><strong>Register Workgroup Contacts in Microsoft Entra</strong><p>Add the hosted CRM callback address and use Microsoft’s delegated sign-in flow, so each person grants access only to their own mailbox.</p></div></div>
      <div class="connection-setup"><b>2</b><div><strong>Approve the minimum mailbox permissions</strong><p>User.Read identifies the mailbox, Mail.Read displays and synchronises email, Mail.Send sends through Outlook, and offline_access keeps the connection working. Mail.ReadWrite is only needed later if the CRM must manage Outlook drafts or folders.</p></div></div>
      <div class="connection-setup"><b>3</b><div><strong>Capture genuine correspondents</strong><p>People you send to or reply to are added automatically. Newsletters, automated senders and internal Workgroup addresses are ignored. Existing emails are linked instead of duplicated.</p></div></div>
      <div class="connection-setup"><b>4</b><div><strong>Keep ownership and history together</strong><p>New contacts default to the connected mailbox owner, their domain is checked against organisations, and the conversation is added to their CRM activity history.</p></div></div>
      <p class="review-note">The current file preview cannot complete Microsoft sign-in. The CRM needs an HTTPS address plus the Entra tenant ID, application ID and a securely stored application secret.</p>
      <div class="form-actions"><button class="button secondary" data-close>Close</button><a class="button primary" href="https://entra.microsoft.com/" target="_blank" rel="noreferrer">Open Microsoft Entra ↗</a></div></div>`);
  }

  function crmConnectionModal() {
    const email = connection.user?.email || '';
    if (connection.mode === 'connected') {
      openModal(`${modalHeader('Shared CRM is connected', 'Contacts are securely saved and available to authorised team members.')}
        <div class="modal-body"><section class="connection-summary"><i></i><div><strong>${esc(email)}</strong><p>${esc(connection.message)} · ${esc(connection.role || 'member')} access</p></div>${pill('Connected')}</section>
        <div class="connection-setup"><b>✓</b><div><strong>Automatic restore points</strong><p>A snapshot is created before every shared CRM update so earlier data can be recovered.</p></div></div>
        <div class="connection-setup"><b>✓</b><div><strong>Duplicate safeguards</strong><p>Matching email addresses and identical person-and-organisation combinations are blocked before saving.</p></div></div>
        <div class="form-actions"><button class="button secondary" data-download-crm-backup>Download backup</button><button class="button secondary" data-open-restore-points>Restore points</button><button class="button secondary" data-crm-sign-out>Sign out</button><button class="button primary" data-close>Done</button></div></div>`);
      return;
    }
    if (connection.mode === 'setup-required') {
      openModal(`${modalHeader('CRM database setup is ready', 'The separate CRM tables have been prepared but have not been applied to the shared Supabase project.')}
        <div class="modal-body"><div class="connection-setup"><b>1</b><div><strong>Apply the CRM-only database migration</strong><p>This creates contact storage, access rules and automatic restore points without changing Eventfrog tables.</p></div></div>
        <div class="connection-setup"><b>2</b><div><strong>Sign in again</strong><p>The first authorised user becomes the CRM owner; further access can then be managed safely.</p></div></div>
        <div class="form-actions"><button class="button secondary" data-download-crm-backup>Download local backup</button><button class="button primary" data-close>Close</button></div></div>`);
      return;
    }
    if (connection.mode === 'access-denied') {
      openModal(`${modalHeader('CRM access is required', 'Your Microsoft or Eventfrog account is valid but is not yet a member of this CRM workspace.')}
        <div class="modal-body"><p class="review-note">Ask the CRM owner or administrator to add ${esc(email)}. The local preview remains available, but its changes are not shared.</p>
        <div class="form-actions"><button class="button secondary" data-crm-sign-out>Use another account</button><button class="button primary" data-close>Close</button></div></div>`);
      return;
    }
    openModal(`${modalHeader('Sign in to the shared CRM', 'Use the same account credentials as Eventfrog.')}
      <form class="modal-body" data-form="crm-signin"><div class="form-grid">
        <div class="field full"><label>Email address</label><input name="email" type="email" autocomplete="email" required></div>
        <div class="field full"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div>
      </div><p class="review-note">Until you sign in, changes stay only on this device. The first connection will safely copy this preview into the empty CRM workspace.</p>
      <div class="form-actions"><button type="button" class="button secondary" data-download-crm-backup>Download backup</button><button type="button" class="button ghost" data-show-crm-reset>Forgot password?</button><button class="button primary">Sign in</button></div></form>`);
  }

  function crmResetModal() {
    openModal(`${modalHeader('Reset CRM password', 'Supabase will send the standard Eventfrog password email.')}
      <form class="modal-body" data-form="crm-reset"><div class="field"><label>Email address</label><input name="email" type="email" autocomplete="email" required></div>
      <div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Send reset email</button></div></form>`);
  }

  async function restorePointsModal() {
    openModal(`${modalHeader('CRM restore points', 'Loading the most recent secure snapshots…')}<div class="modal-body"><div class="empty">Loading…</div></div>`);
    try {
      const backups = await window.WorkgroupCrmData.listBackups();
      openModal(`${modalHeader('CRM restore points', 'The current version is backed up again before a restore is applied.')}
        <div class="modal-body"><div class="quality-list">${backups.map(item => `<div class="quality-item"><div><strong>${new Date(item.created_at).toLocaleString('en-GB')}</strong><small>Version ${Number(item.source_version)} · ${esc(item.reason)}</small></div><button class="button secondary small" data-prepare-restore="${item.id}">Review</button></div>`).join('') || '<div class="empty"><strong>No restore points yet</strong>The first one is created automatically when shared CRM data changes.</div>'}</div>
        <div class="form-actions"><button class="button secondary" data-create-restore-point>Create restore point now</button><button class="button primary" data-close>Done</button></div></div>`);
    } catch (error) {
      openModal(`${modalHeader('Restore points unavailable', error.message || 'The secure snapshots could not be loaded.')}<div class="modal-body"><div class="form-actions"><button class="button primary" data-close>Close</button></div></div>`);
    }
  }

  function restoreConfirmationModal(id) {
    openModal(`${modalHeader('Restore this CRM version?', 'People, organisations and event relationships will return to the selected snapshot.')}
      <div class="modal-body"><p class="review-note">The current CRM is saved as another restore point first, so this action can be reversed.</p>
      <div class="form-actions"><button class="button secondary" data-open-restore-points>Cancel</button><button class="button primary" data-confirm-restore="${id}">Restore version</button></div></div>`);
  }

  function eventPersonModal(personId = '', preferredEventId = ui.eventId) {
    const contact = person(personId);
    const availableEvents = contact
      ? state.events.filter(eventItem => !state.eventPeople.some(item => item.eventId === eventItem.id && item.personId === contact.id))
      : state.events;
    if (contact && !availableEvents.length) {
      openModal(`${modalHeader('Already added to every event', `${fullName(contact)} already has a relationship with every Eventfrog event.`)}
        <div class="modal-body"><div class="form-actions"><button class="button primary" data-person="${contact.id}">Back to contact</button></div></div>`);
      return;
    }
    const selectedEventId = availableEvents.some(item => item.id === preferredEventId) ? preferredEventId : availableEvents[0]?.id || '';
    openModal(`${modalHeader(contact ? `Add ${fullName(contact)} to an event` : 'Add a person to an event', 'Choose their main event relationship, then add any speaking positions that also apply.')}
      <form class="modal-body" data-form="event-person"><div class="form-grid">
        <div class="field full"><label>Eventfrog event</label><select name="eventId" required>${options(availableEvents, selectedEventId, item => item.name)}</select></div>
        <div class="field full"><label>Person</label><select name="personId" required ${contact ? 'disabled' : ''}><option value="">Choose a contact…</option>${options(state.people, contact?.id || '', fullName)}</select>${contact ? `<input type="hidden" name="personId" value="${contact.id}">` : ''}</div>
        <div class="field"><label>Main event role</label><select name="role">${EVENT_ROLES.map(role => `<option>${role}</option>`).join('')}</select><small>Use Sponsor for a person representing a sponsoring organisation.</small></div>
        <div class="field"><label>Status</label><select name="status"><option>Researching</option><option>Invited</option><option>Discussing</option><option>Confirmed</option><option>No response</option><option>Declined</option></select></div>
        <div class="field full"><label>Speaking position (optional)</label><div class="role-toggle-grid">
          <label><input type="checkbox" name="moderator" value="true"><span><strong>Moderator</strong><small>They will chair or moderate a session.</small></span></label>
          <label><input type="checkbox" name="panelist" value="true"><span><strong>Panelist</strong><small>They will appear as a panel participant.</small></span></label>
        </div><small>Both can be selected when needed and do not replace the main event role.</small></div>
        <div class="field"><label>Source</label><input name="source" placeholder="Previous event, referral…"></div><div class="field"><label>Owner</label><input name="owner" value="${esc(contact?.owner || event(selectedEventId)?.owner || currentEvent().owner)}"></div>
      </div><div class="form-actions"><button type="button" class="button secondary" ${contact ? `data-person="${contact.id}"` : 'data-close'}>Cancel</button><button class="button primary">Add to event</button></div></form>`);
  }

  function recordModal(type) {
    if (type === 'person') openModal(`${modalHeader('Add a person', 'Create the master record once; event roles are added separately.')}
      <form class="modal-body" data-form="person"><div class="form-grid">
        <div class="field"><label>First name</label><input name="firstName" required></div><div class="field"><label>Last name</label><input name="lastName" required></div>
        <div class="field"><label>Job title</label><input name="jobTitle"></div><div class="field"><label>Organisation</label>${organisationPicker()}</div>
        <div class="field"><label>Email</label><input name="email" type="email"></div><div class="field"><label>LinkedIn URL</label><input name="linkedin"></div>
        <div class="field full"><label>Headshot image URL</label><input name="headshotUrl" type="url" placeholder="https://…"><small>Imported from Folk or uploaded to the future asset library.</small></div>
        <div class="field"><label>Contact owner</label>${ownerPicker()}</div><div class="field full"><label>Notes</label><textarea name="notes"></textarea></div>
      </div><div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Save person</button></div></form>`);
    if (type === 'organisation') openModal(`${modalHeader('Add an organisation', 'Type the company freely; the CRM checks spelling and existing records before creating it.')}
      <form class="modal-body" data-form="organisation"><div class="form-grid">
        <div class="field full"><label>Organisation name</label>${organisationPicker(true)}</div><div class="field"><label>Website or domain</label><input name="domain"></div>
        <div class="field"><label>Industry</label><input name="industry"></div><div class="field"><label>Employee range</label><select name="employeeRange"><option value="">Choose when known…</option><option>100–500</option><option>500–1,000</option><option>1,000–5,000</option><option>5,000–10,000</option><option>10,000+</option></select></div>
        <div class="field full"><label>Logo image URL</label><input name="logoUrl" type="url" placeholder="https://…"><small>Imported, enriched or uploaded later.</small></div>
        <div class="field full"><label>Notes</label><textarea name="notes"></textarea></div>
      </div><div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Save organisation</button></div></form>`);
    if (type === 'event-person') eventPersonModal();
    if (type === 'activity') openModal(`${modalHeader('Add a relationship action', currentEvent().name)}
      <form class="modal-body" data-form="activity"><div class="form-grid">
        <div class="field"><label>Type</label><select name="type"><option>Email</option><option>Call</option><option>Meeting</option><option>Note</option></select></div>
        <div class="field"><label>Due date</label><input type="date" name="due" value="${today(0)}"></div>
        <div class="field full"><label>Person</label><select name="personId"><option value="">Choose a contact…</option>${options(state.people, '', fullName)}</select></div>
        <div class="field full"><label>Action or note</label><input name="text" required></div><div class="field"><label>Owner</label><input name="owner" value="${esc(currentEvent().owner)}"></div>
      </div><div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Save action</button></div></form>`);
    if (type === 'speaker') openModal(`${modalHeader('Add a speaker prospect', currentEvent().name)}
      <form class="modal-body" data-form="speaker"><div class="form-grid"><div class="field full"><label>Person</label><select name="personId" required><option value="">Choose a contact…</option>${options(state.people, '', fullName)}</select></div>
      <div class="field"><label>Stage</label><select name="stage">${SPEAKER_STAGES.map(stage => `<option>${stage}</option>`).join('')}</select></div><div class="field"><label>Topic or panel</label><input name="topic"></div><div class="field"><label>Owner</label><input name="owner" value="${esc(currentEvent().owner)}"></div></div>
      <div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Add speaker</button></div></form>`);
    if (type === 'sponsor') openModal(`${modalHeader('Add a sponsor organisation', currentEvent().name)}
      <form class="modal-body" data-form="sponsor"><div class="form-grid"><div class="field full"><label>Organisation</label><select name="organisationId" required><option value="">Choose an organisation…</option>${options(state.organisations)}</select></div>
      <div class="field"><label>Stage</label><select name="stage">${SPONSOR_STAGES.map(stage => `<option>${stage}</option>`).join('')}</select></div><div class="field"><label>Category</label><input name="category"></div>
      <div class="field"><label>Probability %</label><input name="probability" type="number" min="0" max="100" value="20"></div><div class="field"><label>Owner</label><input name="owner" value="${esc(currentEvent().owner)}"></div></div>
      <div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Add organisation</button></div></form>`);
    if (type === 'sponsor-directory') sponsorDirectoryModal();
    if (type === 'segment') openModal(`${modalHeader('Create a saved segment', 'Define an audience once and reuse it for tasks, exports and email.')}
      <form class="modal-body" data-form="segment"><div class="form-grid"><div class="field full"><label>Segment name</label><input name="name" required></div><div class="field"><label>Type</label><select name="type"><option>Dynamic</option><option>Saved list</option></select></div><div class="field"><label>Purpose</label><input name="purpose"></div><div class="field full"><label>Audience rule</label><input name="rule" placeholder="e.g. Role is Speaker · Status is Confirmed" required></div></div>
      <div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary">Save segment</button></div></form>`);
  }

  function sponsorDirectoryModal(directoryId = '') {
    const existing = (state.sponsorDirectory || []).find(item => item.id === directoryId);
    const availableOrganisations = state.organisations.filter(org =>
      existing?.organisationId === org.id
      || !(state.sponsorDirectory || []).some(item => item.organisationId === org.id)
    );
    if (!availableOrganisations.length) {
      openModal(`${modalHeader('Add a sponsor organisation', 'Every existing organisation is already in the sponsor directory.')}
        <div class="modal-body"><p class="review-note">Create the organisation first, then return here to add its sponsor relationship.</p>
        <div class="form-actions"><button class="button secondary" data-close>Close</button><button class="button primary" data-add="organisation">+ Create organisation</button></div></div>`);
      return;
    }
    openModal(`${modalHeader(existing ? 'Edit sponsor relationship' : 'Add a sponsor organisation', 'This organisation-level record is shared across all Eventfrog events.')}
      <form class="modal-body" data-form="sponsor-directory" ${existing ? `data-directory-id="${existing.id}"` : ''}><div class="form-grid">
        <div class="field full"><label>Organisation</label><select name="organisationId" required ${existing ? 'disabled' : ''}><option value="">Choose an organisation…</option>${options(availableOrganisations, existing?.organisationId || '')}</select>${existing ? `<input type="hidden" name="organisationId" value="${existing.organisationId}">` : ''}</div>
        <div class="field"><label>Relationship status</label><select name="relationshipStatus">${SPONSOR_RELATIONSHIP_STATUSES.map(status => `<option ${existing?.relationshipStatus === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>
        <div class="field"><label>Partner category</label><input name="category" value="${esc(existing?.category || '')}" placeholder="Technology, headline, content…"></div>
        <div class="field"><label>Relationship owner</label><input name="owner" value="${esc(existing?.owner || accountOwner())}"></div>
        <div class="field full"><label>Relationship notes</label><textarea name="notes">${esc(existing?.notes || '')}</textarea></div>
      </div><div class="form-actions"><button type="button" class="button secondary" ${existing ? `data-sponsor-directory="${existing.id}"` : 'data-close'}>Cancel</button><button class="button primary">${existing ? 'Save changes' : 'Add to directory'}</button></div></form>`);
  }

  function sponsorDirectoryDetail(id) {
    const directoryEntry = (state.sponsorDirectory || []).find(item => item.id === id);
    const org = directoryEntry && organisation(directoryEntry.organisationId);
    if (!directoryEntry || !org) return;
    const sponsorshipHistory = state.sponsorships
      .filter(item => item.organisationId === org.id)
      .sort((left, right) => String(event(right.eventId)?.date || '').localeCompare(String(event(left.eventId)?.date || '')));
    const people = state.people.filter(item => item.organisationId === org.id);
    openModal(`${modalHeader(org.name, `${directoryEntry.relationshipStatus} · ${directoryEntry.category || 'Partner category not set'}`)}
      <div class="modal-body"><div class="detail-hero">${organisationLogo(org)}<div><h3>${esc(org.name)}</h3><p>${esc(org.domain || 'No website')} · Owner ${esc(directoryEntry.owner || 'Unassigned')}</p></div></div>
      <div class="detail-list"><div><span>Relationship</span><strong>${esc(directoryEntry.relationshipStatus)}</strong></div><div><span>Category</span><strong>${esc(directoryEntry.category || 'Not set')}</strong></div><div><span>Event sponsorships</span><strong>${sponsorshipHistory.length}</strong></div><div><span>Company contacts</span><strong>${people.length}</strong></div></div>
      ${directoryEntry.notes ? `<div class="sponsor-directory-notes"><span>Relationship notes</span><p>${esc(directoryEntry.notes)}</p></div>` : ''}
      <details class="workgroup-history">
        <summary><span><strong>Sponsorship event history</strong><small>Every linked Eventfrog opportunity</small></span><b>${sponsorshipHistory.length}</b></summary>
        <div class="workgroup-history-body">${sponsorshipHistory.map(item => `<article class="sponsor-history-item"><div>${organisationLogo(org)}<span><strong>${esc(event(item.eventId)?.name || 'Historical event')}</strong><small>${esc(item.category || directoryEntry.category || 'No category')} · ${esc(item.owner || directoryEntry.owner || 'Unassigned')}</small></span></div><span>${pill(item.stage)}</span></article>`).join('') || '<p class="workgroup-empty">No event sponsorships are linked yet.</p>'}</div>
      </details>
      <div class="history"><h3>Company contacts</h3>${people.slice(0, 5).map(item => `<div class="history-item"><strong>${esc(fullName(item))}</strong><small>${esc(item.jobTitle || 'Contact')} · ${esc(item.email || 'No email')}</small></div>`).join('') || '<p>No contacts linked.</p>'}</div>
      <div class="form-actions"><button class="button secondary" data-close>Close</button><button class="button secondary" data-organisation="${org.id}">Open organisation</button><button class="button primary" data-edit-sponsor-directory="${directoryEntry.id}">Edit sponsor profile</button></div></div>`, true);
  }

  function workgroupParticipationModal(personId) {
    const contact = person(personId);
    if (!contact) return;
    openModal(`${modalHeader('Attach a workgroup', `Add attended or facilitated history for ${fullName(contact)}.`)}
      <form class="modal-body" data-form="workgroup-participation" data-person-id="${contact.id}"><div class="form-grid">
        <div class="field full"><label>Workgroup name</label><input name="workgroupName" placeholder="e.g. Brand trust" required></div>
        <div class="field"><label>Participation</label><select name="capacity"><option>Attended</option><option>Facilitated</option></select></div>
        <div class="field"><label>Linked Eventfrog event</label><select name="eventId"><option value="">Historical / event not listed</option>${options(state.events, '', item => item.name)}</select></div>
        <div class="field"><label>Historical event name</label><input name="eventName" placeholder="Only needed if the event is not listed"></div>
        <div class="field"><label>Date</label><input name="participationDate" type="date"></div>
        <div class="field full"><label>Notes</label><textarea name="notes" placeholder="Optional context about the session or their contribution"></textarea></div>
      </div><div class="form-actions"><button type="button" class="button secondary" data-person="${contact.id}">Cancel</button><button class="button primary">Attach workgroup</button></div></form>`);
  }

  function personDetail(id) {
    const contact = person(id);
    if (!contact) return;
    const org = organisationFor(contact);
    const history = state.eventPeople.filter(item => item.personId === id);
    const activities = state.activities.filter(item => item.personId === id);
    const workgroups = (state.workgroupParticipation || [])
      .filter(item => item.personId === id)
      .sort((left, right) => String(right.participationDate || '').localeCompare(String(left.participationDate || '')));
    openModal(`${modalHeader(fullName(contact), `${contact.jobTitle || 'Contact'} · ${org?.name || 'No organisation'}`)}
      <div class="modal-body"><div class="detail-hero">${personAvatar(contact)}<div><h3>${esc(fullName(contact))}</h3><p>${esc(contact.email || 'No email')} · Owner ${esc(contact.owner || 'Unassigned')}</p></div></div>
      <div class="detail-list"><div><span>Organisation</span><strong>${esc(org?.name || 'Not set')}</strong></div><div><span>LinkedIn</span><strong>${esc(contact.linkedin || 'Not added')}</strong></div><div><span>Last interaction</span><strong>${formatDate(contact.lastInteraction)}</strong></div><div><span>Events</span><strong>${history.length}</strong></div></div>
      <details class="workgroup-history">
        <summary><span><strong>Workgroup history</strong><small>Attended and facilitated sessions</small></span><b>${workgroups.length}</b></summary>
        <div class="workgroup-history-body">
          ${workgroups.map(item => `<article class="workgroup-history-item"><span class="workgroup-capacity ${item.capacity === 'Facilitated' ? 'facilitated' : ''}">${esc(item.capacity)}</span><div><strong>${esc(item.workgroupName)}</strong><small>${esc(item.eventName || event(item.eventId)?.name || 'Historical workgroup')}${item.participationDate ? ` · ${formatDate(item.participationDate)}` : ''}${item.notes ? `<br>${esc(item.notes)}` : ''}</small></div><button type="button" data-remove-workgroup="${item.id}" aria-label="Remove ${esc(item.workgroupName)}">×</button></article>`).join('') || '<p class="workgroup-empty">No workgroups stored for this contact yet.</p>'}
          <button type="button" class="button secondary small" data-add-workgroup="${contact.id}">+ Attach workgroup</button>
        </div>
      </details>
      <div class="history"><h3>Event history</h3>${history.map(item => `<div class="history-item"><strong>${esc(event(item.eventId)?.name || 'Event')}</strong><small>${esc([item.role, item.moderator ? 'Moderator' : '', item.panelist ? 'Panelist' : ''].filter(Boolean).join(' · '))} · ${esc(item.status)} · ${esc(item.source || 'No source')}</small></div>`).join('') || '<p>No event history.</p>'}
      ${activities.slice(0, 3).map(item => `<div class="history-item"><strong>${esc(item.text)}</strong><small>${esc(item.type)} · ${formatDate(item.due)}</small></div>`).join('')}</div>
      <div class="form-actions"><button class="button secondary" data-close>Close</button><button class="button secondary" data-enhance-entity="person:${contact.id}">✦ Enhance contact</button><button class="button secondary" data-add="activity">+ Relationship action</button><button class="button secondary" data-compose-person-email="${contact.id}">Email contact</button><button class="button primary" data-add-person-to-event="${contact.id}">+ Add to event</button></div></div>`, true);
  }

  function organisationDetail(id) {
    const org = organisation(id);
    if (!org) return;
    const people = state.people.filter(item => item.organisationId === id);
    const sponsorHistory = state.sponsorships.filter(item => item.organisationId === id);
    openModal(`${modalHeader(org.name, `${org.industry || 'Organisation'} · ${org.employeeRange || 'Size not set'}`)}
      <div class="modal-body"><div class="detail-hero">${organisationLogo(org)}<div><h3>${esc(org.name)}</h3><p>${esc(org.domain || 'No website')} · ${esc(org.enrichment)}</p></div></div>
      <div class="detail-list"><div><span>People</span><strong>${people.length}</strong></div><div><span>Sponsor events</span><strong>${sponsorHistory.length}</strong></div><div><span>Industry</span><strong>${esc(org.industry || 'Not set')}</strong></div><div><span>Employee range</span><strong>${esc(org.employeeRange || 'Not set')}</strong></div>${org.linkedinUrl ? `<div><span>Company LinkedIn</span><strong>${esc(org.linkedinUrl)}</strong></div>` : ''}</div>
      <div class="history"><h3>People</h3>${people.map(item => `<div class="history-item"><strong>${esc(fullName(item))}</strong><small>${esc(item.jobTitle)} · ${esc(item.email || 'No email')}</small></div>`).join('') || '<p>No people linked.</p>'}</div>
      <div class="form-actions"><button class="button secondary" data-close>Close</button><button class="button secondary" data-find-brandfetch-logo="${org.id}">Find logo by company name</button><button class="button secondary" data-enhance-entity="organisation:${org.id}">✦ Find other details</button>${org.enrichment !== 'Complete' ? `<button class="button primary" data-mark-enriched="${org.id}">Mark reviewed</button>` : ''}</div></div>`, true);
  }

  function brandfetchLogoSetupModal(organisationId) {
    const org = organisation(organisationId);
    if (!org) return;
    openModal(`${modalHeader('Connect Brandfetch', `Use the free Logo API to find a logo for ${org.name}.`)}
      <form class="modal-body" data-form="brandfetch-logo-setup" data-organisation-id="${esc(org.id)}">
        <div class="field"><label>Brandfetch Client ID</label><input name="brandfetchClientId" autocomplete="off" required placeholder="Paste the public Client ID"></div>
        <p class="review-note">This public ID is saved in this browser and shared with the Agenda Builder. You can get it from the <a href="https://developers.brandfetch.com/" target="_blank" rel="noreferrer">Brandfetch developer portal</a>.</p>
        <div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button primary" type="submit">Connect and search</button></div>
      </form>`);
  }

  function brandfetchLogoResultsModal(org, query, results) {
    ui.brandfetchLogoOrganisationId = org.id;
    ui.brandfetchLogoResults = results;
    const rows = results.map((item, index) => `<button type="button" class="brandfetch-logo-option" data-choose-brandfetch-logo="${index}">
      ${organisationLogo({ name: item.name, logo: initials(item.name), logoUrl: item.logoUrl })}
      <span><strong>${esc(item.name)}</strong><small>${esc(item.domain)}</small></span><b>Use this logo</b>
    </button>`).join('');
    openModal(`${modalHeader(`Choose a logo for ${org.name}`, 'Brandfetch searched by company name; check the domain before selecting.')}
      <div class="modal-body">
        <form class="brandfetch-logo-search" data-form="brandfetch-logo-search" data-organisation-id="${esc(org.id)}">
          <div class="field"><label>Search company name</label><input name="query" value="${esc(query)}" required minlength="2"></div>
          <button class="button secondary" type="submit">Search again</button>
        </form>
        <div class="brandfetch-logo-grid">${rows || '<p class="brandfetch-logo-empty">No Brandfetch matches were found. Try the company’s full trading name.</p>'}</div>
        <p class="review-note">Nothing changes until you choose a result. The selected domain will replace a LinkedIn URL currently stored as the website.</p>
        <div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button></div>
      </div>`, true);
  }

  async function findBrandfetchLogo(organisationId, searchName = '') {
    const org = organisation(organisationId);
    if (!org) return toast('That organisation is no longer available');
    if (!String(window.CRM_CONFIG?.brandfetchClientId || '').trim()) return brandfetchLogoSetupModal(org.id);
    const query = String(searchName || org.name || '').trim();
    if (query.length < 2) return toast('Enter at least two characters to search');
    openModal(`${modalHeader('Finding company logos', `Searching Brandfetch for ${query}…`)}<div class="modal-body"><p class="brandfetch-logo-empty">Checking company names and domains…</p></div>`);
    try {
      const results = await window.WorkgroupEnrichment.searchBrandfetch(query);
      brandfetchLogoResultsModal(org, query, results);
    } catch (error) {
      brandfetchLogoResultsModal(org, query, []);
      toast(error.message || 'Brandfetch could not be searched');
    }
  }

  function applyBrandfetchLogo(index) {
    const org = organisation(ui.brandfetchLogoOrganisationId);
    const selected = ui.brandfetchLogoResults[Number(index)];
    if (!org || !selected) return toast('That logo result is no longer available');
    const previousWebsite = String(org.domain || '').trim();
    if (previousWebsite && window.WorkgroupCsvImport?.isSocialCompanyUrl(previousWebsite)) {
      org.linkedinUrl ||= previousWebsite;
      org.domain = selected.domain;
    } else if (!previousWebsite) {
      org.domain = selected.domain;
    }
    org.logoUrl = selected.logoUrl;
    org.logoApproved = true;
    org.logoLocked = true;
    org.logoSource = 'Brandfetch Logo API';
    org.logoSourceDomain = selected.domain;
    org.logoUpdatedAt = new Date().toISOString();
    org.enrichmentSource = selected.sourceLabel;
    org.sourceUrl = selected.sourceUrl;
    if (org.enrichment !== 'Complete') org.enrichment = 'Review';
    save();
    organisationDetail(org.id);
    toast(`Logo saved for ${org.name}`);
  }

  function duplicateModal(id) {
    const candidate = state.duplicateCandidates.find(item => item.id === id);
    if (!candidate) return;
    const people = candidate.personIds.map(person).filter(Boolean);
    openModal(`${modalHeader('Review possible duplicate', 'Compare the records before deciding.')}
      <div class="modal-body"><div class="detail-list">${people.map(item => `<div><span>${esc(fullName(item))}</span><strong>${esc(item.email || 'No email')}<br>${esc(item.jobTitle || 'No job title')}</strong></div>`).join('')}</div>
      <p style="font-size:11px;color:var(--muted);line-height:1.5;margin-top:14px">This preview keeps both records intact. Production merging will preserve event history, notes and source IDs before retiring the duplicate.</p>
      <div class="form-actions"><button class="button secondary" data-not-duplicate="${candidate.id}">Not a duplicate</button><button class="button primary" data-confirm-duplicate="${candidate.id}">Mark for merge</button></div></div>`);
  }

  function enrichmentConfigurationModal() {
    const connected = Boolean(window.WorkgroupEnrichment?.isConfigured());
    openModal(`${modalHeader('Company search & enhancement', 'The fixed-cost company lookup is connected; people enhancement remains optional.')}
      <div class="modal-body">
      <div class="connection-setup"><b>1</b><div><strong>Logo.dev company search — connected</strong><p>Company names, official domains and logos are retrieved through the secure CRM service. The secret search key is encrypted in Supabase and never appears in this page.</p></div></div>
      <div class="connection-setup"><b>2</b><div><strong>Official website research — integration ready</strong><p>The matched website can supply public descriptions and verified links as sourced suggestions. Nothing overwrites an approved CRM field automatically.</p></div></div>
      <div class="connection-setup"><b>3</b><div><strong>People enhancement — deliberately not connected</strong><p>No pay-as-you-go supplier is enabled. Outlook and imported contact data will be used first; a fixed-cost provider can be added later without changing the CRM records.</p></div></div>
      <div class="form-actions"><button type="button" class="button primary" data-close>Done</button></div>
      <p class="review-note">${connected ? 'Secure company search is live for signed-in CRM members.' : 'The secure company search service still needs connecting.'}</p></div>`);
  }

  function enrichmentSuggestionModal(id) {
    const item = state.enrichmentSuggestions.find(suggestion => suggestion.id === id);
    if (!item) return;
    const imageField = ['logoUrl', 'headshotUrl'].includes(item.field);
    const currentValue = item.currentValue || suggestionEntity(item)?.[item.field] || '';
    openModal(`${modalHeader(`Review ${item.fieldLabel.toLowerCase()}`, suggestionEntityName(item))}
      <div class="modal-body"><div class="suggestion-compare">
        <article><span>Current CRM value</span>${imageField && currentValue ? `<img src="${esc(currentValue)}" alt="">` : `<strong>${esc(currentValue || 'Not added')}</strong>`}</article>
        <b>→</b>
        <article class="suggested"><span>Suggested value</span>${imageField ? `<img src="${esc(item.suggestedValue)}" alt="">` : `<strong>${esc(item.valueLabel || item.suggestedValue)}</strong>`}</article>
      </div>
      <div class="suggestion-evidence"><div><span>Source</span><a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">${esc(item.sourceLabel)}</a></div><div><span>Provider adapter</span><strong>${esc(item.provider)}</strong></div><div><span>Confidence</span><strong>${Number(item.confidence) || 0}%</strong></div></div>
      <p class="review-note">Accepting changes only this field. The source and review decision remain attached to the record for audit and future re-checks.</p>
      <div class="form-actions"><button class="button secondary" data-reject-suggestion="${item.id}">Reject</button><button class="button primary" data-accept-suggestion="${item.id}">Accept suggestion</button></div></div>`, true);
  }

  async function runEnrichment({ entityType = 'event', entityId = ui.eventId } = {}) {
    const job = state.enrichmentJobs.find(item => item.eventId === ui.eventId);
    if (window.WorkgroupEnrichment?.isConfigured()) {
      toast('Enhancement request sent securely');
      try {
        const result = await window.WorkgroupEnrichment.request({
          workspaceId: 'workgroup-preview',
          eventflowEventId: currentEvent().eventflowId,
          entityType,
          entityId,
          fields: entityType === 'person'
            ? ['jobTitle', 'linkedin', 'headshotUrl']
            : entityType === 'organisation'
              ? ['domain', 'logoUrl', 'industry', 'employeeRange', 'description']
              : ['domain', 'logoUrl', 'industry', 'employeeRange', 'description', 'jobTitle', 'linkedin', 'headshotUrl']
        });
        result.suggestions.forEach(suggestion => state.enrichmentSuggestions.unshift({
          id: uid('suggestion'),
          eventId: ui.eventId,
          status: 'Pending',
          ...suggestion
        }));
        if (job) Object.assign(job, { status: 'Suggestions ready', requestedAt: today(0) });
        save();
        render();
        toast(`${result.suggestions.length} sourced suggestions ready to review`);
      } catch (error) {
        toast(error.message || 'The enhancement request could not be completed');
      }
      return;
    }
    if (job) Object.assign(job, { status: 'Suggestions ready', requestedAt: today(0) });
    save();
    render();
    toast('Preview suggestions ready — connect the secure endpoint for live research');
  }

  function decideSuggestion(id, decision) {
    const item = state.enrichmentSuggestions.find(suggestion => suggestion.id === id);
    if (!item || item.status !== 'Pending') return;
    if (decision === 'Accepted') {
      const entity = suggestionEntity(item);
      if (entity) entity[item.field] = item.suggestedValue;
      if (item.entityType === 'organisation' && item.field === 'logoUrl') entity.enrichment = 'Review';
    }
    item.status = decision;
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = 'Preview user';
    save();
    closeModal();
    render();
    toast(decision === 'Accepted' ? 'Suggestion accepted and applied' : 'Suggestion rejected; no CRM data changed');
  }

  function downloadCsv(kind) {
    let rows = [];
    let groupHeaders = null;
    if (kind === 'group') {
      const group = currentGroup();
      const columns = group?.columns || [];
      const labelFor = columnId => GROUP_FIXED_COLUMNS.find(item => item.id === columnId)?.label
        || group?.customFields?.find(item => item.id === columnId)?.label
        || columnId;
      groupHeaders = ['Name', ...columns.map(labelFor)];
      rows = groupMemberships(group?.id).map(member => {
        const contact = person(member.personId);
        const org = organisationFor(contact);
        return [fullName(contact), ...columns.map(columnId => {
          if (columnId === 'organisation') return org?.name || '';
          if (columnId === 'jobTitle') return contact?.jobTitle || '';
          if (columnId === 'email') return contact?.email || '';
          if (columnId === 'status') return member.status || '';
          if (columnId === 'owner') return member.owner || '';
          if (columnId === 'source') return member.source || '';
          if (columnId === 'lastInteraction') return contact?.lastInteraction || '';
          if (columnId === 'notes') return member.notes || '';
          return member.values?.[columnId] || '';
        })];
      });
    }
    if (kind === 'event-contacts') rows = memberships().map(item => {
      const contact = person(item.personId);
      return [fullName(contact), contact?.jobTitle, organisationFor(contact)?.name, item.role, item.moderator ? 'Yes' : 'No', item.panelist ? 'Yes' : 'No', item.status, contact?.email, item.owner, item.source];
    });
    if (kind === 'speakers') rows = state.speakerProspects.filter(item => item.eventId === ui.eventId).map(item => {
      const contact = person(item.personId);
      return [fullName(contact), contact?.jobTitle, organisationFor(contact)?.name, item.stage, item.topic, contact?.email];
    });
    if (kind === 'sponsors') rows = state.sponsorships.filter(item => item.eventId === ui.eventId).map(item => {
      const org = organisation(item.organisationId);
      return [org?.name, org?.industry, item.stage, item.category, item.owner, item.probability];
    });
    const headers = groupHeaders || (kind === 'sponsors'
      ? ['Organisation', 'Industry', 'Stage', 'Category', 'Owner', 'Probability']
      : kind === 'speakers'
        ? ['Name', 'Job title', 'Organisation', 'Stage', 'Topic', 'Email']
        : ['Name', 'Job title', 'Organisation', 'Role', 'Moderator', 'Panelist', 'Status', 'Email', 'Owner', 'Source']);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    const exportName = kind === 'group' ? currentGroup()?.name : currentEvent().name;
    link.download = `${String(exportName || 'contacts').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${kind}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast('CSV prepared');
  }

  function downloadCrmBackup() {
    const payload = {
      product: 'Workgroup Contacts',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      workspaceId: window.CRM_CONFIG?.workspaceId || '',
      data: state
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `workgroup-contacts-backup-${today(0)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast('CRM backup downloaded');
  }

  function applyRemoteState(nextState) {
    if (!nextState || ![5, 6].includes(nextState.version)) return;
    state = ensureGroups(ensureSponsorDirectory(nextState));
    state.enrichmentProviders = structuredClone(LIVE_ENRICHMENT_PROVIDERS);
    state.workgroupParticipation ||= [];
    if (!state.groups.some(item => item.id === ui.groupId)) ui.groupId = state.groups.find(item => item.eventId === ui.eventId)?.id || state.groups[0]?.id || '';
    if (!state.events.some(item => item.id === ui.eventId)) ui.eventId = state.events[0]?.id || '';
    saveLocal();
    render();
  }

  function updateConnection(next = {}) {
    Object.assign(connection, next);
    syncConnectionUi();
  }

  async function connectCrm() {
    if (connectionBusy || !window.WorkgroupCrmData) return;
    connectionBusy = true;
    updateConnection({ mode: 'connecting', message: 'Checking secure workspace' });
    try {
      const result = await window.WorkgroupCrmData.connect(state);
      const { data, ...status } = result;
      updateConnection(status);
      if (result.data) applyRemoteState(result.data);
    } catch (error) {
      updateConnection({ mode: 'error', message: error.message || 'Could not connect' });
    } finally {
      connectionBusy = false;
      render();
    }
  }

  function initialiseDataConnection() {
    if (!window.WorkgroupCrmData) {
      updateConnection({ mode: 'local', message: 'Local preview only' });
      return;
    }
    window.WorkgroupCrmData.onStatusChange(updateConnection);
    window.WorkgroupCrmData.onStateChange(nextState => {
      applyRemoteState(nextState);
      toast('Shared CRM updated');
    });
    connectCrm().then(() => {
      window.WorkgroupCrmData.onAuthStateChange((eventName, session) => {
        if (eventName === 'SIGNED_OUT') {
          updateConnection({ mode: 'signed-out', message: 'Sign in to save and share contacts', user: null, role: '' });
          render();
        }
      });
    });
  }

  function toast(message) {
    const item = document.createElement('div');
    item.className = 'toast';
    item.textContent = message;
    document.getElementById('toastRoot').append(item);
    setTimeout(() => item.remove(), 2600);
  }

  document.addEventListener('click', eventObject => {
    if (!eventObject.target.closest('.organisation-picker')) {
      document.querySelectorAll('[data-organisation-suggestions]').forEach(panel => { panel.hidden = true; });
      document.querySelectorAll('[data-organisation-search]').forEach(input => input.setAttribute('aria-expanded', 'false'));
    }
    const target = eventObject.target.closest('button,[data-person],[data-organisation],[data-sponsor-directory],[data-segment],[data-email-campaign],[data-template-email]');
    if (!target) return;
    if (target.dataset.eventGroup) {
      const group = state.groups.find(item => item.id === target.dataset.eventGroup);
      if (group) {
        ui.groupId = group.id;
        if (group.eventId) ui.eventId = group.eventId;
        ui.view = 'groups';
        ui.query = ''; ui.groupSection = 'all'; ui.groupView = 'all'; ui.groupStatus = 'all'; ui.groupOwner = 'all';
        globalSearch.value = '';
        render();
        document.getElementById('sidebar').classList.remove('open');
      }
    }
    if (target.dataset.view) {
      ui.view = target.dataset.view;
      ui.query = '';
      globalSearch.value = '';
      render();
      document.getElementById('sidebar').classList.remove('open');
    }
    if (target.dataset.viewLink) { ui.view = target.dataset.viewLink; render(); }
    if (target.hasAttribute('data-add-menu')) addMenu();
    if (target.hasAttribute('data-crm-account')) crmConnectionModal();
    if (target.hasAttribute('data-download-crm-backup')) downloadCrmBackup();
    if (target.hasAttribute('data-open-restore-points')) restorePointsModal();
    if (target.dataset.prepareRestore) restoreConfirmationModal(target.dataset.prepareRestore);
    if (target.dataset.confirmRestore) {
      const id = target.dataset.confirmRestore;
      target.disabled = true;
      target.textContent = 'Restoring…';
      window.WorkgroupCrmData.restoreBackup(id).then(restored => {
        applyRemoteState(restored);
        closeModal();
        toast('CRM restored successfully');
      }).catch(error => {
        target.disabled = false;
        target.textContent = 'Restore version';
        toast(error.message || 'The restore could not be completed');
      });
    }
    if (target.hasAttribute('data-create-restore-point')) {
      target.disabled = true;
      window.WorkgroupCrmData.createBackup(state).then(() => {
        toast('Restore point created');
        restorePointsModal();
      }).catch(error => {
        target.disabled = false;
        toast(error.message || 'The restore point could not be created');
      });
    }
    if (target.hasAttribute('data-show-crm-reset')) crmResetModal();
    if (target.hasAttribute('data-crm-sign-out')) {
      closeModal();
      window.WorkgroupCrmData?.signOut();
    }
    if (target.dataset.add) { closeModal(); recordModal(target.dataset.add); }
    if (target.dataset.addPersonToEvent) { closeModal(); eventPersonModal(target.dataset.addPersonToEvent); }
    if (target.dataset.addGroupPeople) addGroupPeopleModal(target.dataset.addGroupPeople);
    if (target.dataset.groupColumns) groupColumnsModal(target.dataset.groupColumns);
    if (target.dataset.groupSection) { ui.groupSection = target.dataset.groupSection; render(); }
    if (target.dataset.removeGroupMember) {
      const membership = state.groupMembers.find(item => item.id === target.dataset.removeGroupMember);
      if (membership) {
        const group = state.groups.find(item => item.id === membership.groupId);
        state.groupMembers = state.groupMembers.filter(item => item.id !== membership.id);
        if (group?.eventId) {
          state.eventPeople = state.eventPeople.filter(item => !(item.eventId === group.eventId && item.personId === membership.personId));
          state.speakerProspects = state.speakerProspects.filter(item => !(item.eventId === group.eventId && item.personId === membership.personId));
        }
        save();
        render();
        toast('Person removed from this event list');
      }
    }
    if (target.dataset.addWorkgroup) workgroupParticipationModal(target.dataset.addWorkgroup);
    if (target.dataset.removeWorkgroup) {
      const participation = (state.workgroupParticipation || []).find(item => item.id === target.dataset.removeWorkgroup);
      if (participation) {
        state.workgroupParticipation = state.workgroupParticipation.filter(item => item.id !== participation.id);
        save();
        personDetail(participation.personId);
        toast('Workgroup history removed');
      }
    }
    if (target.hasAttribute('data-import-folk')) { closeModal(); folkImportModal(); }
    if (target.hasAttribute('data-confirm-folk-import')) importFolkData();
    if (target.hasAttribute('data-close') || (target.classList.contains('modal-backdrop') && eventObject.target === target)) closeModal();
    if (target.hasAttribute('data-clear-owner')) {
      const picker = target.closest('[data-owner-picker]');
      const input = picker?.querySelector('[data-owner-input]');
      const chip = picker?.querySelector('[data-owner-chip]');
      if (chip) chip.hidden = true;
      if (input) {
        input.hidden = false;
        input.value = '';
        input.focus();
      }
    }
    if (target.dataset.selectOrganisation !== undefined
      || target.dataset.selectCompanyResult !== undefined
      || target.hasAttribute('data-use-new-organisation')) selectOrganisationSuggestion(target);
    if (target.dataset.person) personDetail(target.dataset.person);
    if (target.dataset.organisation) organisationDetail(target.dataset.organisation);
    if (target.dataset.sponsorDirectory) sponsorDirectoryDetail(target.dataset.sponsorDirectory);
    if (target.dataset.editSponsorDirectory) sponsorDirectoryModal(target.dataset.editSponsorDirectory);
    if (target.dataset.roleTab) { ui.role = target.dataset.roleTab; render(); }
    if (target.dataset.messageTab) { ui.messageTab = target.dataset.messageTab; render(); }
    if (target.dataset.export) downloadCsv(target.dataset.export);
    if (target.hasAttribute('data-email-segment') || target.hasAttribute('data-compose-email')) composeEmail();
    if (target.dataset.emailGroup) composeEmail({ groupId: target.dataset.emailGroup });
    if (target.dataset.composePersonEmail) { closeModal(); composeEmail({ personId: target.dataset.composePersonEmail }); }
    if (target.dataset.templateEmail) composeEmail({ templateId: target.dataset.templateEmail });
    if (target.dataset.emailCampaign) composeEmail({ campaignId: target.dataset.emailCampaign });
    if (target.hasAttribute('data-connect-outlook')) { closeModal(); outlookConnectionModal(); }
    if (target.hasAttribute('data-configure-enrichment')) enrichmentConfigurationModal();
    if (target.dataset.findBrandfetchLogo) findBrandfetchLogo(target.dataset.findBrandfetchLogo);
    if (target.dataset.chooseBrandfetchLogo !== undefined) applyBrandfetchLogo(target.dataset.chooseBrandfetchLogo);
    if (target.hasAttribute('data-run-enrichment')) runEnrichment();
    if (target.dataset.enhanceEntity) {
      const [entityType, entityId] = target.dataset.enhanceEntity.split(':');
      closeModal();
      ui.view = 'enrichment';
      render();
      runEnrichment({ entityType, entityId });
    }
    if (target.dataset.reviewSuggestion) enrichmentSuggestionModal(target.dataset.reviewSuggestion);
    if (target.dataset.acceptSuggestion) decideSuggestion(target.dataset.acceptSuggestion, 'Accepted');
    if (target.dataset.rejectSuggestion) decideSuggestion(target.dataset.rejectSuggestion, 'Rejected');
    if (target.hasAttribute('data-run-quality')) toast('Checks complete — no records changed');
    if (target.dataset.reviewDuplicate) duplicateModal(target.dataset.reviewDuplicate);
    if (target.dataset.notDuplicate || target.dataset.confirmDuplicate) {
      const id = target.dataset.notDuplicate || target.dataset.confirmDuplicate;
      const candidate = state.duplicateCandidates.find(item => item.id === id);
      if (candidate) candidate.status = target.dataset.notDuplicate ? 'Dismissed' : 'Ready to merge';
      save(); closeModal(); render(); toast(target.dataset.notDuplicate ? 'Pair dismissed' : 'Pair added to the migration merge plan');
    }
    if (target.dataset.markEnriched) {
      const org = organisation(target.dataset.markEnriched);
      if (org) org.enrichment = 'Complete';
      save(); closeModal(); render(); toast('Organisation marked reviewed');
    }
    if (target.dataset.segment) composeEmail({ segmentId: target.dataset.segment });
  });

  document.addEventListener('change', eventObject => {
    const target = eventObject.target;
    if (target.matches('[data-folk-import-files]')) {
      readFolkFiles(target.files).catch(error => toast(error.message || 'The CSV files could not be read'));
      return;
    }
    if (target === eventSwitcher) {
      ui.eventId = target.value;
      ui.role = 'All'; ui.attendance = 'all'; ui.owner = 'all';
      const matchingGroup = state.groups.find(item => item.eventId === ui.eventId);
      if (ui.view === 'groups' && matchingGroup) {
        ui.groupId = matchingGroup.id;
        ui.groupSection = 'all'; ui.groupView = 'all'; ui.groupStatus = 'all'; ui.groupOwner = 'all';
      }
      render();
    }
    if (target.id === 'groupStatusFilter') { ui.groupStatus = target.value; render(); }
    if (target.id === 'groupOwnerFilter') { ui.groupOwner = target.value; render(); }
    if (target.id === 'groupProgressFilter') { ui.groupView = target.value; render(); }
    if (target.dataset.groupMemberField) {
      const membership = state.groupMembers.find(item => item.id === target.dataset.groupMemberField);
      const field = target.dataset.field;
      if (membership && ['status', 'owner', 'source', 'notes'].includes(field)) {
        membership[field] = target.value;
        const group = state.groups.find(item => item.id === membership.groupId);
        const eventPerson = group?.eventId
          ? state.eventPeople.find(item => item.eventId === group.eventId && item.personId === membership.personId)
          : null;
        if (eventPerson && ['status', 'owner', 'source'].includes(field)) eventPerson[field] = target.value;
        save();
        if (field === 'status') render();
        else toast('Event-list field saved');
      }
    }
    if (target.dataset.groupMemberCustom) {
      const membership = state.groupMembers.find(item => item.id === target.dataset.groupMemberCustom);
      if (membership) {
        membership.values ||= {};
        membership.values[target.dataset.field] = target.value;
        const group = state.groups.find(item => item.id === membership.groupId);
        const eventPerson = group?.eventId
          ? state.eventPeople.find(item => item.eventId === group.eventId && item.personId === membership.personId)
          : null;
        if (eventPerson && target.dataset.field === 'contact-type' && EVENT_ROLES.includes(target.value)) eventPerson.role = target.value;
        if (eventPerson && target.dataset.field === 'moderator') eventPerson.moderator = target.value === 'Yes';
        if (eventPerson && target.dataset.field === 'panelist') eventPerson.panelist = target.value === 'Yes';
        if (eventPerson && (eventPerson.moderator || eventPerson.panelist || eventPerson.role === 'Speaker')
          && !state.speakerProspects.some(item => item.eventId === eventPerson.eventId && item.personId === eventPerson.personId)) {
          state.speakerProspects.push({
            id: uid('speaker'),
            eventId: eventPerson.eventId,
            personId: eventPerson.personId,
            stage: eventPerson.status === 'Confirmed' ? 'Confirmed' : eventPerson.status === 'Invited' ? 'Invited' : 'Researching',
            topic: [eventPerson.moderator ? 'Moderator' : '', eventPerson.panelist ? 'Panelist' : ''].filter(Boolean).join(' & '),
            owner: eventPerson.owner || ''
          });
        }
        save();
        if (['contact-type', 'moderator', 'panelist'].includes(target.dataset.field)) render();
        toast('Event-specific field saved');
      }
    }
    if (target.id === 'attendanceFilter') { ui.attendance = target.value; render(); }
    if (target.id === 'ownerFilter') { ui.owner = target.value; render(); }
    if (target.dataset.speakerStage) {
      const item = state.speakerProspects.find(entry => entry.id === target.dataset.speakerStage);
      if (item) item.stage = target.value;
      save(); render(); toast(`Speaker moved to ${target.value}`);
    }
    if (target.dataset.sponsorStage) {
      const item = state.sponsorships.find(entry => entry.id === target.dataset.sponsorStage);
      if (item) {
        item.stage = target.value;
        if (target.value === 'Confirmed') {
          item.probability = 100;
          const directoryEntry = (state.sponsorDirectory || []).find(entry => entry.organisationId === item.organisationId);
          if (directoryEntry) directoryEntry.relationshipStatus = 'Active partner';
        }
      }
      save(); render(); toast(`Sponsor moved to ${target.value}`);
    }
    if (target.id === 'emailTemplatePicker') {
      const template = state.emailTemplates.find(item => item.id === target.value);
      const form = target.closest('form');
      if (template && form) {
        if (!form.elements.name.value) form.elements.name.value = template.name;
        form.elements.subject.value = template.subject;
        form.elements.body.value = template.body;
      }
    }
  });

  let searchTimer;
  let organisationSearchTimer;
  let organisationSearchSequence = 0;
  document.addEventListener('input', eventObject => {
    if (eventObject.target.matches('[data-organisation-search]')) {
      const input = eventObject.target;
      delete input.dataset.selectedOrganisationId;
      delete input.dataset.selectedCompanyResult;
      delete input.dataset.useNewOrganisation;
      clearTimeout(organisationSearchTimer);
      const sequence = ++organisationSearchSequence;
      organisationSearchTimer = setTimeout(() => searchOrganisationsLive(input, sequence), 160);
      return;
    }
    if (!['globalSearch', 'listSearch'].includes(eventObject.target.id)) return;
    const source = eventObject.target.id;
    const value = eventObject.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      ui.query = value;
      if (source === 'globalSearch' && !['people', 'organisations', 'sponsor-directory', 'event-contacts', 'groups'].includes(ui.view)) ui.view = 'people';
      render();
      const next = document.getElementById(source);
      if (next) { next.focus(); next.setSelectionRange(value.length, value.length); }
    }, 140);
  });

  document.addEventListener('submit', async eventObject => {
    const form = eventObject.target.closest('form[data-form]');
    if (!form) return;
    eventObject.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    if (eventObject.submitter?.name) data[eventObject.submitter.name] = eventObject.submitter.value;
    const type = form.dataset.form;
    if (type === 'group-people') {
      const group = state.groups.find(item => item.id === form.dataset.groupId);
      if (!group) return toast('That event list is no longer available');
      const personIds = formData.getAll('personIds').map(String);
      if (!personIds.length) return toast('Choose at least one person');
      const selectedRole = EVENT_ROLES.includes(data.role) ? data.role : 'Attendee';
      const selectedStatus = String(data.status || 'Researching');
      const selectedModerator = data.moderator === 'true';
      const selectedPanelist = data.panelist === 'true';
      let added = 0;
      personIds.forEach(personId => {
        if (!person(personId) || state.groupMembers.some(item => item.groupId === group.id && item.personId === personId)) return;
        const contact = person(personId);
        let eventPerson = state.eventPeople.find(item => item.eventId === group.eventId && item.personId === personId);
        if (group.eventId && !eventPerson) {
          eventPerson = {
            id: uid('event-person'),
            eventId: group.eventId,
            personId,
            role: selectedRole,
            moderator: selectedModerator,
            panelist: selectedPanelist,
            status: selectedStatus,
            source: 'Event contact list',
            owner: contact.owner || event(group.eventId)?.owner || accountOwner(),
            workgroup: '',
            diaryInvite: false
          };
          state.eventPeople.push(eventPerson);
        }
        if (group.eventId && (selectedModerator || selectedPanelist || selectedRole === 'Speaker')
          && !state.speakerProspects.some(item => item.eventId === group.eventId && item.personId === personId)) {
          state.speakerProspects.push({
            id: uid('speaker'),
            eventId: group.eventId,
            personId,
            stage: selectedStatus === 'Confirmed' ? 'Confirmed' : selectedStatus === 'Invited' ? 'Invited' : 'Researching',
            topic: [selectedModerator ? 'Moderator' : '', selectedPanelist ? 'Panelist' : ''].filter(Boolean).join(' & '),
            owner: eventPerson?.owner || contact.owner || accountOwner()
          });
        }
        state.groupMembers.push({
          id: uid('group-member'),
          groupId: group.id,
          personId,
          status: eventPerson?.status || 'To contact',
          owner: eventPerson?.owner || contact.owner || accountOwner(),
          source: eventPerson?.source || '',
          notes: '',
          values: {
            'attending': eventPerson?.status === 'Confirmed' ? 'Yes' : eventPerson?.status === 'Declined' ? 'No' : '',
            'contact-type': eventPerson?.role || '',
            'moderator': eventPerson?.moderator ? 'Yes' : 'No',
            'panelist': eventPerson?.panelist ? 'Yes' : 'No',
            'diary-invite': eventPerson?.diaryInvite ? 'Yes' : eventPerson ? 'No' : '',
            'workgroup-ideas': eventPerson?.workgroup || ''
          }
        });
        added += 1;
      });
      ensureGroups(state);
      save();
      closeModal();
      ui.groupId = group.id;
      ui.view = 'groups';
      ui.groupSection = selectedRole === 'Sponsor' ? 'sponsors' : selectedRole === 'Attendee' ? 'attendees' : (selectedRole === 'Facilitator' || selectedRole === 'Speaker' || selectedModerator || selectedPanelist) ? 'workgroupers' : 'all';
      render();
      toast(`${added} ${added === 1 ? 'person' : 'people'} added to ${group.name}`);
      return;
    }
    if (type === 'group-columns') {
      const group = state.groups.find(item => item.id === form.dataset.groupId);
      if (!group) return toast('That event list is no longer available');
      group.columns = formData.getAll('columns').map(String);
      const label = String(data.newFieldLabel || '').trim();
      if (label) {
        let id = groupFieldId(label);
        if ((group.customFields || []).some(item => item.id === id)) id = `${id}-${Math.random().toString(36).slice(2, 5)}`;
        const typeName = data.newFieldType === 'select' ? 'select' : 'text';
        const options = typeName === 'select'
          ? ['', ...String(data.newFieldOptions || '').split(',').map(item => item.trim()).filter(Boolean)]
          : [];
        group.customFields ||= [];
        group.customFields.push({ id, label, type: typeName, options: [...new Set(options)] });
        group.columns.push(id);
      }
      group.columns = [...new Set(group.columns)];
      save();
      closeModal();
      render();
      toast('Event-list fields updated');
      return;
    }
    if (type === 'crm-signin') {
      const submit = form.querySelector('button[type="submit"],button:not([type])');
      if (submit) { submit.disabled = true; submit.textContent = 'Signing in…'; }
      try {
        await window.WorkgroupCrmData.signIn(String(data.email || '').trim(), String(data.password || ''));
        await connectCrm();
        closeModal();
        toast(connection.mode === 'connected' ? 'Shared CRM connected' : connection.message);
      } catch (error) {
        if (submit) { submit.disabled = false; submit.textContent = 'Sign in'; }
        toast(error.message || 'Sign-in could not be completed');
      }
      return;
    }
    if (type === 'crm-reset') {
      try {
        await window.WorkgroupCrmData.resetPassword(String(data.email || '').trim());
        closeModal();
        toast('Password reset email sent');
      } catch (error) {
        toast(error.message || 'Password email could not be sent');
      }
      return;
    }
    if (type === 'brandfetch-logo-setup') {
      const clientId = String(data.brandfetchClientId || '').trim();
      if (!clientId) return toast('Paste the Brandfetch Client ID');
      window.CRM_CONFIG.brandfetchClientId = clientId;
      localStorage.setItem('workgroup-brandfetch-client-id', clientId);
      await findBrandfetchLogo(form.dataset.organisationId);
      return;
    }
    if (type === 'brandfetch-logo-search') {
      await findBrandfetchLogo(form.dataset.organisationId, String(data.query || '').trim());
      return;
    }
    if (type === 'company-search-config') {
      const clientId = String(data.brandfetchClientId || '').trim();
      window.CRM_CONFIG.brandfetchClientId = clientId;
      if (clientId) localStorage.setItem('workgroup-brandfetch-client-id', clientId);
      else localStorage.removeItem('workgroup-brandfetch-client-id');
      closeModal();
      render();
      toast(clientId ? 'Internet company search connected' : 'Internet company search disconnected');
      return;
    }
    if (type === 'workgroup-participation') {
      const personId = form.dataset.personId;
      const contact = person(personId);
      if (!contact) return toast('That contact is no longer available');
      const linkedEvent = event(String(data.eventId || ''));
      const workgroupName = String(data.workgroupName || '').trim();
      const capacity = data.capacity === 'Facilitated' ? 'Facilitated' : 'Attended';
      const eventName = linkedEvent?.name || String(data.eventName || '').trim();
      const participationDate = String(data.participationDate || linkedEvent?.date || '').trim();
      const duplicate = (state.workgroupParticipation || []).some(item =>
        item.personId === personId
        && String(item.workgroupName || '').trim().toLowerCase() === workgroupName.toLowerCase()
        && item.capacity === capacity
        && String(item.eventId || '') === String(linkedEvent?.id || '')
        && String(item.eventName || '').trim().toLowerCase() === eventName.toLowerCase()
      );
      if (duplicate) return toast('That workgroup history is already attached');
      state.workgroupParticipation ||= [];
      state.workgroupParticipation.push({
        id: uid('workgroup'),
        personId,
        workgroupName,
        capacity,
        eventId: linkedEvent?.id || '',
        eventName,
        participationDate,
        notes: String(data.notes || '').trim()
      });
      save();
      personDetail(personId);
      toast(`${workgroupName} attached to ${fullName(contact)}`);
      return;
    }
    if (type === 'sponsor-directory') {
      const existing = (state.sponsorDirectory || []).find(item => item.id === form.dataset.directoryId);
      const organisationId = String(data.organisationId || '');
      const org = organisation(organisationId);
      if (!org) return toast('Choose an existing organisation');
      if (!existing && (state.sponsorDirectory || []).some(item => item.organisationId === organisationId)) {
        return toast(`${org.name} is already in the sponsor directory`);
      }
      const values = {
        organisationId,
        relationshipStatus: SPONSOR_RELATIONSHIP_STATUSES.includes(data.relationshipStatus) ? data.relationshipStatus : 'Prospect',
        category: String(data.category || '').trim(),
        owner: String(data.owner || '').trim(),
        notes: String(data.notes || '').trim()
      };
      state.sponsorDirectory ||= [];
      if (existing) Object.assign(existing, values);
      else state.sponsorDirectory.push({ id: uid('sponsor-directory'), ...values });
      save();
      closeModal();
      ui.view = 'sponsor-directory';
      render();
      toast(existing ? `${org.name} sponsor profile updated` : `${org.name} added to the sponsor directory`);
      return;
    }
    if (type === 'email') {
      const [audienceType, audienceId] = String(data.audience || '').split(':');
      const targetPerson = audienceType === 'person' ? person(audienceId) : null;
      const targetSegment = audienceType === 'segment' ? state.segments.find(item => item.id === audienceId) : null;
      const targetGroup = audienceType === 'group' ? state.groups.find(item => item.id === audienceId) : null;
      const recipientCount = targetPerson ? Number(Boolean(targetPerson.email))
        : targetSegment ? segmentCount(targetSegment)
          : targetGroup ? groupMemberships(targetGroup.id).filter(item => person(item.personId)?.email).length
          : memberships().filter(item => person(item.personId)?.email).length;
      const audience = targetPerson ? fullName(targetPerson) : targetSegment?.name || targetGroup?.name || currentEvent().name;
      if (!recipientCount) return toast('This audience has no usable email addresses');
      if (data.action === 'send' && state.mailConnection.status !== 'Connected') return toast('Connect Outlook before sending');
      const existing = state.emailCampaigns.find(item => item.id === form.dataset.campaignId);
      const values = {
        eventId: ui.eventId,
        name: data.name,
        audience,
        audienceKey: data.audience,
        subject: data.subject,
        body: data.body,
        status: data.action === 'send' ? 'Sent' : 'Draft',
        recipientCount,
        steps: Number(data.steps) || 1,
        sender: state.mailConnection.accountEmail || currentEvent().owner,
        updatedAt: today(0)
      };
      if (existing) Object.assign(existing, values);
      else state.emailCampaigns.unshift({ id: uid('mail'), ...values });
      save(); closeModal(); ui.view = 'messages'; ui.messageTab = data.action === 'send' ? 'Campaigns' : 'Drafts'; render();
      toast(data.action === 'send' ? 'Email accepted by Outlook' : 'Draft saved');
      return;
    }
    let saveMessage = 'Saved to the shared CRM';
    let queuedOrganisation = null;
    if (type === 'person') {
      const email = String(data.email || '').trim().toLowerCase();
      const emailMatch = email && state.people.find(item => String(item.email || '').trim().toLowerCase() === email);
      if (emailMatch) return toast(`${fullName(emailMatch)} already uses that email address`);
      const organisationInput = form.querySelector('[data-organisation-search]');
      const selectedExisting = organisationInput?.dataset.selectedOrganisationId
        ? organisation(organisationInput.dataset.selectedOrganisationId)
        : null;
      const selectedExternalIndex = organisationInput?.dataset.selectedCompanyResult;
      const selectedExternal = selectedExternalIndex !== undefined
        ? ui.organisationSearchResults[Number(selectedExternalIndex)]
        : null;
      const organisationName = selectedExisting?.name || selectedExternal?.name || String(data.organisationName || '').trim();
      const normalisedOrganisation = window.WorkgroupOrganisationMatcher.normalise(organisationName);
      const identityMatch = state.people.find(item =>
        String(item.firstName || '').trim().toLowerCase() === String(data.firstName || '').trim().toLowerCase()
        && String(item.lastName || '').trim().toLowerCase() === String(data.lastName || '').trim().toLowerCase()
        && window.WorkgroupOrganisationMatcher.normalise(organisationFor(item)?.name || '') === normalisedOrganisation
      );
      if (identityMatch) return toast(`${fullName(identityMatch)} already exists at this organisation`);
      const externalDetails = selectedExternal ? {
        domain: selectedExternal.domain,
        logoUrl: selectedExternal.logoUrl,
        industry: selectedExternal.industry,
        employeeRange: selectedExternal.employeeRange,
        description: selectedExternal.description,
        enrichmentSource: selectedExternal.sourceLabel,
        sourceUrl: selectedExternal.sourceUrl
      } : {};
      const resolution = selectedExisting
        ? { organisation: selectedExisting, created: false, confidence: 100 }
        : resolveOrganisation(
          organisationName,
          externalDetails,
          organisationInput?.dataset.useNewOrganisation === 'true'
        );
      delete data.organisationName;
      const newPerson = {
        id: uid('person'),
        ...data,
        organisationId: resolution.organisation?.id || '',
        email: String(data.email || '').trim(),
        phone: '',
        lastInteraction: '',
        notes: data.notes || ''
      };
      state.people.push(newPerson);
      if (resolution.created) {
        queuedOrganisation = resolution.organisation;
        saveMessage = `${fullName(newPerson)} saved; ${resolution.organisation.name} added for company research`;
      } else if (resolution.organisation) {
        saveMessage = `${fullName(newPerson)} linked to ${resolution.organisation.name}`;
      } else {
        saveMessage = `${fullName(newPerson)} saved`;
      }
    }
    if (type === 'organisation') {
      const organisationInput = form.querySelector('[data-organisation-search]');
      const selectedExisting = organisationInput?.dataset.selectedOrganisationId
        ? organisation(organisationInput.dataset.selectedOrganisationId)
        : null;
      const selectedExternalIndex = organisationInput?.dataset.selectedCompanyResult;
      const selectedExternal = selectedExternalIndex !== undefined
        ? ui.organisationSearchResults[Number(selectedExternalIndex)]
        : null;
      const organisationName = selectedExisting?.name || selectedExternal?.name || String(data.organisationName || '').trim();
      if (!organisationName) return toast('Enter an organisation name');
      const details = {
        domain: String(data.domain || selectedExternal?.domain || '').trim(),
        logoUrl: String(data.logoUrl || selectedExternal?.logoUrl || '').trim(),
        industry: String(data.industry || selectedExternal?.industry || '').trim(),
        employeeRange: String(data.employeeRange || selectedExternal?.employeeRange || '').trim(),
        description: selectedExternal?.description || '',
        notes: String(data.notes || '').trim(),
        enrichmentSource: selectedExternal?.sourceLabel || '',
        sourceUrl: selectedExternal?.sourceUrl || ''
      };
      const resolution = selectedExisting
        ? resolveOrganisation(selectedExisting.name, details)
        : resolveOrganisation(
          organisationName,
          details,
          organisationInput?.dataset.useNewOrganisation === 'true'
        );
      queuedOrganisation = resolution.created || (details.domain && resolution.organisation?.enrichment !== 'Complete')
        ? resolution.organisation
        : null;
      saveMessage = resolution.created
        ? `${resolution.organisation.name} added and queued for company research`
        : `Matched to existing ${resolution.organisation.name}`;
    }
    if (type === 'event-person') {
      const targetEventId = String(data.eventId || ui.eventId);
      const targetEvent = event(targetEventId);
      const contact = person(String(data.personId || ''));
      if (!targetEvent || !contact) return toast('Choose an event and a person');
      if (state.eventPeople.some(item => item.eventId === targetEventId && item.personId === contact.id)) return toast(`${fullName(contact)} is already attached to ${targetEvent.name}`);
      const role = EVENT_ROLES.includes(data.role) ? data.role : 'Attendee';
      const moderator = data.moderator === 'true';
      const panelist = data.panelist === 'true';
      state.eventPeople.push({
        id: uid('event-person'),
        eventId: targetEventId,
        personId: contact.id,
        role,
        moderator,
        panelist,
        status: String(data.status || 'Researching'),
        source: String(data.source || '').trim(),
        owner: String(data.owner || targetEvent.owner || '').trim(),
        workgroup: '',
        diaryInvite: false
      });
      if ((moderator || panelist || role === 'Speaker') && !state.speakerProspects.some(item => item.eventId === targetEventId && item.personId === contact.id)) {
        state.speakerProspects.push({
          id: uid('speaker'),
          eventId: targetEventId,
          personId: contact.id,
          stage: data.status === 'Confirmed' ? 'Confirmed' : data.status === 'Invited' ? 'Invited' : 'Researching',
          topic: [moderator ? 'Moderator' : '', panelist ? 'Panelist' : ''].filter(Boolean).join(' & '),
          owner: String(data.owner || targetEvent.owner || '').trim()
        });
      }
      ensureGroups(state);
      save();
      closeModal();
      ui.eventId = targetEventId;
      ui.groupId = state.groups.find(item => item.eventId === targetEventId)?.id || ui.groupId;
      ui.view = 'groups';
      ui.groupSection = role === 'Sponsor' ? 'sponsors' : role === 'Attendee' ? 'attendees' : (role === 'Facilitator' || role === 'Speaker' || moderator || panelist) ? 'workgroupers' : 'all';
      ui.groupView = 'all'; ui.groupStatus = 'all'; ui.groupOwner = 'all';
      render();
      toast(`${fullName(contact)} added to ${targetEvent.name} as ${role}${moderator || panelist ? ` · ${[moderator ? 'Moderator' : '', panelist ? 'Panelist' : ''].filter(Boolean).join(' and ')}` : ''}`);
      return;
    }
    if (type === 'activity') state.activities.push({ id: uid('activity'), eventId: ui.eventId, ...data, done: false });
    if (type === 'speaker') {
      state.speakerProspects.push({ id: uid('speaker'), eventId: ui.eventId, ...data });
      if (!state.eventPeople.some(item => item.eventId === ui.eventId && item.personId === data.personId)) state.eventPeople.push({ id: uid('event-person'), eventId: ui.eventId, personId: data.personId, role: 'Speaker', status: data.stage === 'Confirmed' ? 'Confirmed' : 'Researching', source: 'Speaker planning', owner: data.owner, workgroup: data.topic || '', diaryInvite: false });
    }
    if (type === 'sponsor') {
      state.sponsorships.push({ id: uid('sponsor'), eventId: ui.eventId, ...data, probability: Number(data.probability) || 0, notes: '' });
      state.sponsorDirectory ||= [];
      const directoryEntry = state.sponsorDirectory.find(item => item.organisationId === data.organisationId);
      if (directoryEntry) {
        if (data.stage === 'Confirmed') directoryEntry.relationshipStatus = 'Active partner';
        if (!directoryEntry.category && data.category) directoryEntry.category = data.category;
        if (!directoryEntry.owner && data.owner) directoryEntry.owner = data.owner;
      } else {
        state.sponsorDirectory.push({
          id: uid('sponsor-directory'),
          organisationId: data.organisationId,
          relationshipStatus: data.stage === 'Confirmed' ? 'Active partner' : 'Prospect',
          category: data.category || '',
          owner: data.owner || '',
          notes: ''
        });
      }
    }
    if (type === 'segment') state.segments.push({ id: uid('segment'), eventId: ui.eventId, ...data });
    ensureGroups(state);
    save();
    closeModal();
    ui.view = type === 'person' ? 'people' : type === 'organisation' ? 'organisations' : type === 'event-person' ? 'event-contacts' : type === 'speaker' ? 'speakers' : type === 'sponsor' ? 'sponsors' : type === 'segment' ? 'segments' : 'overview';
    render();
    toast(saveMessage);
    if (queuedOrganisation) queueOrganisationEnhancement(queuedOrganisation);
  });

  document.getElementById('mobileMenu').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  window.WorkgroupCrmBridge = Object.freeze({
    upsertEvent: upsertEventFromEventFlow,
    getEventBundle: eventBundle
  });
  window.addEventListener('workgroup:eventflow-event-upsert', eventObject => {
    try {
      upsertEventFromEventFlow(eventObject.detail || {});
    } catch (error) {
      toast(error.message || 'The Eventfrog event could not be mirrored');
    }
  });
  render();
  initialiseDataConnection();
})();
