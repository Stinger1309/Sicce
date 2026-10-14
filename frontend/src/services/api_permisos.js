// services/api_permisos.js - Versión completa con gestión por USUARIO

import api from './api_principal';

const permisosAPI = {
  // ========== PERMISOS ==========
  
  // Obtener todos los permisos del sistema
  getAllPermisos: async () => {
    try {
      const response = await api.get('/permisos');
      return { 
        success: true, 
        data: response.data.data
      };
    } catch (error) {
      console.error('Error en getAllPermisos:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener los permisos' 
      };
    }
  },

  // Obtener permisos por rol
  getPermisosByRol: async (idRol, idArea = null) => {
    try {
      const response = await api.get(`/permisos/rol/${idRol}`, {
        params: idArea ? { id_area: idArea } : {},
      });
      return { 
        success: true, 
        data: response.data.data
      };
    } catch (error) {
      console.error('Error en getPermisosByRol:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener los permisos del rol' 
      };
    }
  },

  // Obtener permisos de un USUARIO
  getPermisosByUsuario: async (idUsuario) => {
    try {
      const response = await api.get(`/permisos/usuario/${idUsuario}`);
      return { 
        success: true, 
        data: response.data.data
      };
    } catch (error) {
      console.error('Error en getPermisosByUsuario:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener los permisos del usuario' 
      };
    }
  },

  // Asignar/actualizar permisos de un USUARIO
  asignarPermisosUsuario: async (idUsuario, permisos) => {
    try {
      const response = await api.post(`/permisos/usuario/${idUsuario}`, { permisos });
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error en asignarPermisosUsuario:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al asignar permisos al usuario' 
      };
    }
  },

  // Asignar/actualizar permisos de un ROL
  asignarPermisosRol: async (idRol, permisos, idArea = null) => {
    try {
      const response = await api.post(`/permisos/rol/${idRol}`, {
        permisos,
        id_area: idArea || null,
      });
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error en asignarPermisosRol:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al asignar permisos al rol' 
      };
    }
  },

  // Eliminar todos los permisos de un usuario
  eliminarPermisosUsuario: async (idUsuario) => {
    try {
      const response = await api.delete(`/permisos/usuario/${idUsuario}`);
      return { 
        success: true, 
        message: response.data.message
      };
    } catch (error) {
      console.error('Error en eliminarPermisosUsuario:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al eliminar los permisos del usuario' 
      };
    }
  },

  // Eliminar todos los permisos de un rol
  eliminarPermisosRol: async (idRol) => {
    try {
      const response = await api.delete(`/permisos/rol/${idRol}`);
      return { 
        success: true, 
        message: response.data.message
      };
    } catch (error) {
      console.error('Error en eliminarPermisosRol:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al eliminar los permisos del rol' 
      };
    }
  },

  // Copiar permisos de un usuario a otro
  copiarPermisosUsuario: async (idUsuarioOrigen, idUsuarioDestino) => {
    try {
      const response = await api.post('/permisos/copiar', { 
        id_usuario_origen: idUsuarioOrigen,
        id_usuario_destino: idUsuarioDestino
      });
      return { 
        success: true, 
        message: response.data.message
      };
    } catch (error) {
      console.error('Error en copiarPermisosUsuario:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al copiar permisos' 
      };
    }
  },

  // Verificar si un usuario tiene un permiso específico
  verificarPermiso: async (idUsuario, menuItemId, accion) => {
    try {
      const response = await api.get(`/permisos/verificar/${idUsuario}/${menuItemId}/${accion}`);
      return { 
        success: true, 
        tienePermiso: response.data.tiene_permiso 
      };
    } catch (error) {
      console.error('Error en verificarPermiso:', error);
      return { 
        success: false, 
        tienePermiso: false,
        error: error.response?.data?.error || 'Error al verificar permiso' 
      };
    }
  },

  // ========== ROLES ==========
  
  getRoles: async () => {
    try {
      const response = await api.get('/roles');
      return { 
        success: true, 
        data: response.data.data 
      };
    } catch (error) {
      console.error('Error en getRoles:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener los roles' 
      };
    }
  },

  getRolById: async (idRol) => {
    try {
      const response = await api.get(`/roles/${idRol}`);
      return { 
        success: true, 
        data: response.data.data 
      };
    } catch (error) {
      console.error('Error en getRolById:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener el rol' 
      };
    }
  },

  createRol: async (nombreRol, descripcion = '') => {
    try {
      const response = await api.post('/roles', { 
        nombre_rol: nombreRol,
        descripcion: descripcion
      });
      return { 
        success: true, 
        data: response.data.data 
      };
    } catch (error) {
      console.error('Error en createRol:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al crear el rol' 
      };
    }
  },

  updateRol: async (idRol, nombreRol, descripcion = '') => {
    try {
      const response = await api.put(`/roles/${idRol}`, { 
        nombre_rol: nombreRol,
        descripcion: descripcion
      });
      return { 
        success: true, 
        data: response.data.data 
      };
    } catch (error) {
      console.error('Error en updateRol:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al actualizar el rol' 
      };
    }
  },

  deleteRol: async (idRol) => {
    try {
      const response = await api.delete(`/roles/${idRol}`);
      return { 
        success: true, 
        message: response.data.message 
      };
    } catch (error) {
      console.error('Error en deleteRol:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al eliminar el rol' 
      };
    }
  },

  getUsuariosByRol: async (idRol) => {
    try {
      const response = await api.get(`/roles/${idRol}/usuarios`);
      return { 
        success: true, 
        data: response.data.data 
      };
    } catch (error) {
      console.error('Error en getUsuariosByRol:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener usuarios del rol' 
      };
    }
  }
};

export default permisosAPI;