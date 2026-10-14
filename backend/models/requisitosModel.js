const pool = require('../config/db');

class RequisitosModel {
  static async getAll(incluirInactivos = false) {
    const sql = incluirInactivos
      ? 'SELECT * FROM requisitos ORDER BY id_requisitos ASC'
      : `SELECT * FROM requisitos WHERE COALESCE(activo, TRUE) = TRUE ORDER BY id_requisitos ASC`;
    const result = await pool.query(sql);
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM requisitos WHERE id_requisitos = $1',
      [id]
    );
    return result.rows[0];
  }

  static async getByNombre(nombre_requisito) {
    const result = await pool.query(
      `SELECT * FROM requisitos
       WHERE nombre_requisito ILIKE $1 AND COALESCE(activo, TRUE) = TRUE`,
      [nombre_requisito]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { nombre_requisito } = data;
    const result = await pool.query(
      `INSERT INTO requisitos (nombre_requisito, activo)
       VALUES ($1, TRUE)
       RETURNING *`,
      [nombre_requisito.trim()]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { nombre_requisito, activo } = data;
    const result = await pool.query(
      `UPDATE requisitos
       SET nombre_requisito = COALESCE($1, nombre_requisito),
           activo = COALESCE($2, activo),
           updated_at = CURRENT_TIMESTAMP
       WHERE id_requisitos = $3
       RETURNING *`,
      [
        nombre_requisito != null ? nombre_requisito.trim() : null,
        typeof activo === 'boolean' ? activo : null,
        id,
      ]
    );
    return result.rows[0];
  }

  static async softDelete(id) {
    const result = await pool.query(
      `UPDATE requisitos SET activo = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id_requisitos = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async toggleActivo(id) {
    const result = await pool.query(
      `UPDATE requisitos SET activo = NOT COALESCE(activo, TRUE), updated_at = CURRENT_TIMESTAMP
       WHERE id_requisitos = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async delete(id) {
    return this.softDelete(id);
  }
}

module.exports = RequisitosModel;
