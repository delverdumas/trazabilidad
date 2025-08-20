// middlewares/authMiddleware.js

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

function allowRoles(...allowed) {
  return (req, res, next) => {
    // Sin sesión -> al login (evita 403 engañoso)
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
    const role = req.session.user.role;
    if (allowed.includes(role)) return next();

    const wantsJson =
      req.xhr ||
      (req.headers.accept && req.headers.accept.includes('json')) ||
      req.headers['content-type'] === 'application/json';

    if (wantsJson) {
      return res.status(403).json({ error: 'No tienes acceso a este recurso.' });
    }

    return res.status(403).render('errors/403', {
      pageTitle: 'Acceso denegado',
      user: req.session.user
    });
  };
}

module.exports = { isAuthenticated, allowRoles };
