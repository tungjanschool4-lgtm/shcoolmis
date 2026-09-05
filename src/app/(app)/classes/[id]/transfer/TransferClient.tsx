"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Subject, TransferSubject, TransferSource } from "@/lib/types";
import { seedTransferDefaults } from "./actions";
import { usePasswordDelete } from "@/components/PasswordDeleteGuard";

type Row = Partial<TransferSubject> & { _key: string; _new?: boolean };
const CATS = ["พื้นฐาน", "ประยุกต์", "เพิ่มเติม"];

export default function TransferClient({
  classId,
  subjects,
  transferSubjects,
  transferSources,
}: {
  classId: string;
  subjects: Subject[];
  transferSubjects: TransferSubject[];
  transferSources: TransferSource[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(transferSubjects.map((t) => ({ ...t, _key: t.id })));
  const [sourceMap, setSourceMap] = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    for (const t of transferSubjects) m[t.id] = new Set();
    for (const s of transferSources) {
      if (!m[s.transfer_subject_id]) m[s.transfer_subject_id] = new Set();
      m[s.transfer_subject_id].add(s.subject_id);
    }
    return m;
  });
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const { requestDelete, deletePasswordDialog } = usePasswordDelete();

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";

  function upd(key: string, field: keyof TransferSubject, val: string | number | boolean) {
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, [field]: val } : r)));
  }
  function addRow() {
    const nextNo = rows.reduce((m, r) => Math.max(m, r.order_no || 0), 0) + 1;
    const key = `new-${Date.now()}`;
    setRows((rs) => [...rs, { _key: key, _new: true, class_id: classId, order_no: nextNo, category: "พื้นฐาน", code: "", name: "", credits: 0, enabled: true }]);
    setSourceMap((m) => ({ ...m, [key]: new Set() }));
  }
  function removeRow(key: string) {
    const row = rows.find((item) => item._key === key);
    requestDelete({
      title: "ยืนยันการลบวิชาเทียบโอน",
      description: `ลบวิชา “${row?.name || "รายการนี้"}”? ต้องกดบันทึกเพื่อบันทึกการเปลี่ยนแปลง`,
      onVerified: () => setRows((rs) => rs.filter((r) => r._key !== key)),
    });
  }
  function toggleSource(key: string, subjectId: string) {
    setSourceMap((m) => {
      const set = new Set(m[key] ?? []);
      if (set.has(subjectId)) set.delete(subjectId);
      else set.add(subjectId);
      return { ...m, [key]: set };
    });
  }

  async function handleSeed() {
    setSeeding(true);
    const res = await seedTransferDefaults(classId);
    setSeeding(false);
    if (res.ok) router.refresh();
    else setMsg({ t: "err", m: res.error || "ไม่สำเร็จ" });
  }

  async function saveAll() {
    setSaving(true);
    setMsg(null);
    // 1) upsert transfer subjects, จับคู่ _key -> id จริง
    const keyToId: Record<string, string> = {};
    for (const r of rows) {
      const payload = {
        class_id: classId,
        order_no: Number(r.order_no) || 0,
        category: r.category || "พื้นฐาน",
        code: r.code || "",
        name: r.name || "",
        credits: Number(r.credits) || 0,
        enabled: r.enabled ?? true,
      };
      if (r._new) {
        const { data, error } = await supabase.from("transfer_subjects").insert(payload).select("id").single();
        if (error) { setSaving(false); setMsg({ t: "err", m: error.message }); return; }
        keyToId[r._key] = data!.id;
      } else {
        const { error } = await supabase.from("transfer_subjects").update(payload).eq("id", r.id!);
        if (error) { setSaving(false); setMsg({ t: "err", m: error.message }); return; }
        keyToId[r._key] = r.id!;
      }
    }
    // ลบวิชาเทียบโอนที่ถูกเอาออก
    const keepIds = Object.values(keyToId);
    const removed = transferSubjects.filter((t) => !keepIds.includes(t.id)).map((t) => t.id);
    if (removed.length) await supabase.from("transfer_subjects").delete().in("id", removed);

    // 2) sync sources: ลบของทั้งหมดแล้วใส่ใหม่
    if (keepIds.length) await supabase.from("transfer_sources").delete().in("transfer_subject_id", keepIds);
    const inserts: { transfer_subject_id: string; subject_id: string }[] = [];
    for (const [key, id] of Object.entries(keyToId)) {
      for (const subjectId of sourceMap[key] ?? []) inserts.push({ transfer_subject_id: id, subject_id: subjectId });
    }
    if (inserts.length) {
      const { error } = await supabase.from("transfer_sources").insert(inserts);
      if (error) { setSaving(false); setMsg({ t: "err", m: error.message }); return; }
    }
    setSaving(false);
    setMsg({ t: "ok", m: "บันทึกการเทียบโอนแล้ว" });
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-14 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">บันทึกรายวิชาเทียบโอน หลักสูตร 2560</h2>
        <div className="text-slate-500">ยังไม่ได้ตั้งค่าวิชาเทียบโอนสำหรับห้องนี้</div>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          การเทียบโอนคือการจับคู่ “วิชาหลักสูตรใหม่ (ต้นทาง)” เข้ากับ “วิชาโครงสร้างเดิม (ปลายทาง)”
          ระบบจะดึงคะแนนรายปีจากวิชาต้นทางมาคำนวณให้ (รวมได้หลายวิชา → 1)
        </p>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="rounded-lg bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {seeding ? "กำลังสร้าง..." : "สร้างวิชาเทียบโอนเริ่มต้น (12 วิชา + จับคู่ 1:1)"}
        </button>
        {msg && <div className="text-sm text-red-600">{msg.m}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deletePasswordDialog}
      <div>
        <h2 className="text-lg font-semibold text-slate-800">บันทึกรายวิชาเทียบโอน หลักสูตร 2560</h2>
        <p className="text-sm text-slate-500">จับคู่รายวิชาหลักสูตรใหม่ 2568 กับรายวิชาในหลักสูตร 2560</p>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-slate-500">
          จับคู่วิชาต้นทาง (หลักสูตรใหม่ 2568) → วิชาปลายทาง (หลักสูตร 2560) · รวมหลายวิชาเป็น 1 ได้
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className={`text-sm ${msg.t === "ok" ? "text-emerald-600" : "text-red-600"}`}>{msg.m}</span>}
          <button onClick={addRow} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">+ เพิ่มวิชา</button>
          <button onClick={saveAll} disabled={saving} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="text-sm min-w-[900px] w-full">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 w-12">ใช้</th>
              <th className="px-2 py-2 w-12">ที่</th>
              <th className="px-2 py-2 w-24">รหัสวิชา</th>
              <th className="px-2 py-2">ชื่อวิชาปลายทาง</th>
              <th className="px-2 py-2 w-24">ประเภท</th>
              <th className="px-2 py-2 w-20">น้ำหนัก</th>
              <th className="px-2 py-2">วิชาต้นทาง (ดึงคะแนน)</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sources = sourceMap[r._key] ?? new Set<string>();
              return (
                <tr key={r._key} className="border-t border-slate-100">
                  <td className="px-2 py-1 text-center">
                    <input type="checkbox" checked={r.enabled ?? true} onChange={(e) => upd(r._key, "enabled", e.target.checked)} />
                  </td>
                  <td className="px-1 py-1"><input type="number" value={r.order_no ?? ""} onChange={(e) => upd(r._key, "order_no", e.target.value)} className="w-11 rounded border border-slate-200 px-1 py-1" /></td>
                  <td className="px-1 py-1"><input value={r.code ?? ""} onChange={(e) => upd(r._key, "code", e.target.value)} className="w-full rounded border border-slate-200 px-1.5 py-1" /></td>
                  <td className="px-1 py-1"><input value={r.name ?? ""} onChange={(e) => upd(r._key, "name", e.target.value)} className="w-full rounded border border-slate-200 px-1.5 py-1" /></td>
                  <td className="px-1 py-1">
                    <select value={r.category ?? ""} onChange={(e) => upd(r._key, "category", e.target.value)} className="w-full rounded border border-slate-200 px-1 py-1">
                      {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1"><input type="number" value={r.credits ?? ""} onChange={(e) => upd(r._key, "credits", e.target.value)} className="w-16 rounded border border-slate-200 px-1 py-1" /></td>
                  <td className="px-1 py-1">
                    <button onClick={() => setPickFor(r._key)} className="text-left w-full">
                      {sources.size === 0 ? (
                        <span className="text-rose-500 text-xs">— เลือกวิชาต้นทาง —</span>
                      ) : (
                        <span className="text-xs text-slate-700">{[...sources].map(subjectName).join(", ")}</span>
                      )}
                    </button>
                  </td>
                  <td className="px-1 py-1 text-center"><button onClick={() => removeRow(r._key)} className="text-rose-500">✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        หมายเหตุ: หากเลือกวิชาต้นทางมากกว่า 1 วิชา ระบบจะเฉลี่ยคะแนนรายปีของวิชาเหล่านั้นเป็นคะแนนของวิชาปลายทาง
      </p>

      {/* modal เลือกวิชาต้นทาง */}
      {pickFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setPickFor(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-1">เลือกวิชาต้นทาง</h3>
            <p className="text-xs text-slate-400 mb-3">
              ปลายทาง: {rows.find((r) => r._key === pickFor)?.name || "-"}
            </p>
            <div className="space-y-1.5">
              {subjects.map((s) => {
                const checked = (sourceMap[pickFor] ?? new Set()).has(s.id);
                return (
                  <label key={s.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggleSource(pickFor, s.id)} />
                    <span className="text-slate-400 w-6">{s.order_no}.</span>
                    <span>{s.name}</span>
                    <span className="text-xs text-slate-400 ml-auto">{s.category}</span>
                  </label>
                );
              })}
              {subjects.length === 0 && <div className="text-sm text-slate-400">ยังไม่มีรายวิชาในห้องนี้</div>}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setPickFor(null)} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm">เสร็จสิ้น</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
