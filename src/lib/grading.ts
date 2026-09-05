import type { GradeCriterion } from "./types";

// ตัดเกรดจากคะแนนรวม (0-100) ตามเกณฑ์ที่ตั้งไว้ (เรียง min_score น้อย -> มาก)
export function scoreToGrade(score: number | null | undefined, criteria: GradeCriterion[]): number | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  const sorted = [...criteria].sort((a, b) => a.min_score - b.min_score);
  let grade: number | null = null;
  for (const c of sorted) {
    if (score >= c.min_score) grade = c.grade_point;
  }
  return grade;
}

export function gradeText(grade: number | null): string {
  if (grade === null) return "";
  return Number.isInteger(grade) ? String(grade) : grade.toFixed(1);
}

// รวมคะแนนหนึ่งภาคเรียน
export function semesterTotal(mid: number | null, final: number | null): number | null {
  if (mid === null && final === null) return null;
  return (mid ?? 0) + (final ?? 0);
}

export type SubjectResult = {
  sem1Total: number | null;
  sem1Grade: number | null;
  sem2Total: number | null;
  sem2Grade: number | null;
  yearAvg: number | null;
  yearGrade: number | null;
};

export function computeSubjectResult(
  s: {
    sem1_mid: number | null;
    sem1_final: number | null;
    sem2_mid: number | null;
    sem2_final: number | null;
    override_grade?: number | null;
  },
  criteria: GradeCriterion[]
): SubjectResult {
  const sem1Total = semesterTotal(s.sem1_mid, s.sem1_final);
  const sem2Total = semesterTotal(s.sem2_mid, s.sem2_final);
  const totals = [sem1Total, sem2Total].filter((t): t is number => t !== null);
  const yearAvg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
  const computedYearGrade = scoreToGrade(yearAvg, criteria);
  return {
    sem1Total,
    sem1Grade: scoreToGrade(sem1Total, criteria),
    sem2Total,
    sem2Grade: scoreToGrade(sem2Total, criteria),
    yearAvg,
    yearGrade:
      s.override_grade !== null && s.override_grade !== undefined ? s.override_grade : computedYearGrade,
  };
}

// ระดับคุณภาพจากคะแนนเฉลี่ย (เต็ม 3) ตามเกณฑ์: 2.5-3=ดีเยี่ยม, 1.5-2.49=ดี, 1-1.49=ผ่าน, 0-0.99=ไม่ผ่าน
export function qualityLevel(avg: number | null): string {
  if (avg === null || Number.isNaN(avg)) return "";
  if (avg >= 2.5) return "ดีเยี่ยม";
  if (avg >= 1.5) return "ดี";
  if (avg >= 1) return "ผ่าน";
  return "ไม่ผ่าน";
}

// ความหมายของระดับผลการเรียน (สำหรับหน้าเกณฑ์)
export function gradeMeaning(grade: number): string {
  if (grade >= 4) return "เยี่ยม";
  if (grade >= 3.5) return "ดีมาก";
  if (grade >= 3) return "ดี";
  if (grade >= 2.5) return "ค่อนข้างดี";
  if (grade >= 2) return "น่าพอใช้";
  if (grade >= 1.5) return "พอใช้";
  if (grade >= 1) return "ผ่านเกณฑ์";
  return "ต่ำกว่าเกณฑ์";
}

// เฉลี่ยคะแนนหัวข้อประเมิน (คุณลักษณะ/อ่านคิดเขียน) ในภาคเรียนหนึ่ง
export function itemsAverage(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null && !Number.isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// GPA ถ่วงน้ำหนักหน่วยกิต จากผลการเรียนรายวิชา (ใช้เกรดรายปี)
export function computeGPA(
  rows: { credits: number; yearGrade: number | null }[]
): number | null {
  let totalCredits = 0;
  let totalPoints = 0;
  for (const r of rows) {
    if (r.yearGrade === null) continue;
    totalCredits += r.credits;
    totalPoints += r.credits * r.yearGrade;
  }
  if (totalCredits === 0) return null;
  return totalPoints / totalCredits;
}
