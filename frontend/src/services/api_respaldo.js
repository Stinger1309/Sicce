import api from './api_principal';
import { downloadBlob } from '../utils/exportUtils';

const extractFileName = (disposition, fallback) => {
  const match = (disposition || '').match(/filename=([^;]+)/i);
  return match ? match[1].replace(/['"]/g, '') : fallback;
};

const respaldoAPI = {
  /** Exportación manual: genera y descarga el SQL */
  generar: async () => {
    const response = await api.get('/respaldo/generar', {
      responseType: 'blob',
      timeout: 180000,
    });

    const fileName = extractFileName(
      response.headers['content-disposition'],
      `respaldo_iadey_${new Date().toISOString().slice(0, 10)}.sql`
    );

    downloadBlob(new Blob([response.data], { type: 'application/sql' }), fileName);
    return {
      success: true,
      fileName,
      size: response.data.size || response.data.length,
      metodo: response.headers['x-backup-method'],
    };
  },

  getHistorial: async (limit = 50) => {
    const response = await api.get('/respaldo/historial', { params: { limit } });
    return response.data;
  },

  getTablas: async () => {
    const response = await api.get('/respaldo/tablas');
    return response.data;
  },

  getProgramacion: async () => {
    const response = await api.get('/respaldo/programacion');
    return response.data;
  },

  /** Descarga un respaldo ya guardado en el servidor */
  descargar: async (id, nombreArchivo) => {
    const response = await api.get(`/respaldo/descargar/${id}`, {
      responseType: 'blob',
      timeout: 180000,
    });
    const fileName = extractFileName(
      response.headers['content-disposition'],
      nombreArchivo || `respaldo_${id}.sql`
    );
    downloadBlob(new Blob([response.data], { type: 'application/sql' }), fileName);
    return { success: true, fileName };
  },
};

export default respaldoAPI;
