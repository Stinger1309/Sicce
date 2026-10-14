import api from './api_principal';
import { downloadBlob } from '../utils/exportUtils';

const exportAPI = {
  getModulos: async () => {
    const response = await api.get('/export/modulos');
    return response.data;
  },

  exportarModulo: async (modulo, formato = 'excel') => {
    const response = await api.get(`/export/${modulo}`, {
      params: { formato },
      responseType: 'blob',
      timeout: 60000
    });
    const ext = formato === 'pdf' ? 'pdf' : 'xlsx';
    const mime =
      formato === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    downloadBlob(
      new Blob([response.data], { type: mime }),
      `${modulo}_${new Date().toISOString().slice(0, 10)}.${ext}`
    );
    return { success: true };
  }
};

export default exportAPI;
