const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const MemoryStoreFactory = require("memorystore");
const multer = require("multer");
const config = require("./config");
const { requireAuth } = require("./middleware/auth");
const { verifyUser } = require("./services/authService");
const { parseWorkbook } = require("./services/excelService");
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
  checkDuplicateFile: checkDuplicateFileFree,
  saveFreeImportBatch
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

  req.session.user = user;
  return res.redirect("/");
});

app.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.get("/upload", requireAuth, (req, res) => {
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

app.post("/upload", requireAuth, upload.single("excelFile"), async (req, res) => {
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
    const workbook = parseWorkbook(filePath);
    const duplicateBatch = await checkDuplicateFile(workbook.fileHash);

    if (duplicateBatch) {
      return res.status(409).render("upload", {
        error: `Этот файл уже был загружен ранее. Batch ID: ${duplicateBatch.id}`,
        success: null,
        selectedTemplate,
        templates: importTemplates
      });
    }

    const cleanCandidates = workbook.rows.filter((row) => row.errors.length === 0);
    const existingKeys = await checkExistingRows(
      cleanCandidates.map((row) => row.data)
    );

    workbook.rows.forEach((row) => {
      const key = [
        row.data.employee_id,
        row.data.course_code,
        row.data.completion_date
      ].join("|");

      if (existingKeys.has(key)) {
        row.errors.push({
          rowNumber: row.rowNumber,
          field: "duplicate",
          message: "Запись уже существует в базе"
        });
      }
    });

    const allErrors = workbook.rows.flatMap((row) => row.errors);
    const validRows = workbook.rows
      .filter((row) => row.errors.length === 0)
      .map((row) => row.data);

    req.session.preview = {
      templateType: selectedTemplate.id,
      templateName: selectedTemplate.name,
      originalFileName: Buffer.from(req.file.originalname, "latin1").toString("utf8"),
      fileHash: workbook.fileHash,
      totalRows: workbook.rows.length,
      validRows,
      errors: allErrors,
      uploadedAt: new Date().toISOString()
    };

    return res.render("upload", {
      error: null,
      success: "Файл проверен. Просмотрите результат перед импортом.",
      selectedTemplate,
      templates: importTemplates
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

app.post("/import", requireAuth, async (req, res) => {
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

    const insertedRows = await importRows(batchId, preview.validRows);
    req.session.preview = null;

    return res.render("upload", {
      error: null,
      success: `Импорт завершен успешно. Batch ID: ${batchId}, записей: ${insertedRows}`,
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

app.get("/history", requireAuth, async (req, res) => {
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

app.get("/free-upload", requireAuth, (req, res) => {
  if (req.query.reset) {
    req.session.freePreview = null;
  }
  res.render("free-upload", { error: null, success: null });
});

app.post("/free-upload", requireAuth, upload.single("excelFile"), async (req, res) => {
  let filePath;
  try {
    if (!req.file) {
      return res.render("free-upload", { error: "Выберите Excel-файл для загрузки", success: null });
    }
    filePath = req.file.path;
    const originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    req.session.freePreview = parseExcelFree(filePath, originalname);
    return res.redirect("/free-upload");
  } catch (err) {
    return res.render("free-upload", { error: err.message, success: null });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

app.post("/free-import", requireAuth, async (req, res) => {
  const preview = req.session.freePreview;
  if (!preview) {
    return res.render("free-upload", { error: "Сначала загрузите файл", success: null });
  }

  try {
    const tableName = sanitizeFreeId(String(req.body.tableName || "").trim() || preview.tableName);
    const columns = preview.columns.map((col, i) => ({
      ...col,
      safeName: sanitizeFreeId(String(req.body[`col_${i}_name`] || col.safeName).trim()) || col.safeName,
      selectedType: req.body[`col_${i}_type`] || col.inferredType
    }));

    const duplicate = await checkDuplicateFileFree(preview.fileHash);
    if (duplicate) {
      return res.render("free-upload", {
        error: `Этот файл уже был загружен ранее (${new Date(duplicate.uploaded_at).toLocaleString("ru-RU")}). Если хотите загрузить другой файл — нажмите «Отмена».`,
        success: null,
        skippedRows: null
      });
    }

    const exists = await tableExists(tableName);
    if (!exists) {
      await createTable(tableName, columns);
    }

    const result = await insertFreeRows(tableName, columns, preview.rows, req.session.user.username, exists);
    await saveFreeImportBatch({
      fileHash: preview.fileHash,
      fileName: preview.originalFileName,
      tableName,
      rowCount: result.inserted,
      uploadedBy: req.session.user.username
    });
    req.session.freePreview = null;

    const msg = exists
      ? `Данные добавлены в таблицу [${tableName}]. Вставлено: ${result.inserted}, пропущено дублей: ${result.skippedRows.length}`
      : `Таблица [${tableName}] создана. Вставлено: ${result.inserted}, пропущено дублей: ${result.skippedRows.length}`;

    return res.render("free-upload", { error: null, success: msg, skippedRows: result.skippedRows.slice(0, 100) });
  } catch (err) {
    return res.render("free-upload", { error: `Ошибка импорта: ${err.message}`, success: null, skippedRows: null });
  }
});

app.get("/export", requireAuth, (req, res) => {
  res.render("export");
});

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
