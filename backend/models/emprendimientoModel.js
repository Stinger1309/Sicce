const pool = require('../config/db');

class EmprendimientoModel {
  // Obtener todos los emprendimientos
  static async getAll() {
    const result = await pool.query(`
      SELECT e.*, 
             s.solicitud, 
             s.cedula_persona,
             s.estatus as estatus_solicitud
      FROM emprendimiento e
      LEFT JOIN solicitud s ON e.id_solicitud = s.id_solicitud
      ORDER BY e.id_emprendimiento DESC
    `);
    return result.rows;
  }

  // Obtener emprendimiento por ID
  static async getById(id_emprendimiento) {
    const result = await pool.query(`
      SELECT e.*, 
             s.solicitud, 
             s.cedula_persona
      FROM emprendimiento e
      LEFT JOIN solicitud s ON e.id_solicitud = s.id_solicitud
      WHERE e.id_emprendimiento = $1
    `, [id_emprendimiento]);
    return result.rows[0];
  }

  // Obtener emprendimiento por ID de solicitud
  static async getByIdSolicitud(id_solicitud) {
    const result = await pool.query(`
      SELECT *
      FROM emprendimiento
      WHERE id_solicitud = $1
    `, [id_solicitud]);
    return result.rows[0];
  }

  // Crear emprendimiento
  static async create(data) {
    const { id_solicitud, id_clasificacion, cedula_emprendimiento, anos_experiencia, nombre_emprendimiento, direccion_empredimiento } = data;
    
    const result = await pool.query(
      `INSERT INTO emprendimiento 
       (id_solicitud, id_clasificacion, cedula_emprendimiento, anos_experiencia, nombre_emprendimiento, direccion_empredimiento)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_solicitud, id_clasificacion, cedula_emprendimiento, anos_experiencia, nombre_emprendimiento, direccion_empredimiento]
    );
    return result.rows[0];
  }

  // Actualizar emprendimiento
  static async update(id_emprendimiento, data) {
    const { id_clasificacion, anos_experiencia, nombre_emprendimiento, direccion_empredimiento } = data;
    
    const result = await pool.query(
      `UPDATE emprendimiento SET
        id_clasificacion = COALESCE($1, id_clasificacion),
        anos_experiencia = COALESCE($2, anos_experiencia),
        nombre_emprendimiento = COALESCE($3, nombre_emprendimiento),
        direccion_empredimiento = COALESCE($4, direccion_empredimiento),
        updated_at = CURRENT_TIMESTAMP
      WHERE id_emprendimiento = $5
      RETURNING *`,
      [id_clasificacion, anos_experiencia, nombre_emprendimiento, direccion_empredimiento, id_emprendimiento]
    );
    return result.rows[0];
  }

  // Eliminar emprendimiento
  static async delete(id_emprendimiento) {
    const result = await pool.query(
      'DELETE FROM emprendimiento WHERE id_emprendimiento = $1 RETURNING *',
      [id_emprendimiento]
    );
    return result.rows[0];
  }
}

module.exports = EmprendimientoModel;