import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { School, GradeCriterion } from "@/lib/types";
import SettingsClient from "./SettingsClient";
import { getActiveSchool } from "@/lib/school-context";

export default async function SettingsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const school = await getActiveSchool(profile);
  if (!school) return <div className="rounded-xl bg-amber-50 p-5 text-amber-800">กรุณาสร้างหรือเลือกโรงเรียนก่อน</div>;
  const { data: criteria } = await supabase
    .from("grade_criteria")
    .select("*")
    .eq("school_id", school.id)
    .order("sort", { ascending: true });

  return (
    <SettingsClient
      school={school as School}
      criteria={(criteria as GradeCriterion[]) ?? []}
    />
  );
}
