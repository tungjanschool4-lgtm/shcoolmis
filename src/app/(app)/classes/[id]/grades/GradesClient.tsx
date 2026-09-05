"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Student, Subject, SubjectScore, GradeCriterion } from "@/lib/types";
import { fullName } from "@/lib/types";
import { computeSubjectResult, gradeText } from "@/lib/grading";

type ScoreMap = Record<string, Partial<SubjectScore> & { _dirty?: boolean }>;

export default function GradesClient({
  subjects,
  students,
  scores,
  criteria,
}: {
  classId: string;
  subjects: Subject[];
  students: Student[];
  scores: SubjectScore[];
  criteria: GradeCriterion[];
}) {
  const supabase = createClient();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // map[subjectId][studentId] = score
  const [map, setMap] = useState<Record<string, ScoreMap>>(() => {
    const m: Record<string, ScoreMap> = {};
    for (const s of scores) {
      if (!m[s.subject_id]) m[s.subject_id] = {};
      m[s.subject_id][s.student_id] = { ...s };
    }
    return m;
  });

  const subject = subjects.find((s) => s.id === subjectId);

  function getScore(studentId: string): Partial<SubjectScore> & { _dirty?: boolean } {
    return map[subjectId]?.[studentId] ?? {};
  }

  function setField(studentId: string, field: keyof SubjectScore, value: string) {
    const num = value === "" ? null : Number(value);
    setMap((prev) => {
      const sub = { ...(prev[subjectId] ?? {}) };
      sub[studentId] = { ...(sub[studentId] ?? {}), [field]: num, _dirty: true, student_id: studentId, subject_id: subjectId };
      return { ...prev, [subjectId]: sub };
    });
  }

  async function saveAll() {
    if (!subject) return;
    setSaving(true);
    setMsg(null);
    const sub = map[subjectId] ?? {};
    const dirty = Object.entries(sub).filter(([, v]) => v._dirty);
    const payload = dirty.map(([studentId, v]) => ({
      student_id: studentId,
      subject_id: subjectId,
      sem1_mid: v.sem1_mid ?? null,
      sem1_final: v.sem1_final ?? null,
      sem2_mid: v.sem2_mid ?? null,
      sem2_final: v.sem2_final ?? null,
      override_grade: v.override_grade ?? null,
      updated_at: new Date().toISOString(),
    }));
    if (payload.length === 0) { setSaving(false); return; }
    const { error } = await supabase
      .from("subject_scores")
      .upsert(payload, { onConflict: "student_id,subject_id" });
    setSaving(false);
    if (error) { setMsg("บันทึกไม่สำเร็จ: " + error.message); return; }
    setMap((prev) => {
      const s = { ...(prev[subjectId] ?? {}) };
      for (const k of Object.keys(s)) s[k] = { ...s[k], _dirty: false };
      return { ...prev, [subjectId]: s };
    });
    setMsg("บันทึกคะแนนแล้ว");
  }

  const dirtyCount = useMemo(
    () => Object.values(map[subjectId] ?? {}).filter((v) => v._dirty).length,
    [map, subjectId]
  );

  if (subjects.length === 0) {
    return <div className="text-slate-400 py-10 text-center">ยังไม่มีรายวิชา — เพิ่มรายวิชาก่อน</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm max-w-md"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.order_no}. {s.name} ({s.category})
            </option>
          ))}
        </select>
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

      {subject && (
        <div className="text-xs text-slate-400">
          คะแนนเต็ม: ระหว่างภาค {subject.midterm_max} + ปลายภาค {subject.final_max} = {subject.midterm_max + subject.final_max}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="text-sm min-w-[900px] w-full report-like">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 w-10" rowSpan={2}>ที่</th>
              <th className="px-2 py-2 text-left" rowSpan={2}>ชื่อ - นามสกุล</th>
              <th className="px-2 py-2 text-center border-l" colSpan={4}>ภาคเรียนที่ 1</th>
              <th className="px-2 py-2 text-center border-l" colSpan={4}>ภาคเรียนที่ 2</th>
              <th className="px-2 py-2 text-center border-l" colSpan={3}>ตลอดปี</th>
            </tr>
            <tr className="text-xs">
              <th className="px-1 py-1 border-l">ระหว่าง</th>
              <th className="px-1 py-1">ปลาย</th>
              <th className="px-1 py-1">รวม</th>
              <th className="px-1 py-1">ผล</th>
              <th className="px-1 py-1 border-l">ระหว่าง</th>
              <th className="px-1 py-1">ปลาย</th>
              <th className="px-1 py-1">รวม</th>
              <th className="px-1 py-1">ผล</th>
              <th className="px-1 py-1 border-l">เฉลี่ย</th>
              <th className="px-1 py-1">เกรด</th>
              <th className="px-1 py-1 border-l">แก้เกรด</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => {
              const sc = getScore(st.id);
              const res = computeSubjectResult(
                {
                  sem1_mid: sc.sem1_mid ?? null,
                  sem1_final: sc.sem1_final ?? null,
                  sem2_mid: sc.sem2_mid ?? null,
                  sem2_final: sc.sem2_final ?? null,
                  override_grade: sc.override_grade ?? null,
                },
                criteria
              );
              return (
                <tr key={st.id} className={`border-t border-slate-100 ${sc._dirty ? "bg-amber-50" : ""}`}>
                  <td className="px-1 py-1 text-center">{st.no}</td>
                  <td className="px-2 py-1 whitespace-nowrap">{fullName(st)}</td>
                  <Num v={sc.sem1_mid} onC={(v) => setField(st.id, "sem1_mid", v)} border />
                  <Num v={sc.sem1_final} onC={(v) => setField(st.id, "sem1_final", v)} />
                  <td className="px-1 py-1 text-center text-slate-500">{res.sem1Total ?? ""}</td>
                  <td className="px-1 py-1 text-center font-medium">{gradeText(res.sem1Grade)}</td>
                  <Num v={sc.sem2_mid} onC={(v) => setField(st.id, "sem2_mid", v)} border />
                  <Num v={sc.sem2_final} onC={(v) => setField(st.id, "sem2_final", v)} />
                  <td className="px-1 py-1 text-center text-slate-500">{res.sem2Total ?? ""}</td>
                  <td className="px-1 py-1 text-center font-medium">{gradeText(res.sem2Grade)}</td>
                  <td className="px-1 py-1 text-center text-slate-500 border-l">
                    {res.yearAvg !== null ? res.yearAvg.toFixed(2) : ""}
                  </td>
                  <td className="px-1 py-1 text-center font-bold text-indigo-700">{gradeText(res.yearGrade)}</td>
                  <td className="px-1 py-1 border-l">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="-"
                      value={sc.override_grade ?? ""}
                      onChange={(e) => setField(st.id, "override_grade", e.target.value)}
                      className="w-14 rounded border border-amber-300 px-1 py-1 text-center"
                      title="กรอกเพื่อแก้เกรดรายปีด้วยตนเอง (เว้นว่าง = ใช้ค่าที่ระบบคำนวณ)"
                    />
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr><td colSpan={13} className="px-4 py-8 text-center text-slate-400">ยังไม่มีนักเรียน</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Num({
  v,
  onC,
  border,
}: {
  v: number | null | undefined;
  onC: (val: string) => void;
  border?: boolean;
}) {
  return (
    <td className={`px-1 py-1 ${border ? "border-l" : ""}`}>
      <input
        type="number"
        value={v ?? ""}
        onChange={(e) => onC(e.target.value)}
        className="w-14 rounded border border-slate-200 px-1 py-1 text-center"
      />
    </td>
  );
}
