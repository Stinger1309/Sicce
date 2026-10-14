require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, '../sql/credito_aval_entregado.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('Columnas aval_entregado / aval_descargas OK');
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
