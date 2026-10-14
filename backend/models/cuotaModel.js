const pool = require('../config/db');
const {
  toNum,
  round2,
  aplicarCascada,
  calcularDeudaCuota,
  totalDeuda,
  calcularGastoCobranza,
} = require('../utils/cascadaCobro');

class CuotaModel {
  static async ensurePagoExtraColumns() {
    await pool.query(`
      ALTER TABLE cuota ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(60)
    `);
    await pool.query(`
      ALTER TABLE cuota ADD COLUMN IF NOT EXISTS telefono_pago VARCHAR(20)
    `);
    await pool.query(`
      ALTER TABLE cuota_pago ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(60)
    `);
    await pool.query(`
      ALTER TABLE cuota_pago ADD COLUMN IF NOT EXISTS telefono_pago VARCHAR(20)
    `);
    await pool.query(`
      ALTER TABLE cuota_pago ADD COLUMN IF NOT EXISTS valor_idi NUMERIC(18,6)
    `);
    await pool.query(`
      ALTER TABLE cuota_pago ADD COLUMN IF NOT EXISTS monto_bs_equivalente NUMERIC(18,2)
    `);
    await pool.query(`
      ALTER TABLE cuota_pago ADD COLUMN IF NOT EXISTS fuente_idi TEXT
    `);
  }

  // Obtener todos los contratos con los estatus específicos
  static async getAll() {
    const query = `
      SELECT 
        a.id_aprobacion,
        a.id_inspeccion,
        a.id_expediente,
        a.verificacion_requisitos,
        a.estatus_aprobacion,
        a.seleccion_manejo,
        a.cedula_persona_id,
        a.created_at as aprobacion_created_at,
        a.updated_at as aprobacion_updated_at,
        c.id_contrato,
        c.id_cedula_aprob,
        c.numero_contrato,
        c.moneda,
        c.monto_moneda,
        c.cambio,
        c.flat,
        c.interes,
        c.morosidad,
        c.devolvimiento,
        c.numero_cuotas,
        c.numero_gracias,
        c.inicio,
        c.cierre,
        c.estatus,
        c.created_at as contrato_created_at,
        d.id_desembolso,
        d.fecha_desembolso,
        d.capture_desembolso,
        d.estatus_desembolso,
        d.fecha_confirmacion,
        COALESCE(a.cedula_persona_id, c.id_cedula_aprob) AS cliente_cedula,
        TRIM(CONCAT(COALESCE(p.nombres, ''), ' ', COALESCE(p.apellidos, ''))) AS cliente_nombre,
        p.telefono AS cliente_telefono,
        p.correo AS cliente_email,
        p.direccion AS cliente_direccion
      FROM aprobacion a
      INNER JOIN contrato c ON a.id_aprobacion = c.id_aprob
      LEFT JOIN desembolso d ON c.id_contrato = d.id_cont
      LEFT JOIN persona p ON COALESCE(a.cedula_persona_id, c.id_cedula_aprob) = p.cedula
      WHERE c.estatus IN ('En espera de cuotas', 'Activo', 'Terminado', 'Finalizado', 'Legal', 'Pendiente por confirmar desembolso')
      ORDER BY a.id_aprobacion DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getAll query:', error);
      throw error;
    }
  }

  // Obtener contratos por cédula de aprobación
static async getByCedulaAprob(id_cedula_aprob) {
  const query = `
    SELECT 
      a.id_aprobacion,
      a.id_inspeccion,
      a.id_expediente,
      a.verificacion_requisitos,
      a.estatus_aprobacion,
      a.seleccion_manejo,
      a.cedula_persona_id,
      a.created_at as aprobacion_created_at,
      a.updated_at as aprobacion_updated_at,
      c.id_contrato,
      c.id_cedula_aprob,
      c.numero_contrato,
      c.moneda,
      c.monto_moneda,
      c.cambio,
      c.flat,
      c.interes,
      c.morosidad,
      c.devolvimiento,
      c.numero_cuotas,
      c.numero_gracias,
      c.inicio,
      c.cierre,
      c.estatus,
      c.created_at as contrato_created_at,
      d.id_desembolso,
      d.fecha_desembolso,
      d.capture_desembolso,
      d.estatus_desembolso,
      d.fecha_confirmacion,
      COALESCE(a.cedula_persona_id, c.id_cedula_aprob) AS cliente_cedula,
      TRIM(CONCAT(COALESCE(p.nombres, ''), ' ', COALESCE(p.apellidos, ''))) AS cliente_nombre,
      p.telefono AS cliente_telefono,
      p.correo AS cliente_email,
      p.direccion AS cliente_direccion
    FROM aprobacion a
    INNER JOIN contrato c ON a.id_aprobacion = c.id_aprob
    LEFT JOIN desembolso d ON c.id_contrato = d.id_cont
    LEFT JOIN persona p ON COALESCE(a.cedula_persona_id, c.id_cedula_aprob) = p.cedula
    WHERE (
        UPPER(TRIM(c.id_cedula_aprob)) = UPPER(TRIM($1))
        OR UPPER(TRIM(a.cedula_persona_id)) = UPPER(TRIM($1))
      )
      AND c.estatus IN ('En espera de cuotas', 'Activo', 'Terminado', 'Finalizado', 'Legal', 'Pendiente por confirmar desembolso')
    ORDER BY c.id_contrato DESC
  `;
  
  try {
    const result = await pool.query(query, [id_cedula_aprob]);
    return result.rows;
  } catch (error) {
    console.error(`Error en getByCedulaAprob para id_cedula_aprob ${id_cedula_aprob}:`, error);
    throw error;
  }
}

﻿  // Obtener cuotas de un contrato específico
  static async getCuotasByContratoId(id_contrato) {
    const query = `
      SELECT
        q.*,
        c.monto_moneda,
        c.interes,
        c.morosidad,
        c.devolvimiento,
        c.numero_cuotas,
        cfg.gasto_cobranza_porcentaje,
        cfg.gasto_cobranza_fijo,
        cfg.dias_gracia_mora,
        cfg.morosidad_porcentaje
      FROM cuota q
      LEFT JOIN contrato c ON c.id_contrato = q.id_cuota_cont
      LEFT JOIN configuracion_contrato cfg ON cfg.id_configuracion = c.id_config
      WHERE q.id_cuota_cont = $1
      ORDER BY CAST(q.num_cuota AS INTEGER) ASC
    `;

    try {
      const result = await pool.query(query, [id_contrato]);
      const rows = result.rows;
      await this.asegurarDesgloseCuotas(rows);
      return rows.map((q) => this.enriquecerCuotaCascada(q));
    } catch (error) {
      console.error(`Error en getCuotasByContratoId para id_contrato ${id_contrato}:`, error);
      return [];
    }
  }

  static async asegurarDesgloseCuotas(rows) {
    if (!Array.isArray(rows) || !rows.length) return;
    const obligatorias = rows.filter(
      (r) => !String(r.tipo_cuota || '').toLowerCase().includes('gracia')
    );
    const nObl = Math.max(obligatorias.length, 1);
    const montoPrestamo = toNum(rows[0].monto_moneda);
    const capitalBase = nObl > 0 ? round2(montoPrestamo / nObl) : 0;

    for (const q of rows) {
      const monto = toNum(q.monto_cuota);
      let capital = toNum(q.capital_cuota);
      let interes = toNum(q.interes_corriente);
      const esGracia = String(q.tipo_cuota || '').toLowerCase().includes('gracia');

      if (capital <= 0 && interes <= 0) {
        if (esGracia) {
          capital = 0;
          interes = monto;
        } else {
          capital = capitalBase > 0 ? Math.min(capitalBase, monto) : round2(monto * 0.7);
          interes = round2(Math.max(0, monto - capital));
        }
        q.capital_cuota = capital;
        q.interes_corriente = interes;
        try {
          await pool.query(
            `UPDATE cuota SET capital_cuota = $1, interes_corriente = $2
             WHERE id_cuota = $3 AND COALESCE(capital_cuota, 0) = 0 AND COALESCE(interes_corriente, 0) = 0`,
            [capital, interes, q.id_cuota]
          );
        } catch (_) {}
      }
    }
  }

  static enriquecerCuotaCascada(q) {
    // Tasa de mora anual (decimal). Créditos UVC (BCV): tope 0,80% anual adicional.
    const tasaRaw =
      toNum(q.morosidad_porcentaje, 0) > 0
        ? toNum(q.morosidad_porcentaje) / 100
        : toNum(q.morosidad, 0) > 0
          ? toNum(q.morosidad) / 100
          : 0.008;
    const tasa = Math.min(Math.max(tasaRaw, 0), 0.008);
    const moraInfo = this.calcularMora(
      q.fecha_hasta,
      q.monto_cuota,
      new Date(),
      tasa,
      toNum(q.dias_gracia_mora, 5)
    );
    const diasMora = Math.max(toNum(q.dias_mora_cuota), moraInfo.dias_mora);
    const montoMora = Math.max(toNum(q.monto_morosidad), toNum(moraInfo.monto_morosidad));
    const gasto = calcularGastoCobranza({
      diasMora,
      diasGracia: toNum(q.dias_gracia_mora, 5),
      montoCuota: q.monto_cuota,
      porcentaje: toNum(q.gasto_cobranza_porcentaje, 2),
      fijo: toNum(q.gasto_cobranza_fijo, 0),
      gastoYaAsignado: toNum(q.gasto_cobranza, 0),
    });
    const deuda = calcularDeudaCuota({
      gasto_cobranza: gasto,
      monto_morosidad: montoMora,
      interes_corriente: q.interes_corriente,
      capital_cuota: q.capital_cuota,
      pagado_gasto_cobranza: q.pagado_gasto_cobranza,
      pagado_interes_mora: q.pagado_interes_mora,
      pagado_interes_corriente: q.pagado_interes_corriente,
      pagado_capital: q.pagado_capital,
    });
    return {
      ...q,
      dias_mora_cuota: diasMora,
      monto_morosidad: String(montoMora),
      gasto_cobranza: gasto,
      deuda_cascada: deuda,
      total_pendiente_cascada: totalDeuda(deuda),
    };
  }

  static async registrarPago(id_cuota, datosPago) {
    const { uvcABolivares } = require('../services/bcvUvcService');
    await this.ensurePagoExtraColumns();

    const {
      fecha_pagada,
      comprobante,
      metodo_pago,
      titular_cedula,
      titular_nombre,
      monto_pagado,
      referencia,
      referencia_pago,
      telefono_pago,
    } = datosPago;

    const referenciaFinal = String(referencia_pago || referencia || '')
      .trim()
      .replace(/[^a-zA-Z0-9-]/g, '')
      .slice(0, 60);
    const telefonoFinal = String(telefono_pago || '')
      .replace(/\D/g, '')
      .slice(0, 15);

    if (!comprobante) throw new Error('El comprobante de pago es obligatorio');
    if (!metodo_pago || !['pago_movil', 'transferencia'].includes(String(metodo_pago))) {
      throw new Error('Debe indicar el método de pago (pago_movil o transferencia)');
    }
    if (!titular_cedula || !String(titular_cedula).trim()) {
      throw new Error('La cédula del titular de la cuenta es obligatoria');
    }
    if (!titular_nombre || !String(titular_nombre).trim()) {
      throw new Error('El nombre del titular de la cuenta es obligatorio');
    }
    if (String(metodo_pago) === 'pago_movil') {
      if (!telefonoFinal || telefonoFinal.length < 10) {
        throw new Error('En pago móvil debe indicar el número de teléfono (mínimo 10 dígitos)');
      }
    }

    // IDI/UVC ANTES de abrir transacción (no bloquear conexión DB por red externa)
    let conversionUvc = null;
    try {
      const montoRef = round2(toNum(monto_pagado));
      if (montoRef > 0) {
        conversionUvc = await uvcABolivares(montoRef);
      }
    } catch (e) {
      const detail = Array.isArray(e.details) && e.details.length
        ? ` Detalle: ${e.details.join(' | ')}`
        : '';
      throw new Error(
        (e.message ||
          'No se pudo obtener el IDI/UVC del BCV. No se registrará el pago sin la tasa oficial.') +
          detail
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cuotaRes = await client.query(
        `SELECT q.*, c.monto_moneda, c.morosidad, c.id_config,
                cfg.gasto_cobranza_porcentaje, cfg.gasto_cobranza_fijo,
                cfg.dias_gracia_mora, cfg.morosidad_porcentaje
         FROM cuota q
         JOIN contrato c ON c.id_contrato = q.id_cuota_cont
         LEFT JOIN configuracion_contrato cfg ON cfg.id_configuracion = c.id_config
         WHERE q.id_cuota = $1 FOR UPDATE OF q`,
        [id_cuota]
      );
      if (!cuotaRes.rows[0]) throw new Error('Cuota no encontrada');
      let cuota = cuotaRes.rows[0];

      if (['pagado', 'por_confirmar'].includes(cuota.estado_cuota)) {
        throw new Error(`La cuota ya está en estado ${cuota.estado_cuota}`);
      }

      const proxima = await client.query(
        `SELECT id_cuota FROM cuota
         WHERE id_cuota_cont = $1 AND estado_cuota NOT IN ('pagado', 'por_confirmar')
         ORDER BY fecha_hasta ASC NULLS LAST, CAST(num_cuota AS INTEGER) ASC LIMIT 1`,
        [cuota.id_cuota_cont]
      );
      if (!proxima.rows[0] || String(proxima.rows[0].id_cuota) !== String(id_cuota)) {
        throw new Error('Solo puede pagar la cuota pendiente más cercana a la fecha de vencimiento');
      }

      await this.asegurarDesgloseCuotas([cuota]);
      const refreshed = await client.query(`SELECT * FROM cuota WHERE id_cuota = $1`, [id_cuota]);
      cuota = { ...cuota, ...refreshed.rows[0] };

      const tasaMoraRaw =
        toNum(cuota.morosidad_porcentaje, 0) > 0
          ? toNum(cuota.morosidad_porcentaje) / 100
          : toNum(cuota.morosidad, 0) > 0
            ? toNum(cuota.morosidad) / 100
            : 0.008;
      // BCV: créditos en UVC — mora máxima adicional 0,80% anual
      const tasaMora = Math.min(Math.max(tasaMoraRaw, 0), 0.008);
      const diasGracia = toNum(cuota.dias_gracia_mora, 5);
      const moraInfo = this.calcularMora(cuota.fecha_hasta, cuota.monto_cuota, new Date(), tasaMora, diasGracia);

      const gasto = calcularGastoCobranza({
        diasMora: moraInfo.dias_mora,
        diasGracia,
        montoCuota: cuota.monto_cuota,
        porcentaje: toNum(cuota.gasto_cobranza_porcentaje, 2),
        fijo: toNum(cuota.gasto_cobranza_fijo, 0),
        gastoYaAsignado: toNum(cuota.gasto_cobranza, 0),
      });

      const deuda = calcularDeudaCuota({
        gasto_cobranza: gasto,
        monto_morosidad: moraInfo.monto_morosidad,
        interes_corriente: cuota.interes_corriente,
        capital_cuota: cuota.capital_cuota,
        pagado_gasto_cobranza: cuota.pagado_gasto_cobranza,
        pagado_interes_mora: cuota.pagado_interes_mora,
        pagado_interes_corriente: cuota.pagado_interes_corriente,
        pagado_capital: cuota.pagado_capital,
      });

      const totalPendiente = totalDeuda(deuda);
      let monto = round2(toNum(monto_pagado));
      if (!monto || monto <= 0) monto = totalPendiente;
      if (monto <= 0) throw new Error('No hay saldo pendiente en esta cuota');

      const { abonos, excedenteCapitalPrincipal } = aplicarCascada(monto, deuda);

      const nuevoPagadoGasto = round2(toNum(cuota.pagado_gasto_cobranza) + abonos.gasto);
      const nuevoPagadoMora = round2(toNum(cuota.pagado_interes_mora) + abonos.mora);
      const nuevoPagadoInteres = round2(toNum(cuota.pagado_interes_corriente) + abonos.interes);
      const nuevoPagadoCapital = round2(toNum(cuota.pagado_capital) + abonos.capital);
      const nuevoAcumulado = round2(toNum(cuota.monto_pagado_acumulado) + monto);

      const deudaPost = calcularDeudaCuota({
        gasto_cobranza: gasto,
        monto_morosidad: moraInfo.monto_morosidad,
        interes_corriente: cuota.interes_corriente,
        capital_cuota: cuota.capital_cuota,
        pagado_gasto_cobranza: nuevoPagadoGasto,
        pagado_interes_mora: nuevoPagadoMora,
        pagado_interes_corriente: nuevoPagadoInteres,
        pagado_capital: nuevoPagadoCapital,
      });
      const liquidada = totalDeuda(deudaPost) <= 0.009;
      const nuevoEstado = liquidada
        ? 'por_confirmar'
        : moraInfo.dias_mora > 30
          ? 'vencido'
          : moraInfo.dias_mora > 0
            ? 'en_mora'
            : 'abono_parcial';

      const pagoResult = await client.query(
        `UPDATE cuota SET
          estado_cuota = $1,
          fecha_pagada = CASE WHEN $2 THEN $3 ELSE fecha_pagada END,
          dias_mora_cuota = $4, monto_morosidad = $5, gasto_cobranza = $6,
          pagado_gasto_cobranza = $7, pagado_interes_mora = $8,
          pagado_interes_corriente = $9, pagado_capital = $10,
          monto_pagado_acumulado = $11,
          comprobante = COALESCE($12, comprobante),
          metodo_pago = COALESCE($13, metodo_pago),
          titular_cedula = COALESCE($14, titular_cedula),
          titular_nombre = COALESCE($15, titular_nombre),
          capital_cuota = COALESCE(NULLIF(capital_cuota, 0), $16),
          interes_corriente = COALESCE(NULLIF(interes_corriente, 0), $17),
          referencia_pago = COALESCE(NULLIF($18, ''), referencia_pago),
          telefono_pago = COALESCE(NULLIF($19, ''), telefono_pago)
         WHERE id_cuota = $20 RETURNING *`,
        [
          nuevoEstado, liquidada, fecha_pagada || new Date().toISOString().split('T')[0],
          moraInfo.dias_mora, String(moraInfo.monto_morosidad), gasto,
          nuevoPagadoGasto, nuevoPagadoMora, nuevoPagadoInteres, nuevoPagadoCapital, nuevoAcumulado,
          comprobante, metodo_pago, String(titular_cedula).trim(), String(titular_nombre).trim(),
          toNum(cuota.capital_cuota), toNum(cuota.interes_corriente),
          referenciaFinal || null,
          String(metodo_pago) === 'pago_movil' ? telefonoFinal : (telefonoFinal || null),
          id_cuota,
        ]
      );

      await client.query(
        `INSERT INTO cuota_pago (
          id_cuota, id_contrato, monto_total,
          abono_gasto_cobranza, abono_interes_mora, abono_interes_corriente,
          abono_capital_cuota, abono_capital_principal,
          dias_mora, monto_morosidad_ref,
          comprobante, metodo_pago, titular_cedula, titular_nombre, fecha_pago,
          referencia_pago, telefono_pago,
          valor_idi, monto_bs_equivalente, fuente_idi
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          id_cuota, cuota.id_cuota_cont, monto,
          abonos.gasto, abonos.mora, abonos.interes, abonos.capital, excedenteCapitalPrincipal,
          moraInfo.dias_mora, toNum(moraInfo.monto_morosidad),
          comprobante, metodo_pago, String(titular_cedula).trim(), String(titular_nombre).trim(),
          fecha_pagada || new Date().toISOString().split('T')[0],
          referenciaFinal || null,
          String(metodo_pago) === 'pago_movil' ? telefonoFinal : (telefonoFinal || null),
          conversionUvc?.valor_idi ?? null,
          conversionUvc?.monto_bs ?? null,
          conversionUvc?.fuente ?? null,
        ]
      );

      let anticipos = [];
      if (excedenteCapitalPrincipal > 0.009) {
        anticipos = await this.aplicarExcedenteCapitalPrincipal(
          client, cuota.id_cuota_cont, id_cuota, excedenteCapitalPrincipal,
          {
            comprobante, metodo_pago,
            titular_cedula: String(titular_cedula).trim(),
            titular_nombre: String(titular_nombre).trim(),
            fecha_pagada: fecha_pagada || new Date().toISOString().split('T')[0],
            referencia_pago: referenciaFinal || null,
            telefono_pago: String(metodo_pago) === 'pago_movil' ? telefonoFinal : (telefonoFinal || null),
            valor_idi: conversionUvc?.valor_idi ?? null,
            monto_bs_equivalente: conversionUvc?.monto_bs ?? null,
            fuente_idi: conversionUvc?.fuente ?? null,
          }
        );
      }

      await client.query('COMMIT');
      return {
        ...pagoResult.rows[0],
        aplicacion_cascada: abonos,
        excedente_capital_principal: excedenteCapitalPrincipal,
        anticipos_capital: anticipos,
        deuda_restante: deudaPost,
        liquidada,
        conversion_uvc: conversionUvc,
        mensaje: liquidada
          ? 'Cuota liquidada en UVC (cascada). Pendiente de verificación institucional.'
          : 'Abono parcial en UVC aplicado por prioridad de cobro (gasto→mora→interés→capital).',
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
      console.error('Error en registrarPago:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async aplicarExcedenteCapitalPrincipal(client, idContrato, idCuotaOrigen, excedente, meta) {
    let restante = round2(excedente);
    const anticipos = [];
    if (restante <= 0) return anticipos;

    const siguientes = await client.query(
      `SELECT * FROM cuota
       WHERE id_cuota_cont = $1 AND id_cuota <> $2
         AND estado_cuota NOT IN ('pagado', 'por_confirmar')
       ORDER BY fecha_hasta ASC NULLS LAST, CAST(num_cuota AS INTEGER) ASC
       FOR UPDATE`,
      [idContrato, idCuotaOrigen]
    );

    for (const q of siguientes.rows) {
      if (restante <= 0.009) break;
      const capitalPend = round2(Math.max(0, toNum(q.capital_cuota) - toNum(q.pagado_capital)));
      if (capitalPend <= 0) continue;
      const abono = round2(Math.min(restante, capitalPend));
      const nuevoPagadoCap = round2(toNum(q.pagado_capital) + abono);
      const interesPend = round2(Math.max(0, toNum(q.interes_corriente) - toNum(q.pagado_interes_corriente)));
      const liquidable =
        interesPend <= 0.009 &&
        round2(Math.max(0, toNum(q.capital_cuota) - nuevoPagadoCap)) <= 0.009 &&
        toNum(q.pagado_gasto_cobranza) >= toNum(q.gasto_cobranza) - 0.009 &&
        toNum(q.pagado_interes_mora) >= toNum(q.monto_morosidad) - 0.009;

      await client.query(
        `UPDATE cuota SET
           pagado_capital = $1,
           monto_pagado_acumulado = COALESCE(monto_pagado_acumulado,0) + $2,
           estado_cuota = CASE WHEN $3 THEN 'por_confirmar' ELSE estado_cuota END,
           fecha_pagada = CASE WHEN $3 THEN $4 ELSE fecha_pagada END
         WHERE id_cuota = $5`,
        [nuevoPagadoCap, abono, liquidable, meta.fecha_pagada, q.id_cuota]
      );
      await client.query(
        `INSERT INTO cuota_pago (
          id_cuota, id_contrato, monto_total,
          abono_gasto_cobranza, abono_interes_mora, abono_interes_corriente,
          abono_capital_cuota, abono_capital_principal,
          comprobante, metodo_pago, titular_cedula, titular_nombre, fecha_pago,
          referencia_pago, telefono_pago,
          valor_idi, monto_bs_equivalente, fuente_idi
        ) VALUES ($1,$2,$3,0,0,0,$4,0,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          q.id_cuota, idContrato, abono, abono,
          meta.comprobante, meta.metodo_pago, meta.titular_cedula, meta.titular_nombre, meta.fecha_pagada,
          meta.referencia_pago || null, meta.telefono_pago || null,
          meta.valor_idi || null, meta.monto_bs_equivalente || null, meta.fuente_idi || null,
        ]
      );
      anticipos.push({ id_cuota: q.id_cuota, num_cuota: q.num_cuota, abono_capital: abono });
      restante = round2(restante - abono);
    }
    return anticipos;
  }



  /** Confirmar que el pago efectivamente ingresó → estatus pagado */
  static async confirmarPago(id_cuota) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cuotaRes = await client.query(
        `SELECT * FROM cuota WHERE id_cuota = $1 FOR UPDATE`,
        [id_cuota]
      );
      if (!cuotaRes.rows[0]) throw new Error('Cuota no encontrada');
      const cuota = cuotaRes.rows[0];

      if (cuota.estado_cuota === 'pagado') {
        await client.query('COMMIT');
        return cuota;
      }
      if (cuota.estado_cuota !== 'por_confirmar') {
        throw new Error('Solo se pueden confirmar cuotas en estado por_confirmar');
      }

      const upd = await client.query(
        `UPDATE cuota SET estado_cuota = 'pagado'
         WHERE id_cuota = $1 RETURNING *`,
        [id_cuota]
      );

      await this.recalcularCuotasGracia(cuota.id_cuota_cont, client);

      const check = await client.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(CASE WHEN estado_cuota = 'pagado' THEN 1 END)::int AS pagadas
         FROM cuota WHERE id_cuota_cont = $1`,
        [cuota.id_cuota_cont]
      );
      const { total, pagadas } = check.rows[0];

      if (total === pagadas) {
        await client.query(
          `UPDATE contrato
           SET estatus = 'Finalizado',
               cierre = COALESCE(cierre, CURRENT_DATE::text),
               updated_at = CURRENT_TIMESTAMP
           WHERE id_contrato = $1
             AND estatus IN ('Activo', 'Legal', 'En espera de cuotas')`,
          [cuota.id_cuota_cont]
        );
      }

      await client.query('COMMIT');
      return upd.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** Contratos con última cuota vencida y no todas pagadas → Legal */
  static async marcarContratosLegales() {
    const r = await pool.query(
      `UPDATE contrato c
       SET estatus = 'Legal', updated_at = CURRENT_TIMESTAMP
       WHERE c.estatus = 'Activo'
         AND EXISTS (
           SELECT 1 FROM cuota q WHERE q.id_cuota_cont = c.id_contrato
         )
         AND (
           SELECT MAX(q.fecha_hasta::date)
           FROM cuota q WHERE q.id_cuota_cont = c.id_contrato
         ) < CURRENT_DATE
         AND EXISTS (
           SELECT 1 FROM cuota q
           WHERE q.id_cuota_cont = c.id_contrato
             AND q.estado_cuota <> 'pagado'
         )
       RETURNING c.id_contrato, c.estatus`
    );
    return r.rows;
  }

  /** Datos para PDF de cumplimiento de contrato */
  static async getDatosCumplimiento(id_contrato) {
    const contrato = await pool.query(
      `SELECT
         c.*,
         a.cedula_persona_id,
         CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS emprendedor,
         p.cedula,
         p.telefono,
         p.correo
       FROM contrato c
       JOIN aprobacion a ON a.id_aprobacion = c.id_aprob
       LEFT JOIN persona p ON COALESCE(a.cedula_persona_id, c.id_cedula_aprob) = p.cedula
       WHERE c.id_contrato = $1`,
      [id_contrato]
    );
    if (!contrato.rows[0]) return null;
    const cuotas = await this.getCuotasByContratoId(id_contrato);
    return { ...contrato.rows[0], cuotas };
  }

  // Recalcular cuotas de gracia basado en el MONTO TOTAL ORIGINAL
// Recalcular SOLO cuotas de gracia basado en el MONTO TOTAL ORIGINAL
// Recalcular SOLO cuotas de gracia: SaldoPendiente / TotalGracias
static async recalcularCuotasGracia(id_contrato, client = null) {
    const dbClient = client || pool;
    const useTransaction = !client;
    
    try {
      if (useTransaction) {
        await dbClient.query('BEGIN');
      }
      
      console.log('=== RECALCULANDO CUOTAS GRACIA ===');
      console.log('ID Contrato:', id_contrato);
      
      // 1. Obtener TODAS las cuotas del contrato
      const cuotasQuery = `
        SELECT 
          id_cuota, 
          num_cuota, 
          tipo_cuota, 
          monto_cuota, 
          estado_cuota
        FROM cuota 
        WHERE id_cuota_cont = $1 
        ORDER BY CAST(num_cuota AS INTEGER) ASC
      `;
      const cuotasResult = await dbClient.query(cuotasQuery, [id_contrato]);
      const cuotas = cuotasResult.rows;
      
      // 2. Obtener datos del contrato
      const contratoQuery = `
        SELECT 
          devolvimiento, 
          monto_moneda,
          numero_gracias
        FROM contrato 
        WHERE id_contrato = $1
      `;
      const contratoResult = await dbClient.query(contratoQuery, [id_contrato]);
      const contrato = contratoResult.rows[0];
      
      const montoTotalOriginal = parseFloat(contrato.devolvimiento) || parseFloat(contrato.monto_moneda) || 0;
      const totalGracias = parseInt(contrato.numero_gracias) || 0;
      
      console.log('Monto Total Original:', montoTotalOriginal.toFixed(2));
      console.log('Total Gracias del contrato:', totalGracias);
      
      // Si no hay gracias configuradas, salir
      if (totalGracias === 0) {
        console.log('El contrato no tiene cuotas de gracia configuradas');
        if (useTransaction) await dbClient.query('COMMIT');
        return [];
      }
      
      // 3. Saldo que aún no está cubierto por lo pagado ni por obligatorias pendientes
      const cuotasPagadas = cuotas.filter((c) => c.estado_cuota === 'pagado');
      const montoTotalPagado = cuotasPagadas.reduce(
        (sum, c) => sum + (parseFloat(c.monto_cuota) || 0),
        0
      );
      const pendienteObligatorias = cuotas
        .filter(
          (c) =>
            String(c.tipo_cuota || '').toLowerCase().includes('oblig') &&
            c.estado_cuota !== 'pagado'
        )
        .reduce((sum, c) => sum + Math.max(0, parseFloat(c.monto_cuota) || 0), 0);

      const restanteParaGracias = Math.max(
        0,
        round2(montoTotalOriginal - montoTotalPagado - pendienteObligatorias)
      );

      console.log('Cuotas Pagadas:', cuotasPagadas.length);
      console.log('Monto Total Pagado:', montoTotalPagado.toFixed(2));
      console.log('Pendiente en obligatorias:', pendienteObligatorias.toFixed(2));
      console.log('Restante para gracias:', restanteParaGracias.toFixed(2));
      
      // 4. Filtrar SOLO las gracias PENDIENTES (no pagadas / no confirmadas)
      const cuotasGracia = cuotas.filter((c) =>
        String(c.tipo_cuota || '').toLowerCase().includes('gracia')
      );
      const cuotasGraciaPendientes = cuotasGracia.filter(
        (c) => !['pagado', 'por_confirmar'].includes(c.estado_cuota)
      );
      
      console.log('Total Cuotas Gracia:', cuotasGracia.length);
      console.log('Cuotas Gracia Pendientes:', cuotasGraciaPendientes.length);
      
      // Si no hay gracias pendientes, nada que recalcular
      if (cuotasGraciaPendientes.length === 0) {
        console.log('Todas las cuotas de gracia están pagadas o confirmadas');
        if (useTransaction) await dbClient.query('COMMIT');
        return [];
      }
      
      // 5. Repartir solo el faltante real entre gracias pendientes (nunca negativo)
      const montoPorGracia = round2(
        restanteParaGracias / cuotasGraciaPendientes.length
      );
      
      console.log('=== CÁLCULO ===');
      console.log('Restante para gracias:', restanteParaGracias.toFixed(2));
      console.log('÷ Gracias pendientes:', cuotasGraciaPendientes.length);
      console.log('= Monto por Gracia:', montoPorGracia.toFixed(2));
      
      // 6. Actualizar TODAS las cuotas de gracia (PENDIENTES) con el nuevo monto
      const cuotasActualizadas = [];
      
      for (let i = 0; i < cuotasGraciaPendientes.length; i++) {
        const cuota = cuotasGraciaPendientes[i];
        let monto = montoPorGracia;
        // Ajuste de centavos en la última
        if (i === cuotasGraciaPendientes.length - 1) {
          const asignadoAntes = round2(montoPorGracia * (cuotasGraciaPendientes.length - 1));
          monto = round2(Math.max(0, restanteParaGracias - asignadoAntes));
        }

        const result = await dbClient.query(
          `UPDATE cuota
           SET monto_cuota = $1,
               capital_cuota = 0,
               interes_corriente = $2
           WHERE id_cuota = $3
           RETURNING id_cuota, num_cuota, monto_cuota, tipo_cuota, estado_cuota`,
          [monto.toFixed(2), monto, cuota.id_cuota]
        );
        
        cuotasActualizadas.push(result.rows[0]);
        console.log(`✅ Cuota Gracia #${cuota.num_cuota}: $${monto.toFixed(2)}`);
      }
      
      // 7. Verificación final
      console.log('=== VERIFICACIÓN ===');
      const cuotasVerificacion = await dbClient.query(cuotasQuery, [id_contrato]);
      
      const totalObligatorias = cuotasVerificacion.rows
        .filter(c => c.tipo_cuota === 'Obligatoria')
        .reduce((sum, c) => sum + parseFloat(c.monto_cuota), 0);
      
      const totalGraciasVer = cuotasVerificacion.rows
        .filter(c => c.tipo_cuota === 'Gracias')
        .reduce((sum, c) => sum + parseFloat(c.monto_cuota), 0);
      
      console.log('Total Obligatorias:', totalObligatorias.toFixed(2));
      console.log('Total Gracias:', totalGraciasVer.toFixed(2));
      console.log('Gran Total:', (totalObligatorias + totalGraciasVer).toFixed(2));
      
      if (useTransaction) {
        await dbClient.query('COMMIT');
      }
      
      return cuotasActualizadas;
      
    } catch (error) {
      if (useTransaction) {
        await dbClient.query('ROLLBACK');
      }
      console.error('❌ Error en recalcularCuotasGracia:', error);
      throw error;
    }
  }

  // Generar cuotas para un contrato
  static async generarCuotasManual(id_contrato, configuracion) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      console.log('=== GENERANDO CUOTAS MANUALES ===');
      console.log('ID Contrato:', id_contrato);
      console.log('Configuración:', JSON.stringify(configuracion, null, 2));
      
      // Verificar si ya existen cuotas
      const checkQuery = 'SELECT COUNT(*) as total FROM cuota WHERE id_cuota_cont = $1';
      const checkResult = await client.query(checkQuery, [id_contrato]);
      const existingCount = parseInt(checkResult.rows[0].total);
      
      if (existingCount > 0) {
        throw new Error('Este contrato ya tiene cuotas generadas');
      }
      
      // Obtener datos del contrato
      const contratoQuery = `
        SELECT 
          id_contrato,
          monto_moneda,
          interes,
          devolvimiento,
          numero_cuotas,
          numero_gracias,
          inicio
                  FROM contrato 
        WHERE id_contrato = $1
      `;
      const contratoResult = await client.query(contratoQuery, [id_contrato]);
      const contrato = contratoResult.rows[0];
      
      if (!contrato) {
        throw new Error('Contrato no encontrado');
      }
      
      // Obtener configuración
      // BCV/UVC: no se permiten cuotas de gracia unilaterales (indexación diaria del capital).
      const cuotasObligatorias = parseInt(configuracion.cantidadCuotas) || 0;
      const cuotasGracia = 0;
      
      // TOTAL DE CUOTAS = solo obligatorias (sin prórrogas/gracia)
      const totalCuotas = cuotasObligatorias;
      
      // Monto total del préstamo expresado en UVC (devolvimiento)
      const montoTotal = parseFloat(contrato.devolvimiento) || parseFloat(contrato.monto_moneda) || 0;
      const montoMoneda = parseFloat(contrato.monto_moneda) || 0;

      const montoBase = totalCuotas > 0 ? round2(montoTotal / totalCuotas) : 0;
      const capitalBase = totalCuotas > 0 ? round2(montoMoneda / totalCuotas) : 0;

      console.log('Cuotas Obligatorias a generar:', cuotasObligatorias);
      console.log('Cuotas Gracia (forzado UVC/BCV):', cuotasGracia);
      console.log('Total Cuotas:', totalCuotas);
      console.log('Monto Total (UVC):', montoTotal);
      console.log('Monto base por cuota (UVC):', montoBase.toFixed(2));
      console.log('Capital base por cuota (UVC):', capitalBase.toFixed(2));
      
      // Obtener el máximo id_cuota
      const maxIdQuery = 'SELECT COALESCE(MAX(id_cuota), 0) as max_id FROM cuota';
      const maxIdResult = await client.query(maxIdQuery);
      let nextId = parseInt(maxIdResult.rows[0].max_id) + 1;
      
      const cuotasGeneradas = [];
      let fechaActual = new Date(configuracion.fechaPrimeraCuota);
      const frecuencia = configuracion.frecuencia || 'mensual';
      let sumaAsignada = 0;
      let capitalAsignado = 0;
      
      // Generar todas las cuotas (obligatorias + gracias)
      for (let i = 0; i < totalCuotas; i++) {
        const numeroCuota = i + 1;
        const esUltima = i === totalCuotas - 1;
        const tipoCuota = numeroCuota <= cuotasObligatorias ? 'Obligatoria' : 'Gracias';

        let montoCuota = esUltima ? round2(montoTotal - sumaAsignada) : montoBase;
        if (montoCuota < 0) montoCuota = 0;
        sumaAsignada = round2(sumaAsignada + montoCuota);

        let capitalCuota = esUltima
          ? round2(Math.max(0, Math.min(montoCuota, montoMoneda - capitalAsignado)))
          : round2(Math.min(montoCuota, capitalBase));
        capitalAsignado = round2(capitalAsignado + capitalCuota);
        const interesCuota = round2(Math.max(0, montoCuota - capitalCuota));
        
        // Calcular fechas según la frecuencia
        let fechaDesde = new Date(fechaActual);
        let fechaHasta = new Date(fechaActual);
        
        switch(frecuencia) {
          case 'mensual':
            fechaHasta.setMonth(fechaHasta.getMonth() + 1);
            fechaHasta.setDate(fechaHasta.getDate() - 1);
            break;
          case 'quincenal':
            fechaHasta.setDate(fechaHasta.getDate() + 14);
            break;
          case 'semanal':
            fechaHasta.setDate(fechaHasta.getDate() + 6);
            break;
          default:
            fechaHasta.setMonth(fechaHasta.getMonth() + 1);
            fechaHasta.setDate(fechaHasta.getDate() - 1);
        }
        
        const fechaDesdeStr = fechaDesde.toISOString().split('T')[0];
        const fechaHastaStr = fechaHasta.toISOString().split('T')[0];
        
        const insertQuery = `
          INSERT INTO cuota (
            id_cuota,
            id_cuota_cont, 
            num_cuota, 
            fecha_desde,
            fecha_hasta,
            monto_cuota,
            capital_cuota,
            interes_corriente,
            estado_cuota,
            tipo_cuota,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
          RETURNING id_cuota
        `;
        
        const result = await client.query(insertQuery, [
          nextId++,
          id_contrato,
          numeroCuota.toString(),
          fechaDesdeStr,
          fechaHastaStr,
          montoCuota.toFixed(2),
          capitalCuota,
          interesCuota,
          'pendiente',
          tipoCuota
        ]);
        
        cuotasGeneradas.push({
          id_cuota: result.rows[0].id_cuota,
          numero: numeroCuota,
          tipo: tipoCuota,
          fecha_desde: fechaDesdeStr,
          fecha_hasta: fechaHastaStr,
          monto: montoCuota
        });
        
        // Avanzar fecha para la siguiente cuota
        switch(frecuencia) {
          case 'mensual':
            fechaActual.setMonth(fechaActual.getMonth() + 1);
            break;
          case 'quincenal':
            fechaActual.setDate(fechaActual.getDate() + 15);
            break;
          case 'semanal':
            fechaActual.setDate(fechaActual.getDate() + 7);
            break;
        }
      }
      
      // Verificación final
      const sumaTotal = cuotasGeneradas.reduce((sum, c) => sum + c.monto, 0);
      console.log('=== VERIFICACIÓN DE MONTOS ===');
      console.log('Suma total de cuotas:', sumaTotal.toFixed(2));
      console.log('Monto total del préstamo:', montoTotal.toFixed(2));
      console.log('Diferencia:', round2(sumaTotal - montoTotal).toFixed(2));
      
      // Actualizar estatus del contrato (sin gracias unilaterales bajo UVC/BCV)
      await client.query(
        `UPDATE contrato 
         SET estatus = 'Activo', 
             numero_cuotas = $1,
             numero_gracias = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id_contrato = $2`,
        [totalCuotas, id_contrato]
      );
      
      await client.query('COMMIT');
      
      console.log('✅ Cuotas generadas exitosamente');
      return cuotasGeneradas;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error en generarCuotasManual:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mora UVC (BCV): tope 0,80% anual adicional.
   * Mora = Monto vencido × (tasa_anual / 360) × días
   * @param {number} tasaAnual - tasa de mora anual en decimal (ej. 0.008 = 0,8% anual)
   */
  static calcularMora(
    fechaVencimiento,
    montoCuota,
    fechaActual = new Date(),
    tasaAnual = 0.008,
    diasGracia = 5
  ) {
    const vencimiento = new Date(fechaVencimiento);
    const hoy = new Date(fechaActual);
    hoy.setHours(0, 0, 0, 0);
    vencimiento.setHours(0, 0, 0, 0);

    if (hoy > vencimiento) {
      const diffTime = Math.abs(hoy - vencimiento);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= toNum(diasGracia, 5)) {
        return { dias_mora: 0, monto_morosidad: '0' };
      }

      const tasaRaw = toNum(tasaAnual, 0.008) > 0 ? toNum(tasaAnual, 0.008) : 0.008;
      const tasa = Math.min(tasaRaw, 0.008);
      const tasaDiaria = tasa / 360;
      const montoMora = parseFloat(montoCuota) * tasaDiaria * diffDays;

      return {
        dias_mora: diffDays,
        monto_morosidad: montoMora.toFixed(2),
      };
    }

    return { dias_mora: 0, monto_morosidad: '0' };
  }

  // Actualizar estado de mora para todas las cuotas pendientes
  static async actualizarEstadosMora() {
    const query = `
      SELECT
        q.id_cuota,
        q.id_cuota_cont,
        q.fecha_desde,
        q.fecha_hasta,
        q.monto_cuota,
        q.estado_cuota,
        c.morosidad,
        cfg.dias_gracia_mora,
        cfg.morosidad_porcentaje
      FROM cuota q
      LEFT JOIN contrato c ON c.id_contrato = q.id_cuota_cont
      LEFT JOIN configuracion_contrato cfg ON cfg.id_configuracion = c.id_config
      WHERE q.estado_cuota IN ('pendiente', 'en_mora', 'vencido', 'abono_parcial')
    `;
    
    try {
      const cuotas = await pool.query(query);
      
      for (const cuota of cuotas.rows) {
        const tasaAnual =
          toNum(cuota.morosidad_porcentaje, 0) > 0
            ? toNum(cuota.morosidad_porcentaje) / 100
            : toNum(cuota.morosidad, 0) > 0
              ? toNum(cuota.morosidad) / 100
              : 0.03;
        const diasGracia = toNum(cuota.dias_gracia_mora, 5);
        const { dias_mora, monto_morosidad } = this.calcularMora(
          cuota.fecha_hasta,
          cuota.monto_cuota,
          new Date(),
          tasaAnual,
          diasGracia
        );
        
        let nuevoEstado = cuota.estado_cuota;
        if (cuota.estado_cuota === 'abono_parcial') {
          // Mantener abono parcial; solo actualizar días/monto de mora
        } else if (dias_mora > 0 && cuota.estado_cuota !== 'pagado') {
          nuevoEstado = dias_mora > 30 ? 'vencido' : 'en_mora';
        } else if (dias_mora === 0 && cuota.estado_cuota !== 'pagado') {
          nuevoEstado = 'pendiente';
        }
        
        if (nuevoEstado !== cuota.estado_cuota || dias_mora > 0) {
          const updateQuery = `
            UPDATE cuota 
            SET estado_cuota = $1, 
                dias_mora_cuota = $2, 
                monto_morosidad = $3
            WHERE id_cuota = $4
          `;
          await pool.query(updateQuery, [nuevoEstado, dias_mora, monto_morosidad, cuota.id_cuota]);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error en actualizarEstadosMora:', error);
      throw error;
    }
  }
}

module.exports = CuotaModel;