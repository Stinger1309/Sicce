/**
 * Política de retención: no eliminar registros/usuarios hasta que
 * hayan transcurrido RETENTION_YEARS desde su creación.
 */
const RETENTION_YEARS = 10;

function yearsBetween(fromDate, toDate = new Date()) {
  const from = new Date(fromDate);
  if (Number.isNaN(from.getTime())) return 0;
  const ms = toDate.getTime() - from.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

function canDeleteByDate(createdAt) {
  if (!createdAt) return false;
  return yearsBetween(createdAt) >= RETENTION_YEARS;
}

function retentionError(createdAt) {
  const yearsLeft = Math.max(0, RETENTION_YEARS - yearsBetween(createdAt || new Date()));
  const approxYears = Math.ceil(yearsLeft);
  return {
    success: false,
    code: 'RETENTION_POLICY',
    error: `Política de retención: no se puede eliminar este registro hasta dentro de ${approxYears} año(s) (mínimo ${RETENTION_YEARS} años desde su creación).`,
  };
}

/**
 * Middleware Express: bloquea HTTP DELETE físico de entidades.
 * Excepciones (borrado lógico / desactivación):
 * - /api/bancos
 * - /api/roles
 * - /api/requisitos
 * - /api/clasificacion_emprendimiento
 * - /api/configuracion_contrato
 * Usuarios NO están en la excepción (permanecen bloqueados).
 */
function blockDeleteMiddleware(req, res, next) {
  if (req.method !== 'DELETE') return next();

  const fullPath = `${req.baseUrl || ''}${req.path || ''}`;
  const url = req.originalUrl || fullPath;
  const allowPrefixes = [
    '/api/bancos',
    '/api/roles',
    '/api/requisitos',
    '/api/clasificacion_emprendimiento',
    '/api/configuracion_contrato',
  ];
  if (allowPrefixes.some((p) => fullPath.startsWith(p) || url.startsWith(p))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    code: 'RETENTION_POLICY',
    error: `Política de retención: no se pueden eliminar registros ni usuarios hasta dentro de ${RETENTION_YEARS} años.`,
  });
}

module.exports = {
  RETENTION_YEARS,
  canDeleteByDate,
  retentionError,
  blockDeleteMiddleware,
};
