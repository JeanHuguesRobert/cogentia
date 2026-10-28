-- Waitlist v2: explicit consent, private rank access, and self-service withdrawal.
-- No payment, referral, or contribution based priority is implemented here.
-- This is intentionally a minimal operational record, not a Packet projection;
-- future campaign/contribution data must be modeled separately from this rank.
create table if not exists public.waitlist (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  email text not null unique,
  position integer generated always as identity,
  source text,
  recovery_token_hash text,
  consent_at timestamptz,
  consent_version text,
  created_at timestamptz not null default pg_catalog.now()
);

alter table public.waitlist
  add column if not exists recovery_token_hash text,
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text;

do $migration$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.waitlist'::regclass and conname = 'waitlist_recovery_token_hash_format') then
    alter table public.waitlist add constraint waitlist_recovery_token_hash_format
      check (recovery_token_hash is null or recovery_token_hash ~ '^[0-9a-f]{64}$');
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.waitlist'::regclass and conname = 'waitlist_consent_pair') then
    alter table public.waitlist add constraint waitlist_consent_pair
      check ((consent_at is null) = (consent_version is null));
  end if;
end;
$migration$;

create unique index if not exists waitlist_recovery_token_hash_unique
  on public.waitlist (recovery_token_hash)
  where recovery_token_hash is not null;

drop policy if exists "waitlist_insert_public" on public.waitlist;
drop policy if exists "waitlist_select_none" on public.waitlist;
alter table public.waitlist enable row level security;
revoke all on table public.waitlist from public, anon, authenticated;
drop view if exists public.waitlist_public;

create schema if not exists cogentia_private;
revoke all on schema cogentia_private from public, anon, authenticated;
grant usage on schema cogentia_private to anon, authenticated, service_role;

create table if not exists cogentia_private.waitlist_events (
  id bigint generated always as identity primary key,
  waitlist_id uuid not null references public.waitlist(id) on delete cascade,
  event_type text not null check (event_type in (
    'registered', 'reconsented', 'position_checked',
    'email_sent', 'email_delivered', 'email_bounced', 'email_received'
  )),
  source text check (source is null or source ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'),
  campaign text check (campaign is null or campaign ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'),
  occurred_at timestamptz not null default pg_catalog.now()
);
alter table cogentia_private.waitlist_events enable row level security;
create index if not exists waitlist_events_lead_time_idx
  on cogentia_private.waitlist_events (waitlist_id, occurred_at desc);
create index if not exists waitlist_events_type_time_idx
  on cogentia_private.waitlist_events (event_type, occurred_at desc);

create or replace function cogentia_private.join_waitlist_core(
  p_email text, p_token_hash text, p_consent_version text, p_source text, p_campaign text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_source text := nullif(pg_catalog.left(pg_catalog.regexp_replace(pg_catalog.btrim(p_source), '[^A-Za-z0-9._-]', '', 'g'), 80), '');
  v_campaign text := nullif(pg_catalog.left(pg_catalog.regexp_replace(pg_catalog.btrim(p_campaign), '[^A-Za-z0-9._-]', '', 'g'), 80), '');
  v_existing public.waitlist%rowtype;
  v_position bigint;
begin
  if v_email is null or pg_catalog.char_length(v_email) > 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email syntax' using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid recovery token' using errcode = '22023';
  end if;
  if p_consent_version is distinct from '2026-10-28-v2' then
    raise exception 'Unsupported consent version' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));
  select * into v_existing from public.waitlist w where w.recovery_token_hash = p_token_hash;
  if found then
    if pg_catalog.lower(pg_catalog.btrim(v_existing.email)) = v_email and v_existing.consent_at is not null then
      select pg_catalog.count(*) into v_position from public.waitlist w
      where w.consent_at is not null and (w.created_at, w.id) <= (v_existing.created_at, v_existing.id);
      insert into cogentia_private.waitlist_events (waitlist_id, event_type, source, campaign)
      values (v_existing.id, 'position_checked', v_source, v_campaign);
      return pg_catalog.jsonb_build_object('status', 'known', 'position', v_position);
    end if;
    return pg_catalog.jsonb_build_object('status', 'duplicate');
  end if;

  select * into v_existing from public.waitlist w
  where pg_catalog.lower(pg_catalog.btrim(w.email)) = v_email
  order by w.created_at, w.id
  limit 1
  for update;
  if found then
    if v_existing.consent_at is not null then
      return pg_catalog.jsonb_build_object('status', 'duplicate');
    end if;
    -- Legacy rows from the old form had no recorded consent or private rank token.
    -- Reuse the row only after this explicit new consent and start its rank now.
    update public.waitlist
      set recovery_token_hash = p_token_hash,
          consent_at = pg_catalog.now(),
          consent_version = p_consent_version,
          created_at = pg_catalog.now()
      where id = v_existing.id
      returning * into v_existing;
    select pg_catalog.count(*) into v_position from public.waitlist w
    where w.consent_at is not null and (w.created_at, w.id) <= (v_existing.created_at, v_existing.id);
    insert into cogentia_private.waitlist_events (waitlist_id, event_type, source, campaign)
    values (v_existing.id, 'reconsented', v_source, v_campaign);
    return pg_catalog.jsonb_build_object('status', 'reconsented', 'position', v_position);
  end if;

  insert into public.waitlist (email, recovery_token_hash, consent_at, consent_version)
  values (v_email, p_token_hash, pg_catalog.now(), p_consent_version)
  returning * into v_existing;
  select pg_catalog.count(*) into v_position from public.waitlist w
  where w.consent_at is not null and (w.created_at, w.id) <= (v_existing.created_at, v_existing.id);
  insert into cogentia_private.waitlist_events (waitlist_id, event_type, source, campaign)
  values (v_existing.id, 'registered', v_source, v_campaign);
  return pg_catalog.jsonb_build_object('status', 'joined', 'position', v_position);
end;
$function$;

create or replace function public.join_waitlist(
  p_email text, p_token_hash text, p_consent_version text,
  p_source text default null, p_campaign text default null
)
returns jsonb language sql security invoker set search_path = ''
as $function$
  select cogentia_private.join_waitlist_core(p_email, p_token_hash, p_consent_version, p_source, p_campaign)
$function$;

create or replace function cogentia_private.get_waitlist_position_core(p_token_hash text, p_source text, p_campaign text)
returns bigint language plpgsql security definer set search_path = ''
as $function$
declare
  v_target public.waitlist%rowtype;
  v_position bigint;
  v_source text := nullif(pg_catalog.left(pg_catalog.regexp_replace(pg_catalog.btrim(p_source), '[^A-Za-z0-9._-]', '', 'g'), 80), '');
  v_campaign text := nullif(pg_catalog.left(pg_catalog.regexp_replace(pg_catalog.btrim(p_campaign), '[^A-Za-z0-9._-]', '', 'g'), 80), '');
begin
  select * into v_target from public.waitlist w
  where w.recovery_token_hash = p_token_hash and w.consent_at is not null;
  if not found then return null; end if;
  select pg_catalog.count(*) into v_position from public.waitlist earlier
  where earlier.consent_at is not null
    and (earlier.created_at, earlier.id) <= (v_target.created_at, v_target.id);
  insert into cogentia_private.waitlist_events (waitlist_id, event_type, source, campaign)
  values (v_target.id, 'position_checked', v_source, v_campaign);
  return v_position;
end;
$function$;

create or replace function public.get_waitlist_position(p_token_hash text, p_source text default null, p_campaign text default null)
returns bigint language sql security invoker set search_path = ''
as $function$
  select cogentia_private.get_waitlist_position_core(p_token_hash, p_source, p_campaign)
$function$;

create or replace function cogentia_private.record_waitlist_mail_event_core(
  p_waitlist_id uuid, p_event_type text, p_from_email text, p_occurred_at timestamptz
)
returns void language plpgsql security definer set search_path = ''
as $function$
begin
  if p_event_type not in ('email_sent', 'email_delivered', 'email_bounced', 'email_received') then
    raise exception 'Invalid waitlist email event' using errcode = '22023';
  end if;
  insert into cogentia_private.waitlist_events (waitlist_id, event_type, occurred_at)
  select w.id, p_event_type, coalesce(p_occurred_at, pg_catalog.now())
  from public.waitlist w
  where w.id = p_waitlist_id and w.consent_at is not null
    and (p_event_type <> 'email_received' or pg_catalog.lower(w.email) = pg_catalog.lower(pg_catalog.btrim(p_from_email)));
  if not found then raise exception 'Waitlist entry not found' using errcode = 'P0002'; end if;
end;
$function$;

create or replace function public.record_waitlist_mail_event(
  p_waitlist_id uuid, p_event_type text, p_from_email text default null,
  p_occurred_at timestamptz default null
)
returns void language sql security invoker set search_path = ''
as $function$
  select cogentia_private.record_waitlist_mail_event_core(p_waitlist_id, p_event_type, p_from_email, p_occurred_at)
$function$;

create or replace function cogentia_private.leave_waitlist_core(p_token_hash text)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare v_deleted integer;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  delete from public.waitlist where recovery_token_hash = p_token_hash and consent_at is not null;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$function$;

create or replace function public.leave_waitlist(p_token_hash text)
returns boolean language sql security invoker set search_path = ''
as $function$
  select cogentia_private.leave_waitlist_core(p_token_hash)
$function$;

revoke all on table cogentia_private.waitlist_events from public, anon, authenticated, service_role;
revoke all on function cogentia_private.join_waitlist_core(text, text, text, text, text) from public, anon, authenticated;
revoke all on function cogentia_private.get_waitlist_position_core(text, text, text) from public, anon, authenticated;
revoke all on function cogentia_private.leave_waitlist_core(text) from public, anon, authenticated;
revoke all on function cogentia_private.record_waitlist_mail_event_core(uuid, text, text, timestamptz) from public, anon, authenticated, service_role;
grant execute on function cogentia_private.join_waitlist_core(text, text, text, text, text) to anon, authenticated;
grant execute on function cogentia_private.get_waitlist_position_core(text, text, text) to anon, authenticated;
grant execute on function cogentia_private.leave_waitlist_core(text) to anon, authenticated;
grant execute on function cogentia_private.record_waitlist_mail_event_core(uuid, text, text, timestamptz) to service_role;
revoke all on function public.join_waitlist(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.get_waitlist_position(text, text, text) from public, anon, authenticated;
revoke all on function public.leave_waitlist(text) from public, anon, authenticated;
revoke all on function public.record_waitlist_mail_event(uuid, text, text, timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.join_waitlist(text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_waitlist_position(text, text, text) to anon, authenticated;
grant execute on function public.leave_waitlist(text) to anon, authenticated;
grant execute on function public.record_waitlist_mail_event(uuid, text, text, timestamptz) to service_role;

comment on function public.join_waitlist(text, text, text, text, text) is
  'Registers a consented email without exposing the waitlist table; accepts only the current consent text version.';
comment on function public.get_waitlist_position(text, text, text) is
  'Returns only the current chronological position for a random browser-held recovery token hash.';
comment on function public.leave_waitlist(text) is
  'Deletes the consented waitlist row associated with a browser-held recovery token hash.';

create or replace function cogentia_private.purge_expired_waitlist_core()
returns integer
language plpgsql security definer set search_path = ''
as $function$
declare
  v_deleted integer;
begin
  delete from public.waitlist w
  where coalesce(
    (select pg_catalog.max(e.occurred_at)
     from cogentia_private.waitlist_events e
     where e.waitlist_id = w.id
       and e.event_type in ('registered', 'reconsented', 'position_checked', 'email_received')),
    w.created_at
  ) < pg_catalog.now() - interval '3 years';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function cogentia_private.purge_expired_waitlist_core() from public, anon, authenticated, service_role;
grant execute on function cogentia_private.purge_expired_waitlist_core() to postgres;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $schedule$
begin
  if not exists (select 1 from cron.job where jobname = 'cogentia_waitlist_retention') then
    perform cron.schedule(
      'cogentia_waitlist_retention',
      '25 2 * * *',
      'select cogentia_private.purge_expired_waitlist_core()'
    );
  end if;
end;
$schedule$;
