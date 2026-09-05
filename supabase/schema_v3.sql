-- Phase 3: student competencies for curriculum 2568
-- Safe to run repeatedly on existing projects.

alter table public.assessment_items
  drop constraint if exists assessment_items_kind_check;

alter table public.assessment_items
  add constraint assessment_items_kind_check
  check (kind in ('characteristic', 'read_write', 'competency'));

insert into public.assessment_items (class_id, kind, no, title, max_score)
select c.id, 'competency', v.no, v.title, 3
from public.classes c
cross join (values
  (1, 'การจัดการตนเอง'),
  (2, 'การคิดขั้นสูง'),
  (3, 'การสื่อสาร'),
  (4, 'การรวมพลังทำงานเป็นทีม'),
  (5, 'การเป็นพลเมืองที่เข้มแข็ง'),
  (6, 'การอยู่ร่วมกับธรรมชาติและวิทยาการอย่างยั่งยืน')
) as v(no, title)
on conflict (class_id, kind, no) do nothing;
