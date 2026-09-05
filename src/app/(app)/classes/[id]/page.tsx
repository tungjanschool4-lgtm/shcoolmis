import { createClient } from "@/lib/supabase/server";
import type { ClassRoom } from "@/lib/types";
import ClassOverview from "./ClassOverview";

export default async function ClassOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cls } = await supabase.from("classes").select("*").eq("id", id).single();

  const { count: studentCount } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("class_id", id);
  const { count: subjectCount } = await supabase
    .from("subjects")
    .select("*", { count: "exact", head: true })
    .eq("class_id", id);

  return (
    <ClassOverview
      cls={cls as ClassRoom}
      studentCount={studentCount ?? 0}
      subjectCount={subjectCount ?? 0}
    />
  );
}
