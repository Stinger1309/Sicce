const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');


// Importaciones de las rutas (./routes relativo a este archivo = backend/routes)
const personaRoutes = require('./routes/personaRoutes');
const rolRoutes = require('./routes/rolRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const clasifEmprendimientoRoutes = require('./routes/clasifEmprenRoutes');
const solicitudRoutes = require('./routes/solicitudRoutes');
const emprendimientoRoutes = require('./routes/emprendimientoRoutes');
const requisitosRoutes = require('./routes/requisitosRoutes');
const expedienteRoutes = require('./routes/expedienteRoutes');
const configuracion_contratoRoutes = require('./routes/configuracion_contratoRoutes');
const inspeccionRoutes = require('./routes/inspeccionRoutes');
const aprobacionRoutes = require('./routes/aprobacionRoutes');
const contratoRoutes = require('./routes/contratoRoutes');
const desembolsoRoutes = require('./routes/desembolsoRoutes');
const cuotasRoutes = require('./routes/cuotaRoute');
const permisosRoutes = require('./routes/permisosRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');
const respaldoRoutes = require('./routes/respaldoRoutes');
const exportRoutes = require('./routes/exportRoutes');
const metricasRoutes = require('./routes/metricasRoutes');

const recuperacionRoutes = require('./routes/recuperacionRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { middlewareAuditoria } = require('./services/auditoriaService');
const { blockDeleteMiddleware } = require('./middleware/retentionPolicy');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ AUMENTAR LÍMITE DE TAMAÑO PARA JSON Y URLENCODED
app.use(cors());
app.use(express.json({ limit: '50mb' }));  // Aumentado a 50MB
app.use(express.urlencoded({ extended: true, limit: '50mb' }));  // Aumentado a 50MB

// Archivos subidos (comprobantes de pago, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Política de retención: bloquear DELETE de registros/usuarios (10 años)
app.use('/api', blockDeleteMiddleware);

// Auditoría automática de mutaciones
app.use('/api', middlewareAuditoria);

// Rutas
app.use('/api', personaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/areas', require('./routes/areaRoutes'));
app.use('/api/clasificacion_emprendimiento', clasifEmprendimientoRoutes);
app.use('/api/solicitud', solicitudRoutes);
app.use('/api/emprendimiento', emprendimientoRoutes);
app.use('/api/requisitos', requisitosRoutes);
app.use('/api/expediente', expedienteRoutes);
app.use('/api/configuracion_contrato', configuracion_contratoRoutes);
app.use('/api/inspeccion', inspeccionRoutes);
app.use('/api/aprobacion', aprobacionRoutes);
app.use('/api/contrato', contratoRoutes);
app.use('/api/desembolso', desembolsoRoutes);
app.use('/api/cuota', cuotasRoutes);
app.use('/api/permisos', permisosRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/respaldo', respaldoRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/metricas', metricasRoutes);
app.use('/api/bancos', require('./routes/bancoRoutes'));
app.use('/api/notificaciones', require('./routes/notificacionRoutes'));
app.use('/api/citas', require('./routes/citaRoutes'));
app.use('/api/uvc', require('./routes/uvcRoutes'));
console.log('📦 Montando /api/upload ...');
app.use('/api/upload', uploadRoutes);
app.get('/api/upload/ping', (req, res) => res.json({ success: true, ping: 'upload-ok' }));

app.use('/api/recuperacion', recuperacionRoutes);

app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor funcionando' });
});

// Diagnóstico: estado del servidor y de la base de datos
app.get('/api/health', async (req, res) => {
  const pool = require('./config/db');
  try {
    const r = await pool.query('SELECT 1 AS ok, NOW() AS server_time');
    res.json({
      success: true,
      server: 'ok',
      database: 'ok',
      time: r.rows[0]?.server_time || null,
      nodeEnv: process.env.NODE_ENV || 'undefined',
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    });
  } catch (error) {
    console.error('Health DB error:', error);
    res.status(500).json({
      success: false,
      server: 'ok',
      database: 'error',
      error: error?.message || error?.code || String(error) || 'Error de conexión a PostgreSQL',
      nodeEnv: process.env.NODE_ENV || 'undefined',
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  try {
    const { iniciarRespaldoScheduler } = require('./services/respaldoScheduler');
    iniciarRespaldoScheduler();
  } catch (e) {
    console.warn('No se pudo iniciar el scheduler de respaldos:', e.message);
  }
});