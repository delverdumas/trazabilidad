// middleware/auth.js

/**
 * Exige sesión activa.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  next();
}

/**
 * Permite acceso solo a los roles indicados.
 * Uso: allowRoles('ADMIN','DISPATCH')
 */
function allowRoles(...allowed) {
  return (req, res, next) => {
    const role = req.session?.user?.role;
    if (allowed.includes(role)) return next();

    const wantsJson =
      req.xhr ||
      (req.headers.accept && req.headers.accept.includes('json')) ||
      req.headers['content-type'] === 'application/json';

    if (wantsJson) {
      return res.status(403).json({ error: 'No tienes acceso a este recurso.' });
    }

    return res.status(403).render('errors/403', {
      title: 'Acceso denegado',
      user: req.session?.user || null
    });
  };
}

/** Helper por si lo necesitas en vistas/controladores */
function hasRole(user, ...roles) {
  const r = user?.role;
  return !!r && roles.includes(r);
}

module.exports = { requireAuth, allowRoles, hasRole };
