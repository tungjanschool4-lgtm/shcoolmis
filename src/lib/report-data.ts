import { createClient } from "@/lib/supabase/server";
import type {
  School,
  ClassRoom,
  Student,
  Subject,
  SubjectScore,
  GradeCriterion,
  AssessmentItem,
  AssessmentScore,
  Activity,
  ActivityResult,
  TransferSubject,
  TransferSource,
  SubjectCompetencyLevel,
} from "@/lib/types";

export type ClassBundle = {
  school: School | null;
  cls: ClassRoom | null;
  students: Student[];
  subjects: Subject[];
  subjectScores: SubjectScore[];
  criteria: GradeCriterion[];
  items: AssessmentItem[];
  assessmentScores: AssessmentScore[];
  activities: Activity[];
  activityResults: ActivityResult[];
  transferSubjects: TransferSubject[];
  transferSources: TransferSource[];
  subjectCompetencyLevels: SubjectCompetencyLevel[];
};

export async function loadClassBundle(classId: string): Promise<ClassBundle> {
  const supabase = await createClient();
  const { data: classRow } = await supabase.from("classes").select("*").eq("id", classId).single();
  const cls = (classRow as ClassRoom | null) ?? null;
  const schoolId = cls?.school_id ?? -1;

  const [
    { data: school },
    { data: students },
    { data: subjects },
    { data: subjectScores },
    { data: criteria },
    { data: items },
    { data: assessmentScores },
    { data: activities },
    { data: activityResults },
    { data: transferSubjects },
    { data: transferSources },
    { data: subjectCompetencyLevels },
  ] = await Promise.all([
    supabase.from("school").select("*").eq("id", schoolId).single(),
    supabase.from("students").select("*").eq("class_id", classId).order("no"),
    supabase.from("subjects").select("*").eq("class_id", classId).order("order_no"),
    supabase.from("subject_scores").select("*, students!inner(class_id)").eq("students.class_id", classId),
    supabase.from("grade_criteria").select("*").eq("school_id", schoolId).order("sort"),
    supabase.from("assessment_items").select("*").eq("class_id", classId).order("no"),
    supabase.from("assessment_scores").select("*, students!inner(class_id)").eq("students.class_id", classId),
    supabase.from("activities").select("*").eq("class_id", classId).order("order_no"),
    supabase.from("activity_results").select("*, students!inner(class_id)").eq("students.class_id", classId),
    supabase.from("transfer_subjects").select("*").eq("class_id", classId).order("order_no"),
    supabase.from("transfer_sources").select("*, transfer_subjects!inner(class_id)").eq("transfer_subjects.class_id", classId),
    supabase.from("subject_competency_levels").select("*").eq("class_id", classId).order("order_no"),
  ]);

  return {
    school: (school as School) ?? null,
    cls,
    students: (students as Student[]) ?? [],
    subjects: (subjects as Subject[]) ?? [],
    subjectScores: (subjectScores as SubjectScore[]) ?? [],
    criteria: (criteria as GradeCriterion[]) ?? [],
    items: (items as AssessmentItem[]) ?? [],
    assessmentScores: (assessmentScores as AssessmentScore[]) ?? [],
    activities: (activities as Activity[]) ?? [],
    activityResults: (activityResults as ActivityResult[]) ?? [],
    transferSubjects: (transferSubjects as TransferSubject[]) ?? [],
    transferSources: (transferSources as TransferSource[]) ?? [],
    subjectCompetencyLevels: (subjectCompetencyLevels as SubjectCompetencyLevel[]) ?? [],
  };
}
