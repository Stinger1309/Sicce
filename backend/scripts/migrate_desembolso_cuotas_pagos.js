require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

(async () => {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../sql/desembolso_cuotas_pagos.sql'),
      'utf8'
    );
    await pool.query(sql);
    console.log('OK migración desembolso/cuotas/pagos + permisos');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
