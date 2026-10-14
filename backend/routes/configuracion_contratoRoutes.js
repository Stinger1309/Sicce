const express = require('express');
const router = express.Router();
const configuracionContratoController = require('../controllers/configuracion_contratoRoutesController');

// Rutas de configuración de contratos
router.get('/current', configuracionContratoController.getCurrent);  // Obtener configuración actual
router.get('/', configuracionContratoController.getAll);             // Obtener todas (historial)
router.get('/:id', configuracionContratoController.getById);         // Obtener por ID
router.post('/', configuracionContratoController.create);            // Crear nueva
router.put('/:id', configuracionContratoController.update);          // Actualizar
router.delete('/:id', configuracionContratoController.delete);       // Eliminar
router.get('/:id/historial', configuracionContratoController.getHistorial); // Ver historial

module.exports = router;