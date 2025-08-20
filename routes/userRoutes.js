/**
 * routes/userRoutes.js
 * --------------------
 * Router para las operaciones CRUD de usuarios.
 * Define rutas para listar, crear, editar y eliminar usuarios.
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

/**
 * GET /users
 * Listar todos los usuarios activos.
 */
router.get('/', userController.listUsers);

/**
 * GET /users/create
 * Mostrar formulario para crear un nuevo usuario.
 */
router.get('/create', userController.showCreateForm);

/**
 * POST /users/create
 * Procesar la creación de un nuevo usuario.
 */
router.post('/create', userController.createUser);

/**
 * GET /users/:id/edit
 * Mostrar formulario para editar un usuario existente.
 */
router.get('/:id/edit', userController.showEditForm);

/**
 * POST /users/:id/edit
 * Procesar actualización de un usuario.
 */
router.post('/:id/edit', userController.updateUser);

/**
 * POST /users/:id/delete
 * Procesar la eliminación de un usuario (soft delete).
 */
router.post('/:id/delete', userController.deleteUser);

module.exports = router;
