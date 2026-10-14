require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/bancos_credito.sql'), 'utf8');
  await pool.query(sql);
  const bancos = await pool.query('SELECT COUNT(*)::int AS n FROM bancos');
  console.log('Migración bancos OK. Bancos:', bancos.rows[0].n);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
