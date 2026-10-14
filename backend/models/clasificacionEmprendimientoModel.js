const pool = require('../config/db');

class ClasificacionEmprendimientoModel {
  static async getAll(incluirInactivos = false) {
    const sql = incluirInactivos
      ? 'SELECT * FROM clasificacion_emprendimiento ORDER BY id_clasificacion'
      : `SELECT * FROM clasificacion_emprendimiento
         WHERE COALESCE(activo, TRUE) = TRUE ORDER BY id_clasificacion`;
    const result = await pool.query(sql);
    return result.rows;
  }

  static async getById(id_clasificacion) {
    const result = await pool.query(
      'SELECT * FROM clasificacion_emprendimiento WHERE id_clasificacion = $1',
      [id_clasificacion]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { sector, actividad, n_ins_asig } = data;
    const result = await pool.query(
      `INSERT INTO clasificacion_emprendimiento (sector, actividad, n_ins_asig, activo)
       VALUES ($1, $2, $3, TRUE)
       RETURNING *`,
      [sector, actividad, n_ins_asig]
    );
    return result.rows[0];
  }

  static async update(id_clasificacion, data) {
    const { sector, actividad, n_ins_asig, activo } = data;
    const result = await pool.query(
      `UPDATE clasificacion_emprendimiento SET
        sector = COALESCE($1, sector),
        actividad = COALESCE($2, actividad),
        n_ins_asig = COALESCE($3, n_ins_asig),
        activo = COALESCE($4, activo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id_clasificacion = $5
      RETURNING *`,
      [
        sector,
        actividad,
        n_ins_asig,
        typeof activo === 'boolean' ? activo : null,
        id_clasificacion,
      ]
    );
    return result.rows[0];
  }

  static async softDelete(id_clasificacion) {
    const result = await pool.query(
      `UPDATE clasificacion_emprendimiento
       SET activo = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id_clasificacion = $1 RETURNING *`,
      [id_clasificacion]
    );
    return result.rows[0];
  }

  static async toggleActivo(id_clasificacion) {
    const result = await pool.query(
      `UPDATE clasificacion_emprendimiento
       SET activo = NOT COALESCE(activo, TRUE), updated_at = CURRENT_TIMESTAMP
       WHERE id_clasificacion = $1 RETURNING *`,
      [id_clasificacion]
    );
    return result.rows[0] || null;
  }

  static async delete(id_clasificacion) {
    return this.softDelete(id_clasificacion);
  }
}

module.exports = ClasificacionEmprendimientoModel;
