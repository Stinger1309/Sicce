const pool = require('../config/db');

class RolModel {
  /** Solo roles activos (para selects / asignación) */
  static async getAll(incluirInactivos = false) {
    const sql = incluirInactivos
      ? `SELECT id_rol, nombre_rol, requiere_area, unico, activo, created_at, updated_at FROM roles ORDER BY nombre_rol ASC`
      : `SELECT id_rol, nombre_rol, requiere_area, unico, activo, created_at, updated_at FROM roles
         WHERE COALESCE(activo, TRUE) = TRUE ORDER BY nombre_rol ASC`;
    const result = await pool.query(sql);
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT id_rol, nombre_rol, requiere_area, unico, activo, created_at, updated_at FROM roles WHERE id_rol = $1',
      [id]
    );
    return result.rows[0];
  }

  static async getByNombre(nombre_rol) {
    const result = await pool.query(
      `SELECT id_rol, nombre_rol, requiere_area, unico, activo FROM roles
       WHERE nombre_rol ILIKE $1 AND COALESCE(activo, TRUE) = TRUE`,
      [nombre_rol]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { nombre_rol, requiere_area, unico } = data;
    const result = await pool.query(
      `INSERT INTO roles (nombre_rol, requiere_area, unico, activo)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id_rol, nombre_rol, requiere_area, unico, activo, created_at`,
      [
        nombre_rol.trim(),
        Boolean(requiere_area),
        Boolean(unico),
      ]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { nombre_rol, activo, requiere_area, unico } = data;
    const result = await pool.query(
      `UPDATE roles
       SET nombre_rol = COALESCE($1, nombre_rol),
           activo = COALESCE($2, activo),
           requiere_area = COALESCE($3, requiere_area),
           unico = COALESCE($4, unico),
           updated_at = CURRENT_TIMESTAMP
       WHERE id_rol = $5
       RETURNING id_rol, nombre_rol, requiere_area, unico, activo, updated_at`,
      [
        nombre_rol != null ? nombre_rol.trim() : null,
        typeof activo === 'boolean' ? activo : null,
        typeof requiere_area === 'boolean' ? requiere_area : null,
        typeof unico === 'boolean' ? unico : null,
        id,
      ]
    );
    return result.rows[0];
  }

  /** Borrado lógico: oculta en vista, no borra de BD */
  static async softDelete(id) {
    const rol = await this.getById(id);
    if (!rol) throw new Error('Rol no encontrado');
    const result = await pool.query(
      `UPDATE roles SET activo = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id_rol = $1
       RETURNING id_rol, nombre_rol, activo`,
      [id]
    );
    return result.rows[0];
  }

  static async toggleActivo(id) {
    const result = await pool.query(
      `UPDATE roles SET activo = NOT COALESCE(activo, TRUE), updated_at = CURRENT_TIMESTAMP
       WHERE id_rol = $1
       RETURNING id_rol, nombre_rol, activo`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async delete(id) {
    return this.softDelete(id);
  }

  static async tieneUsuarios(id) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM usuario WHERE id_rol_usu = $1',
      [id]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }
}

module.exports = RolModel;
