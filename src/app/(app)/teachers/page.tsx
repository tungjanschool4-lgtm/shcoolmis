import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import TeachersClient from "./TeachersClient";

export default async function TeachersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("role", { ascending: true })
    .order("username", { ascending: true });

  return <TeachersClient teachers={(data as Profile[]) ?? []} />;
}
