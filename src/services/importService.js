const { getPool, query, sql } = require("../db");

async function checkDuplicateFile(fileHash) {
  const result = await query`
    SELECT TOP 1 id, created_at
    FROM dbo.import_batches
    WHERE file_hash = ${fileHash}
    ORDER BY created_at DESC
  `;

  return result.recordset[0] || null;
}

async function checkExistingRows(rows) {
  const existingKeys = new Set();

  for (const row of rows) {
    const result = await query`
      SELECT TOP 1 employee_id, course_code, CONVERT(varchar(10), completion_date, 23) AS completion_date
      FROM dbo.training_records
      WHERE employee_id = ${row.employee_id}
        AND course_code = ${row.course_code}
        AND completion_date = ${row.completion_date}
    `;

    if (result.recordset[0]) {
      existingKeys.add(
        `${row.employee_id}|${row.course_code}|${row.completion_date}`
      );
    }
  }

  return existingKeys;
}

async function createBatch(summary) {
  const result = await query`
    INSERT INTO dbo.import_batches (
      uploaded_by,
      uploaded_by_name,
      original_file_name,
      file_hash,
      total_rows,
      valid_rows,
      error_rows,
      inserted_rows,
      status,
      notes
    )
    OUTPUT INSERTED.id
    VALUES (
      ${summary.uploadedBy},
      ${summary.uploadedByName},
      ${summary.originalFileName},
      ${summary.fileHash},
      ${summary.totalRows},
      ${summary.validRows},
      ${summary.errorRows},
      ${summary.insertedRows || 0},
      ${summary.status},
      ${summary.notes || null}
    )
  `;

  return result.recordset[0].id;
}

async function saveBatchErrors(batchId, errors) {
  for (const error of errors) {
    await query`
      INSERT INTO dbo.import_errors (batch_id, row_number, field_name, error_message)
      VALUES (${batchId}, ${error.rowNumber || null}, ${error.field || null}, ${error.message})
    `;
  }
}

async function finalizeBatch(batchId, status, insertedRows, notes) {
  await query`
    UPDATE dbo.import_batches
    SET status = ${status},
        inserted_rows = ${insertedRows},
        notes = ${notes || null},
        completed_at = SYSUTCDATETIME()
    WHERE id = ${batchId}
  `;
}

async function importRows(batchId, rows) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    for (const row of rows) {
      const request = new sql.Request(transaction);
      request.input("employee_id", sql.NVarChar(50), row.employee_id);
      request.input("full_name", sql.NVarChar(255), row.full_name);
      request.input("email", sql.NVarChar(255), row.email);
      request.input("course_code", sql.NVarChar(100), row.course_code);
      request.input("course_name", sql.NVarChar(255), row.course_name);
      request.input(
        "completion_date",
        sql.Date,
        new Date(`${row.completion_date}T00:00:00Z`)
      );
      request.input("score", sql.Int, row.score);
      await request.query(`
        INSERT INTO dbo.training_records (
          employee_id,
          full_name,
          email,
          course_code,
          course_name,
          completion_date,
          score
        )
        VALUES (
          @employee_id,
          @full_name,
          @email,
          @course_code,
          @course_name,
          @completion_date,
          @score
        )
      `);
    }

    await transaction.commit();
    await finalizeBatch(batchId, "IMPORTED", rows.length, null);
    return rows.length;
  } catch (error) {
    await transaction.rollback();
    await finalizeBatch(batchId, "FAILED", 0, error.message);
    throw error;
  }
}

async function getHistory(limit = 20) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const result = await query`
    SELECT TOP (${safeLimit})
      id,
      uploaded_by,
      uploaded_by_name,
      original_file_name,
      total_rows,
      valid_rows,
      error_rows,
      inserted_rows,
      status,
      notes,
      created_at,
      completed_at
    FROM dbo.import_batches
    ORDER BY created_at DESC
  `;

  return result.recordset;
}

async function getBatchErrors(batchId) {
  const result = await query`
    SELECT row_number, field_name, error_message, created_at
    FROM dbo.import_errors
    WHERE batch_id = ${batchId}
    ORDER BY row_number, id
  `;

  return result.recordset;
}

module.exports = {
  checkDuplicateFile,
  checkExistingRows,
  createBatch,
  saveBatchErrors,
  importRows,
  getHistory,
  getBatchErrors
};
