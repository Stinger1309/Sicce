import api from './api_principal';

const citaAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/citas', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/citas/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/citas', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/citas/${id}`, data);
    return response.data;
  },
  cancelar: async (id) => {
    const response = await api.put(`/citas/${id}/cancelar`);
    return response.data;
  },
};

export default citaAPI;
