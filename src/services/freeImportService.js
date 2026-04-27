const xlsx = require("xlsx");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { getPool, sql } = require("../db");

const ALLOWED_TYPES = ["INT", "FLOAT", "DATE", "NVARCHAR(255)", "NVARCHAR(MAX)", "BIT"];

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

// Safe for use inside SQL [brackets] — only strip ] and null bytes
function sanitizeIdentifier(raw) {
  return String(raw || "").trim().replace(/[\[\]\x00]/g, "_").slice(0, 128) || "col";
}

function tableNameFromFile(filename) {
  return path.basename(filename, path.extname(filename)).trim().replace(/[\[\]\x00]/g, "_").slice(0, 128) || "import";
}

function validateType(type) {
  return ALLOWED_TYPES.includes(type) ? type : "NVARCHAR(255)";
}

function inferType(values) {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonEmpty.length === 0) return "NVARCHAR(255)";
  if (nonEmpty.every((v) => v instanceof Date)) return "DATE";
  if (nonEmpty.every((v) => typeof v === "number")) {
    return nonEmpty.every((v) => Number.isInteger(v)) ? "INT" : "FLOAT";
  }
  const maxLen = Math.max(...nonEmpty.map((v) => String(v).length));
  return maxLen > 300 ? "NVARCHAR(MAX)" : "NVARCHAR(255)";
}

function convertValue(v, type) {
  if (v === null || v === undefined || v === "") return null;
  switch (type) {
    case "INT": {
      const n = Math.round(Number(v));
      return isNaN(n) ? null : n;
    }
    case "FLOAT": {
      const n = Number(v);
      return isNaN(n) ? null : n;
    }
    case "DATE": {
      if (v instanceof Date) return isNaN(v.valueOf()) ? null : v;
      const d = new Date(String(v));
      return isNaN(d.valueOf()) ? null : d;
    }
    case "BIT":
      return v ? 1 : 0;
    default:
      return String(v);
  }
}

function getSqlType(type) {
  switch (type) {
    case "INT": return sql.Int;
    case "FLOAT": return sql.Float;
    case "DATE": return sql.Date;
    case "BIT": return sql.Bit;
    case "NVARCHAR(MAX)": return sql.NVarChar(sql.MAX);
    default: return sql.NVarChar(255);
  }
}

function parseExcelFree(filePath, originalFileName) {
  const workbook = xlsx.readFile(filePath, { cellDates: true, raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel-файл не содержит листов");

  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  if (rawRows.length === 0) throw new Error("Excel-файл пустой");

  const originalHeaders = Object.keys(rawRows[0]).map((h) => String(h).trim());

  // Build columns with deduplicated safeNames
  const usedNames = new Set();
  const columns = originalHeaders.map((header, i) => {
    let safeName = sanitizeIdentifier(header) || `col_${i}`;
    if (usedNames.has(safeName.toLowerCase())) safeName = `${safeName}_${i}`;
    usedNames.add(safeName.toLowerCase());

    const values = rawRows.map((row) => {
      const key = Object.keys(row).find((k) => String(k).trim() === header);
      return key !== undefined ? row[key] : null;
    });

    return { originalName: header, safeName, inferredType: inferType(values) };
  });

  // Normalize row keys to trimmed original names
  const rows = rawRows.map((row) => {
    const out = {};
    originalHeaders.forEach((h) => {
      const key = Object.keys(row).find((k) => String(k).trim() === h);
      out[h] = key !== undefined ? row[key] : null;
    });
    return out;
  });

  return {
    tableName: tableNameFromFile(originalFileName),
    originalFileName,
    columns,
    rows,
    sampleRows: rows.slice(0, 5),
    totalRows: rows.length,
    fileHash: hashFile(filePath)
  };
}

async function tableExists(tableName) {
  const pool = await getPool();
  const result = await pool.request()
    .input("tbl", sql.NVarChar(128), sanitizeIdentifier(tableName))
    .query("SELECT 1 AS found FROM sys.tables WHERE name = @tbl AND schema_id = SCHEMA_ID('dbo')");
  return result.recordset.length > 0;
}

async function createTable(tableName, columns) {
  const pool = await getPool();
  const safeName = sanitizeIdentifier(tableName);
  const colDefs = columns.map((c) =>
    `  [${sanitizeIdentifier(c.safeName)}] ${validateType(c.selectedType)} NULL`
  ).join(",\n");

  await pool.request().query(`
    CREATE TABLE [dbo].[${safeName}] (
      [_id] INT IDENTITY(1,1) PRIMARY KEY,
${colDefs},
      [_imported_at] DATETIME2 DEFAULT GETDATE(),
      [_imported_by] NVARCHAR(100) NULL
    )
  `);
}

async function insertFreeRows(tableName, columns, rows, importedBy, tableAlreadyExisted) {
  const pool = await getPool();
  const safeName = sanitizeIdentifier(tableName);
  const colNames = columns.map((c) => `[${sanitizeIdentifier(c.safeName)}]`).join(", ");
  const paramRefs = columns.map((_, i) => `@c${i}`).join(", ");

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  let insertedCount = 0;
  const skippedRows = [];
  const fileSignatures = new Set();

  try {
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const converted = columns.map((col) => convertValue(row[col.originalName], col.selectedType));

      // Within-file duplicate check
      const sig = JSON.stringify(converted);
      if (fileSignatures.has(sig)) {
        skippedRows.push({
          rowNumber: idx + 2,
          reason: "Дубликат внутри файла",
          preview: columns.slice(0, 3).map((c, i) => `${c.originalName}: ${converted[i] ?? "—"}`).join(" | ")
        });
        continue;
      }
      fileSignatures.add(sig);

      // Within-table duplicate check (only if table existed before this import)
      if (tableAlreadyExisted) {
        const whereClause = columns.map((col, i) =>
          converted[i] === null
            ? `[${sanitizeIdentifier(col.safeName)}] IS NULL`
            : `[${sanitizeIdentifier(col.safeName)}] = @chk${i}`
        ).join(" AND ");

        const checkReq = new sql.Request(transaction);
        columns.forEach((col, i) => {
          if (converted[i] !== null) checkReq.input(`chk${i}`, getSqlType(col.selectedType), converted[i]);
        });

        const found = await checkReq.query(
          `SELECT TOP 1 1 AS found FROM [dbo].[${safeName}] WHERE ${whereClause}`
        );

        if (found.recordset.length > 0) {
          skippedRows.push({
            rowNumber: idx + 2,
            reason: "Уже существует в таблице",
            preview: columns.slice(0, 3).map((c, i) => `${c.originalName}: ${converted[i] ?? "—"}`).join(" | ")
          });
          continue;
        }
      }

      // Insert
      const insertReq = new sql.Request(transaction);
      columns.forEach((col, i) => insertReq.input(`c${i}`, getSqlType(col.selectedType), converted[i]));
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

async function checkDuplicateFile(fileHash) {
  const pool = await getPool();
  const result = await pool.request()
    .input("hash", sql.NVarChar(64), fileHash)
    .query("SELECT id, file_name, uploaded_at FROM [dbo].[free_import_batches] WHERE file_hash = @hash");
  return result.recordset[0] || null;
}

async function saveFreeImportBatch({ fileHash, fileName, tableName, rowCount, uploadedBy }) {
  const pool = await getPool();
  await pool.request()
    .input("hash", sql.NVarChar(64), fileHash)
    .input("fileName", sql.NVarChar(260), fileName)
    .input("tableName", sql.NVarChar(128), tableName)
    .input("rowCount", sql.Int, rowCount)
    .input("uploadedBy", sql.NVarChar(100), uploadedBy)
    .query(`INSERT INTO [dbo].[free_import_batches] (file_hash, file_name, table_name, row_count, uploaded_by)
            VALUES (@hash, @fileName, @tableName, @rowCount, @uploadedBy)`);
}

module.exports = { sanitizeIdentifier, parseExcelFree, tableExists, createTable, insertFreeRows, checkDuplicateFile, saveFreeImportBatch, ALLOWED_TYPES };
