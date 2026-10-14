// routes/aprobacionRoutes.js
const express = require('express');
const router = express.Router();
const aprobacionController = require('../controllers/aprobacionController');

// Rutas para expedientes (nuevas)
router.get('/expedientes', aprobacionController.getAllExpedientes);
router.get('/expedientes/stats', aprobacionController.getStatsExpedientes);
router.get('/expediente/:id', aprobacionController.getExpedienteById);

// Ruta existente para verificar requisitos
router.post('/verificar-requisitos', aprobacionController.verificarRequisitos);

module.exports = router;