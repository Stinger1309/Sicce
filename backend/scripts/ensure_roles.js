require('dotenv').config();
const pool = require('../config/db');

const ROLES = [
  { nombre: 'Emprendedor', requiere_area: false, unico: false },
  { nombre: 'Inspector', requiere_area: true, unico: false },
  { nombre: 'Presidente(a)', requiere_area: false, unico: true },
  { nombre: 'Administrador', requiere_area: false, unico: true },
  { nombre: 'Director', requiere_area: true, unico: false },
  { nombre: 'Secretaria', requiere_area: true, unico: false },
];

(async () => {
  for (const rol of ROLES) {
    await pool.query(
      `INSERT INTO roles (nombre_rol, requiere_area, unico, activo)
       SELECT $1, $2, $3, TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM roles WHERE LOWER(TRIM(nombre_rol)) = LOWER(TRIM($1))
       )`,
      [rol.nombre, rol.requiere_area, rol.unico]
    );
    await pool.query(
      `UPDATE roles
       SET requiere_area = $2, unico = $3, updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(TRIM(nombre_rol)) = LOWER(TRIM($1))`,
      [rol.nombre, rol.requiere_area, rol.unico]
    );
  }

  const roles = await pool.query('SELECT id_rol, nombre_rol FROM roles ORDER BY id_rol');
  console.log('Roles OK:', roles.rows);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
