const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');

router.get('/mias', notificacionController.getMias);
router.post('/', notificacionController.crear);
router.put('/:id/leer', notificacionController.marcarLeida);
router.put('/leer-todas', notificacionController.marcarTodas);

module.exports = router;
