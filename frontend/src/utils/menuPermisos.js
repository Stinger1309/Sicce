/**
 * Catálogo de módulos y acciones para permisos por ROL.
 * Acciones estándar: ver | modificar | eliminar | exportar
 */
export const ACCIONES_ESTANDAR = ['ver', 'modificar', 'eliminar', 'exportar'];

export const ESTRUCTURA_MENU = {
  dashboard: {
    nombre: 'Panel General',
    menu_item_id: 'dashboard',
    seccion: 'principal',
    acciones_disponibles: ['ver', 'exportar'],
  },
  graficos: {
    nombre: 'Gráficos',
    menu_item_id: 'graficos',
    seccion: 'principal',
    acciones_disponibles: ['ver', 'exportar'],
  },
  solicitudes: {
    nombre: 'Solicitudes',
    menu_item_id: 'solicitudes',
    seccion: 'principal',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  expedientes: {
    nombre: 'Expedientes',
    menu_item_id: 'expedientes',
    seccion: 'principal',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  inspecciones: {
    nombre: 'Inspecciones',
    menu_item_id: 'inspecciones',
    seccion: 'principal',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  aprobaciones: {
    nombre: 'Aprobaciones',
    menu_item_id: 'aprobaciones',
    seccion: 'principal',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  citas: {
    nombre: 'Citas',
    menu_item_id: 'citas',
    seccion: 'principal',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  creditos_banco: {
    nombre: 'Crédito a Banco',
    menu_item_id: 'creditos_banco',
    seccion: 'financiero',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  desembolsos: {
    nombre: 'Desembolso',
    menu_item_id: 'desembolsos',
    seccion: 'financiero',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar', 'confirmar', 'denegar'],
  },
  pagos_cuota: {
    nombre: 'Pago de Cuota',
    menu_item_id: 'pagos_cuota',
    seccion: 'financiero',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar', 'registrar', 'verificar'],
  },
  contratos: {
    nombre: 'Contratos',
    menu_item_id: 'contratos',
    seccion: 'financiero',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar', 'aceptar', 'rechazar'],
  },
  config_usuarios: {
    nombre: 'Usuarios',
    menu_item_id: 'config_usuarios',
    seccion: 'sistema',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  config_emprendimientos: {
    nombre: 'Emprendimientos',
    menu_item_id: 'config_emprendimientos',
    seccion: 'sistema',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  config_roles: {
    nombre: 'Roles, áreas y permisos',
    menu_item_id: 'config_roles',
    seccion: 'sistema',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  config_contratos: {
    nombre: 'Config. Contratos',
    menu_item_id: 'config_contratos',
    seccion: 'sistema',
    acciones_disponibles: ['ver', 'modificar', 'exportar'],
  },
  config_requisitos: {
    nombre: 'Requisitos',
    menu_item_id: 'config_requisitos',
    seccion: 'sistema',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  config_bancos: {
    nombre: 'Bancos',
    menu_item_id: 'config_bancos',
    seccion: 'sistema',
    acciones_disponibles: ['ver', 'modificar', 'eliminar', 'exportar'],
  },
  auditoria: {
    nombre: 'Auditoría',
    menu_item_id: 'auditoria',
    seccion: 'sistema',
    acciones_disponibles: ['ver', 'exportar', 'eliminar'],
  },
  respaldo_bd: {
    nombre: 'Respaldo BD',
    menu_item_id: 'respaldo_bd',
    seccion: 'sistema',
    acciones_disponibles: ['ver', 'modificar', 'exportar'],
  },
};

export function parseAcciones(raw) {
  try {
    if (Array.isArray(raw)) return raw;
    if (!raw) return [];
    const s = String(raw).trim();
    if (s === '*') return ['ver', 'modificar', 'eliminar', 'exportar'];
    if (s.startsWith('[')) return JSON.parse(s);
    return s.split(',').map((x) => x.trim()).filter(Boolean).map((p) => {
      if (['crear', 'editar', 'actualizar'].includes(p)) return 'modificar';
      return p;
    });
  } catch {
    return [];
  }
}

export function tieneAccion(accionesRaw, accion) {
  const acciones = parseAcciones(accionesRaw);
  if (acciones.includes('*')) return true;
  const a = String(accion || 'ver').toLowerCase();
  if (acciones.includes(a)) return true;
  if (['crear', 'editar', 'actualizar'].includes(a) && acciones.includes('modificar')) return true;
  return false;
}
