// services/api_usuario.js - Versión corregida
import api from './api_principal';
import {
  getAuthItem,
  setAuthItem,
  clearAuthStorage,
  migrateAuthFromLocalStorage,
} from '../utils/authStorage';

const usuarioAPI = {
  // ========== AUTENTICACIÓN ==========
  
  // Iniciar sesión
login: async (cedula_usuario, clave) => {
  try {
    const response = await api.post('/usuarios/login', { cedula_usuario, clave });
    
    console.log('Respuesta del login API:', response.data);
    
    if (response.data.success) {
      const userData = response.data.data || response.data.usuario || {};
      
      // Construir objeto de usuario con todos los datos necesarios
      const userToStore = {
        id: userData.id || userData.id_usuario,
        cedula_usuario: userData.cedula_usuario,
        id_rol_usu: userData.id_rol_usu || userData.id_rol || 1,
        nombre_rol: userData.nombre_rol || userData.rol || 'Usuario',
        estatus: userData.estatus || 'activo',
        ultimo_acceso: userData.ultimo_acceso || new Date().toISOString(),
        nombres: userData.nombres || '',
        apellidos: userData.apellidos || '',
        nombre_completo: userData.nombre_completo || 
          `${userData.nombres || ''} ${userData.apellidos || ''}`.trim(),
        email: userData.correo || userData.email || '',
        telefono: userData.telefono || '',
        id_area: userData.id_area || null,
        nombre_area: userData.nombre_area || null,
        codigo_area: userData.codigo_area || null,
        persona: userData.persona || null
      };
      
      console.log('Usuario a guardar:', userToStore);

      // Token (después de construir userToStore)
      const token =
        response.data.token ||
        `session_${userToStore.id || 'user'}_${Date.now()}`;
      setAuthItem('token', token);
      
      // Sesión por pestaña (sessionStorage)
      setAuthItem('usuario', JSON.stringify(userToStore));
      setAuthItem('user', JSON.stringify(userToStore));
      setAuthItem('userRole', userToStore.nombre_rol);
      setAuthItem('userId', String(userToStore.id ?? ''));
      
      // Disparar evento de cambio de autenticación
      window.dispatchEvent(new Event('authChange'));
      
      return {
        success: true,
        data: userToStore,
        token
      };
    }
    
    return response.data;
    
  } catch (error) {
    console.error('Error en login:', error);
    
    if (error.response?.status === 401) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Credenciales incorrectas';
      return {
        success: false,
        error: msg,
        message: msg,
      };
    }

    if (error.response?.status === 403) {
      const msg =
        error.response?.data?.error ||
        'Usuario inactivo. Contacte al administrador.';
      return {
        success: false,
        error: msg,
        message: msg,
      };
    }
    
    if (error.response?.data) {
      return {
        success: false,
        error: error.response.data.error || 'Error al iniciar sesión',
        message: error.response.data.message || error.response.data.error || 'Error al iniciar sesión'
      };
    }

    return {
      success: false,
      error: 'Error de conexión',
      message: 'No se pudo conectar con el servidor. Verifica tu conexión.'
    };
  }
},

  // Cerrar sesión (limpia sessionStorage + restos en localStorage)
  logout: () => {
    try {
      clearAuthStorage();
      window.dispatchEvent(new Event('authChange'));
      return true;
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      return false;
    }
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    migrateAuthFromLocalStorage();

    let user = getAuthItem('usuario');
    
    if (!user) {
      user = getAuthItem('user');
    }
    
    if (!user) return null;
    
    try {
      const userData = JSON.parse(user);
      
      if (!userData.id) {
        userData.id = getAuthItem('userId');
      }
      
      if (!userData.rol && !userData.nombre_rol) {
        userData.rol = getAuthItem('userRole') || 'Usuario';
        userData.nombre_rol = userData.rol;
      }
      
      if (!userData.nombre_rol && userData.rol) {
        userData.nombre_rol = userData.rol;
      }
      
      if (!userData.rol && userData.nombre_rol) {
        userData.rol = userData.nombre_rol;
      }
      
      return userData;
    } catch (error) {
      console.error('Error al parsear usuario:', error);
      return null;
    }
  },

  // Obtener ID del usuario actual
  getCurrentUserId: () => {
    const user = usuarioAPI.getCurrentUser();
    return user?.id || getAuthItem('userId') || null;
  },

  // Obtener rol del usuario actual
  getCurrentUserRole: () => {
    const user = usuarioAPI.getCurrentUser();
    return user?.nombre_rol || user?.rol || getAuthItem('userRole') || null;
  },

  // Verificar si está autenticado
  isAuthenticated: () => {
    migrateAuthFromLocalStorage();
    return !!(getAuthItem('usuario') || getAuthItem('user'));
  },

  // Obtener token
  getToken: () => {
    migrateAuthFromLocalStorage();
    return getAuthItem('token');
  },

  // Actualizar datos del usuario en storage de sesión
  updateLocalUser: (userData) => {
    try {
      const currentUser = usuarioAPI.getCurrentUser();
      const updatedUser = { ...currentUser, ...userData };
      setAuthItem('usuario', JSON.stringify(updatedUser));
      setAuthItem('user', JSON.stringify(updatedUser));
      
      if (userData.nombre_rol || userData.rol) {
        setAuthItem('userRole', userData.nombre_rol || userData.rol);
      }
      
      window.dispatchEvent(new Event('authChange'));
      return updatedUser;
    } catch (error) {
      console.error('Error al actualizar usuario local:', error);
      return null;
    }
  },

  // ¿Existe administrador en el sistema?
  adminExists: async () => {
    try {
      const response = await api.get('/usuarios/admin-exists');
      return response.data;
    } catch (error) {
      console.error('Error en adminExists:', error);
      return {
        success: false,
        data: { existe: true },
        error: error.response?.data?.error || 'Error al verificar administrador'
      };
    }
  },

  // Registro del primer administrador
  registrarPrimerAdmin: async (datos) => {
    try {
      const response = await api.post('/usuarios/registrar-admin', datos);
      return response.data;
    } catch (error) {
      console.error('Error en registrarPrimerAdmin:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al registrar administrador'
      };
    }
  },

  // Registro público de emprendedor (persona + usuario + bancos)
  registrarEmprendedor: async (datos) => {
    try {
      const response = await api.post('/usuarios/registrar-emprendedor', datos, {
        skipAuthRedirect: true,
      });
      return response.data;
    } catch (error) {
      console.error('Error en registrarEmprendedor:', error);
      const status = error.response?.status;
      let mensaje =
        error.response?.data?.error ||
        error.response?.data?.message ||
        null;

      if (!mensaje && status === 404) {
        mensaje =
          'El servidor no tiene disponible el registro de emprendedor. Reinicie el backend e intente de nuevo.';
      }
      if (!mensaje && (status === 0 || error.code === 'ECONNABORTED' || error.message?.includes('Network'))) {
        mensaje =
          'No hay conexión con el servidor. Verifique que el backend esté en ejecución (puerto 3000).';
      }

      return {
        success: false,
        error: mensaje || error.message || 'Error al registrar emprendedor',
      };
    }
  },

  // ========== CRUD USUARIOS ==========

  getAllUsuarios: async () => {
    try {
      const response = await api.get('/usuarios');
      return response.data;
    } catch (error) {
      console.error('Error en getAllUsuarios:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener los usuarios'
      };
    }
  },

  getUsuarioById: async (id) => {
    try {
      const response = await api.get(`/usuarios/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error en getUsuarioById:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener el usuario'
      };
    }
  },

  getUsuarioByCedula: async (cedula_usuario) => {
    try {
      const response = await api.get(`/usuarios/cedula/${cedula_usuario}`);
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error en getUsuarioByCedula:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener el usuario por cédula'
      };
    }
  },

  createUsuario: async (usuarioData) => {
    try {
      const { email, correo, ...dataSinEmail } = usuarioData;
      const response = await api.post('/usuarios', dataSinEmail);
      return response.data;
    } catch (error) {
      console.error('Error en createUsuario:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Error al crear el usuario'
      };
    }
  },

  updateUsuario: async (id, usuarioData) => {
    try {
      const { email, correo, ...dataSinEmail } = usuarioData;
      const response = await api.put(`/usuarios/${id}`, dataSinEmail);
      return response.data;
    } catch (error) {
      console.error('Error en updateUsuario:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar el usuario'
      };
    }
  },

  updatePassword: async (id, nuevaClave) => {
    try {
      const response = await api.put(`/usuarios/${id}/password`, { nuevaClave });
      return response.data;
    } catch (error) {
      console.error('Error en updatePassword:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al cambiar la contraseña'
      };
    }
  },

  cambiarEstatus: async (id, estatus) => {
    try {
      const response = await api.put(`/usuarios/${id}/estatus`, { estatus });
      return response.data;
    } catch (error) {
      console.error('Error en cambiarEstatus:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al cambiar el estatus'
      };
    }
  },

  deleteUsuario: async (id) => {
    try {
      const response = await api.delete(`/usuarios/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error en deleteUsuario:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al eliminar el usuario'
      };
    }
  },

  getInspectores: async () => {
    try {
      const response = await api.get('/usuarios/inspectores');
      return response.data;
    } catch (error) {
      console.error('Error en getInspectores:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener inspectores'
      };
    }
  },

  getRoles: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.disponibles) params.set('disponibles', '1');
      if (options.excludeUserId) params.set('excludeUserId', String(options.excludeUserId));
      const qs = params.toString();
      const response = await api.get(`/usuarios/roles${qs ? `?${qs}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Error en getRoles:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener los roles'
      };
    }
  },

  // ========== PERMISOS (Métodos helper) ==========
  
  getMyPermissions: async () => {
    try {
      const userId = usuarioAPI.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Usuario no autenticado' };
      }
      
      const response = await api.get(`/permisos/usuario/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error en getMyPermissions:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener permisos'
      };
    }
  },

  checkPermission: async (menuItemId, accion) => {
    try {
      const userId = usuarioAPI.getCurrentUserId();
      if (!userId) return false;
      
      const response = await api.get(`/permisos/verificar/${userId}/${menuItemId}/${accion}`);
      return response.data?.tiene_permiso || false;
    } catch (error) {
      console.error('Error en checkPermission:', error);
      return false;
    }
  }
};

export default usuarioAPI;