require('dotenv').config();
const pool = require('../config/db');

(async () => {
  const r = await pool.query(
    `UPDATE inspeccion
     SET estatus_inspeccion = 'Completada', updated_at = CURRENT_TIMESTAMP
     WHERE estatus_inspeccion IN ('En Revisión', 'En Revision')
     RETURNING id_inspeccion, id_codigo_exp`
  );
  console.log('Inspecciones migradas:', r.rows);

  const ids = [...new Set(r.rows.map((x) => x.id_codigo_exp))];
  for (const id of ids) {
    const p = await pool.query(
      `SELECT COUNT(*)::int AS n FROM inspeccion
       WHERE id_codigo_exp = $1
         AND estatus_inspeccion IN ('Pendiente', 'En Revisión', 'En Proceso')`,
      [id]
    );
    if (p.rows[0].n === 0) {
      await pool.query(
        `UPDATE expediente
         SET estatus = 'Listo para aprobación', updated_at = CURRENT_TIMESTAMP
         WHERE id_expediente = $1`,
        [id]
      );
      console.log('Expediente', id, '-> Listo para aprobación');
    }
  }

  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
