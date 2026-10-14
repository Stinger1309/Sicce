const pool = require('../config/db');
const { validarNumeroCuentaVE } = require('../utils/cuentaBancariaVE');

class BancoModel {
  static async getAllActivos() {
    const r = await pool.query(
      `SELECT * FROM bancos WHERE activo = TRUE ORDER BY nombre`
    );
    return r.rows;
  }

  static async getAll() {
    const r = await pool.query(`SELECT * FROM bancos ORDER BY nombre`);
    return r.rows;
  }

  static async getById(id) {
    const r = await pool.query(`SELECT * FROM bancos WHERE id_banco = $1`, [id]);
    return r.rows[0] || null;
  }

  static async create({ nombre, siglas, codigo_banco, activo = true }) {
    if (!nombre || !String(nombre).trim()) {
      throw new Error('El nombre del banco es obligatorio');
    }
    const r = await pool.query(
      `INSERT INTO bancos (nombre, siglas, codigo_banco, activo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        String(nombre).trim(),
        siglas ? String(siglas).trim() : null,
        codigo_banco ? String(codigo_banco).trim() : null,
        activo !== false
      ]
    );
    return r.rows[0];
  }

  static async update(id, { nombre, siglas, codigo_banco, activo }) {
    const current = await this.getById(id);
    if (!current) throw new Error('Banco no encontrado');

    const r = await pool.query(
      `UPDATE bancos SET
        nombre = COALESCE($1, nombre),
        siglas = COALESCE($2, siglas),
        codigo_banco = COALESCE($3, codigo_banco),
        activo = COALESCE($4, activo)
       WHERE id_banco = $5
       RETURNING *`,
      [
        nombre != null ? String(nombre).trim() : null,
        siglas !== undefined ? (siglas ? String(siglas).trim() : null) : null,
        codigo_banco !== undefined
          ? (codigo_banco ? String(codigo_banco).trim() : null)
          : null,
        typeof activo === 'boolean' ? activo : null,
        id
      ]
    );
    return r.rows[0];
  }

  static async toggleActivo(id) {
    const r = await pool.query(
      `UPDATE bancos SET activo = NOT COALESCE(activo, TRUE)
       WHERE id_banco = $1
       RETURNING *`,
      [id]
    );
    return r.rows[0] || null;
  }

  static async softDelete(id) {
    const r = await pool.query(
      `UPDATE bancos SET activo = FALSE WHERE id_banco = $1 RETURNING *`,
      [id]
    );
    return r.rows[0] || null;
  }

  static async getByCedula(cedula) {
    const r = await pool.query(
      `SELECT pb.*, b.nombre AS banco_nombre, b.siglas, b.codigo_banco
       FROM persona_bancos pb
       JOIN bancos b ON pb.id_banco = b.id_banco
       WHERE COALESCE(pb.activo, TRUE) = TRUE
         AND (
           UPPER(TRIM(pb.cedula_persona)) = UPPER(TRIM($1))
           OR REGEXP_REPLACE(pb.cedula_persona, '[^0-9]', '', 'g') =
              REGEXP_REPLACE($1, '[^0-9]', '', 'g')
         )
       ORDER BY pb.es_preferida DESC, b.nombre`,
      [cedula]
    );
    return r.rows;
  }

  static async replacePersonaBancos(cedula, bancos = []) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE persona_bancos SET activo = FALSE WHERE cedula_persona = $1`,
        [cedula]
      );

      const created = [];
      for (const item of bancos) {
        if (!item.id_banco) continue;
        const r = await client.query(
          `INSERT INTO persona_bancos (
            cedula_persona, id_banco, tipo_cuenta, numero_cuenta, es_preferida, activo
          ) VALUES ($1,$2,$3,$4,$5,TRUE)
          ON CONFLICT (cedula_persona, id_banco, numero_cuenta)
          DO UPDATE SET
            tipo_cuenta = EXCLUDED.tipo_cuenta,
            es_preferida = EXCLUDED.es_preferida,
            activo = TRUE
          RETURNING *`,
          [
            cedula,
            item.id_banco,
            item.tipo_cuenta || 'Ahorro',
            item.numero_cuenta || `SIN-${item.id_banco}`,
            !!item.es_preferida
          ]
        );
        created.push(r.rows[0]);
      }

      await client.query('COMMIT');
      return created;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async createPersonaBanco(data) {
    const r = await pool.query(
      `INSERT INTO persona_bancos (
        cedula_persona, id_banco, tipo_cuenta, numero_cuenta, es_preferida
      ) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        data.cedula_persona,
        data.id_banco,
        data.tipo_cuenta || 'Ahorro',
        data.numero_cuenta || `SIN-${data.id_banco}`,
        !!data.es_preferida
      ]
    );
    return r.rows[0];
  }

  /** Créditos manejo Interno del emprendedor (para cargar cuenta antes del desembolso) */
  static async getCreditosInternosCuenta(cedula) {
    const r = await pool.query(
      `SELECT
         a.id_aprobacion,
         a.estatus_aprobacion,
         a.seleccion_manejo,
         a.cedula_persona_id,
         a.id_persona_banco,
         e.id_expediente,
         s.id_solicitud,
         s.monto_solicitado,
         emp.nombre_emprendimiento,
         c.id_contrato,
         c.numero_contrato,
         c.estatus AS estatus_contrato,
         c.moneda,
         c.monto_moneda,
         pb.tipo_cuenta,
         pb.numero_cuenta,
         pb.id_banco,
         b.nombre AS banco_nombre,
         CASE
           WHEN pb.id_persona_banco IS NOT NULL
            AND pb.numero_cuenta IS NOT NULL
            AND TRIM(pb.numero_cuenta) <> ''
            AND pb.numero_cuenta NOT LIKE 'SIN-%'
           THEN TRUE ELSE FALSE
         END AS cuenta_completa
       FROM aprobacion a
       LEFT JOIN expediente e ON a.id_expediente = e.id_expediente
       LEFT JOIN solicitud s ON e.id_solicitud = s.id_solicitud
       LEFT JOIN emprendimiento emp ON emp.id_solicitud = s.id_solicitud
       LEFT JOIN contrato c ON c.id_aprob = a.id_aprobacion
       LEFT JOIN persona_bancos pb
         ON a.id_persona_banco = pb.id_persona_banco AND COALESCE(pb.activo, TRUE) = TRUE
       LEFT JOIN bancos b ON pb.id_banco = b.id_banco
       WHERE UPPER(TRIM(a.cedula_persona_id)) = UPPER(TRIM($1))
         AND a.seleccion_manejo = 'Interno'
         AND LOWER(COALESCE(a.estatus_aprobacion, '')) LIKE '%aprob%'
       ORDER BY a.id_aprobacion DESC`,
      [cedula]
    );
    return r.rows;
  }

  /**
   * Emprendedor registra banco + número de cuenta para un crédito Interno.
   * Vincula la cuenta a la aprobación (requisito previo al desembolso).
   */
  static async registrarCuentaDesembolsoInterno({
    cedula,
    id_aprobacion,
    id_banco,
    tipo_cuenta,
    numero_cuenta,
  }) {
    const ced = String(cedula || '').trim();
    const idAprob = parseInt(id_aprobacion, 10);
    const idBanco = parseInt(id_banco, 10);
    const tipo = String(tipo_cuenta || 'Ahorro').trim() || 'Ahorro';

    if (!ced) throw new Error('La cédula es requerida');
    if (!idAprob || Number.isNaN(idAprob)) throw new Error('ID de aprobación inválido');
    if (!idBanco || Number.isNaN(idBanco)) throw new Error('Debe seleccionar un banco');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const aprobRes = await client.query(
        `SELECT id_aprobacion, cedula_persona_id, seleccion_manejo, estatus_aprobacion, id_persona_banco
         FROM aprobacion
         WHERE id_aprobacion = $1
         FOR UPDATE`,
        [idAprob]
      );
      const aprob = aprobRes.rows[0];
      if (!aprob) throw new Error('Aprobación no encontrada');

      if (
        String(aprob.cedula_persona_id || '').trim().toUpperCase() !==
        ced.toUpperCase()
      ) {
        throw new Error('Solo puede registrar la cuenta de sus propios créditos');
      }
      if (aprob.seleccion_manejo !== 'Interno') {
        throw new Error('Solo aplica para créditos con manejo Interno');
      }
      if (!String(aprob.estatus_aprobacion || '').toLowerCase().includes('aprob')) {
        throw new Error('El crédito aún no está aprobado');
      }

      const bancoRes = await client.query(
        `SELECT id_banco, codigo_banco FROM bancos
         WHERE id_banco = $1 AND COALESCE(activo, TRUE) = TRUE`,
        [idBanco]
      );
      if (!bancoRes.rows[0]) throw new Error('Banco no válido o inactivo');

      // Solo bancos que el emprendedor eligió en el registro inicial
      const bancoPersonaRes = await client.query(
        `SELECT id_persona_banco
         FROM persona_bancos
         WHERE id_banco = $2
           AND COALESCE(activo, TRUE) = TRUE
           AND (
             UPPER(TRIM(cedula_persona)) = UPPER(TRIM($1))
             OR REGEXP_REPLACE(cedula_persona, '[^0-9]', '', 'g') =
                REGEXP_REPLACE($1, '[^0-9]', '', 'g')
           )
         LIMIT 1`,
        [ced, idBanco]
      );
      if (!bancoPersonaRes.rows[0]) {
        throw new Error(
          'Solo puede usar un banco que declaró al registrarse. Seleccione uno de su lista.'
        );
      }

      const codigosRes = await client.query(
        `SELECT codigo_banco FROM bancos
         WHERE COALESCE(activo, TRUE) = TRUE
           AND codigo_banco IS NOT NULL
           AND TRIM(codigo_banco) <> ''`
      );
      const codigosValidos = codigosRes.rows.map((r) => r.codigo_banco);
      const validacion = validarNumeroCuentaVE(numero_cuenta, {
        codigoBancoSeleccionado: bancoRes.rows[0].codigo_banco,
        codigosValidos,
      });
      if (!validacion.ok) throw new Error(validacion.error);
      const numero = validacion.numero;

      // Preferida: desmarcar otras de la persona
      await client.query(
        `UPDATE persona_bancos SET es_preferida = FALSE WHERE cedula_persona = $1`,
        [ced]
      );

      const pbRes = await client.query(
        `INSERT INTO persona_bancos (
          cedula_persona, id_banco, tipo_cuenta, numero_cuenta, es_preferida, activo
        ) VALUES ($1, $2, $3, $4, TRUE, TRUE)
        ON CONFLICT (cedula_persona, id_banco, numero_cuenta)
        DO UPDATE SET
          tipo_cuenta = EXCLUDED.tipo_cuenta,
          es_preferida = TRUE,
          activo = TRUE
        RETURNING *`,
        [ced, idBanco, tipo, numero]
      );
      const personaBanco = pbRes.rows[0];

      await client.query(
        `UPDATE aprobacion
         SET id_persona_banco = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id_aprobacion = $2`,
        [personaBanco.id_persona_banco, idAprob]
      );

      await client.query('COMMIT');

      const list = await this.getCreditosInternosCuenta(ced);
      const actualizado = list.find(
        (x) => String(x.id_aprobacion) === String(idAprob)
      );
      return actualizado || {
        ...personaBanco,
        id_aprobacion: idAprob,
        cuenta_completa: true,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = BancoModel;
