-- Draft only. This file has not been applied to the EventFlow Supabase project.
-- It documents the normalised CRM tables that will replace Folk.

create table crm_organisations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  aliases text[] not null default '{}',
  domain text,
  industry text,
  employee_range text,
  description text,
  logo_asset_url text,
  enrichment_status text not null default 'needs_review',
  enrichment_source text,
  enriched_at timestamptz,
  source_system text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index crm_organisations_source_idx
  on crm_organisations (workspace_id, source_system, source_id)
  where source_id is not null;

create table crm_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  first_name text not null,
  last_name text not null,
  job_title text,
  primary_email text,
  phone text,
  linkedin_url text,
  headshot_asset_url text,
  organisation_id uuid references crm_organisations(id),
  contact_owner_id uuid,
  notes text,
  marketing_status text,
  source_system text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index crm_contacts_source_idx
  on crm_contacts (workspace_id, source_system, source_id)
  where source_id is not null;

create index crm_contacts_email_idx
  on crm_contacts (workspace_id, lower(primary_email));

create table crm_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  eventflow_event_id text not null,
  name text not null,
  branch text,
  event_date date,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, eventflow_event_id)
);

create table crm_event_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null references crm_events(id) on delete cascade,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  event_role text not null,
  is_moderator boolean not null default false,
  is_panelist boolean not null default false,
  event_status text,
  source text,
  owner_id uuid,
  workgroup text,
  diary_invite_sent_at timestamptz,
  event_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, contact_id)
);

create table crm_workgroup_participation (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  event_id uuid references crm_events(id) on delete set null,
  workgroup_name text not null,
  capacity text not null check (capacity in ('attended', 'facilitated')),
  historical_event_name text,
  participation_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_workgroup_participation_contact_idx
  on crm_workgroup_participation (workspace_id, contact_id, participation_date desc);

create table crm_speaker_prospects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null references crm_events(id) on delete cascade,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  stage text not null,
  topic text,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, contact_id)
);

create table crm_sponsor_directory (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  organisation_id uuid not null references crm_organisations(id) on delete cascade,
  relationship_status text not null default 'prospect'
    check (relationship_status in ('prospect', 'active_partner', 'previous_partner', 'do_not_contact')),
  category text,
  owner_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, organisation_id)
);

create table crm_sponsorships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid not null references crm_events(id) on delete cascade,
  organisation_id uuid not null references crm_organisations(id) on delete cascade,
  stage text not null,
  category text,
  owner_id uuid,
  probability integer check (probability between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, organisation_id)
);

create table crm_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contact_id uuid references crm_contacts(id) on delete cascade,
  organisation_id uuid references crm_organisations(id) on delete cascade,
  event_id uuid references crm_events(id) on delete cascade,
  activity_type text not null,
  subject text,
  body text,
  occurred_at timestamptz,
  due_at timestamptz,
  owner_id uuid,
  completed_at timestamptz,
  external_message_id text,
  created_at timestamptz not null default now()
);

create table crm_segments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid references crm_events(id) on delete cascade,
  name text not null,
  segment_type text not null,
  purpose text,
  rule jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm_task_audience_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  eventflow_event_id text not null,
  eventflow_task_id text not null,
  segment_id uuid references crm_segments(id) on delete cascade,
  contact_id uuid references crm_contacts(id) on delete cascade,
  organisation_id uuid references crm_organisations(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (segment_id is not null)::integer +
    (contact_id is not null)::integer +
    (organisation_id is not null)::integer = 1
  )
);

create table crm_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  left_contact_id uuid not null references crm_contacts(id) on delete cascade,
  right_contact_id uuid not null references crm_contacts(id) on delete cascade,
  confidence numeric,
  reasons jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table crm_import_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  source_system text not null,
  status text not null,
  cursor text,
  records_read integer not null default 0,
  records_written integer not null default 0,
  error_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table crm_mail_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null,
  provider text not null default 'microsoft',
  microsoft_tenant_id text not null,
  microsoft_account_id text not null,
  account_email text not null,
  refresh_token_secret_id text not null,
  granted_scopes text[] not null default '{}',
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, provider)
);

create table crm_mail_sync_state (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null,
  mail_connection_id uuid not null references crm_mail_connections(id) on delete cascade,
  folder_name text not null check (folder_name in ('inbox', 'sentitems')),
  delta_link text,
  auto_capture_contacts boolean not null default true,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mail_connection_id, folder_name)
);

create table crm_email_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  subject_template text not null,
  body_template text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid references crm_events(id) on delete cascade,
  segment_id uuid references crm_segments(id) on delete set null,
  name text not null,
  subject_template text not null,
  body_template text not null,
  sender_user_id uuid not null,
  sender_account_email text,
  status text not null default 'draft',
  step_count integer not null default 1,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm_email_recipients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  campaign_id uuid not null references crm_email_campaigns(id) on delete cascade,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  email_address text not null,
  personalised_subject text,
  personalised_body text,
  status text not null default 'pending',
  microsoft_message_id text,
  sent_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  unique (campaign_id, contact_id)
);

create index crm_email_recipients_status_idx
  on crm_email_recipients (campaign_id, status);

create table crm_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  event_id uuid references crm_events(id) on delete cascade,
  entity_type text not null check (entity_type in ('event', 'contact', 'organisation')),
  entity_id uuid,
  requested_fields text[] not null default '{}',
  status text not null default 'queued',
  provider_route text,
  attempt_count integer not null default 0,
  requested_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index crm_enrichment_jobs_queue_idx
  on crm_enrichment_jobs (workspace_id, status, created_at);

create table crm_enrichment_suggestions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  job_id uuid references crm_enrichment_jobs(id) on delete set null,
  entity_type text not null check (entity_type in ('contact', 'organisation')),
  entity_id uuid not null,
  field_name text not null,
  current_value jsonb,
  suggested_value jsonb not null,
  confidence numeric check (confidence between 0 and 100),
  provider text not null,
  source_label text,
  source_url text,
  observed_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'superseded')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index crm_enrichment_suggestions_review_idx
  on crm_enrichment_suggestions (workspace_id, status, entity_type, entity_id);

create table crm_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  entity_type text not null check (entity_type in ('contact', 'organisation')),
  entity_id uuid not null,
  asset_kind text not null check (asset_kind in ('headshot', 'logo', 'other')),
  storage_path text,
  original_source_url text,
  provider text,
  content_hash text,
  usage_notes text,
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected', 'archived')),
  observed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_assets_entity_idx
  on crm_assets (workspace_id, entity_type, entity_id, asset_kind, approval_status);
