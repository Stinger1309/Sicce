const express = require('express');
const router = express.Router();
const {
  obtenerValorIdiActual,
  uvcABolivares,
  bolivaresAUvc,
} = require('../services/bcvUvcService');

/** GET /api/uvc/valor-actual — IDI/UVC del día (solo herramienta externa) */
router.get('/valor-actual', async (req, res) => {
  try {
    const data = await obtenerValorIdiActual();
    res.json({ success: true, data });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: error.message,
      details: error.details || null,
    });
  }
});

/** GET /api/uvc/convertir?uvc=10 — UVC → Bs con IDI del día */
router.get('/convertir', async (req, res) => {
  try {
    const uvc = req.query.uvc;
    const bs = req.query.bs;
    if (uvc != null && uvc !== '') {
      const data = await uvcABolivares(uvc);
      return res.json({ success: true, data });
    }
    if (bs != null && bs !== '') {
      const data = await bolivaresAUvc(bs);
      return res.json({ success: true, data });
    }
    return res.status(400).json({
      success: false,
      error: 'Indique query uvc= o bs=',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: error.message,
      details: error.details || null,
    });
  }
});

module.exports = router;
