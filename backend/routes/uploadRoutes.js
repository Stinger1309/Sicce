const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const EXT_FROM_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'application/pdf': 'pdf',
};

/**
 * POST /api/upload/imagen
 * Body: { image: dataURL|base64, filename?: string, mimeType?: string }
 */
router.post('/imagen', (req, res) => {
  try {
    const { image, filename, mimeType } = req.body || {};

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Se requiere la imagen en base64 (campo image)',
      });
    }

    let base64 = image.trim();
    let ext = 'jpg';
    let detectedMime = mimeType || '';

    const dataUrlMatch = base64.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataUrlMatch) {
      detectedMime = dataUrlMatch[1];
      base64 = dataUrlMatch[2];
      ext = EXT_FROM_MIME[detectedMime] || (detectedMime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    } else if (mimeType && EXT_FROM_MIME[mimeType]) {
      ext = EXT_FROM_MIME[mimeType];
    } else if (filename && filename.includes('.')) {
      ext = filename.split('.').pop().toLowerCase().replace('jpeg', 'jpg');
    }

    // Limpiar espacios/newlines del base64
    base64 = base64.replace(/\s/g, '');

    let buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Base64 de imagen inválido',
      });
    }

    if (!buffer.length) {
      return res.status(400).json({
        success: false,
        error: 'La imagen está vacía',
      });
    }

    // Límite ~10MB
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'La imagen no debe superar los 10MB',
      });
    }

    const safeName = `${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const host = req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const url = `${proto}://${host}/uploads/${safeName}`;

    return res.json({
      success: true,
      data: {
        url,
        name: safeName,
        size: buffer.length,
        mimeType: detectedMime || `image/${ext}`,
      },
    });
  } catch (error) {
    console.error('Error en upload/imagen:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al guardar la imagen',
    });
  }
});

module.exports = router;
