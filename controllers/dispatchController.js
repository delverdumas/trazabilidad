// controllers/dispatchController.js
const Dispatch = require('../models/dispatchModel');
const Order    = require('../models/orderModel');

exports.listDispatches = async (req, res, next) => {
  try {
    const dispatches = await Dispatch.getAll();
    res.render('dispatches', { dispatches });
  } catch (err) {
    next(err);
  }
};

exports.renderNewForm = async (req, res, next) => {
  try {
    const allOrders = await Order.getAll();
    const orders    = allOrders.filter(o => o.status === 'PENDING');

    let palettes = [];
    if (req.query.order_id) {
      palettes = await Dispatch.getPalettesByOrder(req.query.order_id);
    }

    res.render('createDispatch', {
      orders,
      selectedOrder: req.query.order_id || null,
      palettes
    });
  } catch (err) {
    next(err);
  }
};

exports.createDispatch = async (req, res, next) => {
  try {
    const order_id      = parseInt(req.body.order_id, 10);
    const palletNumbers = Array.isArray(req.body.pallets)
                         ? req.body.pallets.map(n => parseInt(n,10))
                         : [parseInt(req.body.pallets,10)];

    const meta = {
      transportista:    req.body.transportista,
      container_number: req.body.container_number,
      puerto_destino:   req.body.puerto_destino,
      pais_destino:     req.body.pais_destino
    };

    await Dispatch.create(order_id, palletNumbers, meta);
    req.flash('success', 'Despacho creado correctamente.');
    res.redirect('/dispatches');
  } catch (err) {
    next(err);
  }
};

const dispatchModel = require('../models/dispatchModel');

exports.showEditForm = async (req, res) => {
  try {
    const dispatch = await dispatchModel.getDispatchById(req.params.id);
    if (!dispatch) {
      return res.status(404).send('Despacho no encontrado');
    }
    res.render('editDispatch', { dispatch });
  } catch (err) {
    console.error('Error al cargar formulario de edición:', err);
    res.status(500).send('Error al cargar el formulario');
  }
};

exports.updateDispatch = async (req, res) => {
  try {
    await dispatchModel.updateDispatch(req.params.id, {
      transportista: req.body.transportista,
      puerto: req.body.puerto,
      container_number: req.body.container_number,
      pais: req.body.pais
    });
    res.redirect('/dispatches');
  } catch (err) {
    console.error('Error al actualizar despacho:', err);
    res.status(500).send('Error al actualizar despacho');
  }
};
