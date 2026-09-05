import { loadClassBundle } from "@/lib/report-data";
import { computeStudentReport, rankByGpa } from "@/lib/report-compute";
import PrintToolbar from "@/components/PrintToolbar";
import PersonReportSheet from "@/components/PersonReportSheet";

export const dynamic = "force-dynamic";

export default async function ReportPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const { classId } = await params;
  const { term = "year" } = await searchParams;
  const t = (term === "1" || term === "2" ? term : "year") as "1" | "2" | "year";

  const bundle = await loadClassBundle(classId);
  const { school, cls, students } = bundle;
  const reports = students.map((s) => computeStudentReport(bundle, s));
  const ranks = rankByGpa(reports);

  return (
    <>
      <PrintToolbar title={`รายงานรายคน (${t === "year" ? "รายปี" : "ภาคเรียนที่ " + t})`} />
      <div className="py-4">
        {reports.map((rep) => (
          <PersonReportSheet
            key={rep.student.id}
            school={school}
            cls={cls}
            report={rep}
            rank={ranks.get(rep.student.id) ?? "-"}
            total={students.length}
            term={t}
          />
        ))}
        {students.length === 0 && (
          <div className="print-page text-center text-slate-400 pt-20">ยังไม่มีนักเรียนในห้องนี้</div>
        )}
      </div>
    </>
  );
}
