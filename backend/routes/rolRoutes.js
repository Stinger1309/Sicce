// backend/routes/rolRoutes.js
const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rolController');

// Rutas CRUD para roles
router.get('/', rolController.getAll);
router.get('/:id', rolController.getById);
router.post('/', rolController.create);
router.put('/:id', rolController.update);
router.delete('/:id', rolController.delete);

module.exports = router;