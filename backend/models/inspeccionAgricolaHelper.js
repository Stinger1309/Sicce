/**
 * Persistencia de datos de inspección agrícola
 * (unidad_produccion → anexos_fotografias)
 */

function num(v, def = null) {
  if (v === '' || v === undefined || v === null) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function bool(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

async function insertAgricolaCompleto(client, idInspeccion, data) {
  // II. Unidad de producción
  if (data.unidad_produccion) {
    await insertUnidadProduccion(client, idInspeccion, data.unidad_produccion);
  }

  // III. Condiciones
  if (data.condiciones_explotacion) {
    await insertCondiciones(client, idInspeccion, data.condiciones_explotacion);
  }

  // IV. Uso de tierra
  if (data.uso_actual_tierra) {
    await insertUsoTierra(client, idInspeccion, data.uso_actual_tierra);
  }

  // V. Infraestructura
  if (data.infraestructura) {
    await insertInfraestructura(client, idInspeccion, data.infraestructura);
  }

  // VI. Maquinaria
  if (data.maquinaria_equipo) {
    await insertMaquinaria(client, idInspeccion, data.maquinaria_equipo);
  }

  // VII. Producción
  if (data.produccion) {
    await insertProduccion(client, idInspeccion, data.produccion);
  }

  // VIII. Prácticas
  if (data.practicas_agronomicas) {
    await insertPracticas(client, idInspeccion, data.practicas_agronomicas);
  }

  // IX. Pastizales
  if (data.pastizales) {
    await insertPastizales(client, idInspeccion, data.pastizales);
  }

  // X. Servicios
  if (data.servicios) {
    await insertServicios(client, idInspeccion, data.servicios);
  }

  // XI. Costos
  if (data.costos_produccion) {
    await insertCostos(client, idInspeccion, data.costos_produccion);
  }

  // XII. Financieros
  if (data.financieros) {
    await insertFinancieros(client, idInspeccion, data.financieros);
  }

  // XIII. Crédito
  if (data.credito) {
    await insertCredito(client, idInspeccion, data.credito);
  }

  // XIV. Anexos
  if (data.anexos) {
    await insertAnexos(client, idInspeccion, data.anexos);
  }
}

async function insertUnidadProduccion(client, idInspeccion, up) {
  const result = await client.query(
    `INSERT INTO unidad_produccion (
      inspeccion_id, ubicacion_practica, vias_acceso, tenencia,
      otro_tenencia, vive_en_unidad_produccion
    ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [
      idInspeccion,
      up.ubicacion_practica || null,
      up.vias_acceso || null,
      up.tenencia || 'propia',
      up.otro_tenencia || null,
      up.vive_en_unidad_produccion === null || up.vive_en_unidad_produccion === undefined
        ? null
        : bool(up.vive_en_unidad_produccion)
    ]
  );
  const unidadId = result.rows[0].id;

  const lin = up.linderos || {};
  await client.query(
    `INSERT INTO linderos (unidad_produccion_id, norte, este, sur, oeste)
     VALUES ($1,$2,$3,$4,$5)`,
    [unidadId, lin.norte || null, lin.este || null, lin.sur || null, lin.oeste || null]
  );

  const topo = up.topografia_superficie || {};
  const p = topo.planas || {};
  const o = topo.onduladas || {};
  const q = topo.quebradas || {};
  const a = topo.anegadizas || {};
  await client.query(
    `INSERT INTO topografia_superficie (
      unidad_produccion_id,
      planas_ha, planas_uso, planas_observaciones,
      onduladas_ha, onduladas_uso, onduladas_observaciones,
      quebradas_ha, quebradas_uso, quebradas_observaciones,
      anegadizas_ha, anegadizas_uso, anegadizas_observaciones
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      unidadId,
      num(p.ha), p.uso || null, p.observaciones || null,
      num(o.ha), o.uso || null, o.observaciones || null,
      num(q.ha), q.uso || null, q.observaciones || null,
      num(a.ha), a.uso || null, a.observaciones || null
    ]
  );
}

async function insertCondiciones(client, idInspeccion, cond) {
  const adm = cond.administracion || {};
  await client.query(
    `INSERT INTO condiciones_administracion (
      inspeccion_id, tipo, nombre_administrador, experiencia_anos,
      lleva_registro_fisico, lleva_registro_economico,
      especificacion_fisico, especificacion_economico, observaciones
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      idInspeccion,
      adm.tipo || 'directa',
      adm.nombre_administrador || null,
      num(adm.experiencia_anos),
      bool(adm.lleva_registro_fisico),
      bool(adm.lleva_registro_economico),
      adm.especificacion_fisico || null,
      adm.especificacion_economico || null,
      adm.observaciones || null
    ]
  );

  const personal = Array.isArray(cond.personal) ? cond.personal : [];
  for (const p of personal) {
    await client.query(
      `INSERT INTO personal (
        inspeccion_id, cargo, fijos, eventuales, familiar, otro_descripcion
      ) VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        idInspeccion,
        p.cargo || null,
        num(p.fijos, 0),
        num(p.eventuales, 0),
        bool(p.familiar),
        p.otro_descripcion || null
      ]
    );
  }
}

async function insertUsoTierra(client, idInspeccion, uso) {
  for (const item of uso.agricultura || []) {
    await client.query(
      `INSERT INTO uso_agricultura (inspeccion_id, cultivo, superficie_ha) VALUES ($1,$2,$3)`,
      [idInspeccion, item.cultivo || item.nombre || null, num(item.superficie_ha || item.ha)]
    );
  }
  for (const item of uso.pecuario || []) {
    await client.query(
      `INSERT INTO uso_pecuario (inspeccion_id, tipo, superficie_ha) VALUES ($1,$2,$3)`,
      [idInspeccion, item.tipo || item.nombre || null, num(item.superficie_ha || item.ha)]
    );
  }
  for (const item of uso.otros || []) {
    await client.query(
      `INSERT INTO uso_otros (inspeccion_id, descripcion, superficie_ha) VALUES ($1,$2,$3)`,
      [idInspeccion, item.descripcion || item.nombre || null, num(item.superficie_ha || item.ha)]
    );
  }
}

async function insertInfraestructura(client, idInspeccion, infra) {
  const result = await client.query(
    `INSERT INTO infraestructura (
      inspeccion_id, vivienda, deposito_insumos, galpon, establo, corral, otro,
      otros_especificar, electricidad, telefonia, internet
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      idInspeccion,
      bool(infra.vivienda),
      bool(infra.deposito_insumos),
      bool(infra.galpon),
      bool(infra.establo),
      bool(infra.corral),
      bool(infra.otro),
      infra.otros_especificar || null,
      bool(infra.electricidad),
      bool(infra.telefonia),
      bool(infra.internet)
    ]
  );
  const infraId = result.rows[0].id;
  const aguas = infra.aguas || {};
  await client.query(
    `INSERT INTO fuentes_agua (
      infraestructura_id, pozo, riego, acueducto, rio_quebrada, otro
    ) VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      infraId,
      bool(aguas.pozo),
      bool(aguas.riego),
      bool(aguas.acueducto),
      bool(aguas.rio_quebrada),
      aguas.otro || null
    ]
  );
}

async function insertMaquinaria(client, idInspeccion, lista) {
  const items = Array.isArray(lista) ? lista : [];
  for (const m of items) {
    await client.query(
      `INSERT INTO maquinaria_equipo (
        inspeccion_id, tipo, descripcion, cantidad, estado, precio_unitario
      ) VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        idInspeccion,
        m.tipo === 'solicitado' ? 'solicitado' : 'existente',
        m.descripcion || m.nombre || null,
        num(m.cantidad, 0),
        m.estado || null,
        num(m.precio_unitario || m.precio)
      ]
    );
  }
}

async function insertProduccion(client, idInspeccion, prod) {
  const mapTipo = {
    agricola: 'agricola',
    agrícola: 'agricola',
    pecuario: 'pecuaria',
    pecuaria: 'pecuaria',
    mixto: 'mixta',
    mixta: 'mixta',
    forestal: 'forestal',
    agroindustrial: 'agroindustrial'
  };
  const tiposPermitidos = new Set([
    'agricola',
    'pecuaria',
    'mixta',
    'forestal',
    'agroindustrial'
  ]);

  const tipos = Array.isArray(prod.tipo_explotacion) ? prod.tipo_explotacion : [];
  const insertados = new Set();
  for (const t of tipos) {
    const raw = String(typeof t === 'string' ? t : t.tipo || t.value || '')
      .trim()
      .toLowerCase();
    if (!raw) continue;
    const tipo = mapTipo[raw] || raw;
    if (!tiposPermitidos.has(tipo) || insertados.has(tipo)) continue;
    insertados.add(tipo);
    await client.query(
      `INSERT INTO produccion_tipo_explotacion (inspeccion_id, tipo) VALUES ($1,$2)`,
      [idInspeccion, tipo]
    );
  }

  const años = Array.isArray(prod.produccion_ultimos_2_anos) ? prod.produccion_ultimos_2_anos : [];
  for (const p of años) {
    await client.query(
      `INSERT INTO produccion_ultimos_2_anos (
        inspeccion_id, rubro, ano, cantidad, valor_bs
      ) VALUES ($1,$2,$3,$4,$5)`,
      [
        idInspeccion,
        p.rubro || null,
        p.ano ? String(p.ano) : null,
        p.cantidad != null ? String(p.cantidad) : null,
        num(p.valor_bs)
      ]
    );
  }
}

async function insertPracticas(client, idInspeccion, prac) {
  await client.query(
    `INSERT INTO practicas_agronomicas (
      inspeccion_id, preparacion_suelo, siembra, fertilizacion,
      control_plagas, control_malezas, riego, cosecha, observaciones
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      idInspeccion,
      prac.preparacion_suelo || null,
      prac.siembra || null,
      prac.fertilizacion || null,
      prac.control_plagas || null,
      prac.control_malezas || null,
      prac.riego || null,
      prac.cosecha || null,
      prac.observaciones || null
    ]
  );
}

async function insertPastizales(client, idInspeccion, past) {
  const result = await client.query(
    `INSERT INTO pastizales (inspeccion_id, numero_potreros, manejo_pasto)
     VALUES ($1,$2,$3) RETURNING id`,
    [idInspeccion, past.numero_potreros != null ? String(past.numero_potreros) : null, past.manejo_pasto || null]
  );
  const pastId = result.rows[0].id;
  for (const p of past.pastos || []) {
    await client.query(
      `INSERT INTO pastizales_pastos (
        pastizales_id, nombre, forma_uso, superficie_ha, carga_ua_ha, aprovechamiento
      ) VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        pastId,
        p.nombre || null,
        p.forma_uso || null,
        num(p.superficie_ha || p.ha),
        num(p.carga_ua_ha),
        num(p.aprovechamiento)
      ]
    );
  }
}

async function insertServicios(client, idInspeccion, srv) {
  await client.query(
    `INSERT INTO servicios (
      inspeccion_id, mercadeo_comercializacion, personal_tecnico, servicios_produccion
    ) VALUES ($1,$2,$3,$4)`,
    [
      idInspeccion,
      srv.mercadeo_comercializacion || null,
      srv.personal_tecnico || null,
      srv.servicios_produccion || null
    ]
  );
}

async function insertCostos(client, idInspeccion, costos) {
  const result = await client.query(
    `INSERT INTO costos_produccion (inspeccion_id, total_bs) VALUES ($1,$2) RETURNING id`,
    [idInspeccion, num(costos.total_bs)]
  );
  const costosId = result.rows[0].id;
  for (const r of costos.rubros || []) {
    await client.query(
      `INSERT INTO costos_produccion_rubros (costos_produccion_id, concepto, monto_bs)
       VALUES ($1,$2,$3)`,
      [costosId, r.concepto || r.nombre || null, num(r.monto_bs || r.monto)]
    );
  }
}

async function insertFinancieros(client, idInspeccion, fin) {
  const fc = fin.flujo_caja || {};
  const anos = fc.anos || [1, 2, 3, 4, 5];
  const ingresos = fc.ingresos || [];
  const cd = fc.costos_directos || [];
  const cf = fc.costos_financieros || [];
  const oc = fc.otros_costos || [];
  const util = fc.utilidad || [];

  await client.query(
    `INSERT INTO flujo_caja (
      inspeccion_id,
      ano_1, ano_2, ano_3, ano_4, ano_5,
      ingresos_1, ingresos_2, ingresos_3, ingresos_4, ingresos_5,
      costos_directos_1, costos_directos_2, costos_directos_3, costos_directos_4, costos_directos_5,
      costos_financieros_1, costos_financieros_2, costos_financieros_3, costos_financieros_4, costos_financieros_5,
      otros_costos_1, otros_costos_2, otros_costos_3, otros_costos_4, otros_costos_5,
      utilidad_1, utilidad_2, utilidad_3, utilidad_4, utilidad_5
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
      $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
    )`,
    [
      idInspeccion,
      num(anos[0], 1), num(anos[1], 2), num(anos[2], 3), num(anos[3], 4), num(anos[4], 5),
      num(ingresos[0]), num(ingresos[1]), num(ingresos[2]), num(ingresos[3]), num(ingresos[4]),
      num(cd[0]), num(cd[1]), num(cd[2]), num(cd[3]), num(cd[4]),
      num(cf[0]), num(cf[1]), num(cf[2]), num(cf[3]), num(cf[4]),
      num(oc[0]), num(oc[1]), num(oc[2]), num(oc[3]), num(oc[4]),
      num(util[0]), num(util[1]), num(util[2]), num(util[3]), num(util[4])
    ]
  );

  await client.query(
    `INSERT INTO financieros (inspeccion_id, rentabilidad_estatica) VALUES ($1,$2)`,
    [idInspeccion, fin.rentabilidad_estatica != null ? String(fin.rentabilidad_estatica) : null]
  );
}

async function insertCredito(client, idInspeccion, cred) {
  await client.query(
    `INSERT INTO credito (
      inspeccion_id, monto_solicitado, monto_recomendado, uso_credito,
      empleos_generar, importancia_economica_social, recomendaciones
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      idInspeccion,
      num(cred.monto_solicitado),
      num(cred.monto_recomendado),
      cred.uso_credito || null,
      cred.empleos_generar != null ? String(cred.empleos_generar) : null,
      cred.importancia_economica_social || null,
      cred.recomendaciones || null
    ]
  );
}

async function insertAnexos(client, idInspeccion, anexos) {
  const result = await client.query(
    `INSERT INTO anexos (inspeccion_id, croquis_url) VALUES ($1,$2) RETURNING id`,
    [idInspeccion, anexos.croquis_url || null]
  );
  const anexosId = result.rows[0].id;
  for (const f of anexos.fotografias || []) {
    const url = typeof f === 'string' ? f : (f.foto_url || f.url || null);
    const desc = typeof f === 'object' ? (f.descripcion || f.name || null) : null;
    if (!url) continue;
    await client.query(
      `INSERT INTO anexos_fotografias (anexos_id, foto_url, descripcion) VALUES ($1,$2,$3)`,
      [anexosId, url, desc]
    );
  }
}

async function deleteAgricolaData(client, idInspeccion) {
  // Hijos primero
  await client.query(`
    DELETE FROM anexos_fotografias
    WHERE anexos_id IN (SELECT id FROM anexos WHERE inspeccion_id = $1)
  `, [idInspeccion]);
  await client.query('DELETE FROM anexos WHERE inspeccion_id = $1', [idInspeccion]);

  await client.query('DELETE FROM credito WHERE inspeccion_id = $1', [idInspeccion]);
  await client.query('DELETE FROM financieros WHERE inspeccion_id = $1', [idInspeccion]);
  await client.query('DELETE FROM flujo_caja WHERE inspeccion_id = $1', [idInspeccion]);

  await client.query(`
    DELETE FROM costos_produccion_rubros
    WHERE costos_produccion_id IN (SELECT id FROM costos_produccion WHERE inspeccion_id = $1)
  `, [idInspeccion]);
  await client.query('DELETE FROM costos_produccion WHERE inspeccion_id = $1', [idInspeccion]);

  await client.query('DELETE FROM servicios WHERE inspeccion_id = $1', [idInspeccion]);

  await client.query(`
    DELETE FROM pastizales_pastos
    WHERE pastizales_id IN (SELECT id FROM pastizales WHERE inspeccion_id = $1)
  `, [idInspeccion]);
  await client.query('DELETE FROM pastizales WHERE inspeccion_id = $1', [idInspeccion]);

  await client.query('DELETE FROM practicas_agronomicas WHERE inspeccion_id = $1', [idInspeccion]);
  await client.query('DELETE FROM produccion_ultimos_2_anos WHERE inspeccion_id = $1', [idInspeccion]);
  await client.query('DELETE FROM produccion_tipo_explotacion WHERE inspeccion_id = $1', [idInspeccion]);
  await client.query('DELETE FROM maquinaria_equipo WHERE inspeccion_id = $1', [idInspeccion]);

  await client.query(`
    DELETE FROM fuentes_agua
    WHERE infraestructura_id IN (SELECT id FROM infraestructura WHERE inspeccion_id = $1)
  `, [idInspeccion]);
  await client.query('DELETE FROM infraestructura WHERE inspeccion_id = $1', [idInspeccion]);

  await client.query('DELETE FROM uso_agricultura WHERE inspeccion_id = $1', [idInspeccion]);
  await client.query('DELETE FROM uso_pecuario WHERE inspeccion_id = $1', [idInspeccion]);
  await client.query('DELETE FROM uso_otros WHERE inspeccion_id = $1', [idInspeccion]);
  await client.query('DELETE FROM personal WHERE inspeccion_id = $1', [idInspeccion]);
  await client.query('DELETE FROM condiciones_administracion WHERE inspeccion_id = $1', [idInspeccion]);

  await client.query(`
    DELETE FROM linderos
    WHERE unidad_produccion_id IN (SELECT id FROM unidad_produccion WHERE inspeccion_id = $1)
  `, [idInspeccion]);
  await client.query(`
    DELETE FROM topografia_superficie
    WHERE unidad_produccion_id IN (SELECT id FROM unidad_produccion WHERE inspeccion_id = $1)
  `, [idInspeccion]);
  await client.query('DELETE FROM unidad_produccion WHERE inspeccion_id = $1', [idInspeccion]);
}

async function loadAgricolaData(client, idInspeccion, inspection) {
  const up = await client.query('SELECT * FROM unidad_produccion WHERE inspeccion_id = $1', [idInspeccion]);
  if (up.rows[0]) {
    const unidad = up.rows[0];
    const lin = await client.query('SELECT * FROM linderos WHERE unidad_produccion_id = $1', [unidad.id]);
    const topo = await client.query('SELECT * FROM topografia_superficie WHERE unidad_produccion_id = $1', [unidad.id]);
    inspection.unidad_produccion = {
      ...unidad,
      linderos: lin.rows[0] || null,
      topografia_superficie: topo.rows[0] || null
    };
  } else {
    inspection.unidad_produccion = null;
  }

  const cond = await client.query('SELECT * FROM condiciones_administracion WHERE inspeccion_id = $1', [idInspeccion]);
  const personal = await client.query('SELECT * FROM personal WHERE inspeccion_id = $1', [idInspeccion]);
  inspection.condiciones_explotacion = cond.rows[0]
    ? { administracion: cond.rows[0], personal: personal.rows }
    : null;

  inspection.uso_actual_tierra = {
    agricultura: (await client.query('SELECT * FROM uso_agricultura WHERE inspeccion_id = $1', [idInspeccion])).rows,
    pecuario: (await client.query('SELECT * FROM uso_pecuario WHERE inspeccion_id = $1', [idInspeccion])).rows,
    otros: (await client.query('SELECT * FROM uso_otros WHERE inspeccion_id = $1', [idInspeccion])).rows
  };

  const infra = await client.query('SELECT * FROM infraestructura WHERE inspeccion_id = $1', [idInspeccion]);
  if (infra.rows[0]) {
    const aguas = await client.query('SELECT * FROM fuentes_agua WHERE infraestructura_id = $1', [infra.rows[0].id]);
    inspection.infraestructura = { ...infra.rows[0], aguas: aguas.rows[0] || null };
  } else {
    inspection.infraestructura = null;
  }

  inspection.maquinaria_equipo = (await client.query('SELECT * FROM maquinaria_equipo WHERE inspeccion_id = $1', [idInspeccion])).rows;

  inspection.produccion = {
    tipo_explotacion: (await client.query('SELECT * FROM produccion_tipo_explotacion WHERE inspeccion_id = $1', [idInspeccion])).rows,
    produccion_ultimos_2_anos: (await client.query('SELECT * FROM produccion_ultimos_2_anos WHERE inspeccion_id = $1', [idInspeccion])).rows
  };

  const prac = await client.query('SELECT * FROM practicas_agronomicas WHERE inspeccion_id = $1', [idInspeccion]);
  inspection.practicas_agronomicas = prac.rows[0] || null;

  const past = await client.query('SELECT * FROM pastizales WHERE inspeccion_id = $1', [idInspeccion]);
  if (past.rows[0]) {
    const pastos = await client.query('SELECT * FROM pastizales_pastos WHERE pastizales_id = $1', [past.rows[0].id]);
    inspection.pastizales = { ...past.rows[0], pastos: pastos.rows };
  } else {
    inspection.pastizales = null;
  }

  const srv = await client.query('SELECT * FROM servicios WHERE inspeccion_id = $1', [idInspeccion]);
  inspection.servicios = srv.rows[0] || null;

  const costos = await client.query('SELECT * FROM costos_produccion WHERE inspeccion_id = $1', [idInspeccion]);
  if (costos.rows[0]) {
    const rubros = await client.query('SELECT * FROM costos_produccion_rubros WHERE costos_produccion_id = $1', [costos.rows[0].id]);
    inspection.costos_produccion = { ...costos.rows[0], rubros: rubros.rows };
  } else {
    inspection.costos_produccion = null;
  }

  const flujo = await client.query('SELECT * FROM flujo_caja WHERE inspeccion_id = $1', [idInspeccion]);
  const fin = await client.query('SELECT * FROM financieros WHERE inspeccion_id = $1', [idInspeccion]);
  inspection.financieros = {
    flujo_caja: flujo.rows[0] || null,
    rentabilidad_estatica: fin.rows[0]?.rentabilidad_estatica || null
  };

  const cred = await client.query('SELECT * FROM credito WHERE inspeccion_id = $1', [idInspeccion]);
  inspection.credito = cred.rows[0] || null;

  const anex = await client.query('SELECT * FROM anexos WHERE inspeccion_id = $1', [idInspeccion]);
  if (anex.rows[0]) {
    const fotos = await client.query('SELECT * FROM anexos_fotografias WHERE anexos_id = $1', [anex.rows[0].id]);
    inspection.anexos = { ...anex.rows[0], fotografias: fotos.rows };
  } else {
    inspection.anexos = null;
  }

  return inspection;
}

function isAgricolaPayload(data) {
  return !!(
    data?.tipo_formulario === 'agricola_reinspeccion' ||
    data?.unidad_produccion ||
    data?.condiciones_explotacion ||
    data?.practicas_agronomicas
  );
}

module.exports = {
  insertAgricolaCompleto,
  deleteAgricolaData,
  loadAgricolaData,
  isAgricolaPayload
};
