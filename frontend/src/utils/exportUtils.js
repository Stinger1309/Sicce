import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MEMBRETE_URL = '/membrete-iadey.png';

const MEMBRETE_LINES = [
  'REPUBLICA BOLIVARIANA DE VENEZUELA',
  'GOBIERNO DEL ESTADO BOLIVARIANO DE YARACUY',
  'Instituto Autónomo de Desarrollo Económico del Estado Yaracuy',
  'Gaceta de Creación Nº 2350 de Fecha 18 de Octubre del 2000',
  'Gaceta de Reforma Nº 2461 de Fecha 26 de Noviembre del 2001',
  '(Según Consejo Directivo Ordinario Nº 03 de fecha 12-03-2024)',
];

function formatValue(value) {
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

function normalizeColumns(columns, rows) {
  if (columns?.length) return columns;
  if (!rows?.length) return [];
  return Object.keys(rows[0]).map((key) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
}

let membreteCache = null;

async function loadMembreteDataUrl() {
  if (membreteCache) return membreteCache;
  try {
    const res = await fetch(MEMBRETE_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    membreteCache = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return membreteCache;
  } catch {
    return null;
  }
}

async function loadMembreteArrayBuffer() {
  try {
    const res = await fetch(MEMBRETE_URL);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Dibuja membrete en jsPDF. Devuelve Y (mm) debajo del encabezado.
 */
function drawMembreteJsPdf(doc, { titulo = '', membreteDataUrl = null } = {}) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  const usable = pageW - margin * 2;
  let y = 8;

  if (membreteDataUrl) {
    const imgH = Math.min(28, usable * 0.16);
    try {
      doc.addImage(membreteDataUrl, 'PNG', margin, y, usable, imgH);
      y += imgH + 3;
    } catch {
      y = drawMembreteTextJsPdf(doc, y, pageW);
    }
  } else {
    y = drawMembreteTextJsPdf(doc, y, pageW);
  }

  if (titulo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(38, 70, 83);
    doc.text(String(titulo).toUpperCase(), pageW / 2, y + 4, { align: 'center' });
    y += 8;
  }

  doc.setDrawColor(42, 157, 143);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  return y + 4;
}

function drawMembreteTextJsPdf(doc, startY, pageW) {
  let y = startY;
  doc.setTextColor(0, 0, 0);
  MEMBRETE_LINES.forEach((line, idx) => {
    doc.setFont('helvetica', idx < 3 ? 'bold' : 'normal');
    doc.setFontSize(idx < 3 ? 8 : 6.5);
    doc.text(line, pageW / 2, y, { align: 'center' });
    y += idx < 3 ? 4 : 3.2;
  });
  return y + 2;
}

/**
 * Exporta datos a Excel (.xlsx) con membrete institucional
 */
export async function exportToExcel({
  data = [],
  columns,
  fileName = 'reporte',
  sheetName = 'Datos',
  title = 'Reporte',
}) {
  const cols = normalizeColumns(columns, data);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IADEY';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet((sheetName || title || 'Datos').substring(0, 31));
  const colCount = Math.max(cols.length, 4);
  let headerEndRow = 1;

  const buffer = await loadMembreteArrayBuffer();
  if (buffer) {
    const imageId = workbook.addImage({
      buffer: new Uint8Array(buffer),
      extension: 'png',
    });
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: Math.min(720, 95 * Math.min(colCount, 8)), height: 95 },
      editAs: 'oneCell',
    });
    for (let r = 1; r <= 5; r++) sheet.getRow(r).height = 18;
    headerEndRow = 6;
  } else {
    MEMBRETE_LINES.forEach((line, idx) => {
      const rowNum = idx + 1;
      sheet.mergeCells(rowNum, 1, rowNum, colCount);
      const cell = sheet.getCell(rowNum, 1);
      cell.value = line;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { bold: idx < 3, size: idx < 3 ? 11 : 8 };
    });
    headerEndRow = MEMBRETE_LINES.length + 1;
  }

  sheet.mergeCells(headerEndRow, 1, headerEndRow, colCount);
  const titleCell = sheet.getCell(headerEndRow, 1);
  titleCell.value = String(title || 'Reporte IADEY').toUpperCase();
  titleCell.font = { bold: true, size: 12, color: { argb: 'FF264653' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const dateRow = headerEndRow + 1;
  sheet.mergeCells(dateRow, 1, dateRow, colCount);
  const dateCell = sheet.getCell(dateRow, 1);
  dateCell.value = `Generado: ${new Date().toLocaleString('es-VE')} — ${data.length} registros`;
  dateCell.font = { size: 9, color: { argb: 'FF666666' } };
  dateCell.alignment = { horizontal: 'center' };

  const tableHeaderRow = dateRow + 2;
  const headerRow = sheet.getRow(tableHeaderRow);
  cols.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A9D8F' } };
    cell.alignment = { horizontal: 'center' };
  });

  data.forEach((item, rowIndex) => {
    const excelRow = sheet.getRow(tableHeaderRow + 1 + rowIndex);
    cols.forEach((col, i) => {
      excelRow.getCell(i + 1).value = formatValue(item[col.key]);
    });
  });

  cols.forEach((col, i) => {
    sheet.getColumn(i + 1).width = Math.max(12, Math.min(40, (col.label || '').length + 8));
  });

  const out = await workbook.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exporta datos a PDF con tabla y membrete
 */
export async function exportToPDF({
  data = [],
  columns,
  title = 'Reporte',
  fileName = 'reporte',
}) {
  const cols = normalizeColumns(columns, data);
  const orientation = cols.length > 6 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const membreteDataUrl = await loadMembreteDataUrl();

  let startY = drawMembreteJsPdf(doc, { titulo: title, membreteDataUrl });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    `Generado: ${new Date().toLocaleString('es-VE')} — ${data.length} registros`,
    doc.internal.pageSize.getWidth() / 2,
    startY,
    { align: 'center' }
  );
  startY += 6;

  const head = [cols.map((c) => c.label)];
  const body = data.map((row) => cols.map((c) => formatValue(row[c.key])));

  if (typeof autoTable === 'function' || typeof doc.autoTable === 'function') {
    const tableFn = typeof autoTable === 'function' ? autoTable : (d, opts) => d.autoTable(opts);
    tableFn(doc, {
      startY,
      head,
      body,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [42, 157, 143], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 },
      didDrawPage: (hookData) => {
        if (hookData.pageNumber > 1) {
          drawMembreteJsPdf(doc, {
            titulo: `${title} (continuación)`,
            membreteDataUrl,
          });
        }
      },
    });
  } else {
    let y = startY;
    const pageW = doc.internal.pageSize.getWidth();
    const colW = (pageW - 20) / Math.max(cols.length, 1);
    doc.setFontSize(7);
    doc.setTextColor(38, 70, 83);
    cols.forEach((c, i) => {
      doc.text(String(c.label).substring(0, 18), 10 + i * colW, y);
    });
    y += 5;
    doc.setDrawColor(42, 157, 143);
    doc.line(10, y, pageW - 10, y);
    y += 4;
    doc.setTextColor(50);
    const maxRows = Math.min(data.length, 80);
    for (let r = 0; r < maxRows; r++) {
      if (y > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = drawMembreteJsPdf(doc, { titulo: `${title} (continuación)`, membreteDataUrl });
      }
      cols.forEach((c, i) => {
        doc.text(formatValue(data[r][c.key]).substring(0, 22), 10 + i * colW, y);
      });
      y += 5;
    }
  }

  doc.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exporta un contenedor de gráficos (DOM) a PDF con membrete
 */
export async function exportChartsToPDF({
  element,
  title = 'Gráficos y Métricas',
  fileName = 'graficos_iadey',
  subtitle = '',
}) {
  if (!element) throw new Error('No hay contenido de gráficos para exportar');

  const html2canvas = (await import('html2canvas-pro')).default;
  const membreteDataUrl = await loadMembreteDataUrl();
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  let headerBottom = drawMembreteJsPdf(pdf, { titulo: title, membreteDataUrl });
  if (subtitle) {
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(subtitle, pageWidth / 2, headerBottom, { align: 'center' });
    headerBottom += 5;
  }

  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const usableHeight = pageHeight - headerBottom - margin;

  let heightLeft = imgHeight;
  let position = headerBottom;

  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
  heightLeft -= usableHeight;

  while (heightLeft > 0) {
    position = headerBottom - (imgHeight - heightLeft);
    pdf.addPage();
    headerBottom = drawMembreteJsPdf(pdf, {
      titulo: `${title} (continuación)`,
      membreteDataUrl,
    });
    position = headerBottom - (imgHeight - heightLeft);
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - headerBottom - margin;
  }

  pdf.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Descarga un blob como archivo
 */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default { exportToExcel, exportToPDF, exportChartsToPDF, downloadBlob };
