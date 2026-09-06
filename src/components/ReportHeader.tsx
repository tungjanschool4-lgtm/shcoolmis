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
    <header className="sheet-title document-letterhead">
      {showLogo && school?.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={school.logo_url} alt="ตราโรงเรียน" className="document-letterhead-logo" />
      ) : null}
      <div className="document-school-name">โรงเรียน{school?.name || "..............."}</div>
      <div className="document-report-title">{title}</div>
      <div className="document-class-line">
        {cls?.grade_level} {cls?.room ? `ห้อง ${cls.room}` : ""} ปีการศึกษา {year}
      </div>
    </header>
  );
}
