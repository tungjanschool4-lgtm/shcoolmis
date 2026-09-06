export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export type CalendarMonth = { year: number; month: number };

export function buddhistToGregorian(academicYear: string): number {
  const value = Number(academicYear);
  return value > 2400 ? value - 543 : value;
}

export function toBuddhistYear(academicYear: string): number {
  const value = Number(academicYear);
  if (!Number.isFinite(value)) return new Date().getUTCFullYear() + 543;
  return value > 2400 ? value : value + 543;
}

export function termMonths(academicYear: string, term: 1 | 2): CalendarMonth[] {
  const year = buddhistToGregorian(academicYear);
  return term === 1
    ? [4, 5, 6, 7, 8, 9].map((month) => ({ year, month }))
    : [{ year, month: 10 }, { year, month: 11 }, { year: year + 1, month: 0 }, { year: year + 1, month: 1 }, { year: year + 1, month: 2 }];
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateParts(value: string): { year: number; month: number; day: number; weekday: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month: month - 1, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}
