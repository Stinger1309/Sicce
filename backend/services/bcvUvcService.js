/**
 * Servicio UVC / IDI — normativas BCV.
 *
 * Regla absoluta: NUNCA inventar el valor del Índice de Inversión (IDI)
 * ni del equivalente en bolívares. Solo se usa la herramienta externa.
 *
 * - UVC (al otorgar) = monto_Bs / IDI_día_otorgamiento
 * - Saldo en Bs (al cobrar) = saldo_UVC × IDI_día_pago
 *
 * Cache en memoria (TTL corto) para no fallar el pago si la API externa
 * está lenta/intermitente justo al registrar (el valor ya se consultó
 * al abrir el módulo de cuotas).
 */

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos
let idiCache = null; // { data, expiresAt }

const DEFAULT_SOURCES = [
  {
    name: 've.dolarapi.com',
    url: 'https://ve.dolarapi.com/v1/dolares',
    parse: (data) => {
      const list = Array.isArray(data) ? data : [];
      const bcv =
        list.find(
          (d) =>
            String(d.fuente || '').toLowerCase() === 'oficial' ||
            String(d.nombre || '').toLowerCase().includes('bcv') ||
            String(d.nombre || '').toLowerCase().includes('oficial')
        ) || list.find((d) => d.promedio || d.valor);
      const valor = Number(bcv?.promedio ?? bcv?.valor);
      const fecha = bcv?.fechaActualizacion || bcv?.fecha || null;
      if (!Number.isFinite(valor) || valor <= 0) return null;
      return { valor_idi: valor, fecha, fuente: 've.dolarapi.com (BCV oficial)' };
    },
  },
  {
    name: 'bcv.today',
    url: 'https://bcv.today/api/v1/rate.json',
    parse: (data) => {
      const valor = Number(data?.USD);
      if (!Number.isFinite(valor) || valor <= 0) return null;
      return {
        valor_idi: valor,
        fecha: data.effective_date || data.date || data.updated_at || null,
        fuente: 'bcv.today (referencia BCV)',
      };
    },
  },
];

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function buildResult(parsed) {
  return {
    success: true,
    valor_idi: Number(parsed.valor_idi),
    fecha: parsed.fecha,
    fuente: parsed.fuente,
    unidad: 'Bs por UVC (IDI / referencia BCV)',
    norma:
      'Créditos expresados en UVC según BCV. Bs = UVC × IDI del día (herramienta externa).',
    obtenido_en: new Date().toISOString(),
  };
}

function setCache(data) {
  idiCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
}

function getCache() {
  if (idiCache && idiCache.expiresAt > Date.now() && idiCache.data?.valor_idi > 0) {
    return { ...idiCache.data, desde_cache: true };
  }
  return null;
}

async function fetchFromSources() {
  const customUrl = process.env.UVC_IDI_API_URL;
  const sources = [...DEFAULT_SOURCES];
  if (customUrl) {
    sources.unshift({
      name: 'UVC_IDI_API_URL',
      url: customUrl,
      parse: (data) => {
        const valor = Number(
          data.valor_idi ?? data.idi ?? data.valor ?? data.mid ?? data.USD ?? data.rate
        );
        if (!Number.isFinite(valor) || valor <= 0) return null;
        return {
          valor_idi: valor,
          fecha: data.fecha || data.effective_date || data.updated_at || null,
          fuente: 'UVC_IDI_API_URL (configurada)',
        };
      },
    });
  }

  const errors = [];

  // Intentar en paralelo: la primera respuesta válida gana
  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const raw = await fetchJson(src.url);
      const parsed = src.parse(raw);
      if (!parsed?.valor_idi || parsed.valor_idi <= 0) {
        throw new Error(`${src.name}: respuesta sin valor IDI válido`);
      }
      return buildResult(parsed);
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value?.valor_idi > 0) {
      setCache(r.value);
      return r.value;
    }
    if (r.status === 'rejected') {
      errors.push(r.reason?.message || String(r.reason));
    }
  }

  const err = new Error(
    'No se pudo obtener el Índice de Inversión (IDI/UVC) desde la herramienta externa del BCV. No se inventará un valor. Reintente en unos segundos.'
  );
  err.details = errors;
  throw err;
}

/**
 * Obtiene el valor IDI vigente desde herramienta externa (con cache corto).
 * @param {{ forceRefresh?: boolean }} [opts]
 * @throws si ninguna fuente responde y no hay cache válido
 */
async function obtenerValorIdiActual(opts = {}) {
  const forceRefresh = !!opts.forceRefresh;
  if (!forceRefresh) {
    const cached = getCache();
    if (cached) return cached;
  }

  try {
    return await fetchFromSources();
  } catch (e) {
    // Si el refresh forzado falla, aún usar cache no vencido como respaldo de pago
    const cached = getCache();
    if (cached) return cached;
    // Cache recién vencido (hasta 1h): último recurso para no bloquear pagos
    if (
      idiCache?.data?.valor_idi > 0 &&
      Date.now() - (idiCache.expiresAt - CACHE_TTL_MS) < 60 * 60 * 1000
    ) {
      return {
        ...idiCache.data,
        desde_cache: true,
        cache_extendido: true,
        fuente: `${idiCache.data.fuente} (último valor conocido)`,
      };
    }
    throw e;
  }
}

/** Convierte UVC → Bs usando SOLO el IDI externo del día */
async function uvcABolivares(montoUvc) {
  const uvc = Number(montoUvc);
  if (!Number.isFinite(uvc)) {
    throw new Error('Monto UVC inválido');
  }
  const idi = await obtenerValorIdiActual();
  const monto_bs = Math.round(uvc * idi.valor_idi * 100) / 100;
  return { ...idi, monto_uvc: uvc, monto_bs };
}

/** Convierte Bs → UVC usando SOLO el IDI externo del día */
async function bolivaresAUvc(montoBs) {
  const bs = Number(montoBs);
  if (!Number.isFinite(bs) || bs < 0) {
    throw new Error('Monto en bolívares inválido');
  }
  const idi = await obtenerValorIdiActual();
  const monto_uvc = Math.round((bs / idi.valor_idi) * 10000) / 10000;
  return { ...idi, monto_bs: bs, monto_uvc };
}

module.exports = {
  obtenerValorIdiActual,
  uvcABolivares,
  bolivaresAUvc,
};
