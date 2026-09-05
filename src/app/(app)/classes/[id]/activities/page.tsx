import { createClient } from "@/lib/supabase/server";
import type { Student, Activity, ActivityResult } from "@/lib/types";
import ActivitiesClient from "./ActivitiesClient";

export default async function ActivitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: activities }, { data: students }, { data: results }] = await Promise.all([
    supabase.from("activities").select("*").eq("class_id", id).order("order_no"),
    supabase.from("students").select("*").eq("class_id", id).order("no"),
    supabase.from("activity_results").select("*, students!inner(class_id)").eq("students.class_id", id),
  ]);

  return (
    <ActivitiesClient
      classId={id}
      activities={(activities as Activity[]) ?? []}
      students={(students as Student[]) ?? []}
      results={(results as ActivityResult[]) ?? []}
    />
  );
}
