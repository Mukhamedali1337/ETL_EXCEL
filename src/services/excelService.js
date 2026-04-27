const crypto = require("crypto");
const fs = require("fs");
const xlsx = require("xlsx");

const REQUIRED_HEADERS = [
  "employee_id",
  "full_name",
  "email",
  "course_code",
  "course_name",
  "completion_date",
  "score"
];

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function hashFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (!parsed) {
      return null;
    }

    const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return date.toISOString().slice(0, 10);
  }

  const date = new Date(String(value || "").trim());
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function normalizeRow(rawRow) {
  return {
    employee_id: String(rawRow.employee_id || "").trim(),
    full_name: String(rawRow.full_name || "").trim(),
    email: String(rawRow.email || "").trim(),
    course_code: String(rawRow.course_code || "").trim(),
    course_name: String(rawRow.course_name || "").trim(),
    completion_date: normalizeDate(rawRow.completion_date),
    score:
      rawRow.score === undefined || rawRow.score === null || rawRow.score === ""
        ? null
        : Number(rawRow.score)
  };
}

function validateRow(row, rowNumber) {
  const errors = [];

  REQUIRED_HEADERS.forEach((header) => {
    if (
      row[header] === null ||
      row[header] === undefined ||
      row[header] === ""
    ) {
      errors.push({
        rowNumber,
        field: header,
        message: `Поле ${header} обязательно для заполнения`
      });
    }
  });

  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push({
      rowNumber,
      field: "email",
      message: "Некорректный email"
    });
  }

  if (row.completion_date === null) {
    errors.push({
      rowNumber,
      field: "completion_date",
      message: "Дата завершения должна быть валидной датой"
    });
  }

  if (row.score !== null && (!Number.isInteger(row.score) || row.score < 0 || row.score > 100)) {
    errors.push({
      rowNumber,
      field: "score",
      message: "Оценка должна быть целым числом от 0 до 100"
    });
  }

  return errors;
}

function parseWorkbook(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel-файл не содержит листов");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false
  });

  if (rawRows.length === 0) {
    throw new Error("Excel-файл пустой");
  }

  const headers = Object.keys(rawRows[0]).map(normalizeHeader);
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header)
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `В файле отсутствуют обязательные колонки: ${missingHeaders.join(", ")}`
    );
  }

  const rows = rawRows.map((row, index) => {
    const normalizedSource = {};
    Object.keys(row).forEach((key) => {
      normalizedSource[normalizeHeader(key)] = row[key];
    });

    const normalizedRow = normalizeRow(normalizedSource);
    const rowNumber = index + 2;
    return {
      rowNumber,
      data: normalizedRow,
      errors: validateRow(normalizedRow, rowNumber)
    };
  });

  const keyIndex = new Map();
  rows.forEach((row) => {
    const key = [
      row.data.employee_id,
      row.data.course_code,
      row.data.completion_date
    ].join("|");

    if (!row.data.employee_id || !row.data.course_code || !row.data.completion_date) {
      return;
    }

    if (keyIndex.has(key)) {
      row.errors.push({
        rowNumber: row.rowNumber,
        field: "duplicate",
        message: "Дубликат внутри файла"
      });

      const firstDuplicate = keyIndex.get(key);
      firstDuplicate.errors.push({
        rowNumber: firstDuplicate.rowNumber,
        field: "duplicate",
        message: "Дубликат внутри файла"
      });
    } else {
      keyIndex.set(key, row);
    }
  });

  return {
    rows,
    fileHash: hashFile(filePath)
  };
}

module.exports = {
  REQUIRED_HEADERS,
  parseWorkbook
};
