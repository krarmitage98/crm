# CRM Supabase connection

The CRM reuses the existing Supabase project only for authentication. All CRM storage is separated with the `crm_` prefix.

## Prepared migration

`supabase/migrations/202607230001_create_crm_workspace_foundation.sql` creates:

- `crm_workspace_members` for CRM-specific access;
- `crm_workspace_state` for the shared CRM preview data;
- `crm_workspace_backups` for automatic restore points;
- row-level security policies checked against the signed-in user;
- a safe first-user claim function for an empty CRM workspace, with the Workgroup owner explicitly seeded when that existing account is present;
- an automatic snapshot trigger before every shared update;
- retention of the latest 100 database restore points;
- realtime publication for shared changes.

The migration does not alter `workspace_state`, Eventfrog tables, Eventfrog policies or Eventfrog code.

## Browser behaviour

`supabase-adapter.js`:

- detects an existing Supabase session;
- offers password sign-in when required;
- copies the fictional local preview into an empty CRM workspace on first connection;
- saves subsequent changes to Supabase while retaining a device-local safety copy;
- detects conflicting updates rather than silently overwriting a newer version;
- receives shared workspace changes in real time;
- lists, creates and restores database snapshots;
- supports a complete downloadable JSON backup.

Until the migration is applied, the CRM displays “Setup required” and continues safely in local-preview mode.

## Duplicate protection

The current creation form blocks:

- an email address already assigned to another person;
- the same first name, last name and organisation combination.

The later Folk import will additionally use the normalised `crm_contacts` indexes and the duplicate review queue before approved contacts are published.

## Deployment boundary

Applying the prepared migration is a separate database deployment action. It should be reviewed and applied on its own so unrelated Eventfrog migrations or local work are not included accidentally.
