-- Phase 4: subject competency-level rubric for curriculum 2568.
-- Safe to run more than once. The application seeds the 12 default rows
-- when a classroom opens this page for the first time.

create table if not exists public.subject_competency_levels (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  order_no integer not null default 1,
  subject_name text not null default '',
  competency_text text not null default '',
  beginner_text text not null default '',
  developing_text text not null default '',
  proficient_text text not null default '',
  expert_text text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists subject_competency_levels_class_order_idx
  on public.subject_competency_levels(class_id, order_no);

alter table public.subject_competency_levels enable row level security;

drop policy if exists subject_competency_levels_rw on public.subject_competency_levels;
create policy subject_competency_levels_rw
  on public.subject_competency_levels
  for all
  to authenticated
  using (public.owns_class(class_id))
  with check (public.owns_class(class_id));

grant select, insert, update, delete on public.subject_competency_levels to authenticated;
grant all on public.subject_competency_levels to service_role;
