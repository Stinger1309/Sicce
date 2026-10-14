import axios from 'axios';
import { getAuthItem, clearAuthStorage, migrateAuthFromLocalStorage } from '../utils/authStorage';

// Configuración que funciona en LOCAL y en VERCEl
const getBaseURL = () => {
  // Desarrollo local
  if (import.meta.env.DEV) {
    return 'http://localhost:3000/api';
  }
  
  // Producción (Vercel)
  if (import.meta.env.PROD) {
    // Primero intenta usar la variable de entorno
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    // Fallback a la URL de Render
    return 'https://iadey-1.onrender.com/api';
  }
  
  return 'http://localhost:3000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  // Render free tier puede tardar en despertar; 15s era insuficiente
  timeout: import.meta.env.PROD ? 45000 : 20000,
});

// Interceptor para agregar token e identidad (auditoría)
api.interceptors.request.use(
  (config) => {
    migrateAuthFromLocalStorage();
    const token = getAuthItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const raw = getAuthItem('usuario') || getAuthItem('user');
      if (raw) {
        const user = JSON.parse(raw);
        const userId = user.id || user.id_usuario || getAuthItem('userId');
        const userName =
          user.nombre_completo ||
          user.name ||
          [user.nombres, user.apellidos].filter(Boolean).join(' ') ||
          user.cedula_usuario ||
          '';
        if (userId) config.headers['x-user-id'] = String(userId);
        if (userName) config.headers['x-user-name'] = encodeURIComponent(userName);
      }
    } catch (_) {
      /* ignore */
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = String(error.config?.url || '');
    const isLoginAttempt = url.includes('/usuarios/login');
    const isPublic =
      error.config?.skipAuthRedirect === true ||
      isLoginAttempt ||
      url.includes('/usuarios/registrar-emprendedor') ||
      url.includes('/usuarios/registrar-admin') ||
      url.includes('/bancos/catalogo');

    // No redirigir en fallos de login (401 = credenciales incorrectas)
    if (error.response?.status === 401 && !isPublic) {
      clearAuthStorage();
      window.location.href = '/Login';
    }
    return Promise.reject(error);
  }
);

export default api;
