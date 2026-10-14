const AuditoriaModel = require('../models/auditoriaModel');

/**
 * Registra un evento de auditoría. No lanza error al llamante si falla el log.
 */
async function registrarAuditoria(datos) {
  try {
    return await AuditoriaModel.create(datos);
  } catch (error) {
    console.error('Error al registrar auditoría:', error.message);
    return null;
  }
}

/**
 * Extrae info del usuario desde headers/body/localStorage proxy del frontend.
 */
function obtenerUsuarioDesdeRequest(req) {
  const id =
    req.headers['x-user-id'] ||
    req.body?.id_usuario_auditoria ||
    req.query?.id_usuario_auditoria ||
    null;

  const nombre =
    req.headers['x-user-name'] ||
    req.body?.usuario_nombre_auditoria ||
    req.query?.usuario_nombre_auditoria ||
    null;

  return {
    id_usuario: id ? parseInt(id, 10) || null : null,
    usuario_nombre: nombre ? decodeURIComponent(String(nombre)) : null
  };
}

function obtenerIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

const MODULO_POR_RUTA = {
  '/api/solicitud': 'Solicitudes',
  '/api/expediente': 'Expedientes',
  '/api/inspeccion': 'Inspecciones',
  '/api/aprobacion': 'Aprobaciones',
  '/api/contrato': 'Contratos',
  '/api/desembolso': 'Desembolsos',
  '/api/cuota': 'Pagos de Cuota',
  '/api/usuarios': 'Usuarios',
  '/api/roles': 'Roles',
  '/api/permisos': 'Permisos',
  '/api/requisitos': 'Requisitos',
  '/api/clasificacion_emprendimiento': 'Emprendimientos',
  '/api/configuracion_contrato': 'Configuración Contratos',
  '/api/emprendimiento': 'Emprendimientos',
  '/api/auditoria': 'Auditoría',
  '/api/respaldo': 'Respaldo BD'
};

function resolverModulo(path = '') {
  const match = Object.keys(MODULO_POR_RUTA).find(prefix => path.startsWith(prefix));
  return match ? MODULO_POR_RUTA[match] : 'Sistema';
}

function resolverAccion(method, path = '') {
  if (path.includes('/export') || path.includes('/exportar') || path.includes('/backup')) {
    return 'exportar';
  }
  switch ((method || '').toUpperCase()) {
    case 'POST':
      return 'crear';
    case 'PUT':
    case 'PATCH':
      return 'editar';
    case 'DELETE':
      return 'eliminar';
    default:
      return 'consultar';
  }
}

/**
 * Middleware que registra automáticamente mutaciones exitosas (POST/PUT/PATCH/DELETE).
 */
function middlewareAuditoria(req, res, next) {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  // Evitar bucle al registrar auditoría
  if (req.path.startsWith('/auditoria') || req.originalUrl.includes('/api/auditoria')) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const success = body?.success !== false && res.statusCode < 400;

    if (success) {
      const usuario = obtenerUsuarioDesdeRequest(req);
      const modulo = resolverModulo(req.originalUrl || req.baseUrl || '');
      const accion = resolverAccion(method, req.originalUrl || '');
      const registroId =
        req.params?.id ||
        body?.data?.id ||
        body?.data?.id_solicitud ||
        body?.data?.id_expediente ||
        body?.data?.id_auditoria ||
        null;

      setImmediate(() => {
        registrarAuditoria({
          ...usuario,
          modulo,
          accion,
          descripcion: `${accion.toUpperCase()} en ${modulo} — ${req.method} ${req.originalUrl}`,
          tabla_afectada: modulo,
          registro_id: registroId,
          datos_nuevos: method !== 'DELETE' ? (body?.data || req.body) : null,
          datos_anteriores: method === 'DELETE' ? (body?.data || null) : null,
          ip_address: obtenerIp(req),
          user_agent: req.headers['user-agent'] || null
        });
      });
    }

    return originalJson(body);
  };

  next();
}

module.exports = {
  registrarAuditoria,
  obtenerUsuarioDesdeRequest,
  obtenerIp,
  middlewareAuditoria,
  resolverModulo,
  resolverAccion
};
