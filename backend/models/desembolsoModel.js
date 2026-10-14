const pool = require('../config/db');
const CuotaModel = require('./cuotaModel');

class DesembolsoModel {
  static async getAll() {
    const query = `
      SELECT 
        a.id_aprobacion,
        a.estatus_aprobacion,
        a.seleccion_manejo,
        a.cedula_persona_id,
        c.id_contrato,
        c.id_cedula_aprob,
        c.numero_contrato,
        c.moneda,
        c.monto_moneda as monto,
        c.devolvimiento,
        c.numero_cuotas,
        c.numero_gracias,
        c.inicio,
        c.cierre,
        c.estatus,
        c.frecuencia_pago_contrato,
        d.id_desembolso,
        d.fecha_desembolso,
        d.capture_desembolso,
        d.estatus_desembolso,
        d.fecha_confirmacion,
        d.cedula_desembolso,
        d.motivo_denegacion,
        d.comprobante_denegacion,
        CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS emprendedor
      FROM desembolso d
      INNER JOIN contrato c ON d.id_cont = c.id_contrato
      INNER JOIN aprobacion a ON c.id_aprob = a.id_aprobacion
      LEFT JOIN persona p ON COALESCE(a.cedula_persona_id, c.id_cedula_aprob) = p.cedula
      ORDER BY d.id_desembolso DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getByCedula(cedula) {
    const query = `
      SELECT 
        d.id_desembolso,
        d.id_cont,
        d.fecha_desembolso,
        d.capture_desembolso,
        d.estatus_desembolso,
        d.fecha_confirmacion,
        d.cedula_desembolso,
        d.motivo_denegacion,
        d.comprobante_denegacion,
        c.numero_contrato,
        c.moneda,
        c.monto_moneda as monto,
        c.devolvimiento,
        c.estatus as estatus_contrato,
        c.id_cedula_aprob,
        c.numero_cuotas,
        c.numero_gracias,
        c.frecuencia_pago_contrato,
        c.inicio,
        a.id_aprobacion,
        a.cedula_persona_id,
        a.estatus_aprobacion,
        CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS emprendedor
      FROM desembolso d
      INNER JOIN contrato c ON d.id_cont = c.id_contrato
      INNER JOIN aprobacion a ON c.id_aprob = a.id_aprobacion
      LEFT JOIN persona p ON COALESCE(a.cedula_persona_id, c.id_cedula_aprob) = p.cedula
      WHERE (
        UPPER(TRIM(d.cedula_desembolso)) = UPPER(TRIM($1))
        OR UPPER(TRIM(c.id_cedula_aprob)) = UPPER(TRIM($1))
        OR UPPER(TRIM(a.cedula_persona_id)) = UPPER(TRIM($1))
      )
      ORDER BY d.id_desembolso DESC
    `;
    const result = await pool.query(query, [cedula]);
    return result.rows;
  }

  static async getContratosPendientes() {
    const query = `
      SELECT 
        c.id_contrato,
        c.numero_contrato,
        c.moneda,
        c.monto_moneda,
        c.devolvimiento,
        c.estatus,
        c.id_cedula_aprob,
        a.cedula_persona_id,
        a.seleccion_manejo,
        a.id_persona_banco,
        pb.tipo_cuenta,
        pb.numero_cuenta,
        b.nombre AS banco_nombre,
        CASE
          WHEN a.seleccion_manejo = 'Interno'
           AND (
             a.id_persona_banco IS NULL
             OR pb.id_persona_banco IS NULL
             OR pb.numero_cuenta IS NULL
             OR TRIM(pb.numero_cuenta) = ''
             OR pb.numero_cuenta LIKE 'SIN-%'
           )
          THEN FALSE
          ELSE TRUE
        END AS cuenta_lista,
        CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS emprendedor
      FROM contrato c
      INNER JOIN aprobacion a ON c.id_aprob = a.id_aprobacion
      LEFT JOIN persona p ON COALESCE(a.cedula_persona_id, c.id_cedula_aprob) = p.cedula
      LEFT JOIN persona_bancos pb
        ON a.id_persona_banco = pb.id_persona_banco AND COALESCE(pb.activo, TRUE) = TRUE
      LEFT JOIN bancos b ON pb.id_banco = b.id_banco
      WHERE (
        c.estatus = 'Pendiente por desembolso'
        OR (
          LOWER(TRIM(c.estatus)) = 'esperando aceptar desembolso'
          AND NOT EXISTS (
            SELECT 1 FROM desembolso d2
            WHERE d2.id_cont = c.id_contrato
              AND d2.estatus_desembolso IN ('Pendiente', 'Confirmado')
          )
        )
      )
        AND NOT EXISTS (
          SELECT 1 FROM desembolso d
          WHERE d.id_cont = c.id_contrato
            AND d.estatus_desembolso IN ('Pendiente', 'Confirmado')
        )
      ORDER BY c.id_contrato DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getById(id_contrato) {
    const query = `
      SELECT c.*, a.cedula_persona_id
      FROM contrato c
      INNER JOIN aprobacion a ON c.id_aprob = a.id_aprobacion
      WHERE c.id_contrato = $1
    `;
    const result = await pool.query(query, [id_contrato]);
    return result.rows[0];
  }

  static async verificarDesembolsoActivo(id_cont) {
    const result = await pool.query(
      `SELECT id_desembolso, estatus_desembolso
       FROM desembolso
       WHERE id_cont = $1
         AND estatus_desembolso IN ('Pendiente', 'Confirmado')
       LIMIT 1`,
      [id_cont]
    );
    return result.rows[0] || null;
  }

  static async verificarDesembolso(id_cont) {
    const activo = await this.verificarDesembolsoActivo(id_cont);
    return Boolean(activo);
  }

  static async create(desembolsoData) {
    const {
      id_cont,
      capture_desembolso,
      fecha_desembolso,
      cedula_desembolso
    } = desembolsoData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const contratoRes = await client.query(
        `SELECT c.*, a.cedula_persona_id, a.seleccion_manejo, a.id_persona_banco,
                pb.numero_cuenta
         FROM contrato c
         JOIN aprobacion a ON a.id_aprobacion = c.id_aprob
         LEFT JOIN persona_bancos pb
           ON a.id_persona_banco = pb.id_persona_banco AND COALESCE(pb.activo, TRUE) = TRUE
         WHERE c.id_contrato = $1`,
        [id_cont]
      );
      const contrato = contratoRes.rows[0];
      if (!contrato) throw new Error('Contrato no encontrado');

      // Normalizar alias legado sin desembolso activo
      const estatusNorm = String(contrato.estatus || '').trim();
      if (
        (estatusNorm === 'Esperando aceptar desembolso' ||
          estatusNorm === 'esperando aceptar desembolso') &&
        !(await this.verificarDesembolsoActivo(id_cont))
      ) {
        await client.query(
          `UPDATE contrato SET estatus = 'Pendiente por desembolso', updated_at = CURRENT_TIMESTAMP
           WHERE id_contrato = $1`,
          [id_cont]
        );
        contrato.estatus = 'Pendiente por desembolso';
      }

      if (contrato.estatus !== 'Pendiente por desembolso') {
        throw new Error(`El contrato debe estar en "Pendiente por desembolso". Estado actual: ${contrato.estatus}`);
      }

      // Manejo Interno: el emprendedor debe haber cargado su cuenta antes del desembolso
      if (contrato.seleccion_manejo === 'Interno') {
        const numCuenta = String(contrato.numero_cuenta || '').trim();
        if (
          !contrato.id_persona_banco ||
          !numCuenta ||
          numCuenta.toUpperCase().startsWith('SIN-')
        ) {
          throw new Error(
            'El emprendedor aún no ha registrado los datos de su cuenta bancaria. Debe completar banco y número de cuenta antes del desembolso.'
          );
        }
      }

      const existe = await client.query(
        `SELECT id_desembolso FROM desembolso
         WHERE id_cont = $1 AND estatus_desembolso IN ('Pendiente', 'Confirmado')`,
        [id_cont]
      );
      if (existe.rows[0]) {
        throw new Error('Este contrato ya tiene un desembolso pendiente o confirmado');
      }

      const cedula =
        contrato.cedula_persona_id ||
        contrato.id_cedula_aprob ||
        cedula_desembolso ||
        null;

      if (!cedula) {
        throw new Error('No se encontró la cédula del emprendedor en el contrato');
      }

      const desembolsoResult = await client.query(
        `INSERT INTO desembolso (
          id_cont, fecha_desembolso, capture_desembolso, estatus_desembolso, cedula_desembolso
        ) VALUES ($1,$2,$3,'Pendiente',$4)
        RETURNING *`,
        [id_cont, fecha_desembolso, capture_desembolso, cedula]
      );

      await client.query(
        `UPDATE contrato
         SET estatus = 'Pendiente por confirmar desembolso',
             updated_at = CURRENT_TIMESTAMP
         WHERE id_contrato = $1`,
        [id_cont]
      );

      await client.query('COMMIT');
      return await this.getDesembolsoCompleto(desembolsoResult.rows[0].id_desembolso);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getDesembolsoById(id_desembolso) {
    const result = await pool.query(
      'SELECT * FROM desembolso WHERE id_desembolso = $1',
      [id_desembolso]
    );
    return result.rows[0];
  }

  static async getDesembolsoCompleto(id_desembolso) {
    const query = `
      SELECT 
        d.*,
        c.numero_contrato,
        c.moneda,
        c.monto_moneda as monto,
        c.devolvimiento,
        c.estatus as estatus_contrato,
        c.id_cedula_aprob,
        c.numero_cuotas,
        c.numero_gracias,
        c.frecuencia_pago_contrato,
        c.inicio,
        a.cedula_persona_id,
        a.id_aprobacion,
        CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS emprendedor
      FROM desembolso d
      INNER JOIN contrato c ON d.id_cont = c.id_contrato
      INNER JOIN aprobacion a ON c.id_aprob = a.id_aprobacion
      LEFT JOIN persona p ON COALESCE(a.cedula_persona_id, c.id_cedula_aprob) = p.cedula
      WHERE d.id_desembolso = $1
    `;
    const result = await pool.query(query, [id_desembolso]);
    return result.rows[0];
  }

  /**
   * Emprendedor confirma que le llegó el dinero:
   * desembolso Confirmado + genera cuotas + contrato Activo
   */
  static async confirmarPago(id_desembolso, pagoData = {}) {
    const fecha_confirmacion =
      pagoData.fecha_confirmacion ||
      new Date().toISOString().split('T')[0];

    const desembolso = await this.getDesembolsoCompleto(id_desembolso);
    if (!desembolso) throw new Error('Desembolso no encontrado');
    if (desembolso.estatus_desembolso !== 'Pendiente') {
      throw new Error(`Solo se pueden confirmar desembolsos Pendientes. Estado: ${desembolso.estatus_desembolso}`);
    }

    // Validar dueño si se envía cédula
    if (pagoData.cedula_usuario) {
      const dueño = String(
        desembolso.cedula_persona_id ||
          desembolso.id_cedula_aprob ||
          desembolso.cedula_desembolso ||
          ''
      )
        .trim()
        .toUpperCase();
      const userCed = String(pagoData.cedula_usuario).trim().toUpperCase();
      if (dueño && userCed && dueño !== userCed) {
        throw new Error('Solo el emprendedor titular puede confirmar este desembolso');
      }
    }

    await pool.query(
      `UPDATE desembolso
       SET fecha_confirmacion = $1, estatus_desembolso = 'Confirmado'
       WHERE id_desembolso = $2`,
      [fecha_confirmacion, id_desembolso]
    );

    // Generar cuotas desde el contrato (pone contrato en Activo)
    const cantidadCuotas = parseInt(desembolso.numero_cuotas, 10) || 0;
    const fechaPrimera =
      desembolso.inicio ||
      new Date().toISOString().split('T')[0];
    const frecuencia = desembolso.frecuencia_pago_contrato || 'mensual';

    if (cantidadCuotas <= 0) {
      throw new Error('El contrato no tiene número de cuotas definido');
    }

    const cuotas = await CuotaModel.generarCuotasManual(desembolso.id_cont, {
      cantidadCuotas,
      fechaPrimeraCuota: fechaPrimera,
      frecuencia,
    });

    const completo = await this.getDesembolsoCompleto(id_desembolso);
    return { ...completo, cuotas_generadas: cuotas };
  }

  /**
   * Emprendedor deniega: requiere comprobante/estado de cuenta.
   * Desembolso → Denegado; contrato → Pendiente por desembolso
   */
  static async denegarDesembolso(id_desembolso, data = {}) {
    const { motivo_denegacion, comprobante_denegacion, cedula_usuario } = data;

    if (!comprobante_denegacion || !String(comprobante_denegacion).trim()) {
      throw new Error(
        'Debe adjuntar un comprobante o estado de cuenta que demuestre que el desembolso no llegó'
      );
    }

    const desembolso = await this.getDesembolsoCompleto(id_desembolso);
    if (!desembolso) throw new Error('Desembolso no encontrado');
    if (desembolso.estatus_desembolso !== 'Pendiente') {
      throw new Error(`Solo se pueden denegar desembolsos Pendientes. Estado: ${desembolso.estatus_desembolso}`);
    }

    if (cedula_usuario) {
      const dueño = String(
        desembolso.cedula_persona_id ||
          desembolso.id_cedula_aprob ||
          desembolso.cedula_desembolso ||
          ''
      )
        .trim()
        .toUpperCase();
      const userCed = String(cedula_usuario).trim().toUpperCase();
      if (dueño && userCed && dueño !== userCed) {
        throw new Error('Solo el emprendedor titular puede denegar este desembolso');
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE desembolso SET
          estatus_desembolso = 'Denegado',
          motivo_denegacion = $1,
          comprobante_denegacion = $2
         WHERE id_desembolso = $3`,
        [
          motivo_denegacion || 'El emprendedor indica que el desembolso no fue recibido',
          comprobante_denegacion,
          id_desembolso,
        ]
      );

      await client.query(
        `UPDATE contrato
         SET estatus = 'Pendiente por desembolso',
             updated_at = CURRENT_TIMESTAMP
         WHERE id_contrato = $1`,
        [desembolso.id_cont]
      );

      await client.query('COMMIT');
      return await this.getDesembolsoCompleto(id_desembolso);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  /**
   * Staff IADEY registra el comprobante de desembolso interno.
   * No pide cuenta del emprendedor ni confirmación. El contrato ya está Activo.
   */
  static async registrarComprobanteInterno(data = {}) {
    const {
      id_cont,
      capture_desembolso,
      fecha_desembolso,
      cedula_desembolso,
    } = data;

    if (!id_cont) throw new Error('El ID del contrato es requerido');
    if (!capture_desembolso) throw new Error('El comprobante de desembolso es requerido');

    const contratoRes = await pool.query(
      `SELECT c.id_contrato, c.estatus, c.id_cedula_aprob, a.cedula_persona_id
       FROM contrato c
       JOIN aprobacion a ON a.id_aprobacion = c.id_aprob
       WHERE c.id_contrato = $1`,
      [id_cont]
    );
    const contrato = contratoRes.rows[0];
    if (!contrato) throw new Error('Contrato no encontrado');

    const existe = await this.verificarDesembolsoActivo(id_cont);
    if (existe && String(existe.estatus_desembolso).toLowerCase() === 'confirmado') {
      throw new Error('Este contrato ya tiene un desembolso confirmado');
    }

    const cedula =
      contrato.cedula_persona_id ||
      contrato.id_cedula_aprob ||
      cedula_desembolso ||
      'INTERNO';

    const fecha = fecha_desembolso || new Date().toISOString().split('T')[0];

    if (existe) {
      await pool.query(
        `UPDATE desembolso
         SET capture_desembolso = $1,
             fecha_desembolso = $2,
             fecha_confirmacion = $2,
             estatus_desembolso = 'Confirmado',
             cedula_desembolso = COALESCE($3, cedula_desembolso)
         WHERE id_desembolso = $4`,
        [capture_desembolso, fecha, cedula, existe.id_desembolso]
      );
      return this.getDesembolsoCompleto(existe.id_desembolso);
    }

    const inserted = await pool.query(
      `INSERT INTO desembolso (
        id_cont, fecha_desembolso, fecha_confirmacion, capture_desembolso,
        estatus_desembolso, cedula_desembolso
      ) VALUES ($1, $2, $2, $3, 'Confirmado', $4)
      RETURNING id_desembolso`,
      [id_cont, fecha, capture_desembolso, cedula]
    );

    return this.getDesembolsoCompleto(inserted.rows[0].id_desembolso);
  }
}

module.exports = DesembolsoModel;
