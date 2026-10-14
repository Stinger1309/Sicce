const pool = require('../config/db');

class NotificacionModel {
  static async create({
    id_usuario_destino,
    id_usuario_origen = null,
    titulo,
    mensaje = '',
    tipo = 'info',
    modulo = null,
    enlace = null
  }) {
    if (!id_usuario_destino || !titulo) {
      throw new Error('Destino y título son requeridos');
    }
    const r = await pool.query(
      `INSERT INTO notificaciones
        (id_usuario_destino, id_usuario_origen, titulo, mensaje, tipo, modulo, enlace)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id_usuario_destino, id_usuario_origen, titulo, mensaje, tipo, modulo, enlace]
    );
    return r.rows[0];
  }

  static async createForRole(nombreRolLike, payload) {
    const users = await pool.query(
      `SELECT u.id FROM usuario u
       JOIN roles r ON r.id_rol = u.id_rol_usu
       WHERE LOWER(r.nombre_rol) LIKE $1 AND LOWER(COALESCE(u.estatus,'')) LIKE '%activ%'`,
      [`%${String(nombreRolLike).toLowerCase()}%`]
    );
    const created = [];
    for (const u of users.rows) {
      created.push(await this.create({ ...payload, id_usuario_destino: u.id }));
    }
    return created;
  }

  static async getByUsuario(idUsuario, { soloNoLeidas = false, limit = 50 } = {}) {
    const params = [idUsuario];
    let where = 'WHERE id_usuario_destino = $1';
    if (soloNoLeidas) where += ' AND leida = FALSE';
    params.push(limit);
    const r = await pool.query(
      `SELECT n.*,
              CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS origen_nombre
       FROM notificaciones n
       LEFT JOIN usuario u ON u.id = n.id_usuario_origen
       LEFT JOIN persona p ON p.cedula = u.cedula_usuario
       ${where}
       ORDER BY n.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return r.rows;
  }

  static async countNoLeidas(idUsuario) {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS n FROM notificaciones
       WHERE id_usuario_destino = $1 AND leida = FALSE`,
      [idUsuario]
    );
    return r.rows[0]?.n || 0;
  }

  static async marcarLeida(id, idUsuario) {
    const r = await pool.query(
      `UPDATE notificaciones SET leida = TRUE
       WHERE id_notificacion = $1 AND id_usuario_destino = $2
       RETURNING *`,
      [id, idUsuario]
    );
    return r.rows[0] || null;
  }

  static async marcarTodasLeidas(idUsuario) {
    await pool.query(
      `UPDATE notificaciones SET leida = TRUE
       WHERE id_usuario_destino = $1 AND leida = FALSE`,
      [idUsuario]
    );
    return true;
  }
}

module.exports = NotificacionModel;
