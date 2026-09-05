"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ClassRoom } from "@/lib/types";

export default function ClassOverview({
  cls,
  studentCount,
  subjectCount,
}: {
  cls: ClassRoom;
  studentCount: number;
  subjectCount: number;
}) {
  const supabase = createClient();
  const [t1, setT1] = useState(cls.homeroom_teacher_name);
  const [t2, setT2] = useState(cls.homeroom_teacher2_name);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("classes")
      .update({ homeroom_teacher_name: t1, homeroom_teacher2_name: t2 })
      .eq("id", cls.id);
    setSaving(false);
    setMsg(error ? "บันทึกไม่สำเร็จ (สิทธิ์ไม่พอ)" : "บันทึกแล้ว");
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href={`/classes/${cls.id}/students`} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-slate-800">{studentCount}</div>
          <div className="text-sm text-slate-500">นักเรียน</div>
        </Link>
        <Link href={`/classes/${cls.id}/subjects`} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-slate-800">{subjectCount}</div>
          <div className="text-sm text-slate-500">รายวิชา 2568</div>
        </Link>
        <Link href={`/classes/${cls.id}/grades`} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="text-2xl">✍️</div>
          <div className="text-sm text-slate-500 mt-1">กรอกคะแนน</div>
        </Link>
        <Link href={`/classes/${cls.id}/reports`} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="text-2xl">🖨️</div>
          <div className="text-sm text-slate-500 mt-1">พิมพ์รายงาน</div>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 max-w-lg">
        <h2 className="font-semibold text-slate-800 mb-4">ครูประจำชั้น (แสดงในรายงาน)</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">ครูประจำชั้นคนที่ 1</label>
            <input value={t1} onChange={(e) => setT1(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">ครูประจำชั้นคนที่ 2 (ถ้ามี)</label>
            <input value={t2} onChange={(e) => setT2(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-indigo-600 text-white px-5 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              บันทึก
            </button>
            {msg && <span className="text-sm text-slate-500">{msg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
