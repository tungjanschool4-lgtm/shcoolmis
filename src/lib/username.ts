export const LOGIN_DOMAIN = process.env.NEXT_PUBLIC_LOGIN_DOMAIN || "grade.local";

// แปลงชื่อผู้ใช้เป็นอีเมลสังเคราะห์ที่ใช้กับ Supabase Auth
export function usernameToEmail(username: string): string {
  const u = username.trim().toLowerCase();
  if (u.includes("@")) return u;
  return `${u}@${LOGIN_DOMAIN}`;
}
