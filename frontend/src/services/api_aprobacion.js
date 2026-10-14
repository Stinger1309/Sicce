import api from './api_principal';

const aprobacionAPI = {
  // Obtener todos los expedientes
  getAll: async () => {
    try {
      const response = await api.get('/aprobacion/expedientes');
      console.log('Respuesta de expedientes:', response);
      
      if (response.data && response.data.success) {
        return { 
          success: true, 
          data: response.data.data || [] 
        };
      }
      
      return { 
        success: false, 
        error: 'Formato de respuesta inesperado' 
      };
    } catch (error) {
      console.error('Error en getAll expedientes:', error);
      
      let errorMessage = 'Error al obtener los expedientes';
      
      if (error.response) {
        // El servidor respondió con un error
        errorMessage = error.response.data?.error || error.response.statusText;
      } else if (error.request) {
        // La solicitud fue hecha pero no hubo respuesta
        errorMessage = 'No se pudo conectar con el servidor';
      } else {
        // Error al configurar la solicitud
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  },

  // Obtener expediente por ID
  getById: async (id) => {
    try {
      if (!id) {
        return { 
          success: false, 
          error: 'ID de expediente requerido' 
        };
      }
      
      const response = await api.get(`/aprobacion/expediente/${id}`);
      
      if (response.data && response.data.success) {
        return { 
          success: true, 
          data: response.data.data 
        };
      }
      
      return { 
        success: false, 
        error: 'Formato de respuesta inesperado' 
      };
    } catch (error) {
      console.error('Error en getById expediente:', error);
      
      let errorMessage = 'Error al obtener el expediente';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'Expediente no encontrado';
        } else {
          errorMessage = error.response.data?.error || error.response.statusText;
        }
      } else if (error.request) {
        errorMessage = 'No se pudo conectar con el servidor';
      } else {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  },

  // Obtener estadísticas
  getStats: async () => {
    try {
      const response = await api.get('/aprobacion/expedientes/stats');
      
      if (response.data && response.data.success) {
        return { 
          success: true, 
          data: response.data.data 
        };
      }
      
      return { 
        success: false, 
        error: 'Formato de respuesta inesperado' 
      };
    } catch (error) {
      console.error('Error en getStats:', error);
      
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al obtener estadísticas' 
      };
    }
  },

  // Verificar requisitos del expediente
  // Verificar requisitos del expediente
verificarRequisitos: async (idExpediente, datosVerificacion) => {
  try {
    if (!idExpediente) {
      return { 
        success: false, 
        error: 'ID de expediente requerido' 
      };
    }
    
    if (!datosVerificacion || !datosVerificacion.requisitos) {
      return { 
        success: false, 
        error: 'Datos de verificación requeridos' 
      };
    }
    
    if (!Array.isArray(datosVerificacion.requisitos)) {
      return { 
        success: false, 
        error: 'Los requisitos deben ser un arreglo' 
      };
    }
    
    // Preparar datos para enviar - INCLUIR TODOS LOS CAMPOS
    const payload = {
      id_expediente: idExpediente,
      requisitos: datosVerificacion.requisitos.map(req => ({
        id_requisito: req.id_requisito,
        nombre: req.nombre,
        verificado: req.verificado === true,  // Asegurar que sea booleano
        estado_verificacion: req.estado_verificacion || (req.verificado ? 'verificado' : 'pendiente'),
        observacion_no_valido: req.observacion_no_valido || null
      })),
      observaciones: datosVerificacion.observaciones || '',
      seleccion_manejo: datosVerificacion.seleccion_manejo || null,
      id_inspeccion: datosVerificacion.id_inspeccion || null,
      estatus_aprobacion: datosVerificacion.estatus_aprobacion || null,  // ← AÑADIR
      estatus_inspeccion: datosVerificacion.estatus_inspeccion || null,   // ← AÑADIR
       // 👇 ADD THIS LINE - Include the cedula_persona_id
      cedula_persona_id: datosVerificacion.cedula_persona_id || null,
      id_persona_banco: datosVerificacion.id_persona_banco || null
    };
    
    console.log('Enviando verificación al backend:', payload);
    
    const response = await api.post('/aprobacion/verificar-requisitos', payload);
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message,
        id_credito_banco: response.data.id_credito_banco || response.data.data?.id_credito_banco || null,
        descargar_aval: Boolean(
          response.data.descargar_aval ||
          response.data.data?.descargar_aval ||
          response.data.id_credito_banco ||
          response.data.data?.id_credito_banco
        ),
      };
    }
    
    return { 
      success: false, 
      error: response.data?.error || 'Error al verificar requisitos' 
    };
  } catch (error) {
    console.error('Error en verificarRequisitos:', error);
    
    let errorMessage = 'Error al verificar requisitos';
    
    if (error.response) {
      errorMessage = error.response.data?.error || error.response.statusText;
    } else if (error.request) {
      errorMessage = 'No se pudo conectar con el servidor';
    } else {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
} 
};

export default aprobacionAPI;