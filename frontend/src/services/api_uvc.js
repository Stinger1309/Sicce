import api from './api_principal';

const uvcAPI = {
  /** IDI/UVC del día — solo herramienta externa BCV (nunca inventar) */
  getValorActual: async () => {
    const response = await api.get('/uvc/valor-actual', { timeout: 20000 });
    return response.data;
  },

  /** Convierte UVC → Bs (o bs → UVC) con IDI del día */
  convertir: async ({ uvc, bs } = {}) => {
    const params = {};
    if (uvc != null) params.uvc = uvc;
    if (bs != null) params.bs = bs;
    const response = await api.get('/uvc/convertir', { params, timeout: 20000 });
    return response.data;
  },
};

export default uvcAPI;
