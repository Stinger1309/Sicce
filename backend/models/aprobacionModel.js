const pool = require("../config/db");
const CitaModel = require("./citaModel");

class AprobacionModel {
  // Obtener todos los expedientes con información relacionada
  static async getAllExpedientes() {
    try {
      const query = `
        SELECT 
            e.id_expediente,
            e.codigo_expediente,
            e.id_solicitud,
            e.id_usuario,
            e.id_requisitos,
            e.urls_imagenes,
            e.estatus,
            e.observaciones,
            e.created_at,
            e.updated_at,
            p.nombres,
            p.apellidos,
            p.correo AS email,
            p.cedula,
            p.telefono,
            s.monto_solicitado,
            s.solicitud,
            s.estatus AS estatus_solicitud,
            a.id_aprobacion,
            a.cedula_persona_id,
            a.verificacion_requisitos,
            a.estatus_aprobacion,
            a.seleccion_manejo,
            ins.estatus_inspeccion,
            ins.id_inspeccion
        FROM expediente e
        LEFT JOIN solicitud s ON e.id_solicitud = s.id_solicitud       
        LEFT JOIN persona p ON s.cedula_persona = p.cedula
        LEFT JOIN aprobacion a ON e.id_expediente = a.id_expediente
        LEFT JOIN LATERAL (
          SELECT i.id_inspeccion, i.estatus_inspeccion
          FROM inspeccion i
          WHERE i.id_codigo_exp = e.id_expediente
          ORDER BY
            CASE
              WHEN i.estatus_inspeccion = 'Completada' THEN 0
              WHEN i.estatus_inspeccion IN ('Aprobado', 'Aprobado con observaciones') THEN 1
              ELSE 2
            END,
            i.updated_at DESC NULLS LAST
          LIMIT 1
        ) ins ON TRUE
        WHERE (
          e.estatus IN ('Listo para aprobación', 'En aprobación', 'Aprobado', 'Rechazado')
          OR ins.estatus_inspeccion IN ('Completada', 'Aprobado', 'Aprobado con observaciones', 'Rechazado')
          OR a.id_aprobacion IS NOT NULL
        )
        ORDER BY e.created_at DESC;
      `;
      const result = await pool.query(query);

      // Procesar cada expediente para obtener sus requisitos
      const expedientesProcesados = await Promise.all(
        result.rows.map(async (row) => {
          let requisitosExpediente = [];

          // Parsear id_requisitos (viene como "1,2,3" o "1, 2, 3")
          if (row.id_requisitos && row.id_requisitos.trim() !== "") {
            const idsRequisitos = row.id_requisitos
              .split(",")
              .map((id) => parseInt(id.trim()))
              .filter((id) => !isNaN(id));

            if (idsRequisitos.length > 0) {
              requisitosExpediente =
                await this.getRequisitosByIds(idsRequisitos);
            }
          }
          if (requisitosExpediente.length === 0) {
            requisitosExpediente = await this.getAllRequisitos();
          }

          // Parsear verificacion_requisitos si es string
          let verificacionRequisitos = [];
          if (row.verificacion_requisitos) {
            if (typeof row.verificacion_requisitos === "string") {
              try {
                verificacionRequisitos = JSON.parse(
                  row.verificacion_requisitos,
                );
              } catch (e) {
                console.error("Error al parsear verificacion_requisitos:", e);
                verificacionRequisitos = [];
              }
            } else if (Array.isArray(row.verificacion_requisitos)) {
              verificacionRequisitos = row.verificacion_requisitos;
            }
          }

          return {
            id_expediente: row.id_expediente,
            codigo_expediente: row.codigo_expediente,
            id_solicitud: row.id_solicitud,
            id_usuario: row.id_usuario,
            id_requisitos: row.id_requisitos,
            estatus: row.estatus,
            observaciones: row.observaciones,
            created_at: row.created_at,
            updated_at: row.updated_at,
            nombres: row.nombres,
            apellidos: row.apellidos,
            email: row.email,
            cedula: row.cedula,
            telefono: row.telefono,
            solicitud: row.solicitud,
            estatus_solicitud: row.estatus_solicitud,
            estatus_inspeccion: row.estatus_inspeccion,
            id_inspeccion: row.id_inspeccion,
            urls_imagenes: (() => {
              try {
                return row.urls_imagenes
                  ? typeof row.urls_imagenes === 'string'
                    ? JSON.parse(row.urls_imagenes)
                    : row.urls_imagenes
                  : {};
              } catch {
                return {};
              }
            })(),
            documentos: (() => {
              try {
                return row.urls_imagenes
                  ? typeof row.urls_imagenes === 'string'
                    ? JSON.parse(row.urls_imagenes)
                    : row.urls_imagenes
                  : {};
              } catch {
                return {};
              }
            })(),
            monto_solicitado: row.monto_solicitado,
            id_aprobacion: row.id_aprobacion,
            estatus_aprobacion:
              row.estatus_aprobacion || row.estatus || "Pendiente",
            seleccion_manejo: row.seleccion_manejo,
            cedula_persona_id: row.cedula_persona_id || row.cedula,
            requisitos_expediente: requisitosExpediente,
            verificacion_requisitos: verificacionRequisitos,
            expediente: {
              id_expediente: row.id_expediente,
              codigo_expediente: row.codigo_expediente,
              urls_imagenes: (() => {
                try {
                  return row.urls_imagenes
                    ? typeof row.urls_imagenes === 'string'
                      ? JSON.parse(row.urls_imagenes)
                      : row.urls_imagenes
                    : {};
                } catch {
                  return {};
                }
              })(),
              documentos: (() => {
                try {
                  return row.urls_imagenes
                    ? typeof row.urls_imagenes === 'string'
                      ? JSON.parse(row.urls_imagenes)
                      : row.urls_imagenes
                    : {};
                } catch {
                  return {};
                }
              })(),
              estatus: row.estatus,
            },
          };
        }),
      );

      return expedientesProcesados;
    } catch (error) {
      console.error("Error en getAllExpedientes:", error);
      throw error;
    }
  }

  // Obtener requisitos por sus IDs
  static async getRequisitosByIds(idsArray) {
    try {
      if (!idsArray || idsArray.length === 0) return [];

      const placeholders = idsArray
        .map((_, index) => `$${index + 1}`)
        .join(",");
      const query = `
        SELECT 
          id_requisitos,
          nombre_requisito
        FROM requisitos 
        WHERE id_requisitos IN (${placeholders})
        ORDER BY id_requisitos
      `;

      const result = await pool.query(query, idsArray);
      return result.rows.map((req) => ({
        id_requisito: req.id_requisitos,
        nombre: req.nombre_requisito,
        descripcion: "",
        tipo_requisito: null,
        verificado: false,
      }));
    } catch (error) {
      console.error("Error en getRequisitosByIds:", error);
      return [];
    }
  }

  // Obtener expediente por ID
  static async getExpedienteById(id) {
    try {
      const query = `
        SELECT 
          e.id_expediente,
          e.codigo_expediente,
          e.id_solicitud,
          e.id_usuario,
          e.id_requisitos,
          e.urls_imagenes,
          e.verificacion_documentos,
          e.estatus,
          e.observaciones,
          e.created_at,
          e.updated_at,
          p.nombres,
          p.apellidos,
          p.correo as email,
          p.cedula,
          p.telefono,
          p.direccion,
          s.monto_solicitado,
          s.estatus AS estatus_solicitud,
          a.id_aprobacion,
          a.verificacion_requisitos,
          a.estatus_aprobacion,
          a.cedula_persona_id,
          a.seleccion_manejo,
          a.id_persona_banco,
          ins.estatus_inspeccion,
          ins.id_inspeccion
        FROM expediente e
        LEFT JOIN solicitud s ON e.id_solicitud = s.id_solicitud
        LEFT JOIN persona p ON p.cedula = s.cedula_persona
        LEFT JOIN aprobacion a ON e.id_expediente = a.id_expediente
        LEFT JOIN LATERAL (
          SELECT i.id_inspeccion, i.estatus_inspeccion
          FROM inspeccion i
          WHERE i.id_codigo_exp = e.id_expediente
          ORDER BY i.updated_at DESC NULLS LAST
          LIMIT 1
        ) ins ON TRUE
        WHERE e.id_expediente = $1
      `;

      const expedienteId = parseInt(id);
      if (isNaN(expedienteId)) {
        throw new Error('ID de expediente inválido');
      }

      const result = await pool.query(query, [expedienteId]);

      if (!result.rows[0]) return null;

      const row = result.rows[0];

      // Obtener los requisitos del expediente
      let requisitosExpediente = [];
      if (row.id_requisitos && row.id_requisitos.trim() !== "") {
        const idsRequisitos = row.id_requisitos
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id));

        if (idsRequisitos.length > 0) {
          requisitosExpediente = await this.getRequisitosByIds(idsRequisitos);
        }
      }
      // Si no hay ids en expediente, cargar todos los requisitos configurados
      if (requisitosExpediente.length === 0) {
        requisitosExpediente = await this.getAllRequisitos();
      }

      // Parsear verificacion_requisitos
      let verificacionRequisitos = [];
      if (row.verificacion_requisitos) {
        if (typeof row.verificacion_requisitos === "string") {
          try {
            verificacionRequisitos = JSON.parse(row.verificacion_requisitos);
          } catch (e) {
            console.error("Error al parsear verificacion_requisitos:", e);
            verificacionRequisitos = [];
          }
        } else if (Array.isArray(row.verificacion_requisitos)) {
          verificacionRequisitos = row.verificacion_requisitos;
        }
      }

      let urlsImagenes = {};
      if (row.urls_imagenes) {
        try {
          urlsImagenes =
            typeof row.urls_imagenes === "string"
              ? JSON.parse(row.urls_imagenes)
              : row.urls_imagenes;
        } catch (_) {
          urlsImagenes = {};
        }
      }

      return {
        id_expediente: row.id_expediente,
        codigo_expediente: row.codigo_expediente,
        id_solicitud: row.id_solicitud,
        id_usuario: row.id_usuario,
        id_requisitos: row.id_requisitos,
        urls_imagenes: urlsImagenes,
        documentos: urlsImagenes,
        verificacion_documentos: row.verificacion_documentos,
        estatus: row.estatus,
        observaciones: row.observaciones,
        created_at: row.created_at,
        updated_at: row.updated_at,
        nombres: row.nombres,
        apellidos: row.apellidos,
        email: row.email,
        cedula: row.cedula,
        telefono: row.telefono,
        direccion: row.direccion,
        monto_solicitado: row.monto_solicitado,
        estatus_solicitud: row.estatus_solicitud,
        id_aprobacion: row.id_aprobacion,
        estatus_aprobacion: row.estatus_aprobacion || row.estatus || "Pendiente",
        seleccion_manejo: row.seleccion_manejo,
        id_persona_banco: row.id_persona_banco,
        cedula_persona_id: row.cedula_persona_id || row.cedula,
        estatus_inspeccion: row.estatus_inspeccion,
        id_inspeccion: row.id_inspeccion,
        requisitos_expediente: requisitosExpediente,
        verificacion_requisitos: verificacionRequisitos,
        expediente: {
          id_expediente: row.id_expediente,
          codigo_expediente: row.codigo_expediente,
          urls_imagenes: urlsImagenes,
          documentos: urlsImagenes,
          estatus: row.estatus,
          observaciones: row.observaciones,
        },
      };
    } catch (error) {
      console.error("Error en getExpedienteById:", error);
      throw error;
    }
  }

  // Obtener todos los requisitos disponibles
  static async getAllRequisitos() {
    try {
      const query = `
        SELECT 
          id_requisitos,
          nombre_requisito
        FROM requisitos 
        WHERE COALESCE(activo, TRUE) = TRUE
        ORDER BY id_requisitos
      `;

      const result = await pool.query(query);
      return result.rows.map((req) => ({
        id_requisito: req.id_requisitos,
        nombre: req.nombre_requisito,
        descripcion: "",
        tipo_requisito: null,
        verificado: false,
      }));
    } catch (error) {
      console.error("Error en getAllRequisitos:", error);
      throw error;
    }
  }

  // Verificar requisitos y actualizar expediente, solicitud e inspección
  static async verificarRequisitos(data) {
    const {
      id_expediente,
      requisitos,
      estatus,
      seleccion_manejo,
      cedula_persona_id,
      observaciones,
      id_inspeccion,
      estatus_aprobacion,
      estatus_inspeccion,
      id_persona_banco,
    } = data;

    console.log('📥 MODELO - DATOS RECIBIDOS:');
    console.log('cedula_persona_id:', cedula_persona_id);
    console.log('seleccion_manejo:', seleccion_manejo);
    console.log('id_persona_banco:', id_persona_banco);

    if (!cedula_persona_id || cedula_persona_id === '') {
      throw new Error('cedula_persona_id es requerido y no puede estar vacío');
    }

    if (seleccion_manejo === 'Banco' && !id_persona_banco) {
      throw new Error('Debe seleccionar el banco al cual se direccionará el crédito');
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existente = await client.query(
        "SELECT id_aprobacion, id_inspeccion FROM aprobacion WHERE id_expediente = $1",
        [id_expediente],
      );

      let idInspeccionFinal = id_inspeccion ? parseInt(id_inspeccion, 10) : null;
      if (Number.isNaN(idInspeccionFinal)) idInspeccionFinal = null;

      // Nunca usar id_expediente como id_inspeccion
      if (idInspeccionFinal && idInspeccionFinal === parseInt(id_expediente, 10)) {
        idInspeccionFinal = null;
      }

      if (!idInspeccionFinal && existente.rows.length > 0) {
        idInspeccionFinal = existente.rows[0].id_inspeccion || null;
      }

      if (!idInspeccionFinal) {
        const insLookup = await client.query(
          `SELECT id_inspeccion
           FROM inspeccion
           WHERE id_codigo_exp = $1
           ORDER BY
             CASE
               WHEN estatus_inspeccion IN ('Completada', 'Aprobado', 'Aprobado con observaciones') THEN 0
               ELSE 1
             END,
             id_inspeccion DESC
           LIMIT 1`,
          [id_expediente]
        );
        idInspeccionFinal = insLookup.rows[0]?.id_inspeccion || null;
      }

      if (!idInspeccionFinal && existente.rows.length === 0) {
        throw new Error(
          'No hay una inspección asociada al expediente. Complete la inspección antes de aprobar.'
        );
      }

      const requisitosJSON = JSON.stringify(requisitos.map(req => ({
        id_requisito: req.id_requisito,
        nombre: req.nombre,
        verificado: req.verificado === true,
        estado_verificacion: req.estado_verificacion || (req.verificado ? 'verificado' : 'pendiente'),
        observacion_no_valido: req.observacion_no_valido || null
      })));

      let idAprobacion = existente.rows[0]?.id_aprobacion || null;

      const estatusAprobacionFinal = estatus_aprobacion || estatus;

      if (existente.rows.length > 0) {
        const upd = await client.query(
          `UPDATE aprobacion 
           SET verificacion_requisitos = $1,
               estatus_aprobacion = $2,
               seleccion_manejo = COALESCE($3, seleccion_manejo),
               id_inspeccion = COALESCE($4, id_inspeccion),
               cedula_persona_id = $5,
               id_persona_banco = COALESCE($6, id_persona_banco),
               updated_at = CURRENT_TIMESTAMP
           WHERE id_expediente = $7
           RETURNING id_aprobacion`,
          [
            requisitosJSON, 
            estatusAprobacionFinal, 
            seleccion_manejo || null, 
            idInspeccionFinal, 
            cedula_persona_id,
            id_persona_banco || null,
            id_expediente
          ],
        );
        idAprobacion = upd.rows[0].id_aprobacion;
      } else {
        const ins = await client.query(
          `INSERT INTO aprobacion (
            id_expediente, 
            id_inspeccion,
            cedula_persona_id,
            verificacion_requisitos, 
            estatus_aprobacion, 
            seleccion_manejo,
            id_persona_banco
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id_aprobacion`,
          [
            id_expediente, 
            idInspeccionFinal, 
            cedula_persona_id,
            requisitosJSON, 
            estatusAprobacionFinal, 
            seleccion_manejo || null,
            id_persona_banco || null
          ],
        );
        idAprobacion = ins.rows[0].id_aprobacion;
      }

      // Expediente: estatus del flujo (Aprobado / Rechazado / En aprobación)
      await client.query(
        `UPDATE expediente 
         SET estatus = $1, 
             observaciones = COALESCE(NULLIF($2, ''), observaciones), 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id_expediente = $3`,
        [estatus, observaciones || "", id_expediente],
      );

      if (estatus && String(estatus) !== 'Incompleto') {
        await CitaModel.marcarAtendidaPorExpediente(id_expediente, client);
      }

      const expedienteInfo = await client.query(
        `SELECT e.id_solicitud, s.monto_solicitado
         FROM expediente e
         LEFT JOIN solicitud s ON e.id_solicitud = s.id_solicitud
         WHERE e.id_expediente = $1`,
        [id_expediente]
      );

      const idSolicitud = expedienteInfo.rows[0]?.id_solicitud || null;
      const montoSolicitado = expedienteInfo.rows[0]?.monto_solicitado || null;

      // Solicitud: solo Aprobado/Rechazado en decisión final (no "En aprobación")
      if (idSolicitud && (estatus === 'Aprobado' || estatus === 'Rechazado')) {
        await client.query(
          `UPDATE solicitud 
           SET estatus = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id_solicitud = $2`,
          [estatus, idSolicitud]
        );
      }

      if (estatus_inspeccion && idInspeccionFinal) {
        const inspeccionExistente = await client.query(
          "SELECT id_inspeccion, estatus_inspeccion FROM inspeccion WHERE id_inspeccion = $1",
          [idInspeccionFinal]
        );
        
        if (inspeccionExistente.rows.length > 0) {
          await client.query(
            `UPDATE inspeccion 
             SET estatus_inspeccion = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id_inspeccion = $2`,
            [estatus_inspeccion, idInspeccionFinal]
          );
        }
      }

      // Si se dirige a banco y está aprobado → crear crédito banco Finalizado
      let idCreditoBanco = null;
      const estatusFinal = String(estatusAprobacionFinal || '').toLowerCase();
      if (
        seleccion_manejo === 'Banco' &&
        id_persona_banco &&
        idAprobacion &&
        (estatusFinal.includes('aprob') && !estatusFinal.includes('rechaz'))
      ) {
        const existsCb = await client.query(
          `SELECT id_credito_banco FROM credito_banco WHERE id_aprobacion = $1`,
          [idAprobacion]
        );
        if (existsCb.rows[0]) {
          const updCb = await client.query(
            `UPDATE credito_banco SET
              id_persona_banco = $1,
              monto_solicitado = COALESCE($2, monto_solicitado),
              monto_aprobado = COALESCE($2, monto_aprobado),
              observaciones = COALESCE($3, observaciones),
              estatus = 'Finalizado',
              fecha_finalizado = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
             WHERE id_aprobacion = $4
             RETURNING id_credito_banco`,
            [id_persona_banco, montoSolicitado, observaciones || null, idAprobacion]
          );
          idCreditoBanco = updCb.rows[0]?.id_credito_banco || existsCb.rows[0].id_credito_banco;
        } else {
          const insCb = await client.query(
            `INSERT INTO credito_banco (
              id_aprobacion, id_expediente, id_solicitud, cedula_persona,
              id_persona_banco, monto_solicitado, monto_aprobado, estatus,
              observaciones, fecha_direccion, fecha_finalizado
            ) VALUES ($1,$2,$3,$4,$5,$6,$6,'Finalizado',$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
            RETURNING id_credito_banco`,
            [
              idAprobacion,
              id_expediente,
              idSolicitud,
              cedula_persona_id,
              id_persona_banco,
              montoSolicitado,
              observaciones || 'Crédito direccionado a banco por IADEY'
            ]
          );
          idCreditoBanco = insCb.rows[0]?.id_credito_banco || null;
        }
      }

      await client.query("COMMIT");
      const expedienteActualizado = await this.getExpedienteById(id_expediente);
      return {
        ...expedienteActualizado,
        id_aprobacion: idAprobacion,
        id_credito_banco: idCreditoBanco,
        descargar_aval: Boolean(idCreditoBanco),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error en verificarRequisitos:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Estadísticas de expedientes
  static async getStatsExpedientes() {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*)::integer as total,
          COUNT(CASE WHEN e.estatus = 'Pendiente' THEN 1 END)::integer as pendientes,
          COUNT(CASE WHEN e.estatus = 'En Proceso' THEN 1 END)::integer as en_proceso,
          COUNT(CASE WHEN e.estatus = 'Aprobado' THEN 1 END)::integer as aprobados,
          COUNT(CASE WHEN e.estatus = 'Rechazado' THEN 1 END)::integer as rechazados
        FROM expediente e
      `);
      return result.rows[0];
    } catch (error) {
      console.error("Error en getStatsExpedientes:", error);
      throw error;
    }
  }
}

module.exports = AprobacionModel;