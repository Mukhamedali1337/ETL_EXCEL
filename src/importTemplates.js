const { REQUIRED_HEADERS } = require("./services/excelService");

const importTemplates = [
  {
    id: "training_records",
    name: "Обучение сотрудников",
    description: "Текущий рабочий шаблон для загрузки результатов обучения.",
    ready: true,
    tableName: null,
    columns: null,
    requiredHeaders: REQUIRED_HEADERS,
    rules: [
      "Обязательные поля и типы проверяются автоматически",
      "Проверка дублей в файле и в БД",
      "Импорт в таблицу dbo.training_records"
    ]
  },

  {
    id: "welcome_attendance",
    name: "Welcome (Адаптация)",
    description: "Посещаемость адаптационного обучения новых сотрудников.",
    ready: true,
    tableName: "welcome_attendance",
    columns: [
      { excelHeader: "Дата",            sqlName: "training_date", type: "DATE" },
      { excelHeader: "ИИН",             sqlName: "iin",           type: "NVARCHAR(20)" },
      { excelHeader: "Подразделение",   sqlName: "department",    type: "NVARCHAR(255)" },
      { excelHeader: "Сотрудник (ФИ)",  sqlName: "employee_name", type: "NVARCHAR(255)" },
      { excelHeader: "Должность",       sqlName: "position",      type: "NVARCHAR(255)" },
      { excelHeader: "Явка/неявка",     sqlName: "attended",      type: "NVARCHAR(20)" }
    ],
    requiredHeaders: ["Дата", "ИИН", "Подразделение", "Сотрудник (ФИ)", "Должность", "Явка/неявка"],
    rules: [
      "Явка/неявка — строго строчными: явка / неявка",
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
    columns: [
      { excelHeader: "ИИН тренера",             sqlName: "trainer_iin",       type: "NVARCHAR(20)" },
      { excelHeader: "ФИ тренера",              sqlName: "trainer_name",      type: "NVARCHAR(255)" },
      { excelHeader: "ИИН сотрудника",          sqlName: "employee_iin",      type: "NVARCHAR(20)" },
      { excelHeader: "ФИ сотрудника",           sqlName: "employee_name",     type: "NVARCHAR(255)" },
      { excelHeader: "Дата обучения",           sqlName: "training_date",     type: "DATE" },
      { excelHeader: "Тема обучения",           sqlName: "topic",             type: "NVARCHAR(255)" },
      { excelHeader: "Длительность (мин.)",     sqlName: "duration_min",      type: "INT" },
      { excelHeader: "Балл по чек-листу",       sqlName: "checklist_score",   type: "FLOAT" },
      { excelHeader: "Доля обученности %",      sqlName: "training_rate_pct", type: "FLOAT" },
      { excelHeader: "KPI сотрудника %",        sqlName: "kpi_pct",           type: "FLOAT" },
      { excelHeader: "Прирост KPI %",           sqlName: "kpi_growth_pct",    type: "FLOAT" },
      { excelHeader: "Выплата тренеру (фикс)",  sqlName: "payment_fixed",     type: "DECIMAL(10,2)" },
      { excelHeader: "Выплата тренеру (бонус)", sqlName: "payment_bonus",     type: "DECIMAL(10,2)" }
    ],
    requiredHeaders: ["ИИН тренера", "ИИН сотрудника", "Дата обучения"],
    rules: [
      "Проценты — только число без знака %: 20, не 20%",
      "Суммы — точка как разделитель: 2500.4, не 2500,4",
      "ИИН — 12 цифр без пробелов"
    ]
  },

  {
    id: "attestation",
    name: "Аттестация",
    description: "Результаты аттестации сотрудников.",
    ready: true,
    tableName: "attestation",
    columns: [
      { excelHeader: "Дата",          sqlName: "exam_date",   type: "DATE" },
      { excelHeader: "ИИН",           sqlName: "iin",         type: "NVARCHAR(20)" },
      { excelHeader: "ФИ",            sqlName: "full_name",   type: "NVARCHAR(255)" },
      { excelHeader: "Доп. Балл",     sqlName: "bonus_score", type: "FLOAT" },
      { excelHeader: "Подтверждение", sqlName: "confirmed",   type: "NVARCHAR(5)" }
    ],
    requiredHeaders: ["Дата", "ИИН", "ФИ", "Доп. Балл", "Подтверждение"],
    rules: [
      "Подтверждение — строго строчными: да / нет",
      "ИИН — 12 цифр без пробелов"
    ]
  },

  {
    id: "supervisor_school",
    name: "Школа супервайзеров",
    description: "Посещаемость и оценки школы супервайзеров.",
    ready: true,
    tableName: "school_sessions",
    autoFields: [{ sqlName: "school_type", type: "NVARCHAR(50)", value: "supervisor" }],
    columns: [
      { excelHeader: "ИИН",                           sqlName: "iin",                      type: "NVARCHAR(20)" },
      { excelHeader: "Имя",                           sqlName: "name",                     type: "NVARCHAR(255)" },
      { excelHeader: "Группа №",                      sqlName: "group_number",             type: "INT" },
      { excelHeader: "Дата",                          sqlName: "training_date",            type: "DATE" },
      { excelHeader: "Наименование модуля",           sqlName: "module_name",              type: "NVARCHAR(255)" },
      { excelHeader: "Тема",                          sqlName: "topic",                    type: "NVARCHAR(255)" },
      { excelHeader: "Присутствие (балл)",            sqlName: "attendance_score",         type: "FLOAT" },
      { excelHeader: "Срок предоставления ДЗ (балл)", sqlName: "homework_deadline_score",  type: "FLOAT" },
      { excelHeader: "Качество ДЗ (балл)",            sqlName: "homework_quality_score",   type: "FLOAT" }
    ],
    requiredHeaders: ["ИИН", "Группа №", "Дата"],
    rules: [
      "Группа № — только цифра: 1, 2, 3",
      "Баллы — числа от 0 до 100",
      "Импортируется в таблицу dbo.school_sessions с типом supervisor"
    ]
  },

  {
    id: "director_school",
    name: "Школа директоров",
    description: "Посещаемость и оценки школы директоров.",
    ready: true,
    tableName: "school_sessions",
    autoFields: [{ sqlName: "school_type", type: "NVARCHAR(50)", value: "director" }],
    columns: [
      { excelHeader: "ИИН",                           sqlName: "iin",                      type: "NVARCHAR(20)" },
      { excelHeader: "Имя",                           sqlName: "name",                     type: "NVARCHAR(255)" },
      { excelHeader: "Группа №",                      sqlName: "group_number",             type: "INT" },
      { excelHeader: "Дата",                          sqlName: "training_date",            type: "DATE" },
      { excelHeader: "Наименование модуля",           sqlName: "module_name",              type: "NVARCHAR(255)" },
      { excelHeader: "Тема",                          sqlName: "topic",                    type: "NVARCHAR(255)" },
      { excelHeader: "Присутствие (балл)",            sqlName: "attendance_score",         type: "FLOAT" },
      { excelHeader: "Срок предоставления ДЗ (балл)", sqlName: "homework_deadline_score",  type: "FLOAT" },
      { excelHeader: "Качество ДЗ (балл)",            sqlName: "homework_quality_score",   type: "FLOAT" }
    ],
    requiredHeaders: ["ИИН", "Группа №", "Дата"],
    rules: [
      "Группа № — только цифра: 1, 2, 3",
      "Баллы — числа от 0 до 100",
      "Импортируется в таблицу dbo.school_sessions с типом director"
    ]
  },

  {
    id: "external_training",
    name: "Внешнее обучение",
    description: "Внешние тренинги и курсы сотрудников.",
    ready: true,
    tableName: "external_training",
    columns: [
      { excelHeader: "Дата начала",                       sqlName: "start_date",        type: "DATE" },
      { excelHeader: "Дата окончания",                    sqlName: "end_date",          type: "DATE" },
      { excelHeader: "Наименование обучения",             sqlName: "training_name",     type: "NVARCHAR(255)" },
      { excelHeader: "ИИН сотрудника",                   sqlName: "employee_iin",      type: "NVARCHAR(20)" },
      { excelHeader: "Сотрудник (ФИ)",                   sqlName: "employee_name",     type: "NVARCHAR(255)" },
      { excelHeader: "Статус",                           sqlName: "status",            type: "NVARCHAR(50)" },
      { excelHeader: "Оценка курса сотрудником",         sqlName: "employee_rating",   type: "FLOAT" },
      { excelHeader: "Оценка сотрудника руководителем",  sqlName: "manager_rating",    type: "FLOAT" },
      { excelHeader: "Количество часов",                 sqlName: "hours",             type: "FLOAT" },
      { excelHeader: "Стоимость обучения",               sqlName: "cost",              type: "DECIMAL(10,2)" },
      { excelHeader: "Срок отработки (мес.)",            sqlName: "commitment_months", type: "INT" }
    ],
    requiredHeaders: ["Дата начала", "ИИН сотрудника", "Наименование обучения"],
    rules: [
      "Статус — строго: прошел / не прошел / в процессе",
      "Стоимость — только цифры без пробелов: 498000"
    ]
  },

  {
    id: "internal_training",
    name: "Внутреннее очное обучение",
    description: "Внутренние тренинги с тренерами.",
    ready: true,
    tableName: "internal_training",
    columns: [
      { excelHeader: "Дата",                                sqlName: "training_date",   type: "DATE" },
      { excelHeader: "Тренинг",                             sqlName: "training_name",   type: "NVARCHAR(255)" },
      { excelHeader: "Город проведения",                    sqlName: "city",            type: "NVARCHAR(100)" },
      { excelHeader: "Формат",                              sqlName: "format",          type: "NVARCHAR(20)" },
      { excelHeader: "ИИН тренера",                         sqlName: "trainer_iin",     type: "NVARCHAR(20)" },
      { excelHeader: "ФИ тренера",                          sqlName: "trainer_name",    type: "NVARCHAR(255)" },
      { excelHeader: "ИИН сотрудника",                      sqlName: "employee_iin",    type: "NVARCHAR(20)" },
      { excelHeader: "Сотрудник (ФИ)",                      sqlName: "employee_name",   type: "NVARCHAR(255)" },
      { excelHeader: "Явка/неявка",                         sqlName: "attended",        type: "NVARCHAR(20)" },
      { excelHeader: "Оценка тренинга сотрудником",         sqlName: "employee_rating", type: "FLOAT" },
      { excelHeader: "Оценка сотрудника руководителем",     sqlName: "manager_rating",  type: "FLOAT" },
      { excelHeader: "Часы",                                sqlName: "hours",           type: "FLOAT" }
    ],
    requiredHeaders: ["Дата", "ИИН сотрудника", "Тренинг"],
    rules: [
      "Формат — строго: онлайн / оффлайн",
      "Явка/неявка — строго: явка / неявка"
    ]
  },

  {
    id: "vendor_training",
    name: "Обучение вендоров",
    description: "Обучение от внешних вендоров.",
    ready: true,
    tableName: "vendor_training",
    columns: [
      { excelHeader: "Дата",             sqlName: "training_date", type: "DATE" },
      { excelHeader: "Вендор",           sqlName: "vendor",        type: "NVARCHAR(255)" },
      { excelHeader: "Тема тренинга",    sqlName: "topic",         type: "NVARCHAR(255)" },
      { excelHeader: "Место проведения", sqlName: "location",      type: "NVARCHAR(255)" },
      { excelHeader: "Формат",           sqlName: "format",        type: "NVARCHAR(20)" },
      { excelHeader: "ИИН",              sqlName: "iin",           type: "NVARCHAR(20)" },
      { excelHeader: "Сотрудник (ФИ)",   sqlName: "employee_name", type: "NVARCHAR(255)" },
      { excelHeader: "Явка/неявка",      sqlName: "attended",      type: "NVARCHAR(20)" },
      { excelHeader: "Набранный балл",   sqlName: "score",         type: "FLOAT" },
      { excelHeader: "Часы",             sqlName: "hours",         type: "FLOAT" }
    ],
    requiredHeaders: ["Дата", "ИИН", "Вендор"],
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
    columns: [
      { excelHeader: "ИИН стажера",               sqlName: "intern_iin",            type: "NVARCHAR(20)" },
      { excelHeader: "Стажер (ФИ)",               sqlName: "intern_name",           type: "NVARCHAR(255)" },
      { excelHeader: "ИИН наставника",            sqlName: "mentor_iin",            type: "NVARCHAR(20)" },
      { excelHeader: "Наставник",                 sqlName: "mentor_name",           type: "NVARCHAR(255)" },
      { excelHeader: "Категория наставника",      sqlName: "mentor_category",       type: "NVARCHAR(10)" },
      { excelHeader: "Дата начала стажировки",    sqlName: "internship_start_date", type: "DATE" },
      { excelHeader: "Баллы — вводное обучение",  sqlName: "score_intro",           type: "INT" },
      { excelHeader: "Тест",                      sqlName: "score_test",            type: "INT" },
      { excelHeader: "Ежемес. обучение",          sqlName: "score_monthly_training",type: "INT" },
      { excelHeader: "ТО",                        sqlName: "score_to",              type: "INT" },
      { excelHeader: "Аксессы / Анкета стажера",  sqlName: "score_accessories",     type: "INT" },
      { excelHeader: "Смарты / Анкета директора", sqlName: "score_smarts",          type: "INT" },
      { excelHeader: "Услуги / Итоговый опрос",   sqlName: "score_services",        type: "INT" },
      { excelHeader: "НПС штраф",                 sqlName: "penalty_nps",           type: "INT" },
      { excelHeader: "БАЛЛЫ (итого)",             sqlName: "total_score",           type: "INT" },
      { excelHeader: "1 балл =",                  sqlName: "score_value",           type: "DECIMAL(10,2)" },
      { excelHeader: "Итоговая сумма",            sqlName: "total_amount",          type: "DECIMAL(10,2)" }
    ],
    requiredHeaders: ["ИИН стажера", "ИИН наставника", "Дата начала стажировки"],
    rules: [
      "Категория наставника — только латиница: A / B / A1 / B1",
      "Столбец «Срок в программе» в файле можно оставить — он игнорируется при импорте",
      "НПС штраф — отрицательное число: -2"
    ]
  }
];

function getTemplateById(id) {
  return importTemplates.find((t) => t.id === id) || null;
}

const defaultTemplateId = importTemplates[0].id;

module.exports = { importTemplates, getTemplateById, defaultTemplateId };
