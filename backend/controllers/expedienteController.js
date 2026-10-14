const ExpedienteModel = require('../models/expedienteModel');
const SolicitudModel = require('../models/solicitudModel');
const UsuarioModel = require('../models/usuarioModel');

const expedienteController = {

  // GET /api/expediente/aprobadas
  getSolAprobadasExp: async (req, res) => {
    try {
      console.log("📊 Obteniendo solicitudes aprobadas...");
      
      const solicitudes = await ExpedienteModel.getSolAprobadasExp();
      
      console.log(`✅ Encontradas ${solicitudes.length} solicitudes aprobadas`);
      
      if (!solicitudes || solicitudes.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          count: 0,
          message: 'No hay solicitudes aprobadas para mostrar'
        });
      }
      
      const solicitudesFormateadas = solicitudes.map(sol => ({
        id_solicitud: sol.id_solicitud,
        motivo_solicitud: sol.motivo_solicitud,
        monto_solicitado: parseFloat(sol.monto_solicitado),
        fecha_solicitud: sol.fecha_solicitud,
        estatus: sol.estatus,
        
        nombres: sol.nombres,
        apellidos: sol.apellidos,
        nombre_completo: `${sol.nombres || ''} ${sol.apellidos || ''}`.trim(),
        cedula: sol.cedula_persona_numero,
        telefono: sol.telefono,
        direccion: sol.direccion,
        
        id_emprendimiento: sol.id_emprendimiento,
        nombre_emprendimiento: sol.nombre_emprendimiento,
        anos_experiencia: sol.anos_experiencia,
        direccion_emprendimiento: sol.direccion_empredimiento,
        sector: sol.sector,
        actividad: sol.actividad,

        // Inspector asignado en pre-aprobación (cita) o ya en expediente
        id_inspector_asignado: sol.id_inspector_asignado || null,
        inspector_asignado_nombre: (sol.inspector_asignado_nombre || '').trim() || null,
        inspector_asignado_cedula: sol.inspector_asignado_cedula || null,
        
        tiene_expediente: sol.id_expediente ? true : false,
        expediente: sol.id_expediente ? {
          id_expediente: sol.id_expediente,
          codigo_expediente: sol.codigo_expediente,
          estatus_expediente: sol.estatus_expediente,
          fecha_creacion: sol.expediente_creado,
          id_usuario: sol.id_usuario,
          inspector_nombre: sol.inspector_nombre,
          inspector_cedula: sol.inspector_cedula,
          observaciones: sol.observaciones,
          id_requisitos: sol.id_requisitos,
          documentos: (() => {
            try {
              return sol.urls_imagenes ? JSON.parse(sol.urls_imagenes) : {};
            } catch { return {}; }
          })(),
          verificacion_documentos: (() => {
            try {
              return sol.verificacion_documentos
                ? JSON.parse(sol.verificacion_documentos)
                : {};
            } catch { return {}; }
          })()
        } : null
      }));
      
      res.status(200).json({
        success: true,
        data: solicitudesFormateadas,
        count: solicitudesFormateadas.length,
        message: 'Solicitudes aprobadas obtenidas exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error en getSolAprobadasExp:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al obtener solicitudes aprobadas',
        details: error.message
      });
    }
  },

  // POST /api/expediente
  create: async (req, res) => {
    try {
      const {
        id_solicitud,
        id_usuario,
        id_requisitos,
        codigo_expediente,
        estatus,
        observaciones,
        urls_imagenes,
        verificacion_documentos
      } = req.body;

      console.log("📋 Datos recibidos para crear expediente:", {
        id_solicitud,
        id_usuario,
        codigo_expediente,
        estatus,
        observaciones: observaciones?.substring(0, 50) + '...',
        urls_imagenes_recibidas: urls_imagenes ? '✅ Sí' : '❌ No'
      });

      // Validaciones
      if (!id_solicitud) {
        return res.status(400).json({ 
          success: false, 
          error: 'El ID de la solicitud es requerido' 
        });
      }
      
      if (!id_usuario) {
        return res.status(400).json({ 
          success: false, 
          error: 'El inspector asignado (id_usuario) es requerido' 
        });
      }
      
      if (!codigo_expediente) {
        return res.status(400).json({ 
          success: false, 
          error: 'El código de expediente es requerido' 
        });
      }
      
      if (!estatus) {
        return res.status(400).json({ 
          success: false, 
          error: 'El estatus es requerido' 
        });
      }

      // ✅ Verificar que la solicitud existe y está aprobada
      const solicitud = await SolicitudModel.getById(id_solicitud);
      
      if (!solicitud) {
        return res.status(404).json({ 
          success: false, 
          error: `No existe la solicitud con ID: ${id_solicitud}` 
        });
      }

      console.log("✅ Solicitud encontrada:", {
        id: solicitud.id_solicitud,
        estatus: solicitud.estatus
      });

      // Verificar que la solicitud esté en estado correcto
      if (!['Recibido', 'Pre-Aprobado', 'Aprobado', 'Incompleto'].includes(solicitud.estatus)) {
        return res.status(400).json({ 
          success: false, 
          error: `La solicitud debe estar Recibida o Incompleta. Estado actual: ${solicitud.estatus}` 
        });
      }

      // ✅ Verificar que el usuario (inspector) existe
      const usuario = await UsuarioModel.getById(id_usuario);
      
      if (!usuario) {
        return res.status(404).json({ 
          success: false, 
          error: `No existe el usuario/inspector con ID: ${id_usuario}` 
        });
      }

      console.log("✅ Inspector encontrado:", {
        id: usuario.id,
        nombre: `${usuario.nombres} ${usuario.apellidos}`,
        rol: usuario.nombre_rol
      });

      // Verificar que no exista expediente previo
      const existeExpediente = await ExpedienteModel.existsBySolicitud(id_solicitud);
      if (existeExpediente) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ya existe un expediente para esta solicitud' 
        });
      }

      // ✅ Procesar las URLs de imágenes
      let urlsImagenesJSON = null;
      if (urls_imagenes) {
        try {
          urlsImagenesJSON = typeof urls_imagenes === 'string' 
            ? JSON.parse(urls_imagenes) 
            : urls_imagenes;
          
          console.log("📸 URLs de ImgBB procesadas:", 
            Object.keys(urlsImagenesJSON).map(key => 
              `${key}: ${urlsImagenesJSON[key].length} imágenes`
            )
          );
        } catch (parseError) {
          console.error('❌ Error parseando urls_imagenes:', parseError);
          return res.status(400).json({
            success: false,
            error: 'Formato inválido de urls_imagenes'
          });
        }
      }

      let verificacion = verificacion_documentos;
      if (typeof verificacion === 'string') {
        try {
          verificacion = JSON.parse(verificacion);
        } catch {
          return res.status(400).json({
            success: false,
            error: 'Formato inválido de verificacion_documentos'
          });
        }
      }
      if (!verificacion || typeof verificacion !== 'object' ||
          Object.keys(verificacion).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debe marcar cada requisito como OK o Vencido'
        });
      }

      // Construir el objeto de datos
      const expedienteData = {
        id_solicitud: parseInt(id_solicitud),
        id_usuario: parseInt(id_usuario),
        ids_requisitos: Array.isArray(id_requisitos)
          ? id_requisitos
          : Object.keys(verificacion),
        observaciones: observaciones || 'Sin observaciones iniciales',
        codigo_expediente,
        estatus: estatus || 'En revisión',
        urls_imagenes: urlsImagenesJSON,
        verificacion_documentos: verificacion
      };

      console.log("📤 Creando expediente...");

      // Crear el expediente
      const nuevoExpediente = await ExpedienteModel.create(expedienteData);

      const msg = nuevoExpediente.resultado === 'pasa_inspeccion'
        ? 'Documentación OK. Expediente creado y enviado a inspección.'
        : 'Hay requisitos vencidos o no válidos. Solicitud marcada como Incompleta.';

      res.status(201).json({
        success: true,
        message: msg,
        data: nuevoExpediente
      });
      
    } catch (error) {
      console.error('❌ Error en create expediente:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Error interno del servidor al crear expediente'
      });
    }
  },

  // PUT /api/expediente/:id/verificar — re-verificar documentación incompleta
  verificar: async (req, res) => {
    try {
      const { id } = req.params;
      let {
        urls_imagenes,
        verificacion_documentos,
        observaciones,
        id_usuario
      } = req.body;

      if (typeof verificacion_documentos === 'string') {
        try {
          verificacion_documentos = JSON.parse(verificacion_documentos);
        } catch {
          return res.status(400).json({
            success: false,
            error: 'Formato inválido de verificacion_documentos'
          });
        }
      }
      if (!verificacion_documentos || typeof verificacion_documentos !== 'object' ||
          Object.keys(verificacion_documentos).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debe marcar cada requisito como OK o Vencido'
        });
      }

      let urls = urls_imagenes;
      if (typeof urls === 'string') {
        try { urls = JSON.parse(urls); } catch { urls = {}; }
      }

      const result = await ExpedienteModel.verificarDocumentos(id, {
        urls_imagenes: urls || {},
        verificacion_documentos,
        observaciones,
        id_usuario: id_usuario ? parseInt(id_usuario, 10) : null
      });

      const msg = result.resultado === 'pasa_inspeccion'
        ? 'Documentación OK. Expediente enviado a inspección.'
        : 'Siguen requisitos vencidos o no válidos. Solicitud permanece Incompleta.';

      res.status(200).json({ success: true, message: msg, data: result });
    } catch (error) {
      console.error('❌ Error en verificar expediente:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al verificar documentación'
      });
    }
  }
};

module.exports = expedienteController;