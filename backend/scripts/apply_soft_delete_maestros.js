const pool = require('../config/db');

async function run() {
  const statements = [
    `ALTER TABLE roles ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE`,
    `ALTER TABLE requisitos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE`,
    `ALTER TABLE clasificacion_emprendimiento ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE`,
    `ALTER TABLE configuracion_contrato ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE`,
    `UPDATE roles SET activo = TRUE WHERE activo IS NULL`,
    `UPDATE requisitos SET activo = TRUE WHERE activo IS NULL`,
    `UPDATE clasificacion_emprendimiento SET activo = TRUE WHERE activo IS NULL`,
    `UPDATE configuracion_contrato SET activo = TRUE WHERE activo IS NULL`,
  ];
  for (const sql of statements) {
    await pool.query(sql);
    console.log('OK:', sql.slice(0, 60));
  }
  console.log('Soft delete maestros aplicado');
  await pool.end();
}

run().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
