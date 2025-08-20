/**
 * Controlador para operaciones CRUD de pedidos:
 * - listOrders: listar todos los pedidos
 * - showCreateForm: mostrar formulario de creación
 * - createOrder: procesar creación con validación estricta de cantidad y calibres
 * - showEditForm: mostrar formulario de edición
 * - updateOrder: procesar actualización (con validación de cámara)
 * - deleteOrder: eliminar (soft-delete) pedido
 */

const Order = require('../models/orderModel');
const pool = require('../db');
const palletModel = require('../models/palletModel');

exports.listOrders = async (req, res) => {
  try {
    const orders = await Order.getAll();
    res.render('orders', { orders });
  } catch (err) {
    console.error('Error al listar pedidos:', err);
    res.status(500).send('Error al listar pedidos');
  }
};

exports.showCreateForm = async (req, res) => {
  try {
    const [clientsRes, cartonsRes, heightsRes] = await Promise.all([
      pool.query('SELECT client_id, name FROM clients ORDER BY name'),
      pool.query('SELECT carton_type_id, name FROM carton_types ORDER BY name'),
      pool.query('SELECT height_id, quantity FROM heights ORDER BY quantity')
    ]);

    res.render('createOrder', {
      error: null,
      clients: clientsRes.rows,
      cartonTypes: cartonsRes.rows,
      heights: heightsRes.rows,
      formData: {}
    });
  } catch (err) {
    console.error('Error al cargar formulario de creación de pedido:', err);
    res.status(500).send('Error al cargar formulario de pedido');
  }
};

exports.createOrder = async (req, res) => {
  const {
    client_id, carton_type_id, height_id,
    week, quantity: qtyInput
  } = req.body;

  const quantity = parseInt(qtyInput, 10) || 0;
  const gpCalibres = [5,6,7,8,9,10].map(c => parseInt(req.body['gp_calibre'+c], 10) || 0);
  const clCalibres = [5,6,7,8,9,10].map(c => parseInt(req.body['cl_calibre'+c], 10) || 0);
  const sumCalibres = gpCalibres.concat(clCalibres).reduce((a, b) => a + b, 0);

  let heightQty;
  try {
    const heightRes = await pool.query('SELECT quantity FROM heights WHERE height_id = $1', [height_id]);
    if (heightRes.rows.length === 0) throw new Error('Altura no encontrada');
    heightQty = heightRes.rows[0].quantity;
  } catch (err) {
    console.error('Error al obtener altura:', err);
    return res.status(500).send('Error interno al validar altura');
  }

  const renderWithError = async (msg) => {
    const [clientsRes, cartonsRes, heightsRes] = await Promise.all([
      pool.query('SELECT client_id, name FROM clients ORDER BY name'),
      pool.query('SELECT carton_type_id, name FROM carton_types ORDER BY name'),
      pool.query('SELECT height_id, quantity FROM heights ORDER BY quantity')
    ]);
    return res.status(400).render('createOrder', {
      error: msg,
      clients: clientsRes.rows,
      cartonTypes: cartonsRes.rows,
      heights: heightsRes.rows,
      formData: req.body
    });
  };

  if (quantity % heightQty !== 0) {
    return renderWithError(`La cantidad total (${quantity}) no es múltiplo de la altura seleccionada (${heightQty}).`);
  }

  for (let i = 0; i < gpCalibres.length; i++) {
    if (gpCalibres[i] % heightQty !== 0) {
      return renderWithError(`GP Calibre ${5 + i} (${gpCalibres[i]}) no es múltiplo de ${heightQty}.`);
    }
  }

  for (let i = 0; i < clCalibres.length; i++) {
    if (clCalibres[i] % heightQty !== 0) {
      return renderWithError(`CL Calibre ${5 + i} (${clCalibres[i]}) no es múltiplo de ${heightQty}.`);
    }
  }

  if (sumCalibres !== quantity) {
    return renderWithError(`La suma de calibres (${sumCalibres}) debe ser EXACTAMENTE igual a la cantidad total (${quantity}).`);
  }

  try {
    const data = {
      client_id: parseInt(client_id, 10),
      carton_type_id: parseInt(carton_type_id, 10),
      height_id: parseInt(height_id, 10),
      week: parseInt(week, 10),
      quantity: quantity,
      status: 'PENDING',
      gp_calibre5: gpCalibres[0],
      gp_calibre6: gpCalibres[1],
      gp_calibre7: gpCalibres[2],
      gp_calibre8: gpCalibres[3],
      gp_calibre9: gpCalibres[4],
      gp_calibre10: gpCalibres[5],
      cl_calibre5: clCalibres[0],
      cl_calibre6: clCalibres[1],
      cl_calibre7: clCalibres[2],
      cl_calibre8: clCalibres[3],
      cl_calibre9: clCalibres[4],
      cl_calibre10: clCalibres[5]
    };
    await Order.create(data);
    res.redirect('/orders');
  } catch (err) {
    console.error('Error al crear pedido:', err);
    return renderWithError('No se pudo crear el pedido debido a un error interno.');
  }
};

exports.showEditForm = async (req, res) => {
  const { id } = req.params;
  try {
    const [orderRes, clientsRes, cartonsRes, heightsRes] = await Promise.all([
      pool.query('SELECT * FROM orders WHERE order_id = $1', [id]),
      pool.query('SELECT client_id, name FROM clients ORDER BY name'),
      pool.query('SELECT carton_type_id, name FROM carton_types ORDER BY name'),
      pool.query('SELECT height_id, quantity FROM heights ORDER BY quantity')
    ]);

    res.render('editOrder', {
      order: orderRes.rows[0],
      clients: clientsRes.rows,
      cartonTypes: cartonsRes.rows,
      heights: heightsRes.rows
    });
  } catch (err) {
    console.error('Error al cargar formulario de edición de pedido:', err);
    res.status(500).send('Error al cargar edición de pedido');
  }
};

exports.updateOrder = async (req, res) => {
  const { id } = req.params;
  const nuevosDatos = req.body;

  try {
    const mapaExistente = await palletModel.getCajasEnCamaraPorPedidoYCalibre(id);

    for (let calibre = 5; calibre <= 10; calibre++) {
      ['gp', 'cl'].forEach(tipo => {
        const campo = `${tipo}_calibre${calibre}`;
        const nuevoValor = parseInt(nuevosDatos[campo], 10) || 0;
        const existente = mapaExistente[campo] || 0;

        if (nuevoValor < existente) {
          throw new Error(`No se puede reducir el ${campo.toUpperCase()} a ${nuevoValor}, ya hay ${existente} cajas en cámara.`);
        }
      });
    }

    await Order.update(id, nuevosDatos);
    res.redirect('/orders');
  } catch (err) {
    console.error('Error al actualizar pedido:', err.message);
    res.status(400).send(`Error al actualizar pedido: ${err.message}`);
  }
};

exports.deleteOrder = async (req, res) => {
  const { id } = req.params;
  try {
    await Order.delete(id);
    res.redirect('/orders');
  } catch (err) {
    console.error('Error al eliminar pedido:', err);
    res.status(500).send('Error al eliminar pedido');
  }
};
