import { createClient } from "@/lib/supabase/server";
import type { Student, AssessmentItem, AssessmentScore } from "@/lib/types";
import AssessmentClient from "@/components/AssessmentClient";
import { qualityLabelsFromSchool } from "@/lib/grading";
import type { School } from "@/lib/types";

export default async function CompetenciesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: items }, { data: students }, { data: scores }, { data: school }] = await Promise.all([
    supabase.from("assessment_items").select("*").eq("class_id", id).eq("kind", "competency").order("no"),
    supabase.from("students").select("*").eq("class_id", id).order("no"),
    supabase.from("assessment_scores").select("*, students!inner(class_id)").eq("students.class_id", id),
    supabase.from("school").select("*").eq("id", 1).single(),
  ]);

  const itemList = (items as AssessmentItem[]) ?? [];
  const itemIds = new Set(itemList.map((item) => item.id));
  const filteredScores = ((scores as AssessmentScore[]) ?? []).filter((score) => itemIds.has(score.item_id));

  return (
    <AssessmentClient
      title="บันทึกสมรรถนะของผู้เรียน"
      items={itemList}
      students={(students as Student[]) ?? []}
      scores={filteredScores}
      qualityLabels={qualityLabelsFromSchool(school as School)}
    />
  );
}
