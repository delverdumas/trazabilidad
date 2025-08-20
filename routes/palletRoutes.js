// routes/palletRoutes.js
const express         = require('express');
const router          = express.Router();
const palletController = require('../controllers/palletController');

// Listar todas las paletas
router.get('/', palletController.list);

// Botón “Nueva Paleta” redirige al formulario único de Production
router.get('/new', (req, res) => res.redirect('/production'));

module.exports = router;
