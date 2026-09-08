import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveSchool } from "@/lib/school-context";
import type { School } from "@/lib/types";
import SchoolsClient from "./SchoolsClient";

export default async function SchoolsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const [{ data }, activeSchool] = await Promise.all([
    supabase.from("school").select("*").order("id"),
    getActiveSchool(profile),
  ]);
  return <SchoolsClient schools={(data as School[]) ?? []} activeSchoolId={activeSchool?.id ?? null} />;
}

