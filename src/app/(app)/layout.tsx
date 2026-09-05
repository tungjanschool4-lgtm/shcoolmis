import { requireProfile } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen flex bg-slate-100">
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0 md:ml-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8 pt-16 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
