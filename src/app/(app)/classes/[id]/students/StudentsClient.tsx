"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Student } from "@/lib/types";

type Row = Partial<Student> & { _key: string; _dirty?: boolean; _new?: boolean };

const PREFIXES = ["เด็กชาย", "เด็กหญิง", "นาย", "นางสาว"];

export default function StudentsClient({ classId, initial }: { classId: string; initial: Student[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>(initial.map((s) => ({ ...s, _key: s.id })));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function update(key: string, field: keyof Student, value: string | number) {
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, [field]: value, _dirty: true } : r)));
  }

  function addRow() {
    const nextNo = rows.reduce((m, r) => Math.max(m, r.no || 0), 0) + 1;
    setRows((rs) => [
      ...rs,
      {
        _key: `new-${Date.now()}-${Math.random()}`,
        _new: true,
        _dirty: true,
        class_id: classId,
        no: nextNo,
        student_code: "",
        national_id: "",
        prefix: "เด็กชาย",
        first_name: "",
        last_name: "",
        gender: "",
        status: "กำลังศึกษา",
        birth_date: "",
        blood_type: "",
      },
    ]);
  }

  async function removeRow(key: string) {
    const row = rows.find((r) => r._key === key);
    if (!row) return;
    if (row._new) {
      setRows((rs) => rs.filter((r) => r._key !== key));
      return;
    }
    if (!confirm("ลบนักเรียนคนนี้? คะแนนที่บันทึกไว้จะถูกลบด้วย")) return;
    const { error } = await supabase.from("students").delete().eq("id", row.id!);
    if (error) setMsg("ลบไม่สำเร็จ: " + error.message);
    else setRows((rs) => rs.filter((r) => r._key !== key));
  }

  async function saveAll() {
    setSaving(true);
    setMsg(null);
    const dirty = rows.filter((r) => r._dirty);
    let ok = true;
    for (const r of dirty) {
      const payload = {
        class_id: classId,
        no: Number(r.no) || 0,
        student_code: r.student_code || "",
        national_id: r.national_id || "",
        prefix: r.prefix || "",
        first_name: r.first_name || "",
        last_name: r.last_name || "",
        gender: r.gender || (r.prefix === "เด็กหญิง" || r.prefix === "นางสาว" ? "หญิง" : "ชาย"),
        status: r.status || "กำลังศึกษา",
        birth_date: r.birth_date || "",
        blood_type: r.blood_type || "",
      };
      if (r._new) {
        const { data, error } = await supabase.from("students").insert(payload).select("id").single();
        if (error) { ok = false; setMsg("บันทึกไม่สำเร็จ: " + error.message); break; }
        r.id = data!.id;
        r._new = false;
      } else {
        const { error } = await supabase.from("students").update(payload).eq("id", r.id!);
        if (error) { ok = false; setMsg("บันทึกไม่สำเร็จ: " + error.message); break; }
      }
      r._dirty = false;
    }
    setRows((rs) => [...rs]);
    setSaving(false);
    if (ok) setMsg("บันทึกข้อมูลนักเรียนแล้ว");
  }

  const dirtyCount = rows.filter((r) => r._dirty).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-slate-500">นักเรียน {rows.length} คน</div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-sm text-slate-500">{msg}</span>}
          <button onClick={addRow} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            + เพิ่มนักเรียน
          </button>
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
        <table className="text-sm min-w-[1100px] w-full">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 w-14">เลขที่</th>
              <th className="px-2 py-2 w-24">เลขประจำตัว</th>
              <th className="px-2 py-2 w-36">เลขบัตร ปชช.</th>
              <th className="px-2 py-2 w-24">คำนำหน้า</th>
              <th className="px-2 py-2">ชื่อ</th>
              <th className="px-2 py-2">นามสกุล</th>
              <th className="px-2 py-2 w-24">วันเกิด</th>
              <th className="px-2 py-2 w-20">หมู่เลือด</th>
              <th className="px-2 py-2 w-28">สถานะ</th>
              <th className="px-2 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._key} className={`border-t border-slate-100 ${r._dirty ? "bg-amber-50" : ""}`}>
                <td className="px-1 py-1"><Inp v={r.no} onC={(v) => update(r._key, "no", v)} w="w-12" type="number" /></td>
                <td className="px-1 py-1"><Inp v={r.student_code} onC={(v) => update(r._key, "student_code", v)} /></td>
                <td className="px-1 py-1"><Inp v={r.national_id} onC={(v) => update(r._key, "national_id", v)} /></td>
                <td className="px-1 py-1">
                  <select
                    value={r.prefix || ""}
                    onChange={(e) => update(r._key, "prefix", e.target.value)}
                    className="w-full rounded border border-slate-200 px-1 py-1"
                  >
                    <option value=""></option>
                    {PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1"><Inp v={r.first_name} onC={(v) => update(r._key, "first_name", v)} /></td>
                <td className="px-1 py-1"><Inp v={r.last_name} onC={(v) => update(r._key, "last_name", v)} /></td>
                <td className="px-1 py-1"><Inp v={r.birth_date} onC={(v) => update(r._key, "birth_date", v)} /></td>
                <td className="px-1 py-1"><Inp v={r.blood_type} onC={(v) => update(r._key, "blood_type", v)} /></td>
                <td className="px-1 py-1">
                  <select
                    value={r.status || "กำลังศึกษา"}
                    onChange={(e) => update(r._key, "status", e.target.value)}
                    className="w-full rounded border border-slate-200 px-1 py-1"
                  >
                    <option>กำลังศึกษา</option>
                    <option>ย้ายเข้า</option>
                    <option>ย้ายออก</option>
                    <option>พักการเรียน</option>
                  </select>
                </td>
                <td className="px-1 py-1 text-center">
                  <button onClick={() => removeRow(r._key)} className="text-rose-500">✕</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  ยังไม่มีนักเรียน — กด “เพิ่มนักเรียน”
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Inp({
  v,
  onC,
  w = "w-full",
  type = "text",
}: {
  v: string | number | undefined;
  onC: (val: string) => void;
  w?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={v ?? ""}
      onChange={(e) => onC(e.target.value)}
      className={`${w} rounded border border-slate-200 px-1.5 py-1`}
    />
  );
}
