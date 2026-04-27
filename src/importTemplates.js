const { REQUIRED_HEADERS } = require("./services/excelService");

const importTemplates = [
  {
    id: "training_records",
    name: "Обучение сотрудников",
    description: "Текущий рабочий шаблон для загрузки результатов обучения.",
    ready: true,
    requiredHeaders: REQUIRED_HEADERS,
    rules: [
      "Обязательные поля и типы проверяются автоматически",
      "Проверка дублей в файле и в БД",
      "Импорт в таблицу dbo.training_records"
    ]
  },
  {
    id: "template_2",
    name: "Шаблон 2",
    description: "Заглушка до согласования столбцов от отдела обучения.",
    ready: false,
    requiredHeaders: [],
    rules: ["Столбцы и правила будут добавлены после согласования"]
  },
  {
    id: "template_3",
    name: "Шаблон 3",
    description: "Заглушка до согласования столбцов от отдела обучения.",
    ready: false,
    requiredHeaders: [],
    rules: ["Столбцы и правила будут добавлены после согласования"]
  },
  {
    id: "template_4",
    name: "Шаблон 4",
    description: "Заглушка до согласования столбцов от отдела обучения.",
    ready: false,
    requiredHeaders: [],
    rules: ["Столбцы и правила будут добавлены после согласования"]
  },
  {
    id: "template_5",
    name: "Шаблон 5",
    description: "Заглушка до согласования столбцов от отдела обучения.",
    ready: false,
    requiredHeaders: [],
    rules: ["Столбцы и правила будут добавлены после согласования"]
  },
  {
    id: "template_6",
    name: "Шаблон 6",
    description: "Заглушка до согласования столбцов от отдела обучения.",
    ready: false,
    requiredHeaders: [],
    rules: ["Столбцы и правила будут добавлены после согласования"]
  }
];

function getTemplateById(id) {
  return importTemplates.find((template) => template.id === id) || null;
}

const defaultTemplateId = importTemplates[0].id;

module.exports = {
  importTemplates,
  getTemplateById,
  defaultTemplateId
};
