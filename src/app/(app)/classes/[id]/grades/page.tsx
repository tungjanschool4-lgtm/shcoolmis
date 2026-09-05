import { createClient } from "@/lib/supabase/server";
import type { Student, Subject, SubjectScore, GradeCriterion } from "@/lib/types";
import GradesClient from "./GradesClient";

export default async function GradesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: subjects }, { data: students }, { data: scores }, { data: criteria }] =
    await Promise.all([
      supabase.from("subjects").select("*").eq("class_id", id).order("order_no"),
      supabase.from("students").select("*").eq("class_id", id).order("no"),
      supabase
        .from("subject_scores")
        .select("*, students!inner(class_id)")
        .eq("students.class_id", id),
      supabase.from("grade_criteria").select("*").order("sort"),
    ]);

  return (
    <GradesClient
      classId={id}
      subjects={(subjects as Subject[]) ?? []}
      students={(students as Student[]) ?? []}
      scores={(scores as SubjectScore[]) ?? []}
      criteria={(criteria as GradeCriterion[]) ?? []}
    />
  );
}
