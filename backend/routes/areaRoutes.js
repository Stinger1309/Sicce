const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');

router.get('/', areaController.getAll);
router.get('/:id', areaController.getById);
router.post('/', areaController.create);
router.put('/:id', areaController.update);
router.delete('/:id', areaController.delete);

module.exports = router;
