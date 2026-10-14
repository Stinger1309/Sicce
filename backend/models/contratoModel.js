const pool = require('../config/db');

class ContratoModel {
  // ==================== MÉTODOS DE CONTRATO ====================
  
  // Obtener todos los contratos con aprobaciones de manejo interno
  static async getAll() {
    const query = `
      SELECT 
        a.id_aprobacion,
        a.id_inspeccion,
        a.id_expediente,
        a.verificacion_requisitos,
        a.estatus_aprobacion,
        a.cedula_persona_id,
        a.seleccion_manejo,
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
        c.interes as interes_porcentaje,
        c.devolvimiento,
        c.numero_cuotas,
        c.numero_gracias,
        c.inicio,
        c.cierre,
        c.estatus,
        c.frecuencia_pago_contrato,
        c.morosidad,
        c.foto_contrato,
        c.created_at as contrato_created_at,
        c.updated_at as contrato_updated_at,
        d.id_desembolso,
        d.fecha_desembolso,
        d.capture_desembolso,
        d.estatus_desembolso,
        d.fecha_confirmacion,
        CONCAT(COALESCE(p.nombres, ''), ' ', COALESCE(p.apellidos, '')) AS emprendedor,
        p.cedula,
        p.telefono,
        e.codigo_expediente,
        s.monto_solicitado
      FROM aprobacion a
      LEFT JOIN contrato c ON a.id_aprobacion = c.id_aprob
      LEFT JOIN desembolso d ON c.id_contrato = d.id_cont
      LEFT JOIN persona p ON a.cedula_persona_id = p.cedula
      LEFT JOIN expediente e ON a.id_expediente = e.id_expediente
      LEFT JOIN solicitud s ON e.id_solicitud = s.id_solicitud
      WHERE a.seleccion_manejo = 'Interno'
        AND (
          LOWER(COALESCE(a.estatus_aprobacion, '')) LIKE '%aprob%'
          OR c.id_contrato IS NOT NULL
        )
      ORDER BY a.id_aprobacion DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getMontoSolicitadoByAprobacion(id_aprobacion) {
    const result = await pool.query(
      `
      SELECT s.monto_solicitado
      FROM aprobacion a
      LEFT JOIN expediente e ON e.id_expediente = a.id_expediente
      LEFT JOIN solicitud s ON s.id_solicitud = e.id_solicitud
      WHERE a.id_aprobacion = $1
      LIMIT 1
      `,
      [id_aprobacion]
    );
    const raw = result.rows[0]?.monto_solicitado;
    if (raw == null || raw === '') return null;
    const n = parseFloat(String(raw).replace(/,/g, '.'));
    return Number.isFinite(n) ? n : null;
  }

  // Registrar un nuevo contrato
  static async create(contratoData) {
    const {
      id_aprob,
      id_config,
      id_cedula_aprob,
      numero_contrato,
      moneda,
      monto_moneda,
      cambio,
      flat,
      interes,
      devolvimiento,
      numero_cuotas,
      numero_gracias,
      inicio,
      cierre,
      estatus,
      frecuencia_pago_contrato,
      morosidad,
      foto_contrato
    } = contratoData;

    const query = `
      INSERT INTO contrato (
        id_aprob,
        id_config,
        id_cedula_aprob,
        numero_contrato,
        moneda,
        monto_moneda,
        cambio,
        flat,
        interes,
        devolvimiento,
        numero_cuotas,
        numero_gracias,
        inicio,
        cierre,
        estatus,
        frecuencia_pago_contrato,
        morosidad,
        foto_contrato
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    
    const values = [
      id_aprob,
      id_config,
      id_cedula_aprob,
      numero_contrato,
      moneda,
      monto_moneda,
      cambio,
      flat,
      interes,
      devolvimiento,
      numero_cuotas,
      numero_gracias,
      inicio,
      cierre,
      estatus,
      frecuencia_pago_contrato,
      morosidad,
      foto_contrato || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Obtener el último número de contrato
  static async getLastContractNumber() {
    const currentYear = new Date().getFullYear();
    const query = `
      SELECT numero_contrato 
      FROM contrato 
      WHERE numero_contrato LIKE 'IADEY-${currentYear}-%'
      ORDER BY numero_contrato DESC 
      LIMIT 1
    `;
    const result = await pool.query(query);
    return result.rows[0] || { numero_contrato: `IADEY-${currentYear}-000` };
  }

  static async getByCedula(cedula) {
    const query = `
      SELECT 
        a.id_aprobacion,
        a.id_inspeccion,
        a.id_expediente,
        a.verificacion_requisitos,
        a.estatus_aprobacion,
        a.cedula_persona_id,
        a.seleccion_manejo,
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
        c.devolvimiento,
        c.numero_cuotas,
        c.numero_gracias,
        c.inicio,
        c.cierre,
        c.estatus,
        c.frecuencia_pago_contrato,
        c.morosidad,
        c.foto_contrato,
        c.created_at as contrato_created_at,
        c.updated_at as contrato_updated_at,
        d.id_desembolso,
        d.fecha_desembolso,
        d.capture_desembolso,
        d.estatus_desembolso,
        d.fecha_confirmacion,
        CONCAT(COALESCE(p.nombres, ''), ' ', COALESCE(p.apellidos, '')) AS emprendedor,
        p.cedula,
        a.cedula_persona_id
      FROM aprobacion a
      INNER JOIN contrato c ON a.id_aprobacion = c.id_aprob
      LEFT JOIN desembolso d ON c.id_contrato = d.id_cont
      LEFT JOIN persona p ON a.cedula_persona_id = p.cedula
      WHERE a.seleccion_manejo = 'Interno'
      AND (a.cedula_persona_id = $1 OR c.id_cedula_aprob = $1 OR p.cedula = $1)
      ORDER BY a.id_aprobacion DESC
    `;
    const result = await pool.query(query, [cedula]);
    return result.rows;
  }

  // Obtener un contrato por ID de aprobación
  static async getById(id) {
    const query = `
      SELECT 
        c.id_contrato,
        c.id_aprob,
        c.id_config,
        c.id_cedula_aprob,
        c.numero_contrato,
        c.moneda,
        c.monto_moneda,
        c.cambio,
        c.flat,
        c.interes,
        c.devolvimiento,
        c.numero_cuotas,
        c.numero_gracias,
        c.inicio,
        c.cierre,
        c.estatus,
        c.frecuencia_pago_contrato,
        c.morosidad,
        c.foto_contrato,
        c.created_at,
        c.updated_at,
        a.id_aprobacion,
        a.id_inspeccion,
        a.id_expediente,
        a.verificacion_requisitos,
        a.estatus_aprobacion,
        a.seleccion_manejo,
        a.cedula_persona_id
      FROM contrato c
      JOIN aprobacion a ON c.id_aprob = a.id_aprobacion
      JOIN expediente e ON a.id_expediente = e.id_expediente
      WHERE c.id_aprob = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Actualizar estatus del contrato
  static async updateStatus(id_aprob, estatus) {
    const query = `
      UPDATE contrato 
      SET estatus = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_aprob = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [estatus, id_aprob]);
    return result.rows[0];
  }

  // Obtener contrato por ID
  static async getContratoById(id_contrato) {
    const query = `
      SELECT 
        c.*,
        a.id_aprobacion,
        a.id_expediente
      FROM contrato c
      JOIN aprobacion a ON c.id_aprob = a.id_aprobacion
      JOIN expediente e ON a.id_expediente = e.id_expediente
      WHERE c.id_contrato = $1
    `;
    const result = await pool.query(query, [id_contrato]);
    return result.rows[0];
  }

  // Actualizar contrato completo
  static async update(id_contrato, contratoData) {
    const {
      numero_contrato,
      moneda,
      monto_moneda,
      cambio,
      flat,
      interes,
      devolvimiento,
      numero_cuotas,
      numero_gracias,
      inicio,
      cierre,
      estatus,
      frecuencia_pago_contrato,
      morosidad
    } = contratoData;

    const query = `
      UPDATE contrato 
      SET 
        numero_contrato = COALESCE($1, numero_contrato),
        moneda = COALESCE($2, moneda),
        monto_moneda = COALESCE($3, monto_moneda),
        cambio = COALESCE($4, cambio),
        flat = COALESCE($5, flat),
        interes = COALESCE($6, interes),
        devolvimiento = COALESCE($7, devolvimiento),
        numero_cuotas = COALESCE($8, numero_cuotas),
        numero_gracias = COALESCE($9, numero_gracias),
        inicio = COALESCE($10, inicio),
        cierre = COALESCE($11, cierre),
        estatus = COALESCE($12, estatus),
        frecuencia_pago_contrato = COALESCE($13, frecuencia_pago_contrato),
        morosidad = COALESCE($14, morosidad),
        updated_at = CURRENT_TIMESTAMP
      WHERE id_contrato = $15
      RETURNING *
    `;

    const values = [
      numero_contrato,
      moneda,
      monto_moneda,
      cambio,
      flat,
      interes,
      devolvimiento,
      numero_cuotas,
      numero_gracias,
      inicio,
      cierre,
      estatus,
      frecuencia_pago_contrato,
      morosidad,
      id_contrato
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // ==================== MÉTODOS DE DESEMBOLSO ====================

  // Crear un nuevo desembolso
  static async crearDesembolso(desembolsoData) {
    const {
      id_cont,
      capture_desembolso,
      fecha_desembolso,
      estatus_desembolso
    } = desembolsoData;

    if (!id_cont) {
      throw new Error('ID del contrato es requerido');
    }

    if (!capture_desembolso) {
      throw new Error('El comprobante bancario es requerido');
    }

    if (!fecha_desembolso) {
      throw new Error('La fecha de desembolso es requerida');
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const insertQuery = `
        INSERT INTO desembolso (
          id_cont,
          fecha_desembolso,
          capture_desembolso,
          estatus_desembolso
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const values = [
        id_cont,
        fecha_desembolso,
        capture_desembolso,
        estatus_desembolso || 'Pendiente'
      ];

      const desembolsoResult = await client.query(insertQuery, values);
      
      const updateContratoQuery = `
        UPDATE contrato 
        SET estatus = 'Pendiente por confirmar desembolso', 
            updated_at = CURRENT_TIMESTAMP
        WHERE id_contrato = $1 
        RETURNING *
      `;
      
      const contratoResult = await client.query(updateContratoQuery, [id_cont]);
      
      if (!contratoResult.rows[0]) {
        throw new Error('No se encontró el contrato para actualizar');
      }
      
      await client.query('COMMIT');
      
      return {
        desembolso: desembolsoResult.rows[0],
        contrato: contratoResult.rows[0]
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en crearDesembolso:', error);
      throw new Error(`Error al crear desembolso: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // Obtener todos los desembolsos de un contrato
  static async getDesembolsosByContrato(id_aprob) {
    const query = `
      SELECT 
        d.id_desembolso,
        d.id_cont,
        d.fecha_desembolso,
        d.fecha_confirmacion,
        d.referecia_bancaria,
        d.monto_pagado,
        d.estatus_desembolso as estatus,
        d.referencia_pago,
        d.created_at,
        d.updated_at,
        c.numero_contrato,
        c.moneda,
        c.monto_moneda
      FROM desembolso d
      JOIN contrato c ON d.id_cont = c.id_contrato
      WHERE c.id_aprob = $1
      ORDER BY d.fecha_desembolso DESC
    `;
    const result = await pool.query(query, [id_aprob]);
    return result.rows;
  }

  // Obtener un desembolso específico por ID
  static async getDesembolsoById(id_desembolso) {
    const query = `
      SELECT 
        d.*,
        c.id_aprob,
        c.numero_contrato,
        c.moneda
      FROM desembolso d
      JOIN contrato c ON d.id_cont = c.id_contrato
      WHERE d.id_desembolso = $1
    `;
    const result = await pool.query(query, [id_desembolso]);
    return result.rows[0];
  }

  // Confirmar pago de desembolso
  static async confirmarPagoDesembolso(id_desembolso, pagoData) {
    const {
      fecha_confirmacion,
      referencia_pago,
      estatus_desembolso
    } = pagoData;

    const query = `
      UPDATE desembolso 
      SET 
        fecha_confirmacion = $1,
        referencia_pago = $2,
        estatus_desembolso = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_desembolso = $4
      RETURNING *
    `;

    const values = [
      fecha_confirmacion,
      referencia_pago,
      estatus_desembolso,
      id_desembolso
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Actualizar un desembolso existente
  static async updateDesembolso(id_desembolso, desembolsoData) {
    const {
      fecha_desembolso,
      referecia_bancaria,
      monto_pagado,
      estatus_desembolso
    } = desembolsoData;

    const query = `
      UPDATE desembolso 
      SET 
        fecha_desembolso = COALESCE($1, fecha_desembolso),
        referecia_bancaria = COALESCE($2, referecia_bancaria),
        monto_pagado = COALESCE($3, monto_pagado),
        estatus_desembolso = COALESCE($4, estatus_desembolso),
        updated_at = CURRENT_TIMESTAMP
      WHERE id_desembolso = $5
      RETURNING *
    `;

    const values = [
      fecha_desembolso,
      referecia_bancaria,
      monto_pagado,
      estatus_desembolso,
      id_desembolso
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Eliminar un desembolso
  static async deleteDesembolso(id_desembolso) {
    const query = `
      DELETE FROM desembolso 
      WHERE id_desembolso = $1 
      RETURNING *
    `;
    const result = await pool.query(query, [id_desembolso]);
    return result.rows[0];
  }

  // Obtener todos los desembolsos pendientes
  static async getDesembolsosPendientes() {
    const query = `
      SELECT 
        d.*,
        c.numero_contrato,
        c.moneda,
        a.id_expediente,
        a.id_inspeccion
      FROM desembolso d
      JOIN contrato c ON d.id_cont = c.id_contrato
      JOIN aprobacion a ON c.id_aprob = a.id_aprobacion
      JOIN expediente e ON a.id_expediente = e.id_expediente
      WHERE d.estatus_desembolso = 'pendiente por confirmar'
      ORDER BY d.fecha_desembolso ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Obtener historial completo de desembolsos por contrato
  static async getHistorialDesembolsos(id_contrato) {
    const query = `
      SELECT 
        d.*,
        CASE 
          WHEN d.estatus_desembolso = 'confirmado' THEN 'Completado'
          WHEN d.estatus_desembolso = 'pendiente por confirmar' THEN 'En Proceso'
          ELSE d.estatus_desembolso
        END as estado_descripcion
      FROM desembolso d
      WHERE d.id_cont = $1
      ORDER BY d.created_at DESC
    `;
    const result = await pool.query(query, [id_contrato]);
    return result.rows;
  }

  // Obtener contratos por frecuencia de pago
  static async getContratosByFrecuenciaPago(frecuencia) {
    const query = `
      SELECT 
        c.*,
        a.id_expediente
      FROM contrato c
      JOIN aprobacion a ON c.id_aprob = a.id_aprobacion
      JOIN expediente e ON a.id_expediente = e.id_expediente
      WHERE c.frecuencia_pago_contrato = $1
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query, [frecuencia]);
    return result.rows;
  }
}

module.exports = ContratoModel;