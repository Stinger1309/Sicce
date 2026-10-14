import api from './api_principal';

const notificacionAPI = {
  getMias: async (params = {}) => {
    const response = await api.get('/notificaciones/mias', { params });
    return response.data;
  },
  marcarLeida: async (id) => {
    const response = await api.put(`/notificaciones/${id}/leer`);
    return response.data;
  },
  marcarTodas: async () => {
    const response = await api.put('/notificaciones/leer-todas');
    return response.data;
  },
};

export default notificacionAPI;
