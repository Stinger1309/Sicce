/**
 * Utilidades de roles — siempre preferir nombre_rol sobre IDs fijos.
 * IDs de referencia actuales (pueden variar entre BDs):
 *  1 Admin | 2 Emprendedor | 3 Inspector | 4 Presidente(a)
 */

export const ROLES = {
  ADMINISTRADOR: 'administrador',
  EMPRENDEDOR: 'emprendedor',
  INSPECTOR: 'inspector',
  PRESIDENTE: 'presidente(a)',
  DIRECTOR: 'director',
  SECRETARIA: 'secretaria',
};

export function nombreRol(userOrRol) {
  if (!userOrRol) return '';
  if (typeof userOrRol === 'string') return userOrRol.toLowerCase().trim();
  return String(userOrRol.nombre_rol || userOrRol.rol || '').toLowerCase().trim();
}

export function esEmprendedor(user) {
  if (!user) return false;
  const n = nombreRol(user);
  if (n === ROLES.EMPRENDEDOR || n.includes('emprendedor')) return true;
  // Fallback solo si no hay nombre_rol (IDs pueden variar entre BDs)
  if (!n) {
    const id = parseInt(user.id_rol_usu ?? user.id_rol, 10);
    return id === 2;
  }
  return false;
}

export function esInspector(user) {
  const n = nombreRol(user);
  return n === ROLES.INSPECTOR || n.includes('inspector');
}

export function esAdministrador(user) {
  const n = nombreRol(user);
  return n === ROLES.ADMINISTRADOR || n === 'admin' || n.startsWith('administrador');
}

export function esPresidente(user) {
  const n = nombreRol(user);
  return n === ROLES.PRESIDENTE || n.includes('presid');
}

export function esDirector(user) {
  const n = nombreRol(user);
  return n === ROLES.DIRECTOR || n.startsWith('director');
}

export function esSecretaria(user) {
  const n = nombreRol(user);
  return n === ROLES.SECRETARIA || n.includes('secretar');
}

export function codigoArea(user) {
  if (!user) return '';
  return String(user.codigo_area || user.nombre_area || '').toLowerCase().trim();
}

export function esAreaCobranzas(user) {
  const a = codigoArea(user);
  return a.includes('cobran');
}

export function esAreaAdministracion(user) {
  const a = codigoArea(user);
  return a.includes('admin');
}

/** Solo presidente y administrador ven métricas / gráficos. */
export function puedeVerMetricas(user) {
  return esAdministrador(user) || esPresidente(user);
}

/** Solo presidente y administrador exportan Excel / PDF. */
export function puedeExportar(user) {
  return esAdministrador(user) || esPresidente(user);
}

/** Pre-aprobar / rechazar solicitudes: solo administrador. El inspector no ve este módulo. */
export function puedeAccionarSolicitudes(user) {
  return esAdministrador(user);
}

export function esPersonalAdmin(user) {
  return !!user && !esEmprendedor(user);
}

/** Ruta de inicio según rol y área. */
export function rutaInicioSesion(user) {
  if (!user) return '/Login';
  if (esEmprendedor(user)) return '/Solicitud';
  if (puedeVerMetricas(user)) return '/Dashboard';
  if (esDirector(user) && esAreaCobranzas(user)) return '/Cuota';
  if (esDirector(user) && esAreaAdministracion(user)) return '/Contrato';
  if (esInspector(user)) return '/Inspeccion';
  if (esSecretaria(user) && esAreaCobranzas(user)) return '/Cuota';
  if (esSecretaria(user) && esAreaAdministracion(user)) return '/Contrato';
  if (esSecretaria(user)) return '/Solicitud';
  return '/Solicitud';
}

/** Filtra usuarios con rol Inspector (por nombre; fallback id_rol_usu === 3) */
export function filtrarInspectores(usuarios = []) {
  return usuarios.filter((u) => {
    if (esInspector(u)) return true;
    const id = parseInt(u.id_rol_usu ?? u.id_rol, 10);
    return id === 3;
  });
}

export function findRolId(roles = [], nombreBuscado) {
  const target = String(nombreBuscado).toLowerCase().trim();
  const found = roles.find(
    (r) => String(r.nombre_rol || '').toLowerCase().trim() === target
      || String(r.nombre_rol || '').toLowerCase().includes(target)
  );
  return found?.id_rol ?? null;
}

export function rolRequiereArea(rol) {
  if (!rol) return false;
  if (rol.requiere_area === true || rol.requiere_area === 't' || rol.requiere_area === 1) {
    return true;
  }
  const n = nombreRol(rol);
  return (
    n === ROLES.DIRECTOR ||
    n.startsWith('director') ||
    n.includes('secretar') ||
    n.includes('inspect')
  );
}

export default {
  ROLES,
  nombreRol,
  esEmprendedor,
  esInspector,
  esAdministrador,
  esPresidente,
  esDirector,
  esSecretaria,
  codigoArea,
  esAreaCobranzas,
  esAreaAdministracion,
  puedeVerMetricas,
  puedeExportar,
  puedeAccionarSolicitudes,
  esPersonalAdmin,
  rutaInicioSesion,
  filtrarInspectores,
  findRolId,
  rolRequiereArea,
};
