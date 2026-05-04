# Track AI Engine Feedback Payload Table SQL Draft

## Status

This is a SQL draft only.

Do not execute this automatically.
Database changes must be applied manually through the Supabase SQL Editor.

No Supabase schema change has been applied yet.
No write adapter has been implemented yet.
The existing `track_ai_feedback_payloads` V2 flow remains unchanged.

## SQL draft

```sql
create table if not exists public.track_ai_feedback_payloads_engine (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  queue_id uuid not null,
  track_id uuid null,
  audio_hash text null,
  payload_schema text not null,
  payload jsonb not null,
  source text not null,
  engine_run_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint track_ai_feedback_payloads_engine_queue_id_key unique (queue_id),
  constraint track_ai_feedback_payloads_engine_payload_schema_check
    check (payload_schema = 'artist_feedback_payload'),
  constraint track_ai_feedback_payloads_engine_source_check
    check (source = 'analysis_engine_sidecar')
);

alter table public.track_ai_feedback_payloads_engine
  enable row level security;

revoke all on table public.track_ai_feedback_payloads_engine from anon;
revoke all on table public.track_ai_feedback_payloads_engine from authenticated;

grant all on table public.track_ai_feedback_payloads_engine to service_role;

create or replace function public.set_track_ai_feedback_payloads_engine_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_track_ai_feedback_payloads_engine_updated_at
on public.track_ai_feedback_payloads_engine;

create trigger set_track_ai_feedback_payloads_engine_updated_at
before update on public.track_ai_feedback_payloads_engine
for each row
execute function public.set_track_ai_feedback_payloads_engine_updated_at();
```
Notes

This draft intentionally does not add foreign keys.

Reason:

local Supabase schema/types do not currently document track_ai_feedback_payloads
the final relationship targets should be verified directly in Supabase before execution
this avoids guessing table names, cascade behavior, or constraint names
Not included yet

This draft does not include:

RLS policies
trigger for updated_at
foreign keys
indexes beyond the unique queue constraint
write adapter code
reader code
payload migration logic
Required before execution

Before running SQL in Supabase, verify:

whether gen_random_uuid() is available
exact queue table name and primary key
exact tracks table name and primary key, if track_id should later receive a foreign key
desired RLS policy model
whether service-role-only access is sufficient for this table

## RLS / access model decision

Planned access model:

- service-role-only
- no direct client access
- no user-facing RLS access path
- reads and writes should happen only through trusted server-side code

Reason:

- the payload contains detailed feedback data
- the existing feedback persistence path is server-controlled
- the future write adapter should keep the same trust boundary
- client access can be added later only if a dedicated reader contract requires it

Before SQL execution, the final RLS policy must be written explicitly for Supabase SQL Editor usage.

## Execution status

Executed manually in Supabase SQL Editor.

Confirmed:
- `public.track_ai_feedback_payloads_engine` exists.
- Row Level Security is enabled.
- Planned columns are present.
- Primary key, unique `queue_id`, `payload_schema`, and `source` constraints are present.
- `updated_at` trigger is present.

No write adapter, reader integration, UI integration, upload flow change, or OpenAI flow change has been implemented yet.
