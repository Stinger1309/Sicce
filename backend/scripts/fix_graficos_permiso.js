require('dotenv').config();
const pool = require('../config/db');

(async () => {
  // Permiso graficos para todos los usuarios admin existentes
  const admins = await pool.query(`
    SELECT u.id FROM usuario u
    JOIN roles r ON u.id_rol_usu = r.id_rol
    WHERE LOWER(TRIM(r.nombre_rol)) IN ('administrador', 'admin')
       OR LOWER(TRIM(r.nombre_rol)) NOT IN ('emprendedor')
  `);

  for (const row of admins.rows) {
    await pool.query(
      `INSERT INTO Permisos (id_usu, menu_item_id, acciones)
       SELECT $1, 'graficos', $2
       WHERE NOT EXISTS (
         SELECT 1 FROM Permisos WHERE id_usu = $1 AND menu_item_id = 'graficos'
       )`,
      [row.id, JSON.stringify(['ver', 'exportar'])]
    );
  }

  console.log('Permisos graficos OK para', admins.rows.length, 'usuario(s)');
  console.log('Roles actuales:');
  const roles = await pool.query('SELECT id_rol, nombre_rol FROM roles ORDER BY id_rol');
  console.table(roles.rows);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
