import { loadClassBundle } from "@/lib/report-data";
import { computeSubjectResult, gradeText } from "@/lib/grading";
import { fullName } from "@/lib/types";
import PrintToolbar from "@/components/PrintToolbar";

export const dynamic = "force-dynamic";

function n2(v: number | null): string {
  return v === null || Number.isNaN(v) ? "" : v.toFixed(2);
}

export default async function SubjectScoresPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const bundle = await loadClassBundle(classId);
  const { school, cls, students, subjects, subjectScores, criteria } = bundle;

  const scoreOf = (studentId: string, subjectId: string) =>
    subjectScores.find((s) => s.student_id === studentId && s.subject_id === subjectId);

  return (
    <>
      <PrintToolbar title="ตารางคะแนนรายวิชา" />
      <div className="py-4">
        {subjects.map((subject) => (
          <div key={subject.id} className="print-page text-[12px]">
            <div className="text-center font-bold text-base">
              โรงเรียน{school?.name} — {cls?.grade_level} {cls?.room ? `ห้อง ${cls.room}` : ""} ปีการศึกษา {school?.academic_year || cls?.academic_year}
            </div>
            <div className="text-center font-semibold mb-2">
              รายวิชา {subject.category} : {subject.name} ({subject.code})
            </div>
            <table className="report-table">
              <thead>
                <tr>
                  <th rowSpan={3} style={{ width: 26 }}>ที่</th>
                  <th rowSpan={3}>ชื่อ - นามสกุล</th>
                  <th colSpan={4}>ภาคเรียนที่ 1</th>
                  <th colSpan={4}>ภาคเรียนที่ 2</th>
                  <th rowSpan={2} colSpan={1}>เฉลี่ย</th>
                  <th rowSpan={2} colSpan={1}>ผลการเรียน</th>
                </tr>
                <tr>
                  <th colSpan={3}>คะแนน</th>
                  <th rowSpan={2}>ผล</th>
                  <th colSpan={3}>คะแนน</th>
                  <th rowSpan={2}>ผล</th>
                </tr>
                <tr>
                  <th style={{ width: 42 }}>ระหว่าง</th>
                  <th style={{ width: 38 }}>ปลาย</th>
                  <th style={{ width: 38 }}>รวม</th>
                  <th style={{ width: 42 }}>ระหว่าง</th>
                  <th style={{ width: 38 }}>ปลาย</th>
                  <th style={{ width: 38 }}>รวม</th>
                  <th style={{ width: 42 }}>2 ภาค</th>
                  <th style={{ width: 42 }}>ตลอดปี</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => {
                  const sc = scoreOf(st.id, subject.id);
                  const res = computeSubjectResult(
                    {
                      sem1_mid: sc?.sem1_mid ?? null,
                      sem1_final: sc?.sem1_final ?? null,
                      sem2_mid: sc?.sem2_mid ?? null,
                      sem2_final: sc?.sem2_final ?? null,
                      override_grade: sc?.override_grade ?? null,
                    },
                    criteria
                  );
                  return (
                    <tr key={st.id}>
                      <td className="text-center">{st.no}</td>
                      <td className="whitespace-nowrap">{fullName(st)}</td>
                      <td className="text-center">{sc?.sem1_mid ?? ""}</td>
                      <td className="text-center">{sc?.sem1_final ?? ""}</td>
                      <td className="text-center">{res.sem1Total ?? ""}</td>
                      <td className="text-center font-semibold">{gradeText(res.sem1Grade)}</td>
                      <td className="text-center">{sc?.sem2_mid ?? ""}</td>
                      <td className="text-center">{sc?.sem2_final ?? ""}</td>
                      <td className="text-center">{res.sem2Total ?? ""}</td>
                      <td className="text-center font-semibold">{gradeText(res.sem2Grade)}</td>
                      <td className="text-center">{n2(res.yearAvg)}</td>
                      <td className="text-center font-bold">{gradeText(res.yearGrade)}</td>
                    </tr>
                  );
                })}
                {Array.from({ length: Math.max(0, 30 - students.length) }).map((_, i) => (
                  <tr key={`b${i}`} style={{ height: 20 }}>
                    <td className="text-center">{students.length + i + 1}</td>
                    <td></td><td></td><td></td><td></td><td></td>
                    <td></td><td></td><td></td><td></td><td></td><td></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[11px] mt-1 text-slate-600">
              คะแนนเต็ม: ระหว่างภาค {subject.midterm_max} + ปลายภาค {subject.final_max} = {subject.midterm_max + subject.final_max}
            </div>
          </div>
        ))}
        {subjects.length === 0 && (
          <div className="print-page text-center text-slate-400 pt-20">ยังไม่มีรายวิชา</div>
        )}
      </div>
    </>
  );
}
