const express = require('express');
const router = express.Router();
const requisitosController = require('../controllers/requisitosController');

// Rutas para requisitos
router.get('/', requisitosController.getAll);
router.get('/:id', requisitosController.getById);
router.post('/', requisitosController.create);
router.put('/:id', requisitosController.update);
router.delete('/:id', requisitosController.delete);

module.exports = router;