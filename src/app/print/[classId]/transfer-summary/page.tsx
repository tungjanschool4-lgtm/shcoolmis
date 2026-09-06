import PrintToolbar from "@/components/PrintToolbar";
import ReportHeader from "@/components/ReportHeader";
import { loadClassBundle } from "@/lib/report-data";
import {
  computeTransferReport,
  rankByGpaTransfer,
  type TransferTerm,
} from "@/lib/report-compute";
import { fullName } from "@/lib/types";

export const dynamic = "force-dynamic";

function termLabel(term: TransferTerm): string {
  return term === "year" ? "รายปี" : `ภาคเรียนที่ ${term}`;
}

function formatScore(value: number | null): string {
  return value === null ? "-" : value.toFixed(2);
}

export default async function TransferSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const { classId } = await params;
  const { term = "1" } = await searchParams;
  const selectedTerm = (term === "2" || term === "year" ? term : "1") as TransferTerm;
  const bundle = await loadClassBundle(classId);
  const { school, cls, students } = bundle;
  const reports = students.map((student) => computeTransferReport(bundle, student, selectedTerm));
  const ranks = rankByGpaTransfer(reports);
  const rankedReports = [...reports].sort((a, b) => {
    const rankA = ranks.get(a.student.id) ?? Number.MAX_SAFE_INTEGER;
    const rankB = ranks.get(b.student.id) ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB || a.student.no - b.student.no;
  });

  const subjectStats = bundle.transferSubjects
    .filter((subject) => subject.enabled)
    .sort((a, b) => a.order_no - b.order_no)
    .map((subject) => {
      const rows = reports
        .map((report) => report.rows.find((row) => row.transferSubject.id === subject.id))
        .filter((row) => row && row.score !== null);
      const scores = rows.map((row) => row!.score!);
      const passed = rows.filter((row) => (row!.grade ?? 0) >= 1).length;
      return {
        subject,
        recorded: rows.length,
        average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
        highest: scores.length ? Math.max(...scores) : null,
        passed,
        passPercent: rows.length ? (passed / rows.length) * 100 : null,
      };
    });

  return (
    <>
      <PrintToolbar title={`ภาพรวมการเทียบโอน (${termLabel(selectedTerm)})`} />
      <div className="py-4 print:py-0">
        <div className="print-page sheet transfer-overview-sheet text-[14px]">
          <ReportHeader school={school} cls={cls} title={`ภาพรวมผลการเทียบโอนหลักสูตร 2560 (${termLabel(selectedTerm)})`} />
          <h2 className="mt-6 mb-3 text-center text-lg font-semibold">ลำดับผลการเรียนเฉลี่ยของนักเรียน</h2>
          <table className="report-table transfer-overview-table">
            <thead>
              <tr>
                <th style={{ width: "10%" }}>ลำดับที่</th>
                <th style={{ width: "10%" }}>เลขที่</th>
                <th>ชื่อ - นามสกุล</th>
                <th style={{ width: "18%" }}>ผลการเรียนเฉลี่ย</th>
              </tr>
            </thead>
            <tbody>
              {rankedReports.map((report) => (
                <tr key={report.student.id}>
                  <td className="text-center font-semibold">{ranks.get(report.student.id) ?? "-"}</td>
                  <td className="text-center">{report.student.no}</td>
                  <td>{fullName(report.student)}</td>
                  <td className="text-center font-semibold">{report.gpa === null ? "-" : report.gpa.toFixed(2)}</td>
                </tr>
              ))}
              {rankedReports.length === 0 && (
                <tr><td colSpan={4} className="text-center text-slate-500">ยังไม่มีข้อมูลนักเรียน</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="print-page sheet transfer-overview-sheet text-[14px]">
          <ReportHeader school={school} cls={cls} title={`สถิติรายวิชาเทียบโอนหลักสูตร 2560 (${termLabel(selectedTerm)})`} />
          <table className="report-table transfer-overview-table mt-6">
            <thead>
              <tr>
                <th style={{ width: "7%" }}>ที่</th>
                <th>รายวิชา</th>
                <th style={{ width: "12%" }}>ประเภท</th>
                <th style={{ width: "10%" }}>น้ำหนัก</th>
                <th style={{ width: "12%" }}>ผู้มีคะแนน</th>
                <th style={{ width: "12%" }}>คะแนนเฉลี่ย</th>
                <th style={{ width: "12%" }}>คะแนนสูงสุด</th>
                <th style={{ width: "12%" }}>ผ่าน (%)</th>
              </tr>
            </thead>
            <tbody>
              {subjectStats.map((stat) => (
                <tr key={stat.subject.id}>
                  <td className="text-center">{stat.subject.order_no}</td>
                  <td>{stat.subject.name}</td>
                  <td className="text-center">{stat.subject.category}</td>
                  <td className="text-center">{stat.subject.credits}</td>
                  <td className="text-center">{stat.recorded}</td>
                  <td className="text-center">{formatScore(stat.average)}</td>
                  <td className="text-center">{formatScore(stat.highest)}</td>
                  <td className="text-center">{stat.passPercent === null ? "-" : `${stat.passPercent.toFixed(1)}%`}</td>
                </tr>
              ))}
              {subjectStats.length === 0 && (
                <tr><td colSpan={8} className="text-center text-slate-500">ยังไม่มีรายวิชาเทียบโอน</td></tr>
              )}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            ร้อยละผ่านคำนวณจากผู้เรียนที่มีคะแนนและได้ผลการเรียนตั้งแต่ 1 ขึ้นไป
          </p>
        </div>
      </div>
    </>
  );
}
