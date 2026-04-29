const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const { importTemplates } = require("../importTemplates");
const {
  getDashboardStats,
  getLoginLog, getUserRoles, grantRole, revokeRole,
  getTableList, getTableData, dropTable,
  getTemplateLabels, saveTemplateLabel
} = require("../services/adminService");

const router = express.Router();
router.use(requireAdmin);

router.get("/", async (req, res) => {
  try {
    const stats = await getDashboardStats();
    const recentLogins = await getLoginLog(10);
    res.render("admin/index", { stats, recentLogins, error: null });
  } catch (err) {
    res.render("admin/index", { stats: null, recentLogins: [], error: err.message });
  }
});

router.get("/users", async (req, res) => {
  try {
    const roles = await getUserRoles();
    const loginLog = await getLoginLog(50);
    res.render("admin/users", { roles, loginLog, success: null, error: null });
  } catch (err) {
    res.render("admin/users", { roles: [], loginLog: [], success: null, error: err.message });
  }
});

router.post("/users/grant", async (req, res) => {
  const { username } = req.body;
  try {
    if (!username || !username.trim()) throw new Error("Укажите логин пользователя");
    await grantRole(username.trim().toLowerCase(), "trainer", req.session.user.username);
    const roles = await getUserRoles();
    const loginLog = await getLoginLog(50);
    res.render("admin/users", { roles, loginLog, success: `Роль тренера выдана: ${username.trim()}`, error: null });
  } catch (err) {
    const roles = await getUserRoles().catch(() => []);
    const loginLog = await getLoginLog(50).catch(() => []);
    res.render("admin/users", { roles, loginLog, success: null, error: err.message });
  }
});

router.post("/users/revoke", async (req, res) => {
  const { username } = req.body;
  try {
    await revokeRole(username);
    const roles = await getUserRoles();
    const loginLog = await getLoginLog(50);
    res.render("admin/users", { roles, loginLog, success: `Роль отозвана: ${username}`, error: null });
  } catch (err) {
    const roles = await getUserRoles().catch(() => []);
    const loginLog = await getLoginLog(50).catch(() => []);
    res.render("admin/users", { roles, loginLog, success: null, error: err.message });
  }
});

router.get("/tables", async (req, res) => {
  try {
    const tables = await getTableList();
    res.render("admin/tables", { tables, error: null, success: req.query.deleted ? `Таблица удалена: ${req.query.deleted}` : null });
  } catch (err) {
    res.render("admin/tables", { tables: [], error: err.message, success: null });
  }
});

router.get("/tables/:name", async (req, res) => {
  const name = req.params.name;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  try {
    const data = await getTableData(name, page, 50);
    res.render("admin/table-view", { tableName: name, ...data, error: null });
  } catch (err) {
    res.render("admin/table-view", { tableName: name, rows: [], columns: [], total: 0, page: 1, pageSize: 50, totalPages: 0, error: err.message });
  }
});

router.post("/tables/:name/delete", async (req, res) => {
  const name = req.params.name;
  try {
    await dropTable(name);
    res.redirect(`/admin/tables?deleted=${encodeURIComponent(name)}`);
  } catch (err) {
    const tables = await getTableList().catch(() => []);
    res.render("admin/tables", { tables, error: err.message, success: null });
  }
});

router.get("/templates", async (req, res) => {
  try {
    const labels = await getTemplateLabels();
    res.render("admin/templates", { importTemplates, labels, success: null, error: null });
  } catch (err) {
    res.render("admin/templates", { importTemplates, labels: {}, success: null, error: err.message });
  }
});

router.post("/templates", async (req, res) => {
  try {
    for (const tpl of importTemplates) {
      const name = String(req.body[`name_${tpl.id}`] || "").trim();
      const desc = String(req.body[`desc_${tpl.id}`] || "").trim();
      await saveTemplateLabel(tpl.id, name || null, desc || null, req.session.user.username);
    }
    const labels = await getTemplateLabels();
    res.render("admin/templates", { importTemplates, labels, success: "Шаблоны сохранены", error: null });
  } catch (err) {
    const labels = await getTemplateLabels().catch(() => ({}));
    res.render("admin/templates", { importTemplates, labels, success: null, error: err.message });
  }
});

module.exports = router;
