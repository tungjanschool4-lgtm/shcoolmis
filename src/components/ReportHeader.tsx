import type { School, ClassRoom } from "@/lib/types";

export default function ReportHeader({
  school,
  cls,
  title,
  showLogo = true,
}: {
  school: School | null;
  cls: ClassRoom | null;
  title: string;
  showLogo?: boolean;
}) {
  const year = cls?.academic_year || school?.academic_year || "";
  return (
    <div className="sheet-title">
      {showLogo && school?.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={school.logo_url} alt="" className="mx-auto h-16 object-contain mb-1" />
      ) : null}
      <div className="text-lg font-bold">โรงเรียน{school?.name || "..............."}</div>
      <div className="text-base font-semibold">{title}</div>
      <div>
        {cls?.grade_level} {cls?.room ? `ห้อง ${cls.room}` : ""} ปีการศึกษา {year}
      </div>
    </div>
  );
}
