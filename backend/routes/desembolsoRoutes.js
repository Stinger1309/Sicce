const express = require('express');
const router = express.Router();
const desembolsoController = require('../controllers/desembolsoController');

// GET /api/desembolso - Obtener todos los desembolsos
router.get('/', desembolsoController.getAll);

// GET /api/desembolso/contratos-pendientes - Obtener contratos pendientes
router.get('/contratos-pendientes', desembolsoController.getContratosPendientes);

// GET /api/desembolso/verificar/:id_cont - Verificar si existe desembolso
router.get('/verificar/:id_cont', desembolsoController.verificarDesembolso);

// GET /api/desembolso/cedula/:cedula - Obtener desembolsos por cédula
router.get('/cedula/:cedula', desembolsoController.getByCedula);

// POST /api/desembolso - Crear nuevo desembolso
router.post('/', desembolsoController.create);

// PUT /api/desembolso/confirmar-pago/:id - Confirmar desembolso (emprendedor)
router.put('/confirmar-pago/:id', desembolsoController.confirmarPago);

// PUT /api/desembolso/denegar/:id - Denegar desembolso con comprobante
router.put('/denegar/:id', desembolsoController.denegarDesembolso);

module.exports = router;