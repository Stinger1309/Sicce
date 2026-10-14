const fs = require('fs');
const path = require('path');

const MEMBRETE_PATH = path.join(__dirname, '../assets/membrete-iadey.png');

const MEMBRETE_LINES = [
  'REPUBLICA BOLIVARIANA DE VENEZUELA',
  'GOBIERNO DEL ESTADO BOLIVARIANO DE YARACUY',
  'Instituto Autónomo de Desarrollo Económico del Estado Yaracuy',
  'Gaceta de Creación Nº 2350 de Fecha 18 de Octubre del 2000',
  'Gaceta de Reforma Nº 2461 de Fecha 26 de Noviembre del 2001',
  '(Según Consejo Directivo Ordinario Nº 03 de fecha 12-03-2024)',
];

/**
 * Dibuja el membrete institucional en un PDFKit Document.
 * @returns {number} coordenada Y debajo del membrete
 */
function drawMembretePdfKit(doc, { titulo = '' } = {}) {
  const left = doc.page.margins.left || 40;
  const right = doc.page.margins.right || 40;
  const usableWidth = doc.page.width - left - right;
  let y = doc.page.margins.top || 40;

  if (fs.existsSync(MEMBRETE_PATH)) {
    // Relación aprox. del membrete horizontal (~5.5:1)
    const imgH = Math.min(42, usableWidth * 0.18);
    doc.image(MEMBRETE_PATH, left, y, { width: usableWidth, height: imgH });
    y += imgH + 6;
  } else {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
    MEMBRETE_LINES.slice(0, 3).forEach((line) => {
      doc.text(line, left, y, { width: usableWidth, align: 'center' });
      y = doc.y + 1;
    });
    doc.font('Helvetica').fontSize(7).fillColor('#333333');
    MEMBRETE_LINES.slice(3).forEach((line) => {
      doc.text(line, left, y, { width: usableWidth, align: 'center' });
      y = doc.y + 1;
    });
    y += 4;
  }

  if (titulo) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#264653')
      .text(String(titulo).toUpperCase(), left, y, { width: usableWidth, align: 'center' });
    y = doc.y + 4;
  }

  doc.strokeColor('#2A9D8F').lineWidth(1.2)
    .moveTo(left, y)
    .lineTo(doc.page.width - right, y)
    .stroke();
  y += 10;

  doc.x = left;
  doc.y = y;
  return y;
}

function getMembretePath() {
  return MEMBRETE_PATH;
}

function membreteExists() {
  return fs.existsSync(MEMBRETE_PATH);
}

module.exports = {
  MEMBRETE_PATH,
  MEMBRETE_LINES,
  drawMembretePdfKit,
  getMembretePath,
  membreteExists,
};
