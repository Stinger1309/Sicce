const express = require('express');
const router = express.Router();
const contratoController = require('../controllers/contratoController');

// Rutas específicas ANTES de /:id para no capturar "cedula" o "last-number"
router.get('/', contratoController.getAll);
router.post('/', contratoController.create);
router.post('/desembolso-interno', contratoController.registrarDesembolsoInterno);
router.get('/last-number', contratoController.getLastContractNumber);
router.get('/cedula/:cedula', contratoController.getByCedula);
router.put('/:id/estatus', contratoController.updateStatus);
router.get('/:id', contratoController.getById);

module.exports = router;
