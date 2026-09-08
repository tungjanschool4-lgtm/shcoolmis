import { createClient } from "@/lib/supabase/server";
import type { GradeCriterion, Student, Subject, SubjectScore, TransferSubject, TransferSource } from "@/lib/types";
import TransferClient from "./TransferClient";

export default async function TransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: classroom } = await supabase.from("classes").select("school_id").eq("id", id).single();
  const [{ data: students }, { data: subjects }, { data: transferSubjects }, { data: transferSources }, { data: scores }, { data: criteria }] =
    await Promise.all([
      supabase.from("students").select("*").eq("class_id", id).order("no"),
      supabase.from("subjects").select("*").eq("class_id", id).order("order_no"),
      supabase.from("transfer_subjects").select("*").eq("class_id", id).order("order_no"),
      supabase
        .from("transfer_sources")
        .select("*, transfer_subjects!inner(class_id)")
        .eq("transfer_subjects.class_id", id),
      supabase
        .from("subject_scores")
        .select("*, subjects!inner(class_id)")
        .eq("subjects.class_id", id),
      supabase.from("grade_criteria").select("*").eq("school_id", classroom?.school_id ?? -1).order("sort"),
    ]);

  return (
    <TransferClient
      classId={id}
      students={(students as Student[]) ?? []}
      subjects={(subjects as Subject[]) ?? []}
      transferSubjects={(transferSubjects as TransferSubject[]) ?? []}
      transferSources={(transferSources as TransferSource[]) ?? []}
      scores={(scores as SubjectScore[]) ?? []}
      criteria={(criteria as GradeCriterion[]) ?? []}
    />
  );
}
