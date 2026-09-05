"use server";

import { createClient } from "@/lib/supabase/server";

export type PasswordCheckResult = { ok: boolean; error?: string };

export async function verifyDeletePassword(password: string): Promise<PasswordCheckResult> {
  if (!password) return { ok: false, error: "กรุณากรอกรหัสผ่าน" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return { ok: false, error: "ไม่พบผู้ใช้ที่เข้าสู่ระบบ" };

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (error) return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };
  return { ok: true };
}
