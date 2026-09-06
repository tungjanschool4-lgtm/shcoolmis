-- Phase 6: configurable assessment quality thresholds
-- Safe to run repeatedly on existing projects.

alter table public.school
  add column if not exists quality_excellent_min numeric not null default 2.5,
  add column if not exists quality_good_min numeric not null default 1.5,
  add column if not exists quality_pass_min numeric not null default 1.0;

alter table public.school drop constraint if exists school_quality_thresholds_check;
alter table public.school add constraint school_quality_thresholds_check check (
  quality_pass_min >= 0 and
  quality_good_min > quality_pass_min and
  quality_excellent_min > quality_good_min and
  quality_excellent_min <= 3
);
