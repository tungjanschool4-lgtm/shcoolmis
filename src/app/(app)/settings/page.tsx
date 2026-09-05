import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { School, GradeCriterion } from "@/lib/types";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: school } = await supabase.from("school").select("*").eq("id", 1).single();
  const { data: criteria } = await supabase
    .from("grade_criteria")
    .select("*")
    .order("sort", { ascending: true });

  return (
    <SettingsClient
      school={school as School}
      criteria={(criteria as GradeCriterion[]) ?? []}
    />
  );
}
