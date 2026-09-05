export type Role = "admin" | "teacher";

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  position: string;
  is_active: boolean;
  created_at: string;
};

export type School = {
  id: number;
  name: string;
  tambon: string;
  amphoe: string;
  province: string;
  area: string;
  academic_year: string;
  min_attendance_percent: number;
  start_date: string;
  approve_date: string;
  registrar_head: string;
  academic_head: string;
  director: string;
  director_position: string;
  logo_url: string;
  updated_at: string;
};

export type GradeCriterion = {
  id: string;
  min_score: number;
  grade_point: number;
  sort: number;
};

export type ClassRoom = {
  id: string;
  academic_year: string;
  grade_level: string;
  room: string;
  homeroom_teacher_id: string | null;
  homeroom_teacher_name: string;
  homeroom_teacher2_name: string;
  created_at: string;
};

export type Student = {
  id: string;
  class_id: string;
  no: number;
  student_code: string;
  national_id: string;
  prefix: string;
  first_name: string;
  last_name: string;
  gender: string;
  status: string;
  move_date: string;
  blood_type: string;
  birth_date: string;
  photo_url: string;
  created_at: string;
};

export type Subject = {
  id: string;
  class_id: string;
  order_no: number;
  category: string;
  name: string;
  code: string;
  hours: number;
  credits: number;
  midterm_max: number;
  final_max: number;
  competency_text: string;
  is_active: boolean;
  created_at: string;
};

export type SubjectScore = {
  id: string;
  student_id: string;
  subject_id: string;
  sem1_mid: number | null;
  sem1_final: number | null;
  sem2_mid: number | null;
  sem2_final: number | null;
  override_grade: number | null;
  updated_at: string;
};

export type TransferSubject = {
  id: string;
  class_id: string;
  order_no: number;
  category: string;
  code: string;
  name: string;
  credits: number;
  enabled: boolean;
  created_at: string;
};

export type TransferSource = {
  id: string;
  transfer_subject_id: string;
  subject_id: string;
};

export type AssessmentItem = {
  id: string;
  class_id: string;
  kind: "characteristic" | "read_write";
  no: number;
  title: string;
  max_score: number;
};

export type AssessmentScore = {
  id: string;
  student_id: string;
  item_id: string;
  sem1: number | null;
  sem2: number | null;
};

export type Activity = {
  id: string;
  class_id: string;
  order_no: number;
  code: string;
  name: string;
  hours: number;
};

export type ActivityResult = {
  id: string;
  student_id: string;
  activity_id: string;
  sem1_result: string;
  sem2_result: string;
};

export function fullName(s: Pick<Student, "prefix" | "first_name" | "last_name">): string {
  return `${s.prefix}${s.first_name}  ${s.last_name}`.trim();
}
