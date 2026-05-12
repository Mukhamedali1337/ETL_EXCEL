const xlsx = require("xlsx");
const crypto = require("crypto");
const fs = require("fs");
const { getPool, sql } = require("../db");

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function matchHeader(excelHeader, templateHeader) {
  return String(excelHeader).trim().toLowerCase() === String(templateHeader).trim().toLowerCase();
}

function getSqlType(type) {
  if (type === "INT")  return sql.Int;
  if (type === "FLOAT") return sql.Float;
  if (type === "DATE")  return sql.Date;
  if (type === "BIT")   return sql.Bit;
  if (/^DECIMAL/i.test(type)) return sql.Decimal(10, 2);
  if (type === "NVARCHAR(MAX)") return sql.NVarChar(sql.MAX);
  const m = type.match(/^NVARCHAR\((\d+)\)$/i);
  if (m) return sql.NVarChar(parseInt(m[1], 10));
  return sql.NVarChar(255);
}

function convertValue(v, type) {
  if (v === null || v === undefined || v === "") return null;

  const t = type.toUpperCase();

  if (t === "INT") {
    const cleaned = String(v).replace(/\s/g, "").replace(",", ".");
    const n = Math.round(Number(cleaned));
    return isNaN(n) ? null : n;
  }

  if (t === "FLOAT" || /^DECIMAL/.test(t)) {
    const cleaned = String(v).replace(/\s/g, "").replace("%", "").replace(",", ".");
    const n = Number(cleaned);
    return isNaN(n) ? null : n;
  }

  if (t === "DATE") {
    if (v instanceof Date) return isNaN(v.valueOf()) ? null : v;
    const s = String(v).trim();
    // DD.MM.YYYY
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      const d = new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T00:00:00Z`);
      return isNaN(d.valueOf()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.valueOf()) ? null : d;
  }

  return String(v).trim();
}

function parseTemplateExcel(filePath, template) {
  const workbook = xlsx.readFile(filePath, { cellDates: true, raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel-файл не содержит листов");

  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  if (rawRows.length === 0) throw new Error("Excel-файл пустой");

  // Drop completely empty rows
  const nonEmptyRaw = rawRows.filter((row) =>
    Object.values(row).some((v) => v !== null && v !== undefined && v !== "")
  );
  if (nonEmptyRaw.length === 0) throw new Error("Excel-файл не содержит данных");

  const fileHeaders = Object.keys(rawRows[0]).map((h) => String(h).trim());

  // Check required headers are present
  const missing = template.requiredHeaders.filter(
    (rh) => !fileHeaders.some((fh) => matchHeader(fh, rh))
  );
  if (missing.length > 0) {
    throw new Error(`В файле отсутствуют обязательные столбцы: ${missing.join(", ")}`);
  }

  const errors = [];
  const validRows = [];
  const fileSignatures = new Set();

  nonEmptyRaw.forEach((rawRow, idx) => {
    const rowNumber = idx + 2;
    const rowObj = {};

    // Map Excel columns → SQL columns
    template.columns.forEach((col) => {
      const excelKey = Object.keys(rawRow).find((k) => matchHeader(k, col.excelHeader));
      const rawVal = excelKey !== undefined ? rawRow[excelKey] : null;
      rowObj[col.sqlName] = convertValue(rawVal, col.type);
    });

    // Inject auto fields (e.g. school_type)
    if (template.autoFields) {
      template.autoFields.forEach((af) => {
        rowObj[af.sqlName] = af.value;
      });
    }

    // Within-file duplicate check
    const sig = JSON.stringify(rowObj);
    if (fileSignatures.has(sig)) {
      errors.push({ rowNumber, field: "duplicate", message: "Дубликат внутри файла" });
      return;
    }
    fileSignatures.add(sig);

    validRows.push({ ...rowObj, _rowNumber: rowNumber });
  });

  return {
    columns: template.columns,
    autoFields: template.autoFields || [],
    validRows,
    errors,
    sampleRows: validRows.slice(0, 5),
    totalRows: nonEmptyRaw.length,
    fileHash: hashFile(filePath)
  };
}

async function insertTemplateRows(template, rows, importedBy) {
  const pool = await getPool();
  const safeName = template.tableName;

  // Build column list — data columns + auto fields
  const allCols = [
    ...template.columns,
    ...(template.autoFields || [])
  ];

  const colNames = allCols.map((c) => `[${c.sqlName}]`).join(", ");
  const paramRefs = allCols.map((_, i) => `@c${i}`).join(", ");

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  let insertedCount = 0;
  const skippedRows = [];

  try {
    for (const row of rows) {
      const rowNumber = row._rowNumber;

      // Within-table duplicate check
      const whereClause = allCols.map((col, i) => {
        const val = row[col.sqlName];
        return val === null
          ? `[${col.sqlName}] IS NULL`
          : `[${col.sqlName}] = @chk${i}`;
      }).join(" AND ");

      const checkReq = new sql.Request(transaction);
      allCols.forEach((col, i) => {
        const val = row[col.sqlName];
        if (val !== null) checkReq.input(`chk${i}`, getSqlType(col.type), val);
      });

      const found = await checkReq.query(
        `SELECT TOP 1 1 AS found FROM [dbo].[${safeName}] WHERE ${whereClause}`
      );

      if (found.recordset.length > 0) {
        skippedRows.push({
          rowNumber,
          reason: "Уже существует в таблице",
          preview: template.columns.slice(0, 3)
            .map((c) => `${c.excelHeader}: ${row[c.sqlName] ?? "—"}`)
            .join(" | ")
        });
        continue;
      }

      // Insert
      const insertReq = new sql.Request(transaction);
      allCols.forEach((col, i) => {
        insertReq.input(`c${i}`, getSqlType(col.type), row[col.sqlName] ?? null);
      });
      insertReq.input("imp", sql.NVarChar(100), importedBy || null);

      await insertReq.query(
        `INSERT INTO [dbo].[${safeName}] (${colNames}, [_imported_by]) VALUES (${paramRefs}, @imp)`
      );
      insertedCount++;
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  return { inserted: insertedCount, skippedRows };
}

module.exports = { parseTemplateExcel, insertTemplateRows };
