-- ============================================================================
-- Migration V2 : เพิ่มระบบเทียบโอน + การแก้ผลลัพธ์ (override เกรด)
-- รันไฟล์นี้เพิ่มเติมใน Supabase > SQL Editor (หลังจากเคยรัน schema.sql แล้ว)
-- ปลอดภัยต่อการรันซ้ำ (ใช้ if not exists / on conflict)
-- ============================================================================

-- 1) เพิ่มช่อง override เกรดรายวิชา (ถ้ากรอก จะใช้แทนเกรดที่ระบบคำนวณ)
alter table public.subject_scores
  add column if not exists override_grade numeric;

-- 2) วิชาปลายทางของการเทียบโอน (โครงสร้างเดิม) — ต่อห้อง
create table if not exists public.transfer_subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  order_no int not null default 1,
  category text not null default 'พื้นฐาน',
  code text not null default '',
  name text not null default '',
  credits numeric not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists transfer_subjects_class_idx on public.transfer_subjects(class_id);

-- 3) การจับคู่ : วิชาปลายทาง (เทียบโอน) <- วิชาต้นทาง (หลักสูตรใหม่ที่มีคะแนนจริง)
--    หนึ่งวิชาปลายทางมีต้นทางได้หลายวิชา (เทียบหลายวิชาเป็น 1)
create table if not exists public.transfer_sources (
  id uuid primary key default gen_random_uuid(),
  transfer_subject_id uuid not null references public.transfer_subjects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unique (transfer_subject_id, subject_id)
);

-- RLS
alter table public.transfer_subjects enable row level security;
alter table public.transfer_sources  enable row level security;

drop policy if exists ts_rw on public.transfer_subjects;
create policy ts_rw on public.transfer_subjects for all
  using (public.owns_class(class_id)) with check (public.owns_class(class_id));

-- transfer_sources อ้างสิทธิ์ผ่านวิชาปลายทาง
create or replace function public.owns_transfer_subject(tid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.transfer_subjects t
    join public.classes c on c.id = t.class_id
    where t.id = tid and c.homeroom_teacher_id = auth.uid()
  );
$$;

drop policy if exists tsrc_rw on public.transfer_sources;
create policy tsrc_rw on public.transfer_sources for all
  using (public.owns_transfer_subject(transfer_subject_id))
  with check (public.owns_transfer_subject(transfer_subject_id));
