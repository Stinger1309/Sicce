const express = require('express');
const router = express.Router();
const { bancoController, creditoBancoController } = require('../controllers/bancoController');

// Catálogo público (activos)
router.get('/catalogo', bancoController.listBancos);

// CRUD administración de bancos
router.get('/', bancoController.listAll);
router.post('/', bancoController.create);
router.put('/:id', bancoController.update);
router.patch('/:id/toggle', bancoController.toggleActivo);
router.delete('/:id', bancoController.remove);

// Bancos del emprendedor
router.get('/persona/:cedula', bancoController.getByCedula);
router.post('/persona', bancoController.savePersonaBancos);

// Cuenta para desembolso (créditos manejo Interno)
router.get('/cuenta-desembolso/:cedula', bancoController.getCreditosInternosCuenta);
router.post('/cuenta-desembolso', bancoController.registrarCuentaDesembolso);

// Créditos dirigidos a banco
router.get('/creditos', creditoBancoController.getAll);
router.get('/creditos/:id', creditoBancoController.getById);
router.put('/creditos/:id/estatus', creditoBancoController.updateEstatus);
router.get('/creditos/:id/aval-pdf', creditoBancoController.generarAvalPdf);

module.exports = router;
