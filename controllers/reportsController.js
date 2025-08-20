const palletModel    = require('../models/palletModel');
const orderModel     = require('../models/orderModel');
const dispatchModel  = require('../models/dispatchModel');

/**
 * Muestra la vista general de reportes.
 */
exports.showReports = (req, res) => {
  res.render('reports', {
    totalOrders:      0,
    cameraSaldo:      0,
    faltantes:        0,
    totalDispatches:  0
  });
};

/**
 * Reporte de “Saldo en cámara por pedido”
 */
exports.showCameraSaldo = async (req, res) => {
  try {
    const data = await palletModel.getCameraDetail();
    const labels = data.map(r => `Pedido #${r.order_id} – ${r.client_name}`);
    const datasets = [5, 6, 7, 8, 9, 10].map(cal => ({
      label: `Calibre ${cal}`,
      data: data.map(r => r[`calibre${cal}`])
    }));
    res.render('reports_camera', { labels, datasets });
  } catch (err) {
    console.error('Error al generar el reporte de saldo en cámara:', err);
    res.status(500).send('Error al generar el reporte');
  }
};

/**
 * Reporte de pedidos realizados por semana
 */
exports.showOrdersByWeek = async (req, res) => {
  try {
    const weekList = await orderModel.getAvailableWeeks();
    const weeks = weekList.map(w => w.week);

    const selectedWeek = req.query.week || weeks[0];
    const selectedStatus = req.query.status || 'TODOS';

    const orders = await orderModel.getOrdersByWeek(selectedWeek, selectedStatus);

    res.render('reports_orders', {
      orders,
      weeks,
      selectedWeek,
      selectedStatus
    });
  } catch (err) {
    console.error('Error al generar el reporte de pedidos:', err);
    res.status(500).send('Error al generar el reporte');
  }
};

/**
 * Reporte de despachos realizados
 */
exports.showDispatchesReport = async (req, res) => {
  try {
    const dispatches = await dispatchModel.getAllWithClient();
    res.render('reports_dispatches', { dispatches });
  } catch (err) {
    console.error('Error al cargar reporte de despachos:', err);
    res.status(500).send('Error al cargar reporte de despachos');
  }
};

/**
 * Reporte de faltantes por pedido y calibre
 */
exports.showFaltantesReport = async (req, res) => {
  try {
    const orders = await orderModel.getPendingOrders(); // trae datos de calibres por pedido
    const data = [];

    for (const order of orders) {
      const mapa = await palletModel.getCajasEnCamaraPorPedidoYCalibre(order.order_id);

      const resumen = { label: `Pedido #${order.order_id} – ${order.client_name}` };

      for (let cal = 5; cal <= 10; cal++) {
        const keyGP = `gp_calibre${cal}`;
        const keyCL = `cl_calibre${cal}`;

        const pedidoGP = order[keyGP] || 0;
        const pedidoCL = order[keyCL] || 0;
        const producidoGP = mapa[keyGP] || 0;
        const producidoCL = mapa[keyCL] || 0;

        const faltanteGP = Math.max(0, pedidoGP - producidoGP);
        const faltanteCL = Math.max(0, pedidoCL - producidoCL);

        resumen[keyGP] = faltanteGP;
        resumen[keyCL] = faltanteCL;
      }

      data.push(resumen);
    }

    const labels = data.map(r => r.label);
    const datasets = [];

    for (let cal = 5; cal <= 10; cal++) {
      datasets.push({
        label: `GP Calibre ${cal}`,
        data: data.map(r => r[`gp_calibre${cal}`] || 0)
      });
      datasets.push({
        label: `CL Calibre ${cal}`,
        data: data.map(r => r[`cl_calibre${cal}`] || 0)
      });
    }

    res.render('reports_faltantes', { labels, datasets });
  } catch (err) {
    console.error('Error al generar reporte de faltantes:', err);
    res.status(500).send('Error al generar el reporte de faltantes');
  }
};
