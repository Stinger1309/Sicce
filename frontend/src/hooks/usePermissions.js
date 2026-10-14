// hooks/usePermissions.js
import { useMemo } from 'react';
import usuarioAPI from '../services/api_usuario';

const MENU_PERMISSIONS = {
  // PRINCIPAL
  panel: ['ver_dashboard', 'admin'],
  // OPERACIONES
  sol: ['gestionar_solicitudes', 'ver_solicitudes', 'admin'],
  exp: ['gestionar_expedientes', 'ver_expedientes', 'admin'],
  ins: ['gestionar_inspecciones', 'ver_inspecciones', 'admin'],
  apr: ['gestionar_aprobaciones', 'ver_aprobaciones', 'admin'],
  // GESTIÓN FINANCIERA
  banc: ['gestionar_bancarios', 'ver_bancarios', 'admin'],
  cont: ['gestionar_contratos', 'ver_contratos', 'admin'],
  des: ['gestionar_desembolsos', 'ver_desembolsos', 'admin'],
  cuo: ['gestionar_cuotas', 'ver_cuotas', 'admin'],
  // CONFIGURACIÓN
  settings: ['admin', 'configurar_sistema'],
  user: ['gestionar_usuarios', 'admin'],
  empr: ['gestionar_emprendimientos', 'admin'],
  roles: ['gestionar_roles', 'admin'],
  configCont: ['gestionar_contratos_config', 'admin'],
  req: ['gestionar_requisitos', 'admin'],
};

const DEFAULT_PERMISSIONS_BY_ROLE = {
  'admin': ['*'], // Acceso total
  'administrador': ['*'], // Acceso total
  'emprendedor': [
    'ver_dashboard',
    'ver_solicitudes',
    'gestionar_solicitudes',
    'ver_expedientes',
    'ver_cuotas',
  ],
  'usuario': [
    'ver_dashboard',
  ],
};

export const usePermissions = () => {
  const userPermissions = useMemo(() => {
    const user = usuarioAPI.getCurrentUser();
    
    if (!user) return [];

    // Si el usuario tiene permisos específicos, usarlos
    if (user.permisos && Array.isArray(user.permisos)) {
      return user.permisos;
    }

    // Si no, usar permisos por defecto según el rol
    const role = (user.rol || user.nombre_rol || '').toLowerCase();
    const rolePermissions = DEFAULT_PERMISSIONS_BY_ROLE[role];
    
    if (rolePermissions?.includes('*')) {
      return ['*']; // Acceso total
    }
    
    return rolePermissions || [];
  }, []);

  const hasPermission = useMemo(() => {
    return (menuId) => {
      // Si tiene acceso total
      if (userPermissions.includes('*')) return true;

      // Verificar permisos específicos del menú
      const requiredPermissions = MENU_PERMISSIONS[menuId];
      if (!requiredPermissions) return false;

      return requiredPermissions.some(perm => userPermissions.includes(perm));
    };
  }, [userPermissions]);

  const hasAnyPermission = useMemo(() => {
    return (menuIds) => {
      return menuIds.some(id => hasPermission(id));
    };
  }, [hasPermission]);

  return {
    userPermissions,
    hasPermission,
    hasAnyPermission,
  };
};