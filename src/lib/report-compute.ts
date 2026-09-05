import type { ClassBundle } from "@/lib/report-data";
import type { Student, Subject, TransferSubject } from "@/lib/types";
import {
  computeSubjectResult,
  computeGPA,
  scoreToGrade,
  qualityLevel,
  itemsAverage,
  type SubjectResult,
} from "@/lib/grading";

export type StudentSubjectRow = SubjectResult & { subject: Subject };

export type StudentReport = {
  student: Student;
  rows: StudentSubjectRow[];
  gpa: number | null;
  characteristicLevel: string;
  readWriteLevel: string;
  activityOverall: string;
};

export function computeStudentReport(bundle: ClassBundle, student: Student): StudentReport {
  const scoreBySubject = new Map(
    bundle.subjectScores.filter((s) => s.student_id === student.id).map((s) => [s.subject_id, s])
  );

  const rows: StudentSubjectRow[] = bundle.subjects.map((subject) => {
    const sc = scoreBySubject.get(subject.id);
    const res = computeSubjectResult(
      {
        sem1_mid: sc?.sem1_mid ?? null,
        sem1_final: sc?.sem1_final ?? null,
        sem2_mid: sc?.sem2_mid ?? null,
        sem2_final: sc?.sem2_final ?? null,
        override_grade: sc?.override_grade ?? null,
      },
      bundle.criteria
    );
    return { ...res, subject };
  });

  const gpa = computeGPA(rows.map((r) => ({ credits: r.subject.credits, yearGrade: r.yearGrade })));

  // คุณลักษณะ / อ่านคิดเขียน : เฉลี่ยทุกข้อ ทั้ง 2 ภาคเรียน
  const scoreByItem = new Map(
    bundle.assessmentScores.filter((s) => s.student_id === student.id).map((s) => [s.item_id, s])
  );
  function levelFor(kind: "characteristic" | "read_write"): string {
    const items = bundle.items.filter((i) => i.kind === kind);
    const vals: (number | null)[] = [];
    for (const it of items) {
      const sc = scoreByItem.get(it.id);
      if (sc?.sem1 != null) vals.push(sc.sem1);
      if (sc?.sem2 != null) vals.push(sc.sem2);
    }
    return qualityLevel(itemsAverage(vals));
  }

  // กิจกรรม : ผ่านถ้าไม่มี "ไม่ผ่าน" และมีผลอย่างน้อยหนึ่งรายการ
  const myActivities = bundle.activityResults.filter((r) => r.student_id === student.id);
  let hasResult = false;
  let anyFail = false;
  for (const r of myActivities) {
    for (const v of [r.sem1_result, r.sem2_result]) {
      if (v) { hasResult = true; if (v === "ไม่ผ่าน") anyFail = true; }
    }
  }
  const activityOverall = !hasResult ? "" : anyFail ? "ไม่ผ่าน" : "ผ่าน";

  return {
    student,
    rows,
    gpa,
    characteristicLevel: levelFor("characteristic"),
    readWriteLevel: levelFor("read_write"),
    activityOverall,
  };
}

// ---- เทียบโอน ----
export type TransferRow = {
  transferSubject: TransferSubject;
  sourceSubjects: Subject[];
  score: number | null; // คะแนนรายปีที่ดึง/เฉลี่ยจากวิชาต้นทาง
  grade: number | null;
};

export type TransferReport = {
  student: Student;
  rows: TransferRow[];
  gpa: number | null;
  characteristicLevel: string;
  readWriteLevel: string;
  activityOverall: string;
};

export function computeTransferReport(bundle: ClassBundle, student: Student): TransferReport {
  const base = computeStudentReport(bundle, student);
  const subjectById = new Map(bundle.subjects.map((s) => [s.id, s]));
  const yearAvgBySubject = new Map(base.rows.map((r) => [r.subject.id, r.yearAvg]));

  const enabled = bundle.transferSubjects.filter((t) => t.enabled);
  const rows: TransferRow[] = enabled.map((ts) => {
    const sourceIds = bundle.transferSources
      .filter((m) => m.transfer_subject_id === ts.id)
      .map((m) => m.subject_id);
    const sourceSubjects = sourceIds
      .map((id) => subjectById.get(id))
      .filter((s): s is Subject => !!s);
    const vals = sourceIds
      .map((id) => yearAvgBySubject.get(id) ?? null)
      .filter((v): v is number => v !== null);
    const score = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { transferSubject: ts, sourceSubjects, score, grade: scoreToGrade(score, bundle.criteria) };
  });

  const gpa = computeGPA(rows.map((r) => ({ credits: r.transferSubject.credits, yearGrade: r.grade })));

  return {
    student,
    rows,
    gpa,
    characteristicLevel: base.characteristicLevel,
    readWriteLevel: base.readWriteLevel,
    activityOverall: base.activityOverall,
  };
}

export function rankByGpaTransfer(reports: TransferReport[]): Map<string, number> {
  const sorted = [...reports]
    .filter((r) => r.gpa !== null)
    .sort((a, b) => (b.gpa ?? 0) - (a.gpa ?? 0));
  const map = new Map<string, number>();
  let rank = 0;
  let prev: number | null = null;
  sorted.forEach((r, i) => {
    if (prev === null || r.gpa !== prev) rank = i + 1;
    map.set(r.student.id, rank);
    prev = r.gpa;
  });
  return map;
}

// จัดอันดับตาม GPA (มาก -> น้อย) คืน map studentId -> อันดับ
export function rankByGpa(reports: StudentReport[]): Map<string, number> {
  const sorted = [...reports]
    .filter((r) => r.gpa !== null)
    .sort((a, b) => (b.gpa ?? 0) - (a.gpa ?? 0));
  const map = new Map<string, number>();
  let rank = 0;
  let prev: number | null = null;
  sorted.forEach((r, i) => {
    if (prev === null || r.gpa !== prev) rank = i + 1;
    map.set(r.student.id, rank);
    prev = r.gpa;
  });
  return map;
}
