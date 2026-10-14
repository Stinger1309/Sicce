// backend/models/inspeccionModel.js
const pool = require('../config/db');
const CitaModel = require('./citaModel');
const {
  insertAgricolaCompleto,
  deleteAgricolaData,
  loadAgricolaData,
  isAgricolaPayload
} = require('./inspeccionAgricolaHelper');

class InspeccionModel {
  // =============================================
  // MÉTODOS DE CONSULTA (GET)
  // =============================================

  // Obtener una inspección por ID
  static async getById(id) {
    const query = `
      SELECT 
        i.id_inspeccion,
        i.id_codigo_exp,
        i.id_tipo_insp_clas,
        i.estatus_inspeccion,
        i.created_at,
        i.updated_at,
        e.codigo_expediente,
        e.id_solicitud,
        s.solicitud as tipo_solicitud,
        s.monto_solicitado,
        em.id_emprendimiento,
        em.nombre_emprendimiento,
        em.direccion_empredimiento,
        em.anos_experiencia,
        em.cedula_emprendimiento,
        c.id_clasificacion,
        c.sector,
        c.actividad,
        c.n_ins_asig,
        CONCAT(p.nombres, ' ', p.apellidos) as nombre_emprendedor,
        p.cedula as cedula_emprendedor,
        p.telefono,
        p.correo
      FROM inspeccion i
      JOIN expediente e ON i.id_codigo_exp = e.id_expediente
      JOIN solicitud s ON e.id_solicitud = s.id_solicitud
      JOIN emprendimiento em ON s.id_solicitud = em.id_solicitud
      JOIN clasificacion_emprendimiento c ON em.id_clasificacion = c.id_clasificacion
      JOIN persona p ON s.cedula_persona = p.cedula
      WHERE i.id_inspeccion = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Obtener todas las inspecciones con datos relacionados del expediente
  static async getAll() {
    const query = `
      SELECT 
        i.id_inspeccion,
        i.id_codigo_exp,
        i.id_tipo_insp_clas,
        i.estatus_inspeccion,
        i.created_at,
        i.updated_at,
        e.codigo_expediente,
        e.id_solicitud,
        s.cedula_persona,
        em.id_emprendimiento,
        em.nombre_emprendimiento,
        em.direccion_empredimiento,
        em.anos_experiencia,
        c.sector,
        c.actividad,
        c.n_ins_asig,
        CONCAT(p.nombres, ' ', p.apellidos) as nombre_emprendedor,
        p.cedula as cedula_emprendedor,
        p.telefono,
        p.correo,
        (
          EXISTS (
            SELECT 1 FROM unidad_produccion up
            WHERE up.inspeccion_id = i.id_inspeccion
          )
          OR EXISTS (
            SELECT 1 FROM estudio_mercado est
            WHERE est.id_inspeccion = i.id_inspeccion
          )
        ) AS tiene_datos
      FROM inspeccion i
      JOIN expediente e ON i.id_codigo_exp = e.id_expediente
      JOIN solicitud s ON e.id_solicitud = s.id_solicitud
      JOIN emprendimiento em ON s.id_solicitud = em.id_solicitud
      JOIN clasificacion_emprendimiento c ON em.id_clasificacion = c.id_clasificacion
      JOIN persona p ON s.cedula_persona = p.cedula
      ORDER BY i.id_inspeccion DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Para informes: si la inspección no tiene formularios guardados,
   * busca otra del mismo expediente que sí tenga datos.
   */
  static async getBestForInforme(id_inspeccion) {
    const actual = await this.getFullInspectionData(id_inspeccion);
    if (!actual) return null;

    const hasData = Boolean(
      actual.unidad_produccion ||
      actual.estudio_mercado ||
      actual.credito ||
      (actual.gastos_mensuales && actual.gastos_mensuales.length) ||
      (actual.plan_inversion && actual.plan_inversion.length)
    );
    if (hasData) return actual;

    const alt = await pool.query(
      `SELECT i.id_inspeccion
       FROM inspeccion i
       WHERE i.id_codigo_exp = $1
         AND i.id_inspeccion <> $2
         AND (
           EXISTS (SELECT 1 FROM unidad_produccion up WHERE up.inspeccion_id = i.id_inspeccion)
           OR EXISTS (SELECT 1 FROM estudio_mercado est WHERE est.id_inspeccion = i.id_inspeccion)
         )
       ORDER BY i.updated_at DESC NULLS LAST, i.id_inspeccion DESC
       LIMIT 1`,
      [actual.id_codigo_exp, id_inspeccion]
    );

    if (alt.rows[0]) {
      return this.getFullInspectionData(alt.rows[0].id_inspeccion);
    }
    return actual;
  }

  // Obtener estadísticas de inspecciones
  static async getEstadisticas() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estatus_inspeccion = 'Aprobado' THEN 1 END) as aprobadas,
        COUNT(CASE WHEN estatus_inspeccion = 'Aprobado con observaciones' THEN 1 END) as aprobadas_obs,
        COUNT(CASE WHEN estatus_inspeccion = 'Rechazado' THEN 1 END) as rechazadas,
        COUNT(CASE WHEN estatus_inspeccion = 'Pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estatus_inspeccion = 'En Revisión' THEN 1 END) as en_revision,
        COUNT(CASE WHEN estatus_inspeccion = 'Completada' THEN 1 END) as completadas,
        ROUND(AVG(calificacion)::numeric, 2) as promedio_calificacion,
        COUNT(CASE WHEN id_tipo_insp_clas = 1 THEN 1 END) as tipo_inicial,
        COUNT(CASE WHEN id_tipo_insp_clas = 2 THEN 1 END) as tipo_reinspeccion,
        COUNT(CASE WHEN id_tipo_insp_clas = 3 THEN 1 END) as tipo_periodica,
        COUNT(CASE WHEN id_tipo_insp_clas = 4 THEN 1 END) as tipo_seguimiento
      FROM inspeccion
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  // Obtener TODOS los datos de una inspección (incluyendo tablas relacionadas)
  static async getFullInspectionData(id_inspeccion) {
    const client = await pool.connect();
    try {
      // 1. Datos principales de la inspección
      const inspectionQuery = `
        SELECT 
          i.*,
          e.codigo_expediente,
          e.id_solicitud,
          s.solicitud as tipo_solicitud,
          s.monto_solicitado,
          em.id_emprendimiento,
          em.nombre_emprendimiento,
          em.direccion_empredimiento,
          em.anos_experiencia,
          em.cedula_emprendimiento,
          c.id_clasificacion,
          c.sector,
          c.actividad,
          c.n_ins_asig,
          CONCAT(p.nombres, ' ', p.apellidos) as nombre_emprendedor,
          p.cedula as cedula_emprendedor,
          p.telefono,
          p.correo
        FROM inspeccion i
        JOIN expediente e ON i.id_codigo_exp = e.id_expediente
        JOIN solicitud s ON e.id_solicitud = s.id_solicitud
        JOIN emprendimiento em ON s.id_solicitud = em.id_solicitud
        JOIN clasificacion_emprendimiento c ON em.id_clasificacion = c.id_clasificacion
        JOIN persona p ON s.cedula_persona = p.cedula
        WHERE i.id_inspeccion = $1
      `;
      const inspectionResult = await client.query(inspectionQuery, [id_inspeccion]);
      
      if (inspectionResult.rows.length === 0) {
        return null;
      }
      
      const inspection = inspectionResult.rows[0];

      // 2. Estudio de Mercado
      const estudioQuery = `SELECT * FROM estudio_mercado WHERE id_inspeccion = $1`;
      const estudioResult = await client.query(estudioQuery, [id_inspeccion]);
      inspection.estudio_mercado = estudioResult.rows[0] || null;
      
      if (inspection.estudio_mercado) {
        // Productos (producción mensual)
        const productosQuery = `SELECT * FROM produccion_mensual WHERE id_inspeccion = $1`;
        const productosResult = await client.query(productosQuery, [id_inspeccion]);
        inspection.estudio_mercado.productos = productosResult.rows;
        
        // Ventas estimadas
        const ventasQuery = `SELECT * FROM ventas_estimadas WHERE id_inspeccion = $1`;
        const ventasResult = await client.query(ventasQuery, [id_inspeccion]);
        inspection.estudio_mercado.ventas = ventasResult.rows;
        
        // Materia prima
        const materiaQuery = `SELECT * FROM materia_prima WHERE id_inspeccion = $1`;
        const materiaResult = await client.query(materiaQuery, [id_inspeccion]);
        inspection.estudio_mercado.materia_prima = materiaResult.rows;
      }

      // 3. Aspectos Técnicos
      const tecnicoQuery = `SELECT * FROM aspectos_tecnicos WHERE id_inspeccion = $1`;
      const tecnicoResult = await client.query(tecnicoQuery, [id_inspeccion]);
      inspection.aspectos_tecnicos = tecnicoResult.rows[0] || null;
      
      if (inspection.aspectos_tecnicos) {
        // Maquinaria existente
        const maqExistenteQuery = `SELECT * FROM maquinaria_existente WHERE id_inspeccion = $1`;
        const maqExistenteResult = await client.query(maqExistenteQuery, [id_inspeccion]);
        inspection.aspectos_tecnicos.maquinaria_existente = maqExistenteResult.rows;
        
        // Maquinaria solicitada
        const maqSolicitadaQuery = `SELECT * FROM maquinaria_solicitada WHERE id_inspeccion = $1`;
        const maqSolicitadaResult = await client.query(maqSolicitadaQuery, [id_inspeccion]);
        inspection.aspectos_tecnicos.maquinaria_solicitada = maqSolicitadaResult.rows;
        
        // Recurso humano
        const rhQuery = `SELECT * FROM recurso_humano WHERE id_inspeccion = $1`;
        const rhResult = await client.query(rhQuery, [id_inspeccion]);
        inspection.aspectos_tecnicos.recurso_humano = rhResult.rows;
        
        // Servicios básicos
        const serviciosQuery = `SELECT * FROM servicios_basicos WHERE id_inspeccion = $1`;
        const serviciosResult = await client.query(serviciosQuery, [id_inspeccion]);
        inspection.aspectos_tecnicos.servicios_basicos = serviciosResult.rows[0] || null;
      }

      // 4. Gastos Mensuales
      const gastosQuery = `SELECT * FROM gastos_mensuales WHERE id_inspeccion = $1`;
      const gastosResult = await client.query(gastosQuery, [id_inspeccion]);
      inspection.gastos_mensuales = gastosResult.rows;

      // 5. Plan de Inversión
      const planQuery = `SELECT * FROM plan_inversion WHERE id_inspeccion = $1`;
      const planResult = await client.query(planQuery, [id_inspeccion]);
      inspection.plan_inversion = planResult.rows;

      // 6. Organización y Comunidad
      const orgQuery = `SELECT * FROM organizacion_comunidad WHERE id_inspeccion = $1`;
      const orgResult = await client.query(orgQuery, [id_inspeccion]);
      inspection.organizacion_comunidad = orgResult.rows[0] || null;

      // 7. Aporte a la Comunidad
      const aporteQuery = `SELECT * FROM aporte_comunidad WHERE id_inspeccion = $1`;
      const aporteResult = await client.query(aporteQuery, [id_inspeccion]);
      inspection.aporte_comunidad = aporteResult.rows[0] || null;

      // 8. Garantía
      const garantiaQuery = `SELECT * FROM garantia WHERE id_inspeccion = $1`;
      const garantiaResult = await client.query(garantiaQuery, [id_inspeccion]);
      inspection.garantia = garantiaResult.rows[0] || null;

      // 9. Datos agrícolas (si existen)
      await loadAgricolaData(client, id_inspeccion, inspection);

      return inspection;
    } finally {
      client.release();
    }
  }

  // Obtener inspecciones por expediente
  static async getByExpediente(id_codigo_exp) {
    const query = `
      SELECT 
        i.*,
        e.codigo_expediente,
        e.id_solicitud,
        em.nombre_emprendimiento,
        c.sector,
        c.actividad,
        c.n_ins_asig
      FROM inspeccion i
      JOIN expediente e ON i.id_codigo_exp = e.id_expediente
      JOIN solicitud s ON e.id_solicitud = s.id_solicitud
      JOIN emprendimiento em ON s.id_solicitud = em.id_solicitud
      JOIN clasificacion_emprendimiento c ON em.id_clasificacion = c.id_clasificacion
      WHERE i.id_codigo_exp = $1
      ORDER BY i.created_at DESC
    `;
    const result = await pool.query(query, [id_codigo_exp]);
    return result.rows;
  }

  // Obtener datos del emprendimiento para nueva inspección
  static async getEmprendimientoData(id_expediente) {
    const query = `
      SELECT 
        e.id_expediente,
        e.codigo_expediente,
        e.id_solicitud,
        em.id_emprendimiento,
        em.nombre_emprendimiento,
        em.direccion_empredimiento,
        em.anos_experiencia,
        em.cedula_emprendimiento,
        c.id_clasificacion,
        c.sector,
        c.actividad,
        c.n_ins_asig,
        s.id_solicitud,
        s.solicitud,
        s.monto_solicitado,
        p.nombres as nombre_emprendedor,
        p.cedula as cedula_emprendedor,
        p.telefono,
        p.correo
      FROM expediente e
      JOIN solicitud s ON e.id_solicitud = s.id_solicitud
      JOIN emprendimiento em ON s.id_solicitud = em.id_solicitud
      JOIN clasificacion_emprendimiento c ON em.id_clasificacion = c.id_clasificacion
      JOIN persona p ON s.cedula_persona = p.cedula
      WHERE e.id_expediente = $1
    `;
    const result = await pool.query(query, [id_expediente]);
    return result.rows[0];
  }

  // =============================================
  // MÉTODOS DE ESCRITURA (POST/PUT)
  // =============================================

  // Crear nueva inspección básica
  static async create(inspeccionData) {
    const { id_codigo_exp, id_tipo_insp_clas, estatus_inspeccion } = inspeccionData;
    const query = `
      INSERT INTO inspeccion (
        id_codigo_exp, 
        id_tipo_insp_clas, 
        estatus_inspeccion, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [
      id_codigo_exp, 
      id_tipo_insp_clas || 1, 
      estatus_inspeccion || 'Pendiente'
    ]);
    return result.rows[0];
  }

  // Método createFull - INSERT en tablas relacionadas + UPDATE estatus a "En Revisión"
  static async createFull(data) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Crear la inspección primero si no tiene ID
      let idInspeccion = data.id_inspeccion;
      
      if (!idInspeccion) {
        const inspeccionResult = await client.query(
          `INSERT INTO inspeccion (id_codigo_exp, id_tipo_insp_clas, estatus_inspeccion, created_at, updated_at) 
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
           RETURNING id_inspeccion`,
          [data.id_codigo_exp, data.id_tipo_insp_clas || 1, 'Pendiente']
        );
        idInspeccion = inspeccionResult.rows[0].id_inspeccion;
      }
      
      // 1. ESTUDIO DE MERCADO
      if (data.estudio_mercado) {
        await this._insertEstudioMercado(client, idInspeccion, data.estudio_mercado);
      }
      
      // 2. ASPECTOS TÉCNICOS
      if (data.aspectos_tecnicos) {
        await this._insertAspectosTecnicos(client, idInspeccion, data.aspectos_tecnicos);
      }
      
      // 3. GASTOS MENSUALES
      if (data.gastos_mensuales && Array.isArray(data.gastos_mensuales)) {
        await this._insertGastosMensuales(client, idInspeccion, data.gastos_mensuales);
      }
      
      // 4. PLAN DE INVERSIÓN
      if (data.plan_inversion && Array.isArray(data.plan_inversion)) {
        await this._insertPlanInversion(client, idInspeccion, data.plan_inversion);
      }
      
      // 5. ORGANIZACIÓN Y COMUNIDAD
      if (data.organizacion_comunidad) {
        await this._insertOrganizacionComunidad(client, idInspeccion, data.organizacion_comunidad);
      }

      // 6. AGRÍCOLA (unidad_produccion → anexos)
      if (isAgricolaPayload(data)) {
        await insertAgricolaCompleto(client, idInspeccion, data);
      }
      
      // 7. Marcar Completada y pasar expediente a aprobación si ya no hay pendientes
      await this._completarInspeccionYAvanzar(client, idInspeccion);
      
      await client.query('COMMIT');
      
      // Retornar datos completos
      return await this.getFullInspectionData(idInspeccion);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Actualizar inspección existente
  static async update(id, data) {
    const { estatus_inspeccion, observaciones, recomendaciones, calificacion } = data;
    const query = `
      UPDATE inspeccion 
      SET 
        estatus_inspeccion = COALESCE($1, estatus_inspeccion),
        observaciones = COALESCE($2, observaciones),
        recomendaciones = COALESCE($3, recomendaciones),
        calificacion = COALESCE($4, calificacion),
        updated_at = CURRENT_TIMESTAMP
      WHERE id_inspeccion = $5
      RETURNING *
    `;
    const result = await pool.query(query, [
      estatus_inspeccion,
      observaciones,
      recomendaciones,
      calificacion,
      id
    ]);
    return result.rows[0];
  }

  // Actualizar inspección completa (reemplaza todos los datos)
  static async updateFull(id, data) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. ACTUALIZAR ESTATUS a "En Revisión"
      await client.query(
        `UPDATE inspeccion 
         SET estatus_inspeccion = 'En Revisión',
             updated_at = CURRENT_TIMESTAMP
         WHERE id_inspeccion = $1`,
        [id]
      );
      
      // 2. Eliminar datos antiguos de tablas relacionadas
      await this._deleteRelatedData(client, id);
      
      // 3. Reinsertar datos actualizados
      if (data.estudio_mercado) {
        await this._insertEstudioMercado(client, id, data.estudio_mercado);
      }
      
      if (data.aspectos_tecnicos) {
        await this._insertAspectosTecnicos(client, id, data.aspectos_tecnicos);
      }
      
      if (data.gastos_mensuales && Array.isArray(data.gastos_mensuales)) {
        await this._insertGastosMensuales(client, id, data.gastos_mensuales);
      }
      
      if (data.plan_inversion && Array.isArray(data.plan_inversion)) {
        await this._insertPlanInversion(client, id, data.plan_inversion);
      }
      
      if (data.organizacion_comunidad) {
        await this._insertOrganizacionComunidad(client, id, data.organizacion_comunidad);
      }

      if (isAgricolaPayload(data)) {
        await insertAgricolaCompleto(client, id, data);
      }
      
      // Marcar inspección como Completada y avanzar expediente a aprobación si aplica
      await this._completarInspeccionYAvanzar(client, id);
      
      await client.query('COMMIT');
      
      return await this.getFullInspectionData(id);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Tras guardar la revisión: Completada.
   * Solo cierra ESTA inspección. El expediente pasa a "Listo para aprobación"
   * cuando ya no queden inspecciones abiertas del expediente.
   */
  static async _completarInspeccionYAvanzar(client, idInspeccion) {
    await client.query(
      `UPDATE inspeccion
       SET estatus_inspeccion = 'Completada',
           updated_at = CURRENT_TIMESTAMP
       WHERE id_inspeccion = $1`,
      [idInspeccion]
    );

    const exp = await client.query(
      `SELECT id_codigo_exp FROM inspeccion WHERE id_inspeccion = $1`,
      [idInspeccion]
    );
    const idExpediente = exp.rows[0]?.id_codigo_exp;
    if (!idExpediente) return;

    const pendientes = await client.query(
      `SELECT COUNT(*)::int AS n
       FROM inspeccion
       WHERE id_codigo_exp = $1
         AND estatus_inspeccion IN ('Pendiente', 'En Revisión', 'En Proceso')`,
      [idExpediente]
    );

    if ((pendientes.rows[0]?.n || 0) === 0) {
      await client.query(
        `UPDATE expediente
         SET estatus = 'Listo para aprobación',
             updated_at = CURRENT_TIMESTAMP
         WHERE id_expediente = $1`,
        [idExpediente]
      );
      await CitaModel.marcarAtendidaPorExpediente(idExpediente, client);
    }
  }

  // Guardar resultados de inspección
  static async saveInspectionResults(id, results) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Actualizar estatus y datos básicos
      await client.query(
        `UPDATE inspeccion 
         SET estatus_inspeccion = 'Completada',
             observaciones = $1,
             recomendaciones = $2,
             calificacion = $3,
             duracion = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id_inspeccion = $5`,
        [
          results.observaciones || '',
          results.recomendaciones || '',
          results.calificacion || 0,
          results.duracion || '',
          id
        ]
      );
      
      await client.query('COMMIT');
      
      return await this.getById(id);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Eliminar inspección
  static async delete(id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Eliminar datos relacionados primero
      await this._deleteRelatedData(client, id);
      
      // Eliminar la inspección
      const query = 'DELETE FROM inspeccion WHERE id_inspeccion = $1 RETURNING *';
      const result = await client.query(query, [id]);
      
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================
  // MÉTODOS AUXILIARES DE INSERCIÓN
  // =============================================

  // 1. ESTUDIO DE MERCADO + PRODUCCION MENSUAL + VENTAS ESTIMADAS + MATERIA PRIMA
  static async _insertEstudioMercado(client, idInspeccion, estudio) {
    // Insertar estudio_mercado
    const estudioResult = await client.query(
      `INSERT INTO estudio_mercado (id_inspeccion, descripcion_producto, descripcion_proceso, usuarios) 
       VALUES ($1, $2, $3, $4) RETURNING id_estudio`,
      [
        idInspeccion, 
        estudio.descripcion_producto || '', 
        estudio.descripcion_proceso || '', 
        estudio.usuarios || ''
      ]
    );
    const idEstudio = estudioResult.rows[0].id_estudio;
    
    // Insertar produccion_mensual (productos)
    if (estudio.productos && Array.isArray(estudio.productos)) {
      for (const prod of estudio.productos) {
        await client.query(
          `INSERT INTO produccion_mensual (id_estudio, id_inspeccion, descripcion_producto, unidad_medida, costo_produccion_usd, cantidad) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            idEstudio, 
            idInspeccion, 
            prod.descripcion || '', 
            prod.unidad_medida || '', 
            parseFloat(prod.costo_produccion_usd) || 0, 
            parseFloat(prod.cantidad) || 0
          ]
        );
      }
    }
    
    // Insertar ventas_estimadas
    if (estudio.ventas && Array.isArray(estudio.ventas)) {
      for (const venta of estudio.ventas) {
        await client.query(
          `INSERT INTO ventas_estimadas (id_estudio, id_inspeccion, descripcion_producto, unidad_medida, cantidad, precio_venta_usd) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            idEstudio, 
            idInspeccion, 
            venta.descripcion || '', 
            venta.unidad_medida || '', 
            parseFloat(venta.cantidad) || 0, 
            parseFloat(venta.precio_venta_usd) || 0
          ]
        );
      }
    }
    
    // Insertar materia_prima
    if (estudio.materia_prima && Array.isArray(estudio.materia_prima)) {
      for (const mp of estudio.materia_prima) {
        await client.query(
          `INSERT INTO materia_prima (id_estudio, id_inspeccion, descripcion, unidad_medida, cantidad, precio_compra_usd) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            idEstudio, 
            idInspeccion, 
            mp.descripcion || '', 
            mp.unidad_medida || '', 
            parseFloat(mp.cantidad) || 0, 
            parseFloat(mp.precio_compra_usd) || 0
          ]
        );
      }
    }
  }

  // 2. ASPECTOS TÉCNICOS + MAQUINARIA + RECURSO HUMANO + SERVICIOS BÁSICOS
  static async _insertAspectosTecnicos(client, idInspeccion, tecnico) {
    // Insertar aspectos_tecnicos
    const tecnicoResult = await client.query(
      `INSERT INTO aspectos_tecnicos (id_inspeccion, descripcion_local, tenencia_local) 
       VALUES ($1, $2, $3) RETURNING id_tecnico`,
      [
        idInspeccion, 
        tecnico.descripcion_local || '', 
        tecnico.tenencia_local || 'propio'
      ]
    );
    const idTecnico = tecnicoResult.rows[0].id_tecnico;
    
    // Insertar maquinaria_existente
    if (tecnico.maquinaria_existente && Array.isArray(tecnico.maquinaria_existente)) {
      for (const maq of tecnico.maquinaria_existente) {
        await client.query(
          `INSERT INTO maquinaria_existente (id_tecnico, id_inspeccion, cantidad, descripcion, precio_unitario_usd, total_usd) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            idTecnico, 
            idInspeccion, 
            parseInt(maq.cantidad) || 1, 
            maq.descripcion || '', 
            parseFloat(maq.precio_unitario_usd) || 0, 
            parseFloat(maq.total_usd) || 0
          ]
        );
      }
    }
    
    // Insertar maquinaria_solicitada
    if (tecnico.maquinaria_solicitada && Array.isArray(tecnico.maquinaria_solicitada)) {
      for (const maq of tecnico.maquinaria_solicitada) {
        await client.query(
          `INSERT INTO maquinaria_solicitada (id_tecnico, id_inspeccion, cantidad, descripcion, precio_unitario_usd, total_usd) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            idTecnico, 
            idInspeccion, 
            parseInt(maq.cantidad) || 1, 
            maq.descripcion || '', 
            parseFloat(maq.precio_unitario_usd) || 0, 
            parseFloat(maq.total_usd) || 0
          ]
        );
      }
    }
    
    // Insertar recurso_humano
    if (tecnico.recurso_humano && Array.isArray(tecnico.recurso_humano)) {
      for (const rh of tecnico.recurso_humano) {
        await client.query(
          `INSERT INTO recurso_humano (id_tecnico, id_inspeccion, tipo_trabajador, cantidad, salario_mensual_usd) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            idTecnico, 
            idInspeccion, 
            rh.tipo_trabajador || 'EMPLEADOS', 
            parseInt(rh.cantidad) || 0, 
            parseFloat(rh.salario_mensual_usd) || 0
          ]
        );
      }
    }
    
    // Insertar servicios_basicos
    if (tecnico.servicios_basicos) {
      const sb = tecnico.servicios_basicos;
      await client.query(
        `INSERT INTO servicios_basicos (id_tecnico, id_inspeccion, electricidad, agua, telefono, aseo_urbano, cloacas, gas) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          idTecnico,
          idInspeccion,
          sb.electricidad || false,
          sb.agua || false,
          sb.telefono || false,
          sb.aseo_urbano || false,
          sb.cloacas || false,
          sb.gas || false
        ]
      );
    }
  }

  // 3. GASTOS MENSUALES
  static async _insertGastosMensuales(client, idInspeccion, gastos) {
    for (const gasto of gastos) {
      await client.query(
        `INSERT INTO gastos_mensuales (id_inspeccion, concepto, monto_actual_usd, monto_futuro_usd) 
         VALUES ($1, $2, $3, $4)`,
        [
          idInspeccion, 
          gasto.concepto || '', 
          parseFloat(gasto.monto_actual_usd) || 0, 
          parseFloat(gasto.monto_futuro_usd) || 0
        ]
      );
    }
  }

  // 4. PLAN DE INVERSIÓN
  static async _insertPlanInversion(client, idInspeccion, planes) {
    for (const plan of planes) {
      await client.query(
        `INSERT INTO plan_inversion (id_inspeccion, concepto, aportes_propios_usd, monto_solicitado_usd) 
         VALUES ($1, $2, $3, $4)`,
        [
          idInspeccion, 
          plan.concepto || '', 
          parseFloat(plan.aportes_propios_usd) || 0, 
          parseFloat(plan.monto_solicitado_usd) || 0
        ]
      );
    }
  }

  // 5. ORGANIZACIÓN COMUNIDAD + APORTE COMUNIDAD + GARANTIA
  static async _insertOrganizacionComunidad(client, idInspeccion, org) {
    // Insertar organizacion_comunidad
    await client.query(
      `INSERT INTO organizacion_comunidad (id_inspeccion, tipo_organizacion, necesidades_comunidad) 
       VALUES ($1, $2, $3)`,
      [
        idInspeccion, 
        org.tipo_organizacion || '', 
        org.necesidades_comunidad || ''
      ]
    );
    
    // Insertar aporte_comunidad
    await client.query(
      `INSERT INTO aporte_comunidad (id_inspeccion, realiza_aporte, descripcion_aporte) 
       VALUES ($1, $2, $3)`,
      [
        idInspeccion, 
        org.realiza_aporte || false, 
        org.descripcion_aporte || null
      ]
    );
    
    // Insertar garantia
    await client.query(
      `INSERT INTO garantia (id_inspeccion, tipo_garantia) 
       VALUES ($1, $2)`,
      [
        idInspeccion, 
        org.tipo_garantia || org.garantia_ofrecida || 'FIANZA'
      ]
    );
  }

  // =============================================
  // MÉTODO AUXILIAR DE ELIMINACIÓN
  // =============================================

  // Eliminar datos relacionados (respetando el orden de las FK)
  static async _deleteRelatedData(client, idInspeccion) {
    // Eliminar en orden debido a las foreign keys
    await client.query('DELETE FROM produccion_mensual WHERE id_inspeccion = $1', [idInspeccion]);
    await client.query('DELETE FROM ventas_estimadas WHERE id_inspeccion = $1', [idInspeccion]);
    await client.query('DELETE FROM materia_prima WHERE id_inspeccion = $1', [idInspeccion]);
    await client.query('DELETE FROM estudio_mercado WHERE id_inspeccion = $1', [idInspeccion]);
    
    await client.query('DELETE FROM maquinaria_existente WHERE id_inspeccion = $1', [idInspeccion]);
    await client.query('DELETE FROM maquinaria_solicitada WHERE id_inspeccion = $1', [idInspeccion]);
    await client.query('DELETE FROM recurso_humano WHERE id_inspeccion = $1', [idInspeccion]);
    await client.query('DELETE FROM servicios_basicos WHERE id_inspeccion = $1', [idInspeccion]);
    await client.query('DELETE FROM aspectos_tecnicos WHERE id_inspeccion = $1', [idInspeccion]);
    
    await client.query('DELETE FROM gastos_mensuales WHERE id_inspeccion = $1', [idInspeccion]);
    await client.query('DELETE FROM plan_inversion WHERE id_inspeccion = $1', [idInspeccion]);
    
    await client.query('DELETE FROM organizacion_comunidad WHERE id_inspeccion = $1', [idInspeccion]);
    await client.query('DELETE FROM aporte_comunidad WHERE id_inspeccion = $1', [idInspeccion]);
    await client.query('DELETE FROM garantia WHERE id_inspeccion = $1', [idInspeccion]);

    // Datos agrícolas
    await deleteAgricolaData(client, idInspeccion);
  }
}

module.exports = InspeccionModel;