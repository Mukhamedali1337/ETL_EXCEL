const config = require("../src/config");
const { getPool } = require("../src/db");
const logger = require("../src/logger");

async function main() {
  logger.info("DB test starting...");
  logger.info("Target", {
    server: config.mssql?.server,
    port: config.mssql?.port,
    database: config.mssql?.database,
    authType: config.mssql?.authentication?.type || "sql"
  });

  const pool = await getPool();
  const result = await pool.request().query("SELECT 1 AS ok");
  logger.info("DB test OK", result.recordset?.[0] || null);
  await pool.close();
}

main().catch((err) => {
  logger.error("DB test FAILED", {
    message: err?.message,
    code: err?.code,
    name: err?.name
  });
  process.exitCode = 1;
});

