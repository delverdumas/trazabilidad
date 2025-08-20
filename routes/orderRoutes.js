/**
 * routes/orderRoutes.js
 * ---------------------
 * Router para operaciones CRUD de pedidos.
 * Define las rutas para listar, crear, editar y eliminar pedidos.
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

/**
 * GET /orders
 * Listar todos los pedidos.
 */
router.get('/', orderController.listOrders);

/**
 * GET /orders/create
 * Mostrar formulario para crear un nuevo pedido.
 */
router.get('/create', orderController.showCreateForm);

/**
 * POST /orders/create
 * Procesar creación de un nuevo pedido.
 */
router.post('/create', orderController.createOrder);

/**
 * GET /orders/:id/edit
 * Mostrar formulario para editar un pedido existente.
 */
router.get('/:id/edit', orderController.showEditForm);

/**
 * POST /orders/:id/edit
 * Procesar actualización de un pedido.
 */
router.post('/:id/edit', orderController.updateOrder);

/**
 * POST /orders/:id/delete
 * Procesar eliminación de un pedido.
 * Nota: para un diseño REST más estricto, podría usarse HTTP DELETE.
 */
router.post('/:id/delete', orderController.deleteOrder);

module.exports = router;
