const pool = require('../config/db');

class CitaModel {
  static async getAll({ desde, hasta, id_inspector } = {}) {
    const params = [];
    const cond = [];
    let i = 1;
    if (desde) {
      cond.push(`c.fecha_cita::date >= $${i++}::date`);
      params.push(desde);
    }
    if (hasta) {
      cond.push(`c.fecha_cita::date <= $${i++}::date`);
      params.push(hasta);
    }
    if (id_inspector) {
      cond.push(`c.id_inspector = $${i++}`);
      params.push(id_inspector);
    }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    const r = await pool.query(
      `SELECT c.id_cita, c.id_expediente, c.id_solicitud, c.id_inspector,
              c.cedula_emprendedor, c.titulo, c.descripcion,
              to_char(c.fecha_cita, 'YYYY-MM-DD') AS fecha_cita,
              c.hora_inicio, c.hora_fin, c.estatus, c.created_by,
              c.created_at, c.updated_at,
              CONCAT(COALESCE(pi.nombres,''), ' ', COALESCE(pi.apellidos,'')) AS inspector_nombre,
              CONCAT(COALESCE(pe.nombres,''), ' ', COALESCE(pe.apellidos,'')) AS emprendedor_nombre,
              e.codigo_expediente
       FROM citas c
       LEFT JOIN usuario ui ON ui.id = c.id_inspector
       LEFT JOIN persona pi ON pi.cedula = ui.cedula_usuario
       LEFT JOIN persona pe ON pe.cedula = c.cedula_emprendedor
       LEFT JOIN expediente e ON e.id_expediente = c.id_expediente
       ${where}
       ORDER BY c.fecha_cita, c.hora_inicio`,
      params
    );
    return r.rows;
  }

  static async getById(id) {
    const rows = await this.getAll({});
    return rows.find((x) => String(x.id_cita) === String(id)) || null;
  }

  static async hayConflicto(id_inspector, fecha_cita, hora_inicio, excludeId = null) {
    const params = [id_inspector, fecha_cita, hora_inicio];
    let sql = `
      SELECT id_cita FROM citas
      WHERE id_inspector = $1
        AND fecha_cita = $2
        AND hora_inicio = $3
        AND estatus NOT IN ('Cancelada', 'Reprogramada')
    `;
    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id_cita <> $${params.length}`;
    }
    const r = await pool.query(sql, params);
    return r.rows.length > 0;
  }

  static async create(data) {
    const {
      id_expediente,
      id_solicitud,
      id_inspector,
      cedula_emprendedor,
      titulo,
      descripcion,
      fecha_cita,
      hora_inicio,
      hora_fin,
      created_by
    } = data;

    if (!id_inspector || !fecha_cita || !hora_inicio) {
      throw new Error('Inspector, fecha y hora son obligatorios');
    }

    const conflicto = await this.hayConflicto(id_inspector, fecha_cita, hora_inicio);
    if (conflicto) {
      throw new Error('El inspector ya tiene una cita en esa fecha y hora');
    }

    const r = await pool.query(
      `INSERT INTO citas (
        id_expediente, id_solicitud, id_inspector, cedula_emprendedor,
        titulo, descripcion, fecha_cita, hora_inicio, hora_fin, created_by, estatus
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Programada')
      RETURNING *`,
      [
        id_expediente || null,
        id_solicitud || null,
        id_inspector,
        cedula_emprendedor || null,
        titulo || 'Atención de crédito',
        descripcion || null,
        fecha_cita,
        hora_inicio,
        hora_fin || null,
        created_by || null
      ]
    );

    // Asignar inspector a la solicitud y al expediente si aplica
    if (id_solicitud) {
      await pool.query(
        `UPDATE solicitud SET id_inspector = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id_solicitud = $2`,
        [id_inspector, id_solicitud]
      );
    }
    if (id_expediente) {
      await pool.query(
        `UPDATE expediente SET id_usuario = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id_expediente = $2`,
        [id_inspector, id_expediente]
      );
    }

    return r.rows[0];
  }

  static async update(id, data) {
    const current = await pool.query(`SELECT * FROM citas WHERE id_cita = $1`, [id]);
    if (!current.rows[0]) throw new Error('Cita no encontrada');

    const id_inspector = data.id_inspector ?? current.rows[0].id_inspector;
    const fecha_cita = data.fecha_cita ?? current.rows[0].fecha_cita;
    const hora_inicio = data.hora_inicio ?? current.rows[0].hora_inicio;

    if (await this.hayConflicto(id_inspector, fecha_cita, hora_inicio, id)) {
      throw new Error('El inspector ya tiene una cita en esa fecha y hora');
    }

    const r = await pool.query(
      `UPDATE citas SET
        id_inspector = $1,
        fecha_cita = $2,
        hora_inicio = $3,
        hora_fin = COALESCE($4, hora_fin),
        titulo = COALESCE($5, titulo),
        descripcion = COALESCE($6, descripcion),
        estatus = COALESCE($7, estatus),
        updated_at = CURRENT_TIMESTAMP
       WHERE id_cita = $8
       RETURNING *`,
      [
        id_inspector,
        fecha_cita,
        hora_inicio,
        data.hora_fin ?? null,
        data.titulo ?? null,
        data.descripcion ?? null,
        data.estatus ?? null,
        id
      ]
    );

    const idSol = current.rows[0].id_solicitud;
    if (idSol) {
      await pool.query(
        `UPDATE solicitud SET id_inspector = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id_solicitud = $2`,
        [id_inspector, idSol]
      );
    }
    const idExp = data.id_expediente || current.rows[0].id_expediente;
    if (idExp) {
      await pool.query(
        `UPDATE expediente SET id_usuario = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id_expediente = $2`,
        [id_inspector, idExp]
      );
    }

    return r.rows[0];
  }

  static async cancelar(id) {
    const current = await pool.query(`SELECT * FROM citas WHERE id_cita = $1`, [id]);
    const cita = current.rows[0];
    if (!cita) return null;

    if (cita.estatus === 'Cancelada') {
      return cita;
    }

    if (cita.estatus === 'Atendida') {
      throw new Error('No se puede cancelar una cita atendida');
    }

    // La cita depende del expediente: si ya avanzó de estatus, no se cancela
    const expAvanzado = await pool.query(
      `SELECT e.id_expediente, e.estatus
       FROM citas c
       JOIN expediente e
         ON (c.id_expediente IS NOT NULL AND e.id_expediente = c.id_expediente)
         OR (c.id_solicitud IS NOT NULL AND e.id_solicitud = c.id_solicitud)
       WHERE c.id_cita = $1
         AND COALESCE(e.estatus, 'Incompleto') <> 'Incompleto'
       LIMIT 1`,
      [id]
    );

    if (expAvanzado.rows.length > 0) {
      throw new Error(
        'No se puede cancelar la cita: el expediente ya cambió de estatus'
      );
    }

    const r = await pool.query(
      `UPDATE citas SET estatus = 'Cancelada', updated_at = CURRENT_TIMESTAMP
       WHERE id_cita = $1 RETURNING *`,
      [id]
    );
    return r.rows[0] || null;
  }

  /**
   * Cuando el expediente deja de estar Incompleto (cambia de estatus),
   * la cita queda Atendida.
   */
  static async marcarAtendidaPorExpediente(idExpediente, db = pool) {
    if (!idExpediente) return 0;
    const r = await db.query(
      `UPDATE citas c
       SET estatus = 'Atendida',
           id_expediente = COALESCE(c.id_expediente, e.id_expediente),
           updated_at = CURRENT_TIMESTAMP
       FROM expediente e
       WHERE e.id_expediente = $1
         AND (
           (c.id_expediente IS NOT NULL AND c.id_expediente = e.id_expediente)
           OR (c.id_solicitud IS NOT NULL AND c.id_solicitud = e.id_solicitud)
         )
         AND c.estatus NOT IN ('Cancelada', 'Atendida')
       RETURNING c.id_cita`,
      [idExpediente]
    );
    return r.rowCount || 0;
  }
}

module.exports = CitaModel;
