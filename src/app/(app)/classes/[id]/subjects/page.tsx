import { createClient } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";
import SubjectsClient from "./SubjectsClient";

export default async function SubjectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("*")
    .eq("class_id", id)
    .order("order_no", { ascending: true });

  return <SubjectsClient classId={id} initial={(data as Subject[]) ?? []} />;
}
