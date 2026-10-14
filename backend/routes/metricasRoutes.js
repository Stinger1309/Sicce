const express = require('express');
const router = express.Router();
const metricasController = require('../controllers/metricasController');

router.get('/', metricasController.getResumen);
router.get('/resumen', metricasController.getResumen);

module.exports = router;
