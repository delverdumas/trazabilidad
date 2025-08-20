const pool = require('../db');

/**
 * Obtiene los pedidos PENDING con datos de cliente, tipo de cartón y altura.
 */
async function getPendingOrders() {
  const { rows } = await pool.query(`
    SELECT
      o.order_id,
      c.name         AS client_name,
      ct.name        AS carton_type_name,
      h.quantity     AS height,
      o.gp_calibre5, o.gp_calibre6, o.gp_calibre7,
      o.gp_calibre8, o.gp_calibre9, o.gp_calibre10,
      o.cl_calibre5, o.cl_calibre6, o.cl_calibre7,
      o.cl_calibre8, o.cl_calibre9, o.cl_calibre10
    FROM orders o
      JOIN clients c       ON o.client_id      = c.client_id
      JOIN carton_types ct ON o.carton_type_id = ct.carton_type_id
      JOIN heights h       ON o.height_id      = h.height_id
    WHERE o.status = 'PENDING'
    ORDER BY o.order_id
  `);
  return rows;
}

/**
 * Obtiene un pedido por ID con detalle de altura y calibres.
 */
async function getOrderById(orderId) {
  const { rows } = await pool.query(`
    SELECT
      o.order_id,
      c.name         AS client_name,
      ct.name        AS carton_type_name,
      h.quantity     AS height,
      o.gp_calibre5, o.gp_calibre6, o.gp_calibre7,
      o.gp_calibre8, o.gp_calibre9, o.gp_calibre10,
      o.cl_calibre5, o.cl_calibre6, o.cl_calibre7,
      o.cl_calibre8, o.cl_calibre9, o.cl_calibre10
    FROM orders o
      JOIN clients c       ON o.client_id      = c.client_id
      JOIN carton_types ct ON o.carton_type_id = ct.carton_type_id
      JOIN heights h       ON o.height_id      = h.height_id
    WHERE o.order_id = $1
  `, [orderId]);
  return rows[0] || null;
}

/**
 * Calcula el siguiente número de paleta.
 */
async function getNextNumeroPaleta() {
  const { rows } = await pool.query(`
    SELECT COALESCE(MAX(numero_paleta), 0) + 1 AS next
    FROM pallets
  `);
  return rows[0].next;
}

/**
 * Inserta una nueva paleta y devuelve su número.
 */
async function createProduction(orderId, quantities) {
  const cols = Object.keys(quantities).join(', ');
  const vals = Object.values(quantities);
  const placeholders = vals.map((_, i) => `$${i + 2}`).join(', ');

  const sql = `
    INSERT INTO pallets(order_id, ${cols})
    VALUES($1, ${placeholders})
    RETURNING numero_paleta
  `;
  const { rows } = await pool.query(sql, [orderId, ...vals]);
  return rows[0].numero_paleta;
}

/**
 * Suma todas las cajas ingresadas para un pedido, tipo y calibre.
 */
async function getSumQuantity(orderId, type, calibre) {
  const column = `cantidad_${type}_${calibre}`;
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(${column}), 0) AS total
     FROM pallets
     WHERE order_id = $1`,
    [orderId]
  );
  return parseInt(rows[0].total, 10);
}

/**
 * Recupera todas las paletas (estado diferente de ELIMINADO), incluyendo datos de cliente, cartón y altura.
 */
async function getAllPalettes() {
  const { rows } = await pool.query(`
    SELECT
      p.*,
      c.name    AS client_name,
      ct.name   AS carton_type_name,
      h.quantity AS height
    FROM pallets p
      JOIN orders o        ON p.order_id      = o.order_id
      JOIN clients c       ON o.client_id     = c.client_id
      JOIN carton_types ct ON o.carton_type_id= ct.carton_type_id
      JOIN heights h       ON o.height_id     = h.height_id
    WHERE p.estado != 'ELIMINADO'
    ORDER BY p.numero_paleta
  `);
  return rows;
}

/**
 * Obtiene una paleta por su número, con datos de cliente, cartón y altura.
 */
async function getProductionByNumero(numero) {
  const { rows } = await pool.query(`
    SELECT
      p.*,
      c.name    AS client_name,
      ct.name   AS carton_type_name,
      h.quantity AS height
    FROM pallets p
      JOIN orders o        ON p.order_id      = o.order_id
      JOIN clients c       ON o.client_id     = c.client_id
      JOIN carton_types ct ON o.carton_type_id= ct.carton_type_id
      JOIN heights h       ON o.height_id     = h.height_id
    WHERE p.numero_paleta = $1
  `, [numero]);
  return rows[0] || null;
}

/**
 * Actualiza cantidades de una paleta existente.
 */
async function updateProduction(numero, quantities) {
  const setClause = Object.keys(quantities)
    .map((key, i) => `${key} = $${i+2}`)
    .join(', ');
  const vals = Object.values(quantities);
  await pool.query(
    `UPDATE pallets SET ${setClause}
     WHERE numero_paleta = $1`,
    [numero, ...vals]
  );
}

/**
 * Cambia el estado de una paleta (p.ej. a 'ELIMINADO').
 */
async function setProductionState(numero, estado) {
  await pool.query(
    `UPDATE pallets
     SET estado = $2
     WHERE numero_paleta = $1`,
    [numero, estado]
  );
}

/**
 * Función existente para detalle de cámara (reportes).
 */
async function getCameraDetail() {
  const { rows } = await pool.query(`
    SELECT
      p.order_id,
      cl.name AS client_name,
      SUM(p.cantidad_gp_5 + p.cantidad_cl_5)   AS calibre5,
      SUM(p.cantidad_gp_6 + p.cantidad_cl_6)   AS calibre6,
      SUM(p.cantidad_gp_7 + p.cantidad_cl_7)   AS calibre7,
      SUM(p.cantidad_gp_8 + p.cantidad_cl_8)   AS calibre8,
      SUM(p.cantidad_gp_9 + p.cantidad_cl_9)   AS calibre9,
      SUM(p.cantidad_gp_10 + p.cantidad_cl_10) AS calibre10
    FROM pallets p
      JOIN orders o        ON p.order_id        = o.order_id
      JOIN clients cl      ON o.client_id       = cl.client_id
    WHERE p.estado = 'EN CAMARA'
    GROUP BY p.order_id, cl.name
    ORDER BY p.order_id;
  `);
  return rows;
}

/**
 * 🔧 CORREGIDO: retorna mapa de cajas en cámara por calibre/tipo para pedido
 */
async function getCajasEnCamaraPorPedidoYCalibre(orderId) {
  const { rows } = await pool.query(`
    SELECT
      SUM(cantidad_gp_5)   AS gp_calibre5,
      SUM(cantidad_cl_5)   AS cl_calibre5,
      SUM(cantidad_gp_6)   AS gp_calibre6,
      SUM(cantidad_cl_6)   AS cl_calibre6,
      SUM(cantidad_gp_7)   AS gp_calibre7,
      SUM(cantidad_cl_7)   AS cl_calibre7,
      SUM(cantidad_gp_8)   AS gp_calibre8,
      SUM(cantidad_cl_8)   AS cl_calibre8,
      SUM(cantidad_gp_9)   AS gp_calibre9,
      SUM(cantidad_cl_9)   AS cl_calibre9,
      SUM(cantidad_gp_10)  AS gp_calibre10,
      SUM(cantidad_cl_10)  AS cl_calibre10
    FROM pallets
    WHERE order_id = $1 AND estado = 'EN CAMARA'
  `, [orderId]);

  const result = {};
  const row = rows[0];
  for (let cal = 5; cal <= 10; cal++) {
    result[`gp_calibre${cal}`] = parseInt(row[`gp_calibre${cal}`]) || 0;
    result[`cl_calibre${cal}`] = parseInt(row[`cl_calibre${cal}`]) || 0;
  }
  return result;
}

/**
 * Total producido por pedido (suma general, no se usa para desglose por calibre)
 */
async function getProducedTotals() {
  const { rows } = await pool.query(`
    SELECT
      p.order_id,
      cl.name AS client_name,
      SUM(
        COALESCE(p.cantidad_gp_5, 0) + COALESCE(p.cantidad_cl_5, 0) +
        COALESCE(p.cantidad_gp_6, 0) + COALESCE(p.cantidad_cl_6, 0) +
        COALESCE(p.cantidad_gp_7, 0) + COALESCE(p.cantidad_cl_7, 0) +
        COALESCE(p.cantidad_gp_8, 0) + COALESCE(p.cantidad_cl_8, 0) +
        COALESCE(p.cantidad_gp_9, 0) + COALESCE(p.cantidad_cl_9, 0) +
        COALESCE(p.cantidad_gp_10, 0) + COALESCE(p.cantidad_cl_10, 0)
      ) AS total_produced
    FROM pallets p
    JOIN orders o ON p.order_id = o.order_id
    JOIN clients cl ON o.client_id = cl.client_id
    WHERE p.estado = 'EN CAMARA'
    GROUP BY p.order_id, cl.name
    ORDER BY p.order_id
  `);
  return rows;
}

module.exports = {
  getPendingOrders,
  getOrderById,
  getNextNumeroPaleta,
  createProduction,
  getSumQuantity,
  getAllPalettes,
  getProductionByNumero,
  updateProduction,
  setProductionState,
  getCameraDetail,
  getCajasEnCamaraPorPedidoYCalibre,
  getProducedTotals
};
