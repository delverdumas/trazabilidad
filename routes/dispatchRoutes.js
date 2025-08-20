// routes/dispatchRoutes.js
const express = require('express');
const router  = express.Router();
const dc      = require('../controllers/dispatchController');
const dispatchController = require('../controllers/dispatchController');

router.get('/',     dc.listDispatches);
router.get('/new',  dc.renderNewForm);
router.post('/new', dc.createDispatch);
router.get('/edit/:id', dispatchController.showEditForm);
router.post('/edit/:id', dispatchController.updateDispatch);


module.exports = router;
