require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/expediente_verificacion.sql'), 'utf8');
  await pool.query(sql);
  console.log('Columna verificacion_documentos OK');
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
