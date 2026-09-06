import { createClient } from "@/lib/supabase/server";
import type { Student, AssessmentItem, AssessmentScore, Subject } from "@/lib/types";
import AssessmentClient from "@/components/AssessmentClient";
import YearCompetencyPanel from "@/components/YearCompetencyPanel";
import { qualityLabelsFromSchool } from "@/lib/grading";
import type { School } from "@/lib/types";

export default async function ReadWritePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: items }, { data: students }, { data: scores }, { data: school }, { data: subjects }] = await Promise.all([
    supabase.from("assessment_items").select("*").eq("class_id", id).eq("kind", "read_write").order("no"),
    supabase.from("students").select("*").eq("class_id", id).order("no"),
    supabase.from("assessment_scores").select("*, students!inner(class_id)").eq("students.class_id", id),
    supabase.from("school").select("*").eq("id", 1).single(),
    supabase.from("subjects").select("*").eq("class_id", id).eq("is_active", true).order("order_no"),
  ]);

  const itemList = (items as AssessmentItem[]) ?? [];
  const itemIds = new Set(itemList.map((i) => i.id));
  const filteredScores = ((scores as AssessmentScore[]) ?? []).filter((s) => itemIds.has(s.item_id));

  return (
    <div className="space-y-6">
      <AssessmentClient
        title="การอ่าน คิดวิเคราะห์ และเขียนสื่อความ"
        items={itemList}
        students={(students as Student[]) ?? []}
        scores={filteredScores}
        qualityLabels={qualityLabelsFromSchool(school as School)}
        classId={id}
        kind="read_write"
      />
      <YearCompetencyPanel subjects={(subjects as Subject[]) ?? []} />
    </div>
  );
}
