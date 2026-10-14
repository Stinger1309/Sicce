require('dotenv').config();
const pool = require('../config/db');

(async () => {
  // Insertar permiso para quienes ya tienen otros permisos de configuración
  const r = await pool.query(`
    INSERT INTO Permisos (id_usu, menu_item_id, acciones)
    SELECT DISTINCT p.id_usu, 'config_bancos', '["ver", "crear", "editar", "eliminar", "exportar"]'
    FROM Permisos p
    WHERE p.menu_item_id IN ('config_requisitos', 'config_usuarios', 'dashboard')
    AND NOT EXISTS (
      SELECT 1 FROM Permisos p2
      WHERE p2.id_usu = p.id_usu AND p2.menu_item_id = 'config_bancos'
    )
  `);
  console.log('Permisos config_bancos insertados:', r.rowCount);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
