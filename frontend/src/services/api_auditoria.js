import api from './api_principal';
import { downloadBlob } from '../utils/exportUtils';

const auditoriaAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/auditoria', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/auditoria/${id}`);
    return response.data;
  },

  getFiltros: async () => {
    const response = await api.get('/auditoria/filtros');
    return response.data;
  },

  getEstadisticas: async () => {
    const response = await api.get('/auditoria/estadisticas');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/auditoria', data);
    return response.data;
  },

  limpiar: async (dias = 90) => {
    const response = await api.post('/auditoria/limpiar', { dias });
    return response.data;
  },

  exportar: async (formato = 'excel', params = {}) => {
    const response = await api.get('/auditoria/exportar', {
      params: { ...params, formato },
      responseType: 'blob',
      timeout: 60000
    });
    const ext = formato === 'pdf' ? 'pdf' : 'xlsx';
    const mime =
      formato === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    downloadBlob(new Blob([response.data], { type: mime }), `auditoria_${Date.now()}.${ext}`);
    return { success: true };
  }
};

export default auditoriaAPI;
