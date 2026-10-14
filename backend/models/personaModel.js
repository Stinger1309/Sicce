const pool = require('../config/db');

class PersonaModel {
  // Obtener todas las persona
  static async getAll() {
    const result = await pool.query('SELECT * FROM persona ORDER BY cedula');
    return result.rows;
  }

  // Obtener persona por ID
  static async getById(cedula) {
    const result = await pool.query('SELECT * FROM persona WHERE cedula = $1', [cedula]);
    return result.rows[0];
  }

  // Obtener persona por cédula
  static async getByCedula(cedula) {
    const result = await pool.query('SELECT * FROM persona WHERE cedula = $1', [cedula]);
    return result.rows[0];
  }

  // Obtener persona por correo
  static async getByCorreo(correo) {
    const result = await pool.query('SELECT * FROM persona WHERE correo = $1', [correo]);
    return result.rows[0];
  }

  // Crear persona
  static async create(data) {
    const {
      nacionalidad, cedula, nombres, apellidos, fecha_nacimiento,
      telefono, correo, estado_civil, direccion, estado, municipio,
      parroquia, tipo_persona
    } = data;

    const result = await pool.query(
      `INSERT INTO persona (
        nacionalidad, cedula, nombres, apellidos, fecha_nacimiento,
        telefono, correo, estado_civil, direccion, estado, municipio,
        parroquia, tipo_persona
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [nacionalidad, cedula, nombres, apellidos, fecha_nacimiento,
       telefono, correo, estado_civil, direccion, estado, municipio,
       parroquia, tipo_persona]
    );
    return result.rows[0];
  }

  // Actualizar persona
  static async update(cedula, data) {
    const {
      nacionalidad, nombres, apellidos, fecha_nacimiento,
      telefono, correo, estado_civil, direccion, estado, municipio,
      parroquia, tipo_persona
    } = data;

    const result = await pool.query(
      `UPDATE persona SET
        nacionalidad = $1, nombres = $2, apellidos = $3, fecha_nacimiento = $4,
        telefono = $5, correo = $6, estado_civil = $7, direccion = $8,
        estado = $9, municipio = $10, parroquia = $11, tipo_persona = $12
        , updated_at = CURRENT_TIMESTAMP
      WHERE cedula = $13 RETURNING *`,
      [nacionalidad, nombres, apellidos, fecha_nacimiento, telefono,
       correo, estado_civil, direccion, estado, municipio, parroquia,
       tipo_persona, cedula]
    );
    return result.rows[0];
  }

  // Eliminar persona (borrado lógico o físico)
  static async delete(cedula) {
    const result = await pool.query('DELETE FROM persona WHERE cedula = $1 RETURNING *', [cedula]);
    return result.rows[0];
  }

  // Obtener persona por tipo
  static async getByTipo(tipo_persona) {
    const result = await pool.query(
      'SELECT * FROM persona WHERE tipo_persona = $1 ORDER BY cedula',
      [tipo_persona]
    );
    return result.rows;
  }
}

module.exports = PersonaModel;