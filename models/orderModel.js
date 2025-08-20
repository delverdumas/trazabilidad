const pool = require('../db');

/**
 * Order model encapsulates database operations for the 'orders' table.
 */
const Order = {
  async getAll() {
    const query = `
      SELECT
        o.order_id,
        o.client_id,
        c.name       AS client_name,
        o.carton_type_id,
        ct.name      AS carton_type,
        o.height_id,
        h.quantity   AS height,
        o.week,
        o.quantity,
        o.status,
        o.gp_calibre5,  o.gp_calibre6,  o.gp_calibre7,
        o.gp_calibre8,  o.gp_calibre9,  o.gp_calibre10,
        o.cl_calibre5,  o.cl_calibre6,  o.cl_calibre7,
        o.cl_calibre8,  o.cl_calibre9,  o.cl_calibre10
      FROM orders o
      JOIN clients      c  ON o.client_id      = c.client_id
      JOIN carton_types ct ON o.carton_type_id = ct.carton_type_id
      JOIN heights      h  ON o.height_id      = h.height_id
      ORDER BY o.order_id
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  async getById(order_id) {
    const { rows } = await pool.query(
      `SELECT *
       FROM orders
       WHERE order_id = $1`,
      [order_id]
    );
    return rows[0];
  },

  async create(order) {
    const {
      client_id, carton_type_id, height_id,
      week, quantity, status,
      gp_calibre5, gp_calibre6, gp_calibre7,
      gp_calibre8, gp_calibre9, gp_calibre10,
      cl_calibre5, cl_calibre6, cl_calibre7,
      cl_calibre8, cl_calibre9, cl_calibre10
    } = order;

    const { rows } = await pool.query(
      `INSERT INTO orders (
        client_id, carton_type_id, height_id,
        week, quantity, status,
        gp_calibre5, gp_calibre6, gp_calibre7,
        gp_calibre8, gp_calibre9, gp_calibre10,
        cl_calibre5, cl_calibre6, cl_calibre7,
        cl_calibre8, cl_calibre9, cl_calibre10
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18
      ) RETURNING *`,
      [
        client_id, carton_type_id, height_id,
        week, quantity, status,
        gp_calibre5, gp_calibre6, gp_calibre7,
        gp_calibre8, gp_calibre9, gp_calibre10,
        cl_calibre5, cl_calibre6, cl_calibre7,
        cl_calibre8, cl_calibre9, cl_calibre10
      ]
    );
    return rows[0];
  },

  async update(order_id, order) {
    const {
      client_id, carton_type_id, height_id,
      week, quantity, status,
      gp_calibre5, gp_calibre6, gp_calibre7,
      gp_calibre8, gp_calibre9, gp_calibre10,
      cl_calibre5, cl_calibre6, cl_calibre7,
      cl_calibre8, cl_calibre9, cl_calibre10
    } = order;

    const query = `
      UPDATE orders SET
        client_id = $1,
        carton_type_id = $2,
        height_id = $3,
        week = $4,
        quantity = $5,
        status = $6,
        gp_calibre5 = $7, gp_calibre6 = $8, gp_calibre7 = $9,
        gp_calibre8 = $10, gp_calibre9 = $11, gp_calibre10 = $12,
        cl_calibre5 = $13, cl_calibre6 = $14, cl_calibre7 = $15,
        cl_calibre8 = $16, cl_calibre9 = $17, cl_calibre10 = $18
      WHERE order_id = $19
      RETURNING *
    `;

    const values = [
      client_id, carton_type_id, height_id,
      week, quantity, status,
      gp_calibre5, gp_calibre6, gp_calibre7,
      gp_calibre8, gp_calibre9, gp_calibre10,
      cl_calibre5, cl_calibre6, cl_calibre7,
      cl_calibre8, cl_calibre9, cl_calibre10,
      order_id
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async delete(order_id) {
    await pool.query(
      `UPDATE orders
         SET status = 'ELIMINADO'
       WHERE order_id = $1`,
      [order_id]
    );
  }
};

module.exports = Order;

/**
 * Retorna las semanas disponibles con pedidos únicos.
 */
Order.getAvailableWeeks = async function () {
  const { rows } = await pool.query(`
    SELECT DISTINCT week
    FROM orders
    ORDER BY week
  `);
  return rows;
};

/**
 * Obtiene todos los pedidos de una semana específica y opcionalmente por estado.
 * @param {string} week
 * @param {string} status
 */
Order.getOrdersByWeek = async function (week, status = 'TODOS') {
  let query = `
    SELECT
      o.order_id,
      c.name AS client_name,
      ct.name AS carton_type,
      h.quantity AS height,
      o.quantity,
      o.status,
      o.gp_calibre5, o.gp_calibre6, o.gp_calibre7,
      o.gp_calibre8, o.gp_calibre9, o.gp_calibre10,
      o.cl_calibre5, o.cl_calibre6, o.cl_calibre7,
      o.cl_calibre8, o.cl_calibre9, o.cl_calibre10
    FROM orders o
    JOIN clients c ON o.client_id = c.client_id
    JOIN carton_types ct ON o.carton_type_id = ct.carton_type_id
    JOIN heights h ON o.height_id = h.height_id
    WHERE o.week = $1
  `;

  const params = [week];

  if (status !== 'TODOS') {
    query += ' AND o.status = $2';
    params.push(status);
  }

  query += ' ORDER BY o.order_id';

  const { rows } = await pool.query(query, params);
  return rows;
};

/**
 * 🔸 Obtiene totales por pedido (suma de calibres GP + CL)
 */
Order.getOrderTotals = async function () {
  const { rows } = await pool.query(`
    SELECT
      o.order_id,
      c.name AS client_name,
      (
        COALESCE(o.gp_calibre5, 0) + COALESCE(o.gp_calibre6, 0) + COALESCE(o.gp_calibre7, 0) +
        COALESCE(o.gp_calibre8, 0) + COALESCE(o.gp_calibre9, 0) + COALESCE(o.gp_calibre10, 0) +
        COALESCE(o.cl_calibre5, 0) + COALESCE(o.cl_calibre6, 0) + COALESCE(o.cl_calibre7, 0) +
        COALESCE(o.cl_calibre8, 0) + COALESCE(o.cl_calibre9, 0) + COALESCE(o.cl_calibre10, 0)
      ) AS total_ordered
    FROM orders o
    JOIN clients c ON o.client_id = c.client_id
    ORDER BY o.order_id
  `);
  return rows;
};

/**
 * 🔸 Obtiene pedidos en estado PENDING para reportes de faltantes
 */
Order.getPendingOrders = async function () {
  const { rows } = await pool.query(`
    SELECT
      o.order_id,
      c.name AS client_name,
      o.gp_calibre5, o.gp_calibre6, o.gp_calibre7,
      o.gp_calibre8, o.gp_calibre9, o.gp_calibre10,
      o.cl_calibre5, o.cl_calibre6, o.cl_calibre7,
      o.cl_calibre8, o.cl_calibre9, o.cl_calibre10
    FROM orders o
    JOIN clients c ON o.client_id = c.client_id
    WHERE o.status = 'PENDING'
    ORDER BY o.order_id
  `);
  return rows;
};
