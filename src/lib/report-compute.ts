import type { ClassBundle } from "@/lib/report-data";
import type { Student, Subject, TransferSubject } from "@/lib/types";
import {
  computeSubjectResult,
  computeGPA,
  scoreToGrade,
  qualityLevel,
  qualityLabelsFromSchool,
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
  assessmentLevels: {
    characteristic: TermLevels;
    readWrite: TermLevels;
    competency: TermLevels;
  };
  activityLevels: TermLevels;
};

export type TermLevels = {
  sem1: string;
  sem2: string;
  year: string;
};

export function computeStudentReport(bundle: ClassBundle, student: Student): StudentReport {
  const qualityLabels = qualityLabelsFromSchool(bundle.school);
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
  function levelsFor(kind: "characteristic" | "read_write" | "competency"): TermLevels {
    const items = bundle.items.filter((i) => i.kind === kind);
    const sem1: (number | null)[] = [];
    const sem2: (number | null)[] = [];
    for (const it of items) {
      const sc = scoreByItem.get(it.id);
      sem1.push(sc?.sem1 ?? null);
      sem2.push(sc?.sem2 ?? null);
    }
    return {
      sem1: qualityLevel(itemsAverage(sem1), qualityLabels),
      sem2: qualityLevel(itemsAverage(sem2), qualityLabels),
      year: qualityLevel(itemsAverage([...sem1, ...sem2]), qualityLabels),
    };
  }

  // กิจกรรม : ผ่านถ้าไม่มี "ไม่ผ่าน" และมีผลอย่างน้อยหนึ่งรายการ
  const myActivities = bundle.activityResults.filter((r) => r.student_id === student.id);
  function activityLevelFor(values: string[]): string {
    const recorded = values.filter(Boolean);
    if (!recorded.length) return "";
    return recorded.some((value) => value === "ไม่ผ่าน") ? "ไม่ผ่าน" : "ผ่าน";
  }
  const activityLevels: TermLevels = {
    sem1: activityLevelFor(myActivities.map((r) => r.sem1_result)),
    sem2: activityLevelFor(myActivities.map((r) => r.sem2_result)),
    year: activityLevelFor(myActivities.flatMap((r) => [r.sem1_result, r.sem2_result])),
  };
  const assessmentLevels = {
    characteristic: levelsFor("characteristic"),
    readWrite: levelsFor("read_write"),
    competency: levelsFor("competency"),
  };

  return {
    student,
    rows,
    gpa,
    characteristicLevel: assessmentLevels.characteristic.year,
    readWriteLevel: assessmentLevels.readWrite.year,
    activityOverall: activityLevels.year,
    assessmentLevels,
    activityLevels,
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
