import { createClient } from "@/lib/supabase/server";
import type { AttendanceRecord, ClassRoom, School, SchoolDay, Student } from "@/lib/types";

import { dateKey, dateParts, daysInMonth, termMonths, THAI_MONTHS, THAI_WEEKDAYS, toBuddhistYear } from "@/lib/academic-calendar";
import PrintToolbar from "@/components/PrintToolbar";

export const dynamic = "force-dynamic";

export default async function AttendancePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ term?: string; year?: string }>;
}) {
  const { classId } = await params;
  const { term = "1", year } = await searchParams;
  const selectedTerm = term === "2" ? 2 : 1;
  const supabase = await createClient();
  const { data: cls } = await supabase.from("classes").select("*").eq("id", classId).single();
  const classData = cls as ClassRoom | null;
  const [{ data: school }, { data: students }, { data: days }, { data: records }] = await Promise.all([
    supabase.from("school").select("*").eq("id", classData?.school_id ?? -1).single(),
    supabase.from("students").select("*").eq("class_id", classId).order("no"),
    supabase.from("school_days").select("*").eq("class_id", classId).eq("term", selectedTerm).order("school_date"),
    supabase.from("attendance_records").select("*, students!inner(class_id)").eq("students.class_id", classId),
  ]);

  const schoolData = school as School | null;
  const studentRows = (students as Student[]) ?? [];
  const selectedYear = /^\d{4}$/.test(year || "") ? Number(year) : toBuddhistYear(classData?.academic_year || "");
  const calendarMonths = termMonths(String(selectedYear), selectedTerm);
  const monthPrefixes = new Set(calendarMonths.map((month) => `${month.year}-${String(month.month + 1).padStart(2, "0")}`));
  const schoolDays = ((days as SchoolDay[]) ?? []).filter((day) => monthPrefixes.has(day.school_date.slice(0, 7)));
  const attendance = (records as AttendanceRecord[]) ?? [];
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
            {` ภาคเรียนที่ ${selectedTerm} ปีการศึกษา ${selectedYear}`}
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
            <div>ลงชื่อ ................................................... ครูประจำชั้น<br />( {classData?.homeroom_teacher_name || "................................"} )</div>
            <div>ลงชื่อ ................................................... หัวหน้าฝ่ายวิชาการ<br />( {schoolData?.academic_head || "................................"} )</div>
          </div>
        </div>
        {calendarMonths.flatMap((month) => {
          const monthKey = dateKey(month.year, month.month, 1).slice(0, 7);
          const monthDays = grouped.get(monthKey) ?? [];
          const dayByNumber = new Map(monthDays.map(day => [dateParts(day.school_date).day, day]));
          const count = daysInMonth(month.year, month.month);
          return Array.from({ length: Math.max(1, Math.ceil(studentRows.length / 30)) }, (_, pageIndex) => (
            <div key={`${monthKey}-${pageIndex}`} className="print-page monthly-attendance">
              <header className="plain-form-header attendance-form-header">
                <div className="plain-form-title">บันทึกเวลาเรียน</div>
                <div className="plain-form-context">{classData?.grade_level} {classData?.room ? `ห้อง ${classData.room}` : ""} ภาคเรียนที่ {selectedTerm}</div>
              </header>
              <table className="monthly-attendance-table">
                <colgroup><col style={{ width: "10mm" }} />{Array.from({length:31}, (_, i) => <col key={i} />)}<col style={{width:"6mm"}} /></colgroup>
                <thead>
                  <tr><th rowSpan={3}><span className="vtext">เลขที่</span></th><th colSpan={31}>บันทึกเวลาเรียน เดือน {THAI_MONTHS[month.month]} พ.ศ. {month.year + 543}</th><th rowSpan={3}><span className="vtext">รวมมาเรียน</span></th></tr>
                  <tr>{Array.from({length:31}, (_, i) => <th key={i}>{i+1}</th>)}</tr>
                  <tr>{Array.from({length:31}, (_, i) => <th key={i}>{dayByNumber.has(i+1) ? THAI_WEEKDAYS[dateParts(dateKey(month.year,month.month,i+1)).weekday] : ""}</th>)}</tr>
                </thead>
                <tbody>{Array.from({length:30}, (_, i) => {
                  const student = studentRows[pageIndex*30+i];
                  return <tr key={i}><td>{student?.no ?? pageIndex*30+i+1}</td>
                    {Array.from({length:31}, (_, j) => {
                      const day = dayByNumber.get(j+1);
                      return <td key={j} style={j+1 > count ? {background:"#eee"} : undefined}>{student && day ? statusOf(student.id,day.id) : ""}</td>;
                    })}
                    <td>{student ? monthDays.filter(day => statusOf(student.id,day.id)==="/").length : ""}</td>
                  </tr>;
                })}</tbody>
                <tfoot><tr><td colSpan={33}>/ = มาเรียน · ข = ขาดเรียน · ล = ลา · รวมวันเปิดเรียน {monthDays.length} วัน</td></tr></tfoot>
              </table>
            </div>
          ));
        })}
      </div>
    </>
  );
}
