const pool = require('../config/db');

(async () => {
  try {
    const r = await pool.query(`
      SELECT c.id_contrato, c.numero_contrato, c.id_cedula_aprob,
             a.cedula_persona_id, c.estatus, c.id_aprob
      FROM contrato c
      LEFT JOIN aprobacion a ON a.id_aprobacion = c.id_aprob
      WHERE c.id_contrato = 1
    `);
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
