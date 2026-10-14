require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '../sql/solicitud_inspector_citas.sql'),
    'utf8'
  );
  await pool.query(sql);

  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='solicitud' AND column_name='id_inspector'`
  );
  const backfill = await pool.query(
    `SELECT id_solicitud, id_inspector, estatus FROM solicitud
     WHERE id_inspector IS NOT NULL ORDER BY id_solicitud`
  );
  console.log('Columna id_inspector en solicitud:', cols.rows.length ? 'OK' : 'FALTA');
  console.log('Solicitudes con inspector:', backfill.rows);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
