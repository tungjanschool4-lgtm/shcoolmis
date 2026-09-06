import { loadClassBundle } from "@/lib/report-data";
import { computeStudentReport } from "@/lib/report-compute";
import { fullName } from "@/lib/types";
import PrintToolbar from "@/components/PrintToolbar";
import { qualityLabelsFromSchool, type QualityLabels } from "@/lib/grading";

export const dynamic = "force-dynamic";

const GRADE_BUCKETS = [4, 3.5, 3, 2.5, 2, 1.5, 1, 0];

function levelToCol(level: string, labels: QualityLabels): number {
  if (level === labels.excellent) return 3;
  if (level === labels.good) return 2;
  if (level === labels.pass) return 1;
  if (level === labels.fail) return 0;
  return -1;
}

export default async function CoverPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const bundle = await loadClassBundle(classId);
  const { school, cls, students, subjects } = bundle;
  const qualityLabels = qualityLabelsFromSchool(school);
  const reports = students.map((s) => computeStudentReport(bundle, s));

  // นับเกรดรายวิชา
  const subjectCounts: Record<string, number[]> = {};
  for (const subj of subjects) subjectCounts[subj.id] = new Array(GRADE_BUCKETS.length).fill(0);
  for (const rep of reports) {
    for (const row of rep.rows) {
      if (row.yearGrade === null) continue;
      const idx = GRADE_BUCKETS.indexOf(row.yearGrade);
      if (idx >= 0) subjectCounts[row.subject.id][idx]++;
    }
  }

  // นับคุณลักษณะ / อ่านคิดเขียน / กิจกรรม / เพศ
  const charCount = [0, 0, 0, 0]; // index = col 3,2,1,0 -> store as [3,2,1,0]
  const rwCount = [0, 0, 0, 0];
  let actPass = 0;
  let male = 0;
  let female = 0;
  for (const rep of reports) {
    const c = levelToCol(rep.characteristicLevel, qualityLabels);
    if (c >= 0) charCount[3 - c]++;
    const r = levelToCol(rep.readWriteLevel, qualityLabels);
    if (r >= 0) rwCount[3 - r]++;
    if (rep.activityOverall === "ผ่าน") actPass++;
    if (rep.student.gender === "ชาย") male++;
    else if (rep.student.gender === "หญิง") female++;
  }

  return (
    <>
      <PrintToolbar title="ปก ปพ.5 + บัญชีรายชื่อ" />
      <div className="py-4 print:py-0">
        {/* ---- หน้าปกสรุป ---- */}
        <div className="print-page text-[12px]">
          <div className="text-right font-semibold">ปพ.5</div>
          <div className="text-center">
            {school?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={school.logo_url} alt="" className="mx-auto h-16 object-contain" />
            ) : null}
            <div className="text-lg font-bold mt-1">สมุดบันทึกการพัฒนาคุณภาพผู้เรียน</div>
            <div className="text-base font-semibold">{cls?.grade_level}</div>
          </div>

          <table className="w-full mt-3 text-[12px]">
            <tbody>
              <tr>
                <td className="py-0.5 w-24">โรงเรียน</td>
                <td className="border-b border-dotted border-slate-500">{school?.name}</td>
                <td className="py-0.5 w-24 pl-3">ตำบล/แขวง</td>
                <td className="border-b border-dotted border-slate-500">{school?.tambon}</td>
              </tr>
              <tr>
                <td className="py-0.5">อำเภอ/เขต</td>
                <td className="border-b border-dotted border-slate-500">{school?.amphoe}</td>
                <td className="py-0.5 pl-3">จังหวัด</td>
                <td className="border-b border-dotted border-slate-500">{school?.province}</td>
              </tr>
              <tr>
                <td className="py-0.5">สนง.เขตพื้นที่ฯ</td>
                <td className="border-b border-dotted border-slate-500">{school?.area}</td>
                <td className="py-0.5 pl-3">ปีการศึกษา</td>
                <td className="border-b border-dotted border-slate-500">
                  {school?.academic_year || cls?.academic_year} &nbsp; จำนวนนักเรียน {students.length} คน
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex gap-2 mt-3 items-start">
            {/* ตารางระดับผลการเรียนรายวิชา */}
            <table className="report-table" style={{ flex: 1 }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 24 }}>ที่</th>
                  <th rowSpan={2}>ชื่อวิชา</th>
                  <th colSpan={8}>ระดับผลการเรียนรายวิชา (คน)</th>
                </tr>
                <tr>
                  {GRADE_BUCKETS.map((g) => (
                    <th key={g} style={{ width: 26 }}>{g}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map((subj) => (
                  <tr key={subj.id}>
                    <td className="text-center">{subj.order_no}</td>
                    <td>{subj.name}</td>
                    {subjectCounts[subj.id].map((c, i) => (
                      <td key={i} className="text-center">{c || ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* แผงสรุปด้านขวา */}
            <div style={{ width: 230 }} className="space-y-2">
              <StatTable title="คุณลักษณะอันพึงประสงค์" cols={["3", "2", "1", "0"]} values={charCount} />
              <StatTable title="อ่าน คิดวิเคราะห์ เขียน" cols={["3", "2", "1", "0"]} values={rwCount} />
              <table className="report-table">
                <tbody>
                  <tr><td className="shade">กิจกรรมพัฒนาผู้เรียน (ผ่าน)</td><td className="text-center" style={{ width: 50 }}>{actPass}</td></tr>
                </tbody>
              </table>
              <table className="report-table">
                <thead><tr><th colSpan={2}>การอนุมัติผลการเรียน</th></tr></thead>
                <tbody>
                  <tr><td className="text-center shade">ชาย</td><td className="text-center shade">หญิง</td></tr>
                  <tr><td className="text-center">{male}</td><td className="text-center">{female}</td></tr>
                </tbody>
              </table>
              <table className="report-table">
                <tbody>
                  <tr><td>จำนวนนักเรียนในบัญชี</td><td className="text-center" style={{ width: 50 }}>{students.length}</td></tr>
                  <tr><td>เข้าระหว่างปี</td><td className="text-center"></td></tr>
                  <tr><td>ออกระหว่างปี</td><td className="text-center"></td></tr>
                  <tr><td>ตัดสินเลื่อนชั้นปลายปี</td><td className="text-center"></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ลายเซ็น */}
          <div className="grid grid-cols-2 gap-8 mt-8 text-center text-[12px]">
            <div>
              <div className="text-left">ลงชื่อ ...............................................</div>
              <div className="mt-1">( {cls?.homeroom_teacher_name || "..............................."} )</div>
              <div>ครูประจำชั้น</div>
            </div>
            <div>
              <div className="text-left">ลงชื่อ ...............................................</div>
              <div className="mt-1">( {school?.registrar_head || "..............................."} )</div>
              <div>หัวหน้าทะเบียนและวัดผล</div>
            </div>
          </div>
          <div className="text-center mt-5 text-[12px]">
            <div>ลงชื่อ ...............................................</div>
            <div className="mt-1">( {school?.academic_head || "..............................."} )</div>
            <div>หัวหน้าฝ่ายวิชาการ</div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-[12px]">
            <span>☐ อนุมัติ</span>
            <span>☐ ไม่อนุมัติ</span>
          </div>
          <div className="text-center mt-3 text-[12px]">
            <div>ลงชื่อ ว่าที่ ร.ต. ...............................................</div>
            <div className="mt-1">( {school?.director || "..............................."} )</div>
            <div>{school?.director_position || "ผู้อำนวยการโรงเรียน"}</div>
            <div className="mt-2">............../.........................../....................</div>
          </div>
        </div>

        {/* ---- บัญชีรายชื่อนักเรียน ---- */}
        {Array.from({ length: Math.max(1, Math.ceil(students.length / 30)) }, (_, pageIndex) => (<div key={pageIndex} className="print-page roster-sheet">
          <div className="text-center font-bold text-base mb-1">
            บัญชีรายชื่อนักเรียน {cls?.grade_level} {cls?.room ? `ห้อง ${cls.room}` : ""}
          </div>
          <div className="text-center mb-3">
            โรงเรียน{school?.name} ปีการศึกษา {school?.academic_year || cls?.academic_year}
          </div>
          <table className="report-table roster-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>เลขที่</th>
                <th style={{ width: 90 }}>เลขประจำตัว</th>
                <th style={{ width: 130 }}>เลขบัตรประชาชน</th>
                <th>ชื่อ - นามสกุล</th>
                <th style={{ width: 50 }}>เพศ</th>
                <th style={{ width: 60 }}>หมู่เลือด</th>
                <th style={{ width: 90 }}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {students.slice(pageIndex*30,(pageIndex+1)*30).map((s) => (
                <tr key={s.id}>
                  <td className="text-center">{s.no}</td>
                  <td className="text-center">{s.student_code}</td>
                  <td className="text-center">{s.national_id}</td>
                  <td>{fullName(s)}</td>
                  <td className="text-center">{s.gender}</td>
                  <td className="text-center">{s.blood_type}</td>
                  <td className="text-center">{s.status}</td>
                </tr>
              ))}
              {Array.from({length: Math.max(0,30-students.slice(pageIndex*30,(pageIndex+1)*30).length)}, (_, i) => <tr key={`blank-${i}`}><td className="text-center">{pageIndex*30+students.slice(pageIndex*30,(pageIndex+1)*30).length+i+1}</td>{Array.from({length:6},(_,j)=><td key={j}></td>)}</tr>)}
            </tbody>
          </table>
          <div className="mt-2 text-right">รวมนักเรียนทั้งสิ้น {students.length} คน (ชาย {male} · หญิง {female})</div>
        </div>))}
      </div>
    </>
  );
}

function StatTable({ title, cols, values }: { title: string; cols: string[]; values: number[] }) {
  return (
    <table className="report-table">
      <thead>
        <tr><th colSpan={cols.length}>{title}</th></tr>
        <tr>{cols.map((c) => <th key={c} style={{ width: 40 }}>{c}</th>)}</tr>
      </thead>
      <tbody>
        <tr>{values.map((v, i) => <td key={i} className="text-center">{v || ""}</td>)}</tr>
      </tbody>
    </table>
  );
}
