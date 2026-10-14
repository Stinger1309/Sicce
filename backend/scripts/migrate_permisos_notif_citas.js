require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/permisos_notif_citas.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migración permisos_rol / notificaciones / citas OK');
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
