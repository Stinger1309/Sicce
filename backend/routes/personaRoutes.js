const express = require('express');
const router = express.Router();
const personaController = require('../controllers/personaController');

// Rutas principales
router.get('/personas', personaController.getAll);
router.get('/personas/tipo/:tipo', personaController.getByTipo);
router.get('/personas/:cedula', personaController.getById);
router.get('/personas/cedula/:cedula', personaController.getByCedula);
router.post('/personas', personaController.create);
router.put('/personas/:cedula', personaController.update);
router.delete('/personas/:cedula', personaController.delete);

module.exports = router;