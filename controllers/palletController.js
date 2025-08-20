// controllers/palletController.js
const palletModel = require('../models/palletModel');

exports.list = async (req, res, next) => {
  try {
    const pallets = await palletModel.getAllPalettes();
    res.render('pallets', { pallets });
  } catch (err) {
    next(err);
  }
};
