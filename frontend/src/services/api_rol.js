// src/services/api_rol.js
import api from './api_principal';

const rolAPI = {
  // Obtener todos los roles
  getAllRoles: async () => {
    try {
      const response = await api.get('/roles');
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error en getAllRoles:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener los roles' 
      };
    }
  },

  // Obtener rol por ID
  getRolById: async (id) => {
    try {
      const response = await api.get(`/roles/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error en getRolById:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener el rol' 
      };
    }
  },

  // Crear rol
  createRol: async (data) => {
    try {
      const response = await api.post('/roles', data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error en createRol:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al crear el rol' 
      };
    }
  },

  // Actualizar rol
  updateRol: async (id, data) => {
    try {
      const response = await api.put(`/roles/${id}`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error en updateRol:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al actualizar el rol' 
      };
    }
  },

  // Eliminar rol
  deleteRol: async (id) => {
    try {
      const response = await api.delete(`/roles/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error en deleteRol:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al eliminar el rol' 
      };
    }
  }
};

export default rolAPI;