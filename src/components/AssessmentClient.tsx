"use client";

import { Fragment, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Student, AssessmentItem, AssessmentScore } from "@/lib/types";
import { fullName } from "@/lib/types";
import { itemsAverage, qualityLevel, type QualityLabels } from "@/lib/grading";
import { usePasswordDelete } from "@/components/PasswordDeleteGuard";

type Cell = Partial<AssessmentScore> & { _dirty?: boolean };
type ItemRow = Partial<AssessmentItem> & { _key: string; _dirty?: boolean; _new?: boolean };

export default function AssessmentClient({
  title,
  items,
  students,
  scores,
  qualityLabels,
  classId,
  kind,
}: {
  title: string;
  items: AssessmentItem[];
  students: Student[];
  scores: AssessmentScore[];
  qualityLabels: QualityLabels;
  classId: string;
  kind: AssessmentItem["kind"];
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [itemRows, setItemRows] = useState<ItemRow[]>(
    items.map((item) => ({ ...item, _key: item.id }))
  );
  const { requestDelete, deletePasswordDialog } = usePasswordDelete();

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

  function updateItem(key: string, title: string) {
    setItemRows((current) => current.map((item) =>
      item._key === key ? { ...item, title, _dirty: true } : item
    ));
    setMsg(null);
  }

  function addItem() {
    setItemRows((current) => [...current, {
      _key: `new-${Date.now()}`,
      _new: true,
      _dirty: true,
      class_id: classId,
      kind,
      no: current.length + 1,
      title: "",
      max_score: 3,
    }]);
    setMsg(null);
  }

  function removeMapItem(itemKey: string) {
    setMap((current) => {
      const copy: typeof current = {};
      for (const [studentId, row] of Object.entries(current)) {
        copy[studentId] = { ...row };
        delete copy[studentId][itemKey];
      }
      return copy;
    });
  }

  function removeItem(key: string) {
    const item = itemRows.find((row) => row._key === key);
    if (!item) return;
    requestDelete({
      title: "ยืนยันการลบข้อประเมิน",
      description: `ลบข้อ ${item.no} “${item.title || "ยังไม่ได้ระบุรายละเอียด"}” หรือไม่? คะแนนของข้อนี้จะถูกลบด้วย`,
      onVerified: async () => {
        if (!item._new) {
          const { error } = await supabase.from("assessment_items").delete().eq("id", item.id!);
          if (error) { setMsg("ลบไม่สำเร็จ: " + error.message); return; }
        }

        const remaining = itemRows.filter((row) => row._key !== key);
        for (let index = 0; index < remaining.length; index += 1) {
          const row = remaining[index];
          const nextNo = index + 1;
          if (!row._new && Number(row.no) !== nextNo) {
            const { error } = await supabase.from("assessment_items").update({ no: nextNo }).eq("id", row.id!);
            if (error) { setMsg("จัดลำดับข้อไม่สำเร็จ: " + error.message); return; }
          }
          row.no = nextNo;
        }
        setItemRows([...remaining]);
        removeMapItem(key);
        setMsg("ลบข้อประเมินแล้ว");
      },
    });
  }

  async function saveAll() {
    setSaving(true);
    setMsg(null);
    if (itemRows.some((item) => !item.title?.trim())) {
      setSaving(false);
      setMsg("กรุณากรอกรายละเอียดของข้อประเมินให้ครบ");
      return;
    }

    for (let index = 0; index < itemRows.length; index += 1) {
      const item = itemRows[index];
      if (!item._dirty) continue;
      const payload = {
        class_id: classId,
        kind,
        no: index + 1,
        title: item.title!.trim(),
        max_score: Number(item.max_score) || 3,
      };
      if (item._new) {
        const { data, error } = await supabase.from("assessment_items").insert(payload).select("id").single();
        if (error) { setSaving(false); setMsg("บันทึกข้อประเมินไม่สำเร็จ: " + error.message); return; }
        item.id = data.id;
        item._key = data.id;
        item._new = false;
      } else {
        const { error } = await supabase.from("assessment_items").update(payload).eq("id", item.id!);
        if (error) { setSaving(false); setMsg("บันทึกข้อประเมินไม่สำเร็จ: " + error.message); return; }
      }
      item.no = index + 1;
      item._dirty = false;
    }
    setItemRows([...itemRows]);

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
    if (payload.length === 0) { setSaving(false); setMsg("บันทึกข้อประเมินแล้ว"); return; }
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

  const scoreDirtyCount = Object.values(map).reduce(
    (acc, row) => acc + Object.values(row).filter((c) => c._dirty).length,
    0
  );
  const itemDirtyCount = itemRows.filter((item) => item._dirty).length;
  const dirtyCount = scoreDirtyCount + itemDirtyCount;

  function studentAvg(studentId: string, sem: "sem1" | "sem2"): number | null {
    return itemsAverage(itemRows.map((it) => get(studentId, it._key)[sem] ?? null));
  }

  return (
    <div className="space-y-4">
      {deletePasswordDialog}
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
        <table className="text-sm w-full" style={{ minWidth: 120 + itemRows.length * 90 + 200 }}>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-2 py-2 w-10" rowSpan={2}>ที่</th>
              <th className="px-2 py-2 text-left" rowSpan={2}>ชื่อ - นามสกุล</th>
              {itemRows.map((it) => (
                <th key={it._key} className="px-1 py-2 text-center border-l" colSpan={2} title={it.title}>
                  ข้อ {it.no}
                </th>
              ))}
              <th className="px-2 py-2 text-center border-l" rowSpan={2}>สรุป</th>
            </tr>
            <tr className="text-xs">
              {itemRows.map((it) => (
                <Fragment key={it._key}>
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
                  {itemRows.map((it) => {
                    const c = get(st.id, it._key);
                    return (
                      <Fragment key={it._key}>
                        <td className="px-1 py-1 border-l">
                          <input disabled={it._new} title={it._new ? "กรุณาบันทึกข้อประเมินก่อนกรอกคะแนน" : undefined} type="number" min={0} max={it.max_score} value={c.sem1 ?? ""} onChange={(e) => setField(st.id, it._key, "sem1", e.target.value)} className="w-11 rounded border border-slate-200 px-1 py-1 text-center disabled:bg-slate-100" />
                        </td>
                        <td className="px-1 py-1">
                          <input disabled={it._new} title={it._new ? "กรุณาบันทึกข้อประเมินก่อนกรอกคะแนน" : undefined} type="number" min={0} max={it.max_score} value={c.sem2 ?? ""} onChange={(e) => setField(st.id, it._key, "sem2", e.target.value)} className="w-11 rounded border border-slate-200 px-1 py-1 text-center disabled:bg-slate-100" />
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
              <tr><td colSpan={itemRows.length * 2 + 3} className="px-4 py-8 text-center text-slate-400">ยังไม่มีนักเรียน</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-700">รายละเอียดข้อประเมิน</h3>
            <p className="text-xs text-slate-400">ข้อความด้านล่างคือความหมายของข้อที่แสดงในตาราง สามารถแก้ไข เพิ่ม หรือลดได้</p>
          </div>
          <button onClick={addItem} className="shrink-0 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100">+ เพิ่มข้อประเมิน</button>
        </div>
        <div className="mt-3 space-y-2">
          {itemRows.map((item, index) => (
            <div key={item._key} className={`flex items-center gap-2 rounded-lg p-2 ${item._dirty ? "bg-amber-50" : "bg-slate-50"}`}>
              <label className="w-14 shrink-0 text-sm font-medium text-slate-600">ข้อ {index + 1}</label>
              <input value={item.title || ""} onChange={(event) => updateItem(item._key, event.target.value)} placeholder={`กรอกรายละเอียดข้อ ${index + 1}`} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              <button onClick={() => removeItem(item._key)} className="shrink-0 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">ลบข้อ</button>
            </div>
          ))}
          {itemRows.length === 0 && <div className="py-5 text-center text-sm text-slate-400">ยังไม่มีข้อประเมิน กด “+ เพิ่มข้อประเมิน” เพื่อเริ่มต้น</div>}
        </div>
      </div>

      <div className="text-xs text-slate-400">
        เกณฑ์สรุป: เฉลี่ย ≥ 2.5 = {qualityLabels.excellent}, ≥ 1.5 = {qualityLabels.good}, ≥ 1.0 = {qualityLabels.pass}, ต่ำกว่านั้น = {qualityLabels.fail}
      </div>
    </div>
  );
}
