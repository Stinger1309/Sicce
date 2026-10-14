// backend/routes/inspeccionRoutes.js
const express = require('express');
const router = express.Router();
const inspeccionController = require('../controllers/inspeccionController');

router.get('/:id/full', inspeccionController.getFullInspectionData);
router.get('/:id/informe', inspeccionController.downloadInforme);

// Rutas de consulta (GET)
router.get('/', inspeccionController.getAll);
router.get('/estadisticas', inspeccionController.getEstadisticas); // NUEVO
router.get('/:id', inspeccionController.getById);
router.get('/expediente/:id_expediente', inspeccionController.getByExpediente);
router.get('/emprendimiento/:id_expediente', inspeccionController.getEmprendimientoData);

// Rutas de escritura (POST/PUT)
router.post('/', inspeccionController.create);
router.post('/full', inspeccionController.createFull);           // NUEVO: Crear inspección completa
router.put('/:id', inspeccionController.update);
router.put('/:id/full', inspeccionController.updateFull);       // NUEVO: Actualizar inspección completa
router.post('/:id/resultados', inspeccionController.saveInspectionResults);

module.exports = router;