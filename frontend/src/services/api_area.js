import api from './api_principal';

const areaAPI = {
  getAll: async (incluirInactivos = false) => {
    try {
      const response = await api.get('/areas', {
        params: incluirInactivos ? { incluirInactivos: 1 } : {},
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener las áreas',
      };
    }
  },

  create: async (data) => {
    try {
      const response = await api.post('/areas', data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al crear el área',
      };
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`/areas/${id}`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al actualizar el área',
      };
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/areas/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al desactivar el área',
      };
    }
  },
};

export default areaAPI;
