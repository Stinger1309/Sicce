// services/api_solicitud.js
import api from './api_principal';

const SolicitudAPI = {

  // Obtener todas las solicitudes
  getAll: async () => {
    try {
      const response = await api.get('/solicitud');
      console.log('Respuesta solicitudes:', response.data);
      
      if (response.data.success) {
        return response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Error en getAll:', error);
      throw error.response?.data || { error: 'Error al obtener las solicitudes' };
    }
  },

  // Obtener solicitud por cédula de persona - CORREGIDO
  getByCedula: async (cedula_persona) => {
    try {
      // Asegurar que la cédula sea string
      const cedula = String(cedula_persona).trim();
      if (!cedula) {
        throw new Error('Cédula no proporcionada');
      }
      
      const response = await api.get(`/solicitud/cedula/${encodeURIComponent(cedula)}`);
      console.log('Respuesta getByCedula:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error en getByCedula:', error);
      throw error.response?.data || { error: 'Error al obtener la solicitud por cédula' };
    }
  },

  // Obtener solicitud por ID
  getById: async (id_solicitud) => {
    try {
      const id = parseInt(id_solicitud, 10);
      if (Number.isNaN(id)) {
        throw new Error('ID de solicitud inválido');
      }
      const response = await api.get(`/solicitud/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error en getById:', error);
      throw error.response?.data || { error: 'Error al obtener la solicitud' };
    }
  },

  puedeCrear: async (cedula_persona) => {
    try {
      const cedula = String(cedula_persona || '').trim();
      if (!cedula) {
        throw new Error('Cédula no proporcionada');
      }
      const response = await api.get(`/solicitud/puede-crear/${encodeURIComponent(cedula)}`);
      return response.data;
    } catch (error) {
      console.error('Error en puedeCrear:', error);
      throw error.response?.data || { error: 'Error al verificar si puede crear una solicitud' };
    }
  },

  // Crear nueva solicitud
  create: async (solicitudData) => {
    try {
      const response = await api.post('/solicitud', solicitudData);
      return response.data;
    } catch (error) {
      console.error('Error en create:', error);
      throw error.response?.data || { error: 'Error al crear la solicitud' };
    }
  },

  // Actualizar solicitud por id_solicitud
  update: async (id_solicitud, solicitudData) => {
    try {
      const id = parseInt(id_solicitud);
      if (isNaN(id)) {
        throw new Error('ID de solicitud inválido');
      }
      
      const response = await api.put(`/solicitud/${id}`, solicitudData);
      return response.data;
    } catch (error) {
      console.error('Error en update:', error);
      throw error.response?.data || { error: 'Error al actualizar la solicitud' };
    }
  },

  // Cambiar estatus de solicitud
  updateEstatus: async (id_solicitud, estatus, motivo_rechazo = null, cita = null) => {
    try {
      const id = parseInt(id_solicitud);
      if (isNaN(id)) {
        throw new Error('ID de solicitud inválido');
      }
      
      const payload = { estatus, motivo_rechazo };
      if (cita) payload.cita = cita;

      const response = await api.put(`/solicitud/${id}/estatus`, payload);
      return response.data;
    } catch (error) {
      console.error('Error en updateEstatus:', error);
      throw error.response?.data || { error: 'Error al cambiar el estatus de la solicitud' };
    }
  },

  // Eliminar solicitud por id_solicitud
  delete: async (id_solicitud) => {
    try {
      const id = parseInt(id_solicitud);
      if (isNaN(id)) {
        throw new Error('ID de solicitud inválido');
      }
      
      const response = await api.delete(`/solicitud/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error en delete:', error);
      throw error.response?.data || { error: 'Error al eliminar la solicitud' };
    }
  },
};

export default SolicitudAPI;