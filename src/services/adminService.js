const { getPool, sql } = require("../db");
const { sanitizeIdentifier } = require("./freeImportService");

const SYSTEM_TABLES = [
  "training_records", "import_batches", "free_import_batches", "import_errors",
  "portal_login_log", "portal_roles", "portal_template_labels"
];

async function logLogin(username, displayName) {
  try {
    const pool = await getPool();
    await pool.request()
      .input("u", sql.NVarChar(100), username)
      .input("d", sql.NVarChar(255), displayName || null)
      .query("INSERT INTO [dbo].[portal_login_log] (username, display_name) VALUES (@u, @d)");
  } catch {
    // non-critical, swallow errors
  }
}

async function getLoginLog(limit = 100) {
  const pool = await getPool();
  const result = await pool.request()
    .input("lim", sql.Int, limit)
    .query("SELECT TOP (@lim) username, display_name, logged_at FROM [dbo].[portal_login_log] ORDER BY logged_at DESC");
  return result.recordset;
}

async function getUserRoles() {
  const pool = await getPool();
  const result = await pool.request()
    .query("SELECT username, role, granted_by, granted_at FROM [dbo].[portal_roles] ORDER BY granted_at DESC");
  return result.recordset;
}

async function getUserRole(username) {
  const pool = await getPool();
  const result = await pool.request()
    .input("u", sql.NVarChar(100), username)
    .query("SELECT role FROM [dbo].[portal_roles] WHERE username = @u");
  return result.recordset[0]?.role || null;
}

async function grantRole(username, role, grantedBy) {
  const pool = await getPool();
  await pool.request()
    .input("u", sql.NVarChar(100), username)
    .input("r", sql.NVarChar(50), role)
    .input("g", sql.NVarChar(100), grantedBy)
    .query(`
      MERGE [dbo].[portal_roles] AS target
      USING (VALUES (@u, @r, @g)) AS src (username, role, granted_by)
        ON target.username = src.username
      WHEN MATCHED THEN UPDATE SET role = src.role, granted_by = src.granted_by, granted_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (username, role, granted_by) VALUES (src.username, src.role, src.granted_by);
    `);
}

async function revokeRole(username) {
  const pool = await getPool();
  await pool.request()
    .input("u", sql.NVarChar(100), username)
    .query("DELETE FROM [dbo].[portal_roles] WHERE username = @u");
}

async function getTableList() {
  const pool = await getPool();
  const excluded = SYSTEM_TABLES.map((t) => `'${t}'`).join(",");
  const result = await pool.request().query(`
    SELECT t.name, t.create_date,
           SUM(p.rows) AS row_count
    FROM sys.tables t
    INNER JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0,1)
    WHERE t.schema_id = SCHEMA_ID('dbo') AND t.name NOT IN (${excluded})
    GROUP BY t.name, t.create_date
    ORDER BY t.create_date DESC
  `);
  return result.recordset;
}

async function getTableData(tableName, page = 1, pageSize = 50) {
  const pool = await getPool();
  const safe = sanitizeIdentifier(tableName);
  const offset = (page - 1) * pageSize;

  const countResult = await pool.request()
    .query(`SELECT COUNT(*) AS total FROM [dbo].[${safe}]`);
  const total = countResult.recordset[0].total;

  const dataResult = await pool.request()
    .input("offset", sql.Int, offset)
    .input("pageSize", sql.Int, pageSize)
    .query(`SELECT * FROM [dbo].[${safe}] ORDER BY (SELECT NULL) OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`);

  return {
    rows: dataResult.recordset,
    columns: dataResult.recordset.length > 0 ? Object.keys(dataResult.recordset[0]) : [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

async function dropTable(tableName) {
  const pool = await getPool();
  const safe = sanitizeIdentifier(tableName);
  if (SYSTEM_TABLES.includes(safe)) throw new Error("Нельзя удалить системную таблицу");
  await pool.request().query(`DROP TABLE [dbo].[${safe}]`);
}

async function getTemplateLabels() {
  const pool = await getPool();
  const result = await pool.request()
    .query("SELECT template_id, display_name, description, updated_by, updated_at FROM [dbo].[portal_template_labels]");
  const map = {};
  result.recordset.forEach((r) => { map[r.template_id] = r; });
  return map;
}

async function saveTemplateLabel(templateId, displayName, description, updatedBy) {
  const pool = await getPool();
  await pool.request()
    .input("id", sql.NVarChar(100), templateId)
    .input("name", sql.NVarChar(255), displayName || null)
    .input("desc", sql.NVarChar(1000), description || null)
    .input("by", sql.NVarChar(100), updatedBy)
    .query(`
      MERGE [dbo].[portal_template_labels] AS target
      USING (VALUES (@id, @name, @desc, @by)) AS src (template_id, display_name, description, updated_by)
        ON target.template_id = src.template_id
      WHEN MATCHED THEN UPDATE SET display_name = src.display_name, description = src.description,
                                    updated_by = src.updated_by, updated_at = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (template_id, display_name, description, updated_by)
                             VALUES (src.template_id, src.display_name, src.description, src.updated_by);
    `);
}

async function getDashboardStats() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM [dbo].[import_batches]) AS training_batches,
      (SELECT COUNT(*) FROM [dbo].[free_import_batches]) AS free_batches,
      (SELECT COUNT(*) FROM [dbo].[portal_login_log]) AS total_logins,
      (SELECT COUNT(*) FROM sys.tables
        WHERE schema_id = SCHEMA_ID('dbo')
          AND name NOT IN ('training_records','import_batches','free_import_batches',
                           'import_errors','portal_login_log','portal_roles','portal_template_labels')
      ) AS user_tables
  `);
  return r.recordset[0];
}

module.exports = {
  logLogin, getLoginLog,
  getUserRoles, getUserRole, grantRole, revokeRole,
  getTableList, getTableData, dropTable,
  getTemplateLabels, saveTemplateLabel,
  getDashboardStats
};
