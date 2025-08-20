const express = require('express');
const router  = express.Router();
const palletController     = require('../controllers/palletController');
const productionController = require('../controllers/productionController');

// Listado de paletas
router.get('/', palletController.list);

// Crear nueva paleta
router.get('/new',      productionController.renderForm);
router.post('/new',     productionController.createProduction);

// Editar paleta existente
router.get('/:numero_paleta/edit', productionController.renderEditForm);
router.post('/:numero_paleta/edit', productionController.updateProduction);

// Eliminar (marcar como ELIMINADO)
router.post('/:numero_paleta/delete', productionController.deleteProduction);

module.exports = router;
