const express = require('express');
const router = express.Router();
const citaController = require('../controllers/citaController');

router.get('/', citaController.getAll);
router.get('/:id', citaController.getById);
router.post('/', citaController.create);
router.put('/:id', citaController.update);
router.put('/:id/cancelar', citaController.cancelar);

module.exports = router;
