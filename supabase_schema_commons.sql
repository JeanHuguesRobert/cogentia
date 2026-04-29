-- Cogentia Commons MVP schema
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now()
);

create table if not exists cogentia_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  preferences jsonb default '{}'::jsonb,
  constraints jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create type epistemic_status as enum (
  'speculation','hypothesis','supported claim','established knowledge','contested claim','normative claim','empirical claim','metaphor','analogy','operational proposal'
);

create table if not exists theses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  core_question text not null,
  forbidden_confusions text[] default '{}',
  expected_audiences text[] default '{}',
  epistemic_status epistemic_status not null,
  created_at timestamptz default now()
);

create table if not exists premises (
  id uuid primary key default gen_random_uuid(), thesis_id uuid references theses(id) on delete cascade, content text not null);
create table if not exists references_cogentia (
  id uuid primary key default gen_random_uuid(), thesis_id uuid references theses(id) on delete cascade, citation text not null, url text);
create table if not exists constraints (
  id uuid primary key default gen_random_uuid(), thesis_id uuid references theses(id) on delete cascade, content text not null);
create table if not exists claims (
  id uuid primary key default gen_random_uuid(), thesis_id uuid references theses(id) on delete cascade, content text not null, status epistemic_status not null);
create table if not exists objections (
  id uuid primary key default gen_random_uuid(), claim_id uuid references claims(id) on delete cascade, content text not null, resolution text default 'unresolved');
create table if not exists revisions (
  id uuid primary key default gen_random_uuid(), thesis_id uuid references theses(id) on delete cascade, version_no int not null, summary text not null, created_at timestamptz default now());
create table if not exists agent_reviews (
  id uuid primary key default gen_random_uuid(), thesis_id uuid references theses(id) on delete cascade, agent_role text not null, review text not null);
create table if not exists artifacts (
  id uuid primary key default gen_random_uuid(), thesis_id uuid references theses(id) on delete cascade, artifact_type text not null, body_md text not null);
create table if not exists donation_signals (
  id uuid primary key default gen_random_uuid(), thesis_id uuid references theses(id) on delete cascade, amount_usd numeric(10,2) not null check (amount_usd>0), note text);
create table if not exists reputation_scores (
  id uuid primary key default gen_random_uuid(), user_id uuid references users(id), score numeric(8,2) not null default 0, rationale text);
create table if not exists deliberation_threads (
  id uuid primary key default gen_random_uuid(), thesis_id uuid references theses(id) on delete cascade, title text not null, created_at timestamptz default now());
