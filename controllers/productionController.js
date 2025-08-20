const palletModel = require('../models/palletModel');

/**
 * Muestra el formulario de creaciÃ³n de paleta
 */
exports.renderForm = async (req, res, next) => {
  try {
    const orders     = await palletModel.getPendingOrders();
    const nextPaleta = await palletModel.getNextNumeroPaleta();
    let selectedOrder = null,
        gpCalibers    = [],
        clCalibers    = [];

    if (req.query.order_id) {
      selectedOrder = await palletModel.getOrderById(req.query.order_id);
      gpCalibers = [5,6,7,8,9,10]
        .filter(c => selectedOrder[`gp_calibre${c}`] > 0)
        .map(c => ({ calibre: c }));
      clCalibers = [5,6,7,8,9,10]
        .filter(c => selectedOrder[`cl_calibre${c}`] > 0)
        .map(c => ({ calibre: c }));
    }

    res.render('production/form', {
      orders,
      selectedOrder,
      gpCalibers,
      clCalibers,
      nextPaleta
    });
  } catch(err) {
    next(err);
  }
};

/**
 * Procesa el formulario y crea una paleta nueva
 */
exports.createProduction = async (req, res, next) => {
  try {
    const orderId = parseInt(req.body.order_id, 10);
    const order   = await palletModel.getOrderById(orderId);
    if (!order) {
      req.flash('error', 'Pedido no encontrado.');
      return res.redirect('/production/new');
    }

    const quantities = {};
    let count = 0, invalid = false;
    let selectedType = null, selectedCalibre = null;

    [5,6,7,8,9,10].forEach(c => {
      ['gp','cl'].forEach(type => {
        const key = `cantidad_${type}_${c}`;
        const val = parseInt(req.body[key], 10) || 0;
        quantities[key] = val;
        if (val < 0) invalid = true;
        if (val > 0) {
          if (val !== order.height) invalid = true;
          count++;
          selectedType = type;
          selectedCalibre = c;
        }
      });
    });

    if (count === 0) {
      req.flash('error', 'Debes indicar la cantidad para un calibre.');
      return res.redirect(`/production/new?order_id=${orderId}`);
    }
    if (count > 1) {
      req.flash('error', 'Solo puedes ingresar un calibre por paleta.');
      return res.redirect(`/production/new?order_id=${orderId}`);
    }
    if (invalid) {
      req.flash('error', `La cantidad debe ser exactamente ${order.height} cajas.`);
      return res.redirect(`/production/new?order_id=${orderId}`);
    }

    const existingSum = await palletModel.getSumQuantity(orderId, selectedType, selectedCalibre);
    const maxTotal    = order[`${selectedType}_calibre${selectedCalibre}`];
    const newVal      = quantities[`cantidad_${selectedType}_${selectedCalibre}`];

    if (existingSum >= maxTotal) {
      req.flash('error', `Ya completaste el pedido de ${selectedType.toUpperCase()} calibre ${selectedCalibre}.`);
      return res.redirect(`/production/new?order_id=${orderId}`);
    }
    if (existingSum + newVal > maxTotal) {
      req.flash('error', 'La suma de cajas excede el total del pedido.');
      return res.redirect(`/production/new?order_id=${orderId}`);
    }

    const numero = await palletModel.createProduction(orderId, quantities);
    req.flash('success', `Paleta #${numero} creada correctamente.`);
    res.redirect('/production');

  } catch(err) {
    next(err);
  }
};

/**
 * Muestra el formulario de ediciÃ³n de una paleta existente
 */
exports.renderEditForm = async (req, res, next) => {
  try {
    const numero = parseInt(req.params.numero_paleta, 10);
    const pallet = await palletModel.getProductionByNumero(numero);

    if (!pallet) {
      req.flash('error', 'Paleta no encontrada.');
      return res.redirect('/production');
    }

    const order = await palletModel.getOrderById(pallet.order_id);

    const gpCalibers = [5, 6, 7, 8, 9, 10]
      .filter(c => order[`gp_calibre${c}`] > 0)
      .map(c => ({ calibre: c }));

    const clCalibers = [5, 6, 7, 8, 9, 10]
      .filter(c => order[`cl_calibre${c}`] > 0)
      .map(c => ({ calibre: c }));

    res.render('production/edit', {
      pallet,
      order,
      gpCalibers,
      clCalibers
    });
  } catch(err) {
    next(err);
  }
};

/**
 * Actualiza una paleta existente
 */
exports.updateProduction = async (req, res, next) => {
  try {
    const num    = parseInt(req.params.numero_paleta, 10);
    const pallet = await palletModel.getProductionByNumero(num);
    if (!pallet) {
      req.flash('error', 'Paleta no encontrada.');
      return res.redirect('/production');
    }

    const order = await palletModel.getOrderById(pallet.order_id);
    if (!order) {
      req.flash('error', 'Pedido asociado no encontrado.');
      return res.redirect('/production');
    }

    const quantities = {};
    let count = 0, invalid = false;
    let selectedType = null, selectedCalibre = null;

    [5,6,7,8,9,10].forEach(c => {
      ['gp','cl'].forEach(type => {
        const key = `cantidad_${type}_${c}`;
        const val = parseInt(req.body[key], 10) || 0;
        quantities[key] = val;
        if (val < 0) invalid = true;
        if (val > 0) {
          if (val !== order.height) invalid = true;
          count++;
          selectedType = type;
          selectedCalibre = c;
        }
      });
    });

    if (count === 0) {
      req.flash('error', 'Debes indicar la cantidad para un calibre.');
      return res.redirect(`/production/${num}/edit`);
    }
    if (count > 1) {
      req.flash('error', 'Solo puedes ingresar un calibre por paleta.');
      return res.redirect(`/production/${num}/edit`);
    }
    if (invalid) {
      req.flash('error', `La cantidad debe ser exactamente ${order.height} cajas.`);
      return res.redirect(`/production/${num}/edit`);
    }

    const existingSum = await palletModel.getSumQuantity(pallet.order_id, selectedType, selectedCalibre);
    const oldVal      = pallet[`cantidad_${selectedType}_${selectedCalibre}`] || 0;
    const newVal      = quantities[`cantidad_${selectedType}_${selectedCalibre}`];
    const maxTotal    = order[`${selectedType}_calibre${selectedCalibre}`];

    if (existingSum - oldVal + newVal > maxTotal) {
      req.flash('error', 'La suma de cajas excede el total del pedido.');
      return res.redirect(`/production/${num}/edit`);
    }

    await palletModel.updateProduction(num, quantities);
    req.flash('success', `Paleta #${num} actualizada correctamente.`);
    res.redirect('/production');
  } catch(err) {
    next(err);
  }
};

exports.deleteProduction = async (req, res, next) => {
  try {
    const num = parseInt(req.params.numero_paleta, 10);
    await palletModel.setProductionState(num, 'ELIMINADO');
    req.flash('success', `Paleta #${num} marcada como ELIMINADA.`);
    res.redirect('/production');
  } catch(err) {
    next(err);
  }
};