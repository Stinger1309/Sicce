import api from './api_principal';

const bancoAPI = {
  /** Catálogo público (solo activos) — no redirige a login en 401 */
  getCatalogo: async () => {
    const response = await api.get('/bancos/catalogo', { skipAuthRedirect: true });
    return response.data;
  },

  /** Listado admin (activos e inactivos) */
  getAll: async () => {
    const response = await api.get('/bancos');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/bancos', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/bancos/${id}`, data);
    return response.data;
  },

  toggleActivo: async (id) => {
    const response = await api.patch(`/bancos/${id}/toggle`);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/bancos/${id}`);
    return response.data;
  },

  getByCedula: async (cedula) => {
    const response = await api.get(`/bancos/persona/${encodeURIComponent(cedula)}`);
    return response.data;
  },

  savePersonaBancos: async (cedula, bancos) => {
    const response = await api.post('/bancos/persona', { cedula, bancos });
    return response.data;
  },

  getCreditosInternosCuenta: async (cedula) => {
    const response = await api.get(
      `/bancos/cuenta-desembolso/${encodeURIComponent(cedula)}`
    );
    return response.data;
  },

  registrarCuentaDesembolso: async (payload) => {
    const response = await api.post('/bancos/cuenta-desembolso', payload);
    return response.data;
  },

  getCreditos: async (params = {}) => {
    const response = await api.get('/bancos/creditos', { params });
    return response.data;
  },

  getCreditoById: async (id) => {
    const response = await api.get(`/bancos/creditos/${id}`);
    return response.data;
  },

  descargarAvalPdf: async (id) => {
    const response = await api.get(`/bancos/creditos/${id}/aval-pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default bancoAPI;
