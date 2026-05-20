const importTemplates = [
  {
    id: "welcome_attendance",
    name: "Welcome (Адаптация)",
    description: "Посещаемость адаптационного обучения новых сотрудников.",
    ready: true,
    tableName: "welcome_attendance",
    uniqueKey: ["training_date", "employee_name"],
    columns: [
      { excelHeader: "Дата",             sqlName: "training_date", type: "DATE" },
      { excelHeader: "ИИН сотрудника",   sqlName: "employee_iin",  type: "NVARCHAR(20)" },
      { excelHeader: "Подразделение",    sqlName: "department",    type: "NVARCHAR(255)" },
      { excelHeader: "ФИ сотрудника",    sqlName: "employee_name", type: "NVARCHAR(255)" },
      { excelHeader: "Должность",        sqlName: "position",      type: "NVARCHAR(255)" },
      { excelHeader: "Явка/неявка",      sqlName: "attended",      type: "NVARCHAR(20)" },
      { excelHeader: "ИИН тренера",      sqlName: "trainer_iin",   type: "NVARCHAR(12)" }
    ],
    requiredHeaders: ["Дата", "ИИН сотрудника", "ФИ сотрудника"],
    rules: [
      "Явка/неявка — строго: явка / неявка",
      "ИИН — ровно 12 цифр без пробелов",
      "Дата — формат ДД.ММ.ГГГГ"
    ]
  },

  {
    id: "internal_trainer_sessions",
    name: "Внутренний тренер",
    description: "Сессии внутренних тренеров с сотрудниками.",
    ready: true,
    tableName: "internal_trainer_sessions",
    uniqueKey: null,
    columns: [
      { excelHeader: "ИИН тренера",              sqlName: "trainer_iin",       type: "NVARCHAR(20)" },
      { excelHeader: "ФИ тренера",               sqlName: "trainer_name",      type: "NVARCHAR(255)" },
      { excelHeader: "ИИН сотрудника",           sqlName: "employee_iin",      type: "NVARCHAR(20)" },
      { excelHeader: "ФИ сотрудника",            sqlName: "employee_name",     type: "NVARCHAR(255)" },
      { excelHeader: "Дата обучения",            sqlName: "training_date",     type: "DATE" },
      { excelHeader: "Тема обучения",            sqlName: "topic",             type: "NVARCHAR(255)" },
      { excelHeader: "Длительность (мин.)",      sqlName: "duration_min",      type: "INT" },
      { excelHeader: "Балл по чек-листу %",      sqlName: "checklist_score",   type: "FLOAT" },
      { excelHeader: "Доля обученности %",       sqlName: "training_rate_pct", type: "FLOAT" },
      { excelHeader: "KPI сотрудника %",         sqlName: "kpi_pct",           type: "FLOAT" },
      { excelHeader: "Прирост KPI %",            sqlName: "kpi_growth_pct",    type: "FLOAT" },
      { excelHeader: "Выплата тренеру (фикс)",   sqlName: "payment_fixed",     type: "DECIMAL(10,3)" },
      { excelHeader: "Выплата тренеру (бонус)",  sqlName: "payment_bonus",     type: "DECIMAL(10,3)" },
      { excelHeader: "Наличие сертификата",      sqlName: "has_certificate",   type: "NVARCHAR(20)" }
    ],
    requiredHeaders: ["ИИН тренера", "ИИН сотрудника", "Дата обучения"],
    rules: [
      "Проценты — только число без знака %: 20, не 20%",
      "Суммы — точка как разделитель: 2500.450, не 2500,450",
      "Наличие сертификата — строго: да / нет",
      "ИИН — 12 цифр без пробелов"
    ]
  },

  {
    id: "attestation",
    name: "Аттестация",
    description: "Результаты аттестации сотрудников.",
    ready: true,
    tableName: "attestation",
    uniqueKey: ["exam_date", "employee_name"],
    columns: [
      { excelHeader: "ID аттестации",         sqlName: "attestation_id",   type: "NVARCHAR(48)" },
      { excelHeader: "Наименование аттестации", sqlName: "attestation_name", type: "NVARCHAR(48)" },
      { excelHeader: "Дата",                  sqlName: "exam_date",        type: "DATE" },
      { excelHeader: "ИИН сотрудника",        sqlName: "employee_iin",     type: "NVARCHAR(20)" },
      { excelHeader: "ФИ сотрудника",         sqlName: "employee_name",    type: "NVARCHAR(255)" },
      { excelHeader: "Доп. Балл",             sqlName: "bonus_score",      type: "FLOAT" },
      { excelHeader: "Подтверждение",         sqlName: "confirmed",        type: "NVARCHAR(5)" }
    ],
    requiredHeaders: ["Дата", "ИИН сотрудника", "ФИ сотрудника"],
    rules: [
      "Подтверждение — строго: да / нет",
      "ИИН — 12 цифр без пробелов"
    ]
  },

  {
    id: "supervisor_school",
    name: "Школа супервайзеров",
    description: "Посещаемость и оценки школы супервайзеров.",
    ready: true,
    tableName: "school_sessions",
    uniqueKey: ["training_date", "employee_name", "topic"],
    autoFields: [{ sqlName: "school_type", type: "NVARCHAR(50)", value: "supervisor" }],
    columns: [
      { excelHeader: "ИИН сотрудника",                sqlName: "employee_iin",             type: "NVARCHAR(20)" },
      { excelHeader: "ФИ сотрудника",                 sqlName: "employee_name",            type: "NVARCHAR(255)" },
      { excelHeader: "Группа №",                      sqlName: "group_number",             type: "INT" },
      { excelHeader: "Дата",                          sqlName: "training_date",            type: "DATE" },
      { excelHeader: "Наименование модуля",           sqlName: "module_name",              type: "NVARCHAR(255)" },
      { excelHeader: "Тема",                          sqlName: "topic",                    type: "NVARCHAR(255)" },
      { excelHeader: "Присутствие (балл) %",          sqlName: "attendance_score",         type: "FLOAT" },
      { excelHeader: "Срок предоставления ДЗ (балл) %", sqlName: "homework_deadline_score", type: "FLOAT" },
      { excelHeader: "Качество ДЗ (балл) %",          sqlName: "homework_quality_score",   type: "FLOAT" },
      { excelHeader: "Завершено",                     sqlName: "completed",                type: "NVARCHAR(12)" }
    ],
    requiredHeaders: ["ИИН сотрудника", "Группа №", "Дата"],
    rules: [
      "Группа № — только цифра: 1, 2, 3",
      "Баллы — числа процент: 0–100",
      "Завершено — строго: да / нет / отчислен",
      "Импортируется в dbo.school_sessions с типом supervisor"
    ]
  },

  {
    id: "director_school",
    name: "Школа директоров",
    description: "Посещаемость и оценки школы директоров.",
    ready: true,
    tableName: "school_sessions",
    uniqueKey: ["training_date", "employee_name", "topic"],
    autoFields: [{ sqlName: "school_type", type: "NVARCHAR(50)", value: "director" }],
    columns: [
      { excelHeader: "ИИН сотрудника",                sqlName: "employee_iin",             type: "NVARCHAR(20)" },
      { excelHeader: "ФИ сотрудника",                 sqlName: "employee_name",            type: "NVARCHAR(255)" },
      { excelHeader: "Группа №",                      sqlName: "group_number",             type: "INT" },
      { excelHeader: "Дата",                          sqlName: "training_date",            type: "DATE" },
      { excelHeader: "Наименование модуля",           sqlName: "module_name",              type: "NVARCHAR(255)" },
      { excelHeader: "Тема",                          sqlName: "topic",                    type: "NVARCHAR(255)" },
      { excelHeader: "Присутствие (балл) %",          sqlName: "attendance_score",         type: "FLOAT" },
      { excelHeader: "Срок предоставления ДЗ (балл) %", sqlName: "homework_deadline_score", type: "FLOAT" },
      { excelHeader: "Качество ДЗ (балл) %",          sqlName: "homework_quality_score",   type: "FLOAT" },
      { excelHeader: "Завершено",                     sqlName: "completed",                type: "NVARCHAR(12)" }
    ],
    requiredHeaders: ["ИИН сотрудника", "Группа №", "Дата"],
    rules: [
      "Группа № — только цифра: 1, 2, 3",
      "Баллы — числа процент: 0–100",
      "Завершено — строго: да / нет / отчислен",
      "Импортируется в dbo.school_sessions с типом director"
    ]
  },

  {
    id: "external_training",
    name: "Внешнее обучение",
    description: "Внешние тренинги и курсы сотрудников.",
    ready: true,
    tableName: "external_training",
    uniqueKey: null,
    columns: [
      { excelHeader: "Дата начала",                       sqlName: "start_date",            type: "DATE" },
      { excelHeader: "Дата окончания",                    sqlName: "end_date",              type: "DATE" },
      { excelHeader: "Наименование обучения",             sqlName: "training_name",         type: "NVARCHAR(255)" },
      { excelHeader: "ИИН сотрудника",                   sqlName: "employee_iin",          type: "NVARCHAR(20)" },
      { excelHeader: "ФИ сотрудника",                    sqlName: "employee_name",         type: "NVARCHAR(255)" },
      { excelHeader: "Оценка курса сотрудником",         sqlName: "employee_rating",       type: "FLOAT" },
      { excelHeader: "Оценка сотрудника руководителем",  sqlName: "manager_rating",        type: "FLOAT" },
      { excelHeader: "Количество часов",                 sqlName: "hours",                 type: "FLOAT" },
      { excelHeader: "Стоимость обучения",               sqlName: "cost",                  type: "DECIMAL(10,3)" },
      { excelHeader: "Срок отработки (мес.)",            sqlName: "commitment_months",     type: "INT" },
      { excelHeader: "Срок погашения доли (30%) (мес.)", sqlName: "repayment_term_months", type: "INT" },
      { excelHeader: "Стоимость обучения (30%)",         sqlName: "cost_30pct",            type: "DECIMAL(10,3)" }
    ],
    requiredHeaders: ["Дата начала", "ИИН сотрудника", "Наименование обучения"],
    rules: [
      "Стоимость — только цифры без пробелов: 498000",
      "Оценки — дробные числа: 4.5"
    ]
  },

  {
    id: "internal_training",
    name: "Внутреннее очное обучение",
    description: "Внутренние тренинги с тренерами.",
    ready: true,
    tableName: "internal_training",
    uniqueKey: null,
    columns: [
      { excelHeader: "Дата",                                sqlName: "training_date",   type: "DATE" },
      { excelHeader: "Тренинг",                             sqlName: "training_name",   type: "NVARCHAR(255)" },
      { excelHeader: "Город проведения",                    sqlName: "city",            type: "NVARCHAR(100)" },
      { excelHeader: "Формат",                              sqlName: "format",          type: "NVARCHAR(20)" },
      { excelHeader: "ИИН тренера",                         sqlName: "trainer_iin",     type: "NVARCHAR(20)" },
      { excelHeader: "ФИ тренера",                          sqlName: "trainer_name",    type: "NVARCHAR(255)" },
      { excelHeader: "ИИН сотрудника",                      sqlName: "employee_iin",    type: "NVARCHAR(20)" },
      { excelHeader: "ФИ сотрудника",                       sqlName: "employee_name",   type: "NVARCHAR(255)" },
      { excelHeader: "Явка/неявка",                         sqlName: "attended",        type: "NVARCHAR(20)" },
      { excelHeader: "Оценка тренинга сотрудником",         sqlName: "employee_rating", type: "FLOAT" },
      { excelHeader: "Оценка сотрудника руководителем",     sqlName: "manager_rating",  type: "FLOAT" },
      { excelHeader: "Часы",                                sqlName: "hours",           type: "FLOAT" },
      { excelHeader: "Затраты на проведение",               sqlName: "conduct_cost",    type: "DECIMAL(10,3)" }
    ],
    requiredHeaders: ["Дата", "ИИН сотрудника", "Тренинг"],
    rules: [
      "Формат — строго: онлайн / оффлайн",
      "Явка/неявка — строго: явка / неявка",
      "Оценки — дробные числа: 4.5"
    ]
  },

  {
    id: "vendor_training",
    name: "Обучение вендоров",
    description: "Обучение от внешних вендоров.",
    ready: true,
    tableName: "vendor_training",
    uniqueKey: null,
    columns: [
      { excelHeader: "Дата",             sqlName: "training_date", type: "DATE" },
      { excelHeader: "Вендор",           sqlName: "vendor",        type: "NVARCHAR(255)" },
      { excelHeader: "Тема тренинга",    sqlName: "topic",         type: "NVARCHAR(255)" },
      { excelHeader: "Место проведения", sqlName: "location",      type: "NVARCHAR(255)" },
      { excelHeader: "Формат",           sqlName: "format",        type: "NVARCHAR(20)" },
      { excelHeader: "ИИН сотрудника",   sqlName: "employee_iin",  type: "NVARCHAR(20)" },
      { excelHeader: "ФИ сотрудника",    sqlName: "employee_name", type: "NVARCHAR(255)" },
      { excelHeader: "Явка/неявка",      sqlName: "attended",      type: "NVARCHAR(20)" },
      { excelHeader: "Набранный балл %", sqlName: "score",         type: "FLOAT" },
      { excelHeader: "Часы",             sqlName: "hours",         type: "FLOAT" }
    ],
    requiredHeaders: ["Дата", "ИИН сотрудника", "Вендор"],
    rules: [
      "Формат — строго: онлайн / оффлайн",
      "Явка/неявка — строго: явка / неявка"
    ]
  },

  {
    id: "mentorship_program",
    name: "Вместе к успеху",
    description: "Программа наставничества для стажёров.",
    ready: true,
    tableName: "mentorship_program",
    uniqueKey: null,
    columns: [
      { excelHeader: "ИИН стажера",          sqlName: "intern_iin",      type: "NVARCHAR(20)" },
      { excelHeader: "ФИ стажера",           sqlName: "intern_name",     type: "NVARCHAR(255)" },
      { excelHeader: "ИИН наставника",       sqlName: "mentor_iin",      type: "NVARCHAR(20)" },
      { excelHeader: "ФИ наставника",        sqlName: "mentor_name",     type: "NVARCHAR(255)" },
      { excelHeader: "Категория наставника", sqlName: "mentor_category", type: "NVARCHAR(10)" },
      { excelHeader: "Баллы (итого) %",      sqlName: "total_score",     type: "FLOAT" },
      { excelHeader: "Итоговая сумма",       sqlName: "total_amount",    type: "DECIMAL(10,3)" },
      { excelHeader: "Статус стажера",       sqlName: "intern_status",   type: "NVARCHAR(12)" }
    ],
    requiredHeaders: ["ИИН стажера", "ИИН наставника"],
    rules: [
      "Категория наставника — только латиница: A / B / A1 / B1",
      "Статус стажера — строго: работает / не работает",
      "Баллы (итого) % — только число без знака %"
    ]
  }
];

function getTemplateById(id) {
  return importTemplates.find((t) => t.id === id) || null;
}

const defaultTemplateId = importTemplates[0].id;

module.exports = { importTemplates, getTemplateById, defaultTemplateId };
