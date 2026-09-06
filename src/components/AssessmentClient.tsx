"use client";

import { Fragment, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Student, AssessmentItem, AssessmentScore } from "@/lib/types";
import { fullName } from "@/lib/types";
import { itemsAverage, qualityLevel, type QualityLabels } from "@/lib/grading";

type Cell = Partial<AssessmentScore> & { _dirty?: boolean };

export default function AssessmentClient({
  title,
  items,
  students,
  scores,
  qualityLabels,
}: {
  title: string;
  items: AssessmentItem[];
  students: Student[];
  scores: AssessmentScore[];
  qualityLabels: QualityLabels;
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // map[studentId][itemId] = {sem1, sem2}
  const [map, setMap] = useState<Record<string, Record<string, Cell>>>(() => {
    const m: Record<string, Record<string, Cell>> = {};
    for (const s of scores) {
      if (!m[s.student_id]) m[s.student_id] = {};
      m[s.student_id][s.item_id] = { ...s };
    }
    return m;
  });

  function get(studentId: string, itemId: string): Cell {
    return map[studentId]?.[itemId] ?? {};
  }

  function setField(studentId: string, itemId: string, sem: "sem1" | "sem2", value: string) {
    const num = value === "" ? null : Number(value);
    setMap((prev) => {
      const row = { ...(prev[studentId] ?? {}) };
      row[itemId] = { ...(row[itemId] ?? {}), [sem]: num, _dirty: true, student_id: studentId, item_id: itemId };
      return { ...prev, [studentId]: row };
    });
  }

  async function saveAll() {
    setSaving(true);
    setMsg(null);
    const payload: {
      student_id: string;
      item_id: string;
      sem1: number | null;
      sem2: number | null;
    }[] = [];
    for (const [studentId, row] of Object.entries(map)) {
      for (const [itemId, cell] of Object.entries(row)) {
        if (cell._dirty) {
          payload.push({
            student_id: studentId,
            item_id: itemId,
            sem1: cell.sem1 ?? null,
            sem2: cell.sem2 ?? null,
          });
        }
      }
    }
    if (payload.length === 0) { setSaving(false); return; }
    const { error } = await supabase
      .from("assessment_scores")
      .upsert(payload, { onConflict: "student_id,item_id" });
    setSaving(false);
    if (error) { setMsg("บันทึกไม่สำเร็จ: " + error.message); return; }
    setMap((prev) => {
      const copy: typeof prev = {};
      for (const [sid, row] of Object.entries(prev)) {
        copy[sid] = {};
        for (const [iid, cell] of Object.entries(row)) copy[sid][iid] = { ...cell, _dirty: false };
      }
      return copy;
    });
    setMsg("บันทึกแล้ว");
  }

  const dirtyCount = Object.values(map).reduce(
    (acc, row) => acc + Object.values(row).filter((c) => c._dirty).length,
    0
  );

  if (items.length === 0) {
    return <div className="text-slate-400 py-10 text-center">ยังไม่มีหัวข้อประเมิน</div>;
  }

  function studentAvg(studentId: string, sem: "sem1" | "sem2"): number | null {
    return itemsAverage(items.map((it) => get(studentId, it.id)[sem] ?? null));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-slate-700">{title}</div>
          <div className="text-xs text-slate-400">แต่ละข้อให้คะแนน 0–3 (แยกภาคเรียนที่ 1 / 2)</div>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-sm text-slate-500">{msg}</span>}
          <button
            onClick={saveAll}
            disabled={saving || dirtyCount === 0}
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : `บันทึก${dirtyCount ? ` (${dirtyCount})` : ""}`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="text-sm w-full" style={{ minWidth: 120 + items.length * 90 + 200 }}>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 w-10" rowSpan={2}>ที่</th>
              <th className="px-2 py-2 text-left" rowSpan={2}>ชื่อ - นามสกุล</th>
              {items.map((it) => (
                <th key={it.id} className="px-1 py-2 text-center border-l" colSpan={2} title={it.title}>
                  ข้อ {it.no}
                </th>
              ))}
              <th className="px-2 py-2 text-center border-l" rowSpan={2}>สรุป</th>
            </tr>
            <tr className="text-xs">
              {items.map((it) => (
                <Fragment key={it.id}>
                  <th className="px-1 py-1 border-l">1</th>
                  <th className="px-1 py-1">2</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((st) => {
              const a1 = studentAvg(st.id, "sem1");
              const a2 = studentAvg(st.id, "sem2");
              const overall = itemsAverage([a1, a2]);
              const rowDirty = Object.values(map[st.id] ?? {}).some((c) => c._dirty);
              return (
                <tr key={st.id} className={`border-t border-slate-100 ${rowDirty ? "bg-amber-50" : ""}`}>
                  <td className="px-1 py-1 text-center">{st.no}</td>
                  <td className="px-2 py-1 whitespace-nowrap">{fullName(st)}</td>
                  {items.map((it) => {
                    const c = get(st.id, it.id);
                    return (
                      <Fragment key={it.id}>
                        <td className="px-1 py-1 border-l">
                          <input type="number" min={0} max={it.max_score} value={c.sem1 ?? ""} onChange={(e) => setField(st.id, it.id, "sem1", e.target.value)} className="w-11 rounded border border-slate-200 px-1 py-1 text-center" />
                        </td>
                        <td className="px-1 py-1">
                          <input type="number" min={0} max={it.max_score} value={c.sem2 ?? ""} onChange={(e) => setField(st.id, it.id, "sem2", e.target.value)} className="w-11 rounded border border-slate-200 px-1 py-1 text-center" />
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className="px-2 py-1 text-center border-l whitespace-nowrap font-medium text-indigo-700">
                    {qualityLevel(overall, qualityLabels) || "-"}
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr><td colSpan={items.length * 2 + 3} className="px-4 py-8 text-center text-slate-400">ยังไม่มีนักเรียน</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-400">
        เกณฑ์สรุป: เฉลี่ย ≥ 2.5 = {qualityLabels.excellent}, ≥ 1.5 = {qualityLabels.good}, ≥ 1.0 = {qualityLabels.pass}, ต่ำกว่านั้น = {qualityLabels.fail}
      </div>
    </div>
  );
}
