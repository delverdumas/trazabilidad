// controllers/authController.js

const pool = require('../db');
const bcrypt = require('bcrypt');

/**
 * Normaliza un valor de rol a uno de estos:
 * 'ADMIN' | 'TRAZABILIDAD' | 'DISPATCH'
 * Acepta: strings variadas o ids numéricos.
 */
function normalizeRole(input) {
  if (input == null) return null;

  if (typeof input === 'number') {
    const byId = { 1: 'ADMIN', 2: 'TRAZABILIDAD', 3: 'DISPATCH' }; // <-- ajusta si tus IDs difieren
    return byId[input] || null;
  }

  const s = String(input).trim().toUpperCase();
  if (['ADMIN', 'ADM', 'ADMINISTRADOR'].includes(s)) return 'ADMIN';
  if (['TRAZABILIDAD', 'TRACE', 'PRODUCCION', 'PRODUCCIÓN'].includes(s)) return 'TRAZABILIDAD';
  if (['DISPATCH', 'DESPACHO', 'DESPACHOS'].includes(s)) return 'DISPATCH';

  if (s.includes('ADMIN')) return 'ADMIN';
  if (s.includes('DISPATCH') || s.includes('DESPACH')) return 'DISPATCH';
  if (s.includes('TRAZABILIDAD') || s.includes('PRODUC')) return 'TRAZABILIDAD';

  return null;
}

/**
 * Intenta leer el "código" del rol desde la tabla roles (si existe),
 * sin asumir nombres de columnas. Devuelve string o null.
 */
async function resolveRoleCodeFromRolesTable(roleId) {
  if (roleId == null) return null;

  // Descubrir columnas de la tabla roles
  const colsRes = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'roles'`
  );

  if (!colsRes.rows || colsRes.rows.length === 0) {
    return null; // no existe la tabla roles o no visible
  }

  const cols = new Set(colsRes.rows.map(r => r.column_name.toLowerCase()));

  // Determinar columna para hacer el match con users.role_id
  let joinCol = null;
  if (cols.has('id')) joinCol = 'id';
  else if (cols.has('role_id')) joinCol = 'role_id';
  else if (cols.has('id_role')) joinCol = 'id_role';
  else if (cols.has('id_roles')) joinCol = 'id_roles';
  else return null;

  // Determinar columna que representa el "código/nombre" de rol
  let codeCol = null;
  if (cols.has('code')) codeCol = 'code';
  else if (cols.has('codigo')) codeCol = 'codigo';
  else if (cols.has('name')) codeCol = 'name';
  else if (cols.has('nombre')) codeCol = 'nombre';
  else if (cols.has('role')) codeCol = 'role';
  else if (cols.has('rol')) codeCol = 'rol';
  else return null;

  // Consulta dinámica (segura: sólo interpolamos nombres de columna ya verificados)
  const sql = `SELECT ${codeCol} AS code FROM roles WHERE ${joinCol} = $1 LIMIT 1`;
  const { rows } = await pool.query(sql, [roleId]);
  const row = rows && rows[0];
  return row ? row.code : null;
}

/**
 * Renderiza el formulario de login
 */
function showLoginForm(req, res) {
  res.render('login', { error: null });
}

/**
 * Procesa el login
 */
async function login(req, res) {
  const { username, password } = req.body;

  try {
    // Consulta simple (sin JOIN) — es estable contra cambios de esquema
    const { rows } = await pool.query(
      `SELECT *
       FROM users
       WHERE UPPER(username) = UPPER($1) AND status = $2
       LIMIT 1`,
      [username, 'activo']
    );

    const user = rows && rows[0];
    if (!user) {
      return res.status(401).render('login', { error: 'Usuario no encontrado o inactivo.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).render('login', { error: 'Contraseña incorrecta.' });
    }

    // 1) Prioridad: si users ya trae un texto de rol (role/rol), úsalo
    let roleFromUserText =
      normalizeRole(user.role) ||
      normalizeRole(user.rol);

    // 2) Si no hay texto, intenta roles.* (descubriendo columnas)
    let roleFromRolesTable = null;
    if (!roleFromUserText && user.role_id != null) {
      try {
        roleFromRolesTable = normalizeRole(
          await resolveRoleCodeFromRolesTable(
            typeof user.role_id === 'string' ? Number(user.role_id) : user.role_id
          )
        );
      } catch (e) {
        // Silencioso: si falla la introspección, seguimos con el mapa
        // console.warn('resolveRoleCodeFromRolesTable falló:', e.message);
      }
    }

    // 3) Fallback final: mapa por role_id numérico
    const roleFromId = normalizeRole(
      typeof user.role_id === 'string' ? Number(user.role_id) : user.role_id
    );

    const semanticRole = roleFromUserText || roleFromRolesTable || roleFromId || 'TRAZABILIDAD';

    // Guardar datos mínimos en la sesión
    req.session.user = {
      id: user.id_users,
      username: user.username,
      nombre: user.nombre,
      role_id: user.role_id,
      role: semanticRole, // <- clave para middlewares/UI
    };

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error durante login:', err);
    res.status(500).render('login', { error: 'Error del servidor. Intenta más tarde.' });
  }
}

/**
 * Cierra la sesión y redirige al login
 */
function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/login');
  });
}

module.exports = {
  showLoginForm,
  login,
  logout
};
