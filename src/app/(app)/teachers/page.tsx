import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import TeachersClient from "./TeachersClient";
import { getActiveSchool } from "@/lib/school-context";

export default async function TeachersPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const activeSchool = await getActiveSchool(profile);
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("school_id", activeSchool?.id ?? -1)
    .order("role", { ascending: true })
    .order("username", { ascending: true });

  return <TeachersClient teachers={(data as Profile[]) ?? []} />;
}
