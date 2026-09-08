-- รองรับหลายโรงเรียน (สูงสุด 20 โรงเรียน)
-- รันไฟล์นี้หนึ่งครั้งใน Supabase SQL Editor ก่อนใช้เมนู "จัดการโรงเรียน"

alter table public.school drop constraint if exists school_id_check;
create sequence if not exists public.school_id_seq;
select setval('public.school_id_seq', greatest(coalesce((select max(id) from public.school), 1), 1));
alter table public.school alter column id set default nextval('public.school_id_seq');
alter sequence public.school_id_seq owned by public.school.id;

create or replace function public.enforce_school_limit()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.school) >= 20 then
    raise exception 'สร้างโรงเรียนได้สูงสุด 20 โรงเรียน';
  end if;
  return new;
end;
$$;
drop trigger if exists school_limit_20 on public.school;
create trigger school_limit_20 before insert on public.school
for each row execute function public.enforce_school_limit();

alter table public.profiles add column if not exists school_id int references public.school(id) on delete restrict;
alter table public.classes add column if not exists school_id int references public.school(id) on delete restrict;
alter table public.grade_criteria add column if not exists school_id int references public.school(id) on delete cascade;

update public.profiles set school_id = 1 where school_id is null and role = 'teacher';
update public.classes set school_id = 1 where school_id is null;
update public.grade_criteria set school_id = 1 where school_id is null;

alter table public.classes alter column school_id set not null;
alter table public.grade_criteria alter column school_id set not null;
create index if not exists classes_school_idx on public.classes(school_id);
create index if not exists profiles_school_idx on public.profiles(school_id);
create index if not exists grade_criteria_school_idx on public.grade_criteria(school_id);

create or replace function public.user_school_id()
returns int language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid() and is_active;
$$;

drop policy if exists classes_read on public.classes;
create policy classes_read on public.classes for select
  using (public.is_admin() or school_id = public.user_school_id());

drop policy if exists gc_read on public.grade_criteria;
create policy gc_read on public.grade_criteria for select
  using (public.is_admin() or school_id = public.user_school_id());

drop policy if exists school_read on public.school;
create policy school_read on public.school for select
  using (public.is_admin() or id = public.user_school_id());

