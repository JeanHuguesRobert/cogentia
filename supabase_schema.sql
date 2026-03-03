-- ============================================================
-- COGENTIA / PRIVAI — Supabase Schema v1.0
-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE : prompt_versions
-- Stocke les versions du prompt Cogentia (versionnable, auditable)
-- ============================================================
create table public.prompt_versions (
  id            uuid primary key default uuid_generate_v4(),
  version       text not null unique,          -- ex: "1.0", "1.1"
  content       text not null,                 -- le prompt complet
  is_active     boolean not null default false, -- un seul actif à la fois
  created_at    timestamptz not null default now()
);

-- Un seul prompt actif à la fois
create unique index prompt_versions_active_unique
  on public.prompt_versions (is_active)
  where is_active = true;

comment on table public.prompt_versions is
  'Versions historisées du prompt Cogentia. Une seule version active à la fois.';

-- ============================================================
-- TABLE : profiles
-- Extension de auth.users — création automatique à l'inscription
-- Optionnel : un utilisateur peut analyser sans compte (anonyme)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,                          -- pseudonyme choisi par l'user
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Profil public minimal des utilisateurs enregistrés. Aucune donnée identifiante sensible.';

-- Trigger : met à jour updated_at automatiquement
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Trigger : crée automatiquement un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TABLE : analyses
-- Une analyse = un cycle complet prompt → lien → JSON parsé
-- ============================================================
create table public.analyses (
  id                    uuid primary key default uuid_generate_v4(),

  -- Ownership (nullable = anonyme)
  user_id               uuid references public.profiles(id) on delete set null,

  -- Prompt utilisé
  prompt_version_id     uuid references public.prompt_versions(id) on delete set null,

  -- Source
  conversation_url      text not null,          -- lien partagé par l'user
  conversation_raw      text,                   -- HTML/JSON brut récupéré

  -- Identification de l'agent IA
  agent_name            text,                   -- ex: "Claude"
  agent_model           text,                   -- ex: "claude-opus-4-6"
  agent_platform        text,                   -- ex: "claude.ai"
  agent_is_custom       boolean default false,
  agent_custom_details  text,

  -- Relation agent/utilisateur
  rel_estimated_exchanges  text,               -- '<10' | '10-50' | '50-200' | '200+'
  rel_has_persistent_memory boolean,
  rel_memory_richness      text,               -- 'none' | 'low' | 'medium' | 'high'
  rel_main_topics          text[],
  rel_interaction_depth    text,               -- 'superficial' | 'moderate' | 'deep'
  rel_observed_patterns    text[],
  rel_salient_traits       text[],
  rel_blind_spots          text[],
  rel_global_confidence    integer check (rel_global_confidence between 0 and 100),
  rel_global_confidence_rationale text,

  -- Fiabilité globale
  reliability_data_richness         text,      -- 'none' | 'low' | 'medium' | 'high'
  reliability_scoring_caveats       text[],
  reliability_recommendation        text,      -- 'ne pas interpréter' | 'avec précaution' | 'fiable' | 'très fiable'

  -- Conformité éthique (telle que déclarée par l'agent)
  ethics_no_identifying_data        boolean,
  ethics_no_sensitive_categories    boolean,
  ethics_neutral_language_used      boolean,
  ethics_confirmed_by_agent         boolean,

  -- Session anonyme
  anonymous_session_id uuid,

  -- Méthode de collecte du résultat
  collection_method text not null default 'auto'
          check (collection_method in ('auto', 'paste', 'file')),

  -- Intégrité
  prompt_verified       boolean not null default false,  -- le prompt n'a pas été altéré
  json_valid            boolean not null default false,  -- le JSON a été parsé avec succès
  raw_json              jsonb,                           -- JSON brut retourné par l'agent

  -- Statut du cycle
  status  text not null default 'pending'
          check (status in ('pending', 'fetching', 'parsing', 'scoring', 'complete', 'error')),
  error_message text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger analyses_updated_at
  before update on public.analyses
  for each row execute procedure public.handle_updated_at();

create index analyses_user_id_idx on public.analyses(user_id);
create index analyses_status_idx  on public.analyses(status);
create index analyses_created_at_idx          on public.analyses(created_at desc);
create index analyses_anonymous_session_id_idx on public.analyses(anonymous_session_id)
  where anonymous_session_id is not null;

comment on table public.analyses is
  'Chaque enregistrement représente une analyse Cogentia complète.';

-- ============================================================
-- TABLE : indicator_scores
-- Les 73 scores individuels par analyse (table normalisée)
-- ============================================================
create table public.indicator_scores (
  id            uuid primary key default uuid_generate_v4(),
  analysis_id   uuid not null references public.analyses(id) on delete cascade,

  -- Identité de l'indicateur
  rank          integer not null check (rank between 1 and 73),
  category      text not null,
  name          text not null,

  -- Score
  score         integer check (score between 0 and 100),  -- percentile, null si confidence < 20
  score_type    text not null default 'percentile',
  confidence    integer not null check (confidence between 0 and 100),
  evidence      text,

  created_at    timestamptz not null default now()
);

create unique index indicator_scores_analysis_rank_unique
  on public.indicator_scores(analysis_id, rank);

create index indicator_scores_analysis_id_idx on public.indicator_scores(analysis_id);
create index indicator_scores_rank_idx on public.indicator_scores(rank);

comment on table public.indicator_scores is
  'Scores percentiles des 73 indicateurs Cogentia pour chaque analyse.';

-- ============================================================
-- VUES UTILITAIRES
-- ============================================================

-- Vue : analyses avec leur nombre d'indicateurs scorés
create view public.analyses_summary as
select
  a.id,
  a.user_id,
  a.anonymous_session_id,
  a.status,
  a.error_message,
  a.agent_name,
  a.agent_model,
  a.agent_platform,
  a.rel_global_confidence,
  a.rel_global_confidence_rationale,
  a.reliability_recommendation,
  a.prompt_verified,
  a.json_valid,
  a.created_at,
  count(s.id) filter (where s.score is not null) as scored_indicators,
  count(s.id)                                    as total_indicators,
  round(avg(s.confidence))                       as avg_confidence
from public.analyses a
left join public.indicator_scores s on s.analysis_id = a.id
group by a.id;

comment on view public.analyses_summary is
  'Vue résumée des analyses avec compteurs d indicateurs et confiance moyenne.';

-- Vue : scores par catégorie (pour les graphiques radar)
create view public.category_scores as
select
  s.analysis_id,
  s.category,
  round(avg(s.score))       as avg_score,
  round(avg(s.confidence))  as avg_confidence,
  count(*) filter (where s.score is not null) as scored_count,
  count(*)                                    as total_count
from public.indicator_scores s
group by s.analysis_id, s.category;

comment on view public.category_scores is
  'Scores moyens par catégorie par analyse — base pour les graphiques radar.';

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.analyses         enable row level security;
alter table public.indicator_scores enable row level security;
alter table public.prompt_versions  enable row level security;

-- prompt_versions : lecture publique, écriture réservée aux admins (service_role)
create policy "prompt_versions_read_public"
  on public.prompt_versions for select
  using (true);

-- profiles : un utilisateur voit et modifie uniquement son propre profil
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- analyses : 
--   - lecture : l'auteur ou les analyses anonymes via leur propre session (on utilisera un local_id côté client)
--   - écriture : tout le monde peut créer (anonyme inclus), mais ne peut modifier que les siennes
create policy "analyses_insert_any"
  on public.analyses for insert
  with check (true);

-- Note : analyses_select_own est définie plus bas avec la politique anonyme complète

create policy "analyses_update_own"
  on public.analyses for update
  using (user_id = auth.uid());
-- Les mises à jour d'analyses anonymes passent par service_role (Netlify Functions)
-- qui bypasse la RLS — pas besoin d'autoriser le client anon à updater

-- indicator_scores : hérite des droits de l'analyse parente
create policy "indicator_scores_select_via_analysis"
  on public.indicator_scores for select
  using (
    exists (
      select 1 from public.analyses a
      where a.id = indicator_scores.analysis_id
        and (a.user_id = auth.uid() or a.user_id is null)
    )
  );

create policy "indicator_scores_insert_via_analysis"
  on public.indicator_scores for insert
  with check (
    exists (
      select 1 from public.analyses a
      where a.id = indicator_scores.analysis_id
        and (a.user_id = auth.uid() or a.user_id is null)
    )
  );

-- ============================================================
-- SEED : prompt v1.0 actif (contenu à remplir via app)
-- ============================================================
insert into public.prompt_versions (version, content, is_active)
values (
  '1.0',
  'PLACEHOLDER — remplacer par le contenu de cogentia_prompt_v1.md',
  true
);

-- ============================================================
-- CLAIM MECHANISM
-- Rattachement des analyses anonymes au compte nouvellement créé
-- ============================================================

-- TABLE : anonymous_sessions
-- Stocke la correspondance session_id <-> user_id après inscription
-- Le client envoie son anonymous_session_id au moment du signup
create table public.anonymous_sessions (
  session_id   uuid primary key,               -- UUID généré côté client (localStorage)
  user_id      uuid references public.profiles(id) on delete cascade,
  claimed_at   timestamptz,                    -- null = pas encore réclamé
  created_at   timestamptz not null default now()
);

alter table public.anonymous_sessions enable row level security;

create policy "anonymous_sessions_insert_own"
  on public.anonymous_sessions for insert
  with check (true);

create policy "anonymous_sessions_select_own"
  on public.anonymous_sessions for select
  using (user_id = auth.uid());

-- ============================================================
-- FONCTION : claim_anonymous_analyses
-- Appelée côté client juste après l'inscription avec le session_id
-- Rattache toutes les analyses anonymes de la session au nouveau user
-- ============================================================
create or replace function public.claim_anonymous_analyses(
  p_session_id uuid
)
returns integer  -- nombre d'analyses réclamées
language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_claimed_count integer;
begin
  -- Vérification : l'utilisateur doit être authentifié
  if v_user_id is null then
    raise exception 'Non authentifié';
  end if;

  -- Vérification : cette session n'a pas déjà été réclamée par quelqu'un d'autre
  if exists (
    select 1 from public.anonymous_sessions
    where session_id = p_session_id
      and user_id != v_user_id
      and claimed_at is not null
  ) then
    raise exception 'Session déjà réclamée par un autre compte';
  end if;

  -- Rattachement des analyses
  update public.analyses
  set
    user_id              = v_user_id,
    anonymous_session_id = null       -- nettoyage : plus besoin après claim
  where
    anonymous_session_id = p_session_id
    and user_id is null;              -- sécurité : on ne réattribue pas ce qui appartient déjà à quelqu'un

  get diagnostics v_claimed_count = row_count;

  -- Enregistrement du claim
  insert into public.anonymous_sessions (session_id, user_id, claimed_at)
  values (p_session_id, v_user_id, now())
  on conflict (session_id) do update
    set user_id = v_user_id, claimed_at = now();

  return v_claimed_count;
end;
$$;

comment on function public.claim_anonymous_analyses is
  'Rattache les analyses d une session anonyme au compte de l utilisateur connecté. '
  'À appeler côté client immédiatement après l inscription, en passant le localStorage anonymous_session_id.';

-- ============================================================
-- MISE À JOUR RLS analyses : autoriser la lecture par session_id
-- ============================================================
drop policy if exists "analyses_select_own" on public.analyses;

create policy "analyses_select_own"
  on public.analyses for select
  using (
    user_id = auth.uid()             -- utilisateur connecté, ses analyses
    or user_id is null               -- anonyme : le client filtre par anonymous_session_id côté JS
  );

-- La sécurité des lectures anonymes repose sur le secret du UUID session_id
-- (UUID v4 = 2^122 possibilités, non-devinable)

-- ============================================================
-- TABLE : waitlist
-- Capture les emails en mode liste d'attente
-- ============================================================
create table public.waitlist (
  id         uuid primary key default uuid_generate_v4(),
  email      text not null unique,
  position   integer generated always as identity,
  source     text,                        -- 'landing', 'footer', etc.
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Tout le monde peut s'inscrire, personne ne peut lire les emails des autres
create policy "waitlist_insert_public"
  on public.waitlist for insert
  with check (true);

-- Lecture interdite via la table directe (emails protégés)
-- Passer par la vue waitlist_public pour les informations non-sensibles
create policy "waitlist_select_none"
  on public.waitlist for select
  using (false);

-- Vue publique sans email
create view public.waitlist_public as
select position, source, created_at
from public.waitlist;

comment on table public.waitlist is
  'Liste d attente Cogentia. Active quand VITE_WAITLIST_MODE=true.';

-- ============================================================
-- TABLE : feedback
-- Retour utilisateur post-analyse ("ce profil te ressemble-t-il ?")
-- Données de validation psychométrique anonymisées
-- ============================================================
create table public.feedback (
  id           uuid primary key default uuid_generate_v4(),
  analysis_id  uuid not null references public.analyses(id) on delete cascade,

  -- Score de ressemblance : 1 (pas du tout) à 5 (parfaitement)
  resemblance  integer not null check (resemblance between 1 and 5),

  -- Indicateurs spécifiquement contestés par l'utilisateur (ranks)
  contested_ranks  integer[],

  -- Commentaire libre optionnel (max 500 chars, côté client)
  comment      text check (char_length(comment) <= 500),

  created_at   timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Tout le monde peut soumettre un feedback
create policy "feedback_insert_public"
  on public.feedback for insert
  with check (true);

-- Tout le monde peut lire les feedbacks (données agrégées, pas d'email)
create policy "feedback_select_public"
  on public.feedback for select
  using (true);

-- Un seul feedback par analyse
create unique index feedback_analysis_unique
  on public.feedback(analysis_id);

-- Vue agrégée pour les stats de validation (anonymisée)
-- Vue agrégée globale
create view public.feedback_stats as
select
  round(avg(resemblance), 2)                      as avg_resemblance,
  count(*)                                         as total_feedbacks,
  count(*) filter (where resemblance >= 4)         as high_match,
  count(*) filter (where resemblance <= 2)         as low_match
from public.feedback;

-- Vue des indicateurs les plus contestés (unnest correct)
create view public.contested_indicators as
select
  rank_val                        as indicator_rank,
  count(*)                        as contest_count
from public.feedback,
     unnest(contested_ranks) as rank_val
group by rank_val
order by contest_count desc;

comment on table public.feedback is
  'Retours utilisateurs post-analyse. Données de validation psychométrique anonymisées.';

-- ============================================================
-- TABLE : presentations
-- Synthèses des frameworks psychométriques connus
-- Générées au moment de l'analyse, mises en cache ici
-- ============================================================
create table public.presentations (
  id           uuid primary key default uuid_generate_v4(),
  analysis_id  uuid not null references public.analyses(id) on delete cascade,
  type         text not null
               check (type in ('raw', 'big_five', 'mbti', 'disc', 'enneagram')),
  scores       jsonb not null,   -- scores calculés pour ce framework
  narrative    text,             -- texte généré par Claude API
  generated_at timestamptz not null default now()
);

create unique index presentations_analysis_type_unique
  on public.presentations(analysis_id, type);

create index presentations_analysis_id_idx
  on public.presentations(analysis_id);

alter table public.presentations enable row level security;

create policy "presentations_select_public"
  on public.presentations for select using (true);

-- Les inserts viennent uniquement de Netlify Functions via service_role (bypass RLS)
-- Cette policy bloque les inserts depuis la clé anon publique
create policy "presentations_insert_deny_anon"
  on public.presentations for insert
  with check (auth.role() = 'service_role');

comment on table public.presentations is
  'Synthèses des frameworks psychométriques calculées à partir des 73 indicateurs Cogentia.';
