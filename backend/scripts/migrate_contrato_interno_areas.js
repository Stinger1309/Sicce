require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function columnExists(table, column) {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column]
  );
  return r.rows.length > 0;
}

async function dropPermisosRolUnique() {
  const r = await pool.query(`
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'permisos_rol'
      AND con.contype = 'u'
  `);
  for (const row of r.rows) {
    await pool.query(`ALTER TABLE permisos_rol DROP CONSTRAINT IF EXISTS ${row.conname}`);
  }
  await pool.query(`DROP INDEX IF EXISTS permisos_rol_id_rol_menu_item_id_key`);
}

(async () => {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, '../sql/contrato_interno_areas.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);

    await dropPermisosRolUnique();
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_permisos_rol_area_menu
      ON permisos_rol (id_rol, COALESCE(id_area, 0), menu_item_id)
    `);

    await client.query(`
      UPDATE roles SET unico = TRUE, requiere_area = FALSE
      WHERE LOWER(TRIM(nombre_rol)) IN ('administrador', 'admin')
         OR LOWER(TRIM(nombre_rol)) LIKE 'administrador%'
         OR LOWER(TRIM(nombre_rol)) LIKE '%presid%'
    `);

    await client.query(`
      UPDATE roles SET requiere_area = TRUE, unico = FALSE
      WHERE LOWER(TRIM(nombre_rol)) IN ('director', 'secretaria', 'inspector')
         OR LOWER(TRIM(nombre_rol)) LIKE 'director%'
         OR LOWER(TRIM(nombre_rol)) LIKE 'secretar%'
         OR LOWER(TRIM(nombre_rol)) LIKE '%inspect%'
    `);

    await client.query(`
      UPDATE roles SET requiere_area = FALSE, unico = FALSE
      WHERE LOWER(TRIM(nombre_rol)) LIKE '%emprendedor%'
    `);

    // Emprendedor: ya no acepta contrato ni confirma desembolso
    const emp = await client.query(`
      SELECT id_rol FROM roles
      WHERE LOWER(TRIM(nombre_rol)) LIKE '%emprendedor%'
      LIMIT 1
    `);
    if (emp.rows[0]) {
      const idRol = emp.rows[0].id_rol;
      await client.query(
        `DELETE FROM permisos_rol WHERE id_rol = $1 AND menu_item_id = 'desembolsos'`,
        [idRol]
      );
      await client.query(
        `UPDATE permisos_rol
         SET acciones = '["ver"]', updated_at = CURRENT_TIMESTAMP
         WHERE id_rol = $1 AND menu_item_id = 'contratos'`,
        [idRol]
      );
    }

    console.log('Migración contrato interno + áreas OK');
    console.log('foto_contrato:', await columnExists('contrato', 'foto_contrato'));
    console.log('usuario.id_area:', await columnExists('usuario', 'id_area'));
    console.log('permisos_rol.id_area:', await columnExists('permisos_rol', 'id_area'));
  } catch (e) {
    console.error('Error en migración:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
