const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { drawMembretePdfKit, getMembretePath, membreteExists, MEMBRETE_LINES } = require('../utils/membrete');

function formatCellValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleString('es-VE');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

async function generarPDF({ titulo, subtitulo, columns, rows }) {
  return new Promise((resolve, reject) => {
    try {
      const landscape = rows.length > 0 && columns.length > 5;
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        layout: landscape ? 'landscape' : 'portrait',
      });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const colors = { primary: '#264653', secondary: '#2A9D8F', text: '#333333', light: '#666666' };

      drawMembretePdfKit(doc, { titulo: titulo || 'Reporte' });

      if (subtitulo) {
        doc.font('Helvetica').fontSize(8).fillColor(colors.light)
          .text(subtitulo, { align: 'center' });
        doc.moveDown(0.4);
      }

      doc.font('Helvetica').fontSize(8).fillColor(colors.light)
        .text(`Generado: ${new Date().toLocaleString('es-VE')} — ${rows.length} registros`, {
          align: 'center',
        });
      doc.moveDown(0.6);

      const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = Math.max(50, usableWidth / Math.max(columns.length, 1));
      const startX = doc.page.margins.left;
      let y = doc.y;

      doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.primary);
      columns.forEach((col, i) => {
        doc.text(col.label, startX + i * colWidth, y, { width: colWidth - 4, continued: false });
      });
      y += 14;
      doc.strokeColor('#cccccc').lineWidth(0.5)
        .moveTo(startX, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
      y += 6;

      doc.font('Helvetica').fillColor(colors.text);
      const maxRows = Math.min(rows.length, 200);

      for (let r = 0; r < maxRows; r++) {
        if (y > doc.page.height - 50) {
          doc.addPage();
          y = drawMembretePdfKit(doc, { titulo: `${titulo || 'Reporte'} (continuación)` });
          doc.font('Helvetica').fillColor(colors.text);
        }
        const row = rows[r];
        let maxH = 12;
        columns.forEach((col, i) => {
          const text = formatCellValue(row[col.key]);
          const h = doc.heightOfString(text, { width: colWidth - 4 });
          if (h > maxH) maxH = h;
          doc.text(text, startX + i * colWidth, y, { width: colWidth - 4 });
        });
        y += maxH + 4;
      }

      if (rows.length > maxRows) {
        doc.y = y + 8;
        doc.fontSize(8).fillColor(colors.light)
          .text(`Mostrando ${maxRows} de ${rows.length} registros.`, { align: 'center' });
      }

      doc.fontSize(8).fillColor(colors.light)
        .text(`Generado: ${new Date().toLocaleString('es-VE')}`, 36, doc.page.height - 28, {
          align: 'left',
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function generarExcel({ titulo, sheetName, columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IADEY';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName || 'Datos');
  const colCount = Math.max(columns.length, 4);

  let headerEndRow = 1;

  if (membreteExists()) {
    const imageId = workbook.addImage({
      filename: getMembretePath(),
      extension: 'png',
    });
    // Filas 1-5 reservadas para membrete
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: Math.min(720, 90 * colCount), height: 95 },
      editAs: 'oneCell',
    });
    sheet.getRow(1).height = 18;
    sheet.getRow(2).height = 18;
    sheet.getRow(3).height = 18;
    sheet.getRow(4).height = 18;
    sheet.getRow(5).height = 18;
    headerEndRow = 6;
  } else {
    MEMBRETE_LINES.forEach((line, idx) => {
      const rowNum = idx + 1;
      sheet.mergeCells(rowNum, 1, rowNum, colCount);
      const cell = sheet.getCell(rowNum, 1);
      cell.value = line;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = {
        bold: idx < 3,
        size: idx < 3 ? 11 : 8,
        color: { argb: 'FF000000' },
      };
    });
    headerEndRow = MEMBRETE_LINES.length + 1;
  }

  sheet.mergeCells(headerEndRow, 1, headerEndRow, colCount);
  const titleCell = sheet.getCell(headerEndRow, 1);
  titleCell.value = String(titulo || 'Reporte IADEY').toUpperCase();
  titleCell.font = { bold: true, size: 12, color: { argb: 'FF264653' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const dateRow = headerEndRow + 1;
  sheet.mergeCells(dateRow, 1, dateRow, colCount);
  const dateCell = sheet.getCell(dateRow, 1);
  dateCell.value = `Generado: ${new Date().toLocaleString('es-VE')} — ${rows.length} registros`;
  dateCell.font = { size: 9, color: { argb: 'FF666666' } };
  dateCell.alignment = { horizontal: 'center' };

  const tableHeaderRow = dateRow + 2;
  const headerRow = sheet.getRow(tableHeaderRow);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A9D8F' } };
    cell.alignment = { horizontal: 'center' };
  });

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(tableHeaderRow + 1 + rowIndex);
    columns.forEach((col, i) => {
      excelRow.getCell(i + 1).value = formatCellValue(row[col.key]);
    });
  });

  columns.forEach((col, i) => {
    sheet.getColumn(i + 1).width = Math.max(12, Math.min(40, (col.label || '').length + 8));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  generarPDF,
  generarExcel,
  formatCellValue
};
