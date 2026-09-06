import type { Subject } from "@/lib/types";

export default function YearCompetencyPanel({ subjects }: { subjects: Subject[] }) {
  const rows = subjects.filter((subject) => subject.competency_text?.trim());

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-700">ความสามารถชั้นปี</h3>
        <p className="text-xs text-slate-400">ข้อความความสามารถชั้นปีของรายวิชา หลักสูตรใหม่ 2568</p>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="w-14 px-3 py-2 text-center">ที่</th>
                <th className="w-56 px-3 py-2 text-left">รายวิชา</th>
                <th className="px-3 py-2 text-left">ความสามารถชั้นปี</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((subject) => (
                <tr key={subject.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 text-center text-slate-500">{subject.order_no}</td>
                  <td className="px-3 py-2 font-medium text-slate-700">{subject.name}</td>
                  <td className="px-3 py-2 leading-6 text-slate-600">{subject.competency_text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          ยังไม่มีข้อความความสามารถชั้นปี กรุณาเพิ่มในหน้ารายวิชา 2568
        </div>
      )}
    </section>
  );
}
