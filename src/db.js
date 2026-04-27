const sql = require("mssql");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const logger = require("./logger");

let poolPromise;
let schemaPromise;

function splitSqlBatches(sqlText) {
  // Split on lines that contain only "GO" (case-insensitive), like SSMS.
  return String(sqlText)
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter(Boolean);
}

async function ensureSchema(pool) {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    const schemaPath = path.join(process.cwd(), "database", "schema.sql");
    const schemaText = fs.readFileSync(schemaPath, "utf8");
    const batches = splitSqlBatches(schemaText);

    logger.info("Ensuring MSSQL schema...", {
      schemaPath,
      batches: batches.length
    });

    for (const batch of batches) {
      // Each batch can contain multiple statements.
      // Using pool.request() keeps it simple and avoids nesting transactions.
      await pool.request().query(batch);
    }

    logger.info("MSSQL schema ensured.");
  })().catch((err) => {
    schemaPromise = null;
    throw err;
  });

  return schemaPromise;
}

function getPool() {
  if (!poolPromise) {
    const safeCfg = logger.safeMssqlConfig(config.mssql);
    logger.info("Connecting to MSSQL...", {
      server: config.mssql?.server,
      port: config.mssql?.port,
      database: config.mssql?.database,
      hasAuth: Boolean(config.mssql?.authentication),
      authType: config.mssql?.authentication?.type || "sql",
      options: config.mssql?.options
    });
    logger.debug("MSSQL config (sanitized)", safeCfg);

    poolPromise = sql
      .connect(config.mssql)
      .then(async (pool) => {
        await ensureSchema(pool);
        return pool;
      })
      .catch((err) => {
        logger.error("MSSQL connection failed", {
          message: err?.message,
          code: err?.code,
          name: err?.name
        });
        logger.debug("MSSQL connection error (full)", err);
        throw err;
      });
  }

  return poolPromise;
}

async function query(strings, ...values) {
  const pool = await getPool();
  const request = pool.request();

  values.forEach((value, index) => {
    request.input(`p${index}`, value);
  });

  const text = strings.reduce((result, part, index) => {
    if (index === values.length) {
      return result + part;
    }

    return result + part + `@p${index}`;
  }, "");

  return request.query(text);
}

module.exports = {
  sql,
  getPool,
  query
};
