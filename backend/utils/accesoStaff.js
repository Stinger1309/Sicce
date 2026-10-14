const pool = require('../config/db');

async function getRolUsuario(idUsuario) {
  const id = parseInt(idUsuario, 10);
  if (!id) return null;
  const r = await pool.query(
    `SELECT LOWER(TRIM(r.nombre_rol)) AS rol
     FROM usuario u
     JOIN roles r ON r.id_rol = u.id_rol_usu
     WHERE u.id = $1`,
    [id]
  );
  return r.rows[0]?.rol || null;
}

function esAdminOPresidente(rol) {
  const n = String(rol || '').toLowerCase();
  return n === 'administrador' || n === 'admin' || n.startsWith('administrador') || n.includes('presid');
}

async function puedeVerMetricasOExportar(req) {
  const id = req.headers['x-user-id'];
  const rol = await getRolUsuario(id);
  return esAdminOPresidente(rol);
}

module.exports = {
  getRolUsuario,
  esAdminOPresidente,
  puedeVerMetricasOExportar,
};
