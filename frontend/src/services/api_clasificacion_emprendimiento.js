import api from './api_principal';

const clasidEmprendAPI = {
  // Obtener todas las clasificaciones de emprendimiento
  getAll: async () => {
    try {
      const response = await api.get('/clasificacion_emprendimiento');
      return response.data;
    } catch (error) {
      console.error('Error en getAll:', error);
      throw error.response?.data || { error: 'Error al obtener las clasificaciones de emprendimiento' };
    }
  },

  // Obtener clasificación por id_clasificacion
  getById: async (id_clasificacion) => {
    try {
      const response = await api.get(`/clasificacion_emprendimiento/${id_clasificacion}`);
      return response.data;
    } catch (error) {
      console.error('Error en getById:', error);
      throw error.response?.data || { error: 'Error al obtener la clasificación de emprendimiento' };
    }
  },

  // Crear nueva clasificación
  create: async (clasificacionData) => {
    try {
      const response = await api.post('/clasificacion_emprendimiento', clasificacionData);
      return response.data;
    } catch (error) {
      console.error('Error en create:', error);
      throw error.response?.data || { error: 'Error al crear la clasificación de emprendimiento' };
    }
  },

  // Actualizar clasificación por id_clasificacion
  update: async (id_clasificacion, clasificacionData) => {
    try {
      const response = await api.put(`/clasificacion_emprendimiento/${id_clasificacion}`, clasificacionData);
      return response.data;
    } catch (error) {
      console.error('Error en update:', error);
      throw error.response?.data || { error: 'Error al actualizar la clasificación de emprendimiento' };
    }
  },

  // Eliminar clasificación por id_clasificacion
  delete: async (id_clasificacion) => {
    try {
      const response = await api.delete(`/clasificacion_emprendimiento/${id_clasificacion}`);
      return response.data;
    } catch (error) {
      console.error('Error en delete:', error);
      throw error.response?.data || { error: 'Error al eliminar la clasificación de emprendimiento' };
    }
  },
};

export default clasidEmprendAPI;