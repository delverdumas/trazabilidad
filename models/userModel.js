const pool = require('../db');

/**
 * User model encapsula operaciones de base de datos para la tabla 'users'.
 */
const User = {
  /**
   * getAll()
   * --------
   * Recupera todos los usuarios activos junto con el nombre de su rol,
   * nombre y cédula.
   * @returns {Promise<Array<{id: number, username: string, role: string, nombre: string, cedula: string}>>}
   */
  async getAll() {
    const query = `
      SELECT
        u.id_users AS id,
        u.username,
        u.nombre,
        u.cedula,
        r.name AS role
      FROM users u
      JOIN roles r
        ON u.role_id = r.id_roles
      WHERE u.status = $1
      ORDER BY u.id_users
    `;
    const res = await pool.query(query, ['activo']);
    return res.rows;
  },

  /**
   * getById(id)
   * -------------
   * Obtiene un usuario por su ID, incluyendo role_id, nombre de rol,
   * nombre y cédula.
   * @param {number} id - Identificador del usuario.
   * @returns {Promise<{id: number, username: string, role_id: number, role: string, status: string, nombre: string, cedula: string}>}
   */
  async getById(id) {
    const query = `
      SELECT
        u.id_users AS id,
        u.username,
        u.role_id,
        r.name AS role,
        u.status,
        u.nombre,
        u.cedula
      FROM users u
      JOIN roles r
        ON u.role_id = r.id_roles
      WHERE u.id_users = $1
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0];
  },

  /**
   * create(username, password, role_id, nombre, cedula)
   * ------------------------------------
   * Inserta un nuevo usuario en la base de datos con nombre y cédula.
   * @param {string} username - Nombre de usuario único.
   * @param {string} password - Contraseña ya hasheada.
   * @param {number} role_id - Identificador del rol asignado.
   * @param {string} nombre - Nombre completo del usuario.
   * @param {string} cedula - Número de cédula del usuario.
   * @returns {Promise<{id: number, username: string, role_id: number, status: string, nombre: string, cedula: string}>}
   */
  async create(username, password, role_id, nombre, cedula) {
    const query = `
      INSERT INTO users (username, password, role_id, nombre, cedula)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_users AS id, username, role_id, status, nombre, cedula
    `;
    const res = await pool.query(query, [username, password, role_id, nombre, cedula]);
    return res.rows[0];
  },

  /**
   * update(id, password, role_id, nombre, cedula)
   * -------------------------------
   * Actualiza la contraseña, rol, nombre y cédula de un usuario existente.
   * @param {number} id - Identificador del usuario.
   * @param {string} password - Contraseña ya hasheada.
   * @param {number} role_id - Nuevo identificador de rol.
   * @param {string} nombre - Nombre completo del usuario.
   * @param {string} cedula - Número de cédula del usuario.
   * @returns {Promise<{id: number, username: string, role_id: number, status: string, nombre: string, cedula: string}>}
   */
  async update(id, password, role_id, nombre, cedula) {
    const query = `
      UPDATE users
      SET password = $1,
          role_id  = $2,
          nombre   = $3,
          cedula   = $4
      WHERE id_users = $5
      RETURNING id_users AS id, username, role_id, status, nombre, cedula
    `;
    const res = await pool.query(query, [password, role_id, nombre, cedula, id]);
    return res.rows[0];
  },

  /**
   * delete(id)
   * ------------
   * Realiza un soft-delete marcando el estado del usuario como 'desactivado'.
   * @param {number} id - Identificador del usuario.
   * @returns {Promise<void>}
   */
  async delete(id) {
    const query = `
      UPDATE users
      SET status = $1
      WHERE id_users = $2
    `;
    await pool.query(query, ['desactivado', id]);
  }
};

module.exports = User;
