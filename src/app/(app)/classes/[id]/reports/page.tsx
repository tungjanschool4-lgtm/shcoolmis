import Link from "next/link";

export default async function ReportsHub({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const groups = [
    {
      title: "รายงานผลการพัฒนาคุณภาพผู้เรียน (รายคน)",
      desc: "แบบรายงานรายบุคคล เต็มหน้า A4 ตามแบบ ปพ.5 — เลือกภาคเรียน/รายปี",
      icon: "🧑‍🎓",
      links: [
        { href: `/print/${id}/report-person?term=1`, label: "ภาคเรียนที่ 1" },
        { href: `/print/${id}/report-person?term=2`, label: "ภาคเรียนที่ 2" },
        { href: `/print/${id}/report-person?term=year`, label: "รายปี" },
      ],
    },
    {
      title: "รายงานผลการพัฒนาฯ (แบบเทียบโอน)",
      desc: "แบบรายงานตามโครงสร้างหลักสูตร 2560 ดึงคะแนนจากวิชาหลักสูตรใหม่ที่จับคู่ไว้ พร้อมภาพรวมและสถิติ",
      icon: "🔄",
      links: [
        { href: `/print/${id}/report-transfer?term=1`, label: "ภาคเรียนที่ 1" },
        { href: `/print/${id}/report-transfer?term=2`, label: "ภาคเรียนที่ 2" },
        { href: `/print/${id}/report-transfer?term=year`, label: "รายปี" },
        { href: `/print/${id}/transfer-summary?term=1`, label: "ภาพรวม / สถิติ" },
      ],
    },
    {
      title: "ตารางคะแนนรายวิชา",
      desc: "ตารางสรุปคะแนน/เกรดทั้งห้อง แยกรายวิชา (ระหว่างภาค/ปลายภาค/รวม/ผล 2 ภาคเรียน)",
      icon: "📊",
      links: [{ href: `/print/${id}/subject-scores`, label: "เปิดทุกวิชา" }],
    },
    {
      title: "ปก ปพ.5 และบัญชีรายชื่อนักเรียน",
      desc: "หน้าปกสมุดบันทึกการพัฒนาคุณภาพผู้เรียน (สรุปสถิติ) + บัญชีรายชื่อนักเรียน",
      icon: "📔",
      links: [{ href: `/print/${id}/cover`, label: "เปิดหน้าปก + รายชื่อ" }],
    },
    {
      title: "เกณฑ์การประเมิน",
      desc: "หน้าเกณฑ์การตัดสินผลการเรียน คุณลักษณะ อ่านคิดวิเคราะห์เขียน และสูตรคำนวณ",
      icon: "📐",
      links: [{ href: `/print/${id}/criteria`, label: "เปิดหน้าเกณฑ์" }],
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {groups.map((g) => (
        <div key={g.title} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="text-3xl">{g.icon}</div>
          <div className="mt-3 font-semibold text-slate-800">{g.title}</div>
          <div className="text-sm text-slate-500 mt-1">{g.desc}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {g.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                target="_blank"
                className="inline-block rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 text-sm"
              >
                {l.label} ↗
              </Link>
            ))}
          </div>
        </div>
      ))}
      <p className="sm:col-span-2 text-xs text-slate-400">
        เปิดหน้าพิมพ์ → กด “พิมพ์ / บันทึกเป็น PDF” → เลือกปลายทาง “บันทึกเป็น PDF” และตั้งขนาดกระดาษ A4 ขอบ (Margins) เป็นค่าเริ่มต้น
      </p>
    </div>
  );
}
