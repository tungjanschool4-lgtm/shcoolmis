import type { School, ClassRoom } from "@/lib/types";
import type { StudentReport } from "@/lib/report-compute";
import { gradeText } from "@/lib/grading";
import { fullName } from "@/lib/types";
import ReportHeader from "@/components/ReportHeader";

function num(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "-";
  return String(Math.round(v));
}

export default function PersonReportSheet({
  school,
  cls,
  report,
  rank,
  total,
  term,
}: {
  school: School | null;
  cls: ClassRoom | null;
  report: StudentReport;
  rank: number | string;
  total: number;
  term: "1" | "2" | "year";
}) {
  const s = report.student;
  const isYear = term === "year";
  const minRows = 13;
  const blanks = Math.max(0, minRows - report.rows.length);
  const title = "แบบรายงานผลการพัฒนาคุณภาพผู้เรียน" + (isYear ? "" : ` (ภาคเรียนที่ ${term})`);

  return (
    <div className="print-page sheet text-[13px]" style={{ lineHeight: 1.35 }}>
      <ReportHeader school={school} cls={cls} title={title} />

      <div className="flex justify-between mt-2 mb-1 px-1">
        <div>เลขที่ <span className="underline px-4">{s.no}</span></div>
        <div>ชื่อ - นามสกุล <span className="underline px-2">{fullName(s)}</span></div>
        <div>เลขประจำตัว {s.student_code || "-"}</div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: 28 }}>ที่</th>
            <th rowSpan={2}>ชื่อวิชา</th>
            <th rowSpan={2} style={{ width: 66 }}>ประเภทวิชา</th>
            <th rowSpan={2} style={{ width: 42 }}>น้ำหนัก</th>
            {isYear ? (
              <>
                <th colSpan={2}>ภาคเรียนที่ 1</th>
                <th colSpan={2}>ภาคเรียนที่ 2</th>
                <th colSpan={2}>สรุปผลปลายปี</th>
              </>
            ) : (
              <th colSpan={2}>ภาคเรียนที่ {term}</th>
            )}
            <th rowSpan={2} style={{ width: 50 }}>หมายเหตุ</th>
          </tr>
          <tr>
            {isYear ? (
              <>
                <th style={{ width: 44 }}>คะแนน</th>
                <th style={{ width: 38 }}>เกรด</th>
                <th style={{ width: 44 }}>คะแนน</th>
                <th style={{ width: 38 }}>เกรด</th>
                <th style={{ width: 44 }}>คะแนน</th>
                <th style={{ width: 38 }}>เกรด</th>
              </>
            ) : (
              <>
                <th style={{ width: 60 }}>คะแนน</th>
                <th style={{ width: 50 }}>เกรด</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {report.rows.map((r) => (
            <tr key={r.subject.id}>
              <td className="text-center">{r.subject.order_no}</td>
              <td>{r.subject.name}</td>
              <td className="text-center">{r.subject.category}</td>
              <td className="text-center">{r.subject.credits}</td>
              {isYear ? (
                <>
                  <td className="text-center">{num(r.sem1Total)}</td>
                  <td className="text-center">{gradeText(r.sem1Grade)}</td>
                  <td className="text-center">{num(r.sem2Total)}</td>
                  <td className="text-center">{gradeText(r.sem2Grade)}</td>
                  <td className="text-center">{num(r.yearAvg)}</td>
                  <td className="text-center font-semibold">{gradeText(r.yearGrade)}</td>
                </>
              ) : (
                <>
                  <td className="text-center">{num(term === "1" ? r.sem1Total : r.sem2Total)}</td>
                  <td className="text-center font-semibold">
                    {gradeText(term === "1" ? r.sem1Grade : r.sem2Grade)}
                  </td>
                </>
              )}
              <td></td>
            </tr>
          ))}
          {Array.from({ length: blanks }).map((_, i) => (
            <tr key={`b${i}`}>
              <td>&nbsp;</td><td></td><td></td><td></td>
              <td></td><td></td>
              {isYear && <><td></td><td></td><td></td><td></td></>}
              <td></td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} className="text-center font-semibold shade">ผลการเรียนเฉลี่ย</td>
            <td colSpan={isYear ? 5 : 1} className="text-center font-bold">
              {report.gpa !== null ? report.gpa.toFixed(2) : "-"}
            </td>
            <td className="text-center shade">ลำดับที่</td>
            <td className="text-center font-semibold">{rank}</td>
          </tr>
        </tbody>
      </table>

      <table className="report-table" style={{ marginTop: 10 }}>
        <thead>
          <tr><th colSpan={3} className="text-center">สรุปผลการประเมินด้านต่าง ๆ</th></tr>
          <tr>
            <th>คุณลักษณะอันพึงประสงค์</th>
            <th>การอ่าน คิดวิเคราะห์ และเขียนสื่อความ</th>
            <th>กิจกรรมพัฒนาผู้เรียน</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-center" style={{ height: 28 }}>
            <td>{report.characteristicLevel || "-"}</td>
            <td>{report.readWriteLevel || "-"}</td>
            <td>{report.activityOverall || "-"}</td>
          </tr>
        </tbody>
      </table>

      <div className="grow" />

      <div className="grid grid-cols-2 gap-8 mt-8 text-center">
        <div>
          <div className="text-left">ลงชื่อ ...................................................</div>
          <div className="mt-1">( {cls?.homeroom_teacher_name || "..............................."} )</div>
          <div>ครูประจำชั้น</div>
        </div>
        <div>
          <div className="text-left">ลงชื่อ ...................................................</div>
          <div className="mt-1">( {school?.academic_head || "..............................."} )</div>
          <div>หัวหน้าฝ่ายวิชาการ</div>
        </div>
      </div>

      {isYear ? (
        <div className="flex items-end justify-between mt-6 gap-4">
          <table className="report-table" style={{ width: 260 }}>
            <thead><tr><th colSpan={2} className="text-center">สรุปผลการประเมิน</th></tr></thead>
            <tbody>
              <tr className="text-center"><td>เลื่อนชั้น/จบ</td><td>ซ้ำชั้น</td></tr>
              <tr className="text-center" style={{ height: 26 }}><td></td><td></td></tr>
            </tbody>
          </table>
          <div className="text-center flex-1">
            <div>วันที่อนุมัติผลการเรียน</div>
            <div className="mt-1">{school?.approve_date || "................................"}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-left">ลงชื่อ ว่าที่ ร.ต. ...............................</div>
            <div className="mt-1">( {school?.director || "..............................."} )</div>
            <div>{school?.director_position || "ผู้อำนวยการโรงเรียน"}</div>
          </div>
        </div>
      ) : (
        <div className="text-center mt-8">
          <div>ลงชื่อ ว่าที่ ร.ต. ...................................................</div>
          <div className="mt-1">( {school?.director || "..............................."} )</div>
          <div>{school?.director_position || "ผู้อำนวยการโรงเรียน"}</div>
        </div>
      )}
    </div>
  );
}
