const express = require('express');
const router = express.Router();
const emprendimientoController = require('../controllers/emprendimientoController');

// Rutas para emprendimiento
router.get('/', emprendimientoController.getAll);
router.get('/:id', emprendimientoController.getById);
router.get('/solicitud/:id_solicitud', emprendimientoController.getByIdSolicitud);
router.get('/cedula/:cedula_emprendimiento', emprendimientoController.getByCedula);
router.post('/', emprendimientoController.create);
router.put('/:id', emprendimientoController.update);
router.delete('/:id', emprendimientoController.delete);

module.exports = router;