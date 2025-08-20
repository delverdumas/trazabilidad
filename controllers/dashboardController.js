// controllers/dashboardController.js

/**
 * Controlador del dashboard.
 * Renderiza la vista principal del panel de usuario.
 *
 * @param {import('express').Request} req - Objeto de petición de Express.
 * @param {import('express').Response} res - Objeto de respuesta de Express.
 */
function showDashboard(req, res) {
  // Mostrar la plantilla 'dashboard.ejs'
  res.render('dashboard');
}

// Exportar la función para montarla en las rutas
module.exports = {
  showDashboard,
};
