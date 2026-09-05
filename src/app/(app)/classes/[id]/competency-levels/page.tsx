import { createClient } from "@/lib/supabase/server";
import { SUBJECT_COMPETENCY_TEMPLATE } from "@/lib/subject-competency-template";
import type { SubjectCompetencyLevel } from "@/lib/types";
import CompetencyLevelsClient from "./CompetencyLevelsClient";

export default async function CompetencyLevelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("subject_competency_levels")
    .select("*")
    .eq("class_id", id)
    .order("order_no", { ascending: true });

  let rows = (data as SubjectCompetencyLevel[]) ?? [];
  if (rows.length === 0) {
    const { data: seeded } = await supabase
      .from("subject_competency_levels")
      .insert(SUBJECT_COMPETENCY_TEMPLATE.map((row) => ({ ...row, class_id: id })))
      .select("*")
      .order("order_no", { ascending: true });
    rows = (seeded as SubjectCompetencyLevel[]) ?? [];
  }

  return <CompetencyLevelsClient classId={id} initial={rows} />;
}
