const pool = require('../config/db');

function normalizeAcciones(acciones) {
  if (acciones == null) return '["ver"]';
  if (Array.isArray(acciones)) return JSON.stringify(acciones);
  const s = String(acciones).trim();
  if (!s) return '["ver"]';
  if (s === '*') return JSON.stringify(['ver', 'modificar', 'eliminar', 'exportar', 'crear']);
  if (s.startsWith('[')) return s;
  // CSV legacy: ver,crear,editar → mapear editar→modificar, crear→modificar
  const parts = s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  const mapped = [...new Set(parts.map((p) => {
    if (p === 'editar' || p === 'crear' || p === 'actualizar') return 'modificar';
    return p;
  }))];
  return JSON.stringify(mapped);
}

function parseAcciones(raw) {
  try {
    if (Array.isArray(raw)) return raw;
    if (!raw) return [];
    const s = String(raw).trim();
    if (s === '*') return ['ver', 'modificar', 'eliminar', 'exportar'];
    if (s.startsWith('[')) return JSON.parse(s);
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

class PermisosModel {
  /** Permisos del rol del usuario, priorizando los del área asignada */
  static async getPermisosByUsuario(idUsuario) {
    const query = `
      SELECT DISTINCT ON (pr.menu_item_id)
             pr.id_permisos_rol AS id_permisos, pr.menu_item_id, pr.acciones,
             pr.id_area, pr.created_at, pr.updated_at, u.id_rol_usu AS id_rol
      FROM usuario u
      JOIN permisos_rol pr ON pr.id_rol = u.id_rol_usu
        AND (pr.id_area IS NULL OR pr.id_area = u.id_area)
      WHERE u.id = $1
      ORDER BY pr.menu_item_id, (pr.id_area IS NOT NULL) DESC
    `;
    const result = await pool.query(query, [idUsuario]);
    return result.rows;
  }

  static async getPermisosByRol(idRol, idArea = null) {
    const params = [idRol];
    let areaSql = ' AND pr.id_area IS NULL';
    if (idArea != null && idArea !== '' && !Number.isNaN(Number(idArea))) {
      params.push(Number(idArea));
      areaSql = ` AND pr.id_area = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT pr.id_permisos_rol AS id_permisos, pr.id_rol, pr.id_area,
              pr.menu_item_id, pr.acciones, pr.created_at, pr.updated_at
       FROM permisos_rol pr
       WHERE pr.id_rol = $1 ${areaSql}
       ORDER BY pr.menu_item_id`,
      params
    );
    return result.rows;
  }

  static async asignarPermisosRol(idRol, permisos, idArea = null) {
    const areaVal =
      idArea != null && idArea !== '' && !Number.isNaN(Number(idArea))
        ? Number(idArea)
        : null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (areaVal == null) {
        await client.query(
          'DELETE FROM permisos_rol WHERE id_rol = $1 AND id_area IS NULL',
          [idRol]
        );
      } else {
        await client.query(
          'DELETE FROM permisos_rol WHERE id_rol = $1 AND id_area = $2',
          [idRol, areaVal]
        );
      }

      if (permisos?.length > 0) {
        for (const permiso of permisos) {
          if (!permiso.menu_item_id) continue;
          await client.query(
            `INSERT INTO permisos_rol (id_rol, id_area, menu_item_id, acciones, created_at, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [idRol, areaVal, permiso.menu_item_id, normalizeAcciones(permiso.acciones)]
          );
        }
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async eliminarPermisosRol(idRol) {
    const result = await pool.query('DELETE FROM permisos_rol WHERE id_rol = $1', [idRol]);
    return result.rowCount > 0;
  }

  /** Compat: ya no se guardan por usuario; se ignoran / redirigen al rol */
  static async asignarPermisosUsuario(idUsuario, permisos) {
    const u = await pool.query('SELECT id_rol_usu FROM usuario WHERE id = $1', [idUsuario]);
    if (!u.rows[0]?.id_rol_usu) {
      throw new Error('El usuario no tiene rol asignado; asigne permisos al rol');
    }
    return this.asignarPermisosRol(u.rows[0].id_rol_usu, permisos);
  }

  static async eliminarPermisosUsuario(idUsuario) {
    // No borrar permisos del rol por un usuario
    return false;
  }

  static async copiarPermisosUsuario() {
    throw new Error('Los permisos se gestionan por rol. Use copiar entre roles desde Roles.');
  }

  static async getAllPermisos() {
    const result = await pool.query(`
      SELECT pr.*, r.nombre_rol
      FROM permisos_rol pr
      JOIN roles r ON r.id_rol = pr.id_rol
      ORDER BY r.nombre_rol, pr.menu_item_id
    `);
    return result.rows;
  }

  static async verificarPermiso(idUsuario, menuItemId, accion) {
    const rows = await this.getPermisosByUsuario(idUsuario);
    const perm = rows.find((p) => p.menu_item_id === menuItemId);
    if (!perm) return false;
    const acciones = parseAcciones(perm.acciones);
    if (acciones.includes('*')) return true;
    const a = String(accion || 'ver').toLowerCase();
    if (acciones.includes(a)) return true;
    // aliases
    if (['crear', 'editar', 'actualizar'].includes(a) && acciones.includes('modificar')) return true;
    if (a === 'modificar' && (acciones.includes('crear') || acciones.includes('editar'))) return true;
    return false;
  }

  static async getRolById(idRol) {
    const r = await pool.query(`SELECT * FROM roles WHERE id_rol = $1`, [idRol]);
    return r.rows[0] || null;
  }

  static async getAllRoles() {
    const r = await pool.query(
      `SELECT * FROM roles WHERE COALESCE(activo, TRUE) = TRUE ORDER BY nombre_rol`
    );
    return r.rows;
  }

  static parseAcciones = parseAcciones;
  static normalizeAcciones = normalizeAcciones;
}

module.exports = PermisosModel;
