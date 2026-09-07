import ScoreSummarySheet from "@/components/ScoreSummarySheet";
import { loadClassBundle } from "@/lib/report-data";
import { computeStudentReport, type StudentReport } from "@/lib/report-compute";
import { computeGPA } from "@/lib/grading";
import PrintToolbar from "@/components/PrintToolbar";
import PersonReportSheet from "@/components/PersonReportSheet";

export const dynamic = "force-dynamic";

export default async function ReportPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ term?: string; detail?: string }>;
}) {
  const { classId } = await params;
  const { term = "year", detail } = await searchParams;
  const t = (term === "1" || term === "2" ? term : "year") as "1" | "2" | "year";

  const bundle = await loadClassBundle(classId);
  const { school, cls, students } = bundle;
  const reports = students.map((s) => computeStudentReport(bundle, s));

  // ลำดับที่ตามผลการเรียนเฉลี่ยของภาค/ปีที่เลือก (ใช้ในแบบสรุปเกรด)
  const termGrade = (r: StudentReport["rows"][number]) =>
    t === "1" ? r.sem1Grade : t === "2" ? r.sem2Grade : r.yearGrade;
  const ranks = new Map<string, number>();
  {
    const gpas = reports
      .map((rep) => ({
        id: rep.student.id,
        gpa: computeGPA(rep.rows.map((r) => ({ credits: r.subject.credits, yearGrade: termGrade(r) }))),
      }))
      .filter((x) => x.gpa !== null)
      .sort((a, b) => (b.gpa ?? 0) - (a.gpa ?? 0));
    let rank = 0;
    let prev: number | null = null;
    gpas.forEach((x, i) => {
      if (prev === null || x.gpa !== prev) rank = i + 1;
      ranks.set(x.id, rank);
      prev = x.gpa;
    });
  }

  return (
    <>
      <PrintToolbar title={`รายงานรายคน (${t === "year" ? "รายปี" : "ภาคเรียนที่ " + t})`} />
      <div className="py-4 print:py-0">
        {reports.map((rep) => (
          detail === "1" ? <PersonReportSheet
            key={rep.student.id}
            school={school}
            cls={cls}
            report={rep}
            term={t}
            competencyLevels={bundle.subjectCompetencyLevels}
          /> : <ScoreSummarySheet key={rep.student.id} school={school} cls={cls} report={rep} term={t} rank={ranks.get(rep.student.id)} />
        ))}
        {students.length === 0 && (
          <div className="print-page text-center text-slate-400 pt-20">ยังไม่มีนักเรียนในห้องนี้</div>
        )}
      </div>
    </>
  );
}
