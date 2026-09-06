import ScoreSummarySheet from "@/components/ScoreSummarySheet";
import { loadClassBundle } from "@/lib/report-data";
import { computeStudentReport } from "@/lib/report-compute";
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
          /> : <ScoreSummarySheet key={rep.student.id} school={school} cls={cls} report={rep} term={t} />
        ))}
        {students.length === 0 && (
          <div className="print-page text-center text-slate-400 pt-20">ยังไม่มีนักเรียนในห้องนี้</div>
        )}
      </div>
    </>
  );
}
