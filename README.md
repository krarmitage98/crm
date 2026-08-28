# Workgroup Contacts

Workgroup Contacts is being developed as a separate sister application so Eventfrog remains untouched during prototyping. The intended product experience is a native Contacts/CRM area inside Eventfrog, not a second disconnected product.

## Current foundation

- Master records for people and organisations
- New contacts default to the signed-in account holder as owner, with a removable/editable owner chip
- Live organisation picker with typo-tolerant CRM matching and provider search results
- Contact headshots and company logo assets with initial fallbacks
- AI enhancement centre for sourced logo, company and contact suggestions
- Website-first company matching so an official domain drives canonical names, logos and organisation details
- Human approval workflow so enrichment never silently overwrites trusted data
- Provider-neutral server adapter ready for one or several third-party services
- Fixed-cost enrichment route using Logo.dev for company search and logos
- Event-specific roles and attendance statuses
- One automatically-created contact workspace for every Eventfrog event
- Event workspace tabs for Workgroupers & Panelists, Attendee list and Sponsors
- Independent moderator and panelist flags that can overlap any main event role
- Collapsed contact-level workgroup history for attended and facilitated sessions
- Speaker planning by event
- Organisation-based sponsorship planning
- Separate global sponsor directory with relationship status and cross-event history
- Dynamic segments for communications and exports
- Individual and segmented email drafting, templates, sequences and delivery history
- Outlook mailbox sync design for capturing external correspondents with duplicate and newsletter safeguards
- Duplicate and enrichment review queues
- Stable Eventfrog event identifiers
- CSV exports for event contacts, speakers and sponsors
- Guided Folk CSV import with duplicate matching, notes linking and preservation of unmapped custom fields
- Folk company URL handling that prefers the official website and keeps a company LinkedIn URL separate
- Organisation-level Brandfetch logo search by company name, with a user-confirmed domain and stable Logo API URL
- Responsive desktop and mobile layouts using the Workgroup visual system
- Supabase sign-in using the existing Eventfrog account system
- Shared CRM persistence with optimistic conflict protection
- Automatic database restore points plus downloadable JSON backups
- Duplicate blocking for matching emails and identical person/organisation records

The preview uses fictional example records so its interactions can be tested safely. It keeps a device-local safety copy and switches to the separate shared CRM workspace after the CRM Supabase migration is applied and the user signs in. It does not read from or write to Folk or Eventfrog records. Email sending remains deliberately locked until the Microsoft Entra app and server-side token storage are configured.

Existing CRM organisations are matched live in the preview. Signed-in CRM members can search Logo.dev securely for online company names, official domains and logos, while Wikidata supplements public company details. The Logo.dev secret key is encrypted in Supabase and the browser receives only selectable results and safe image URLs. People enhancement remains disconnected until a suitable fixed-cost provider is chosen. `enrichment-adapter.js` defines the browser contracts, `enrichment-integration.md` defines the secure third-party pipeline, and `config.js` holds only public connection settings.

An organisation’s detail view also has a separate **Find logo by company name** action. It uses Brandfetch company search even when the CRM has no domain, asks the user to confirm the correct company result, then saves a stable Brandfetch Logo API URL. The public Brandfetch Client ID is stored locally under `workgroup-brandfetch-client-id` and is shared with the Agenda Builder on the same site. Folk exposes company URLs as an ordered list, so the CSV import checks the full list, ignores social networks when choosing the official domain, and preserves a company LinkedIn URL separately.

## Eventfrog boundary

Eventfrog remains the source of truth for event creation, event details, operational tasks and task completion. Workgroup Contacts owns people, organisations, event roles, moderator/panelist positions, sponsorship records, relationship activity and saved audiences.

The two areas connect using a stable `eventflow_event_id`. Creating an Eventfrog event creates or updates its matching CRM workspace; changing a person's event relationship in either area updates the same event-contact record. Eventfrog can request an event contact bundle using the shape in `integration-contract.json` and display it in a native contact panel without duplicating the records.

The preview exposes `WorkgroupCrmBridge.upsertEvent(...)` and `WorkgroupCrmBridge.getEventBundle(...)` as the front-end integration seam. A production version should route the same operations through authenticated Supabase functions so separate pages and multiple signed-in users receive the same updates.

## Supabase preparation

`data-model.sql` contains the proposed fully normalised schema for the later Folk migration. It remains a draft.

`supabase/migrations/202607230001_create_crm_workspace_foundation.sql` is the first operational CRM migration. It creates only `crm_` tables and functions: workspace membership, shared state and automatic restore points. It does not alter Eventfrog's `workspace_state` or application tables.

The intended migration order is:

1. Apply the CRM workspace foundation migration.
2. Sign in with an existing Eventfrog/Supabase account and claim the empty CRM workspace.
3. Test shared saves, downloadable backups and restore points using fictional records.
4. Create the normalised CRM contact tables and import Folk into a staging area.
5. Resolve duplicate candidates.
6. Publish approved records and link them to existing Eventfrog event IDs.
7. Enable Eventfrog read access to accepted CRM data.

## Open locally

Serve the repository root with a local static web server and open `/crm/`.
