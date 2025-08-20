// middleware/permissions.js
// Mapa de permisos por módulo (montaje de router)

module.exports = {
  '/dispatches': ['DISPATCH', 'ADMIN'],                 // Despachos
  '/production': ['TRAZABILIDAD', 'ADMIN'],             // Producción
  '/orders':     ['TRAZABILIDAD', 'ADMIN'],             // Pedidos
  '/reports':    ['TRAZABILIDAD', 'ADMIN'],             // Reportes
  '/users':      ['ADMIN'],                             // Usuarios (solo admin)
  // Agrega aquí otros módulos si los tienes
};
