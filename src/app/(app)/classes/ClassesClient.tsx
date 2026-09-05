"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClassRoom, Profile } from "@/lib/types";
import { createClassRoom, deleteClassRoom } from "./actions";
import { usePasswordDelete } from "@/components/PasswordDeleteGuard";

export default function ClassesClient({
  profile,
  classes,
  counts,
  teachers,
}: {
  profile: Profile;
  classes: ClassRoom[];
  counts: Record<string, number>;
  teachers: Profile[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const isAdmin = profile.role === "admin";
  const { requestDelete, deletePasswordDialog } = usePasswordDelete();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await createClassRoom(new FormData(e.currentTarget));
    setBusy(false);
    if (res.ok) {
      setShowForm(false);
      router.refresh();
      if (res.id) router.push(`/classes/${res.id}`);
    } else {
      setMsg(res.error || "เกิดข้อผิดพลาด");
    }
  }

  function handleDelete(c: ClassRoom) {
    requestDelete({
      title: "ยืนยันการลบห้องเรียน",
      description: `ลบห้อง ${c.grade_level} ${c.room}? ข้อมูลนักเรียนและคะแนนทั้งหมดจะถูกลบด้วย`,
      onVerified: async () => {
        const res = await deleteClassRoom(c.id);
        if (res.ok) router.refresh();
        else setMsg(res.error!);
      },
    });
  }

  return (
    <div className="space-y-5">
      {deletePasswordDialog}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">ห้องเรียน</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            {showForm ? "ปิด" : "+ สร้างห้องเรียน"}
          </button>
        )}
      </div>

      {msg && <div className="rounded-lg bg-red-50 text-red-700 px-4 py-2.5 text-sm">{msg}</div>}

      {showForm && isAdmin && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 grid sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ปีการศึกษา</label>
            <input name="academic_year" defaultValue="2568" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ระดับชั้น *</label>
            <input
              name="grade_level"
              required
              placeholder="เช่น ประถมศึกษาปีที่ 6"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ห้องที่</label>
            <input name="room" placeholder="เช่น 1" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ครูประจำชั้น (บัญชีผู้ใช้)</label>
            <select name="homeroom_teacher_id" className="w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="">— ไม่ระบุ —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.username} ({t.username})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ชื่อครูประจำชั้น (แสดงในรายงาน)
            </label>
            <input
              name="homeroom_teacher_name"
              placeholder="เช่น นางโสภิตรา จิตชู"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ครูประจำชั้นคนที่ 2 (ถ้ามี)</label>
            <input name="homeroom_teacher2_name" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="seed" defaultChecked className="rounded" />
            เติมรายวิชา 12 วิชา + กิจกรรม + หัวข้อประเมิน มาตรฐาน ป.6 ให้อัตโนมัติ
          </label>
          <div className="sm:col-span-2">
            <button
              disabled={busy}
              className="rounded-lg bg-indigo-600 text-white px-5 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "กำลังสร้าง..." : "สร้างห้องเรียน"}
            </button>
          </div>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col">
            <Link href={`/classes/${c.id}`} className="flex-1">
              <div className="text-lg font-bold text-slate-800">
                {c.grade_level} {c.room && `ห้อง ${c.room}`}
              </div>
              <div className="text-sm text-slate-500 mt-1">ปีการศึกษา {c.academic_year || "-"}</div>
              <div className="text-sm text-slate-500">ครูประจำชั้น: {c.homeroom_teacher_name || "-"}</div>
              <div className="mt-3 inline-block bg-sky-50 text-sky-700 rounded-full px-3 py-1 text-xs">
                นักเรียน {counts[c.id] || 0} คน
              </div>
            </Link>
            <div className="mt-4 flex gap-3 text-sm">
              <Link href={`/classes/${c.id}`} className="text-indigo-600 hover:underline">
                เปิด →
              </Link>
              {isAdmin && (
                <button onClick={() => handleDelete(c)} className="text-rose-600 hover:underline ml-auto">
                  ลบ
                </button>
              )}
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-12">
            ยังไม่มีห้องเรียน {isAdmin && "— กดปุ่มสร้างห้องเรียนเพื่อเริ่มต้น"}
          </div>
        )}
      </div>
    </div>
  );
}
