require('dotenv').config();
const pool = require('../config/db');

(async () => {
  await pool.query(`
    INSERT INTO roles (nombre_rol)
    SELECT 'Administrador'
    WHERE NOT EXISTS (
      SELECT 1 FROM roles
      WHERE LOWER(TRIM(nombre_rol)) IN ('administrador', 'admin')
    )
  `);

  const roles = await pool.query('SELECT id_rol, nombre_rol FROM roles ORDER BY id_rol');
  console.log('Roles:', roles.rows);

  const staff = await pool.query(`
    SELECT COUNT(*)::int AS total
    FROM usuario u
    WHERE u.id_rol_usu <> 1
  `);
  console.log('Usuarios administrativos:', staff.rows[0].total);

  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
