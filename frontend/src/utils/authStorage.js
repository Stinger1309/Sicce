/**
 * Almacenamiento de autenticación por pestaña (sessionStorage).
 * Permite 2 sesiones distintas en el mismo navegador (pestañas distintas)
 * y evita que un logout incompleto reabra la sesión desde localStorage.
 */

const AUTH_KEYS = [
  'usuario',
  'user',
  'token',
  'userRole',
  'userId',
  'rememberToken',
  'nombre',
  'correo',
  'rol',
];

/**
 * No rehidratar desde localStorage: eso reabría sesiones tras un logout
 * incompleto y compartía la sesión entre pestañas.
 * Solo eliminamos restos viejos.
 */
export function migrateAuthFromLocalStorage() {
  AUTH_KEYS.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
}

export function getAuthItem(key) {
  migrateAuthFromLocalStorage();
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setAuthItem(key, value) {
  try {
    if (value == null) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, String(value));
    // No escribir en localStorage: evita compartir sesión entre pestañas
    localStorage.removeItem(key);
  } catch (e) {
    console.error('setAuthItem:', e);
  }
}

export function clearAuthStorage() {
  AUTH_KEYS.forEach((k) => {
    try {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
}

export { AUTH_KEYS };
