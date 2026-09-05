import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClassRoom, Profile } from "@/lib/types";
import ClassesClient from "./ClassesClient";

export default async function ClassesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .order("academic_year", { ascending: false })
    .order("grade_level", { ascending: true })
    .order("room", { ascending: true });

  // นับจำนวนนักเรียนต่อห้อง
  const list = (classes as ClassRoom[]) ?? [];
  const counts: Record<string, number> = {};
  if (list.length) {
    const { data: students } = await supabase.from("students").select("class_id");
    for (const s of (students as { class_id: string }[]) ?? []) {
      counts[s.class_id] = (counts[s.class_id] || 0) + 1;
    }
  }

  let teachers: Profile[] = [];
  if (profile.role === "admin") {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    teachers = (data as Profile[]) ?? [];
  }

  return (
    <ClassesClient
      profile={profile}
      classes={list}
      counts={counts}
      teachers={teachers}
    />
  );
}
