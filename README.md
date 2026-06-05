# ETL Training Portal

Внутренний веб-портал для загрузки Excel-файлов отдела обучения в базу данных MSSQL.  
Работает на Node.js + Express, аутентификация через Active Directory (LDAP).

---

## Стек

| Компонент | Технология |
|---|---|
| Сервер | Node.js + Express |
| Шаблоны | EJS |
| БД | Microsoft SQL Server |
| LDAP | ldapts (Active Directory) |
| Excel | xlsx |
| Сессии | express-session + memorystore |
| Процесс | pm2 (fork mode) |

---

## Запуск на сервере

```bash
# Установить зависимости
npm install

# Запустить через pm2
pm2 start src/app.js --name etl-portal

# Перезапуск после изменений
pm2 restart etl-portal

# Логи
pm2 logs etl-portal
```

Файл `restart.bat` — ярлык для перезапуска pm2 на Windows.

---

## Переменные окружения (`.env`)

```env
PORT=3000
SESSION_SECRET=...

# LDAP / Active Directory
LDAP_URL=ldap://10.10.1.251:389
LDAP_BASE_DN=DC=evrika,DC=com
LDAP_BIND_DN=CN=...,DC=evrika,DC=com
LDAP_BIND_PASSWORD=...

# MSSQL
MSSQL_SERVER=localhost
MSSQL_PORT=1433
MSSQL_DATABASE=TrainingPortal
MSSQL_USER=sa
MSSQL_PASSWORD=...
MSSQL_ENCRYPT=false
MSSQL_TRUST_SERVER_CERTIFICATE=true

# Список логинов с правами администратора (через запятую)
ADMIN_USERS=mukhamedali.b,другой.логин
```

---

## Аутентификация

- Логин/пароль проверяются через **Active Directory** (LDAP bind).
- Из AD берутся: `sAMAccountName`, `displayName`, `memberOf`.
- Пользователь получает роль **тренер** если:
  - состоит в группе AD `CN=Тренера,...`, **или**
  - ему выдана роль `trainer` через админ-панель.
- **Администраторы** задаются в `.env` через `ADMIN_USERS` (логины через запятую).
- Сессия живёт **4 часа**, затем нужно войти заново.

---

## Структура проекта

```
src/
  app.js                   — главный файл, все маршруты
  config.js                — чтение .env
  db.js                    — пул подключений к MSSQL
  importTemplates.js       — описание всех 8 шаблонов отдела обучения
  logger.js                — логгер
  middleware/
    auth.js                — requireAuth / requireTrainer / requireAdmin
  routes/
    admin.js               — все маршруты /admin/*
  services/
    authService.js         — проверка логина через LDAP
    adminService.js        — логи входов, роли, статистика, просмотр таблиц
    importService.js       — история загрузок (training_records, старый шаблон)
    templateImportService.js — парсинг и импорт для 8 шаблонов отдела обучения
    freeImportService.js   — свободная загрузка (любой Excel → любая таблица)
    excelService.js        — парсинг Excel для старого шаблона training_records

views/
  login.ejs
  index.ejs                — главная страница
  upload.ejs               — загрузка отдела обучения (8 шаблонов)
  free-upload.ejs          — свободная загрузка
  history.ejs              — история загрузок
  export.ejs               — экспорт данных
  admin/
    index.ejs              — дашборд (статистика, последние входы)
    users.ejs              — управление ролями + история входов
    tables.ejs             — список всех таблиц БД
    table-view.ejs         — просмотр данных таблицы с пагинацией
    templates.ejs          — редактирование названий/описаний шаблонов

database/
  schema.sql               — полная схема БД + миграции

public/
  styles.css               — стили

uploads/                   — временные файлы после загрузки (автоочищаются)
```

---

## Маршруты

| Метод | URL | Доступ | Описание |
|---|---|---|---|
| GET | `/login` | все | Страница входа |
| POST | `/login` | все | Обработка логина |
| POST | `/logout` | авторизован | Выход |
| GET | `/` | авторизован | Главная |
| GET | `/upload` | тренер | Загрузка по шаблону |
| POST | `/upload` | тренер | Предпросмотр файла |
| POST | `/import` | тренер | Импорт в БД |
| GET | `/free-upload` | тренер | Свободная загрузка |
| POST | `/free-upload` | тренер | Предпросмотр свободного файла |
| POST | `/free-import` | тренер | Импорт свободного файла |
| POST | `/free-drop` | тренер | Удаление таблицы / своих строк |
| GET | `/history` | тренер | История загрузок |
| GET | `/export` | тренер | Экспорт данных |
| GET | `/admin` | админ | Дашборд |
| GET | `/admin/users` | админ | Пользователи и роли |
| POST | `/admin/grant-role` | админ | Выдать роль |
| POST | `/admin/revoke-role` | админ | Убрать роль |
| GET | `/admin/tables` | админ | Список таблиц |
| GET | `/admin/tables/:name` | админ | Просмотр таблицы |
| POST | `/admin/drop-table` | админ | Удалить таблицу |
| GET | `/admin/templates` | админ | Шаблоны |
| POST | `/admin/templates` | админ | Сохранить название/описание шаблона |

---

## Шаблоны отдела обучения

Все 8 шаблонов описаны в `src/importTemplates.js`. Каждый шаблон — это объект:

```js
{
  id: "welcome_attendance",       // уникальный идентификатор
  name: "Welcome (Адаптация)",    // отображаемое название
  description: "...",
  ready: true,                    // false — загрузка отключена
  tableName: "welcome_attendance",// имя таблицы в БД
  uniqueKey: ["training_date", "employee_name"], // ключ для дедупликации (null = нет)
  autoFields: [...],              // поля, которые не в Excel, но добавляются автоматически
  columns: [                      // столбцы: excelHeader → sqlName + type
    { excelHeader: "Дата", sqlName: "training_date", type: "DATE" },
    ...
  ],
  rules: [...]                    // текстовые правила для пользователя
}
```

### Таблицы шаблонов

| Шаблон | Таблица в БД |
|---|---|
| Welcome (Адаптация) | `welcome_attendance` |
| Внутренний тренер | `internal_trainer_sessions` |
| Аттестация | `attestation` |
| Школа супервайзеров | `school_sessions` (school_type = 'supervisor') |
| Школа директоров | `school_sessions` (school_type = 'director') |
| Внешнее обучение | `external_training` |
| Внутреннее очное обучение | `internal_training` |
| Обучение вендоров | `vendor_training` |
| Вместе к успеху | `mentorship_program` |

> Школа супервайзеров и директоров используют **одну таблицу** `school_sessions`.  
> Разделяются через `autoFields`: поле `school_type` заполняется автоматически.

### Добавить новый шаблон

1. Добавить объект в массив в `src/importTemplates.js`
2. Создать таблицу в БД (`database/schema.sql` + выполнить ALTER/CREATE)
3. Если нужны специальные правила валидации — добавить в `templateImportService.js`

---

## Режимы импорта (INSERT / REPLACE / UPSERT)

Доступны в обоих разделах: **Отдел обучения** и **Свободная загрузка**.

| Режим | Что делает |
|---|---|
| **INSERT** | Добавляет только новые строки, дубли пропускает. Дубли проверяются по `uniqueKey` (если задан) или по всем полям. |
| **REPLACE** | Очищает таблицу (`TRUNCATE`) и заливает файл заново. Необратимо. |
| **UPSERT** | Обновляет совпадающие строки, добавляет новые. Пользователь выбирает ключевые столбцы для поиска совпадений. Реализовано через `MERGE`. |

---

## Свободная загрузка

Позволяет загрузить **любой Excel** без заранее настроенного шаблона:

1. Имя файла → имя таблицы (с префиксом `free_`)
2. Заголовки → имена столбцов
3. Система автоматически определяет типы данных
4. Пользователь может скорректировать типы и имена перед импортом
5. Поддерживаются те же 3 режима: INSERT / REPLACE / UPSERT

Таблицы свободной загрузки хранятся в той же БД с префиксом `free_`.  
Каждая строка содержит `_imported_by` — логин пользователя, который загрузил.

---

## База данных

Полная схема: `database/schema.sql`

### Системные таблицы

| Таблица | Назначение |
|---|---|
| `portal_login_log` | Журнал входов (username, display_name, logged_at) |
| `portal_roles` | Роли пользователей (trainer / admin) |
| `portal_template_labels` | Кастомные названия/описания шаблонов из админ-панели |
| `import_batches` | История загрузок отдела обучения |
| `free_import_batches` | История свободных загрузок |
| `import_errors` | Ошибки из истории (старый шаблон) |
| `training_records` | Старый шаблон (legacy, не используется в новом UI) |

### Временные метки

Все `created_at`, `uploaded_at`, `logged_at`, `_imported_at` и т.д. хранятся в **UTC+5 (Казахстан)**.  
Реализовано через `DATEADD(hour, 5, SYSUTCDATETIME())` — не зависит от часового пояса Windows.

> **Важно:** не использовать `GETDATE()` и не использовать `AT TIME ZONE 'Central Asia Standard Time'`  
> (последнее даёт UTC+6, так как Windows учитывает старое время Казахстана до 2024 года).

### Отображение дат

Все даты во всех EJS-шаблонах отображаются через хелпер `fmtVal` (`res.locals.fmtVal`).  
Он использует `getUTCHours()` — читает значение как есть, без сдвига часового пояса.  
**Никогда не использовать** `toLocaleString()` или `toLocaleDateString()` для дат из БД.

---

## Права доступа

| Роль | Как получить | Что может |
|---|---|---|
| Обычный пользователь | Любой сотрудник AD | Только смотреть главную |
| Тренер (`trainer`) | Группа AD `CN=Тренера,...` ИЛИ роль выдана в админ-панели | Загрузка, история, экспорт |
| Администратор | Логин в `ADMIN_USERS` в `.env` | Всё + админ-панель |

---

## Важные нюансы

- **Защита от повторной загрузки**: файл хешируется (SHA-256). При INSERT повторная загрузка того же файла блокируется. При REPLACE/UPSERT — проверка не выполняется.
- **Сессия**: хранится в памяти (`memorystore`). При перезапуске pm2 все сессии сбрасываются — пользователи будут разлогинены.
- **Предпросмотр** перед импортом хранится в сессии. Переключение шаблона сбрасывает предпросмотр (`?reset=1`).
- **Загрузка файлов**: временные файлы сохраняются в `uploads/`, удаляются после обработки.
- **Лимит файла**: 50 МБ.
