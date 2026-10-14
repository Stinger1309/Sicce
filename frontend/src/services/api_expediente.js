// frontend/src/services/api_expediente.js
import api from './api_principal';

const expedienteAPI = {
  // Obtener todas las solicitudes aprobadas / incompletas para expediente
  getSolAprobadasExp: async () => {
    try {
      const response = await api.get('/expediente/aprobadas');
      console.log('📊 Solicitudes aprobadas recibidas:', response.data);
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data || [],
          count: response.data.count || 0,
          message: response.data.message
        };
      }
      
      return {
        success: false,
        data: [],
        error: response.data.error || 'Error al obtener solicitudes'
      };
    } catch (error) {
      console.error('❌ Error en getSolAprobadasExp:', error);
      console.error('Detalles del error:', error.response?.data);
      return { 
        success: false, 
        data: [],
        error: error.response?.data?.error || error.response?.data?.details || 'Error al obtener las solicitudes aprobadas'
      };
    }
  },

  // Obtener requisitos disponibles
  getRequisitos: async () => {
    try {
      const response = await api.get('/requisitos');
      console.log('📋 Requisitos recibidos:', response.data);
      return {
        success: true,
        data: response.data.data || response.data || [],
        message: response.data.message
      };
    } catch (error) {
      console.error('❌ Error en getRequisitos:', error);
      return { 
        success: false, 
        data: [],
        error: error.response?.data?.error || 'Error al obtener requisitos'
      };
    }
  },

  // Obtener usuarios (inspectores)
  getInspectores: async () => {
    try {
      const response = await api.get('/usuarios/inspectores');
      console.log('👥 Inspectores recibidos:', response.data);
      return {
        success: true,
        data: response.data.data || response.data || [],
        message: response.data.message
      };
    } catch (error) {
      console.error('❌ Error en getInspectores:', error);
      return { 
        success: false, 
        data: [],
        error: error.response?.data?.error || 'Error al obtener inspectores'
      };
    }
  },

  // Crear expediente (verificación documental)
  createExpediente: async (expedienteData) => {
    try {
      console.log("📝 Enviando datos al backend:", expedienteData);
      const response = await api.post('/expediente', expedienteData);
      console.log("✅ Respuesta del servidor:", response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        resultado: response.data.data?.resultado
      };
    } catch (error) {
      console.error("❌ Error en createExpediente:", error);
      console.error("Detalles:", error.response?.data);
      
      return { 
        success: false, 
        error: error.response?.data?.error || error.response?.data?.message || error.message 
      };
    }
  },

  // Re-verificar expediente incompleto
  verificarDocumentos: async (idExpediente, data) => {
    try {
      const response = await api.put(`/expediente/${idExpediente}/verificar`, data);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        resultado: response.data.data?.resultado
      };
    } catch (error) {
      console.error('❌ Error en verificarDocumentos:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Verificar si ya existe expediente para una solicitud
  verificarExpediente: async (id_solicitud) => {
    try {
      const response = await api.get(`/expediente/verificar/${id_solicitud}`);
      return {
        success: true,
        existe: response.data.existe || false,
        data: response.data.data
      };
    } catch (error) {
      console.error('❌ Error en verificarExpediente:', error);
      return { 
        success: false, 
        existe: false,
        error: error.response?.data?.error || 'Error al verificar expediente'
      };
    }
  }
};

export default expedienteAPI;
