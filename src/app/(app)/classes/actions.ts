"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import {
  SUBJECT_TEMPLATE,
  TRANSFER_SUBJECT_TEMPLATE,
  ACTIVITY_TEMPLATE,
  CHARACTERISTIC_TEMPLATE,
  READ_WRITE_TEMPLATE,
} from "@/lib/template";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: boolean; error?: string; id?: string };

export async function createClassRoom(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { ok: false, error: "ต้องเป็นผู้ดูแลระบบ" };

  const supabase = await createClient();
  const academic_year = String(formData.get("academic_year") || "").trim();
  const grade_level = String(formData.get("grade_level") || "").trim();
  const room = String(formData.get("room") || "").trim();
  const homeroom_teacher_id = String(formData.get("homeroom_teacher_id") || "").trim() || null;
  const homeroom_teacher_name = String(formData.get("homeroom_teacher_name") || "").trim();
  const homeroom_teacher2_name = String(formData.get("homeroom_teacher2_name") || "").trim();
  const seed = formData.get("seed") === "on";

  if (!grade_level) return { ok: false, error: "กรุณาระบุระดับชั้น" };

  const { data: cls, error } = await supabase
    .from("classes")
    .insert({
      academic_year,
      grade_level,
      room,
      homeroom_teacher_id,
      homeroom_teacher_name,
      homeroom_teacher2_name,
    })
    .select("id")
    .single();

  if (error || !cls) return { ok: false, error: error?.message || "สร้างห้องไม่สำเร็จ" };
  const classId = cls.id as string;

  if (seed) {
    // วิชา (ต้นทาง) — ดึง id กลับมาเพื่อจับคู่เทียบโอน
    const { data: insertedSubjects } = await supabase
      .from("subjects")
      .insert(SUBJECT_TEMPLATE.map((t) => ({ ...t, class_id: classId })))
      .select("id, order_no");

    // วิชาเทียบโอน (ปลายทาง)
    const { data: insertedTransfer } = await supabase
      .from("transfer_subjects")
      .insert(TRANSFER_SUBJECT_TEMPLATE.map((t) => ({ ...t, class_id: classId })))
      .select("id, order_no");

    // จับคู่ 1:1 ตาม order_no
    if (insertedSubjects && insertedTransfer) {
      const subjByOrder = new Map(insertedSubjects.map((s) => [s.order_no, s.id]));
      const links = insertedTransfer
        .map((t) => {
          const subjectId = subjByOrder.get(t.order_no);
          return subjectId ? { transfer_subject_id: t.id, subject_id: subjectId } : null;
        })
        .filter((x): x is { transfer_subject_id: string; subject_id: string } => x !== null);
      if (links.length) await supabase.from("transfer_sources").insert(links);
    }

    await supabase.from("activities").insert(
      ACTIVITY_TEMPLATE.map((t) => ({ ...t, class_id: classId }))
    );
    const items = [
      ...CHARACTERISTIC_TEMPLATE.map((title, i) => ({
        class_id: classId,
        kind: "characteristic" as const,
        no: i + 1,
        title,
        max_score: 3,
      })),
      ...READ_WRITE_TEMPLATE.map((title, i) => ({
        class_id: classId,
        kind: "read_write" as const,
        no: i + 1,
        title,
        max_score: 3,
      })),
    ];
    await supabase.from("assessment_items").insert(items);
  }

  revalidatePath("/classes");
  return { ok: true, id: classId };
}

export async function deleteClassRoom(classId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { ok: false, error: "ต้องเป็นผู้ดูแลระบบ" };
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/classes");
  return { ok: true };
}
