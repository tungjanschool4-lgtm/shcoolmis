create table if not exists public.school_days (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  school_date date not null,
  term smallint not null check (term in (1, 2)),
  created_at timestamptz not null default now(),
  unique (class_id, school_date)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_day_id uuid not null references public.school_days(id) on delete cascade,
  status text not null default '' check (status in ('', '/', 'ข', 'ล')),
  updated_at timestamptz not null default now(),
  unique (student_id, school_day_id)
);

create index if not exists school_days_class_id_idx on public.school_days(class_id);
create index if not exists school_days_term_idx on public.school_days(class_id, term, school_date);
create index if not exists attendance_records_student_id_idx on public.attendance_records(student_id);
create index if not exists attendance_records_school_day_id_idx on public.attendance_records(school_day_id);

alter table public.school_days enable row level security;
alter table public.attendance_records enable row level security;

revoke all on table public.school_days from anon, authenticated;
revoke all on table public.attendance_records from anon, authenticated;
grant select, insert, update, delete on table public.school_days to authenticated;
grant select, insert, update, delete on table public.attendance_records to authenticated;
grant all on table public.school_days to service_role;
grant all on table public.attendance_records to service_role;

create policy school_days_select on public.school_days for select to authenticated
  using (public.owns_class(class_id));
create policy school_days_insert on public.school_days for insert to authenticated
  with check (public.owns_class(class_id));
create policy school_days_update on public.school_days for update to authenticated
  using (public.owns_class(class_id)) with check (public.owns_class(class_id));
create policy school_days_delete on public.school_days for delete to authenticated
  using (public.owns_class(class_id));

create policy attendance_records_select on public.attendance_records for select to authenticated
  using (public.owns_student(student_id));
create policy attendance_records_insert on public.attendance_records for insert to authenticated
  with check (
    public.owns_student(student_id)
    and exists (
      select 1 from public.students s, public.school_days d
      where s.id = student_id and d.id = school_day_id and s.class_id = d.class_id
    )
  );
create policy attendance_records_update on public.attendance_records for update to authenticated
  using (public.owns_student(student_id))
  with check (
    public.owns_student(student_id)
    and exists (
      select 1 from public.students s, public.school_days d
      where s.id = student_id and d.id = school_day_id and s.class_id = d.class_id
    )
  );
create policy attendance_records_delete on public.attendance_records for delete to authenticated
  using (public.owns_student(student_id));
