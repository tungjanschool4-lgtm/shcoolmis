import ReportHeader from "@/components/ReportHeader";
import { computeGPA, gradeText } from "@/lib/grading";
import { fullName, type School, type ClassRoom } from "@/lib/types";
import type { StudentReport } from "@/lib/report-compute";

export default function ScoreSummarySheet({school, cls, report, term, rank}: {
  school: School | null; cls: ClassRoom | null; report: StudentReport; term: "1" | "2" | "year"; rank?: number;
}) {
  const key = term === "year" ? "year" : term === "1" ? "sem1" : "sem2";
  const rows = report.rows.map(row => ({subject: row.subject,
    score: term === "year" ? row.yearAvg : term === "1" ? row.sem1Total : row.sem2Total,
    grade: term === "year" ? row.yearGrade : term === "1" ? row.sem1Grade : row.sem2Grade}));
  const gpa = computeGPA(rows.map(row => ({credits:row.subject.credits,yearGrade:row.grade})));
  return <div className="print-page sheet transfer-sheet score-summary-sheet">
    <ReportHeader school={school} cls={cls} title={`แบบรายงานผลการพัฒนาคุณภาพผู้เรียน (${term === "year" ? "รายปี" : `ภาคเรียนที่ ${term}`})`} />
    <div className="student-heading-line mt-1 mb-2"><span>เลขที่ {report.student.no}</span><span>ชื่อ - นามสกุล {fullName(report.student)}</span></div>
    <table className="report-table transfer-report-table">
      <colgroup>{[7,37,11,10,12,12,11].map((width,i)=><col key={i} style={{width:`${width}%`}} />)}</colgroup>
      <thead><tr><th rowSpan={2}>ที่</th><th rowSpan={2}>ชื่อวิชา</th><th rowSpan={2}>ประเภทวิชา</th><th rowSpan={2}><span className="vtext">น้ำหนัก</span></th><th colSpan={2}>{term === "year" ? "รายปี" : `ภาคเรียนที่ ${term}`}</th><th rowSpan={2}><span className="vtext">ผลเทียบโอน</span></th></tr><tr><th><span className="vtext">คะแนน</span></th><th><span className="vtext">เกรด</span></th></tr></thead>
      <tbody>{rows.map(row=><tr key={row.subject.id}><td className="text-center">{row.subject.order_no}</td><td>{row.subject.name}</td><td className="text-center">{row.subject.category}</td><td className="text-center">{row.subject.credits}</td><td className="text-center">{row.score ?? "-"}</td><td className="text-center">{gradeText(row.grade) || "-"}</td><td></td></tr>)}
      {Array.from({length:Math.max(0,12-rows.length)},(_,i)=><tr key={`blank-${i}`}>{Array.from({length:7},(_,j)=><td key={j}>&nbsp;</td>)}</tr>)}
      </tbody><tfoot><tr><td colSpan={4} className="text-center">ผลการเรียนเฉลี่ย</td><td className="text-center font-bold">{gpa?.toFixed(2) ?? "-"}</td><td className="text-center">ลำดับที่</td><td className="text-center">{rank ?? "-"}</td></tr></tfoot>
    </table>
    <table className="report-table transfer-summary-table"><thead><tr><th colSpan={3}>สรุปผลการประเมินด้านต่าง ๆ</th></tr><tr><th>คุณลักษณะอันพึงประสงค์</th><th>สมรรถนะของผู้เรียน</th><th>กิจกรรมพัฒนาผู้เรียน</th></tr></thead><tbody><tr className="text-center"><td>{report.assessmentLevels.characteristic[key] || "-"}</td><td>{report.assessmentLevels.competency[key] || "-"}</td><td>{report.activityLevels[key] || "-"}</td></tr></tbody></table>
    <div className="grid grid-cols-2 gap-8 mt-3 text-center transfer-signatures">
      <div><div>ลงชื่อ ...................................................</div><div>( {cls?.homeroom_teacher_name || "........................"} )</div><div>ครูประจำชั้น</div></div>
      <div><div>ลงชื่อ ...................................................</div><div>( {school?.academic_head || "........................"} )</div><div>หัวหน้าฝ่ายวิชาการ</div></div>
    </div>
    <div className="mt-4 text-center transfer-signatures"><div>ลงชื่อ ...................................................</div><div>( {school?.director || "........................"} )</div><div>{school?.director_position || `ผู้อำนวยการโรงเรียน${school?.name || ""}`}</div></div>
  </div>;
}
