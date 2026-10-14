import api from './api_principal';

const EmprendimientoAPI = {
  // Obtener todos los emprendimientos
  getAll: async () => {
    try {
      const response = await api.get('/emprendimiento');
      return response.data;
    } catch (error) {
      console.error('Error en getAll:', error);
      throw error.response?.data || { error: 'Error al obtener los emprendimientos' };
    }
  },

  // Obtener emprendimiento por ID
  getById: async (id_emprendimiento) => {
    try {
      const response = await api.get(`/emprendimiento/${id_emprendimiento}`);
      return response.data;
    } catch (error) {
      console.error('Error en getById:', error);
      throw error.response?.data || { error: 'Error al obtener el emprendimiento' };
    }
  },

  // Obtener emprendimiento por ID de solicitud
  getByIdSolicitud: async (id_solicitud) => {
    try {
      const response = await api.get(`/emprendimiento/solicitud/${id_solicitud}`);
      return response.data;
    } catch (error) {
      console.error('Error en getByIdSolicitud:', error);
      throw error.response?.data || { error: 'Error al obtener el emprendimiento por solicitud' };
    }
  },

  // Obtener emprendimientos por cédula
  getByCedula: async (cedula_emprendimiento) => {
    try {
      const response = await api.get(`/emprendimiento/cedula/${cedula_emprendimiento}`);
      return response.data;
    } catch (error) {
      console.error('Error en getByCedula:', error);
      throw error.response?.data || { error: 'Error al obtener emprendimientos por cédula' };
    }
  },

  // Crear nuevo emprendimiento
  create: async (emprendimientoData) => {
    try {
      const response = await api.post('/emprendimiento', emprendimientoData);
      return response.data;
    } catch (error) {
      console.error('Error en create:', error);
      throw error.response?.data || { error: 'Error al crear el emprendimiento' };
    }
  },

  // Actualizar emprendimiento
  update: async (id_emprendimiento, emprendimientoData) => {
    try {
      const response = await api.put(`/emprendimiento/${id_emprendimiento}`, emprendimientoData);
      return response.data;
    } catch (error) {
      console.error('Error en update:', error);
      throw error.response?.data || { error: 'Error al actualizar el emprendimiento' };
    }
  },

  // Eliminar emprendimiento
  delete: async (id_emprendimiento) => {
    try {
      const response = await api.delete(`/emprendimiento/${id_emprendimiento}`);
      return response.data;
    } catch (error) {
      console.error('Error en delete:', error);
      throw error.response?.data || { error: 'Error al eliminar el emprendimiento' };
    }
  },
};

export default EmprendimientoAPI;