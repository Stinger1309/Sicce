import api from './api_principal';

const personaAPI = {
  // Obtener todas las personas
  getAllPersonas: async () => {
    try {
      const response = await api.get('/personas');
      return response.data;
    } catch (error) {
      console.error('Error en getAllPersonas:', error);
      throw error.response?.data || { error: 'Error al obtener las personas' };
    }
  },

  // Obtener persona por ID
  getPersonaById: async (cedula) => {
    try {
      const response = await api.get(`/personas/${cedula}`);
      return response.data;
    } catch (error) {
      console.error('Error en getPersonaById:', error);
      throw error.response?.data || { error: 'Error al obtener la persona' };
    }
  },

  // Obtener persona por cédula
  getPersonaByCedula: async (cedula) => {
    try {
      const response = await api.get(`/personas/cedula/${cedula}`);
      return response.data;
    } catch (error) {
      console.error('Error en getPersonaByCedula:', error);
      throw error.response?.data || { error: 'Error al obtener la persona por cédula' };
    }
  },

  // Obtener personas por tipo (emprendedor, cliente, admin)
  getPersonasByTipo: async (tipo) => {
    try {
      const response = await api.get(`/personas/tipo/${tipo}`);
      return response.data;
    } catch (error) {
      console.error('Error en getPersonasByTipo:', error);
      throw error.response?.data || { error: 'Error al obtener personas por tipo' };
    }
  },

  // Crear nueva persona
  createPersona: async (personaData) => {
    try {
      const response = await api.post('/personas', personaData);
      return response.data;
    } catch (error) {
      console.error('Error en createPersona:', error);
      throw error.response?.data || { error: 'Error al crear la persona' };
    }
  },

  // Actualizar persona
  updatePersona: async (cedula, personaData) => {
    try {
      const response = await api.put(`/personas/${cedula}`, personaData);
      return response.data;
    } catch (error) {
      console.error('Error en updatePersona:', error);
      throw error.response?.data || { error: 'Error al actualizar la persona' };
    }
  },

  // Eliminar persona
  deletePersona: async (cedula) => {
    try {
      const response = await api.delete(`/personas/${cedula}`);
      return response.data;
    } catch (error) {
      console.error('Error en deletePersona:', error);
      throw error.response?.data || { error: 'Error al eliminar la persona' };
    }
  },
};

export default personaAPI;