// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

// Importante: como este router se monta en '/reports',
// aquí las rutas deben ser RELATIVAS (sin el prefijo '/reports').

// Pantalla principal de reportes  -> GET /reports
router.get('/', reportsController.showReports);

// Reporte “Saldo en cámara por cliente” -> GET /reports/camera
router.get('/camera', reportsController.showCameraSaldo);

// Reporte de pedidos realizados por semana -> GET /reports/orders
router.get('/orders', reportsController.showOrdersByWeek);

// Reporte de despachos realizados -> GET /reports/dispatches
router.get('/dispatches', reportsController.showDispatchesReport);

// Reporte de faltantes por pedido -> GET /reports/faltantes
router.get('/faltantes', reportsController.showFaltantesReport);

module.exports = router;
