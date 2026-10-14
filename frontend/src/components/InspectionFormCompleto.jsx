// frontend/src/components/InspectionFormCompleto.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Save, ClipboardCheck, Building, User, Calendar, Clock, 
  FileText, Home, Phone, Zap, Trash2, Plus, ShoppingBag, 
  Package, Users, AlertCircle, CheckCircle
} from 'lucide-react';
import inspeccionAPI from '../services/api_inspeccion';
import usuarioAPI from '../services/api_usuario';

const productoVacio = () => ({
  descripcion: '',
  unidad_medida: '',
  costo_produccion: 0,
  cantidad: 0
});

const obtenerNombreInspector = () => {
  const user = usuarioAPI.getCurrentUser();
  if (!user) return '';
  return (
    user.nombre_completo ||
    [user.nombres, user.apellidos].filter(Boolean).join(' ').trim() ||
    user.name ||
    ''
  );
};

const mapProductoApi = (p = {}) => ({
  descripcion: p.descripcion || p.descripcion_producto || '',
  unidad_medida: p.unidad_medida || '',
  costo_produccion: parseFloat(p.costo_produccion ?? p.costo_produccion_usd) || 0,
  cantidad: parseFloat(p.cantidad) || 0
});

const mapVentaApi = (v = {}) => ({
  descripcion: v.descripcion || v.descripcion_producto || '',
  unidad_medida: v.unidad_medida || '',
  cantidad: parseFloat(v.cantidad) || 0,
  precio_venta: parseFloat(v.precio_venta ?? v.precio_venta_usd) || 0
});

const mapMateriaPrimaApi = (m = {}) => ({
  descripcion: m.descripcion || '',
  unidad_medida: m.unidad_medida || '',
  cantidad: parseFloat(m.cantidad) || 0,
  precio_compra: parseFloat(m.precio_compra ?? m.precio_compra_usd) || 0
});

const InspectionFormCompleto = ({ 
  isOpen, 
  onClose, 
  onSave,
  inspeccionId = null,
  expedienteData = {},
  sector = 'industria_comercio',
  darkMode = false,
  readOnly = false,
  inspectorNombre = null
}) => {
  const [activeSection, setActiveSection] = useState('estudioMercado');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // Estado inicial del formulario (SIN identificacion)
  const initialState = {
    // Estudio de Mercado
    estudioMercado: {
      id_estudio: null,
      descripcion_producto: '',
      descripcion_proceso: '',
      usuarios: '',
      // Una fila visible por defecto para que no falle la validación por no pulsar "Agregar"
      productos: [productoVacio()],
      ventas: [],
      materia_prima: []
    },
    
    // Aspectos Técnicos
    aspectosTecnicos: {
      id_tecnico: null,
      descripcion_local: '',
      tenencia_local: 'propio',
      maquinaria_existente: [],
      maquinaria_solicitada: [],
      recurso_humano_empleados: {
        cantidad: 0,
        salario_mensual_usd: 0
      },
      recurso_humano_obreros: {
        cantidad: 0,
        salario_mensual_usd: 0
      },
      servicios_basicos: {
        id_servicio: null,
        electricidad: false,
        agua: false,
        telefono: false,
        aseo_urbano: false,
        cloacas: false,
        gas: false
      }
    },
    
    // Gastos Mensuales
    gastosMensuales: {
      mano_obra: { id_gasto: null, actual: 0, futuro: 0 },
      materia_prima: { id_gasto: null, actual: 0, futuro: 0 },
      servicios_basicos: { id_gasto: null, actual: 0, futuro: 0 },
      alquiler: { id_gasto: null, actual: 0, futuro: 0 },
      otros: { id_gasto: null, actual: 0, futuro: 0 }
    },
    
    // Plan de Inversión
    planInversion: {
      construccion: { id_plan: null, aportes_propios: 0, monto_solicitado: 0 },
      maquinaria_equipo: { id_plan: null, aportes_propios: 0, monto_solicitado: 0 },
      materia_prima: { id_plan: null, aportes_propios: 0, monto_solicitado: 0 },
      mano_obra: { id_plan: null, aportes_propios: 0, monto_solicitado: 0 },
      otros_gastos: { id_plan: null, aportes_propios: 0, monto_solicitado: 0 }
    },
    
    // Organización y Comunidad
    organizacionComunidad: {
      id_organizacion: null,
      tipo_organizacion: '',
      necesidades_comunidad: '',
      realiza_aporte: false,
      aporte_descripcion: '',
      garantia_ofrecida: 'fianza'
    },
    
    // Evaluación Final
    evaluacionFinal: {
      observaciones_generales: '',
      recomendaciones: '',
      calificacion: 0,
      estatus: 'Pendiente',
      fecha_inspeccion: new Date().toISOString().split('T')[0],
      duracion_minutos: '',
      inspector: inspectorNombre || obtenerNombreInspector()
    }
  };

  const [formData, setFormData] = useState(initialState);

  // Cargar inspección existente y/o autocompletar inspector
  useEffect(() => {
    if (!isOpen) return;

    if (inspeccionId) {
      cargarInspeccionExistente();
    } else {
      const nombre = inspectorNombre || obtenerNombreInspector();
      setFormData((prev) => ({
        ...prev,
        evaluacionFinal: {
          ...prev.evaluacionFinal,
          inspector: prev.evaluacionFinal.inspector || nombre
        }
      }));
    }
  }, [isOpen, inspeccionId, inspectorNombre]);

  const cargarInspeccionExistente = async () => {
    try {
      setLoading(true);
      // getById no trae estudio_mercado/productos; usar full
      let response;
      try {
        response = await inspeccionAPI.getFullData(inspeccionId);
      } catch {
        response = await inspeccionAPI.getById(inspeccionId);
      }
      const nombreInspectorActual = inspectorNombre || obtenerNombreInspector();

      if (response.success && response.data) {
        const data = response.data;
        
        // Procesar resultados_inspeccion si existe (formato camelCase del front)
        if (data.resultados_inspeccion) {
          const resultados = typeof data.resultados_inspeccion === 'string' 
            ? JSON.parse(data.resultados_inspeccion) 
            : data.resultados_inspeccion;
          
          const productosCargados = (resultados.estudioMercado?.productos || []).map(mapProductoApi);
          
          setFormData(prev => ({
            ...prev,
            estudioMercado: {
              ...prev.estudioMercado,
              ...(resultados.estudioMercado || {}),
              productos: productosCargados.length > 0 ? productosCargados : [productoVacio()],
              ventas: (resultados.estudioMercado?.ventas || []).map(mapVentaApi),
              materia_prima: (resultados.estudioMercado?.materia_prima || []).map(mapMateriaPrimaApi)
            },
            aspectosTecnicos: resultados.aspectosTecnicos || prev.aspectosTecnicos,
            gastosMensuales: resultados.gastosMensuales || prev.gastosMensuales,
            planInversion: resultados.planInversion || prev.planInversion,
            organizacionComunidad: resultados.organizacionComunidad || prev.organizacionComunidad,
            evaluacionFinal: {
              ...prev.evaluacionFinal,
              ...resultados.evaluacionFinal,
              observaciones_generales: data.observaciones || resultados.evaluacionFinal?.observaciones_generales || '',
              recomendaciones: data.recomendaciones || resultados.evaluacionFinal?.recomendaciones || '',
              calificacion: data.calificacion || 0,
              estatus: data.estatus_inspeccion || 'Pendiente',
              duracion_minutos: data.duracion || '',
              inspector: data.inspector || resultados.evaluacionFinal?.inspector || nombreInspectorActual
            }
          }));
          return;
        }

        // Formato API (snake_case / tablas relacionadas)
        if (data.estudio_mercado) {
          const em = data.estudio_mercado;
          const productosCargados = (em.productos || []).map(mapProductoApi);

          setFormData(prev => ({
            ...prev,
            estudioMercado: {
              ...prev.estudioMercado,
              id_estudio: em.id_estudio || null,
              descripcion_producto: em.descripcion_producto || '',
              descripcion_proceso: em.descripcion_proceso || '',
              usuarios: em.usuarios || '',
              productos: productosCargados.length > 0 ? productosCargados : [productoVacio()],
              ventas: (em.ventas || []).map(mapVentaApi),
              materia_prima: (em.materia_prima || []).map(mapMateriaPrimaApi)
            },
            evaluacionFinal: {
              ...prev.evaluacionFinal,
              observaciones_generales: data.observaciones || '',
              recomendaciones: data.recomendaciones || '',
              calificacion: data.calificacion || 0,
              estatus: data.estatus_inspeccion || 'Pendiente',
              duracion_minutos: data.duracion || '',
              inspector: data.inspector || nombreInspectorActual
            }
          }));
          return;
        }

        // Sin datos previos: solo autocompletar inspector
        setFormData(prev => ({
          ...prev,
          evaluacionFinal: {
            ...prev.evaluacionFinal,
            inspector: prev.evaluacionFinal.inspector || nombreInspectorActual
          }
        }));
      }
    } catch (error) {
      console.error('Error al cargar inspección:', error);
      setError('No se pudo cargar la inspección');
    } finally {
      setLoading(false);
    }
  };

  // Manejadores de cambio
  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedChange = (section, subsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  // Funciones para arrays dinámicos
  const addArrayItem = (section, subsection, defaultItem) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: [...prev[section][subsection], defaultItem]
      }
    }));
  };

  const updateArrayItem = (section, subsection, index, field, value) => {
    setFormData(prev => {
      const newArray = [...prev[section][subsection]];
      newArray[index] = { ...newArray[index], [field]: value };
      return {
        ...prev,
        [section]: { ...prev[section], [subsection]: newArray }
      };
    });
  };

  const removeArrayItem = (section, subsection, index) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: prev[section][subsection].filter((_, i) => i !== index)
      }
    }));
  };

  // Preparar datos para envío
  const prepararDatosEnvio = () => {
    return {
      id_inspeccion: inspeccionId,
      id_codigo_exp: expedienteData?.id_expediente,
      id_tipo_insp_clas: 1,
      
      // Estudio de Mercado
      estudio_mercado: {
        descripcion_producto: formData.estudioMercado.descripcion_producto,
        descripcion_proceso: formData.estudioMercado.descripcion_proceso,
        usuarios: formData.estudioMercado.usuarios,
        productos: formData.estudioMercado.productos
          .filter(p => (p.descripcion || '').trim())
          .map(p => ({
          descripcion: p.descripcion || '',
          unidad_medida: p.unidad_medida || '',
          costo_produccion_usd: parseFloat(p.costo_produccion) || 0,
          cantidad: parseFloat(p.cantidad) || 0
        })),
        ventas: formData.estudioMercado.ventas
          .filter(v => (v.descripcion || '').trim())
          .map(v => ({
          descripcion: v.descripcion || '',
          unidad_medida: v.unidad_medida || '',
          cantidad: parseFloat(v.cantidad) || 0,
          precio_venta_usd: parseFloat(v.precio_venta) || 0
        })),
        materia_prima: formData.estudioMercado.materia_prima
          .filter(m => (m.descripcion || '').trim())
          .map(m => ({
          descripcion: m.descripcion || '',
          unidad_medida: m.unidad_medida || '',
          cantidad: parseFloat(m.cantidad) || 0,
          precio_compra_usd: parseFloat(m.precio_compra) || 0
        }))
      },
      
      // Aspectos Técnicos
      aspectos_tecnicos: {
        descripcion_local: formData.aspectosTecnicos.descripcion_local,
        tenencia_local: formData.aspectosTecnicos.tenencia_local || 'propio',
        maquinaria_existente: formData.aspectosTecnicos.maquinaria_existente.map(m => ({
          cantidad: parseInt(m.cantidad) || 1,
          descripcion: m.descripcion || '',
          precio_unitario_usd: parseFloat(m.precio_unitario_usd) || 0,
          total_usd: parseFloat(m.total_usd) || 0
        })),
        maquinaria_solicitada: formData.aspectosTecnicos.maquinaria_solicitada.map(m => ({
          cantidad: parseInt(m.cantidad) || 1,
          descripcion: m.descripcion || '',
          precio_unitario_usd: parseFloat(m.precio_unitario_usd) || 0,
          total_usd: parseFloat(m.total_usd) || 0
        })),
        recurso_humano: [
          {
            tipo_trabajador: 'EMPLEADOS',
            cantidad: parseInt(formData.aspectosTecnicos.recurso_humano_empleados.cantidad) || 0,
            salario_mensual_usd: parseFloat(formData.aspectosTecnicos.recurso_humano_empleados.salario_mensual_usd) || 0
          },
          {
            tipo_trabajador: 'OBREROS',
            cantidad: parseInt(formData.aspectosTecnicos.recurso_humano_obreros.cantidad) || 0,
            salario_mensual_usd: parseFloat(formData.aspectosTecnicos.recurso_humano_obreros.salario_mensual_usd) || 0
          }
        ],
        servicios_basicos: formData.aspectosTecnicos.servicios_basicos
      },
      
      // Gastos Mensuales
      gastos_mensuales: Object.entries(formData.gastosMensuales).map(([concepto, valores]) => ({
        concepto: concepto.replace(/_/g, ' ').toUpperCase(),
        monto_actual_usd: parseFloat(valores.actual) || 0,
        monto_futuro_usd: parseFloat(valores.futuro) || 0
      })),
      
      // Plan de Inversión
      plan_inversion: Object.entries(formData.planInversion).map(([concepto, valores]) => ({
        concepto: concepto.replace(/_/g, ' ').toUpperCase(),
        aportes_propios_usd: parseFloat(valores.aportes_propios) || 0,
        monto_solicitado_usd: parseFloat(valores.monto_solicitado) || 0
      })),
      
      // Organización y Comunidad
      organizacion_comunidad: {
        tipo_organizacion: formData.organizacionComunidad.tipo_organizacion || '',
        necesidades_comunidad: formData.organizacionComunidad.necesidades_comunidad || '',
        realiza_aporte: formData.organizacionComunidad.realiza_aporte || false,
        descripcion_aporte: formData.organizacionComunidad.aporte_descripcion || '',
        garantia_ofrecida: formData.organizacionComunidad.garantia_ofrecida || 'FIANZA'
      },
      
      // Evaluación Final
      evaluacion_final: {
        observaciones_generales: formData.evaluacionFinal.observaciones_generales || '',
        recomendaciones: formData.evaluacionFinal.recomendaciones || '',
        calificacion: formData.evaluacionFinal.calificacion || 0,
        estatus: formData.evaluacionFinal.estatus || 'Pendiente',
        fecha_inspeccion: formData.evaluacionFinal.fecha_inspeccion || new Date().toISOString().split('T')[0],
        duracion_minutos: formData.evaluacionFinal.duracion_minutos || '',
        inspector: formData.evaluacionFinal.inspector || inspectorNombre || obtenerNombreInspector() || ''
      }
    };
  };

  // Validar formulario
  const validarFormulario = () => {
    const errores = [];
    
    if (sector !== 'agricola') {
      if (!formData.estudioMercado.descripcion_producto?.trim()) {
        errores.push('Descripción del producto requerida');
      }
      const productosConDatos = (formData.estudioMercado.productos || []).filter(
        (p) => (p.descripcion || '').trim()
      );
      if (productosConDatos.length === 0) {
        errores.push(
          'Debe completar al menos un producto en Producción Mensual (descripción del ítem)'
        );
      }
    }
    
    if (!formData.evaluacionFinal.fecha_inspeccion) errores.push('Fecha de inspección requerida');
    
    return errores;
  };

  // Calcular calificación
  const calcularCalificacion = () => {
    let puntaje = 0;
    let maxPuntaje = 0;
    
    if (sector === 'industria_comercio') {
      if (formData.estudioMercado?.descripcion_producto) puntaje += 5;
      maxPuntaje += 5;
      if (formData.estudioMercado?.usuarios) puntaje += 5;
      maxPuntaje += 5;
      if (formData.estudioMercado?.productos?.length > 0) puntaje += 5;
      maxPuntaje += 5;
      if (formData.aspectosTecnicos?.descripcion_local) puntaje += 5;
      maxPuntaje += 5;
    }
    
    if (formData.organizacionComunidad?.tipo_organizacion) puntaje += 5;
    maxPuntaje += 5;
    if (formData.organizacionComunidad?.realiza_aporte) puntaje += 5;
    maxPuntaje += 5;
    
    if (maxPuntaje === 0) return 0;
    
    const porcentaje = (puntaje / maxPuntaje) * 100;
    return Math.round((porcentaje / 20) * 10) / 10;
  };

  const determinarEstatus = (calificacion) => {
    if (calificacion >= 4) return 'Aprobado';
    if (calificacion >= 3) return 'Aprobado con observaciones';
    return 'Rechazado';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errores = validarFormulario();
    if (errores.length > 0) {
      setError(errores.join('\n'));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const datosEnvio = prepararDatosEnvio();
      const calificacion = calcularCalificacion();
      const estatus = determinarEstatus(calificacion);
      
      datosEnvio.evaluacion_final.calificacion = calificacion;
      datosEnvio.evaluacion_final.estatus = estatus;
      
      // 🔍 VERIFICACIÓN
      console.log('🟢 ENVIANDO DATOS:', {
        id_inspeccion: inspeccionId,
        accion: inspeccionId ? 'ACTUALIZAR' : 'CREAR',
        ruta: inspeccionId ? `PUT /inspeccion/${inspeccionId}/full` : 'POST /inspeccion/full'
      });
      
      let response;
      
      if (inspeccionId) {
        datosEnvio.id_inspeccion = inspeccionId;
        datosEnvio.id_codigo_exp = datosEnvio.id_codigo_exp || expedienteData?.id_expediente;
        
        console.log('🟢 LLAMANDO A: updateFullInspection', { id: inspeccionId });
        response = await inspeccionAPI.updateFullInspection(inspeccionId, datosEnvio);
        console.log('🟢 RESPUESTA:', response);
      } else {
        console.log('🟢 CREANDO NUEVA INSPECCIÓN...');
        
        const createResponse = await inspeccionAPI.create({
          id_codigo_exp: expedienteData.id_expediente,
          id_tipo_insp_clas: 1,
          estatus_inspeccion: 'Pendiente'
        });
        
        console.log('🟢 INSPECCIÓN CREADA:', createResponse);
        
        if (createResponse.success) {
          const newId = createResponse.data.id_inspeccion;
          datosEnvio.id_inspeccion = newId;
          datosEnvio.id_codigo_exp = expedienteData.id_expediente;
          
          console.log('🟢 GUARDANDO RESULTADOS PARA ID:', newId);
          response = await inspeccionAPI.saveFullInspection(datosEnvio);
          console.log('🟢 RESPUESTA:', response);
        }
      }
      
      if (response?.success) {
        setSuccessMessage('Inspección guardada exitosamente');
        setTimeout(async () => {
          try {
            if (onSave) await onSave(datosEnvio);
          } finally {
            onClose();
          }
        }, 800);
      }
    } catch (error) {
      console.error('🔴 Error al guardar inspección:', error);
      setError(error.response?.data?.error || error.error || 'Error al guardar la inspección');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Determinar secciones según sector (SIN identificacion)
  const sections = sector === 'agricola' 
    ? ['agricola', 'organizacionComunidad', 'evaluacionFinal']
    : ['estudioMercado', 'aspectosTecnicos', 'gastosMensuales', 'planInversion', 'organizacionComunidad', 'evaluacionFinal'];

  const sectionTitles = {
    estudioMercado: '1. Estudio de Mercado',
    aspectosTecnicos: '2. Aspectos Técnicos',
    gastosMensuales: '3. Gastos Mensuales',
    planInversion: '4. Plan de Inversión',
    organizacionComunidad: '5. Organización y Comunidad',
    agricola: 'Información Agrícola',
    evaluacionFinal: 'Evaluación Final'
  };

  // Estilos comunes
  const inputClass = `w-full px-3 py-2 rounded-lg border ${
    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900'
  } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${readOnly ? 'opacity-75 cursor-not-allowed' : ''}`;

  const labelClass = `block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
          onClick={onClose}
        />
        
        <div className={`relative rounded-lg shadow-xl max-w-6xl w-full ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Header */}
          <div className={`px-6 py-4 border-b flex items-center justify-between ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <ClipboardCheck className="text-[#2A9D8F]" size={28} />
              <div>
                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {inspeccionId ? 'Editar Inspección Técnica' : 'Nueva Inspección Técnica'}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Sector: {sector === 'agricola' ? 'Agrícola' : 'Industria y Comercio'}
                  {expedienteData?.nombre_emprendimiento && ` - ${expedienteData.nombre_emprendimiento}`}
                  {expedienteData?.codigo_expediente && ` | Exp: ${expedienteData.codigo_expediente}`}
                  {inspeccionId && ` | ID Inspección: ${inspeccionId}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
              type="button"
            >
              <X size={24} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
            </button>
          </div>

          {/* Mensajes de estado */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span className="text-sm whitespace-pre-line">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X size={16} />
              </button>
            </div>
          )}
          
          {successMessage && (
            <div className="mx-6 mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle size={20} />
              <span className="text-sm">{successMessage}</span>
            </div>
          )}

          {/* Navegación por pestañas */}
          <div className={`px-6 pt-4 border-b overflow-x-auto ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex gap-1">
              {sections.map(section => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                    activeSection === section
                      ? `text-[#2A9D8F] border-b-2 border-[#2A9D8F] ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`
                      : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {sectionTitles[section]}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido del formulario */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
              
              {/* SECCIÓN: Estudio de Mercado */}
              {activeSection === 'estudioMercado' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Descripción del Producto o Servicio</label>
                    <textarea rows="3" value={formData.estudioMercado.descripcion_producto}
                      onChange={(e) => handleInputChange('estudioMercado', 'descripcion_producto', e.target.value)}
                      className={inputClass} required readOnly={readOnly} />
                  </div>
                  <div>
                    <label className={labelClass}>Descripción del Proceso Productivo</label>
                    <textarea rows="3" value={formData.estudioMercado.descripcion_proceso}
                      onChange={(e) => handleInputChange('estudioMercado', 'descripcion_proceso', e.target.value)}
                      className={inputClass} readOnly={readOnly} />
                  </div>
                  <div>
                    <label className={labelClass}>Usuarios del Producto</label>
                    <textarea rows="2" value={formData.estudioMercado.usuarios}
                      onChange={(e) => handleInputChange('estudioMercado', 'usuarios', e.target.value)}
                      className={inputClass} readOnly={readOnly} />
                  </div>

                  {/* Producción Mensual */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        <Package size={18} className="inline mr-2" />Producción Mensual
                      </h4>
                      {!readOnly && (
                        <button type="button" 
                          onClick={() => addArrayItem('estudioMercado', 'productos', productoVacio())}
                          className="px-3 py-1 text-sm bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] flex items-center gap-1">
                          <Plus size={16} /> Agregar
                        </button>
                      )}
                    </div>
                    <p className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Complete al menos un ítem con su descripción (además de la descripción general del producto).
                    </p>
                    
                    {formData.estudioMercado.productos.map((producto, idx) => (
                      <div key={idx} className={`mb-3 p-3 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-white'} relative`}>
                        {!readOnly && (
                          <button type="button" onClick={() => removeArrayItem('estudioMercado', 'productos', idx)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <input type="text" placeholder="Descripción" value={producto.descripcion}
                            onChange={(e) => updateArrayItem('estudioMercado', 'productos', idx, 'descripcion', e.target.value)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="text" placeholder="Unidad" value={producto.unidad_medida}
                            onChange={(e) => updateArrayItem('estudioMercado', 'productos', idx, 'unidad_medida', e.target.value)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="number" placeholder="Cantidad" value={producto.cantidad || ''}
                            onChange={(e) => updateArrayItem('estudioMercado', 'productos', idx, 'cantidad', parseFloat(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="number" placeholder="Costo USD" value={producto.costo_produccion || ''}
                            onChange={(e) => updateArrayItem('estudioMercado', 'productos', idx, 'costo_produccion', parseFloat(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Ventas Estimadas */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        <ShoppingBag size={18} className="inline mr-2" />Ventas Estimadas
                      </h4>
                      {!readOnly && (
                        <button type="button"
                          onClick={() => addArrayItem('estudioMercado', 'ventas', {
                            descripcion: '', unidad_medida: '', cantidad: 0, precio_venta: 0
                          })}
                          className="px-3 py-1 text-sm bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] flex items-center gap-1">
                          <Plus size={16} /> Agregar
                        </button>
                      )}
                    </div>
                    
                    {formData.estudioMercado.ventas.map((venta, idx) => (
                      <div key={idx} className={`mb-3 p-3 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-white'} relative`}>
                        {!readOnly && (
                          <button type="button" onClick={() => removeArrayItem('estudioMercado', 'ventas', idx)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <input type="text" placeholder="Descripción" value={venta.descripcion}
                            onChange={(e) => updateArrayItem('estudioMercado', 'ventas', idx, 'descripcion', e.target.value)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="text" placeholder="Unidad" value={venta.unidad_medida}
                            onChange={(e) => updateArrayItem('estudioMercado', 'ventas', idx, 'unidad_medida', e.target.value)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="number" placeholder="Cantidad" value={venta.cantidad || ''}
                            onChange={(e) => updateArrayItem('estudioMercado', 'ventas', idx, 'cantidad', parseFloat(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="number" placeholder="Precio USD" value={venta.precio_venta || ''}
                            onChange={(e) => updateArrayItem('estudioMercado', 'ventas', idx, 'precio_venta', parseFloat(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Materia Prima */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        <Package size={18} className="inline mr-2" />Materia Prima
                      </h4>
                      {!readOnly && (
                        <button type="button"
                          onClick={() => addArrayItem('estudioMercado', 'materia_prima', {
                            descripcion: '', unidad_medida: '', cantidad: 0, precio_compra: 0
                          })}
                          className="px-3 py-1 text-sm bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] flex items-center gap-1">
                          <Plus size={16} /> Agregar
                        </button>
                      )}
                    </div>
                    
                    {formData.estudioMercado.materia_prima.map((mp, idx) => (
                      <div key={idx} className={`mb-3 p-3 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-white'} relative`}>
                        {!readOnly && (
                          <button type="button" onClick={() => removeArrayItem('estudioMercado', 'materia_prima', idx)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <input type="text" placeholder="Descripción" value={mp.descripcion}
                            onChange={(e) => updateArrayItem('estudioMercado', 'materia_prima', idx, 'descripcion', e.target.value)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="text" placeholder="Unidad" value={mp.unidad_medida}
                            onChange={(e) => updateArrayItem('estudioMercado', 'materia_prima', idx, 'unidad_medida', e.target.value)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="number" placeholder="Cantidad" value={mp.cantidad || ''}
                            onChange={(e) => updateArrayItem('estudioMercado', 'materia_prima', idx, 'cantidad', parseFloat(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="number" placeholder="Precio compra USD" value={mp.precio_compra || ''}
                            onChange={(e) => updateArrayItem('estudioMercado', 'materia_prima', idx, 'precio_compra', parseFloat(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECCIÓN: Aspectos Técnicos */}
              {activeSection === 'aspectosTecnicos' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}><Building size={16} className="inline mr-2" />Descripción del Local</label>
                    <textarea rows="3" value={formData.aspectosTecnicos.descripcion_local}
                      onChange={(e) => handleInputChange('aspectosTecnicos', 'descripcion_local', e.target.value)}
                      className={inputClass} readOnly={readOnly} />
                  </div>
                  
                  <div>
                    <label className={labelClass}>Tenencia del Local</label>
                    <div className="flex gap-4">
                      {['propio', 'alquilado', 'otro'].map(tipo => (
                        <label key={tipo} className="flex items-center gap-2">
                          <input type="radio" name="tenencia_local" value={tipo}
                            checked={formData.aspectosTecnicos.tenencia_local === tipo}
                            onChange={(e) => handleInputChange('aspectosTecnicos', 'tenencia_local', e.target.value)}
                            className="text-[#2A9D8F]" disabled={readOnly} />
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{tipo.toUpperCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Maquinaria Existente */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Maquinaria y Equipo Existente
                      </h4>
                      {!readOnly && (
                        <button type="button"
                          onClick={() => addArrayItem('aspectosTecnicos', 'maquinaria_existente', {
                            cantidad: 1, descripcion: '', precio_unitario_usd: 0, total_usd: 0
                          })}
                          className="px-3 py-1 text-sm bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] flex items-center gap-1">
                          <Plus size={16} /> Agregar
                        </button>
                      )}
                    </div>
                    
                    {formData.aspectosTecnicos.maquinaria_existente.map((maq, idx) => (
                      <div key={idx} className={`mb-3 p-3 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-white'} relative`}>
                        {!readOnly && (
                          <button type="button" onClick={() => removeArrayItem('aspectosTecnicos', 'maquinaria_existente', idx)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <input type="number" placeholder="Cantidad" value={maq.cantidad || ''}
                            onChange={(e) => updateArrayItem('aspectosTecnicos', 'maquinaria_existente', idx, 'cantidad', parseInt(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="text" placeholder="Descripción" value={maq.descripcion}
                            onChange={(e) => updateArrayItem('aspectosTecnicos', 'maquinaria_existente', idx, 'descripcion', e.target.value)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="number" placeholder="Precio Unit. USD" value={maq.precio_unitario_usd || ''}
                            onChange={(e) => updateArrayItem('aspectosTecnicos', 'maquinaria_existente', idx, 'precio_unitario_usd', parseFloat(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="number" placeholder="Total USD" value={maq.total_usd || ''}
                            onChange={(e) => updateArrayItem('aspectosTecnicos', 'maquinaria_existente', idx, 'total_usd', parseFloat(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Maquinaria Solicitada */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Maquinaria y Equipo Solicitado
                      </h4>
                      {!readOnly && (
                        <button type="button"
                          onClick={() => addArrayItem('aspectosTecnicos', 'maquinaria_solicitada', {
                            cantidad: 1, descripcion: '', precio_unitario_usd: 0, total_usd: 0
                          })}
                          className="px-3 py-1 text-sm bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] flex items-center gap-1">
                          <Plus size={16} /> Agregar
                        </button>
                      )}
                    </div>
                    
                    {formData.aspectosTecnicos.maquinaria_solicitada.map((maq, idx) => (
                      <div key={idx} className={`mb-3 p-3 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-white'} relative`}>
                        {!readOnly && (
                          <button type="button" onClick={() => removeArrayItem('aspectosTecnicos', 'maquinaria_solicitada', idx)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                          </button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <input type="number" placeholder="Cantidad" value={maq.cantidad || ''}
                            onChange={(e) => updateArrayItem('aspectosTecnicos', 'maquinaria_solicitada', idx, 'cantidad', parseInt(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="text" placeholder="Descripción" value={maq.descripcion}
                            onChange={(e) => updateArrayItem('aspectosTecnicos', 'maquinaria_solicitada', idx, 'descripcion', e.target.value)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="number" placeholder="Precio Unit. USD" value={maq.precio_unitario_usd || ''}
                            onChange={(e) => updateArrayItem('aspectosTecnicos', 'maquinaria_solicitada', idx, 'precio_unitario_usd', parseFloat(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          <input type="number" placeholder="Total USD" value={maq.total_usd || ''}
                            onChange={(e) => updateArrayItem('aspectosTecnicos', 'maquinaria_solicitada', idx, 'total_usd', parseFloat(e.target.value) || 0)}
                            className={`px-2 py-1 rounded border text-sm ${darkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recurso Humano */}
                  <div>
                    <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Users size={18} className="inline mr-2" />Recurso Humano
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Empleados (Cantidad)
                        </label>
                        <input type="number" 
                          value={formData.aspectosTecnicos.recurso_humano_empleados.cantidad || ''}
                          onChange={(e) => handleNestedChange('aspectosTecnicos', 'recurso_humano_empleados', 'cantidad', parseInt(e.target.value) || 0)}
                          className={inputClass} readOnly={readOnly} />
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Salario Empleados (USD)
                        </label>
                        <input type="number" 
                          value={formData.aspectosTecnicos.recurso_humano_empleados.salario_mensual_usd || ''}
                          onChange={(e) => handleNestedChange('aspectosTecnicos', 'recurso_humano_empleados', 'salario_mensual_usd', parseFloat(e.target.value) || 0)}
                          className={inputClass} readOnly={readOnly} />
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Obreros (Cantidad)
                        </label>
                        <input type="number" 
                          value={formData.aspectosTecnicos.recurso_humano_obreros.cantidad || ''}
                          onChange={(e) => handleNestedChange('aspectosTecnicos', 'recurso_humano_obreros', 'cantidad', parseInt(e.target.value) || 0)}
                          className={inputClass} readOnly={readOnly} />
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Salario Obreros (USD)
                        </label>
                        <input type="number" 
                          value={formData.aspectosTecnicos.recurso_humano_obreros.salario_mensual_usd || ''}
                          onChange={(e) => handleNestedChange('aspectosTecnicos', 'recurso_humano_obreros', 'salario_mensual_usd', parseFloat(e.target.value) || 0)}
                          className={inputClass} readOnly={readOnly} />
                      </div>
                    </div>
                  </div>

                  {/* Servicios Básicos */}
                  <div>
                    <label className={labelClass}><Zap size={16} className="inline mr-2" />Servicios Básicos</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(formData.aspectosTecnicos.servicios_basicos)
                        .filter(([key]) => key !== 'id_servicio')
                        .map(([servicio, value]) => (
                        <label key={servicio} className="flex items-center gap-2">
                          <input type="checkbox"
                            checked={value}
                            onChange={(e) => handleNestedChange('aspectosTecnicos', 'servicios_basicos', servicio, e.target.checked)}
                            className="rounded text-[#2A9D8F]" disabled={readOnly} />
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {servicio.replace('_', ' ').toUpperCase()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN: Gastos Mensuales */}
              {activeSection === 'gastosMensuales' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-4 py-2 text-left">Concepto</th>
                        <th className="px-4 py-2 text-right">Actual (USD)</th>
                        <th className="px-4 py-2 text-right">Futuro (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(formData.gastosMensuales).map(([concepto, valores]) => (
                        <tr key={concepto}>
                          <td className="px-4 py-2 capitalize font-medium">
                            {concepto.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={valores.actual || ''}
                              onChange={(e) => handleNestedChange('gastosMensuales', concepto, 'actual', parseFloat(e.target.value) || 0)}
                              className={`w-36 px-2 py-1 rounded border text-right text-sm ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={valores.futuro || ''}
                              onChange={(e) => handleNestedChange('gastosMensuales', concepto, 'futuro', parseFloat(e.target.value) || 0)}
                              className={`w-36 px-2 py-1 rounded border text-right text-sm ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="font-bold">
                      <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                        <td className="px-4 py-2">TOTALES</td>
                        <td className="px-4 py-2 text-right">
                          {Object.values(formData.gastosMensuales).reduce((sum, v) => sum + (v.actual || 0), 0).toFixed(2)} USD
                        </td>
                        <td className="px-4 py-2 text-right">
                          {Object.values(formData.gastosMensuales).reduce((sum, v) => sum + (v.futuro || 0), 0).toFixed(2)} USD
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* SECCIÓN: Plan de Inversión */}
              {activeSection === 'planInversion' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-4 py-2 text-left">Concepto</th>
                        <th className="px-4 py-2 text-right">Aportes Propios (USD)</th>
                        <th className="px-4 py-2 text-right">Monto Solicitado (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(formData.planInversion).map(([concepto, valores]) => (
                        <tr key={concepto}>
                          <td className="px-4 py-2 capitalize font-medium">
                            {concepto.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={valores.aportes_propios || ''}
                              onChange={(e) => handleNestedChange('planInversion', concepto, 'aportes_propios', parseFloat(e.target.value) || 0)}
                              className={`w-40 px-2 py-1 rounded border text-right text-sm ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={valores.monto_solicitado || ''}
                              onChange={(e) => handleNestedChange('planInversion', concepto, 'monto_solicitado', parseFloat(e.target.value) || 0)}
                              className={`w-40 px-2 py-1 rounded border text-right text-sm ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200'}`} readOnly={readOnly} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="font-bold">
                      <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                        <td className="px-4 py-2">TOTALES</td>
                        <td className="px-4 py-2 text-right">
                          {Object.values(formData.planInversion).reduce((sum, v) => sum + (v.aportes_propios || 0), 0).toFixed(2)} USD
                        </td>
                        <td className="px-4 py-2 text-right">
                          {Object.values(formData.planInversion).reduce((sum, v) => sum + (v.monto_solicitado || 0), 0).toFixed(2)} USD
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* SECCIÓN: Organización y Comunidad */}
              {activeSection === 'organizacionComunidad' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Tipo de Organización</label>
                    <textarea rows="2" value={formData.organizacionComunidad.tipo_organizacion}
                      onChange={(e) => handleInputChange('organizacionComunidad', 'tipo_organizacion', e.target.value)}
                      className={inputClass} readOnly={readOnly} />
                  </div>
                  <div>
                    <label className={labelClass}>Necesidades de la Comunidad</label>
                    <textarea rows="2" value={formData.organizacionComunidad.necesidades_comunidad}
                      onChange={(e) => handleInputChange('organizacionComunidad', 'necesidades_comunidad', e.target.value)}
                      className={inputClass} readOnly={readOnly} />
                  </div>
                  <div>
                    <label className={labelClass}>¿Realiza aporte a la comunidad?</label>
                    <div className="flex gap-4 mb-2">
                      <label className="flex items-center gap-2">
                        <input type="radio" name="realiza_aporte" 
                          checked={formData.organizacionComunidad.realiza_aporte === true}
                          onChange={() => handleInputChange('organizacionComunidad', 'realiza_aporte', true)}
                          className="text-[#2A9D8F]" disabled={readOnly} /> 
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Sí</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name="realiza_aporte" 
                          checked={formData.organizacionComunidad.realiza_aporte === false}
                          onChange={() => handleInputChange('organizacionComunidad', 'realiza_aporte', false)}
                          className="text-[#2A9D8F]" disabled={readOnly} /> 
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>No</span>
                      </label>
                    </div>
                    {formData.organizacionComunidad.realiza_aporte && (
                      <textarea rows="2" placeholder="Describa el aporte"
                        value={formData.organizacionComunidad.aporte_descripcion}
                        onChange={(e) => handleInputChange('organizacionComunidad', 'aporte_descripcion', e.target.value)}
                        className={inputClass} readOnly={readOnly} />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Garantía Ofrecida</label>
                    <select value={formData.organizacionComunidad.garantia_ofrecida}
                      onChange={(e) => handleInputChange('organizacionComunidad', 'garantia_ofrecida', e.target.value)}
                      className={inputClass} disabled={readOnly}>
                      <option value="fianza">Fianza</option>
                      <option value="hipoteca">Hipoteca</option>
                    </select>
                  </div>
                </div>
              )}

              {/* SECCIÓN: Evaluación Final */}
              {activeSection === 'evaluacionFinal' && (
                <div className="space-y-4">
                  {/* --- CAMPO DE VERIFICACIÓN DE ID INSPECCIÓN --- */}
                  <div className={`p-4 rounded-lg border-2 ${
                    inspeccionId 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-medium flex items-center gap-2 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {inspeccionId ? (
                          <CheckCircle size={18} className="text-green-500" />
                        ) : (
                          <AlertCircle size={18} className="text-yellow-500" />
                        )}
                        Verificación de ID de Inspección
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowDebugInfo(!showDebugInfo)}
                        className={`text-xs px-2 py-1 rounded ${
                          darkMode 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {showDebugInfo ? 'Ocultar detalles' : 'Ver detalles'}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          ID de Inspección (se enviará al guardar):
                        </label>
                        <input
                          type="text"
                          value={inspeccionId || 'NUEVA INSPECCIÓN (sin ID)'}
                          readOnly
                          className={`w-full px-3 py-2 rounded-lg border-2 font-mono text-sm ${
                            inspeccionId
                              ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200 dark:border-green-600'
                              : 'border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-600'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          ID de Expediente relacionado:
                        </label>
                        <input
                          type="text"
                          value={expedienteData?.id_expediente || 'No disponible'}
                          readOnly
                          className={`w-full px-3 py-2 rounded-lg border font-mono text-sm ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-gray-300' 
                              : 'bg-gray-50 border-gray-300 text-gray-700'
                          }`}
                        />
                      </div>
                      
                      {showDebugInfo && (
                        <div className={`p-3 rounded-lg text-xs font-mono ${
                          darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}>
                          <p className="font-semibold mb-2">📋 Datos que se enviarán:</p>
                          <pre className="whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify({
                              id_inspeccion: inspeccionId,
                              id_codigo_exp: expedienteData?.id_expediente,
                              id_tipo_insp_clas: 1,
                              accion: inspeccionId ? 'ACTUALIZAR' : 'CREAR NUEVA',
                              ruta_api: inspeccionId 
                                ? `PUT /inspeccion/${inspeccionId}/full` 
                                : 'POST /inspeccion + POST /inspeccion/full',
                              emprendimiento: expedienteData?.nombre_emprendimiento || 'N/A',
                              sector: sector
                            }, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* --- FIN CAMPO DE VERIFICACIÓN --- */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}><Calendar size={16} className="inline mr-2" />Fecha de Inspección</label>
                      <input type="date" value={formData.evaluacionFinal.fecha_inspeccion}
                        onChange={(e) => handleInputChange('evaluacionFinal', 'fecha_inspeccion', e.target.value)}
                        className={inputClass} required readOnly={readOnly} />
                    </div>
                    <div>
                      <label className={labelClass}><Clock size={16} className="inline mr-2" />Duración (minutos)</label>
                      <input type="number" value={formData.evaluacionFinal.duracion_minutos}
                        onChange={(e) => handleInputChange('evaluacionFinal', 'duracion_minutos', e.target.value)}
                        className={inputClass} readOnly={readOnly} />
                    </div>
                    <div>
                      <label className={labelClass}>Inspector</label>
                      <input
                        type="text"
                        value={formData.evaluacionFinal.inspector}
                        readOnly
                        className={`${inputClass} opacity-90 cursor-not-allowed`}
                        placeholder="Se asigna automáticamente"
                        title="Nombre del inspector en sesión"
                      />
                      <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Se toma automáticamente del usuario en sesión
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}><FileText size={16} className="inline mr-2" />Observaciones Generales</label>
                    <textarea rows="3" value={formData.evaluacionFinal.observaciones_generales}
                      onChange={(e) => handleInputChange('evaluacionFinal', 'observaciones_generales', e.target.value)}
                      className={inputClass} readOnly={readOnly} />
                  </div>
                  <div>
                    <label className={labelClass}>Recomendaciones</label>
                    <textarea rows="3" value={formData.evaluacionFinal.recomendaciones}
                      onChange={(e) => handleInputChange('evaluacionFinal', 'recomendaciones', e.target.value)}
                      className={inputClass} readOnly={readOnly} />
                  </div>
                  
                  {/* Resumen de calificación */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Calificación</h4>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Calculada automáticamente</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-3xl font-bold ${
                          calcularCalificacion() >= 4 ? 'text-green-500' : 
                          calcularCalificacion() >= 3 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {calcularCalificacion()}/5.0
                        </span>
                        <p className={`text-sm font-medium ${
                          determinarEstatus(calcularCalificacion()) === 'Aprobado' ? 'text-green-500' :
                          determinarEstatus(calcularCalificacion()) === 'Aprobado con observaciones' ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {determinarEstatus(calcularCalificacion())}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t flex justify-between ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex gap-2">
                {sections.map((section, idx) => {
                  const currentIdx = sections.indexOf(activeSection);
                  if (idx === currentIdx - 1) {
                    return (
                      <button key="prev" type="button"
                        onClick={() => setActiveSection(sections[currentIdx - 1])}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>← Anterior</button>
                    );
                  }
                  if (idx === currentIdx + 1) {
                    return (
                      <button key="next" type="button"
                        onClick={() => setActiveSection(sections[currentIdx + 1])}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>Siguiente →</button>
                    );
                  }
                  return null;
                })}
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>Cancelar</button>
                {!readOnly && (
                  <button type="submit" disabled={loading}
                    className="px-6 py-2 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] transition-colors flex items-center gap-2 disabled:opacity-50 text-sm">
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Guardando...
                      </>
                    ) : (
                      <><Save size={18} /> Guardar Inspección</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InspectionFormCompleto;