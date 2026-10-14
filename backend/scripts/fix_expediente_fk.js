require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/fix_expediente_fk.sql'), 'utf8');
  await pool.query(sql);

  const fks = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'expediente'::regclass
      AND contype = 'f'
    ORDER BY conname
  `);
  console.log('FK de expediente corregidas. Restricciones actuales:');
  console.table(fks.rows);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
