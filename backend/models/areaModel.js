const pool = require('../config/db');

class AreaModel {
  static async getAll(incluirInactivos = false) {
    const sql = incluirInactivos
      ? `SELECT * FROM area ORDER BY nombre_area ASC`
      : `SELECT * FROM area WHERE COALESCE(activo, TRUE) = TRUE ORDER BY nombre_area ASC`;
    const result = await pool.query(sql);
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query('SELECT * FROM area WHERE id_area = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(data) {
    const { nombre_area, codigo, descripcion } = data;
    const result = await pool.query(
      `INSERT INTO area (nombre_area, codigo, descripcion, activo)
       VALUES ($1, $2, $3, TRUE)
       RETURNING *`,
      [
        String(nombre_area || '').trim(),
        String(codigo || nombre_area || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_'),
        descripcion || null,
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { nombre_area, codigo, descripcion, activo } = data;
    const result = await pool.query(
      `UPDATE area
       SET nombre_area = COALESCE($1, nombre_area),
           codigo = COALESCE($2, codigo),
           descripcion = COALESCE($3, descripcion),
           activo = COALESCE($4, activo),
           updated_at = CURRENT_TIMESTAMP
       WHERE id_area = $5
       RETURNING *`,
      [
        nombre_area != null ? String(nombre_area).trim() : null,
        codigo != null
          ? String(codigo).trim().toLowerCase().replace(/\s+/g, '_')
          : null,
        descripcion !== undefined ? descripcion : null,
        typeof activo === 'boolean' ? activo : null,
        id,
      ]
    );
    return result.rows[0] || null;
  }

  static async softDelete(id) {
    const result = await pool.query(
      `UPDATE area SET activo = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id_area = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async tieneUsuarios(id) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM usuario WHERE id_area = $1',
      [id]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }
}

module.exports = AreaModel;
