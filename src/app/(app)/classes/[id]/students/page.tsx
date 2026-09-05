import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";
import StudentsClient from "./StudentsClient";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("*")
    .eq("class_id", id)
    .order("no", { ascending: true });

  return <StudentsClient classId={id} initial={(data as Student[]) ?? []} />;
}
