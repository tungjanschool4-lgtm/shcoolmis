import type { School, ClassRoom, SubjectCompetencyLevel } from "@/lib/types";
import type { StudentReport } from "@/lib/report-compute";
import { gradeText } from "@/lib/grading";
import { fullName } from "@/lib/types";
import ReportHeader from "@/components/ReportHeader";

function abilityForGrade(grade: number | null): string {
  if (grade === null) return "-";
  if (grade <= 0) return "ไม่ผ่าน";
  if (grade < 2) return "เริ่มต้น";
  if (grade < 3) return "พัฒนา";
  if (grade < 4) return "ชำนาญ";
  return "เชี่ยวชาญ";
}

function behaviorForGrade(grade: number | null, rubric?: SubjectCompetencyLevel): string {
  if (grade === null) return "-";
  if (grade <= 0) return "ไม่ผ่าน";
  if (!rubric) return abilityForGrade(grade);
  if (grade < 2) return rubric.beginner_text || "เริ่มต้น";
  if (grade < 3) return rubric.developing_text || "พัฒนา";
  if (grade < 4) return rubric.proficient_text || "ชำนาญ";
  return rubric.expert_text || "เชี่ยวชาญ";
}

export default function PersonReportSheet({
  school,
  cls,
  report,
  term,
  competencyLevels,
}: {
  school: School | null;
  cls: ClassRoom | null;
  report: StudentReport;
  term: "1" | "2" | "year";
  competencyLevels: SubjectCompetencyLevel[];
}) {
  const s = report.student;
  const isYear = term === "year";
  const title = "แบบรายงานผลการพัฒนาคุณภาพผู้เรียน" + (isYear ? "" : ` (ภาคเรียนที่ ${term})`);
  const rubricByOrder = new Map(competencyLevels.map((item) => [item.order_no, item]));

  return (
    <div className="print-page landscape sheet evaluation-sheet">
      <ReportHeader school={school} cls={cls} title={title} />

      <div className="flex justify-center gap-12 mt-2 mb-2 px-1 text-[13px]">
        <div>เลขที่ <span className="underline px-4">{s.no}</span></div>
        <div>ชื่อ - สกุล <span className="underline px-3">{fullName(s)}</span></div>
      </div>

      <table className="report-table evaluation-report-table">
        <thead>
          <tr>
            <th style={{ width: "3%" }}>ที่</th>
            <th style={{ width: "12%" }}>รายวิชา</th>
            <th style={{ width: "29%" }}>ความสามารถชั้นปี</th>
            <th style={{ width: "7%" }}>ผลการเรียน</th>
            <th style={{ width: "10%" }}>ความสามารถที่ได้</th>
            <th style={{ width: "39%" }}>คำอธิบายพฤติกรรม</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((r) => {
            const grade = isYear ? r.yearGrade : term === "1" ? r.sem1Grade : r.sem2Grade;
            const rubric = rubricByOrder.get(r.subject.order_no);
            return (
              <tr key={r.subject.id}>
                <td className="text-center">{r.subject.order_no}</td>
                <td>{r.subject.name}</td>
                <td>{rubric?.competency_text || r.subject.competency_text || "-"}</td>
                <td className="text-center font-semibold">{gradeText(grade) || "-"}</td>
                <td className="text-center font-semibold">{abilityForGrade(grade)}</td>
                <td>{behaviorForGrade(grade, rubric)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="grow" />

      <div className="grid grid-cols-3 gap-8 mt-5 text-center text-[12px]">
        <div>
          <div>ลงชื่อ ..................................................................</div>
          <div className="mt-1">( {cls?.homeroom_teacher_name || "..............................."} )</div>
          <div>ครูประจำชั้น</div>
        </div>
        <div>
          <div>ลงชื่อ .................................................................</div>
          <div className="mt-1">( {school?.academic_head || "..............................."} )</div>
          <div>หัวหน้าวิชาการ</div>
        </div>
        <div>
          <div>ลงชื่อ ว่าที่ ร.ต. ...................................................</div>
          <div className="mt-1">( {school?.director || "..............................."} )</div>
          <div>{school?.director_position || `ผู้อำนวยการโรงเรียน${school?.name || ""}`}</div>
        </div>
      </div>
    </div>
  );
}
