// controllers/userController.js

const pool   = require('../db');
const User   = require('../models/userModel');
const bcrypt = require('bcrypt');

/**
 * Roles válidos para asignar al usuario.
 * El campo `id` debe coincidir con roles.id_roles en la base de datos.
 */
const rolesList = [
  { id: 1, name: 'Gerencia' },
  { id: 2, name: 'Trazabilidad' },
  { id: 3, name: 'Despacho' }
];

/**
 * listUsers(req, res)
 * -------------------
 * Recupera todos los usuarios activos desde el modelo
 * y renderiza la vista 'users'.
 */
async function listUsers(req, res) {
  try {
    const users = await User.getAll(); // incluye nombre y cedula
    res.render('users', { users });
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).send('Error al listar usuarios');
  }
}

/**
 * showCreateForm(req, res)
 * ------------------------
 * Renderiza el formulario de creación de usuario,
 * pasándole posibles roles y sin error inicial.
 */
function showCreateForm(req, res) {
  res.render('createUser', {
    error: null,
    roles: rolesList
  });
}

/**
 * createUser(req, res)
 * --------------------
 * Valida el nombre de usuario, nombre completo y cédula
 * para asegurar unicidad (case-insensitive) antes de insertar.
 */
async function createUser(req, res) {
  const usernameInput = req.body.username || '';
  const password      = req.body.password || '';
  const role_id       = req.body.role_id;
  const nombre        = req.body.nombre   || '';
  const cedula        = req.body.cedula   || '';

  // Normalizar username a mayúsculas para comparación
  const username = usernameInput.trim().toUpperCase();

  // Validaciones de formato
  if (!/^\S+$/.test(usernameInput)) {
    return res.status(400).render('createUser', {
      error: 'El nombre de usuario no puede contener espacios.',
      roles: rolesList
    });
  }
  if (!/^\S{4,}$/.test(password)) {
    return res.status(400).render('createUser', {
      error: 'La contraseña debe tener al menos 4 caracteres y no contener espacios.',
      roles: rolesList
    });
  }

  // Verificar duplicado de username (case-insensitive)
  const { rows: usrRows } = await pool.query(
    'SELECT 1 FROM users WHERE upper(username) = $1',
    [username]
  );
  if (usrRows.length) {
    return res.status(400).render('createUser', {
      error: 'El nombre de usuario ya existe. Elige otro.',
      roles: rolesList
    });
  }

  // Verificar duplicado de nombre completo (case-insensitive)
  const { rows: nameRows } = await pool.query(
    'SELECT 1 FROM users WHERE lower(nombre) = lower($1)',
    [nombre]
  );
  if (nameRows.length) {
    return res.status(400).render('createUser', {
      error: 'El nombre ya existe. Elige otro.',
      roles: rolesList
    });
  }

  // Verificar duplicado de cédula
  const { rows: cedRows } = await pool.query(
    'SELECT 1 FROM users WHERE cedula = $1',
    [cedula]
  );
  if (cedRows.length) {
    return res.status(400).render('createUser', {
      error: 'La cédula ya existe. Elige otra.',
      roles: rolesList
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create(
      username,
      hashedPassword,
      parseInt(role_id, 10),
      nombre,
      cedula
    );
    res.redirect('/users');
  } catch (err) {
    // Captura cualquier unique violation restante
    if (err.code === '23505') {
      return res.status(400).render('createUser', {
        error: 'Ya existe un usuario con esos datos. Verifica nombre de usuario, nombre o cédula.',
        roles: rolesList
      });
    }
    console.error('Error al crear usuario:', err);
    res.status(500).render('createUser', {
      error: 'Ocurrió un problema en el servidor. Intenta más tarde.',
      roles: rolesList
    });
  }
}

/**
 * showEditForm(req, res)
 * ----------------------
 * Carga datos del usuario a editar y lista de roles,
 * luego renderiza la vista 'editUser'.
 */
async function showEditForm(req, res) {
  const { id } = req.params;
  try {
    const user = await User.getById(id); // incluye nombre y cedula
    res.render('editUser', {
      user,
      error: null,
      roles: rolesList
    });
  } catch (err) {
    console.error('Error al cargar formulario de edición:', err);
    res.status(500).send('Error al cargar el formulario de edición');
  }
}

/**
 * updateUser(req, res)
 * --------------------
 * Valida y actualiza la contraseña, rol, nombre y cédula del usuario.
 */
async function updateUser(req, res) {
  const { id }    = req.params;
  const password  = req.body.password || '';
  const role_id   = req.body.role_id;
  const nombre    = req.body.nombre   || '';
  const cedula    = req.body.cedula   || '';

  if (!/^\S{4,}$/.test(password)) {
    return res.status(400).render('editUser', {
      user:  { id, role_id, nombre, cedula },
      error: 'La contraseña debe tener al menos 4 caracteres y no contener espacios.',
      roles: rolesList
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.update(
      id,
      hashedPassword,
      parseInt(role_id, 10),
      nombre,
      cedula
    );
    res.redirect('/users');
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).render('editUser', {
      user:  { id, role_id, nombre, cedula },
      error: 'Error al actualizar el usuario. Intenta de nuevo.',
      roles: rolesList
    });
  }
}

/**
 * deleteUser(req, res)
 * --------------------
 * Realiza un "soft-delete" del usuario (actualiza su estado)
 * y redirige de vuelta a la lista de usuarios.
 */
async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    await User.delete(id);
    res.redirect('/users');
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).send('Error al eliminar el usuario');
  }
}

module.exports = {
  listUsers,
  showCreateForm,
  createUser,
  showEditForm,
  updateUser,
  deleteUser
};
