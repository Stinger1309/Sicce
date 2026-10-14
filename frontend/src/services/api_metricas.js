import api from './api_principal';

const metricasAPI = {
  getResumen: async (params = {}) => {
    try {
      const response = await api.get('/metricas/resumen', {
        params: {
          ...(params.desde ? { desde: params.desde } : {}),
          ...(params.hasta ? { hasta: params.hasta } : {}),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error métricas:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener métricas'
      };
    }
  }
};

export default metricasAPI;
