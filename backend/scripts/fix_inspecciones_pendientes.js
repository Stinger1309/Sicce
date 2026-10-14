require('dotenv').config();
const pool = require('../config/db');

(async () => {
  try {
    const r = await pool.query(`
      UPDATE inspeccion i
      SET estatus_inspeccion = 'Completada',
          updated_at = CURRENT_TIMESTAMP
      WHERE estatus_inspeccion IN ('Pendiente', 'En Revisión', 'En Proceso')
        AND EXISTS (
          SELECT 1 FROM inspeccion c
          WHERE c.id_codigo_exp = i.id_codigo_exp
            AND c.id_inspeccion <> i.id_inspeccion
            AND c.estatus_inspeccion IN (
              'Completada', 'Aprobado', 'Aprobado con observaciones', 'Rechazado'
            )
        )
      RETURNING id_inspeccion, id_codigo_exp, estatus_inspeccion
    `);
    console.log('Cerradas:', r.rows);

    const e = await pool.query(`
      UPDATE expediente e
      SET estatus = 'Listo para aprobación',
          updated_at = CURRENT_TIMESTAMP
      WHERE EXISTS (
          SELECT 1 FROM inspeccion i WHERE i.id_codigo_exp = e.id_expediente
        )
        AND NOT EXISTS (
          SELECT 1 FROM inspeccion i2
          WHERE i2.id_codigo_exp = e.id_expediente
            AND i2.estatus_inspeccion IN ('Pendiente', 'En Revisión', 'En Proceso')
        )
        AND e.estatus NOT IN ('Aprobado', 'Rechazado', 'Listo para aprobación')
      RETURNING id_expediente, estatus
    `);
    console.log('Expedientes:', e.rows);

    const all = await pool.query(
      'SELECT id_inspeccion, id_codigo_exp, estatus_inspeccion FROM inspeccion ORDER BY id_inspeccion'
    );
    console.table(all.rows);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
