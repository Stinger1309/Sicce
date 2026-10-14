const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const exportService = require('../services/exportService');
const { registrarAuditoria, obtenerUsuarioDesdeRequest, obtenerIp } = require('../services/auditoriaService');
const { puedeVerMetricasOExportar } = require('../utils/accesoStaff');

/**
 * Configuración de módulos exportables: query + columnas.
 */
const MODULOS_EXPORT = {
  solicitudes: {
    titulo: 'Solicitudes de Crédito',
    query: `
      SELECT s.id_solicitud, s.cedula_persona, CONCAT(p.nombres,' ',p.apellidos) AS nombre,
             s.monto_solicitado, s.fecha_solicitud, s.estatus, s.motivo_rechazo, s.created_at
      FROM solicitud s
      LEFT JOIN persona p ON s.cedula_persona = p.cedula
      ORDER BY s.id_solicitud DESC
    `,
    columns: [
      { key: 'id_solicitud', label: 'ID' },
      { key: 'cedula_persona', label: 'Cédula' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'monto_solicitado', label: 'Monto' },
      { key: 'fecha_solicitud', label: 'Fecha' },
      { key: 'estatus', label: 'Estatus' },
      { key: 'motivo_rechazo', label: 'Motivo rechazo' }
    ]
  },
  expedientes: {
    titulo: 'Expedientes',
    query: `
      SELECT e.id_expediente, e.codigo_expediente, e.estatus, e.observaciones, e.created_at,
             s.cedula_persona, CONCAT(p.nombres,' ',p.apellidos) AS nombre
      FROM expediente e
      LEFT JOIN solicitud s ON e.id_solicitud = s.id_solicitud
      LEFT JOIN persona p ON s.cedula_persona = p.cedula
      ORDER BY e.id_expediente DESC
    `,
    columns: [
      { key: 'id_expediente', label: 'ID' },
      { key: 'codigo_expediente', label: 'Código' },
      { key: 'cedula_persona', label: 'Cédula' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'estatus', label: 'Estatus' },
      { key: 'observaciones', label: 'Observaciones' },
      { key: 'created_at', label: 'Fecha' }
    ]
  },
  inspecciones: {
    titulo: 'Inspecciones',
    query: `
      SELECT i.id_inspeccion, i.estatus_inspeccion, i.created_at,
             e.codigo_expediente
      FROM inspeccion i
      LEFT JOIN expediente e ON i.id_codigo_exp = e.id_expediente
      ORDER BY i.id_inspeccion DESC
    `,
    columns: [
      { key: 'id_inspeccion', label: 'ID' },
      { key: 'codigo_expediente', label: 'Expediente' },
      { key: 'estatus_inspeccion', label: 'Estatus' },
      { key: 'created_at', label: 'Fecha' }
    ]
  },
  aprobaciones: {
    titulo: 'Aprobaciones',
    query: `
      SELECT a.id_aprobacion, a.cedula_persona_id, a.estatus_aprobacion,
             a.seleccion_manejo, a.opbervaciones, a.created_at,
             e.codigo_expediente
      FROM aprobacion a
      LEFT JOIN expediente e ON a.id_expediente = e.id_expediente
      ORDER BY a.id_aprobacion DESC
    `,
    columns: [
      { key: 'id_aprobacion', label: 'ID' },
      { key: 'codigo_expediente', label: 'Expediente' },
      { key: 'cedula_persona_id', label: 'Cédula' },
      { key: 'estatus_aprobacion', label: 'Estatus' },
      { key: 'seleccion_manejo', label: 'Manejo' },
      { key: 'opbervaciones', label: 'Observaciones' },
      { key: 'created_at', label: 'Fecha' }
    ]
  },
  contratos: {
    titulo: 'Contratos',
    query: `SELECT * FROM contrato ORDER BY 1 DESC`,
    columns: null
  },
  desembolsos: {
    titulo: 'Desembolsos',
    query: `SELECT * FROM desembolso ORDER BY 1 DESC`,
    columns: null
  },
  cuotas: {
    titulo: 'Pagos de Cuota',
    query: `SELECT * FROM cuota ORDER BY 1 DESC`,
    columns: null
  },
  usuarios: {
    titulo: 'Usuarios',
    query: `
      SELECT u.id, u.cedula_usuario, CONCAT(p.nombres,' ',p.apellidos) AS nombre,
             p.correo, r.nombre_rol, u.estatus, u.ultimo_acceso, u.created_at
      FROM usuario u
      LEFT JOIN persona p ON u.cedula_usuario = p.cedula
      LEFT JOIN roles r ON u.id_rol_usu = r.id_rol
      ORDER BY u.id
    `,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'cedula_usuario', label: 'Cédula' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'correo', label: 'Correo' },
      { key: 'nombre_rol', label: 'Rol' },
      { key: 'estatus', label: 'Estatus' },
      { key: 'ultimo_acceso', label: 'Último acceso' }
    ]
  },
  roles: {
    titulo: 'Roles',
    query: `SELECT id_rol, nombre_rol, created_at FROM roles ORDER BY id_rol`,
    columns: [
      { key: 'id_rol', label: 'ID' },
      { key: 'nombre_rol', label: 'Nombre' },
      { key: 'created_at', label: 'Creado' }
    ]
  },
  requisitos: {
    titulo: 'Requisitos',
    query: `SELECT id_requisitos, nombre_requisito, created_at FROM requisitos ORDER BY id_requisitos`,
    columns: [
      { key: 'id_requisitos', label: 'ID' },
      { key: 'nombre_requisito', label: 'Requisito' },
      { key: 'created_at', label: 'Creado' }
    ]
  },
  emprendimientos: {
    titulo: 'Clasificación de Emprendimientos',
    query: `SELECT id_clasificacion, sector, actividad, n_ins_asig, created_at FROM clasificacion_emprendimiento ORDER BY id_clasificacion`,
    columns: [
      { key: 'id_clasificacion', label: 'ID' },
      { key: 'sector', label: 'Sector' },
      { key: 'actividad', label: 'Actividad' },
      { key: 'n_ins_asig', label: 'N° Inspecciones' },
      { key: 'created_at', label: 'Creado' }
    ]
  },
  auditoria: {
    titulo: 'Auditoría',
    query: `
      SELECT id_auditoria, created_at, usuario_nombre, modulo, accion, descripcion,
             tabla_afectada, registro_id, ip_address
      FROM auditoria ORDER BY created_at DESC LIMIT 5000
    `,
    columns: [
      { key: 'id_auditoria', label: 'ID' },
      { key: 'created_at', label: 'Fecha' },
      { key: 'usuario_nombre', label: 'Usuario' },
      { key: 'modulo', label: 'Módulo' },
      { key: 'accion', label: 'Acción' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'ip_address', label: 'IP' }
    ]
  }
};

function columnasDesdeFilas(rows) {
  if (!rows.length) return [{ key: 'info', label: 'Info' }];
  return Object.keys(rows[0]).map(key => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }));
}

router.get('/modulos', (req, res) => {
  res.json({
    success: true,
    data: Object.keys(MODULOS_EXPORT).map(key => ({
      id: key,
      titulo: MODULOS_EXPORT[key].titulo
    }))
  });
});

router.get('/:modulo', async (req, res) => {
  try {
    const autorizado = await puedeVerMetricasOExportar(req);
    if (!autorizado) {
      return res.status(403).json({
        success: false,
        error: 'Solo el presidente y el administrador pueden exportar',
      });
    }

    const { modulo } = req.params;
    const formato = (req.query.formato || 'excel').toLowerCase();
    const config = MODULOS_EXPORT[modulo];

    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Módulo "${modulo}" no disponible para exportar`,
        disponibles: Object.keys(MODULOS_EXPORT)
      });
    }

    let rows = [];
    try {
      const result = await pool.query(config.query);
      rows = result.rows;
    } catch (dbError) {
      // Tabla puede no existir aún (ej. contrato/desembolso/cuota)
      console.warn(`Export ${modulo}:`, dbError.message);
      return res.status(400).json({
        success: false,
        error: `No se pudo obtener datos de ${modulo}: ${dbError.message}`
      });
    }

    const columns = config.columns || columnasDesdeFilas(rows);
    const usuario = obtenerUsuarioDesdeRequest(req);

    await registrarAuditoria({
      ...usuario,
      modulo: config.titulo,
      accion: 'exportar',
      descripcion: `Exportación ${formato.toUpperCase()} de ${config.titulo} (${rows.length} registros)`,
      ip_address: obtenerIp(req),
      user_agent: req.headers['user-agent']
    });

    if (formato === 'pdf') {
      const buffer = await exportService.generarPDF({
        titulo: config.titulo,
        subtitulo: `IADEY — ${new Date().toLocaleString('es-VE')} — ${rows.length} registros`,
        columns,
        rows
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${modulo}_${Date.now()}.pdf`);
      return res.send(buffer);
    }

    const buffer = await exportService.generarExcel({
      titulo: config.titulo,
      sheetName: config.titulo.substring(0, 31),
      columns,
      rows
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${modulo}_${Date.now()}.xlsx`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error en export:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Exportar datos enviados desde el frontend (vista filtrada actual).
 */
router.post('/datos', async (req, res) => {
  try {
    const autorizado = await puedeVerMetricasOExportar(req);
    if (!autorizado) {
      return res.status(403).json({
        success: false,
        error: 'Solo el presidente y el administrador pueden exportar',
      });
    }

    const { titulo = 'Reporte', formato = 'excel', columns = [], rows = [] } = req.body;

    if (!Array.isArray(columns) || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, error: 'columns y rows son requeridos' });
    }

    const usuario = obtenerUsuarioDesdeRequest(req);
    await registrarAuditoria({
      ...usuario,
      modulo: titulo,
      accion: 'exportar',
      descripcion: `Exportación ${String(formato).toUpperCase()} de ${titulo} (${rows.length} registros)`,
      ip_address: obtenerIp(req),
      user_agent: req.headers['user-agent']
    });

    if (String(formato).toLowerCase() === 'pdf') {
      const buffer = await exportService.generarPDF({
        titulo,
        subtitulo: `IADEY — ${new Date().toLocaleString('es-VE')}`,
        columns,
        rows
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_${Date.now()}.pdf`);
      return res.send(buffer);
    }

    const buffer = await exportService.generarExcel({
      titulo,
      sheetName: String(titulo).substring(0, 31),
      columns,
      rows
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${Date.now()}.xlsx`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error en export/datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
