const pool = require('../config/db');
const { puedeVerMetricasOExportar } = require('../utils/accesoStaff');

async function safeCount(query, params = []) {
  try {
    const r = await pool.query(query, params);
    return parseInt(r.rows[0]?.total || r.rows[0]?.count || 0, 10);
  } catch (e) {
    console.warn('métrica omitida:', e.message);
    return 0;
  }
}

async function safeRows(query, params = []) {
  try {
    const r = await pool.query(query, params);
    return r.rows;
  } catch (e) {
    console.warn('métrica omitida:', e.message);
    return [];
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parsePeriodo(query = {}) {
  const desde = DATE_RE.test(String(query.desde || '')) ? String(query.desde) : null;
  const hasta = DATE_RE.test(String(query.hasta || '')) ? String(query.hasta) : null;
  if (desde && hasta && desde > hasta) {
    return { desde: hasta, hasta: desde };
  }
  return { desde, hasta };
}

/** Filtro por fecha sobre una columna timestamp/date. */
function dateFilter(column, desde, hasta, startIndex = 1) {
  const parts = [];
  const params = [];
  let i = startIndex;
  if (desde) {
    parts.push(`${column}::date >= $${i++}::date`);
    params.push(desde);
  }
  if (hasta) {
    parts.push(`${column}::date <= $${i++}::date`);
    params.push(hasta);
  }
  return {
    sql: parts.length ? ` AND ${parts.join(' AND ')}` : '',
    params,
    nextIndex: i,
  };
}

const metricasController = {
  getResumen: async (req, res) => {
    try {
      const autorizado = await puedeVerMetricasOExportar(req);
      if (!autorizado) {
        return res.status(403).json({
          success: false,
          error: 'Solo el presidente y el administrador pueden ver las métricas',
        });
      }

      const { desde, hasta } = parsePeriodo(req.query);
      const periodo = { desde, hasta };

      const ds = (col) => dateFilter(col, desde, hasta);

      const fSol = ds('COALESCE(CASE WHEN fecha_solicitud ~ \'^\\d{4}-\\d{2}-\\d{2}\' THEN fecha_solicitud::date ELSE NULL END, created_at::date)');
      const fExp = ds('created_at');
      const fIns = ds('created_at');
      const fApr = ds('created_at');
      const fCon = ds('created_at');
      const fDes = ds('created_at');
      const fCuo = ds('created_at');
      const fUsu = ds('u.created_at');
      const fEmp = ds('created_at');

      const [
        solicitudes,
        expedientes,
        inspecciones,
        aprobaciones,
        contratos,
        desembolsos,
        cuotas,
        usuarios,
        emprendedores,
        inspectores,
        solicitudesPendientes,
        solicitudesPreAprobadas,
        solicitudesIncompletas,
        expedientesIncompletos,
        expedientesListosInspeccion,
        expedientesListosAprobacion,
        inspeccionesPendientes,
        inspeccionesCompletadas,
        aprobacionesAprobadas,
        aprobacionesRechazadas,
        contratosActivos,
        contratosPendientesDesembolso,
        desembolsosPendientes,
        cuotasPendientes,
        cuotasVencidas,
        emprendimientos
      ] = await Promise.all([
        safeCount(`SELECT COUNT(*)::int AS total FROM solicitud WHERE 1=1${fSol.sql}`, fSol.params),
        safeCount(`SELECT COUNT(*)::int AS total FROM expediente WHERE 1=1${fExp.sql}`, fExp.params),
        safeCount(`SELECT COUNT(*)::int AS total FROM inspeccion WHERE 1=1${fIns.sql}`, fIns.params),
        safeCount(`SELECT COUNT(*)::int AS total FROM aprobacion WHERE 1=1${fApr.sql}`, fApr.params),
        safeCount(`SELECT COUNT(*)::int AS total FROM contrato WHERE 1=1${fCon.sql}`, fCon.params),
        safeCount(`SELECT COUNT(*)::int AS total FROM desembolso WHERE 1=1${fDes.sql}`, fDes.params),
        safeCount(`SELECT COUNT(*)::int AS total FROM cuota WHERE 1=1${fCuo.sql}`, fCuo.params),
        safeCount(`SELECT COUNT(*)::int AS total FROM usuario u WHERE 1=1${fUsu.sql}`, fUsu.params),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM usuario u
           JOIN roles r ON u.id_rol_usu = r.id_rol
           WHERE LOWER(TRIM(r.nombre_rol)) LIKE '%emprendedor%'${fUsu.sql}`,
          fUsu.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM usuario u
           JOIN roles r ON u.id_rol_usu = r.id_rol
           WHERE (LOWER(TRIM(r.nombre_rol)) LIKE '%inspector%' OR u.id_rol_usu = 3)${fUsu.sql}`,
          fUsu.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM solicitud
           WHERE (LOWER(TRIM(estatus)) IN ('pendiente') OR LOWER(TRIM(estatus)) LIKE 'pendiente%')${fSol.sql}`,
          fSol.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM solicitud
           WHERE (
             LOWER(REPLACE(TRIM(estatus), ' ', '')) IN ('recibido', 'pre-aprobado', 'preaprobado')
             OR LOWER(TRIM(estatus)) LIKE '%pre%aprob%'
             OR LOWER(TRIM(estatus)) = 'recibido'
           )${fSol.sql}`,
          fSol.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM solicitud
           WHERE (LOWER(TRIM(estatus)) IN ('incompleto', 'incompleta')
             OR LOWER(TRIM(estatus)) LIKE 'incomplet%')${fSol.sql}`,
          fSol.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM expediente WHERE estatus = 'Incompleto'${fExp.sql}`,
          fExp.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM expediente WHERE estatus = 'Listo para inspección'${fExp.sql}`,
          fExp.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM expediente WHERE estatus = 'Listo para aprobación'${fExp.sql}`,
          fExp.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM inspeccion
           WHERE estatus_inspeccion IN ('Pendiente', 'En Revisión', 'En Proceso')${fIns.sql}`,
          fIns.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM inspeccion
           WHERE estatus_inspeccion IN ('Completada', 'Aprobado', 'Aprobado con observaciones')${fIns.sql}`,
          fIns.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM aprobacion
           WHERE LOWER(COALESCE(estatus_aprobacion,'')) LIKE '%aprob%'
             AND LOWER(COALESCE(estatus_aprobacion,'')) NOT LIKE '%rechaz%'${fApr.sql}`,
          fApr.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM aprobacion
           WHERE LOWER(COALESCE(estatus_aprobacion,'')) LIKE '%rechaz%'${fApr.sql}`,
          fApr.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM contrato WHERE estatus = 'Activo'${fCon.sql}`,
          fCon.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM contrato WHERE estatus = 'Pendiente por desembolso'${fCon.sql}`,
          fCon.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM desembolso WHERE estatus_desembolso = 'Pendiente'${fDes.sql}`,
          fDes.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM cuota
           WHERE (LOWER(COALESCE(estado_cuota,'')) LIKE '%pend%'
              OR LOWER(COALESCE(estado_cuota,'')) LIKE '%por pagar%')${fCuo.sql}`,
          fCuo.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM cuota
           WHERE (LOWER(COALESCE(estado_cuota,'')) LIKE '%venc%'
              OR LOWER(COALESCE(estado_cuota,'')) LIKE '%mora%')${fCuo.sql}`,
          fCuo.params
        ),
        safeCount(
          `SELECT COUNT(*)::int AS total FROM emprendimiento WHERE 1=1${fEmp.sql}`,
          fEmp.params
        )
      ]);

      const solicitudesPorEstatus = await safeRows(
        `SELECT COALESCE(estatus, 'Sin estatus') AS nombre, COUNT(*)::int AS valor
         FROM solicitud WHERE 1=1${fSol.sql}
         GROUP BY estatus ORDER BY valor DESC`,
        fSol.params
      );

      const expedientesPorEstatus = await safeRows(
        `SELECT COALESCE(estatus, 'Sin estatus') AS nombre, COUNT(*)::int AS valor
         FROM expediente WHERE 1=1${fExp.sql}
         GROUP BY estatus ORDER BY valor DESC`,
        fExp.params
      );

      const inspeccionesPorEstatus = await safeRows(
        `SELECT COALESCE(estatus_inspeccion, 'Sin estatus') AS nombre, COUNT(*)::int AS valor
         FROM inspeccion WHERE 1=1${fIns.sql}
         GROUP BY estatus_inspeccion ORDER BY valor DESC`,
        fIns.params
      );

      const aprobacionesPorEstatus = await safeRows(
        `SELECT COALESCE(estatus_aprobacion, 'Sin estatus') AS nombre, COUNT(*)::int AS valor
         FROM aprobacion WHERE 1=1${fApr.sql}
         GROUP BY estatus_aprobacion ORDER BY valor DESC`,
        fApr.params
      );

      const contratosPorEstatus = await safeRows(
        `SELECT COALESCE(estatus, 'Sin estatus') AS nombre, COUNT(*)::int AS valor
         FROM contrato WHERE 1=1${fCon.sql}
         GROUP BY estatus ORDER BY valor DESC`,
        fCon.params
      );

      // Series mensuales: rango indicado o últimos 12 meses
      const mesSolParams = [];
      let mesSolWhere = '';
      if (desde || hasta) {
        const f = dateFilter('created_at', desde, hasta);
        mesSolWhere = f.sql;
        mesSolParams.push(...f.params);
      } else {
        mesSolWhere = ` AND created_at >= NOW() - INTERVAL '12 months'`;
      }

      const solicitudesPorMes = await safeRows(
        `SELECT TO_CHAR(created_at, 'YYYY-MM') AS mes, COUNT(*)::int AS valor
         FROM solicitud
         WHERE 1=1${mesSolWhere}
         GROUP BY TO_CHAR(created_at, 'YYYY-MM')
         ORDER BY mes`,
        mesSolParams
      );

      const mesExpParams = [];
      let mesExpWhere = '';
      if (desde || hasta) {
        const f = dateFilter('created_at', desde, hasta);
        mesExpWhere = f.sql;
        mesExpParams.push(...f.params);
      } else {
        mesExpWhere = ` AND created_at >= NOW() - INTERVAL '12 months'`;
      }

      const expedientesPorMes = await safeRows(
        `SELECT TO_CHAR(created_at, 'YYYY-MM') AS mes, COUNT(*)::int AS valor
         FROM expediente
         WHERE 1=1${mesExpWhere}
         GROUP BY TO_CHAR(created_at, 'YYYY-MM')
         ORDER BY mes`,
        mesExpParams
      );

      const usuariosPorRol = await safeRows(
        `SELECT COALESCE(r.nombre_rol, 'Sin rol') AS nombre, COUNT(*)::int AS valor
         FROM usuario u
         LEFT JOIN roles r ON u.id_rol_usu = r.id_rol
         WHERE 1=1${fUsu.sql}
         GROUP BY r.nombre_rol
         ORDER BY valor DESC`,
        fUsu.params
      );

      const sectorEmpFilter = ds('e.created_at');
      const sectorEmprendimientos = await safeRows(
        `SELECT COALESCE(c.sector, 'Sin sector') AS nombre, COUNT(*)::int AS valor
         FROM emprendimiento e
         LEFT JOIN clasificacion_emprendimiento c ON e.id_clasificacion = c.id_clasificacion
         WHERE 1=1${sectorEmpFilter.sql}
         GROUP BY c.sector
         ORDER BY valor DESC
         LIMIT 10`,
        sectorEmpFilter.params
      );

      const cuotasPorEstado = await safeRows(
        `SELECT COALESCE(estado_cuota, 'Sin estado') AS nombre, COUNT(*)::int AS valor
         FROM cuota WHERE 1=1${fCuo.sql}
         GROUP BY estado_cuota ORDER BY valor DESC`,
        fCuo.params
      );

      const actSolF = dateFilter('s.updated_at', desde, hasta);
      const actExpF = dateFilter('e.updated_at', desde, hasta);
      const actInsF = dateFilter('i.updated_at', desde, hasta);
      const actConF = dateFilter('c.updated_at', desde, hasta);

      const [actSol, actExp, actIns, actCon, pendSol, pendExp] = await Promise.all([
        safeRows(
          `SELECT
            'solicitud' AS tipo,
            'Solicitud #' || s.id_solicitud AS titulo,
            COALESCE(s.estatus, '') AS detalle,
            CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS actor,
            s.updated_at AS fecha
          FROM solicitud s
          LEFT JOIN persona p ON p.cedula = s.cedula_persona
          WHERE 1=1${actSolF.sql}
          ORDER BY s.updated_at DESC NULLS LAST
          LIMIT 8`,
          actSolF.params
        ),
        safeRows(
          `SELECT
            'expediente' AS tipo,
            COALESCE(e.codigo_expediente, 'Expediente #' || e.id_expediente) AS titulo,
            COALESCE(e.estatus, '') AS detalle,
            CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS actor,
            e.updated_at AS fecha
          FROM expediente e
          LEFT JOIN solicitud s ON s.id_solicitud = e.id_solicitud
          LEFT JOIN persona p ON p.cedula = s.cedula_persona
          WHERE 1=1${actExpF.sql}
          ORDER BY e.updated_at DESC NULLS LAST
          LIMIT 8`,
          actExpF.params
        ),
        safeRows(
          `SELECT
            'inspeccion' AS tipo,
            'Inspección #' || i.id_inspeccion AS titulo,
            COALESCE(i.estatus_inspeccion, '') AS detalle,
            COALESCE(emp.nombre_emprendimiento, 'Emprendimiento') AS actor,
            i.updated_at AS fecha
          FROM inspeccion i
          LEFT JOIN expediente e ON e.id_expediente = i.id_codigo_exp
          LEFT JOIN solicitud s ON s.id_solicitud = e.id_solicitud
          LEFT JOIN emprendimiento emp ON emp.id_solicitud = s.id_solicitud
          WHERE 1=1${actInsF.sql}
          ORDER BY i.updated_at DESC NULLS LAST
          LIMIT 8`,
          actInsF.params
        ),
        safeRows(
          `SELECT
            'contrato' AS tipo,
            COALESCE(c.numero_contrato, 'Contrato #' || c.id_contrato) AS titulo,
            COALESCE(c.estatus, '') AS detalle,
            CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,'')) AS actor,
            c.updated_at AS fecha
          FROM contrato c
          LEFT JOIN aprobacion a ON a.id_aprobacion = c.id_aprob
          LEFT JOIN persona p ON p.cedula = COALESCE(a.cedula_persona_id, c.id_cedula_aprob)
          WHERE 1=1${actConF.sql}
          ORDER BY c.updated_at DESC NULLS LAST
          LIMIT 8`,
          actConF.params
        ),
        safeRows(
          `SELECT
            s.id_solicitud AS id,
            TRIM(CONCAT(COALESCE(p.nombres,''), ' ', COALESCE(p.apellidos,''))) AS name,
            'Solicitud de crédito' AS type,
            TO_CHAR(COALESCE(s.updated_at, s.created_at), 'YYYY-MM-DD') AS date,
            COALESCE(s.estatus, 'Pendiente') AS status,
            CASE WHEN s.estatus = 'Pendiente' THEN 'Alta' ELSE 'Media' END AS priority
          FROM solicitud s
          LEFT JOIN persona p ON p.cedula = s.cedula_persona
          WHERE s.estatus IN ('Pendiente', 'Recibido', 'Pre-Aprobado', 'Incompleto')${fSol.sql.replace(/created_at/g, 's.created_at')}
          ORDER BY s.updated_at DESC NULLS LAST
          LIMIT 6`,
          fSol.params
        ),
        safeRows(
          `SELECT
            e.id_expediente AS id,
            COALESCE(e.codigo_expediente, 'EXP-' || e.id_expediente) AS name,
            'Expediente' AS type,
            TO_CHAR(COALESCE(e.updated_at, e.created_at), 'YYYY-MM-DD') AS date,
            COALESCE(e.estatus, 'Pendiente') AS status,
            CASE WHEN e.estatus = 'Incompleto' THEN 'Alta' ELSE 'Media' END AS priority
          FROM expediente e
          WHERE e.estatus IN ('Incompleto', 'Listo para inspección', 'Listo para aprobación', 'En revisión')${fExp.sql.replace(/created_at/g, 'e.created_at')}
          ORDER BY e.updated_at DESC NULLS LAST
          LIMIT 6`,
          fExp.params
        )
      ]);

      const actividadReciente = [...actSol, ...actExp, ...actIns, ...actCon]
        .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
        .slice(0, 12);

      const pendientesRecientes = [...pendSol, ...pendExp]
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        .slice(0, 10);

      const tasaAprobacion =
        aprobacionesAprobadas + aprobacionesRechazadas > 0
          ? Math.round(
              (aprobacionesAprobadas /
                (aprobacionesAprobadas + aprobacionesRechazadas)) *
                100
            )
          : 0;

      res.json({
        success: true,
        data: {
          periodo,
          resumen: {
            solicitudes,
            expedientes,
            inspecciones,
            aprobaciones,
            contratos,
            desembolsos,
            cuotas,
            usuarios,
            emprendedores,
            inspectores,
            emprendimientos,
            solicitudesPendientes,
            solicitudesPreAprobadas,
            solicitudesIncompletas,
            expedientesIncompletos,
            expedientesListosInspeccion,
            expedientesListosAprobacion,
            inspeccionesPendientes,
            inspeccionesCompletadas,
            aprobacionesAprobadas,
            aprobacionesRechazadas,
            contratosActivos,
            contratosPendientesDesembolso,
            desembolsosPendientes,
            cuotasPendientes,
            cuotasVencidas,
            tasaAprobacion
          },
          solicitudesPorEstatus,
          expedientesPorEstatus,
          inspeccionesPorEstatus,
          aprobacionesPorEstatus,
          contratosPorEstatus,
          solicitudesPorMes,
          expedientesPorMes,
          usuariosPorRol,
          sectorEmprendimientos,
          cuotasPorEstado,
          actividadReciente,
          pendientesRecientes
        }
      });
    } catch (error) {
      console.error('Error métricas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = metricasController;
