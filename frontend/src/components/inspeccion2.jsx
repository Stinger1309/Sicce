// components/inspeccion2.jsx
import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Building,
  Package,
  Truck,
  Wrench,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Camera,
  Home,
  TrendingUp,
  ClipboardList,
  Heart,
  Shield,
  Zap,
  Droplet,
  Phone,
  Trash,
  Factory,
  Leaf,
  RefreshCw,
} from "lucide-react";
import { uploadToImgBB, uploadMultipleToImgBB } from "../services/imgbbService";

const inspeccion2 = ({
  isOpen,
  onClose,
  onSave,
  inspeccionId,
  emprendimientoData,
  sector,
  darkMode,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Estado principal del formulario basado en el PDF
  const [formData, setFormData] = useState({
    // II. DESCRIPCIÓN DE LA UNIDAD DE PRODUCCIÓN
    unidad_produccion: {
      ubicacion_practica: "",
      vias_acceso: "",
      tenencia: "propia", // propia, comunero, arrendatario, uso_gocce, ejidos, inti, otro
      otro_tenencia: "",
      vive_en_unidad_produccion: null, // true, false, null (sin seleccionar)
      linderos: {
        norte: "",
        este: "",
        sur: "",
        oeste: "",
      },
      topografia_superficie: {
        planas: { ha: "", uso: "", observaciones: "" },
        onduladas: { ha: "", uso: "", observaciones: "" },
        quebradas: { ha: "", uso: "", observaciones: "" },
        anegadizas: { ha: "", uso: "", observaciones: "" },
      },
    },
    // III. CONDICIONES DE LA EXPLOTACIÓN
    condiciones_explotacion: {
      administracion: {
        tipo: "directa", // directa, delegada
        nombre_administrador: "",
        experiencia_anos: "",
        lleva_registro_fisico: false,
        lleva_registro_economico: false,
        especificacion_fisico: "",
        especificacion_economico: "",
        observaciones: "",
      },
      personal: [
        {
          id: 1,
          cargo: "Administrador",
          fijos: 0,
          eventuales: 0,
          familiar: false,
        },
        { id: 2, cargo: "Encargado", fijos: 0, eventuales: 0, familiar: false },
        { id: 3, cargo: "Tractoristas", fijos: 0, eventuales: 0, familiar: false },
        { id: 4, cargo: "Obreros", fijos: 0, eventuales: 0, familiar: false },
        { id: 5, cargo: "Otros", fijos: 0, eventuales: 0, familiar: false, otro_descripcion: "" },
      ],
    },
    // IV. USO ACTUAL DE LA TIERRA
    uso_actual_tierra: {
      agricultura: [],
      pecuario: [],
      otros: [],
    },
    // V. INFRAESTRUCTURA EXISTENTE
    infraestructura: {
      vivienda: false,
      deposito_insumos: false,
      galpon: false,
      establo: false,
      corral: false,
      otro: false,
      otros_especificar: "",
      aguas: {
        pozo: false,
        riego: false,
        acueducto: false,
        rio_quebrada: false,
        otro: "",
      },
      electricidad: false,
      telefonia: false,
      internet: false,
    },
    // VI. MAQUINARIA Y EQUIPO
    maquinaria_equipo: [],
    // VII. PRODUCCIÓN AGRÍCOLA/PECUARIA
    produccion: {
      tipo_explotacion: [], // agrícola, pecuaria, mixta, forestal, agroindustrial
      cultivos: [],
      animales: [],
      produccion_ultimos_2_anos: [],
    },
    // VIII. PRACTICAS AGRONOMICAS
    practicas_agronomicas: {
      preparacion_suelo: "",
      siembra: "",
      fertilizacion: "",
      control_plagas: "",
      control_malezas: "",
      riego: "",
      cosecha: "",
      observaciones: "",
    },
    // IX. PASTIZALES
    pastizales: {
      pastos: [],
      numero_potreros: "",
      manejo_pasto: "",
    },
    // X. SERVICIOS
    servicios: {
      mercadeo_comercializacion: "",
      personal_tecnico: "",
      servicios_produccion: "",
    },
    // XI. COSTOS DE PRODUCCIÓN
    costos_produccion: {
      rubros: [],
      total_bs: "",
    },
    // XII. ASPECTOS FINANCIEROS
    financieros: {
      ingresos_otros: [],
      administracion_inversion: [],
      flujo_caja: {
        anos: [1, 2, 3, 4, 5],
        ingresos: ["", "", "", "", ""],
        costos_directos: ["", "", "", "", ""],
        costos_financieros: ["", "", "", "", ""],
        otros_costos: ["", "", "", "", ""],
        utilidad: ["", "", "", "", ""],
      },
      rentabilidad_estatica: "",
    },
    // XIII. CRÉDITO SOLICITADO
    credito: {
      monto_solicitado: "",
      monto_recomendado: "",
      uso_credito: "",
      empleos_generar: "",
      importancia_economica_social: "",
      recomendaciones: "",
    },
    // XIV. ANEXOS
    anexos: {
      croquis: null,
      croquis_url: "",
      fotografias: [],
    },
  });

  // Sectores según el PDF
  const sectoresAgropecuarios = [
    { value: "agricola", label: "Agrícola", icon: Leaf, subRubros: ["Maíz", "Arroz", "Frijol", "Hortalizas", "Frutales", "Café", "Cacao"] },
    { value: "pecuaria", label: "Pecuario", icon: Factory, subRubros: ["Bovino", "Porcino", "Ovino", "Caprino", "Aves", "Conejos", "Apícola"] },
    { value: "forestal", label: "Forestal", icon: Leaf, subRubros: ["Maderables", "Frutos del bosque", "Conservación"] },
    { value: "mixta", label: "Mixto", icon: Factory, subRubros: [] },
    { value: "agroindustrial", label: "Agroindustrial", icon: Factory, subRubros: [] },
  ];

  const tenencias = [
    { value: "propia", label: "Propia" },
    { value: "comunero", label: "Comunero" },
    { value: "arrendatario", label: "Arrendatario" },
    { value: "uso_gocce", label: "Uso, Goce y Disfrute" },
    { value: "ejidos", label: "Ejidos" },
    { value: "inti", label: "INTI" },
    { value: "otro", label: "Otro" },
  ];

  const pasos = [
    { id: 0, title: "Unidad de Producción", icon: MapPin, description: "Ubicación y características del terreno" },
    { id: 1, title: "Condiciones de Explotación", icon: Building, description: "Administración y personal" },
    { id: 2, title: "Uso de la Tierra", icon: Package, description: "Distribución actual de la tierra" },
    { id: 3, title: "Infraestructura", icon: Home, description: "Instalaciones y servicios disponibles" },
    { id: 4, title: "Maquinaria y Equipo", icon: Wrench, description: "Equipamiento existente y solicitado" },
    { id: 5, title: "Producción", icon: TrendingUp, description: "Tipos de cultivos/crías y producción" },
    { id: 6, title: "Prácticas Agronómicas", icon: Leaf, description: "Manejo del cultivo/animal" },
    { id: 7, title: "Pastizales", icon: Factory, description: "Áreas de pastoreo" },
    { id: 8, title: "Servicios", icon: Truck, description: "Comercialización y asistencia" },
    { id: 9, title: "Costos", icon: DollarSign, description: "Costos de producción" },
    { id: 10, title: "Finanzas", icon: TrendingUp, description: "Flujo de caja y rentabilidad" },
    { id: 11, title: "Crédito", icon: Shield, description: "Monto solicitado y garantías" },
    { id: 12, title: "Firmas", icon: FileText, description: "Declaración jurada" },
  ];

  // Cargar datos del emprendimiento si existe
  useEffect(() => {
    if (emprendimientoData) {
      setFormData(prev => ({
        ...prev,
        credito: {
          ...prev.credito,
          monto_solicitado: emprendimientoData.monto_solicitado || "",
        },
      }));
    }
  }, [emprendimientoData]);

  const handleChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleNestedChange = (section, subsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value,
        },
      },
    }));
  };

  const handleArrayChange = (section, arrayName, index, field, value) => {
    const newArray = [...formData[section][arrayName]];
    newArray[index] = { ...newArray[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [arrayName]: newArray,
      },
    }));
  };

  const addArrayItem = (section, arrayName, newItem) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [arrayName]: [...prev[section][arrayName], { ...newItem, id: Date.now() }],
      },
    }));
  };

  const removeArrayItem = (section, arrayName, index) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [arrayName]: prev[section][arrayName].filter((_, i) => i !== index),
      },
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 0: // Unidad de Producción
        if (formData.unidad_produccion.vive_en_unidad_produccion === null) newErrors.vive = "Debe seleccionar si vive en la unidad de producción";
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, pasos.length - 1));
    }
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const anexosPayload = {
        croquis_url: formData.anexos.croquis_url || "",
        fotografias: [...(formData.anexos.fotografias || [])]
      };

      // Subir croquis si es File
      if (formData.anexos.croquis instanceof File) {
        const up = await uploadToImgBB(formData.anexos.croquis);
        anexosPayload.croquis_url = up.url;
      }

      // Subir fotos pendientes (File)
      const pendientes = (formData.anexos.fotografias || []).filter((f) => f.file instanceof File);
      if (pendientes.length > 0) {
        const uploaded = await uploadMultipleToImgBB(pendientes.map((f) => f.file));
        let ui = 0;
        anexosPayload.fotografias = (formData.anexos.fotografias || []).map((f) => {
          if (f.file instanceof File) {
            const u = uploaded[ui++];
            return { foto_url: u.url, descripcion: f.descripcion || f.name || u.name };
          }
          return { foto_url: f.foto_url || f.url, descripcion: f.descripcion || f.name || null };
        });
      } else {
        anexosPayload.fotografias = (formData.anexos.fotografias || [])
          .filter((f) => f.foto_url || f.url)
          .map((f) => ({
            foto_url: f.foto_url || f.url,
            descripcion: f.descripcion || f.name || null
          }));
      }

      await onSave({
        ...formData,
        anexos: anexosPayload,
        tipo_formulario: "agricola_reinspeccion"
      });
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      const msg =
        error?.details ||
        error?.error ||
        error?.message ||
        "Error al guardar la inspección agrícola";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCroquisChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      anexos: {
        ...prev.anexos,
        croquis: file,
        croquis_preview: preview,
        croquis_url: prev.anexos.croquis_url || ""
      }
    }));
  };

  const handleFotosChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const nuevas = files.map((file) => ({
      file,
      name: file.name,
      descripcion: file.name,
      preview: URL.createObjectURL(file)
    }));
    setFormData((prev) => ({
      ...prev,
      anexos: {
        ...prev.anexos,
        fotografias: [...(prev.anexos.fotografias || []), ...nuevas]
      }
    }));
  };

  const removeFoto = (index) => {
    setFormData((prev) => ({
      ...prev,
      anexos: {
        ...prev.anexos,
        fotografias: (prev.anexos.fotografias || []).filter((_, i) => i !== index)
      }
    }));
  };

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderUnidadProduccion();
      case 1:
        return renderCondicionesExplotacion();
      case 2:
        return renderUsoTierra();
      case 3:
        return renderInfraestructura();
      case 4:
        return renderMaquinariaEquipo();
      case 5:
        return renderProduccion();
      case 6:
        return renderPracticasAgronomicas();
      case 7:
        return renderPastizales();
      case 8:
        return renderServicios();
      case 9:
        return renderCostos();
      case 10:
        return renderFinanzas();
      case 11:
        return renderCredito();
      case 12:
        return renderFirmas();
      default:
        return null;
    }
  };

  // ==================== RENDER DE CADA SECCIÓN ====================

  const renderUnidadProduccion = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Ubicación Práctica
          </label>
          <textarea
            rows={2}
            value={formData.unidad_produccion.ubicacion_practica}
            onChange={(e) => handleChange("unidad_produccion", "ubicacion_practica", e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-white border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            placeholder="Referencias para llegar al lugar"
          />
        </div>
        <div className="col-span-2">
          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Vías de Acceso (Condiciones)
          </label>
          <textarea
            rows={2}
            value={formData.unidad_produccion.vias_acceso}
            onChange={(e) => handleChange("unidad_produccion", "vias_acceso", e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-white border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            placeholder="Estado de las vías, tipo de terreno, etc."
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Tenencia
          </label>
          <select
            value={formData.unidad_produccion.tenencia}
            onChange={(e) => handleChange("unidad_produccion", "tenencia", e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-white border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          >
            {tenencias.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        {formData.unidad_produccion.tenencia === "otro" && (
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Especifique
            </label>
            <input
              type="text"
              value={formData.unidad_produccion.otro_tenencia}
              onChange={(e) => handleChange("unidad_produccion", "otro_tenencia", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
          </div>
        )}

        {/* ¿Vive en la Unidad de Producción? - Checkboxes Si/No */}
        <div className="col-span-2">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            ¿Vive en la Unidad de Producción? *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="vive_en_unidad"
                checked={formData.unidad_produccion.vive_en_unidad_produccion === true}
                onChange={() => handleChange("unidad_produccion", "vive_en_unidad_produccion", true)}
                className="w-4 h-4 text-[#2A9D8F] focus:ring-[#2A9D8F]"
              />
              <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Sí</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="vive_en_unidad"
                checked={formData.unidad_produccion.vive_en_unidad_produccion === false}
                onChange={() => handleChange("unidad_produccion", "vive_en_unidad_produccion", false)}
                className="w-4 h-4 text-[#2A9D8F] focus:ring-[#2A9D8F]"
              />
              <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>No</span>
            </label>
          </div>
          {errors.vive && <p className="text-red-500 text-xs mt-1">{errors.vive}</p>}
        </div>
      </div>

      {/* Linderos */}
      <div>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Linderos Actuales
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Norte
            </label>
            <input
              type="text"
              value={formData.unidad_produccion.linderos.norte}
              onChange={(e) => handleNestedChange("unidad_produccion", "linderos", "norte", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Sur
            </label>
            <input
              type="text"
              value={formData.unidad_produccion.linderos.sur}
              onChange={(e) => handleNestedChange("unidad_produccion", "linderos", "sur", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Este
            </label>
            <input
              type="text"
              value={formData.unidad_produccion.linderos.este}
              onChange={(e) => handleNestedChange("unidad_produccion", "linderos", "este", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Oeste
            </label>
            <input
              type="text"
              value={formData.unidad_produccion.linderos.oeste}
              onChange={(e) => handleNestedChange("unidad_produccion", "linderos", "oeste", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
          </div>
        </div>
      </div>

      {/* Topografía y Superficie */}
      <div>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Topografía y Superficie
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
              <tr>
                <th className="px-3 py-2 text-left">Topografía</th>
                <th className="px-3 py-2 text-left">Superficie (ha)</th>
                <th className="px-3 py-2 text-left">Uso</th>
                <th className="px-3 py-2 text-left">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: "planas", label: "Planas (0-10%)" },
                { key: "onduladas", label: "Onduladas (10-25%)" },
                { key: "quebradas", label: "Quebradas (25-45%)" },
                { key: "anegadizas", label: "Anegadizas" },
              ].map((tipo) => (
                <tr key={tipo.key} className={`border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <td className="px-3 py-2">{tipo.label}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={formData.unidad_produccion.topografia_superficie[tipo.key].ha}
                      onChange={(e) => handleNestedChange("unidad_produccion", "topografia_superficie", tipo.key, { ...formData.unidad_produccion.topografia_superficie[tipo.key], ha: e.target.value })}
                      className={`w-24 px-2 py-1 rounded border ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                      placeholder="ha"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={formData.unidad_produccion.topografia_superficie[tipo.key].uso}
                      onChange={(e) => handleNestedChange("unidad_produccion", "topografia_superficie", tipo.key, { ...formData.unidad_produccion.topografia_superficie[tipo.key], uso: e.target.value })}
                      className={`w-32 px-2 py-1 rounded border ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                      placeholder="Uso actual"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={formData.unidad_produccion.topografia_superficie[tipo.key].observaciones}
                      onChange={(e) => handleNestedChange("unidad_produccion", "topografia_superficie", tipo.key, { ...formData.unidad_produccion.topografia_superficie[tipo.key], observaciones: e.target.value })}
                      className={`w-40 px-2 py-1 rounded border ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                      placeholder="Observaciones"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCondicionesExplotacion = () => (
    <div className="space-y-6">
      {/* Administración */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Administración
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Tipo de Administración
            </label>
            <select
              value={formData.condiciones_explotacion.administracion.tipo}
              onChange={(e) => handleNestedChange("condiciones_explotacion", "administracion", "tipo", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            >
              <option value="directa">Directa</option>
              <option value="delegada">Delegada</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Nombre del Administrador
            </label>
            <input
              type="text"
              value={formData.condiciones_explotacion.administracion.nombre_administrador}
              onChange={(e) => handleNestedChange("condiciones_explotacion", "administracion", "nombre_administrador", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Experiencia (años)
            </label>
            <input
              type="number"
              value={formData.condiciones_explotacion.administracion.experiencia_anos}
              onChange={(e) => handleNestedChange("condiciones_explotacion", "administracion", "experiencia_anos", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.condiciones_explotacion.administracion.lleva_registro_fisico}
              onChange={(e) => handleNestedChange("condiciones_explotacion", "administracion", "lleva_registro_fisico", e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              ¿Lleva registro físico?
            </label>
          </div>
          {formData.condiciones_explotacion.administracion.lleva_registro_fisico && (
            <div>
              <input
                type="text"
                value={formData.condiciones_explotacion.administracion.especificacion_fisico}
                onChange={(e) => handleNestedChange("condiciones_explotacion", "administracion", "especificacion_fisico", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                placeholder="Especifique tipo de registro"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.condiciones_explotacion.administracion.lleva_registro_economico}
              onChange={(e) => handleNestedChange("condiciones_explotacion", "administracion", "lleva_registro_economico", e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              ¿Lleva registro económico?
            </label>
          </div>
          {formData.condiciones_explotacion.administracion.lleva_registro_economico && (
            <div>
              <input
                type="text"
                value={formData.condiciones_explotacion.administracion.especificacion_economico}
                onChange={(e) => handleNestedChange("condiciones_explotacion", "administracion", "especificacion_economico", e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                placeholder="Especifique tipo de registro"
              />
            </div>
          )}
        </div>
        <div className="mt-3">
          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Observaciones
          </label>
          <textarea
            rows={2}
            value={formData.condiciones_explotacion.administracion.observaciones}
            onChange={(e) => handleNestedChange("condiciones_explotacion", "administracion", "observaciones", e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              darkMode
                ? "bg-gray-600 border-gray-500 text-white"
                : "bg-white border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          />
        </div>
      </div>

      {/* Personal */}
      <div>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Personal de la Unidad de Producción (Mano de Obra)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
              <tr>
                <th className="px-3 py-2 text-left">Cargo</th>
                <th className="px-3 py-2 text-center">Fijos</th>
                <th className="px-3 py-2 text-center">Eventuales</th>
                <th className="px-3 py-2 text-center">Familiar</th>
              </tr>
            </thead>
            <tbody>
              {formData.condiciones_explotacion.personal.map((persona, idx) => (
                <tr key={persona.id} className={`border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <td className="px-3 py-2">
                    {persona.cargo}
                    {persona.cargo === "Otros" && (
                      <input
                        type="text"
                        value={persona.otro_descripcion || ""}
                        onChange={(e) => handleArrayChange("condiciones_explotacion", "personal", idx, "otro_descripcion", e.target.value)}
                        className={`ml-2 px-2 py-1 rounded border text-xs ${
                          darkMode
                            ? "bg-gray-600 border-gray-500 text-white"
                            : "bg-white border-gray-300"
                        }`}
                        placeholder="Especifique"
                        style={{ width: "120px" }}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      value={persona.fijos}
                      onChange={(e) => handleArrayChange("condiciones_explotacion", "personal", idx, "fijos", parseInt(e.target.value) || 0)}
                      className={`w-16 px-2 py-1 rounded border text-center ${
                        darkMode
                          ? "bg-gray-600 border-gray-500 text-white"
                          : "bg-white border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                      min="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      value={persona.eventuales}
                      onChange={(e) => handleArrayChange("condiciones_explotacion", "personal", idx, "eventuales", parseInt(e.target.value) || 0)}
                      className={`w-16 px-2 py-1 rounded border text-center ${
                        darkMode
                          ? "bg-gray-600 border-gray-500 text-white"
                          : "bg-white border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                      min="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={persona.familiar}
                      onChange={(e) => handleArrayChange("condiciones_explotacion", "personal", idx, "familiar", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderUsoTierra = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Uso Actual de la Tierra
        </h4>
        
        {/* Agricultura */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Agricultura
          </label>
          {formData.uso_actual_tierra.agricultura.map((item, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                value={item.cultivo}
                onChange={(e) => handleArrayChange("uso_actual_tierra", "agricultura", idx, "cultivo", e.target.value)}
                placeholder="Cultivo"
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <input
                type="text"
                value={item.superficie_ha}
                onChange={(e) => handleArrayChange("uso_actual_tierra", "agricultura", idx, "superficie_ha", e.target.value)}
                placeholder="Superficie (ha)"
                className={`w-32 px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <button
                onClick={() => removeArrayItem("uso_actual_tierra", "agricultura", idx)}
                className="p-2 text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            onClick={() => addArrayItem("uso_actual_tierra", "agricultura", { cultivo: "", superficie_ha: "" })}
            className="mt-2 text-sm text-[#2A9D8F] hover:text-[#264653] flex items-center gap-1"
          >
            <Plus size={16} /> Agregar cultivo
          </button>
        </div>

        {/* Pecuario */}
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Pecuario
          </label>
          {formData.uso_actual_tierra.pecuario.map((item, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                value={item.tipo}
                onChange={(e) => handleArrayChange("uso_actual_tierra", "pecuario", idx, "tipo", e.target.value)}
                placeholder="Tipo de producción"
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <input
                type="text"
                value={item.superficie_ha}
                onChange={(e) => handleArrayChange("uso_actual_tierra", "pecuario", idx, "superficie_ha", e.target.value)}
                placeholder="Superficie (ha)"
                className={`w-32 px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <button
                onClick={() => removeArrayItem("uso_actual_tierra", "pecuario", idx)}
                className="p-2 text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            onClick={() => addArrayItem("uso_actual_tierra", "pecuario", { tipo: "", superficie_ha: "" })}
            className="mt-2 text-sm text-[#2A9D8F] hover:text-[#264653] flex items-center gap-1"
          >
            <Plus size={16} /> Agregar producción pecuaria
          </button>
        </div>

        {/* Otros usos */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Otros Usos
          </label>
          {formData.uso_actual_tierra.otros.map((item, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                value={item.descripcion}
                onChange={(e) => handleArrayChange("uso_actual_tierra", "otros", idx, "descripcion", e.target.value)}
                placeholder="Descripción"
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <input
                type="text"
                value={item.superficie_ha}
                onChange={(e) => handleArrayChange("uso_actual_tierra", "otros", idx, "superficie_ha", e.target.value)}
                placeholder="Superficie (ha)"
                className={`w-32 px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <button
                onClick={() => removeArrayItem("uso_actual_tierra", "otros", idx)}
                className="p-2 text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            onClick={() => addArrayItem("uso_actual_tierra", "otros", { descripcion: "", superficie_ha: "" })}
            className="mt-2 text-sm text-[#2A9D8F] hover:text-[#264653] flex items-center gap-1"
          >
            <Plus size={16} /> Agregar otro uso
          </button>
        </div>
      </div>
    </div>
  );

  const renderInfraestructura = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Infraestructura Existente
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {[
            { key: "vivienda", label: "Vivienda" },
            { key: "deposito_insumos", label: "Depósito de Insumos" },
            { key: "galpon", label: "Galpón" },
            { key: "establo", label: "Establo" },
            { key: "corral", label: "Corral" },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.infraestructura[item.key]}
                onChange={(e) => handleChange("infraestructura", item.key, e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                {item.label}
              </label>
            </div>
          ))}
        </div>
        
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={formData.infraestructura.otro}
              onChange={(e) => handleChange("infraestructura", "otro", e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Otros
            </label>
          </div>
          {formData.infraestructura.otro && (
            <input
              type="text"
              value={formData.infraestructura.otros_especificar}
              onChange={(e) => handleChange("infraestructura", "otros_especificar", e.target.value)}
              placeholder="Especifique"
              className={`w-full mt-1 px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
          )}
        </div>
      </div>

      {/* Aguas */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Fuentes de Agua
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "pozo", label: "Pozo", icon: Droplet },
            { key: "riego", label: "Sistema de Riego", icon: Zap },
            { key: "acueducto", label: "Acueducto", icon: Droplet },
            { key: "rio_quebrada", label: "Río/Quebrada", icon: Droplet },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.infraestructura.aguas[item.key]}
                onChange={(e) => handleNestedChange("infraestructura", "aguas", item.key, e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                {item.label}
              </label>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.infraestructura.aguas.otro !== ""}
              onChange={(e) => handleNestedChange("infraestructura", "aguas", "otro", e.target.checked ? "pendiente" : "")}
              className="w-4 h-4 rounded"
            />
            <label className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Otra fuente
            </label>
          </div>
          {formData.infraestructura.aguas.otro && (
            <input
              type="text"
              value={formData.infraestructura.aguas.otro}
              onChange={(e) => handleNestedChange("infraestructura", "aguas", "otro", e.target.value)}
              placeholder="Especifique"
              className={`w-full mt-1 px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
          )}
        </div>
      </div>

      {/* Servicios Básicos */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Servicios Básicos
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: "electricidad", label: "Electricidad", icon: Zap },
            { key: "telefonia", label: "Telefonía", icon: Phone },
            { key: "internet", label: "Internet", icon: Wrench },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.infraestructura[item.key]}
                onChange={(e) => handleChange("infraestructura", item.key, e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                {item.label}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMaquinariaEquipo = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Maquinaria y Equipo que Posee
        </h4>
        
        {formData.maquinaria_equipo.filter(m => m.tipo === "existente").map((item, idx) => (
          <div key={idx} className="flex flex-wrap gap-2 mb-2">
            <input
              type="text"
              value={item.descripcion}
              onChange={(e) => {
                const newArray = [...formData.maquinaria_equipo];
                newArray[idx] = { ...newArray[idx], descripcion: e.target.value };
                setFormData(prev => ({ ...prev, maquinaria_equipo: newArray }));
              }}
              placeholder="Descripción"
              className={`flex-1 min-w-[150px] px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <input
              type="number"
              value={item.cantidad}
              onChange={(e) => {
                const newArray = [...formData.maquinaria_equipo];
                newArray[idx] = { ...newArray[idx], cantidad: parseInt(e.target.value) || 0 };
                setFormData(prev => ({ ...prev, maquinaria_equipo: newArray }));
              }}
              placeholder="Cant."
              className={`w-20 px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <input
              type="text"
              value={item.estado}
              onChange={(e) => {
                const newArray = [...formData.maquinaria_equipo];
                newArray[idx] = { ...newArray[idx], estado: e.target.value };
                setFormData(prev => ({ ...prev, maquinaria_equipo: newArray }));
              }}
              placeholder="Estado"
              className={`w-28 px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <button
              onClick={() => removeArrayItem("maquinaria_equipo", "maquinaria_equipo", idx)}
              className="p-2 text-red-500 hover:text-red-700"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        
        <button
          onClick={() => addArrayItem("maquinaria_equipo", "maquinaria_equipo", { tipo: "existente", descripcion: "", cantidad: 0, estado: "" })}
          className="mt-2 text-sm text-[#2A9D8F] hover:text-[#264653] flex items-center gap-1"
        >
          <Plus size={16} /> Agregar maquinaria/equipo existente
        </button>
      </div>

      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Maquinaria y Equipo Solicitado
        </h4>
        
        {formData.maquinaria_equipo.filter(m => m.tipo === "solicitado").map((item, idx) => {
          const globalIdx = formData.maquinaria_equipo.findIndex(m => m.id === item.id);
          return (
            <div key={idx} className="flex flex-wrap gap-2 mb-2">
              <input
                type="text"
                value={item.descripcion}
                onChange={(e) => {
                  const newArray = [...formData.maquinaria_equipo];
                  newArray[globalIdx] = { ...newArray[globalIdx], descripcion: e.target.value };
                  setFormData(prev => ({ ...prev, maquinaria_equipo: newArray }));
                }}
                placeholder="Descripción"
                className={`flex-1 min-w-[150px] px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <input
                type="number"
                value={item.cantidad}
                onChange={(e) => {
                  const newArray = [...formData.maquinaria_equipo];
                  newArray[globalIdx] = { ...newArray[globalIdx], cantidad: parseInt(e.target.value) || 0 };
                  setFormData(prev => ({ ...prev, maquinaria_equipo: newArray }));
                }}
                placeholder="Cant."
                className={`w-20 px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <input
                type="text"
                value={item.precio_unitario}
                onChange={(e) => {
                  const newArray = [...formData.maquinaria_equipo];
                  newArray[globalIdx] = { ...newArray[globalIdx], precio_unitario: e.target.value };
                  setFormData(prev => ({ ...prev, maquinaria_equipo: newArray }));
                }}
                placeholder="Precio Unit. (Bs)"
                className={`w-32 px-3 py-2 rounded-lg border ${
                  darkMode
                    ? "bg-gray-600 border-gray-500 text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <button
                onClick={() => removeArrayItem("maquinaria_equipo", "maquinaria_equipo", globalIdx)}
                className="p-2 text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
        
        <button
          onClick={() => addArrayItem("maquinaria_equipo", "maquinaria_equipo", { tipo: "solicitado", descripcion: "", cantidad: 0, precio_unitario: "" })}
          className="mt-2 text-sm text-[#2A9D8F] hover:text-[#264653] flex items-center gap-1"
        >
          <Plus size={16} /> Agregar maquinaria/equipo solicitado
        </button>
      </div>
    </div>
  );

  const renderProduccion = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Tipo de Explotación
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {sectoresAgropecuarios.map(sector => (
            <div key={sector.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.produccion.tipo_explotacion.includes(sector.value)}
                onChange={(e) => {
                  const current = [...formData.produccion.tipo_explotacion];
                  if (e.target.checked) {
                    current.push(sector.value);
                  } else {
                    const index = current.indexOf(sector.value);
                    if (index > -1) current.splice(index, 1);
                  }
                  handleChange("produccion", "tipo_explotacion", current);
                }}
                className="w-4 h-4 rounded"
              />
              <label className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                {sector.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Producción últimos 2 años */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Producción (Últimos 2 años)
        </h4>
        
        {formData.produccion.produccion_ultimos_2_anos.map((item, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <input
              type="text"
              value={item.rubro}
              onChange={(e) => handleArrayChange("produccion", "produccion_ultimos_2_anos", idx, "rubro", e.target.value)}
              placeholder="Rubro"
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <input
              type="text"
              value={item.ano}
              onChange={(e) => handleArrayChange("produccion", "produccion_ultimos_2_anos", idx, "ano", e.target.value)}
              placeholder="Año"
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <input
              type="text"
              value={item.cantidad}
              onChange={(e) => handleArrayChange("produccion", "produccion_ultimos_2_anos", idx, "cantidad", e.target.value)}
              placeholder="Producción (Kg/Unid)"
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <input
              type="text"
              value={item.valor_bs}
              onChange={(e) => handleArrayChange("produccion", "produccion_ultimos_2_anos", idx, "valor_bs", e.target.value)}
              placeholder="Valor (Bs)"
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <button
              onClick={() => removeArrayItem("produccion", "produccion_ultimos_2_anos", idx)}
              className="p-2 text-red-500 hover:text-red-700"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        
        <button
          onClick={() => addArrayItem("produccion", "produccion_ultimos_2_anos", { rubro: "", ano: "", cantidad: "", valor_bs: "" })}
          className="mt-2 text-sm text-[#2A9D8F] hover:text-[#264653] flex items-center gap-1"
        >
          <Plus size={16} /> Agregar registro de producción
        </button>
      </div>
    </div>
  );

  const renderPracticasAgronomicas = () => (
    <div className="space-y-4">
      {[
        { key: "preparacion_suelo", label: "Preparación del Suelo" },
        { key: "siembra", label: "Siembra" },
        { key: "fertilizacion", label: "Fertilización" },
        { key: "control_plagas", label: "Control de Plagas" },
        { key: "control_malezas", label: "Control de Malezas" },
        { key: "riego", label: "Riego" },
        { key: "cosecha", label: "Cosecha" },
      ].map((practica) => (
        <div key={practica.key}>
          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            {practica.label}
          </label>
          <textarea
            rows={2}
            value={formData.practicas_agronomicas[practica.key] || ""}
            onChange={(e) => handleChange("practicas_agronomicas", practica.key, e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-white border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            placeholder={`Describa las prácticas de ${practica.label.toLowerCase()}`}
          />
        </div>
      ))}
      
      <div>
        <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Observaciones Generales
        </label>
        <textarea
          rows={3}
          value={formData.practicas_agronomicas.observaciones || ""}
          onChange={(e) => handleChange("practicas_agronomicas", "observaciones", e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          placeholder="Observaciones adicionales sobre las prácticas agronómicas"
        />
      </div>
    </div>
  );

  const renderPastizales = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Pastizales
        </h4>
        
        {formData.pastizales.pastos.map((pasto, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
            <input
              type="text"
              value={pasto.nombre}
              onChange={(e) => handleArrayChange("pastizales", "pastos", idx, "nombre", e.target.value)}
              placeholder="Nombre del pasto"
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <input
              type="text"
              value={pasto.forma_uso}
              onChange={(e) => handleArrayChange("pastizales", "pastos", idx, "forma_uso", e.target.value)}
              placeholder="Forma de uso"
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <input
              type="text"
              value={pasto.superficie_ha}
              onChange={(e) => handleArrayChange("pastizales", "pastos", idx, "superficie_ha", e.target.value)}
              placeholder="Superficie (ha)"
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <input
              type="text"
              value={pasto.carga_ua_ha}
              onChange={(e) => handleArrayChange("pastizales", "pastos", idx, "carga_ua_ha", e.target.value)}
              placeholder="Carga U.A./ha"
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <input
              type="text"
              value={pasto.aprovechamiento}
              onChange={(e) => handleArrayChange("pastizales", "pastos", idx, "aprovechamiento", e.target.value)}
              placeholder="Aprovechamiento %"
              className={`px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <button
              onClick={() => removeArrayItem("pastizales", "pastos", idx)}
              className="p-2 text-red-500 hover:text-red-700"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        
        <button
          onClick={() => addArrayItem("pastizales", "pastos", { nombre: "", forma_uso: "", superficie_ha: "", carga_ua_ha: "", aprovechamiento: "" })}
          className="mt-2 text-sm text-[#2A9D8F] hover:text-[#264653] flex items-center gap-1"
        >
          <Plus size={16} /> Agregar pasto
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              N° de Potreros
            </label>
            <input
              type="text"
              value={formData.pastizales.numero_potreros}
              onChange={(e) => handleChange("pastizales", "numero_potreros", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Manejo del Pasto
            </label>
            <textarea
              rows={2}
              value={formData.pastizales.manejo_pasto}
              onChange={(e) => handleChange("pastizales", "manejo_pasto", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
              placeholder="Describa el manejo del pasto"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderServicios = () => (
    <div className="space-y-6">
      <div>
        <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Mercadeo y Comercialización
        </label>
        <textarea
          rows={3}
          value={formData.servicios.mercadeo_comercializacion || ""}
          onChange={(e) => handleChange("servicios", "mercadeo_comercializacion", e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          placeholder="Canales de comercialización, mercados existentes, formas de venta"
        />
      </div>
      
      <div>
        <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Personal Técnico
        </label>
        <textarea
          rows={3}
          value={formData.servicios.personal_tecnico || ""}
          onChange={(e) => handleChange("servicios", "personal_tecnico", e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          placeholder="¿Con qué personal técnico cuenta? (Ingenieros, técnicos, asistentes)"
        />
      </div>
      
      <div>
        <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Servicios a la Producción
        </label>
        <textarea
          rows={3}
          value={formData.servicios.servicios_produccion || ""}
          onChange={(e) => handleChange("servicios", "servicios_produccion", e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          placeholder="Servicios de apoyo a la producción disponibles"
        />
      </div>
    </div>
  );

  const renderCostos = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Costos de Producción
        </h4>
        
        {formData.costos_produccion.rubros.map((rubro, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input
              type="text"
              value={rubro.concepto}
              onChange={(e) => handleArrayChange("costos_produccion", "rubros", idx, "concepto", e.target.value)}
              placeholder="Concepto"
              className={`flex-1 px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <input
              type="text"
              value={rubro.monto_bs}
              onChange={(e) => handleArrayChange("costos_produccion", "rubros", idx, "monto_bs", e.target.value)}
              placeholder="Monto (Bs)"
              className={`w-40 px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
            />
            <button
              onClick={() => removeArrayItem("costos_produccion", "rubros", idx)}
              className="p-2 text-red-500 hover:text-red-700"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        
        <button
          onClick={() => addArrayItem("costos_produccion", "rubros", { concepto: "", monto_bs: "" })}
          className="mt-2 text-sm text-[#2A9D8F] hover:text-[#264653] flex items-center gap-1"
        >
          <Plus size={16} /> Agregar costo
        </button>
        
        <div className="mt-4">
          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Total Costos de Producción (Bs)
          </label>
          <input
            type="text"
            value={formData.costos_produccion.total_bs}
            onChange={(e) => handleChange("costos_produccion", "total_bs", e.target.value)}
            className={`w-full md:w-64 px-3 py-2 rounded-lg border ${
              darkMode
                ? "bg-gray-600 border-gray-500 text-white"
                : "bg-white border-gray-300"
            }`}
          />
        </div>
      </div>
    </div>
  );

  const renderFinanzas = () => (
    <div className="space-y-6">
      {/* Flujo de Caja */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Flujo de Caja Proyectado (5 años)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
                <th className="px-2 py-2 text-left">Concepto</th>
                <th className="px-2 py-2 text-right">Año 1</th>
                <th className="px-2 py-2 text-right">Año 2</th>
                <th className="px-2 py-2 text-right">Año 3</th>
                <th className="px-2 py-2 text-right">Año 4</th>
                <th className="px-2 py-2 text-right">Año 5</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-2 font-medium">Ingresos</td>
                {formData.financieros.flujo_caja.ingresos.map((val, idx) => (
                  <td key={idx} className="px-2 py-2">
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const newIngresos = [...formData.financieros.flujo_caja.ingresos];
                        newIngresos[idx] = e.target.value;
                        handleNestedChange("financieros", "flujo_caja", "ingresos", newIngresos);
                      }}
                      className={`w-24 px-2 py-1 rounded text-right ${
                        darkMode
                          ? "bg-gray-600 border-gray-500 text-white"
                          : "bg-white border-gray-300"
                      }`}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-2 font-medium">Costos Directos</td>
                {formData.financieros.flujo_caja.costos_directos.map((val, idx) => (
                  <td key={idx} className="px-2 py-2">
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const newCostos = [...formData.financieros.flujo_caja.costos_directos];
                        newCostos[idx] = e.target.value;
                        handleNestedChange("financieros", "flujo_caja", "costos_directos", newCostos);
                      }}
                      className={`w-24 px-2 py-1 rounded text-right ${
                        darkMode
                          ? "bg-gray-600 border-gray-500 text-white"
                          : "bg-white border-gray-300"
                      }`}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-2 font-medium">Costos Financieros</td>
                {formData.financieros.flujo_caja.costos_financieros.map((val, idx) => (
                  <td key={idx} className="px-2 py-2">
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const newCostos = [...formData.financieros.flujo_caja.costos_financieros];
                        newCostos[idx] = e.target.value;
                        handleNestedChange("financieros", "flujo_caja", "costos_financieros", newCostos);
                      }}
                      className={`w-24 px-2 py-1 rounded text-right ${
                        darkMode
                          ? "bg-gray-600 border-gray-500 text-white"
                          : "bg-white border-gray-300"
                      }`}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-2 font-medium">Otros Costos</td>
                {formData.financieros.flujo_caja.otros_costos.map((val, idx) => (
                  <td key={idx} className="px-2 py-2">
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const newCostos = [...formData.financieros.flujo_caja.otros_costos];
                        newCostos[idx] = e.target.value;
                        handleNestedChange("financieros", "flujo_caja", "otros_costos", newCostos);
                      }}
                      className={`w-24 px-2 py-1 rounded text-right ${
                        darkMode
                          ? "bg-gray-600 border-gray-500 text-white"
                          : "bg-white border-gray-300"
                      }`}
                    />
                  </td>
                ))}
              </tr>
              <tr className={`font-bold ${darkMode ? "text-green-400" : "text-green-600"}`}>
                <td className="px-2 py-2">Utilidad</td>
                {formData.financieros.flujo_caja.utilidad.map((val, idx) => (
                  <td key={idx} className="px-2 py-2">
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const newUtilidad = [...formData.financieros.flujo_caja.utilidad];
                        newUtilidad[idx] = e.target.value;
                        handleNestedChange("financieros", "flujo_caja", "utilidad", newUtilidad);
                      }}
                      className={`w-24 px-2 py-1 rounded text-right font-bold ${
                        darkMode
                          ? "bg-gray-600 border-gray-500 text-green-400"
                          : "bg-white border-gray-300 text-green-600"
                      }`}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Rentabilidad Estática
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Rentabilidad = (Utilidad / Inversión) × 100
            </label>
            <input
              type="text"
              value={formData.financieros.rentabilidad_estatica}
              onChange={(e) => handleChange("financieros", "rentabilidad_estatica", e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-white border-gray-300"
              }`}
              placeholder="Ej: 25%"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderCredito = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Cantidad Solicitada (Bs)
          </label>
          <input
            type="text"
            value={formData.credito.monto_solicitado}
            onChange={(e) => handleChange("credito", "monto_solicitado", e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-white border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Cantidad Recomendada (Bs)
          </label>
          <input
            type="text"
            value={formData.credito.monto_recomendado}
            onChange={(e) => handleChange("credito", "monto_recomendado", e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-white border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          />
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Uso del Crédito
        </label>
        <textarea
          rows={3}
          value={formData.credito.uso_credito}
          onChange={(e) => handleChange("credito", "uso_credito", e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          placeholder="Describa en qué se utilizará el financiamiento"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Empleos a Generar
        </label>
        <input
          type="text"
          value={formData.credito.empleos_generar}
          onChange={(e) => handleChange("credito", "empleos_generar", e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          placeholder="Ej: 5 empleos directos, 10 indirectos"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Importancia Económica y Social del Crédito
        </label>
        <textarea
          rows={4}
          value={formData.credito.importancia_economica_social}
          onChange={(e) => handleChange("credito", "importancia_economica_social", e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          placeholder="Impacto económico y social del proyecto"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          Recomendaciones del Inspector
        </label>
        <textarea
          rows={4}
          value={formData.credito.recomendaciones}
          onChange={(e) => handleChange("credito", "recomendaciones", e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${
            darkMode
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
          placeholder="Recomendaciones para la aprobación del crédito"
        />
      </div>
    </div>
  );

  const renderFirmas = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Declaración del Informante
        </h4>
        <div className={`p-4 rounded-lg mb-4 ${darkMode ? "bg-gray-600" : "bg-white"} border ${darkMode ? "border-gray-500" : "border-gray-200"}`}>
          <p className={`text-sm italic ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            "El informante declara que los datos suministrados son ciertos y autoriza a efectuar cualquier investigación que se estime necesaria con respecto a este formato."
          </p>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-600">
          <div className="flex justify-center">
            <div className="text-center">
              <div className="mb-8 pt-4">
                <div className="w-48 h-20 border-b-2 border-gray-400 mx-auto"></div>
                <p className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Firma del Solicitante
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          Datos del Inspector
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Nombre del Inspector
            </label>
            <input
              type="text"
              value="Inspector IADEY"
              readOnly
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-gray-100 border-gray-300 text-gray-700"
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Fecha de Inspección
            </label>
            <input
              type="text"
              value={new Date().toLocaleDateString("es-ES")}
              readOnly
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? "bg-gray-600 border-gray-500 text-white"
                  : "bg-gray-100 border-gray-300 text-gray-700"
              }`}
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-center">
          <div className="text-center">
            <div className="w-48 h-20 border-b-2 border-gray-400 mx-auto"></div>
            <p className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Firma y Sello del Inspector
            </p>
          </div>
        </div>
      </div>

      {/* Croquis y fotografías (Anexos) */}
      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <h4 className={`text-md font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          XIV. Anexos — Croquis y Fotografías
        </h4>

        <div className={`p-4 rounded-lg border-2 border-dashed mb-4 ${darkMode ? "border-gray-500" : "border-gray-300"}`}>
          <p className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Croquis de la Unidad de Producción
          </p>
          {(formData.anexos.croquis_preview || formData.anexos.croquis_url) && (
            <img
              src={formData.anexos.croquis_preview || formData.anexos.croquis_url}
              alt="Croquis"
              className="max-h-48 mx-auto mb-3 rounded-lg object-contain"
            />
          )}
          <div className="text-center">
            <label className="inline-flex items-center gap-2 mt-2 px-4 py-2 text-sm bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] cursor-pointer">
              <Camera size={16} />
              {formData.anexos.croquis || formData.anexos.croquis_url ? "Cambiar croquis" : "Subir Croquis"}
              <input type="file" accept="image/*" className="hidden" onChange={handleCroquisChange} />
            </label>
          </div>
        </div>

        <div className={`p-4 rounded-lg border-2 border-dashed ${darkMode ? "border-gray-500" : "border-gray-300"}`}>
          <p className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            Fotografías de la unidad de producción
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {(formData.anexos.fotografias || []).map((foto, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={foto.preview || foto.foto_url || foto.url}
                  alt={foto.descripcion || `Foto ${idx + 1}`}
                  className="w-full h-28 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeFoto(idx)}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100"
                >
                  <Trash size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="text-center">
            <label className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#264653] text-white rounded-lg hover:bg-[#1a3542] cursor-pointer">
              <Camera size={16} />
              Agregar fotografías
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotosChange} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar el paso actual
  const currentStep = pasos[activeStep];
  const CurrentIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        <div className={`relative rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          {/* Header */}
          <div className={`sticky top-0 z-20 px-6 py-4 border-b flex items-center justify-between ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
            <div className="flex items-center gap-3">
              <ClipboardList className="text-[#2A9D8F]" size={28} />
              <div>
                <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Formulario de Inspección Técnica
                </h3>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {currentStep.title} - {currentStep.description}
                </p>
              </div>
            </div>
            <button onClick={onClose} className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}>
              <X size={24} className={darkMode ? "text-gray-400" : "text-gray-600"} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className={`sticky top-[73px] z-10 px-6 py-3 border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"} overflow-x-auto`}>
            <div className="flex gap-1 min-w-max">
              {pasos.map((paso, idx) => {
                const PasoIcon = paso.icon;
                const isActive = activeStep === idx;
                const isCompleted = activeStep > idx;
                return (
                  <button
                    key={paso.id}
                    onClick={() => setActiveStep(idx)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-[#2A9D8F] text-white"
                        : isCompleted
                        ? darkMode
                          ? "text-green-400 hover:bg-gray-700"
                          : "text-green-600 hover:bg-gray-100"
                        : darkMode
                        ? "text-gray-400 hover:bg-gray-700"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <PasoIcon size={16} />
                    <span className="hidden md:inline">{paso.title}</span>
                    {isCompleted && <CheckCircle size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 py-6">
            {renderStepContent()}
          </div>

          {/* Footer Navigation */}
          <div className={`sticky bottom-0 px-6 py-4 border-t flex justify-between ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
            <button
              onClick={prevStep}
              disabled={activeStep === 0}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeStep === 0
                  ? "opacity-50 cursor-not-allowed"
                  : darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <ChevronLeft size={18} />
              Anterior
            </button>
            
            {activeStep === pasos.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Inspección
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] flex items-center gap-2 transition-colors"
              >
                Siguiente
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default inspeccion2;