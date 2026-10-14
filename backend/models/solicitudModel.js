// models/SolicitudModel.js
const pool = require('../config/db');

class SolicitudModel {

  // Obtener solo solicitudes aprobadas
  static async getAprobadas() {
    const result = await pool.query(`
      SELECT 
        s.*, 
        p.nombres,
        p.apellidos,
        CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo,
        p.telefono,
        p.correo,
        p.direccion,
        p.estado as estado_persona,
        p.municipio,
        p.parroquia,
        p.tipo_persona,
        e.id_emprendimiento,
        e.nombre_emprendimiento,
        e.direccion_empredimiento,
        e.anos_experiencia,
        e.id_clasificacion,
        c.sector,
        c.actividad
      FROM solicitud s
      INNER JOIN persona p ON s.cedula_persona = p.cedula
      LEFT JOIN emprendimiento e ON s.id_solicitud = e.id_solicitud
      LEFT JOIN clasificacion_emprendimiento c ON e.id_clasificacion = c.id_clasificacion
      WHERE s.estatus IN ('Recibido', 'Pre-Aprobado')
      ORDER BY s.id_solicitud DESC
    `);
    return result.rows;
  }
  
  // Obtener todas las solicitudes con datos completos
  static async getAll() {
    const sqlConInspector = `
      SELECT 
        s.*, 
        p.nombres,
        p.apellidos,
        CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo,
        p.telefono,
        p.correo,
        p.direccion,
        p.estado as estado_persona,
        p.municipio,
        p.parroquia,
        p.tipo_persona,
        e.id_emprendimiento,
        e.nombre_emprendimiento,
        e.direccion_empredimiento,
        e.anos_experiencia,
        e.id_clasificacion,
        c.sector,
        c.actividad,
        CONCAT(pi.nombres, ' ', pi.apellidos) AS inspector_nombre,
        ui.cedula_usuario AS inspector_cedula
      FROM solicitud s
      INNER JOIN persona p ON s.cedula_persona = p.cedula
      LEFT JOIN emprendimiento e ON s.id_solicitud = e.id_solicitud
      LEFT JOIN clasificacion_emprendimiento c ON e.id_clasificacion = c.id_clasificacion
      LEFT JOIN usuario ui ON ui.id = s.id_inspector
      LEFT JOIN persona pi ON pi.cedula = ui.cedula_usuario
      ORDER BY s.id_solicitud DESC
    `;

    const sqlSinInspector = `
      SELECT 
        s.*, 
        p.nombres,
        p.apellidos,
        CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo,
        p.telefono,
        p.correo,
        p.direccion,
        p.estado as estado_persona,
        p.municipio,
        p.parroquia,
        p.tipo_persona,
        e.id_emprendimiento,
        e.nombre_emprendimiento,
        e.direccion_empredimiento,
        e.anos_experiencia,
        e.id_clasificacion,
        c.sector,
        c.actividad,
        NULL::text AS inspector_nombre,
        NULL::text AS inspector_cedula
      FROM solicitud s
      INNER JOIN persona p ON s.cedula_persona = p.cedula
      LEFT JOIN emprendimiento e ON s.id_solicitud = e.id_solicitud
      LEFT JOIN clasificacion_emprendimiento c ON e.id_clasificacion = c.id_clasificacion
      ORDER BY s.id_solicitud DESC
    `;

    try {
      const result = await pool.query(sqlConInspector);
      return result.rows;
    } catch (error) {
      // Si falta la columna id_inspector (migración no aplicada), usar consulta compatible
      const msg = String(error?.message || '');
      if (
        error?.code === '42703' ||
        msg.includes('id_inspector') ||
        msg.includes('does not exist')
      ) {
        console.warn(
          '⚠️ getAll: fallback sin id_inspector (aplica migración solicitud_inspector_citas.sql):',
          msg
        );
        const result = await pool.query(sqlSinInspector);
        return result.rows;
      }
      throw error;
    }
  }

  // Obtener solicitudes por cédula de persona - CORREGIDO
  static async getByCedula(cedula_persona) {
    // Asegurar que la cédula sea string
    const cedula = String(cedula_persona).trim();
    if (!cedula) {
      throw new Error('Cédula no proporcionada');
    }
    
    const result = await pool.query(`
      SELECT 
        s.*,
        p.nombres,
        p.apellidos,
        CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo,
        p.telefono,
        p.correo,
        p.direccion,
        e.id_emprendimiento,
        e.nombre_emprendimiento,
        e.direccion_empredimiento,
        e.anos_experiencia,
        e.id_clasificacion,
        c.sector,
        c.actividad
      FROM solicitud s
      INNER JOIN persona p ON s.cedula_persona = p.cedula
      LEFT JOIN emprendimiento e ON s.id_solicitud = e.id_solicitud
      LEFT JOIN clasificacion_emprendimiento c ON e.id_clasificacion = c.id_clasificacion
      WHERE s.cedula_persona = $1
      ORDER BY s.id_solicitud DESC
    `, [cedula]);
    return result.rows;
  }

  static async getById(id_solicitud) {
    const query = `
      SELECT 
        s.id_solicitud,
        s.cedula_persona,
        s.solicitud as motivo_solicitud,
        s.monto_solicitado,
        s.fecha_solicitud,
        s.estatus,
        s.motivo_rechazo,
        s.created_at
      FROM solicitud s
      WHERE s.id_solicitud = $1
    `;
    
    try {
      const result = await pool.query(query, [id_solicitud]);
      console.log(`✅ Solicitud encontrada por ID ${id_solicitud}:`, result.rows[0] ? 'Sí' : 'No');
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error en SolicitudModel.getById:', error);
      throw error;
    }
  }

  static digitsCedula(cedula) {
    return String(cedula || '').replace(/\D/g, '');
  }

  /**
   * Un emprendedor no puede pedir otro crédito si tiene
   * una solicitud en trámite o un contrato activo.
   */
  static async evaluarNuevaSolicitud(cedula_persona) {
    const digits = this.digitsCedula(cedula_persona);
    if (!digits) {
      return { puede: false, motivo: 'Cédula no proporcionada' };
    }

    let result;
    try {
      result = await pool.query(
        `
        SELECT
          s.id_solicitud,
          s.estatus AS estatus_solicitud,
          c.id_contrato,
          c.estatus AS estatus_contrato,
          cb.id_credito_banco,
          cb.estatus AS estatus_banco
        FROM solicitud s
        LEFT JOIN expediente e ON e.id_solicitud = s.id_solicitud
        LEFT JOIN aprobacion a ON a.id_expediente = e.id_expediente
        LEFT JOIN contrato c ON c.id_aprob = a.id_aprobacion
        LEFT JOIN credito_banco cb ON cb.id_aprobacion = a.id_aprobacion
        WHERE regexp_replace(COALESCE(s.cedula_persona, ''), '[^0-9]', '', 'g') = $1
        `,
        [digits]
      );
    } catch (error) {
      result = await pool.query(
        `
        SELECT
          s.id_solicitud,
          s.estatus AS estatus_solicitud,
          c.id_contrato,
          c.estatus AS estatus_contrato,
          NULL::int AS id_credito_banco,
          NULL::text AS estatus_banco
        FROM solicitud s
        LEFT JOIN expediente e ON e.id_solicitud = s.id_solicitud
        LEFT JOIN aprobacion a ON a.id_expediente = e.id_expediente
        LEFT JOIN contrato c ON c.id_aprob = a.id_aprobacion
        WHERE regexp_replace(COALESCE(s.cedula_persona, ''), '[^0-9]', '', 'g') = $1
        `,
        [digits]
      );
    }

    const cerrado = (estatus) => {
      const e = String(estatus || '').toLowerCase().trim();
      return ['finalizado', 'cancelado', 'cancelada', 'rechazado'].includes(e);
    };

    const contratoActivo = result.rows.find((r) => r.id_contrato && !cerrado(r.estatus_contrato));
    if (contratoActivo) {
      return {
        puede: false,
        motivo:
          'Tiene un contrato activo. No puede solicitar otro crédito hasta que el actual finalice o se cancele.',
      };
    }

    const solicitudAbierta = result.rows.find((r) => {
      const est = String(r.estatus_solicitud || '').toLowerCase().trim();
      if (!est || cerrado(est)) return false;
      if (r.id_contrato && cerrado(r.estatus_contrato)) return false;
      if (r.id_credito_banco && cerrado(r.estatus_banco)) return false;
      return true;
    });

    if (solicitudAbierta) {
      return {
        puede: false,
        motivo:
          'Ya tiene una solicitud de crédito en trámite. No puede registrar otra hasta que se rechace o se cierre el crédito.',
      };
    }

    return { puede: true, motivo: null };
  }

  // Crear nueva solicitud
  static async create(data) {
    const { cedula_persona, solicitud, fecha_solicitud, monto_solicitado, estatus } = data;
    
    const result = await pool.query(
      `INSERT INTO solicitud (cedula_persona, solicitud, fecha_solicitud, monto_solicitado, estatus)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cedula_persona, solicitud, fecha_solicitud, monto_solicitado, estatus || 'Pendiente']
    );
    return result.rows[0];
  }

  // Actualizar solicitud
  static async update(id_solicitud, data) {
    const id = parseInt(id_solicitud);
    if (isNaN(id)) {
      throw new Error('ID de solicitud inválido');
    }
    
    const { solicitud, fecha_solicitud, monto_solicitado } = data;
    
    const result = await pool.query(
      `UPDATE solicitud SET
        solicitud = COALESCE($1, solicitud),
        fecha_solicitud = COALESCE($2, fecha_solicitud),
        monto_solicitado = COALESCE($3, monto_solicitado),
        updated_at = CURRENT_TIMESTAMP
      WHERE id_solicitud = $4
      RETURNING *`,
      [solicitud, fecha_solicitud, monto_solicitado, id]
    );
    return result.rows[0];
  }

  // Cambiar estatus de solicitud - CORREGIDO
  static async cambiarEstatus(id_solicitud, estatus, motivo_rechazo = null, id_inspector = null) {
    const id = parseInt(id_solicitud);
    if (isNaN(id)) {
      throw new Error('ID de solicitud inválido');
    }
    
    // Validar que el estatus sea válido
    const estatusPermitidos = [
      'Pendiente',
      'Recibido',
      'Pre-Aprobado',
      'Rechazado',
      'Incompleto',
      'Aprobado'
    ];
    if (!estatusPermitidos.includes(estatus)) {
      throw new Error(
        'Estatus no válido. Los valores permitidos son: Pendiente, Recibido, Rechazado, Incompleto, Aprobado'
      );
    }

    const inspectorId =
      id_inspector !== null && id_inspector !== undefined && id_inspector !== ''
        ? parseInt(id_inspector, 10)
        : null;
    
    const result = await pool.query(
      `UPDATE solicitud SET
        estatus = $1,
        motivo_rechazo = $2,
        id_inspector = COALESCE($4, id_inspector),
        updated_at = CURRENT_TIMESTAMP
      WHERE id_solicitud = $3
      RETURNING *`,
      [estatus, motivo_rechazo, id, Number.isNaN(inspectorId) ? null : inspectorId]
    );
    return result.rows[0];
  }

  /** Asignar / actualizar inspector de la solicitud */
  static async asignarInspector(id_solicitud, id_inspector) {
    const id = parseInt(id_solicitud, 10);
    const insp = parseInt(id_inspector, 10);
    if (isNaN(id) || isNaN(insp)) {
      throw new Error('ID de solicitud o inspector inválido');
    }
    const result = await pool.query(
      `UPDATE solicitud SET
        id_inspector = $1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id_solicitud = $2
       RETURNING *`,
      [insp, id]
    );
    return result.rows[0];
  }

  // Eliminar solicitud
  static async delete(id_solicitud) {
    const id = parseInt(id_solicitud);
    if (isNaN(id)) {
      throw new Error('ID de solicitud inválido');
    }
    
    const result = await pool.query(
      'DELETE FROM solicitud WHERE id_solicitud = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Obtener solicitudes por estatus
  static async getByEstatus(estatus) {
    const result = await pool.query(
      `SELECT 
        s.*, 
        p.nombres,
        p.apellidos,
        CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo,
        e.nombre_emprendimiento
      FROM solicitud s
      INNER JOIN persona p ON s.cedula_persona = p.cedula
      LEFT JOIN emprendimiento e ON s.id_solicitud = e.id_solicitud
      WHERE s.estatus = $1
      ORDER BY s.id_solicitud DESC`,
      [estatus]
    );
    return result.rows;
  }
}

module.exports = SolicitudModel;