// backend/services/pdfService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { drawMembretePdfKit } = require('../utils/membrete');

class PDFService {
  static async generarPDFExpediente(expediente) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        
        // Colores
        const colors = {
          primary: '#264653',
          secondary: '#2A9D8F',
          text: '#333333',
          lightText: '#666666'
        };
        
        drawMembretePdfKit(doc, { titulo: 'EXPEDIENTE DE EMPRENDEDOR' });
        
        doc.fontSize(10)
           .fillColor(colors.lightText)
           .text(`Fecha de generación: ${new Date().toLocaleString()}`, { align: 'center' });
        
        doc.moveDown(1);
        
        // Información del expediente
        doc.fontSize(14)
           .fillColor(colors.primary)
           .text('INFORMACIÓN DEL EXPEDIENTE', { underline: true });
        
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor(colors.text);
        
        const infoExpediente = [
          ['Código Expediente:', expediente.codigo_expediente || 'N/A'],
          ['Fecha Registro:', expediente.created_at ? new Date(expediente.created_at).toLocaleDateString() : 'N/A'],
          ['Estado:', expediente.estatus || 'N/A'],
          ['Inspector Asignado:', expediente.usuario_nombre || 'No asignado']
        ];
        
        infoExpediente.forEach(([label, value]) => {
          doc.text(label, { continued: true, width: 150 })
             .text(` ${value}`, { indent: 0 });
          doc.moveDown(0.3);
        });
        
        doc.moveDown(1);
        
        // Información del emprendedor
        doc.fontSize(14)
           .fillColor(colors.primary)
           .text('DATOS DEL EMPRENDEDOR', { underline: true });
        
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor(colors.text);
        
        const infoEmprendedor = [
          ['Nombre Completo:', `${expediente.nombres || ''} ${expediente.apellidos || ''}`.trim() || 'N/A'],
          ['Cédula:', expediente.cedula || 'N/A'],
          ['Teléfono:', expediente.telefono || 'N/A'],
          ['Correo Electrónico:', expediente.correo || 'N/A'],
          ['Dirección:', expediente.direccion || 'N/A']
        ];
        
        infoEmprendedor.forEach(([label, value]) => {
          doc.text(label, { continued: true, width: 150 })
             .text(` ${value}`, { indent: 0 });
          doc.moveDown(0.3);
        });
        
        doc.moveDown(1);
        
        // Información de la solicitud
        doc.fontSize(14)
           .fillColor(colors.primary)
           .text('DATOS DE LA SOLICITUD', { underline: true });
        
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor(colors.text);
        
        const infoSolicitud = [
          ['Descripción:', expediente.solicitud || 'N/A'],
          ['Monto Solicitado:', expediente.monto_solicitado ? `$${parseFloat(expediente.monto_solicitado).toLocaleString()}` : '$0'],
          ['Fecha Solicitud:', expediente.fecha_solicitud ? new Date(expediente.fecha_solicitud).toLocaleDateString() : 'N/A']
        ];
        
        infoSolicitud.forEach(([label, value]) => {
          doc.text(label, { continued: true, width: 150 })
             .text(` ${value}`, { indent: 0 });
          doc.moveDown(0.3);
        });
        
        doc.moveDown(1);
        
        // Documentos adjuntos
        doc.fontSize(14)
           .fillColor(colors.primary)
           .text('DOCUMENTOS ADJUNTOS', { underline: true });
        
        doc.moveDown(0.5);
        
        // Mostrar documentos de verificación
        let documentos = [];
        if (expediente.verificacion_requisitos) {
          try {
            const verificacion = JSON.parse(expediente.verificacion_requisitos);
            documentos = verificacion.documentos || [];
          } catch(e) {}
        }
        
        if (documentos.length > 0) {
          documentos.forEach((docum, index) => {
            doc.fontSize(10)
               .fillColor(colors.secondary)
               .text(`${index + 1}. ${docum.nombre_requisito || 'Documento'}`, { underline: false });
            doc.fontSize(9)
               .fillColor(colors.text)
               .text(`   Tipo: ${docum.tipo || 'Imagen'}`, { indent: 10 })
               .text(`   Fecha: ${new Date(docum.fecha).toLocaleString()}`, { indent: 10 });
            doc.moveDown(0.5);
          });
        } else {
          doc.fontSize(10)
             .fillColor(colors.lightText)
             .text('No hay documentos adjuntos en este expediente');
        }
        
        doc.moveDown(2);
        
        // Pie de página
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
             .fillColor(colors.lightText)
             .text(
               `Documento generado electrónicamente por IADEY - Página ${i + 1} de ${pageCount}`,
               50,
               doc.page.height - 50,
               { align: 'center' }
             );
        }
        
        doc.end();
        
      } catch (error) {
        console.error('Error generando PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Aval / constancia de dirección de crédito hacia entidad bancaria
   */
  static async generarPDFAvalBancario(credito) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const colors = {
          primary: '#264653',
          secondary: '#2A9D8F',
          text: '#333333',
          light: '#666666'
        };

        drawMembretePdfKit(doc, { titulo: 'CONSTANCIA / AVAL DE DIRECCIÓN DE CRÉDITO A BANCO' });
        doc.fontSize(9).fillColor(colors.light)
          .text(`Documento N° AVAL-${credito.id_credito_banco} — ${new Date().toLocaleString('es-VE')}`, { align: 'center' });

        doc.moveDown(1);

        doc.fontSize(10).fillColor(colors.text);
        doc.text(
          'Por medio de la presente, el Instituto Autónomo de Desarrollo Económico de Yaracuy (IADEY) ' +
          'hace constar que, luego del proceso de evaluación y aprobación correspondiente, ' +
          'está direccionando el crédito del emprendedor abajo identificado hacia la entidad ' +
          'bancaria señalada, a los fines de que dicha institución continúe con la gestión del financiamiento.',
          { align: 'justify', lineGap: 3 }
        );

        doc.moveDown(1.2);
        doc.fontSize(12).fillColor(colors.primary).text('1. DATOS DEL EMPRENDEDOR', { underline: true });
        doc.moveDown(0.4);
        doc.fontSize(10).fillColor(colors.text);
        const emprendedor = [
          ['Nombre completo:', credito.nombre_completo || `${credito.nombres || ''} ${credito.apellidos || ''}`.trim()],
          ['Cédula:', credito.cedula_persona || 'N/A'],
          ['Teléfono:', credito.telefono || 'N/A'],
          ['Correo:', credito.correo || 'N/A'],
          ['Dirección:', credito.direccion || 'N/A'],
          ['Emprendimiento:', credito.nombre_emprendimiento || 'N/A'],
          ['Sector / Actividad:', `${credito.sector || 'N/A'} / ${credito.actividad || 'N/A'}`]
        ];
        emprendedor.forEach(([l, v]) => {
          doc.font('Helvetica-Bold').text(l, { continued: true, width: 160 });
          doc.font('Helvetica').text(` ${v || 'N/A'}`);
          doc.moveDown(0.25);
        });

        doc.moveDown(0.8);
        doc.fontSize(12).fillColor(colors.primary).text('2. INFORMACIÓN DE LA SOLICITUD', { underline: true });
        doc.moveDown(0.4);
        doc.fontSize(10).fillColor(colors.text);
        const solicitud = [
          ['Código expediente:', credito.codigo_expediente || 'N/A'],
          ['N° solicitud / crédito banco:', String(credito.id_credito_banco)],
          ['Monto solicitado:', credito.monto_solicitado || credito.monto_aprobado || 'N/A'],
          ['Fecha solicitud:', credito.fecha_solicitud || 'N/A'],
          ['Estatus aprobación:', credito.estatus_aprobacion || 'N/A'],
          ['Estatus crédito banco:', credito.estatus || 'Finalizado'],
          ['Fecha de dirección:', credito.fecha_direccion
            ? new Date(credito.fecha_direccion).toLocaleString('es-VE')
            : new Date().toLocaleString('es-VE')]
        ];
        solicitud.forEach(([l, v]) => {
          doc.font('Helvetica-Bold').text(l, { continued: true, width: 180 });
          doc.font('Helvetica').text(` ${v || 'N/A'}`);
          doc.moveDown(0.25);
        });

        doc.moveDown(0.8);
        doc.fontSize(12).fillColor(colors.primary).text('3. ENTIDAD BANCARIA DESTINO', { underline: true });
        doc.moveDown(0.4);
        doc.fontSize(10).fillColor(colors.text);
        const banco = [
          ['Banco:', credito.banco_nombre || 'N/A'],
          ['Código:', credito.codigo_banco || credito.banco_siglas || 'N/A'],
          ['Tipo de cuenta:', credito.tipo_cuenta || 'N/A'],
          ['N° de cuenta:', credito.numero_cuenta || 'N/A']
        ];
        banco.forEach(([l, v]) => {
          doc.font('Helvetica-Bold').text(l, { continued: true, width: 160 });
          doc.font('Helvetica').text(` ${v || 'N/A'}`);
          doc.moveDown(0.25);
        });

        if (credito.observaciones) {
          doc.moveDown(0.6);
          doc.fontSize(12).fillColor(colors.primary).text('4. OBSERVACIONES', { underline: true });
          doc.moveDown(0.3);
          doc.fontSize(10).fillColor(colors.text).text(credito.observaciones, { align: 'justify' });
        }

        doc.moveDown(1.5);
        doc.fontSize(9).fillColor(colors.light).text(
          'Este documento tiene carácter de aval institucional de dirección de crédito y ' +
          'debe ser entregado al emprendedor para su presentación ante la entidad bancaria. ' +
          'No constituye por sí mismo un desembolso ni un contrato bancario.',
          { align: 'justify' }
        );

        doc.moveDown(2.5);
        doc.fontSize(10).fillColor(colors.text);

        const nombrePresidente =
          credito.presidente_nombre ||
          credito.nombre_presidente ||
          'Presidente(a) — IADEY';

        // Espacio para firma
        const firmaY = Math.min(doc.y + 20, doc.page.height - 140);
        doc.y = firmaY;
        doc.text('_______________________________', { align: 'center' });
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(11)
          .text(nombrePresidente, { align: 'center' });
        doc.font('Helvetica').fontSize(9).fillColor(colors.light)
          .text('Presidente(a) — Instituto Autónomo de Desarrollo Económico de Yaracuy (IADEY)', {
            align: 'center'
          });
        doc.moveDown(0.4);
        doc.fontSize(8).fillColor(colors.light)
          .text('Espacio para firma y sello', { align: 'center' });
        doc.moveDown(0.2);
        doc.text('Documento generado electrónicamente', { align: 'center' });

        // Reimpresiones posteriores a la primera entrega
        if (credito.aval_entregado || Number(credito.aval_descargas) > 0) {
          doc.moveDown(1.2);
          doc.font('Helvetica-Bold').fontSize(14).fillColor('#c0392b')
            .text('ENTREGADA', { align: 'center' });
          doc.font('Helvetica').fontSize(9).fillColor(colors.light)
            .text(
              credito.fecha_aval_entregado
                ? `Constancia entregada el ${new Date(credito.fecha_aval_entregado).toLocaleString('es-VE')}`
                : 'Constancia ya entregada al beneficiario (reimpresión)',
              { align: 'center' }
            );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /** PDF de cumplimiento de contrato (todas las cuotas pagadas) */
  static async generarPDFCumplimientoContrato(datos) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const colors = { dark: '#1a1a1a', light: '#555555', accent: '#2A9D8F' };
        const cuotas = datos.cuotas || [];

        drawMembretePdfKit(doc, { titulo: 'CONSTANCIA DE CUMPLIMIENTO DE CONTRATO' });
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(11).fillColor(colors.dark)
          .text(
            `Por medio de la presente se hace constar que el (la) ciudadano(a) ` +
              `${datos.emprendedor || 'N/A'}, titular de la cédula ${datos.cedula || datos.cedula_persona_id || datos.id_cedula_aprob || 'N/A'}, ` +
              `ha cumplido satisfactoriamente con las obligaciones de pago establecidas en el contrato ` +
              `${datos.numero_contrato || `#${datos.id_contrato}`}.`
          );
        doc.moveDown(1);

        doc.font('Helvetica-Bold').fontSize(11).text('Datos del contrato');
        doc.font('Helvetica').fontSize(10).fillColor(colors.light);
        doc.text(`Número: ${datos.numero_contrato || 'N/A'}`);
        doc.text(`Monto / Devolvimiento: ${datos.devolvimiento || datos.monto_moneda || 'N/A'} ${datos.moneda || ''}`);
        doc.text(`Cuotas: ${cuotas.length} (Obligatorias y Gracias según contrato)`);
        doc.text(`Período: ${datos.inicio || 'N/A'} — ${datos.cierre || 'N/A'}`);
        doc.text(`Estatus: Finalizado`);
        doc.moveDown(1);

        doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.dark).text('Detalle de cuotas pagadas');
        doc.moveDown(0.3);
        cuotas.forEach((c) => {
          doc.font('Helvetica').fontSize(9).fillColor(colors.light)
            .text(
              `#${c.num_cuota || c.numero} · ${c.tipo_cuota || 'Obligatoria'} · ` +
                `${c.monto_cuota || c.monto} · venc. ${c.fecha_hasta || '-'} · ` +
                `pagada ${c.fecha_pagada || '-'} · ${c.estado_cuota || c.estado}`
            );
        });

        doc.moveDown(2);
        doc.font('Helvetica').fontSize(9).fillColor(colors.light)
          .text(`Emitido el ${new Date().toLocaleString('es-VE')}`, { align: 'center' });
        doc.moveDown(2);
        const nombrePres = datos.presidente_nombre || 'Presidente(a) — IADEY';
        doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.dark)
          .text('_______________________________', { align: 'center' });
        doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.dark)
          .text(nombrePres, { align: 'center' });
        doc.font('Helvetica').fontSize(9).fillColor(colors.light)
          .text('Presidente(a) — Instituto Autónomo de Desarrollo Económico de Yaracuy (IADEY)', {
            align: 'center',
          });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /** Obtiene el nombre del Presidente(a) ACTIVO */
  static async obtenerNombrePresidente(pool) {
    try {
      const r = await pool.query(
        `SELECT TRIM(CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,''))) AS nombre
         FROM usuario u
         JOIN roles r ON r.id_rol = u.id_rol_usu
         LEFT JOIN persona p ON p.cedula = u.cedula_usuario
         WHERE LOWER(TRIM(r.nombre_rol)) LIKE '%presid%'
           AND LOWER(TRIM(COALESCE(u.estatus, ''))) = 'activo'
         ORDER BY u.id ASC
         LIMIT 1`
      );
      const nombre = (r.rows[0]?.nombre || '').trim();
      return nombre || null;
    } catch (_) {
      return null;
    }
  }

  /** Datos completos del Presidente(a) activo */
  static async obtenerPresidenteActivo(pool) {
    try {
      const r = await pool.query(
        `SELECT u.id, u.cedula_usuario, u.estatus,
                TRIM(CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,''))) AS nombre,
                p.nombres, p.apellidos, p.correo, p.telefono, r.nombre_rol
         FROM usuario u
         JOIN roles r ON r.id_rol = u.id_rol_usu
         LEFT JOIN persona p ON p.cedula = u.cedula_usuario
         WHERE LOWER(TRIM(r.nombre_rol)) LIKE '%presid%'
           AND LOWER(TRIM(COALESCE(u.estatus, ''))) = 'activo'
         ORDER BY u.id ASC
         LIMIT 1`
      );
      return r.rows[0] || null;
    } catch (_) {
      return null;
    }
  }

  /** Informe PDF de inspección (agrícola o industria/comercio) */
  static async generarPDFInformeInspeccion(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];
        doc.on('data', (c) => buffers.push(c));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const colors = {
          primary: '#264653',
          secondary: '#2A9D8F',
          text: '#333333',
          light: '#666666',
        };

        const fmt = (v) =>
          v === null || v === undefined || v === '' ? '—' : String(v);
        const money = (v) => {
          const n = parseFloat(v);
          if (Number.isNaN(n)) return null;
          return `$${n.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
        };
        const boolTxt = (v) =>
          v === true || v === 't' || v === 1 || v === '1'
            ? 'Sí'
            : v === false || v === 'f' || v === 0 || v === '0'
              ? 'No'
              : null;

        const ensureSpace = (needed = 80) => {
          if (doc.y + needed > doc.page.height - 60) doc.addPage();
        };

        const section = (title) => {
          ensureSpace(60);
          doc.moveDown(0.6);
          doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.primary).text(title, { underline: true });
          doc.moveDown(0.35);
          doc.font('Helvetica').fontSize(9).fillColor(colors.text);
        };

        const kv = (label, value, { skipEmpty = false } = {}) => {
          const shown = value === null || value === undefined || value === '' ? '—' : String(value);
          if (skipEmpty && (value === null || value === undefined || value === '')) return;
          ensureSpace(24);
          doc.font('Helvetica').fontSize(9).fillColor(colors.text)
            .text(`${label}: ${shown}`);
        };

        const linesFromRows = (rows, mapper) => {
          if (!rows?.length) {
            doc.font('Helvetica').fontSize(9).fillColor(colors.light).text('Sin registros.');
            return;
          }
          rows.forEach((row, i) => {
            ensureSpace(20);
            doc.font('Helvetica').fontSize(9).fillColor(colors.text)
              .text(`${i + 1}. ${mapper(row)}`);
          });
        };

        drawMembretePdfKit(doc, { titulo: 'INFORME DE INSPECCIÓN' });
        doc.font('Helvetica').fontSize(9).fillColor(colors.light)
          .text(`Generado: ${new Date().toLocaleString('es-VE')}`, { align: 'center' });
        doc.moveDown(0.5);

        section('1. Datos generales');
        kv('ID inspección', data.id_inspeccion);
        kv('Código expediente', data.codigo_expediente || `EXP-${data.id_codigo_exp}`);
        kv('Estatus', data.estatus_inspeccion);
        kv('Sector / Actividad', `${fmt(data.sector) || '—'} / ${fmt(data.actividad) || '—'}`);
        kv('Emprendimiento', data.nombre_emprendimiento);
        kv('Emprendedor', data.nombre_emprendedor);
        kv('Cédula', data.cedula_emprendedor);
        kv('Teléfono', data.telefono);
        kv('Correo', data.correo);
        kv('Dirección', data.direccion_empredimiento);
        kv('Años de experiencia', data.anos_experiencia);
        kv('Monto solicitado', money(data.monto_solicitado));
        kv('Fecha creación', data.created_at ? new Date(data.created_at).toLocaleString('es-VE') : null);

        const esAgricola = Boolean(data.unidad_produccion) ||
          String(data.sector || '').toLowerCase().includes('agric');

        if (esAgricola) {
          section('2. Unidad de producción');
          const up = data.unidad_produccion || {};
          kv('Ubicación práctica', up.ubicacion_practica);
          kv('Vías de acceso', up.vias_acceso);
          kv('Tenencia', up.tenencia);
          kv('Otro tenencia', up.otro_tenencia);
          kv('Vive en la unidad', boolTxt(up.vive_en_unidad_produccion));
          if (up.linderos) {
            kv('Lindero N', up.linderos.norte);
            kv('Lindero E', up.linderos.este);
            kv('Lindero S', up.linderos.sur);
            kv('Lindero O', up.linderos.oeste);
          }

          section('3. Condiciones de la explotación');
          const adm = data.condiciones_explotacion?.administracion || {};
          kv('Tipo administración', adm.tipo);
          kv('Administrador', adm.nombre_administrador);
          kv('Experiencia (años)', adm.experiencia_anos);
          kv('Registro físico', boolTxt(adm.lleva_registro_fisico));
          kv('Registro económico', boolTxt(adm.lleva_registro_economico));
          kv('Observaciones', adm.observaciones);
          doc.moveDown(0.3);
          doc.font('Helvetica-Bold').fontSize(9).text('Personal:');
          linesFromRows(data.condiciones_explotacion?.personal || [], (p) =>
            `${fmt(p.cargo)} — fijos: ${fmt(p.fijos)}, eventuales: ${fmt(p.eventuales)}, familiar: ${boolTxt(p.familiar)}`
          );

          section('4. Uso actual de la tierra');
          doc.font('Helvetica-Bold').fontSize(9).text('Agricultura:');
          linesFromRows(data.uso_actual_tierra?.agricultura || [], (r) =>
            `${fmt(r.cultivo)} — ${fmt(r.superficie_ha)} ha`
          );
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fontSize(9).text('Pecuario:');
          linesFromRows(data.uso_actual_tierra?.pecuario || [], (r) =>
            `${fmt(r.tipo)} — ${fmt(r.superficie_ha)} ha`
          );
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fontSize(9).text('Otros:');
          linesFromRows(data.uso_actual_tierra?.otros || [], (r) =>
            `${fmt(r.descripcion)} — ${fmt(r.superficie_ha)} ha`
          );

          section('5. Infraestructura y maquinaria');
          const infra = data.infraestructura || {};
          ['vivienda', 'deposito_insumos', 'galpon', 'establo', 'corral', 'otro'].forEach((k) => {
            if (infra[k] !== undefined) kv(k.replace(/_/g, ' '), boolTxt(infra[k]));
          });
          if (infra.aguas) {
            kv('Agua — pozo', boolTxt(infra.aguas.pozo));
            kv('Agua — riego', boolTxt(infra.aguas.riego));
            kv('Agua — acueducto', boolTxt(infra.aguas.acueducto));
            kv('Agua — río/quebrada', boolTxt(infra.aguas.rio_quebrada));
          }
          doc.moveDown(0.2);
          doc.font('Helvetica-Bold').fontSize(9).text('Maquinaria/equipo:');
          linesFromRows(data.maquinaria_equipo || [], (m) =>
            `[${fmt(m.tipo)}] ${fmt(m.descripcion)} x${fmt(m.cantidad)} — estado: ${fmt(m.estado)} — ${money(m.precio_unitario)}`
          );

          section('6. Producción');
          linesFromRows(data.produccion?.tipo_explotacion || [], (r) => `Tipo: ${fmt(r.tipo)}`);
          linesFromRows(data.produccion?.produccion_ultimos_2_anos || [], (r) =>
            `${fmt(r.rubro)} (${fmt(r.ano)}): ${fmt(r.cantidad)} — Bs ${fmt(r.valor_bs)}`
          );

          if (data.practicas_agronomicas) {
            section('7. Prácticas agronómicas');
            Object.entries(data.practicas_agronomicas)
              .filter(([k]) => !['id', 'inspeccion_id', 'created_at', 'updated_at'].includes(k))
              .forEach(([k, v]) => kv(k.replace(/_/g, ' '), v));
          }

          if (data.servicios) {
            section('8. Servicios');
            Object.entries(data.servicios)
              .filter(([k]) => !['id', 'inspeccion_id', 'created_at', 'updated_at'].includes(k))
              .forEach(([k, v]) => kv(k.replace(/_/g, ' '), v));
          }

          if (data.costos_produccion) {
            section('9. Costos de producción');
            Object.entries(data.costos_produccion)
              .filter(([k]) => !['id', 'inspeccion_id', 'rubros', 'created_at', 'updated_at'].includes(k))
              .forEach(([k, v]) => kv(k.replace(/_/g, ' '), v));
            linesFromRows(data.costos_produccion.rubros || [], (r) =>
              `${fmt(r.rubro || r.descripcion)}: ${money(r.monto ?? r.valor ?? r.total)}`
            );
          }

          if (data.financieros?.flujo_caja) {
            section('10. Financieros / Flujo de caja');
            Object.entries(data.financieros.flujo_caja)
              .filter(([k]) => !['id', 'inspeccion_id', 'created_at', 'updated_at'].includes(k))
              .forEach(([k, v]) => kv(k.replace(/_/g, ' '), v));
            if (data.financieros.rentabilidad_estatica != null) {
              kv('Rentabilidad estática', data.financieros.rentabilidad_estatica);
            }
          }

          if (data.credito) {
            section('11. Crédito');
            Object.entries(data.credito)
              .filter(([k]) => !['id', 'inspeccion_id', 'created_at', 'updated_at'].includes(k))
              .forEach(([k, v]) => kv(k.replace(/_/g, ' '), typeof v === 'boolean' ? boolTxt(v) : v));
          }

          if (data.anexos) {
            section('12. Anexos');
            Object.entries(data.anexos)
              .filter(([k]) => !['id', 'inspeccion_id', 'fotografias', 'created_at', 'updated_at'].includes(k))
              .forEach(([k, v]) => kv(k.replace(/_/g, ' '), typeof v === 'boolean' ? boolTxt(v) : v));
            const fotos = data.anexos.fotografias || [];
            if (fotos.length) kv('Fotografías registradas', fotos.length);
          }
        } else {
          if (data.estudio_mercado) {
            section('2. Estudio de mercado');
            kv('Descripción producto/servicio', data.estudio_mercado.descripcion_producto);
            kv('Proceso productivo', data.estudio_mercado.descripcion_proceso);
            kv('Usuarios/clientes', data.estudio_mercado.usuarios);
            doc.moveDown(0.2);
            doc.font('Helvetica-Bold').fontSize(9).text('Producción mensual:');
            linesFromRows(data.estudio_mercado.productos || [], (p) =>
              `${fmt(p.descripcion_producto)} — ${fmt(p.cantidad)} ${fmt(p.unidad_medida)} — costo ${money(p.costo_produccion_usd)}`
            );
            doc.moveDown(0.2);
            doc.font('Helvetica-Bold').fontSize(9).text('Ventas estimadas:');
            linesFromRows(data.estudio_mercado.ventas || [], (v) =>
              `${fmt(v.descripcion_producto)} — ${fmt(v.cantidad)} ${fmt(v.unidad_medida)} — ${money(v.precio_venta_usd)}`
            );
            doc.moveDown(0.2);
            doc.font('Helvetica-Bold').fontSize(9).text('Materia prima:');
            linesFromRows(data.estudio_mercado.materia_prima || [], (m) =>
              `${fmt(m.descripcion)} — ${fmt(m.cantidad)} ${fmt(m.unidad_medida)} — ${money(m.precio_compra_usd)}`
            );
          }

          if (data.aspectos_tecnicos) {
            section('3. Aspectos técnicos');
            kv('Descripción del local', data.aspectos_tecnicos.descripcion_local);
            kv('Tenencia', data.aspectos_tecnicos.tenencia_local);
            doc.moveDown(0.2);
            doc.font('Helvetica-Bold').fontSize(9).text('Maquinaria existente:');
            linesFromRows(data.aspectos_tecnicos.maquinaria_existente || [], (m) =>
              `${fmt(m.descripcion)} x${fmt(m.cantidad)} — ${money(m.total_usd)}`
            );
            doc.moveDown(0.2);
            doc.font('Helvetica-Bold').fontSize(9).text('Maquinaria solicitada:');
            linesFromRows(data.aspectos_tecnicos.maquinaria_solicitada || [], (m) =>
              `${fmt(m.descripcion)} x${fmt(m.cantidad)} — ${money(m.total_usd)}`
            );
            doc.moveDown(0.2);
            doc.font('Helvetica-Bold').fontSize(9).text('Recurso humano:');
            linesFromRows(data.aspectos_tecnicos.recurso_humano || [], (r) =>
              `${fmt(r.tipo_trabajador)} x${fmt(r.cantidad)} — ${money(r.salario_mensual_usd)}`
            );
          }

          section('4. Gastos mensuales');
          linesFromRows(data.gastos_mensuales || [], (g) =>
            `${fmt(g.concepto)} — actual ${money(g.monto_actual_usd)} / futuro ${money(g.monto_futuro_usd)}`
          );

          section('5. Plan de inversión');
          linesFromRows(data.plan_inversion || [], (p) =>
            `${fmt(p.concepto)} — aportes ${money(p.aportes_propios_usd)} / solicitado ${money(p.monto_solicitado_usd)}`
          );

          if (data.organizacion_comunidad) {
            section('6. Organización comunitaria');
            kv('Tipo organización', data.organizacion_comunidad.tipo_organizacion);
            kv('Necesidades', data.organizacion_comunidad.necesidades_comunidad);
          }
          if (data.aporte_comunidad) {
            kv('Realiza aporte', boolTxt(data.aporte_comunidad.realiza_aporte));
            kv('Descripción aporte', data.aporte_comunidad.descripcion_aporte);
          }
          if (data.garantia) {
            kv('Garantía', data.garantia.tipo_garantia);
          }
        }

        ensureSpace(100);
        doc.moveDown(2);
        doc.font('Helvetica').fontSize(9).fillColor(colors.light)
          .text('Documento generado automáticamente por el sistema IADEY.', { align: 'center' });
        doc.moveDown(1.5);
        const nombrePres = data.presidente_nombre || 'Presidente(a) — IADEY';
        doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.primary)
          .text('_______________________________', { align: 'center' });
        doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.primary)
          .text(nombrePres, { align: 'center' });
        doc.font('Helvetica').fontSize(9).fillColor(colors.light)
          .text('Presidente(a) — Instituto Autónomo de Desarrollo Económico de Yaracuy (IADEY)', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

}

module.exports = PDFService;
