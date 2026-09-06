import { loadClassBundle } from "@/lib/report-data";
import { gradeText, gradeMeaning, qualityLabelsFromSchool } from "@/lib/grading";
import PrintToolbar from "@/components/PrintToolbar";

export const dynamic = "force-dynamic";

export default async function CriteriaPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const { criteria, school } = await loadClassBundle(classId);
  const sorted = [...criteria].sort((a, b) => b.min_score - a.min_score);
  const qualityLabels = qualityLabelsFromSchool(school);

  return (
    <>
      <PrintToolbar title="เกณฑ์การประเมิน" />
      <div className="py-4">
        <div className="print-page text-[14px]">
          <div className="text-center font-bold text-lg mb-4">เกณฑ์การประเมินผลการเรียน</div>

          <table className="report-table" style={{ maxWidth: 620, margin: "0 auto" }}>
            <thead>
              <tr>
                <th style={{ width: 150 }}>ระดับผลการเรียน</th>
                <th>ความหมาย</th>
                <th style={{ width: 130 }}>ช่วงคะแนน</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => {
                const upper = i === 0 ? 100 : sorted[i - 1].min_score - 1;
                return (
                  <tr key={c.id} className="text-center" style={{ height: 26 }}>
                    <td>{gradeText(c.grade_point)}</td>
                    <td>ผลการเรียน {gradeMeaning(c.grade_point)}</td>
                    <td>{c.min_score} - {upper}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <table className="w-full mt-6 text-[13px]">
            <tbody>
              <tr>
                <td className="font-semibold w-40 align-top py-1">บันทึกเวลาเรียน</td>
                <td className="border-b border-slate-400 py-1">
                  ป หมายถึง ป่วย, ข หมายถึง ขาด, ล หมายถึง ลากิจ และ / หมายถึง มาเรียน
                </td>
              </tr>
              <tr>
                <td className="font-semibold align-top py-1">กิจกรรมพัฒนาผู้เรียน</td>
                <td className="border-b border-slate-400 py-1">มี 2 เกณฑ์ คือ ผ่าน (ผ) กับ ไม่ผ่าน (มผ)</td>
              </tr>
            </tbody>
          </table>

          <div className="font-semibold mt-6 mb-1">
            เกณฑ์ในการตัดสินคุณลักษณะอันพึงประสงค์ และ การอ่าน คิดวิเคราะห์ เขียนสื่อความ
          </div>
          <table className="report-table" style={{ maxWidth: 620 }}>
            <thead>
              <tr>
                <th style={{ width: 120 }}>คะแนน</th>
                <th>ความหมาย</th>
                <th style={{ width: 130 }}>ช่วงคะแนน</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-center"><td>3</td><td>{qualityLabels.excellent}</td><td>2.5 - 3</td></tr>
              <tr className="text-center"><td>2</td><td>{qualityLabels.good}</td><td>1.5 - 2.49</td></tr>
              <tr className="text-center"><td>1</td><td>{qualityLabels.pass}</td><td>1 - 1.49</td></tr>
              <tr className="text-center"><td>0</td><td>{qualityLabels.fail}</td><td>0 - 0.99</td></tr>
            </tbody>
          </table>

          <div className="mt-6 space-y-3 text-[13px]">
            <div>
              <span className="font-semibold">เกณฑ์ในการตัดสินตัวชี้วัดรายวิชา</span>
              <span className="ml-4 border-b border-slate-400 px-8">ต้องผ่านทุกตัวชี้วัด</span>
            </div>
            <Formula label="สูตรในการหาร้อยละของเวลาเรียน" top="เวลามาเรียน × 100" bottom="เวลาเรียนทั้งหมด" />
            <Formula label="สูตรในการหาร้อยละของตัวชี้วัด" top="จำนวนตัวชี้วัดที่ผ่าน × 100" bottom="จำนวนตัวชี้วัดทั้งหมด" />
            <Formula label="สูตรในการหาค่าเฉลี่ยของแบบประเมิน" top="ผลรวมของคะแนนประเมินทั้งหมด" bottom="จำนวนข้อของแบบประเมิน" />
          </div>
        </div>
      </div>
    </>
  );
}

function Formula({ label, top, bottom }: { label: string; top: string; bottom: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-semibold w-64">{label}</span>
      <span>=</span>
      <span className="inline-block text-center">
        <span className="block border-b border-slate-700 px-3 pb-0.5">{top}</span>
        <span className="block pt-0.5">{bottom}</span>
      </span>
    </div>
  );
}
