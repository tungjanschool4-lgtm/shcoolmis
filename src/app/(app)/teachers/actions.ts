"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/username";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่ได้เข้าสู่ระบบ");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!data || data.role !== "admin") throw new Error("ต้องเป็นผู้ดูแลระบบ");
  return user.id;
}

export type ActionResult = { ok: boolean; error?: string };

export async function createTeacher(formData: FormData): Promise<ActionResult> {
  try {
    await assertAdmin();
    const username = String(formData.get("username") || "").trim().toLowerCase();
    const full_name = String(formData.get("full_name") || "").trim();
    const position = String(formData.get("position") || "").trim();
    const password = String(formData.get("password") || "");
    const role = String(formData.get("role") || "teacher");

    if (!username || !password) return { ok: false, error: "กรอกชื่อผู้ใช้และรหัสผ่าน" };
    if (password.length < 6) return { ok: false, error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" };
    if (!/^[a-z0-9._-]+$/.test(username))
      return { ok: false, error: "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ -" };

    const admin = createAdminClient();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message || "";
      if (msg.includes("registered")) return { ok: false, error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };
      return { ok: false, error: "สร้างบัญชีไม่สำเร็จ: " + msg };
    }

    const { error: profErr } = await admin.from("profiles").insert({
      id: created.user.id,
      username,
      full_name,
      position,
      role: role === "admin" ? "admin" : "teacher",
    });
    if (profErr) {
      // ย้อนกลับหากบันทึกโปรไฟล์ไม่สำเร็จ
      await admin.auth.admin.deleteUser(created.user.id);
      return { ok: false, error: "บันทึกข้อมูลครูไม่สำเร็จ: " + profErr.message };
    }

    revalidatePath("/teachers");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function resetPassword(userId: string, newPassword: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (newPassword.length < 6) return { ok: false, error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" };
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function setActive(userId: string, isActive: boolean): Promise<ActionResult> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update({ is_active: isActive }).eq("id", userId);
    if (error) return { ok: false, error: error.message };
    // ปิดการเข้าสู่ระบบด้วยการ ban ผู้ใช้
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: isActive ? "none" : "876000h",
    });
    revalidatePath("/teachers");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteTeacher(userId: string): Promise<ActionResult> {
  try {
    const adminId = await assertAdmin();
    if (userId === adminId) return { ok: false, error: "ลบบัญชีตัวเองไม่ได้" };
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/teachers");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
