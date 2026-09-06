-- Phase 5: configurable quality-level labels
-- Safe to run repeatedly on existing projects.

alter table public.school
  add column if not exists quality_excellent_label text not null default 'ดีเยี่ยม',
  add column if not exists quality_good_label text not null default 'ดี',
  add column if not exists quality_pass_label text not null default 'ผ่าน',
  add column if not exists quality_fail_label text not null default 'ไม่ผ่าน';
