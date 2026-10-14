const pool = require('../config/db');

class AuditoriaModel {

  static async create({
    id_usuario = null,
    usuario_nombre = null,
    modulo,
    accion,
    descripcion = null,
    tabla_afectada = null,
    registro_id = null,
    datos_anteriores = null,
    datos_nuevos = null,
    ip_address = null,
    user_agent = null
  }) {
    const result = await pool.query(
      `INSERT INTO auditoria (
        id_usuario, usuario_nombre, modulo, accion, descripcion,
        tabla_afectada, registro_id, datos_anteriores, datos_nuevos,
        ip_address, user_agent
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        id_usuario,
        usuario_nombre,
        modulo,
        accion,
        descripcion,
        tabla_afectada,
        registro_id != null ? String(registro_id) : null,
        datos_anteriores ? (typeof datos_anteriores === 'string' ? datos_anteriores : JSON.stringify(datos_anteriores)) : null,
        datos_nuevos ? (typeof datos_nuevos === 'string' ? datos_nuevos : JSON.stringify(datos_nuevos)) : null,
        ip_address,
        user_agent
      ]
    );
    return result.rows[0];
  }

  static async getAll({ modulo, accion, id_usuario, desde, hasta, busqueda, limit = 100, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (modulo) {
      conditions.push(`a.modulo = $${idx++}`);
      params.push(modulo);
    }
    if (accion) {
      conditions.push(`a.accion = $${idx++}`);
      params.push(accion);
    }
    if (id_usuario) {
      conditions.push(`a.id_usuario = $${idx++}`);
      params.push(id_usuario);
    }
    if (desde) {
      conditions.push(`a.created_at >= $${idx++}`);
      params.push(desde);
    }
    if (hasta) {
      conditions.push(`a.created_at <= $${idx++}`);
      params.push(hasta);
    }
    if (busqueda) {
      conditions.push(`(
        a.descripcion ILIKE $${idx} OR
        a.usuario_nombre ILIKE $${idx} OR
        a.tabla_afectada ILIKE $${idx} OR
        a.registro_id ILIKE $${idx} OR
        a.modulo ILIKE $${idx}
      )`);
      params.push(`%${busqueda}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM auditoria a ${where}`,
      params
    );

    params.push(limit);
    params.push(offset);

    const result = await pool.query(
      `SELECT a.*,
              COALESCE(a.usuario_nombre, CONCAT(p.nombres, ' ', p.apellidos), 'Sistema') AS nombre_usuario
       FROM auditoria a
       LEFT JOIN usuario u ON a.id_usuario = u.id
       LEFT JOIN persona p ON u.cedula_usuario = p.cedula
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    return {
      data: result.rows,
      total: countResult.rows[0].total
    };
  }

  static async getById(id) {
    const result = await pool.query(
      `SELECT a.*,
              COALESCE(a.usuario_nombre, CONCAT(p.nombres, ' ', p.apellidos), 'Sistema') AS nombre_usuario
       FROM auditoria a
       LEFT JOIN usuario u ON a.id_usuario = u.id
       LEFT JOIN persona p ON u.cedula_usuario = p.cedula
       WHERE a.id_auditoria = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async getModulos() {
    const result = await pool.query(
      `SELECT DISTINCT modulo FROM auditoria ORDER BY modulo`
    );
    return result.rows.map(r => r.modulo);
  }

  static async getAcciones() {
    const result = await pool.query(
      `SELECT DISTINCT accion FROM auditoria ORDER BY accion`
    );
    return result.rows.map(r => r.accion);
  }

  static async getEstadisticas() {
    const [totales, porModulo, porAccion, recientes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM auditoria`),
      pool.query(`
        SELECT modulo, COUNT(*)::int AS cantidad
        FROM auditoria
        GROUP BY modulo
        ORDER BY cantidad DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT accion, COUNT(*)::int AS cantidad
        FROM auditoria
        GROUP BY accion
        ORDER BY cantidad DESC
      `),
      pool.query(`
        SELECT COUNT(*)::int AS hoy
        FROM auditoria
        WHERE created_at::date = CURRENT_DATE
      `)
    ]);

    return {
      total: totales.rows[0].total,
      hoy: recientes.rows[0].hoy,
      por_modulo: porModulo.rows,
      por_accion: porAccion.rows
    };
  }

  static async limpiarAntiguos(dias = 90) {
    const result = await pool.query(
      `DELETE FROM auditoria
       WHERE created_at < NOW() - ($1 || ' days')::INTERVAL
       RETURNING id_auditoria`,
      [dias]
    );
    return result.rowCount;
  }
}

module.exports = AuditoriaModel;
