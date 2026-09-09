alter table public.students
  add column if not exists expected_basic_level text not null default 'ชำนาญ',
  add column if not exists expected_applied_level text not null default 'ชำนาญ',
  add column if not exists expected_activity_level text not null default 'ผ่าน',
  add column if not exists expected_characteristic_level text not null default 'กำหนด',
  add column if not exists expected_competency_level text not null default 'กำหนด';
