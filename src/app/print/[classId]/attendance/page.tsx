import { createClient } from "@/lib/supabase/server";
import type { AttendanceRecord, ClassRoom, School, SchoolDay, Student } from "@/lib/types";
import { fullName } from "@/lib/types";
import { dateKey, dateParts, daysInMonth, termMonths, THAI_MONTHS, THAI_WEEKDAYS } from "@/lib/academic-calendar";
import PrintToolbar from "@/components/PrintToolbar";

export const dynamic = "force-dynamic";

export default async function AttendancePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const { classId } = await params;
  const { term = "1" } = await searchParams;
  const selectedTerm = term === "2" ? 2 : 1;
  const supabase = await createClient();
  const [{ data: school }, { data: cls }, { data: students }, { data: days }, { data: records }] = await Promise.all([
    supabase.from("school").select("*").eq("id", 1).single(),
    supabase.from("classes").select("*").eq("id", classId).single(),
    supabase.from("students").select("*").eq("class_id", classId).order("no"),
    supabase.from("school_days").select("*").eq("class_id", classId).eq("term", selectedTerm).order("school_date"),
    supabase.from("attendance_records").select("*, students!inner(class_id)").eq("students.class_id", classId),
  ]);

  const schoolData = school as School | null;
  const classData = cls as ClassRoom | null;
  const studentRows = (students as Student[]) ?? [];
  const schoolDays = (days as SchoolDay[]) ?? [];
  const attendance = (records as AttendanceRecord[]) ?? [];
  const calendarMonths = termMonths(classData?.academic_year || "", selectedTerm);
  const selectedDates = new Set(schoolDays.map((day) => day.school_date));
  const grouped = new Map<string, SchoolDay[]>();
  for (const day of schoolDays) {
    const key = day.school_date.slice(0, 7);
    grouped.set(key, [...(grouped.get(key) ?? []), day]);
  }
  const statusOf = (studentId: string, dayId: string) => attendance.find((record) => record.student_id === studentId && record.school_day_id === dayId)?.status || "";

  return (
    <>
      <PrintToolbar title={`ตารางเวลาเรียน ภาคเรียนที่ ${selectedTerm}`} />
      <div className="py-4 print:py-0">
        <div className="print-page landscape attendance-print-page calendar-print-page">
          <div className="attendance-print-title">ปฏิทินกำหนดวันเปิดเรียน</div>
          <div className="attendance-print-subtitle">
            โรงเรียน{schoolData?.name || ""} {classData?.grade_level || ""} {classData?.room ? `ห้อง ${classData.room}` : ""}
            {` ภาคเรียนที่ ${selectedTerm} ปีการศึกษา ${classData?.academic_year || ""}`}
          </div>
          <div className="attendance-legend">ช่องที่มีวันในสัปดาห์ คือ วันที่เปิดเรียน</div>
          <table className="academic-calendar-table">
            <thead>
              <tr>
                <th className="calendar-month-name">เดือน</th>
                {Array.from({ length: 31 }, (_, index) => <th key={index + 1}>{index + 1}</th>)}
                <th className="calendar-total">รวมวันเรียน</th>
              </tr>
            </thead>
            <tbody>
              {calendarMonths.map((month) => {
                const count = daysInMonth(month.year, month.month);
                const openCount = Array.from({ length: count }, (_, index) => dateKey(month.year, month.month, index + 1))
                  .filter((value) => selectedDates.has(value)).length;
                return (
                  <tr key={`${month.year}-${month.month}`}>
                    <th>{THAI_MONTHS[month.month]}<br /><span>{month.year + 543}</span></th>
                    {Array.from({ length: 31 }, (_, index) => {
                      const day = index + 1;
                      if (day > count) return <td key={day} className="calendar-disabled"></td>;
                      const value = dateKey(month.year, month.month, day);
                      const selected = selectedDates.has(value);
                      const weekday = dateParts(value).weekday;
                      return <td key={day} className={selected ? "calendar-open" : ""}>{selected ? THAI_WEEKDAYS[weekday] : ""}</td>;
                    })}
                    <td className="calendar-total-value">{openCount}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr><th colSpan={32}>รวมวันเปิดเรียน ภาคเรียนที่ {selectedTerm}</th><th>{schoolDays.length} วัน</th></tr>
            </tfoot>
          </table>
          <div className="attendance-signatures calendar-signatures">
            <div>ลงชื่อ ........................................................ ครูประจำชั้น<br />( {classData?.homeroom_teacher_name || "................................"} )</div>
            <div>ลงชื่อ ........................................................ หัวหน้าฝ่ายวิชาการ<br />( {schoolData?.academic_head || "................................"} )</div>
          </div>
        </div>
        {[...grouped.entries()].map(([monthKey, monthDays]) => {
          const parts = dateParts(`${monthKey}-01`);
          return (
            <div key={monthKey} className="print-page landscape attendance-print-page">
              <div className="attendance-print-title">ตารางบันทึกเวลาเรียน</div>
              <div className="attendance-print-subtitle">
                โรงเรียน{schoolData?.name || ""} {classData?.grade_level || ""} {classData?.room ? `ห้อง ${classData.room}` : ""}
                {` ภาคเรียนที่ ${selectedTerm} เดือน${THAI_MONTHS[parts.month]} พ.ศ. ${parts.year + 543}`}
              </div>
              <div className="attendance-legend">/ = มาเรียน &nbsp;&nbsp; ข = ขาดเรียน &nbsp;&nbsp; ล = ลา</div>
              <table className="attendance-print-table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="attendance-no">ที่</th>
                    <th rowSpan={2} className="attendance-name">ชื่อ - นามสกุล</th>
                    {monthDays.map((day) => { const value = dateParts(day.school_date); return <th key={day.id}>{value.day}</th>; })}
                    <th colSpan={3}>สรุป</th>
                  </tr>
                  <tr>
                    {monthDays.map((day) => { const value = dateParts(day.school_date); return <th key={day.id}>{THAI_WEEKDAYS[value.weekday]}</th>; })}
                    <th>/</th><th>ข</th><th>ล</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((student) => {
                    const values = monthDays.map((day) => statusOf(student.id, day.id));
                    return (
                      <tr key={student.id}>
                        <td>{student.no}</td>
                        <td className="text-left">{fullName(student)}</td>
                        {monthDays.map((day) => <td key={day.id} className="font-semibold">{statusOf(student.id, day.id)}</td>)}
                        <td>{values.filter((value) => value === "/").length}</td>
                        <td>{values.filter((value) => value === "ข").length}</td>
                        <td>{values.filter((value) => value === "ล").length}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr><th colSpan={2}>รวมวันเปิดเรียน</th><th colSpan={monthDays.length}>{monthDays.length} วัน</th><th colSpan={3}></th></tr>
                </tfoot>
              </table>
              <div className="attendance-signatures">
                <div>ลงชื่อ ........................................................ ครูประจำชั้น<br />( {classData?.homeroom_teacher_name || "................................"} )</div>
                <div>ลงชื่อ ........................................................ หัวหน้าฝ่ายวิชาการ<br />( {schoolData?.academic_head || "................................"} )</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
