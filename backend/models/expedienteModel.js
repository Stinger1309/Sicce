const pool = require('../config/db');
const CitaModel = require('./citaModel');

class ExpedienteModel {

  // Obtener solo solicitudes aprobadas con sus datos Y expediente si existe
  static async getSolAprobadasExp() {
    const query = `
      SELECT 
        s.id_solicitud,
        s.cedula_persona,
        s.solicitud as motivo_solicitud,
        s.monto_solicitado,
        s.fecha_solicitud,
        s.estatus,
        s.motivo_rechazo,
        s.created_at as solicitud_creada,
        s.id_inspector AS solicitud_id_inspector,
        p.cedula as cedula_persona_numero,
        p.nombres,
        p.apellidos,
        p.telefono,
        p.direccion,
        p.estado as estado_persona,
        p.municipio,
        p.parroquia,
        p.tipo_persona,
        e.id_emprendimiento,
        e.nombre_emprendimiento,
        e.direccion_empredimiento,
        e.anos_experiencia,
        e.cedula_emprendimiento,
        e.id_clasificacion,
        c.sector,
        c.actividad,
        -- Inspector: prioridad solicitud.id_inspector → expediente → cita
        COALESCE(s.id_inspector, exp.id_usuario, cit.id_inspector) AS id_inspector_asignado,
        uc.cedula_usuario AS inspector_asignado_cedula,
        CONCAT(pc.nombres, ' ', pc.apellidos) AS inspector_asignado_nombre,
        -- Datos del expediente
        exp.id_expediente,
        exp.codigo_expediente,
        exp.estatus as estatus_expediente,
        exp.created_at as expediente_creado,
        exp.id_usuario,
        exp.observaciones,
        exp.id_requisitos,
        exp.urls_imagenes,
        exp.verificacion_documentos,
        u.cedula_usuario as inspector_cedula,
        u.id_rol_usu as inspector_rol,
        CONCAT(pi.nombres, ' ', pi.apellidos) as inspector_nombre
      FROM solicitud s
      INNER JOIN persona p ON s.cedula_persona = p.cedula
      LEFT JOIN emprendimiento e ON s.id_solicitud = e.id_solicitud
      LEFT JOIN clasificacion_emprendimiento c ON e.id_clasificacion = c.id_clasificacion
      LEFT JOIN expediente exp ON s.id_solicitud = exp.id_solicitud
      LEFT JOIN usuario u ON exp.id_usuario = u.id
      LEFT JOIN persona pi ON u.cedula_usuario = pi.cedula
      LEFT JOIN LATERAL (
        SELECT ci.id_inspector, ci.fecha_cita, ci.hora_inicio, ci.created_at
        FROM citas ci
        WHERE ci.id_solicitud = s.id_solicitud
          AND LOWER(COALESCE(ci.estatus, 'programada')) NOT IN ('cancelada', 'reprogramada')
        ORDER BY ci.created_at DESC NULLS LAST, ci.id_cita DESC
        LIMIT 1
      ) cit ON TRUE
      LEFT JOIN usuario uc ON uc.id = COALESCE(s.id_inspector, exp.id_usuario, cit.id_inspector)
      LEFT JOIN persona pc ON pc.cedula = uc.cedula_usuario
      WHERE s.estatus IN ('Recibido', 'Pre-Aprobado', 'Aprobado', 'Incompleto')
      ORDER BY s.id_solicitud DESC
    `;
    
    try {
      const result = await pool.query(query);
      console.log(`✅ ${result.rows.length} solicitudes para expediente encontradas`);
      return result.rows;
    } catch (error) {
      console.error('❌ Error en getSolAprobadasExp:', error);
      throw error;
    }
  }

  // Verificar si ya existe un expediente para una solicitud
  static async existsBySolicitud(id_solicitud) {
    const query = 'SELECT id_expediente FROM expediente WHERE id_solicitud = $1 LIMIT 1';
    try {
      const result = await pool.query(query, [id_solicitud]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ Error en existsBySolicitud:', error);
      throw error;
    }
  }

  // Crear expediente con verificación documental
  static async create(data) {
    const {
      id_solicitud,
      id_usuario,
      ids_requisitos,
      observaciones,
      codigo_expediente,
      estatus,
      urls_imagenes,
      verificacion_documentos
    } = data;

    if (!id_solicitud) throw new Error('id_solicitud es requerido');
    if (!id_usuario) throw new Error('id_usuario (inspector) es requerido');
    if (!codigo_expediente) throw new Error('codigo_expediente es requerido');

    let requisitosString = '';
    if (Array.isArray(ids_requisitos) && ids_requisitos.length > 0) {
      requisitosString = ids_requisitos.join(',');
    } else if (ids_requisitos) {
      requisitosString = String(ids_requisitos);
    } else if (verificacion_documentos && typeof verificacion_documentos === 'object') {
      requisitosString = Object.keys(verificacion_documentos).join(',');
    }

    const urlsImagenesString =
      urls_imagenes && Object.keys(urls_imagenes).length > 0
        ? JSON.stringify(urls_imagenes)
        : null;

    const verificacion = verificacion_documentos && typeof verificacion_documentos === 'object'
      ? verificacion_documentos
      : {};

    const estados = Object.values(verificacion).map((v) =>
      String(v?.estado || '').toLowerCase()
    );
    if (!estados.length) {
      throw new Error('Debe verificar cada requisito (OK o Vencido)');
    }
    const todosOk = estados.every((e) => e === 'ok');

    const estatusFinal = todosOk
      ? (estatus && estatus !== 'En revisión' ? estatus : 'Listo para inspección')
      : 'Incompleto';

    const verificacionString = JSON.stringify(verificacion);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resultExpediente = await client.query(
        `INSERT INTO expediente (
          id_solicitud, id_usuario, id_requisitos, observaciones,
          codigo_expediente, estatus, urls_imagenes, verificacion_documentos,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          id_solicitud,
          id_usuario,
          requisitosString,
          observaciones || (todosOk
            ? 'Documentación verificada — pasa a inspección'
            : 'Documentación incompleta o vencida'),
          codigo_expediente,
          estatusFinal,
          urlsImagenesString,
          verificacionString
        ]
      );
      const expedienteCreado = resultExpediente.rows[0];

      let inspeccionesCreadas = [];

      if (todosOk) {
        const resultClasificacion = await client.query(
          `SELECT c.n_ins_asig, c.id_clasificacion
           FROM solicitud s
           INNER JOIN emprendimiento e ON s.id_solicitud = e.id_solicitud
           INNER JOIN clasificacion_emprendimiento c ON e.id_clasificacion = c.id_clasificacion
           WHERE s.id_solicitud = $1 LIMIT 1`,
          [id_solicitud]
        );
        if (resultClasificacion.rows.length === 0) {
          throw new Error('No se encontró la clasificación del emprendimiento');
        }
        const { n_ins_asig, id_clasificacion } = resultClasificacion.rows[0];
        const n = Math.max(1, parseInt(n_ins_asig, 10) || 1);

        for (let i = 1; i <= n; i++) {
          const r = await client.query(
            `INSERT INTO inspeccion (
              id_codigo_exp, id_tipo_insp_clas, estatus_inspeccion, created_at, updated_at
            ) VALUES ($1, $2, 'Pendiente', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *`,
            [expedienteCreado.id_expediente, id_clasificacion]
          );
          inspeccionesCreadas.push(r.rows[0]);
        }
      } else {
        await client.query(
          `UPDATE solicitud SET estatus = 'Incompleto', updated_at = CURRENT_TIMESTAMP
           WHERE id_solicitud = $1`,
          [id_solicitud]
        );
      }

      await client.query('COMMIT');

      if (estatusFinal && String(estatusFinal) !== 'Incompleto') {
        await CitaModel.marcarAtendidaPorExpediente(expedienteCreado.id_expediente);
      }

      return {
        expediente: expedienteCreado,
        inspecciones: inspeccionesCreadas,
        total_inspecciones: inspeccionesCreadas.length,
        resultado: todosOk ? 'pasa_inspeccion' : 'incompleto'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Error al crear expediente: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /** Re-verificar expediente incompleto */
  static async verificarDocumentos(id_expediente, data) {
    const {
      urls_imagenes,
      verificacion_documentos,
      observaciones,
      id_usuario
    } = data;

    const verificacion = verificacion_documentos || {};
    const estados = Object.values(verificacion).map((v) =>
      String(v?.estado || '').toLowerCase()
    );
    if (!estados.length) throw new Error('Debe verificar cada requisito');
    const todosOk = estados.every((e) => e === 'ok');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const actual = await client.query(
        `SELECT * FROM expediente WHERE id_expediente = $1 FOR UPDATE`,
        [id_expediente]
      );
      if (!actual.rows[0]) throw new Error('Expediente no encontrado');
      const exp = actual.rows[0];

      let urlsMerged = {};
      try {
        urlsMerged = exp.urls_imagenes ? JSON.parse(exp.urls_imagenes) : {};
      } catch (_) { urlsMerged = {}; }
      if (urls_imagenes && typeof urls_imagenes === 'object') {
        urlsMerged = { ...urlsMerged, ...urls_imagenes };
      }

      const estatusFinal = todosOk ? 'Listo para inspección' : 'Incompleto';

      const upd = await client.query(
        `UPDATE expediente SET
          urls_imagenes = $1,
          verificacion_documentos = $2,
          observaciones = COALESCE($3, observaciones),
          id_usuario = COALESCE($4, id_usuario),
          estatus = $5,
          updated_at = CURRENT_TIMESTAMP
         WHERE id_expediente = $6
         RETURNING *`,
        [
          JSON.stringify(urlsMerged),
          JSON.stringify(verificacion),
          observaciones || null,
          id_usuario || null,
          estatusFinal,
          id_expediente
        ]
      );

      let inspeccionesCreadas = [];
      if (todosOk) {
        const existentes = await client.query(
          `SELECT COUNT(*)::int AS n FROM inspeccion WHERE id_codigo_exp = $1`,
          [id_expediente]
        );
        if ((existentes.rows[0]?.n || 0) === 0) {
          const clasif = await client.query(
            `SELECT c.n_ins_asig, c.id_clasificacion
             FROM expediente e
             JOIN solicitud s ON s.id_solicitud = e.id_solicitud
             JOIN emprendimiento em ON em.id_solicitud = s.id_solicitud
             JOIN clasificacion_emprendimiento c ON c.id_clasificacion = em.id_clasificacion
             WHERE e.id_expediente = $1 LIMIT 1`,
            [id_expediente]
          );
          if (clasif.rows[0]) {
            const n = Math.max(1, parseInt(clasif.rows[0].n_ins_asig, 10) || 1);
            for (let i = 0; i < n; i++) {
              const r = await client.query(
                `INSERT INTO inspeccion (
                  id_codigo_exp, id_tipo_insp_clas, estatus_inspeccion, created_at, updated_at
                ) VALUES ($1,$2,'Pendiente',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING *`,
                [id_expediente, clasif.rows[0].id_clasificacion]
              );
              inspeccionesCreadas.push(r.rows[0]);
            }
          }
        }
        await client.query(
          `UPDATE solicitud SET estatus = 'Recibido', updated_at = CURRENT_TIMESTAMP
           WHERE id_solicitud = $1 AND estatus = 'Incompleto'`,
          [exp.id_solicitud]
        );
      } else {
        await client.query(
          `UPDATE solicitud SET estatus = 'Incompleto', updated_at = CURRENT_TIMESTAMP
           WHERE id_solicitud = $1`,
          [exp.id_solicitud]
        );
      }

      await client.query('COMMIT');

      if (estatusFinal && String(estatusFinal) !== 'Incompleto') {
        await CitaModel.marcarAtendidaPorExpediente(id_expediente);
      }

      return {
        expediente: upd.rows[0],
        inspecciones: inspeccionesCreadas,
        total_inspecciones: inspeccionesCreadas.length,
        resultado: todosOk ? 'pasa_inspeccion' : 'incompleto'
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Obtener expediente por ID
  static async getById(id_expediente) {
    const query = `
      SELECT e.*, 
             s.solicitud as motivo_solicitud,
             s.monto_solicitado,
             u.cedula_usuario,
             u.id_rol_usu as inspector_rol
      FROM expediente e
      LEFT JOIN solicitud s ON e.id_solicitud = s.id_solicitud
      LEFT JOIN usuario u ON e.id_usuario = u.id
      WHERE e.id_expediente = $1
    `;
    try {
      const result = await pool.query(query, [id_expediente]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error en getById:', error);
      throw error;
    }
  }

  // Obtener expediente por código
  static async getByCodigo(codigo_expediente) {
    const query = `
      SELECT e.*, 
             s.solicitud as motivo_solicitud,
             s.monto_solicitado,
             u.cedula_usuario,
             u.id_rol_usu as inspector_rol
      FROM expediente e
      LEFT JOIN solicitud s ON e.id_solicitud = s.id_solicitud
      LEFT JOIN usuario u ON e.id_usuario = u.id
      WHERE e.codigo_expediente = $1
    `;
    try {
      const result = await pool.query(query, [codigo_expediente]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error en getByCodigo:', error);
      throw error;
    }
  }

  // Actualizar expediente
  static async update(id_expediente, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.estatus) {
      fields.push(`estatus = $${paramCount}`);
      values.push(data.estatus);
      paramCount++;
    }
    
    if (data.observaciones) {
      fields.push(`observaciones = $${paramCount}`);
      values.push(data.observaciones);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    values.push(id_expediente);
    
    const query = `
      UPDATE expediente 
      SET ${fields.join(', ')}
      WHERE id_expediente = $${paramCount}
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, values);
      const updated = result.rows[0];
      if (updated && data.estatus && String(data.estatus) !== 'Incompleto') {
        await CitaModel.marcarAtendidaPorExpediente(id_expediente);
      }
      return updated;
    } catch (error) {
      console.error('❌ Error en update:', error);
      throw error;
    }
  }
}

module.exports = ExpedienteModel;