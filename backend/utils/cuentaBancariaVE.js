/**
 * Validación de número de cuenta bancaria venezolana (20 dígitos).
 */

function normalizarNumeroCuenta(valor) {
  return String(valor || '').replace(/[^\d]/g, '');
}

/**
 * @param {string} numeroCuenta
 * @param {{ codigoBancoSeleccionado?: string|null, codigosValidos?: string[] }} [opts]
 */
function validarNumeroCuentaVE(numeroCuenta, opts = {}) {
  const numero = normalizarNumeroCuenta(numeroCuenta);

  if (!numero) {
    return { ok: false, numero, error: 'El número de cuenta es requerido' };
  }
  if (!/^\d+$/.test(numero)) {
    return {
      ok: false,
      numero,
      error:
        'El número de cuenta solo puede contener dígitos (sin letras, guiones ni espacios)',
    };
  }
  if (numero.length !== 20) {
    return {
      ok: false,
      numero,
      error: `El número de cuenta debe tener exactamente 20 dígitos (tiene ${numero.length})`,
    };
  }

  const prefijo = numero.slice(0, 4);
  const codigoSel = opts.codigoBancoSeleccionado
    ? String(opts.codigoBancoSeleccionado)
        .replace(/[^\d]/g, '')
        .padStart(4, '0')
        .slice(-4)
    : null;

  if (codigoSel && codigoSel.length === 4 && prefijo !== codigoSel) {
    return {
      ok: false,
      numero,
      error: `Los primeros 4 dígitos (${prefijo}) deben coincidir con el código del banco seleccionado (${codigoSel})`,
    };
  }

  if (Array.isArray(opts.codigosValidos) && opts.codigosValidos.length > 0) {
    const set = new Set(
      opts.codigosValidos
        .map((c) =>
          String(c || '')
            .replace(/[^\d]/g, '')
            .padStart(4, '0')
            .slice(-4)
        )
        .filter((c) => c.length === 4)
    );
    if (!set.has(prefijo)) {
      return {
        ok: false,
        numero,
        error: `Los primeros 4 dígitos (${prefijo}) no corresponden a un código bancario válido de Venezuela`,
      };
    }
  }

  return { ok: true, numero };
}

module.exports = {
  normalizarNumeroCuenta,
  validarNumeroCuentaVE,
};
