const pool = require('../db');

const Dispatch = {
  /**
   * getAll()
   * --------
   * Devuelve todos los despachos, incluyendo el nombre del cliente,
   * datos de destino y el total de paletas despachadas.
   */
  async getAll() {
    const { rows } = await pool.query(`
      SELECT
        d.dispatch_id,
        d.order_id,
        c.name               AS client_name,
        d.transportista,
        d.container_number,
        d.puerto_destino,
        d.pais_destino,
        d.created_at,
        COUNT(p.numero_paleta) FILTER (WHERE p.estado = 'DESPACHADO') AS total_paletas
      FROM dispatches d
      JOIN orders o    ON d.order_id = o.order_id
      JOIN clients c   ON o.client_id = c.client_id
      LEFT JOIN pallets p ON p.order_id = d.order_id
      GROUP BY
        d.dispatch_id,
        d.order_id,
        c.name,
        d.transportista,
        d.container_number,
        d.puerto_destino,
        d.pais_destino,
        d.created_at
      ORDER BY d.created_at DESC
    `);
    return rows;
  },

  /**
   * getPalettesByOrder(order_id)
   * ----------------------------
   * Trae solo las paletas de un pedido que estén en estado "EN CAMARA".
   */
  async getPalettesByOrder(order_id) {
    const { rows } = await pool.query(
      `SELECT numero_paleta, estado
         FROM pallets
        WHERE order_id = $1
          AND estado = 'EN CAMARA'
        ORDER BY numero_paleta`,
      [order_id]
    );
    return rows;
  },

  /**
   * create(order_id, palletNumbers, meta)
   * -------------------------------------
   * Inserta un despacho, actualiza estado de paletas y marca
   * el pedido como DESPACHED.
   */
  async create(order_id, palletNumbers, { transportista, container_number, puerto_destino, pais_destino }) {
    const { rows } = await pool.query(
      `INSERT INTO dispatches(
          order_id,
          transportista,
          container_number,
          puerto_destino,
          pais_destino
        ) VALUES($1,$2,$3,$4,$5)
      RETURNING dispatch_id`,
      [order_id, transportista, container_number, puerto_destino, pais_destino]
    );
    const dispatch_id = rows[0].dispatch_id;

    for (const numero of palletNumbers) {
      await pool.query(
        `UPDATE pallets
            SET estado = 'DESPACHADO'
          WHERE numero_paleta = $1`,
        [numero]
      );
    }

    await pool.query(
      `UPDATE orders
          SET status = 'DISPATCHED'
        WHERE order_id = $1`,
      [order_id]
    );

    return dispatch_id;
  },

  /**
   * getAllWithClient()
   * ------------------
   * Devuelve todos los despachos con nombre del cliente para reporte.
   */
  async getAllWithClient() {
    const { rows } = await pool.query(`
      SELECT d.dispatch_id,
             d.created_at AS dispatch_date,
             d.order_id,
             d.puerto_destino AS destination,
             COUNT(p.numero_paleta) FILTER (WHERE p.estado = 'DESPACHADO') AS total_quantity,
             c.name AS client_name
      FROM dispatches d
      JOIN orders o ON d.order_id = o.order_id
      JOIN clients c ON o.client_id = c.client_id
      LEFT JOIN pallets p ON p.order_id = o.order_id
      GROUP BY d.dispatch_id, d.created_at, d.order_id, d.puerto_destino, c.name
      ORDER BY d.created_at DESC
    `);
    return rows;
  },

  /**
   * getDispatchById(id)
   * -------------------
   * Devuelve los datos de un despacho específico.
   */
  async getDispatchById(id) {
    const { rows } = await pool.query(
      `SELECT dispatch_id, transportista, puerto_destino, container_number, pais_destino
       FROM dispatches
       WHERE dispatch_id = $1`,
      [id]
    );
    return rows[0];
  },

  /**
   * updateDispatch(id, data)
   * ------------------------
   * Actualiza los campos editables de un despacho.
   */
  async updateDispatch(id, { transportista, puerto, container_number, pais }) {
    await pool.query(
      `UPDATE dispatches
       SET transportista = $1,
           puerto_destino = $2,
           container_number = $3,
           pais_destino = $4
       WHERE dispatch_id = $5`,
      [transportista, puerto, container_number, pais, id]
    );
  }
};

module.exports = Dispatch;
