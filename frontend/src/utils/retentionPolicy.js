/** Política de retención en frontend (espejo del backend). */
export const RETENTION_YEARS = 10;

export const RETENTION_MESSAGE = `Política de retención: no se pueden eliminar registros ni usuarios hasta dentro de ${RETENTION_YEARS} años.`;

export function blockDeleteWithAlert(entityLabel = "registro") {
  const msg = `No se puede eliminar este ${entityLabel}. ${RETENTION_MESSAGE}`;
  if (typeof window !== "undefined") {
    window.alert(msg);
  }
  return false;
}
