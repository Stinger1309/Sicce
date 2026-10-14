const express = require('express');
const router = express.Router();
const respaldoController = require('../controllers/respaldoController');

router.get('/generar', respaldoController.generar);
router.get('/historial', respaldoController.historial);
router.get('/tablas', respaldoController.tablas);
router.get('/programacion', respaldoController.programacion);
router.get('/descargar/:id', respaldoController.descargar);
router.post('/ejecutar-automatico', respaldoController.ejecutarAutomatico);

module.exports = router;
