import { loadClassBundle } from "@/lib/report-data";
import { computeTransferReport, rankByGpaTransfer } from "@/lib/report-compute";
import { gradeText } from "@/lib/grading";
import { fullName } from "@/lib/types";
import PrintToolbar from "@/components/PrintToolbar";
import ReportHeader from "@/components/ReportHeader";

export const dynamic = "force-dynamic";

function num(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "-";
  return String(Math.round(v));
}

export default async function ReportTransferPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const bundle = await loadClassBundle(classId);
  const { school, cls, students } = bundle;
  const year = school?.academic_year || cls?.academic_year || "";

  const reports = students.map((s) => computeTransferReport(bundle, s));
  const ranks = rankByGpaTransfer(reports);
  const minRows = 13;

  if (bundle.transferSubjects.filter((t) => t.enabled).length === 0) {
    return (
      <>
        <PrintToolbar title="รายงานเทียบโอน (รายปี)" />
        <div className="print-page text-center text-slate-500 pt-20">
          ยังไม่ได้ตั้งค่าวิชาเทียบโอนของห้องนี้ — ไปที่แท็บ “เทียบโอน” เพื่อเลือกวิชาและจับคู่ก่อน
        </div>
      </>
    );
  }

  return (
    <>
      <PrintToolbar title="รายงานเทียบโอน (รายปี)" />
      <div className="py-4">
        {reports.map((rep) => {
          const s = rep.student;
          const blanks = Math.max(0, minRows - rep.rows.length);
          return (
            <div key={s.id} className="print-page sheet text-[13px]" style={{ lineHeight: 1.35 }}>
              <ReportHeader school={school} cls={cls} title="แบบรายงานผลการพัฒนาคุณภาพผู้เรียน" />

              <div className="flex justify-between mt-2 mb-1 px-1">
                <div>เลขที่ <span className="underline px-4">{s.no}</span></div>
                <div>ชื่อ - นามสกุล <span className="underline px-2">{fullName(s)}</span></div>
                <div>เลขประจำตัว {s.student_code || "-"}</div>
              </div>

              <table className="report-table">
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ width: 28 }}>ที่</th>
                    <th rowSpan={2} style={{ width: 60 }}>รหัสวิชา</th>
                    <th rowSpan={2}>ชื่อวิชา</th>
                    <th rowSpan={2} style={{ width: 66 }}>ประเภทวิชา</th>
                    <th rowSpan={2} style={{ width: 42 }}>น้ำหนัก</th>
                    <th colSpan={2}>ปีการศึกษา {year}</th>
                    <th rowSpan={2} style={{ width: 54 }}>หมายเหตุ</th>
                  </tr>
                  <tr>
                    <th style={{ width: 54 }}>คะแนน</th>
                    <th style={{ width: 46 }}>เกรด</th>
                  </tr>
                </thead>
                <tbody>
                  {rep.rows.map((r) => (
                    <tr key={r.transferSubject.id}>
                      <td className="text-center">{r.transferSubject.order_no}</td>
                      <td className="text-center">{r.transferSubject.code}</td>
                      <td>{r.transferSubject.name}</td>
                      <td className="text-center">{r.transferSubject.category}</td>
                      <td className="text-center">{r.transferSubject.credits}</td>
                      <td className="text-center">{num(r.score)}</td>
                      <td className="text-center font-semibold">{gradeText(r.grade)}</td>
                      <td></td>
                    </tr>
                  ))}
                  {Array.from({ length: blanks }).map((_, i) => (
                    <tr key={`b${i}`}>
                      <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5} className="text-center font-semibold shade">ผลการเรียนเฉลี่ย</td>
                    <td className="text-center font-bold">{rep.gpa !== null ? rep.gpa.toFixed(2) : "-"}</td>
                    <td className="text-center shade">ลำดับที่</td>
                    <td className="text-center font-semibold">{ranks.get(s.id) ?? "-"}</td>
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
                    <td>{rep.characteristicLevel || "-"}</td>
                    <td>{rep.readWriteLevel || "-"}</td>
                    <td>{rep.activityOverall || "-"}</td>
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

              <div className="text-center mt-8">
                <div>ลงชื่อ ว่าที่ ร.ต. ...................................................</div>
                <div className="mt-1">( {school?.director || "..............................."} )</div>
                <div>{school?.director_position || "ผู้อำนวยการโรงเรียน"}</div>
              </div>
            </div>
          );
        })}
        {students.length === 0 && (
          <div className="print-page text-center text-slate-400 pt-20">ยังไม่มีนักเรียนในห้องนี้</div>
        )}
      </div>
    </>
  );
}
