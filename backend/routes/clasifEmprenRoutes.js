const express = require('express');
const router = express.Router();
const clasificacionEmprendimientoController = require('../controllers/clasificacionEmprendimientoController');

// Rutas para clasificacion_emprendimiento
router.get('/', clasificacionEmprendimientoController.getAll);           // ✅
router.get('/:id_clasificacion', clasificacionEmprendimientoController.getById);  // ✅
router.post('/', clasificacionEmprendimientoController.create);          // ✅
router.put('/:id_clasificacion', clasificacionEmprendimientoController.update);   // ✅
router.delete('/:id_clasificacion', clasificacionEmprendimientoController.delete); // ✅

module.exports = router;