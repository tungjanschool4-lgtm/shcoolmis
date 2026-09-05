export type ImportedStudent = {
  no: number;
  student_code: string;
  national_id: string;
  prefix: string;
  first_name: string;
  last_name: string;
  gender: string;
  status: string;
  birth_date: string;
  blood_type: string;
};

type StudentField = keyof ImportedStudent;

const HEADER_ALIASES: Record<StudentField, string[]> = {
  no: ["เลขที่", "ลำดับ", "no", "number"],
  student_code: ["เลขประจำตัว", "รหัสนักเรียน", "studentcode", "studentid"],
  national_id: ["เลขบัตรประชาชน", "เลขประจำตัวประชาชน", "nationalid", "citizenid"],
  prefix: ["คำนำหน้า", "prefix", "title"],
  first_name: ["ชื่อ", "ชื่อจริง", "firstname", "givenname"],
  last_name: ["นามสกุล", "lastname", "surname"],
  gender: ["เพศ", "gender", "sex"],
  status: ["สถานะ", "status"],
  birth_date: ["วันเกิด", "วันที่เกิด", "birthdate", "dob"],
  blood_type: ["หมู่เลือด", "กรุ๊ปเลือด", "bloodtype"],
};

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_.\-()/]/g, "");
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const choices = [",", ";", "\t"];
  return choices.reduce((best, value) =>
    firstLine.split(value).length > firstLine.split(best).length ? value : best
  );
}

export function parseCsv(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return trimmed;
  const [, day, month, rawYear] = match;
  const year = Number(rawYear) > 2400 ? Number(rawYear) - 543 : Number(rawYear);
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function parseStudentsCsv(text: string, startingNo = 1): ImportedStudent[] {
  const table = parseCsv(text.replace(/^\uFEFF/, ""));
  if (table.length < 2) throw new Error("ไฟล์ CSV ไม่มีข้อมูลนักเรียน");

  const headers = table[0].map(normalizeHeader);
  const indexes = {} as Partial<Record<StudentField, number>>;
  for (const field of Object.keys(HEADER_ALIASES) as StudentField[]) {
    const aliases = HEADER_ALIASES[field].map(normalizeHeader);
    const index = headers.findIndex((header) => aliases.includes(header));
    if (index >= 0) indexes[field] = index;
  }
  if (indexes.first_name === undefined) {
    throw new Error('ไม่พบคอลัมน์ “ชื่อ” หรือ “first_name”');
  }

  const valueAt = (row: string[], field: StudentField) => {
    const index = indexes[field];
    return index === undefined ? "" : (row[index] ?? "").trim();
  };

  const imported: ImportedStudent[] = [];
  for (const row of table.slice(1)) {
    const firstName = valueAt(row, "first_name");
    const lastName = valueAt(row, "last_name");
    if (!firstName && !lastName) continue;

    const prefix = valueAt(row, "prefix") || "เด็กชาย";
    const gender = valueAt(row, "gender") ||
      (prefix === "เด็กหญิง" || prefix === "นางสาว" ? "หญิง" : "ชาย");
    const parsedNo = Number.parseInt(valueAt(row, "no"), 10);

    imported.push({
      no: Number.isFinite(parsedNo) && parsedNo > 0 ? parsedNo : startingNo + imported.length,
      student_code: valueAt(row, "student_code"),
      national_id: valueAt(row, "national_id").replace(/\D/g, ""),
      prefix,
      first_name: firstName,
      last_name: lastName,
      gender,
      status: valueAt(row, "status") || "กำลังศึกษา",
      birth_date: normalizeDate(valueAt(row, "birth_date")),
      blood_type: valueAt(row, "blood_type").toUpperCase(),
    });
  }

  if (!imported.length) throw new Error("ไม่พบรายชื่อนักเรียนที่นำเข้าได้");
  return imported;
}
