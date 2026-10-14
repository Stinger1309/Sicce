const RespaldoModel = require('../models/respaldoModel');

const INTERVALO_DIAS = Math.max(
  1,
  parseInt(process.env.BACKUP_INTERVAL_DAYS || '15', 10) || 15
);
/** Revisión periódica (por defecto cada 6 horas) */
const CHECK_MS = Math.max(
  60 * 1000,
  parseInt(process.env.BACKUP_CHECK_MS || String(6 * 60 * 60 * 1000), 10) || 6 * 60 * 60 * 1000
);

let timer = null;
let running = false;

async function ejecutarSiCorresponde(motivo = 'scheduler') {
  if (running) {
    console.log('⏳ Respaldo automático: ya hay uno en curso, se omite');
    return { skipped: true, reason: 'in_progress' };
  }

  running = true;
  try {
    await RespaldoModel.ensureSchema();
    const estado = await RespaldoModel.getEstadoProgramacion(INTERVALO_DIAS);

    if (!estado.debe_ejecutar) {
      console.log(
        `💾 Respaldo automático: no requerido aún (último hace ${estado.dias_desde_ultimo} día(s); intervalo ${INTERVALO_DIAS})`
      );
      return { skipped: true, reason: 'too_soon', estado };
    }

    console.log(`💾 Respaldo automático iniciado (${motivo})...`);
    const { buffer, nombreArchivo, metodo } = await RespaldoModel.generarRespaldo();
    const { registro } = await RespaldoModel.guardarEnDisco({
      buffer,
      nombreArchivo,
      metodo,
      origen: 'automatico',
      id_usuario: null,
      usuario_nombre: 'Sistema (automático)',
    });

    console.log(
      `✅ Respaldo automático listo: ${nombreArchivo} (${(buffer.length / 1024).toFixed(1)} KB) vía ${metodo}`
    );
    return { skipped: false, registro, metodo };
  } catch (error) {
    console.error('❌ Error en respaldo automático:', error.message);
    try {
      await RespaldoModel.registrarHistorial({
        id_usuario: null,
        usuario_nombre: 'Sistema (automático)',
        nombre_archivo: `fallido_${Date.now()}.sql`,
        tipo: 'automatico',
        tamanio_bytes: 0,
        estado: 'fallido',
        observaciones: `Error: ${error.message}`,
        origen: 'automatico',
      });
    } catch (_) {
      /* ignore */
    }
    return { skipped: false, error: error.message };
  } finally {
    running = false;
  }
}

function iniciarRespaldoScheduler() {
  if (timer) return;

  console.log(
    `🗓️  Scheduler de respaldos: cada ${INTERVALO_DIAS} días (revisión cada ${Math.round(CHECK_MS / 3600000)} h)`
  );

  // Primera revisión al arrancar (con leve demora para que la BD esté lista)
  setTimeout(() => {
    ejecutarSiCorresponde('startup').catch(() => {});
  }, 15000);

  timer = setInterval(() => {
    ejecutarSiCorresponde('interval').catch(() => {});
  }, CHECK_MS);

  if (typeof timer.unref === 'function') timer.unref();
}

function detenerRespaldoScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  INTERVALO_DIAS,
  iniciarRespaldoScheduler,
  detenerRespaldoScheduler,
  ejecutarSiCorresponde,
};
