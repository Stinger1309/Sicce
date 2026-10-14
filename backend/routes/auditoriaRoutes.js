const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');

router.get('/', auditoriaController.getAll);
router.get('/filtros', auditoriaController.getFiltros);
router.get('/estadisticas', auditoriaController.getEstadisticas);
router.get('/exportar', auditoriaController.exportar);
router.get('/:id', auditoriaController.getById);
router.post('/', auditoriaController.create);
router.post('/limpiar', auditoriaController.limpiar);

module.exports = router;
