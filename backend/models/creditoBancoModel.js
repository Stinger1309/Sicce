const pool = require('../config/db');

class CreditoBancoModel {
  static async getAll(filtros = {}) {
    const params = [];
    const conditions = [];
    let i = 1;

    if (filtros.estatus) {
      conditions.push(`cb.estatus = $${i++}`);
      params.push(filtros.estatus);
    }
    if (filtros.cedula) {
      conditions.push(`cb.cedula_persona = $${i++}`);
      params.push(filtros.cedula);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const r = await pool.query(
      `SELECT
        cb.*,
        b.nombre AS banco_nombre,
        b.siglas AS banco_siglas,
        b.codigo_banco,
        pb.tipo_cuenta,
        pb.numero_cuenta,
        p.nombres,
        p.apellidos,
        CONCAT(p.nombres, ' ', p.apellidos) AS nombre_completo,
        p.telefono,
        p.correo,
        p.direccion,
        e.codigo_expediente,
        s.monto_solicitado,
        s.fecha_solicitud,
        s.solicitud AS tipo_solicitud,
        a.estatus_aprobacion,
        a.seleccion_manejo,
        em.nombre_emprendimiento,
        c.sector,
        c.actividad
       FROM credito_banco cb
       JOIN persona_bancos pb ON cb.id_persona_banco = pb.id_persona_banco
       JOIN bancos b ON pb.id_banco = b.id_banco
       JOIN persona p ON cb.cedula_persona = p.cedula
       LEFT JOIN aprobacion a ON cb.id_aprobacion = a.id_aprobacion
       LEFT JOIN expediente e ON cb.id_expediente = e.id_expediente
       LEFT JOIN solicitud s ON cb.id_solicitud = s.id_solicitud
       LEFT JOIN emprendimiento em ON s.id_solicitud = em.id_solicitud
       LEFT JOIN clasificacion_emprendimiento c ON em.id_clasificacion = c.id_clasificacion
       ${where}
       ORDER BY cb.created_at DESC`,
      params
    );
    return r.rows;
  }

  static async getById(id) {
    const rows = await this.getAll({});
    return rows.find((r) => String(r.id_credito_banco) === String(id)) || null;
  }

  static async createFromAprobacion({
    id_aprobacion,
    id_expediente,
    id_solicitud,
    cedula_persona,
    id_persona_banco,
    monto_solicitado,
    monto_aprobado,
    observaciones,
    estatus = 'Finalizado'
  }) {
    // Evitar duplicados por aprobación
    const exists = await pool.query(
      `SELECT id_credito_banco FROM credito_banco WHERE id_aprobacion = $1`,
      [id_aprobacion]
    );
    if (exists.rows[0]) {
      const upd = await pool.query(
        `UPDATE credito_banco SET
          id_persona_banco = $1,
          monto_solicitado = COALESCE($2, monto_solicitado),
          monto_aprobado = COALESCE($3, monto_aprobado),
          observaciones = COALESCE($4, observaciones),
          estatus = $5,
          fecha_finalizado = CASE WHEN $5 = 'Finalizado' THEN CURRENT_TIMESTAMP ELSE fecha_finalizado END,
          updated_at = CURRENT_TIMESTAMP
         WHERE id_aprobacion = $6
         RETURNING *`,
        [id_persona_banco, monto_solicitado, monto_aprobado, observaciones, estatus, id_aprobacion]
      );
      return upd.rows[0];
    }

    const r = await pool.query(
      `INSERT INTO credito_banco (
        id_aprobacion, id_expediente, id_solicitud, cedula_persona,
        id_persona_banco, monto_solicitado, monto_aprobado, estatus,
        observaciones, fecha_direccion, fecha_finalizado
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,
        CASE WHEN $8 = 'Finalizado' THEN CURRENT_TIMESTAMP ELSE NULL END)
      RETURNING *`,
      [
        id_aprobacion,
        id_expediente,
        id_solicitud,
        cedula_persona,
        id_persona_banco,
        monto_solicitado || null,
        monto_aprobado || null,
        estatus,
        observaciones || null
      ]
    );
    return r.rows[0];
  }

  static async updateEstatus(id, estatus, observaciones) {
    const r = await pool.query(
      `UPDATE credito_banco SET
        estatus = $1,
        observaciones = COALESCE($2, observaciones),
        fecha_finalizado = CASE WHEN $1 = 'Finalizado' THEN CURRENT_TIMESTAMP ELSE fecha_finalizado END,
        updated_at = CURRENT_TIMESTAMP
       WHERE id_credito_banco = $3
       RETURNING *`,
      [estatus, observaciones || null, id]
    );
    return r.rows[0];
  }

  /** Marca el aval como entregado tras la primera descarga */
  static async marcarAvalEntregado(id) {
    const r = await pool.query(
      `UPDATE credito_banco SET
        aval_entregado = TRUE,
        fecha_aval_entregado = COALESCE(fecha_aval_entregado, CURRENT_TIMESTAMP),
        aval_descargas = COALESCE(aval_descargas, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id_credito_banco = $1
       RETURNING *`,
      [id]
    );
    return r.rows[0];
  }

  /** Solo incrementa contador de reimpresiones (ya estaba entregado) */
  static async registrarReimpresionAval(id) {
    const r = await pool.query(
      `UPDATE credito_banco SET
        aval_descargas = COALESCE(aval_descargas, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id_credito_banco = $1
       RETURNING *`,
      [id]
    );
    return r.rows[0];
  }
}

module.exports = CreditoBancoModel;
