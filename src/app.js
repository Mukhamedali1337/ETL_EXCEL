const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const MemoryStoreFactory = require("memorystore");
const multer = require("multer");
const config = require("./config");
const { requireAuth, requireTrainer, requireAdmin } = require("./middleware/auth");
const { verifyUser } = require("./services/authService");
const { logLogin, getUserRole } = require("./services/adminService");
const adminRouter = require("./routes/admin");
const { parseWorkbook } = require("./services/excelService");
const { parseTemplateExcel, insertTemplateRows } = require("./services/templateImportService");
const {
  importTemplates,
  getTemplateById,
  defaultTemplateId
} = require("./importTemplates");
const {
  sanitizeIdentifier: sanitizeFreeId,
  parseExcelFree,
  tableExists,
  createTable,
  insertFreeRows,
  upsertFreeRows,
  truncateTable,
  checkDuplicateFile: checkDuplicateFileFree,
  saveFreeImportBatch,
  clearTableOwnership,
  getFreeTableList,
  dropFreeTable
} = require("./services/freeImportService");
const {
  checkDuplicateFile,
  checkExistingRows,
  createBatch,
  saveBatchErrors,
  importRows,
  getHistory,
  getBatchErrors
} = require("./services/importService");

fs.mkdirSync(config.uploadDir, { recursive: true });

const app = express();
const MemoryStore = MemoryStoreFactory(session);
const upload = multer({
  dest: config.uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (![".xlsx", ".xls"].includes(ext)) {
      return callback(new Error("Разрешены только Excel-файлы .xlsx и .xls"));
    }

    return callback(null, true);
  }
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 24 * 60 * 60 * 1000
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 4 * 60 * 60 * 1000
    }
  })
);
app.use("/public", express.static(path.join(__dirname, "..", "public")));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.preview = req.session.preview || null;
  res.locals.freePreview = req.session.freePreview || null;
  res.locals.importTemplates = importTemplates;
  res.locals.fmtVal = function(v, max = 40) {
    if (v === null || v === undefined) return "—";
    const d = v instanceof Date ? v : (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : null);
    if (d && !isNaN(d)) {
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const yyyy = d.getUTCFullYear();
      const hh = d.getUTCHours();
      const mi = d.getUTCMinutes();
      if (hh === 0 && mi === 0) return `${dd}.${mm}.${yyyy}`;
      return `${dd}.${mm}.${yyyy} ${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
    }
    return String(v).slice(0, max);
  };
  next();
});

app.get("/", requireAuth, (req, res) => {
  return res.render("index");
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/upload");
  }

  return res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await verifyUser(username, password);

  if (!user) {
    return res.status(401).render("login", {
      error: "Неверный логин или пароль"
    });
  }

  const portalRole = await getUserRole(user.username).catch(() => null);
  const isAdmin = config.adminUsers.includes(user.username.toLowerCase());
  const isTrainer = user.isTrainer || portalRole === "trainer" || isAdmin;

  req.session.user = { ...user, isTrainer, isAdmin };
  logLogin(user.username, user.displayName);
  return res.redirect("/");
});

app.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.get("/upload", requireTrainer, (req, res) => {
  const requestedTemplateId = req.query.template || defaultTemplateId;
  const selectedTemplate =
    getTemplateById(requestedTemplateId) || getTemplateById(defaultTemplateId);

  res.render("upload", {
    error: null,
    success: null,
    selectedTemplate,
    templates: importTemplates
  });
});

app.post("/upload", requireTrainer, upload.single("excelFile"), async (req, res) => {
  let filePath;
  const selectedTemplate =
    getTemplateById(req.body.templateType) || getTemplateById(defaultTemplateId);

  try {
    if (!selectedTemplate) {
      return res.status(400).render("upload", {
        error: "Неизвестный тип импорта",
        success: null,
        selectedTemplate: getTemplateById(defaultTemplateId),
        templates: importTemplates
      });
    }

    if (!selectedTemplate.ready) {
      return res.status(400).render("upload", {
        error:
          "Для выбранного типа импорта столбцы и правила еще не настроены.",
        success: null,
        selectedTemplate,
        templates: importTemplates
      });
    }

    if (!req.file) {
      return res.status(400).render("upload", {
        error: "Выберите Excel-файл для загрузки",
        success: null,
        selectedTemplate,
        templates: importTemplates
      });
    }

    filePath = req.file.path;
    const originalFileName = Buffer.from(req.file.originalname, "latin1").toString("utf8");

    if (selectedTemplate.columns) {
      // ── New template-based flow ──────────────────────────────────────────
      const parsed = parseTemplateExcel(filePath, selectedTemplate);
      const duplicateBatch = await checkDuplicateFile(parsed.fileHash);

      if (duplicateBatch) {
        return res.status(409).render("upload", {
          error: `Этот файл уже был загружен ранее. Batch ID: ${duplicateBatch.id}`,
          success: null, selectedTemplate, templates: importTemplates
        });
      }

      req.session.preview = {
        isNewTemplate: true,
        templateType: selectedTemplate.id,
        templateName: selectedTemplate.name,
        originalFileName,
        fileHash: parsed.fileHash,
        totalRows: parsed.totalRows,
        columns: parsed.columns,
        validRows: parsed.validRows,
        errors: parsed.errors,
        sampleRows: parsed.sampleRows,
        uploadedAt: new Date().toISOString()
      };
    } else {
      // ── Legacy training_records flow ─────────────────────────────────────
      const workbook = parseWorkbook(filePath);
      const duplicateBatch = await checkDuplicateFile(workbook.fileHash);

      if (duplicateBatch) {
        return res.status(409).render("upload", {
          error: `Этот файл уже был загружен ранее. Batch ID: ${duplicateBatch.id}`,
          success: null, selectedTemplate, templates: importTemplates
        });
      }

      const cleanCandidates = workbook.rows.filter((row) => row.errors.length === 0);
      const existingKeys = await checkExistingRows(cleanCandidates.map((row) => row.data));

      workbook.rows.forEach((row) => {
        const key = [row.data.employee_id, row.data.course_code, row.data.completion_date].join("|");
        if (existingKeys.has(key)) {
          row.errors.push({ rowNumber: row.rowNumber, field: "duplicate", message: "Запись уже существует в базе" });
        }
      });

      req.session.preview = {
        isNewTemplate: false,
        templateType: selectedTemplate.id,
        templateName: selectedTemplate.name,
        originalFileName,
        fileHash: workbook.fileHash,
        totalRows: workbook.rows.length,
        validRows: workbook.rows.filter((r) => r.errors.length === 0).map((r) => r.data),
        errors: workbook.rows.flatMap((r) => r.errors),
        uploadedAt: new Date().toISOString()
      };
    }

    return res.render("upload", {
      error: null,
      success: "Файл проверен. Просмотрите результат перед импортом.",
      selectedTemplate,
      templates: importTemplates,
      preview: req.session.preview
    });
  } catch (error) {
    return res.status(400).render("upload", {
      error: error.message,
      success: null,
      selectedTemplate,
      templates: importTemplates
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

app.post("/import", requireTrainer, async (req, res) => {
  const preview = req.session.preview;

  if (!preview) {
    return res.status(400).render("upload", {
      error: "Сначала загрузите и проверьте файл",
      success: null,
      selectedTemplate: getTemplateById(defaultTemplateId),
      templates: importTemplates
    });
  }

  try {
    const previewTemplate =
      getTemplateById(preview.templateType) || getTemplateById(defaultTemplateId);

    if (!previewTemplate || !previewTemplate.ready) {
      req.session.preview = null;
      return res.status(400).render("upload", {
        error:
          "Выбранный тип импорта еще не настроен. Сначала заполните правила шаблона.",
        success: null,
        selectedTemplate: getTemplateById(defaultTemplateId),
        templates: importTemplates
      });
    }

    const duplicateBatch = await checkDuplicateFile(preview.fileHash);
    if (duplicateBatch) {
      req.session.preview = null;
      return res.status(409).render("upload", {
        error: `Этот файл уже был импортирован. Batch ID: ${duplicateBatch.id}`,
        success: null,
        selectedTemplate: previewTemplate,
        templates: importTemplates
      });
    }

    const errorRowsCount =
      preview.errors.length > 0
        ? new Set(preview.errors.map((item) => item.rowNumber)).size
        : 0;

    const batchId = await createBatch({
      uploadedBy: req.session.user.username,
      uploadedByName: req.session.user.displayName,
      originalFileName: preview.originalFileName,
      fileHash: preview.fileHash,
      totalRows: preview.totalRows,
      validRows: preview.validRows.length,
      errorRows: errorRowsCount,
      status: preview.validRows.length > 0 ? "VALIDATED" : "REJECTED",
      notes:
        preview.validRows.length > 0
          ? `Тип импорта: ${previewTemplate.name}`
          : "Импорт не выполнен: нет валидных строк"
    });

    if (preview.errors.length > 0) {
      await saveBatchErrors(batchId, preview.errors);
    }

    if (preview.validRows.length === 0) {
      req.session.preview = null;
      return res.status(400).render("upload", {
        error: "В файле нет валидных строк для импорта",
        success: null,
        selectedTemplate: previewTemplate,
        templates: importTemplates
      });
    }

    let insertedRows;
    let skippedRows = [];

    if (preview.isNewTemplate) {
      const result = await insertTemplateRows(previewTemplate, preview.validRows, req.session.user.username);
      insertedRows = result.inserted;
      skippedRows = result.skippedRows;
    } else {
      insertedRows = await importRows(batchId, preview.validRows);
    }

    req.session.preview = null;

    const skipMsg = skippedRows.length > 0 ? `, пропущено дублей: ${skippedRows.length}` : "";
    return res.render("upload", {
      error: null,
      success: `Импорт завершен успешно. Batch ID: ${batchId}, записей: ${insertedRows}${skipMsg}`,
      selectedTemplate: previewTemplate,
      templates: importTemplates
    });
  } catch (error) {
    return res.status(500).render("upload", {
      error: `Ошибка импорта: ${error.message}`,
      success: null,
      selectedTemplate: getTemplateById(defaultTemplateId),
      templates: importTemplates
    });
  }
});

app.get("/history", requireAdmin, async (req, res) => {
  try {
    const history = await getHistory();
    const historyWithErrors = await Promise.all(
      history.map(async (batch) => ({
        ...batch,
        errors: await getBatchErrors(batch.id)
      }))
    );

    return res.render("history", {
      history: historyWithErrors,
      error: null
    });
  } catch (error) {
    return res.status(500).render("history", {
      history: [],
      error:
        error && error.message
          ? `Ошибка подключения к базе данных: ${error.message}`
          : "Ошибка подключения к базе данных"
    });
  }
});

app.get("/free-upload", requireAuth, async (req, res) => {
  if (req.query.reset) {
    req.session.freePreview = null;
  }
  const { username, role } = req.session.user;
  const isAdmin = role === "admin";
  const freeTables = await getFreeTableList(username, isAdmin).catch(() => []);
  res.render("free-upload", { error: null, success: null, freeTables, isAdmin, freePreview: req.session.freePreview || null });
});

app.post("/free-upload", requireAuth, upload.single("excelFile"), async (req, res) => {
  const { username, role } = req.session.user;
  const isAdmin = role === "admin";
  let filePath;
  try {
    if (!req.file) {
      const freeTables = await getFreeTableList(username, isAdmin).catch(() => []);
      return res.render("free-upload", { error: "Выберите Excel-файл для загрузки", success: null, freeTables, isAdmin });
    }
    filePath = req.file.path;
    const originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    req.session.freePreview = parseExcelFree(filePath, originalname);
    return res.redirect("/free-upload");
  } catch (err) {
    const freeTables = await getFreeTableList(username, isAdmin).catch(() => []);
    return res.render("free-upload", { error: err.message, success: null, freeTables, isAdmin });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

app.post("/free-drop", requireAuth, async (req, res) => {
  const { username, role } = req.session.user;
  const isAdmin = role === "admin";
  let successMsg = null;
  let errorMsg = null;
  try {
    const tableName = sanitizeFreeId(String(req.body.tableName || "").trim());
    if (!tableName.startsWith("free_")) throw new Error("Можно удалять только таблицы с префиксом free_");
    const dropResult = await dropFreeTable(tableName, username, isAdmin);
    req.session.freePreview = null;
    successMsg = dropResult.dropped
      ? `Таблица [${tableName}] полностью удалена`
      : `Ваши строки из [${tableName}] удалены (${dropResult.deleted} записей)`;
  } catch (err) {
    errorMsg = err.message;
  }
  const freeTables = await getFreeTableList(username, isAdmin).catch(() => []);
  return res.render("free-upload", { error: errorMsg, success: successMsg, freeTables, isAdmin, skippedRows: null });
});

app.post("/free-import", requireAuth, async (req, res) => {
  const { username, role } = req.session.user;
  const isAdmin = role === "admin";
  const preview = req.session.freePreview;
  if (!preview) {
    const freeTables = await getFreeTableList(username, isAdmin).catch(() => []);
    return res.render("free-upload", { error: "Сначала загрузите файл", success: null, freeTables, isAdmin, skippedRows: null });
  }

  try {
    const rawSuffix = sanitizeFreeId(String(req.body.tableNameSuffix || "").trim() || preview.tableName);
    const tableName = `free_${rawSuffix}`.slice(0, 128);
    const mode = ["insert", "replace", "upsert"].includes(req.body.mode) ? req.body.mode : "insert";
    const rawKeys = req.body.keyColumns;
    const keyColIndexes = mode === "upsert" && rawKeys
      ? (Array.isArray(rawKeys) ? rawKeys : [rawKeys]).map(Number).filter((n) => !isNaN(n))
      : [];

    const columns = preview.columns.map((col, i) => ({
      ...col,
      safeName: sanitizeFreeId(String(req.body[`col_${i}_name`] || col.safeName).trim()) || col.safeName,
      selectedType: req.body[`col_${i}_type`] || col.inferredType
    }));

    if (mode === "upsert" && keyColIndexes.length === 0) {
      const freeTables = await getFreeTableList(username, isAdmin).catch(() => []);
      return res.render("free-upload", {
        error: "Для режима UPSERT выберите хотя бы один ключевой столбец",
        success: null, freeTables, isAdmin, skippedRows: null
      });
    }

    if (mode === "insert") {
      const duplicate = await checkDuplicateFileFree(preview.fileHash);
      if (duplicate) {
        const freeTables = await getFreeTableList(username, isAdmin).catch(() => []);
        return res.render("free-upload", {
          error: `Этот файл уже был загружен ранее (${new Date(duplicate.uploaded_at).toLocaleString("ru-RU")}). Если хотите загрузить другой файл — нажмите «Отмена».`,
          success: null, freeTables, isAdmin, skippedRows: null
        });
      }
    }

    const exists = await tableExists(tableName);

    let result;
    if (mode === "replace") {
      result = await insertFreeRows(tableName, columns, preview.rows, username, exists, true);
      if (exists) await clearTableOwnership(tableName);
    } else if (mode === "upsert") {
      result = await upsertFreeRows(tableName, columns, preview.rows, username, keyColIndexes, exists);
    } else {
      result = await insertFreeRows(tableName, columns, preview.rows, username, exists, false);
    }

    try {
      await saveFreeImportBatch({
        fileHash: preview.fileHash,
        fileName: preview.originalFileName,
        tableName,
        rowCount: result.inserted,
        uploadedBy: username
      });
    } catch { /* non-critical — hash may already exist for replace/upsert re-uploads */ }

    req.session.freePreview = null;

    const modeLabel = { insert: "Вставка", replace: "Замена", upsert: "Обновление (UPSERT)" }[mode];
    const skipNote = result.skippedRows.length > 0 ? `, пропущено дублей: ${result.skippedRows.length}` : "";
    const msg = exists
      ? `${modeLabel} завершена. Таблица [${tableName}]: вставлено ${result.inserted}${skipNote}`
      : `Таблица [${tableName}] создана. Вставлено: ${result.inserted}`;

    const freeTables = await getFreeTableList(username, isAdmin).catch(() => []);
    return res.render("free-upload", { error: null, success: msg, skippedRows: result.skippedRows.slice(0, 100), freeTables, isAdmin });
  } catch (err) {
    const freeTables = await getFreeTableList(username, isAdmin).catch(() => []);
    return res.render("free-upload", { error: `Ошибка импорта: ${err.message}`, success: null, skippedRows: null, freeTables, isAdmin });
  }
});

app.get("/export", requireAuth, (req, res) => {
  res.render("export");
});

app.use("/admin", adminRouter);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).render("upload", {
      error: `Ошибка загрузки файла: ${error.message}`,
      success: null,
      selectedTemplate: getTemplateById(defaultTemplateId),
      templates: importTemplates
    });
  }

  return res.status(500).render("upload", {
    error: error.message || "Внутренняя ошибка сервера",
    success: null,
    selectedTemplate: getTemplateById(defaultTemplateId),
    templates: importTemplates
  });
});

app.listen(config.port, () => {
  console.log(`Training portal started on http://localhost:${config.port}`);
});
