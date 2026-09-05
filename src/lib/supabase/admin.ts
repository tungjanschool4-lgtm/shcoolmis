import { createClient } from "@supabase/supabase-js";

// ไคลเอนต์สิทธิ์สูง (service_role) — ใช้เฉพาะฝั่ง server เท่านั้น! ห้าม import ในไฟล์ client
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
