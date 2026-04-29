function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  return next();
}

function requireTrainer(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  if (!req.session.user.isTrainer && !req.session.user.isAdmin) {
    return res.status(403).render("error", {
      message: "Доступ только для сотрудников отдела обучения (группа «Тренера»)."
    });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  if (!req.session.user.isAdmin) {
    return res.status(403).render("error", {
      message: "Доступ только для администраторов портала."
    });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireTrainer,
  requireAdmin
};
