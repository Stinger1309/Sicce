// routes/recuperacionRoutes.js
const express = require('express');
const router = express.Router();
const recuperacionController = require('../controllers/recuperacionController');

router.post('/solicitar', recuperacionController.solicitarRecuperacion);
router.post('/verificar', recuperacionController.verificarCodigo);
router.post('/cambiar', recuperacionController.cambiarContrasenaConToken);
router.post('/reenviar', recuperacionController.reenviarCodigo);

module.exports = router;