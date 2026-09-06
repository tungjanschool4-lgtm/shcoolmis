"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Subject } from "@/lib/types";
import { usePasswordDelete } from "@/components/PasswordDeleteGuard";
import { decodeCsv, downloadCsvTemplate, parseSubjectsCsv } from "@/lib/curriculum-csv";

type Row = Partial<Subject> & { _key: string; _dirty?: boolean; _new?: boolean };

const CATEGORIES = ["พื้นฐาน", "ประยุกต์", "เพิ่มเติม"];

export default function SubjectsClient({ classId, initial }: { classId: string; initial: Subject[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>(initial.map((s) => ({ ...s, _key: s.id })));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState<Row | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { requestDelete, deletePasswordDialog } = usePasswordDelete();

  function update(key: string, field: keyof Subject, value: string | number | boolean) {
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, [field]: value, _dirty: true } : r)));
  }

  function addRow() {
    const nextNo = rows.reduce((m, r) => Math.max(m, r.order_no || 0), 0) + 1;
    setRows((rs) => [
      ...rs,
      {
        _key: `new-${Date.now()}`,
        _new: true,
        _dirty: true,
        class_id: classId,
        order_no: nextNo,
        category: "พื้นฐาน",
        name: "",
        code: "",
        hours: 0,
        credits: 0,
        midterm_max: 70,
        final_max: 30,
        competency_text: "",
        is_active: true,
      },
    ]);
  }

  async function importCsv(file: File) {
    setMsg(null);
    try {
      const imported = parseSubjectsCsv(decodeCsv(await file.arrayBuffer()));
      setRows((current) => {
        const next = [...current];
        for (const item of imported) {
          const index = next.findIndex((row) => Number(row.order_no) === item.order_no);
          if (index >= 0) next[index] = { ...next[index], ...item, _dirty: true };
          else next.push({ ...item, class_id: classId, is_active: true, _key: `csv-${Date.now()}-${item.order_no}`, _new: true, _dirty: true });
        }
        return next.sort((a, b) => (Number(a.order_no) || 0) - (Number(b.order_no) || 0));
      });
      setMsg(`นำเข้า ${imported.length} วิชาแล้ว กรุณาตรวจสอบและกดบันทึก`);
    } catch (error) {
      setMsg(`นำเข้าไม่สำเร็จ: ${error instanceof Error ? error.message : "รูปแบบไฟล์ไม่ถูกต้อง"}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function downloadTemplate() {
    downloadCsvTemplate("subjects-2568-template.csv", [
      ["วิชาที่", "ประเภทวิชา", "ชื่อวิชา", "รหัสวิชา", "เวลาเรียน", "น้ำหนัก", "คะแนนกลางภาค", "คะแนนปลายภาค", "ความสามารถชั้นปี"],
      ["1", "พื้นฐาน", "ภาษาไทย", "ท16101", "120", "3", "70", "30", "ผู้เรียนวิเคราะห์และเลือกข้อมูลอย่างมีเหตุผล"],
    ]);
  }

  function removeRow(key: string) {
    const row = rows.find((r) => r._key === key);
    if (!row) return;
    requestDelete({
      title: "ยืนยันการลบรายวิชา",
      description: row._new ? "ลบรายวิชาที่ยังไม่ได้บันทึก?" : "ลบรายวิชานี้? คะแนนของวิชานี้จะถูกลบด้วย",
      onVerified: async () => {
        if (row._new) { setRows((rs) => rs.filter((r) => r._key !== key)); return; }
        const { error } = await supabase.from("subjects").delete().eq("id", row.id!);
        if (error) setMsg("ลบไม่สำเร็จ: " + error.message);
        else setRows((rs) => rs.filter((r) => r._key !== key));
      },
    });
  }

  async function saveAll() {
    setSaving(true);
    setMsg(null);
    let ok = true;
    for (const r of rows.filter((r) => r._dirty)) {
      const payload = {
        class_id: classId,
        order_no: Number(r.order_no) || 0,
        category: r.category || "พื้นฐาน",
        name: r.name || "",
        code: r.code || "",
        hours: Number(r.hours) || 0,
        credits: Number(r.credits) || 0,
        midterm_max: Number(r.midterm_max) || 0,
        final_max: Number(r.final_max) || 0,
        competency_text: r.competency_text || "",
        is_active: r.is_active ?? true,
      };
      if (r._new) {
        const { data, error } = await supabase.from("subjects").insert(payload).select("id").single();
        if (error) { ok = false; setMsg("บันทึกไม่สำเร็จ: " + error.message); break; }
        r.id = data!.id; r._new = false;
      } else {
        const { error } = await supabase.from("subjects").update(payload).eq("id", r.id!);
        if (error) { ok = false; setMsg("บันทึกไม่สำเร็จ: " + error.message); break; }
      }
      r._dirty = false;
    }
    setRows((rs) => [...rs]);
    setSaving(false);
    if (ok) setMsg("บันทึกรายวิชาแล้ว");
  }

  const dirtyCount = rows.filter((r) => r._dirty).length;

  return (
    <div className="space-y-4">
      {deletePasswordDialog}
      <div>
        <h2 className="text-lg font-semibold text-slate-800">บันทึกรายวิชา หลักสูตรใหม่ 2568</h2>
        <p className="text-sm text-slate-500">กำหนดชื่อวิชา ประเภทวิชา เวลาเรียน และน้ำหนักรายวิชา</p>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-slate-500">รายวิชา {rows.length} วิชา</div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-sm text-slate-500">{msg}</span>}
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} />
          <button onClick={downloadTemplate} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">ดาวน์โหลด CSV ตัวอย่าง</button>
          <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100">นำเข้า CSV</button>
          <button onClick={addRow} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">+ เพิ่มวิชา</button>
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
        <table className="text-sm min-w-[980px] w-full">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 w-12">วิชาที่</th>
              <th className="px-2 py-2 w-28">ประเภทวิชา</th>
              <th className="px-2 py-2">ชื่อวิชา</th>
              <th className="px-2 py-2 w-24">รหัส</th>
              <th className="px-2 py-2 w-20">เวลาเรียน</th>
              <th className="px-2 py-2 w-20">น้ำหนัก</th>
              <th className="px-2 py-2 w-24">เต็ม (กลาง/ปลาย)</th>
              <th className="px-2 py-2 w-28">ความสามารถชั้นปี</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._key} className={`border-t border-slate-100 ${r._dirty ? "bg-amber-50" : ""}`}>
                <td className="px-1 py-1"><input type="number" value={r.order_no ?? ""} onChange={(e) => update(r._key, "order_no", e.target.value)} className="w-11 rounded border border-slate-200 px-1 py-1" /></td>
                <td className="px-1 py-1">
                  <select value={r.category || ""} onChange={(e) => update(r._key, "category", e.target.value)} className="w-full rounded border border-slate-200 px-1 py-1">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1"><input value={r.name || ""} onChange={(e) => update(r._key, "name", e.target.value)} className="w-full rounded border border-slate-200 px-1.5 py-1" /></td>
                <td className="px-1 py-1"><input value={r.code || ""} onChange={(e) => update(r._key, "code", e.target.value)} className="w-full rounded border border-slate-200 px-1.5 py-1" /></td>
                <td className="px-1 py-1"><input type="number" value={r.hours ?? ""} onChange={(e) => update(r._key, "hours", e.target.value)} className="w-16 rounded border border-slate-200 px-1 py-1" /></td>
                <td className="px-1 py-1"><input type="number" value={r.credits ?? ""} onChange={(e) => update(r._key, "credits", e.target.value)} className="w-16 rounded border border-slate-200 px-1 py-1" /></td>
                <td className="px-1 py-1 whitespace-nowrap">
                  <input type="number" value={r.midterm_max ?? ""} onChange={(e) => update(r._key, "midterm_max", e.target.value)} className="w-11 rounded border border-slate-200 px-1 py-1" />
                  <span className="mx-0.5">/</span>
                  <input type="number" value={r.final_max ?? ""} onChange={(e) => update(r._key, "final_max", e.target.value)} className="w-11 rounded border border-slate-200 px-1 py-1" />
                </td>
                <td className="px-1 py-1">
                  <button onClick={() => setEditText(r)} className="text-indigo-600 text-xs hover:underline text-left line-clamp-2">
                    {r.competency_text ? "แก้ไข…" : "+ เพิ่ม"}
                  </button>
                </td>
                <td className="px-1 py-1 text-center"><button onClick={() => removeRow(r._key)} className="text-rose-500">✕</button></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">ยังไม่มีรายวิชา</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editText && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setEditText(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-1">ความสามารถชั้นปี</h3>
            <p className="text-xs text-slate-400 mb-3">{editText.name || "รายวิชา"} — ข้อความนี้จะแสดงในรายงานผลรายคน</p>
            <textarea
              defaultValue={editText.competency_text || ""}
              rows={5}
              onChange={(e) => update(editText._key, "competency_text", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 text-right">
              <button onClick={() => setEditText(null)} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm">เสร็จสิ้น</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
