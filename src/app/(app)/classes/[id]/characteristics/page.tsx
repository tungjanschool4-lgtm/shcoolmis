import { createClient } from "@/lib/supabase/server";
import type { Student, AssessmentItem, AssessmentScore } from "@/lib/types";
import AssessmentClient from "@/components/AssessmentClient";

export default async function CharacteristicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: items }, { data: students }, { data: scores }] = await Promise.all([
    supabase.from("assessment_items").select("*").eq("class_id", id).eq("kind", "characteristic").order("no"),
    supabase.from("students").select("*").eq("class_id", id).order("no"),
    supabase.from("assessment_scores").select("*, students!inner(class_id)").eq("students.class_id", id),
  ]);

  const itemList = (items as AssessmentItem[]) ?? [];
  const itemIds = new Set(itemList.map((i) => i.id));
  const filteredScores = ((scores as AssessmentScore[]) ?? []).filter((s) => itemIds.has(s.item_id));

  return (
    <AssessmentClient
      title="คุณลักษณะอันพึงประสงค์"
      items={itemList}
      students={(students as Student[]) ?? []}
      scores={filteredScores}
    />
  );
}
