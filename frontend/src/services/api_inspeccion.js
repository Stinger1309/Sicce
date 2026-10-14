// frontend/src/api/inspeccionAPI.js
import api from './api_principal';

const inspeccionAPI = {

  getFullData: async (id) => {
  try {
    const response = await api.get(`/inspeccion/${id}/full`);
    return response.data;
  } catch (error) {
    console.error('Error en getFullData:', error);
    throw error.response?.data || { error: 'Error al obtener datos completos' };
  }
},


  // Obtener todas las inspecciones
  getAll: async () => {
    try {
      const response = await api.get('/inspeccion');
      return response.data;
    } catch (error) {
      console.error('Error en getAll inspecciones:', error);
      throw error.response?.data || { error: 'Error al obtener inspecciones' };
    }
  },

  // Obtener una inspección por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/inspeccion/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error en getById inspección:', error);
      throw error.response?.data || { error: 'Error al obtener inspección' };
    }
  },

  // Obtener inspecciones por expediente
  getByExpediente: async (idExpediente) => {
    try {
      const response = await api.get(`/inspeccion/expediente/${idExpediente}`);
      return response.data;
    } catch (error) {
      console.error('Error en getByExpediente:', error);
      throw error.response?.data || { error: 'Error al obtener inspecciones del expediente' };
    }
  },

  // Obtener datos del emprendimiento para inspección
  getEmprendimientoData: async (idExpediente) => {
    try {
      const response = await api.get(`/inspeccion/emprendimiento/${idExpediente}`);
      return response.data;
    } catch (error) {
      console.error('Error en getEmprendimientoData:', error);
      throw error.response?.data || { error: 'Error al obtener datos del emprendimiento' };
    }
  },

  // Crear nueva inspección
  create: async (data) => {
    try {
      const response = await api.post('/inspeccion', data);
      return response.data;
    } catch (error) {
      console.error('Error en create inspección:', error);
      throw error.response?.data || { error: 'Error al crear inspección' };
    }
  },

  // Actualizar inspección
  update: async (id, data) => {
    try {
      const response = await api.put(`/inspeccion/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error en update inspección:', error);
      throw error.response?.data || { error: 'Error al actualizar inspección' };
    }
  },

  // Guardar resultados de inspección
  saveResults: async (id, results) => {
    try {
      const response = await api.post(`/inspeccion/${id}/resultados`, { results });
      return response.data;
    } catch (error) {
      console.error('Error en saveResults:', error);
      throw error.response?.data || { error: 'Error al guardar resultados' };
    }
  },

  // Guardar inspección completa (nueva)
  saveFullInspection: async (data) => {
    try {
      const response = await api.post('/inspeccion/full', data);
      return response.data;
    } catch (error) {
      console.error('Error en saveFullInspection:', error);
      throw error.response?.data || { error: 'Error al guardar inspección completa' };
    }
  },

  // Actualizar inspección completa
  updateFullInspection: async (id, data) => {
    try {
      const response = await api.put(`/inspeccion/${id}/full`, data);
      return response.data;
    } catch (error) {
      console.error('Error en updateFullInspection:', error);
      throw error.response?.data || { error: 'Error al actualizar inspección completa' };
    }
  },

  // Descargar informe PDF
  descargarInforme: async (id) => {
    try {
      const response = await api.get(`/inspeccion/${id}/informe`, {
        responseType: 'blob',
        timeout: 60000,
      });

      const blob = response.data;
      // Detectar JSON de error disfrazado de blob
      if (blob instanceof Blob && blob.type && blob.type.includes('application/json')) {
        const text = await blob.text();
        let parsed = {};
        try { parsed = JSON.parse(text); } catch (_) {}
        throw { error: parsed.error || parsed.message || 'Error al generar el informe' };
      }

      // Validar cabecera PDF
      const head = await blob.slice(0, 5).text();
      if (head !== '%PDF-') {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text);
          throw { error: parsed.error || parsed.message || 'Error al generar el informe' };
        } catch (e) {
          if (e?.error) throw e;
          throw { error: 'La respuesta del servidor no es un PDF válido' };
        }
      }

      return blob;
    } catch (error) {
      console.error('Error en descargarInforme:', error);
      if (error?.error) throw error;

      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          throw { error: parsed.error || parsed.message || `Error HTTP ${error.response.status}` };
        } catch (e) {
          if (e?.error) throw e;
        }
      }

      const status = error.response?.status;
      if (status === 404) {
        throw { error: 'Ruta de informe no encontrada. Reinicia el backend e intenta de nuevo.' };
      }
      throw {
        error:
          error.response?.data?.error ||
          error.message ||
          'Error al descargar el informe',
      };
    }
  },
};

export default inspeccionAPI;