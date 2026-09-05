"use client";

import { Fragment, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Student, Activity, ActivityResult } from "@/lib/types";
import { fullName } from "@/lib/types";

type Cell = Partial<ActivityResult> & { _dirty?: boolean };
const OPTIONS = ["", "ผ่าน", "ไม่ผ่าน"];

export default function ActivitiesClient({
  activities,
  students,
  results,
}: {
  classId: string;
  activities: Activity[];
  students: Student[];
  results: ActivityResult[];
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [map, setMap] = useState<Record<string, Record<string, Cell>>>(() => {
    const m: Record<string, Record<string, Cell>> = {};
    for (const r of results) {
      if (!m[r.student_id]) m[r.student_id] = {};
      m[r.student_id][r.activity_id] = { ...r };
    }
    return m;
  });

  function get(sid: string, aid: string): Cell {
    return map[sid]?.[aid] ?? {};
  }
  function setField(sid: string, aid: string, sem: "sem1_result" | "sem2_result", value: string) {
    setMap((prev) => {
      const row = { ...(prev[sid] ?? {}) };
      row[aid] = { ...(row[aid] ?? {}), [sem]: value, _dirty: true, student_id: sid, activity_id: aid };
      return { ...prev, [sid]: row };
    });
  }

  async function saveAll() {
    setSaving(true);
    setMsg(null);
    const payload: { student_id: string; activity_id: string; sem1_result: string; sem2_result: string }[] = [];
    for (const [sid, row] of Object.entries(map)) {
      for (const [aid, c] of Object.entries(row)) {
        if (c._dirty)
          payload.push({ student_id: sid, activity_id: aid, sem1_result: c.sem1_result ?? "", sem2_result: c.sem2_result ?? "" });
      }
    }
    if (!payload.length) { setSaving(false); return; }
    const { error } = await supabase.from("activity_results").upsert(payload, { onConflict: "student_id,activity_id" });
    setSaving(false);
    if (error) { setMsg("บันทึกไม่สำเร็จ: " + error.message); return; }
    setMap((prev) => {
      const copy: typeof prev = {};
      for (const [sid, row] of Object.entries(prev)) {
        copy[sid] = {};
        for (const [aid, c] of Object.entries(row)) copy[sid][aid] = { ...c, _dirty: false };
      }
      return copy;
    });
    setMsg("บันทึกแล้ว");
  }

  const dirtyCount = Object.values(map).reduce((a, r) => a + Object.values(r).filter((c) => c._dirty).length, 0);

  if (activities.length === 0) {
    return <div className="text-slate-400 py-10 text-center">ยังไม่มีกิจกรรม</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-slate-500">กิจกรรมพัฒนาผู้เรียน · ผลการประเมิน ผ่าน/ไม่ผ่าน</div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-sm text-slate-500">{msg}</span>}
          <button onClick={saveAll} disabled={saving || dirtyCount === 0} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "กำลังบันทึก..." : `บันทึก${dirtyCount ? ` (${dirtyCount})` : ""}`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="text-sm w-full" style={{ minWidth: 60 + 220 + activities.length * 160 }}>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 w-10" rowSpan={2}>ที่</th>
              <th className="px-2 py-2 text-left" rowSpan={2}>ชื่อ - นามสกุล</th>
              {activities.map((a) => (
                <th key={a.id} className="px-1 py-2 text-center border-l" colSpan={2}>{a.name}</th>
              ))}
            </tr>
            <tr className="text-xs">
              {activities.map((a) => (
                <Fragment key={a.id}>
                  <th className="px-1 py-1 border-l">ภาค 1</th>
                  <th className="px-1 py-1">ภาค 2</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((st) => {
              const rowDirty = Object.values(map[st.id] ?? {}).some((c) => c._dirty);
              return (
                <tr key={st.id} className={`border-t border-slate-100 ${rowDirty ? "bg-amber-50" : ""}`}>
                  <td className="px-1 py-1 text-center">{st.no}</td>
                  <td className="px-2 py-1 whitespace-nowrap">{fullName(st)}</td>
                  {activities.map((a) => {
                    const c = get(st.id, a.id);
                    return (
                      <Fragment key={a.id}>
                        <td className="px-1 py-1 border-l">
                          <select value={c.sem1_result ?? ""} onChange={(e) => setField(st.id, a.id, "sem1_result", e.target.value)} className="w-full rounded border border-slate-200 px-1 py-1">
                            {OPTIONS.map((o) => <option key={o} value={o}>{o || "-"}</option>)}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select value={c.sem2_result ?? ""} onChange={(e) => setField(st.id, a.id, "sem2_result", e.target.value)} className="w-full rounded border border-slate-200 px-1 py-1">
                            {OPTIONS.map((o) => <option key={o} value={o}>{o || "-"}</option>)}
                          </select>
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr><td colSpan={activities.length * 2 + 2} className="px-4 py-8 text-center text-slate-400">ยังไม่มีนักเรียน</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
