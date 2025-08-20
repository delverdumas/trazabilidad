// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Mostrar formulario de login
router.get('/', authController.showLoginForm);

// Procesar login
router.post('/', authController.login);

// Logout (si prefieres /logout aquí)
router.get('/logout', authController.logout);

module.exports = router;
