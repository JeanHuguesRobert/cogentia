-- KYS-RC #206: expand Cogentigram dimension storage beyond rank 73.
-- Apply through the controlled database migration workflow, NOT on app build.
-- Source/raw capture and human annotations remain separate contract objects.
begin;
alter table public.analyses
  alter column conversation_url drop not null;
alter table public.indicator_scores
  drop constraint if exists indicator_scores_rank_check;
alter table public.indicator_scores
  add constraint indicator_scores_rank_positive check (rank > 0);
alter table public.indicator_scores
  add column if not exists dimension_id text;
alter table public.indicator_scores
  add column if not exists measurement jsonb;
alter table public.indicator_scores
  alter column confidence drop not null;
alter table public.indicator_scores
  alter column score_type set default 'qualitative';
-- Existing historical measurements receive stable names but are NOT rewritten.
update public.indicator_scores
set dimension_id = 'COG-' || lpad(rank::text, 3, '0')
where dimension_id is null;
alter table public.indicator_scores
  alter column dimension_id set not null;
create unique index if not exists indicator_scores_analysis_dimension_unique
  on public.indicator_scores(analysis_id, dimension_id);
comment on table public.indicator_scores is
  'Extensible, first-class dimensions; score may be null with qualitative evidence.';
commit;
