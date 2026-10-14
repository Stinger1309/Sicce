/**
 * Motor de cascada de cobro (prioridad estricta):
 * 1) Gastos de cobranza
 * 2) Intereses de mora
 * 3) Intereses corrientes
 * 4) Capital de la cuota
 * 5) Capital principal (excedente)
 */

function toNum(v, def = 0) {
  if (v == null || v === '') return def;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : def;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Aplica un monto de pago sobre una deuda desglosada.
 * @param {number} montoPago
 * @param {{ gasto:number, mora:number, interes:number, capital:number }} deuda
 */
function aplicarCascada(montoPago, deuda) {
  let restante = round2(Math.max(0, toNum(montoPago)));
  const due = {
    gasto: round2(Math.max(0, toNum(deuda.gasto))),
    mora: round2(Math.max(0, toNum(deuda.mora))),
    interes: round2(Math.max(0, toNum(deuda.interes))),
    capital: round2(Math.max(0, toNum(deuda.capital))),
  };

  const abonos = {
    gasto: 0,
    mora: 0,
    interes: 0,
    capital: 0,
    capital_principal: 0,
  };

  const apply = (key, maxDue) => {
    const a = round2(Math.min(restante, maxDue));
    abonos[key] = a;
    restante = round2(restante - a);
  };

  apply('gasto', due.gasto);
  apply('mora', due.mora);
  apply('interes', due.interes);
  apply('capital', due.capital);
  abonos.capital_principal = restante;
  restante = 0;

  const totalAplicadoCuota = round2(
    abonos.gasto + abonos.mora + abonos.interes + abonos.capital
  );

  return {
    abonos,
    totalAplicadoCuota,
    excedenteCapitalPrincipal: abonos.capital_principal,
  };
}

/**
 * Calcula saldos pendientes de una cuota (después de pagos previos).
 */
function calcularDeudaCuota({
  gasto_cobranza = 0,
  monto_morosidad = 0,
  interes_corriente = 0,
  capital_cuota = 0,
  pagado_gasto_cobranza = 0,
  pagado_interes_mora = 0,
  pagado_interes_corriente = 0,
  pagado_capital = 0,
}) {
  return {
    gasto: round2(Math.max(0, toNum(gasto_cobranza) - toNum(pagado_gasto_cobranza))),
    mora: round2(Math.max(0, toNum(monto_morosidad) - toNum(pagado_interes_mora))),
    interes: round2(Math.max(0, toNum(interes_corriente) - toNum(pagado_interes_corriente))),
    capital: round2(Math.max(0, toNum(capital_cuota) - toNum(pagado_capital))),
  };
}

function totalDeuda(deuda) {
  return round2(deuda.gasto + deuda.mora + deuda.interes + deuda.capital);
}

/**
 * Gasto de cobranza (aplica solo si hay mora efectiva / días > gracia).
 */
function calcularGastoCobranza({
  diasMora,
  diasGracia = 5,
  montoCuota,
  porcentaje = 2,
  fijo = 0,
  gastoYaAsignado = 0,
}) {
  if (toNum(diasMora) <= toNum(diasGracia)) {
    return round2(Math.max(0, toNum(gastoYaAsignado)));
  }
  if (toNum(gastoYaAsignado) > 0) {
    return round2(toNum(gastoYaAsignado));
  }
  const pct = round2((toNum(montoCuota) * toNum(porcentaje)) / 100);
  return round2(Math.max(toNum(fijo), pct));
}

module.exports = {
  toNum,
  round2,
  aplicarCascada,
  calcularDeudaCuota,
  totalDeuda,
  calcularGastoCobranza,
};
