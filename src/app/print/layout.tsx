import { requireProfile } from "@/lib/auth";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireProfile();
  return <div className="bg-slate-200 min-h-screen">{children}</div>;
}
