import api from './api_principal';

const requisitosAPI = {
  // Obtener todos los requisitos
  getAll: async () => {
    try {
      const response = await api.get('/requisitos');
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error en getAll requisitos:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener los requisitos' 
      };
    }
  },

  // Obtener requisito por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/requisitos/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error en getById requisito:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener el requisito' 
      };
    }
  },

  // Crear requisito
  create: async (data) => {
    try {
      const response = await api.post('/requisitos', data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error en create requisito:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al crear el requisito' 
      };
    }
  },

  // Actualizar requisito
  update: async (id, data) => {
    try {
      const response = await api.put(`/requisitos/${id}`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error en update requisito:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al actualizar el requisito' 
      };
    }
  },

  // Eliminar requisito
  delete: async (id) => {
    try {
      const response = await api.delete(`/requisitos/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error en delete requisito:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al eliminar el requisito' 
      };
    }
  }
};

export default requisitosAPI;