// pages/SolicitudesPersona.jsx
import React, { useState, useEffect } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import { useNavigate, useParams } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  X,
  Check,
  AlertCircle,
  User,
  Users,
} from "lucide-react";
import Swal from "sweetalert2";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";
import clasidEmprendAPI from "../services/api_clasificacion_emprendimiento";
import SolicitudAPI from "../services/api_solicitud";
import EmprendimientoAPI from "../services/api_emprendimiento";
import usuarioAPI from "../services/api_usuario";
import { esEmprendedor, puedeAccionarSolicitudes } from "../utils/roles";

// ===== SUBCOMPONENTES =====

const ValidatedInput = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  touched,
  darkMode,
  required = false,
  disabled = false,
  ...props
}) => {
  const showError = touched && error;

  const baseInputClass = `w-full px-3 py-2 text-sm rounded-md border outline-none focus:ring-1 transition-colors ${
    showError
      ? "border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10"
      : darkMode
        ? "bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
        : "bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div>
      <label
        className={`block text-sm font-medium mb-1.5 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={baseInputClass}
          {...props}
        />
      ) : type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={baseInputClass}
          {...props}
        >
          {props.children}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={baseInputClass}
          {...props}
        />
      )}
      {showError && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
};

const ActionButton = ({
  icon: Icon,
  onClick,
  tooltip,
  variant = "default",
  darkMode,
}) => {
  const variants = {
    default: darkMode
      ? "text-gray-400 hover:bg-gray-700"
      : "text-gray-500 hover:bg-gray-100",
    success:
      "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
    danger:
      "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30",
    primary:
      "text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30",
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      className={`p-1.5 rounded-md transition-colors ${variants[variant]}`}
      title={tooltip}
    >
      <Icon size={16} />
    </button>
  );
};

const EmptyState = ({ onNew, darkMode, message = "No hay solicitudes para mostrar" }) => (
  <div className="p-12 text-center">
    <FileText
      size={40}
      className={`mx-auto ${darkMode ? "text-gray-600" : "text-gray-300"} mb-3`}
    />
    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
      {message}
    </p>
    {onNew && (
      <button
        onClick={onNew}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
      >
        <Plus size={16} />
        Crear primera solicitud
      </button>
    )}
  </div>
);

const Modal = ({ title, onClose, darkMode, children }) => (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="fixed inset-0 bg-black/60" onClick={onClose}></div>
    <div className="flex min-h-full items-center justify-center p-4">
      <div
        className={`relative w-full max-w-2xl rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"} shadow-xl max-h-[90vh] overflow-y-auto`}
      >
        <div
          className={`sticky top-0 px-5 py-4 border-b ${darkMode ? "border-gray-700" : "border-gray-100"} flex justify-between items-center ${darkMode ? "bg-gray-800" : "bg-white"}`}
        >
          <h2
            className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-md ${darkMode ? "hover:bg-gray-700 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"}`}
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  </div>
);

// ===== CONSTANTES =====

const ANOS_OPERANDO = [
  "Menos de 1 año",
  "1 a 3 años",
  "3 a 5 años",
  "5 a 10 años",
  "Más de 10 años",
];

const ESTATUS_COLORES = {
  Pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  Recibido: "bg-blue-50 text-blue-700 border-blue-200",
  "Pre-Aprobado": "bg-blue-50 text-blue-700 border-blue-200",
  Aprobado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rechazado: "bg-red-50 text-red-700 border-red-200",
};

const ESTATUS_ICONOS = {
  Pendiente: Clock,
  Recibido: Clock,
  "Pre-Aprobado": Clock,
  Aprobado: CheckCircle,
  Rechazado: XCircle,
};

const etiquetaEstatus = (estatus) =>
  estatus === "Pre-Aprobado" ? "Recibido" : estatus;

const esEstatusRecibido = (estatus) =>
  estatus === "Recibido" || estatus === "Pre-Aprobado";

// ===== FUNCIONES UTILITARIAS =====

const formatMonto = (monto) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
};

const formatFecha = (fecha) => {
  if (!fecha) return "N/A";
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMontoInput = (value) => {
  const cleanValue = value.replace(/[^\d.]/g, "");
  const parts = cleanValue.split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }
  return cleanValue;
};

const parseMontoToNumber = (value) => {
  if (!value) return "";
  return value.replace(/[$,]/g, "");
};

// ===== COMPONENTE PRINCIPAL =====

const SolicitudesPersona = () => {
  const navigate = useNavigate();
  const { personaId } = useParams();

  // Estados de UI
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [activeTab, setActiveTab] = useState(() => {
    const user = usuarioAPI.getCurrentUser();
    return esEmprendedor(user) ? "mis-solicitudes" : "todas";
  });

  // Estados de datos
  const [clasificaciones, setClasificaciones] = useState([]);
  const [loadingClasificaciones, setLoadingClasificaciones] = useState(false);
  const [sectoresUnicos, setSectoresUnicos] = useState([]);
  const [actividadesPorSector, setActividadesPorSector] = useState({});

  // TABLA 1: Solicitudes del usuario logueado (solo id_rol_usu = 1)
  const [misSolicitudes, setMisSolicitudes] = useState([]);
  const [loadingMisSolicitudes, setLoadingMisSolicitudes] = useState(false);

  // TABLA 2: Todas las solicitudes (GET ALL)
  const [todasSolicitudes, setTodasSolicitudes] = useState([]);
  const [loadingTodasSolicitudes, setLoadingTodasSolicitudes] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [bloqueoNueva, setBloqueoNueva] = useState({ puede: true, motivo: "" });

  // Estados de modal y acciones
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSolicitudId, setSelectedSolicitudId] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [showCitaPreaprobModal, setShowCitaPreaprobModal] = useState(false);
  const [solicitudPreaprobId, setSolicitudPreaprobId] = useState(null);
  const [inspectores, setInspectores] = useState([]);
  const [loadingInspectores, setLoadingInspectores] = useState(false);
  const [citaForm, setCitaForm] = useState({
    id_inspector: "",
    fecha_cita: "",
    hora_inicio: "",
  });

  // Estados de formulario y validación
  const [formData, setFormData] = useState({
    cedula_persona: "",
    solicitud: "",
    monto_solicitado: "",
    fecha_solicitud: "",
    nombre_emprendimiento: "",
    direccion_empredimiento: "",
    cedula_emprendimiento: "",
    anos_experiencia: "",
    id_clasificacion: "",
    sectorEconomico: "",
    subsector: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [montoFocused, setMontoFocused] = useState(false);

  const [persona, setPersona] = useState({
    id: "",
    tipoPersona: "",
    nombreCompleto: "",
    cedula: "",
    rif: "",
    telefono: "",
    telefono2: "",
    email: "",
    email2: "",
    direccion: "",
    municipio: "",
    estado: "",
    fechaRegistro: "",
    ocupacion: "",
    estadoCivil: "",
    fechaNacimiento: "",
    nacionalidad: "",
  });

  const [notifications, setNotifications] = useState([
    { id: 1, text: "Notificaciones del sistema", time: "5 min", read: false },
  ]);

  // ===== EFECTOS =====

  useEffect(() => {
    cargarUsuarioYPersona();
    cargarClasificaciones();
    
    const user = usuarioAPI.getCurrentUser();
    if (esEmprendedor(user)) {
      setActiveTab("mis-solicitudes");
      setTodasSolicitudes([]);
      cargarMisSolicitudes();
      cargarBloqueoNueva(user);
    } else {
      cargarTodasSolicitudes();
    }
  }, []);

  // ===== FUNCIONES DE CARGA DE DATOS =====

  const cargarBloqueoNueva = async (usuarioLogueado) => {
    const cedula = usuarioLogueado?.cedula_usuario;
    if (!cedula) return;
    try {
      const res = await SolicitudAPI.puedeCrear(cedula);
      const data = res?.data || {};
      setBloqueoNueva({
        puede: data.puede !== false,
        motivo: data.motivo || "",
      });
    } catch (error) {
      console.error("Error al verificar si puede crear solicitud:", error);
    }
  };

  const cargarUsuarioYPersona = async () => {
    const usuarioLogueado = usuarioAPI.getCurrentUser();
    setCurrentUser(usuarioLogueado);

    if (usuarioLogueado?.cedula_usuario) {
      setFormData((prev) => ({
        ...prev,
        cedula_persona: usuarioLogueado.cedula_usuario,
        cedula_emprendimiento: usuarioLogueado.cedula_usuario,
      }));
      await cargarPersona(usuarioLogueado.cedula_usuario);
    } else {
      navigate("/login");
    }
  };

  const cargarPersona = async (cedula) => {
    try {
      const PersonaAPI = (await import("../services/api_persona")).default;
      const response = await PersonaAPI.getByCedula(cedula);

      if (response.success && response.data) {
        setPersona({
          id: response.data.id_persona,
          tipoPersona: response.data.tipo_persona || "Natural",
          nombreCompleto:
            response.data.nombre_completo ||
            `${response.data.nombres} ${response.data.apellidos}`,
          cedula: response.data.cedula,
          rif: response.data.rif || "",
          telefono: response.data.telefono || "",
          telefono2: response.data.telefono2 || "",
          email: response.data.email || "",
          email2: response.data.email2 || "",
          direccion: response.data.direccion || "",
          municipio: response.data.municipio || "",
          estado: response.data.estado || "",
          fechaRegistro: response.data.fecha_registro,
          ocupacion: response.data.ocupacion || "",
          estadoCivil: response.data.estado_civil || "",
          fechaNacimiento: response.data.fecha_nacimiento,
          nacionalidad: response.data.nacionalidad || "Venezolana",
        });
      }
    } catch (error) {
      console.error("Error cargando persona:", error);
    }
  };

  const cargarClasificaciones = async () => {
    setLoadingClasificaciones(true);
    try {
      const response = await clasidEmprendAPI.getAll();
      if (response.success && response.data) {
        setClasificaciones(response.data);

        const sectores = [];
        const actividadesMap = {};

        response.data.forEach((item) => {
          if (!sectores.includes(item.sector)) {
            sectores.push(item.sector);
            actividadesMap[item.sector] = [];
          }
          if (
            item.actividad &&
            !actividadesMap[item.sector].includes(item.actividad)
          ) {
            actividadesMap[item.sector].push(item.actividad);
          }
        });

        setSectoresUnicos(sectores);
        setActividadesPorSector(actividadesMap);
      }
    } catch (error) {
      console.error("Error cargando clasificaciones:", error);
    } finally {
      setLoadingClasificaciones(false);
    }
  };

  // ===== TABLA 1: Cargar solicitudes del usuario logueado (solo id_rol_usu = 1) =====
  const cargarMisSolicitudes = async () => {
    setLoadingMisSolicitudes(true);
    try {
      const usuarioLogueado = usuarioAPI.getCurrentUser();
      if (!usuarioLogueado?.cedula_usuario) {
        setMisSolicitudes([]);
        return;
      }

      if (!esEmprendedor(usuarioLogueado)) {
        setMisSolicitudes([]);
        return;
      }

      const cedula = usuarioLogueado.cedula_usuario.toString().trim();
      if (!cedula) {
        setMisSolicitudes([]);
        return;
      }

      const response = await SolicitudAPI.getByCedula(cedula);

      if (response?.success && response.data) {
        const cedulaNorm = cedula.toUpperCase();
        const solicitudesFormateadas = response.data
          .filter(
            (sol) =>
              String(sol.cedula_persona || "")
                .trim()
                .toUpperCase() === cedulaNorm
          )
          .map((sol) => ({
          id: sol.id_solicitud,
          fechaSolicitud: sol.fecha_solicitud,
          emprendimiento: sol.nombre_emprendimiento || "Sin especificar",
          rifEmprendimiento: sol.cedula_emprendimiento || sol.cedula_persona,
          montoSolicitado: parseFloat(sol.monto_solicitado) || 0,
          estatus: sol.estatus || "Pendiente",
          motivo_rechazo: sol.motivo_rechazo,
          destino: sol.solicitud,
          analista: sol.analista || "Por asignar",
          id_inspector: sol.id_inspector || null,
          inspector_nombre: (sol.inspector_nombre || "").trim() || null,
          clasificacion: sol.sector && sol.actividad
            ? `${sol.sector} - ${sol.actividad}`
            : sol.clasificacion || "No especificada",
          anos_experiencia: sol.anos_experiencia || "No especificado",
          direccion_emprendimiento: sol.direccion_empredimiento || "No especificada",
          cedula_persona: sol.cedula_persona,
          nombre_solicitante: sol.nombre_completo || `${sol.nombres || ""} ${sol.apellidos || ""}`.trim(),
        }));
        
        setMisSolicitudes(solicitudesFormateadas);
        setTodasSolicitudes([]);
      } else {
        setMisSolicitudes([]);
      }
    } catch (error) {
      console.error('Error cargando mis solicitudes:', error);
      const detalle =
        error?.error ||
        error?.message ||
        "No se pudieron cargar tus solicitudes.";
      Swal.fire({
        icon: "error",
        title: "Error al cargar solicitudes",
        text: String(detalle),
        confirmButtonColor: "#4F46E5",
      });
      setMisSolicitudes([]);
    } finally {
      setLoadingMisSolicitudes(false);
    }
  };

  // ===== TABLA 2: Todas las solicitudes (solo personal administrativo) =====
  const cargarTodasSolicitudes = async () => {
    const usuarioLogueado = usuarioAPI.getCurrentUser();
    if (esEmprendedor(usuarioLogueado)) {
      setTodasSolicitudes([]);
      setLoadingTodasSolicitudes(false);
      return;
    }

    setLoadingTodasSolicitudes(true);
    try {
      const response = await SolicitudAPI.getAll();

      if (response?.success && response.data) {
        const solicitudesFormateadas = response.data.map((sol) => ({
          id: sol.id_solicitud,
          fechaSolicitud: sol.fecha_solicitud,
          emprendimiento: sol.nombre_emprendimiento || "Sin especificar",
          rifEmprendimiento: sol.cedula_emprendimiento || sol.cedula_persona,
          montoSolicitado: parseFloat(sol.monto_solicitado) || 0,
          estatus: sol.estatus || "Pendiente",
          motivo_rechazo: sol.motivo_rechazo,
          destino: sol.solicitud,
          analista: sol.analista || "Por asignar",
          id_inspector: sol.id_inspector || null,
          inspector_nombre: (sol.inspector_nombre || "").trim() || null,
          clasificacion: sol.sector && sol.actividad
            ? `${sol.sector} - ${sol.actividad}`
            : sol.clasificacion || "No especificada",
          anos_experiencia: sol.anos_experiencia || "No especificado",
          direccion_emprendimiento: sol.direccion_empredimiento || "No especificada",
          cedula_persona: sol.cedula_persona,
          nombre_solicitante: sol.nombre_completo || sol.nombre_solicitante || "No especificado",
          id_rol_usu: sol.id_rol_usu || null,
        }));
        
        setTodasSolicitudes(solicitudesFormateadas);
      } else {
        setTodasSolicitudes([]);
      }
    } catch (error) {
      console.error('Error cargando todas las solicitudes:', error);
      const detalle =
        error?.error ||
        error?.message ||
        "No se pudieron cargar todas las solicitudes. Por favor, intenta nuevamente.";
      Swal.fire({
        icon: "error",
        title: "Error al cargar solicitudes",
        text: String(detalle),
        confirmButtonColor: "#4F46E5",
      });
      setTodasSolicitudes([]);
    } finally {
      setLoadingTodasSolicitudes(false);
    }
  };

  // ===== FUNCIONES DE VALIDACIÓN =====

  const validateField = (name, value) => {
    switch (name) {
      case "solicitud":
        if (!value?.trim())
          return "La descripción de la solicitud es requerida";
        if (value.trim().length < 10)
          return "La descripción debe tener al menos 10 caracteres";
        if (value.trim().length > 500)
          return "La descripción no debe exceder 500 caracteres";
        return "";

      case "monto_solicitado":
        if (!value && value !== 0) return "El monto es requerido";
        const cleanValue =
          typeof value === "string" ? value.replace(/[$,]/g, "") : value;
        const monto = parseFloat(cleanValue);
        if (isNaN(monto) || monto <= 0)
          return "Ingrese un monto válido mayor a 0";
        if (monto < 1) return "El monto mínimo es $1.00 USD";
        if (monto > 1000000) return "El monto máximo es $1,000,000.00 USD";
        return "";

      case "fecha_solicitud":
        if (!value) return "La fecha es requerida";
        const fechaSeleccionada = new Date(value + "T00:00:00");
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (fechaSeleccionada < hoy)
          return "La fecha no puede ser anterior a hoy";
        const fechaLimite = new Date(hoy);
        fechaLimite.setDate(fechaLimite.getDate() + 30);
        if (fechaSeleccionada > fechaLimite)
          return "La fecha no puede ser mayor a 30 días";
        return "";

      case "nombre_emprendimiento":
        if (!value?.trim()) return "El nombre del emprendimiento es requerido";
        if (value.trim().length < 3)
          return "El nombre debe tener al menos 3 caracteres";
        if (value.trim().length > 100)
          return "El nombre no debe exceder 100 caracteres";
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s.,'-]+$/.test(value.trim()))
          return "El nombre contiene caracteres no permitidos";
        return "";

      case "direccion_empredimiento":
        if (!value?.trim()) return "La dirección es requerida";
        if (value.trim().length < 10)
          return "La dirección debe tener al menos 10 caracteres";
        if (value.trim().length > 200)
          return "La dirección no debe exceder 200 caracteres";
        return "";

      case "anos_experiencia":
        if (!value) return "Seleccione los años de experiencia";
        return "";

      case "sectorEconomico":
        if (!value) return "Seleccione un sector económico";
        return "";

      case "subsector":
        if (!value) return "Seleccione una actividad";
        return "";

      default:
        return "";
    }
  };

  const validateForm = (step = currentStep) => {
    const newErrors = {};
    let isValid = true;

    const fields =
      step === 1
        ? ["solicitud", "monto_solicitado", "fecha_solicitud"]
        : [
            "nombre_emprendimiento",
            "direccion_empredimiento",
            "anos_experiencia",
            "sectorEconomico",
            "subsector",
          ];

    fields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // ===== FUNCIONES DE MANEJO DE FORMULARIO =====

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "monto_solicitado") {
      const formattedValue = formatMontoInput(value);
      setFormData((prev) => ({ ...prev, [name]: formattedValue }));
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name, formattedValue);
      setErrors((prev) => ({ ...prev, [name]: error }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setTouched((prev) => ({ ...prev, [name]: true }));

      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    }

    if (name === "sectorEconomico") {
      setFormData((prev) => ({ ...prev, subsector: "", id_clasificacion: "" }));
      setErrors((prev) => ({ ...prev, subsector: "" }));
      setTouched((prev) => ({ ...prev, subsector: false }));
    }

    if (name === "subsector") {
      const id_clasificacion = obtenerIdClasificacion(
        formData.sectorEconomico,
        value,
      );
      setFormData((prev) => ({
        ...prev,
        id_clasificacion: id_clasificacion || "",
      }));
    }
  };

  const handleMontoFocus = () => setMontoFocused(true);

  const handleMontoBlur = (e) => {
    setMontoFocused(false);
    const value = e.target.value;

    if (value) {
      const number = parseFloat(value);
      if (!isNaN(number)) {
        setFormData((prev) => ({
          ...prev,
          monto_solicitado: number.toFixed(2),
        }));
      }
    }

    setTouched((prev) => ({ ...prev, monto_solicitado: true }));
    const error = validateField("monto_solicitado", value);
    setErrors((prev) => ({ ...prev, monto_solicitado: error }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const obtenerIdClasificacion = (sector, actividad) => {
    const clasificacion = clasificaciones.find(
      (c) => c.sector === sector && c.actividad === actividad,
    );
    return clasificacion ? clasificacion.id_clasificacion : null;
  };

  // ===== FUNCIONES DE ACCIONES =====

  const handleNuevaSolicitud = async () => {
    const usuarioLogueado = usuarioAPI.getCurrentUser();
    if (!usuarioLogueado?.cedula_usuario) {
      Swal.fire({
        icon: "warning",
        title: "Atención",
        text: "Debe iniciar sesión para crear una solicitud",
        confirmButtonColor: "#4F46E5",
      });
      navigate("/login");
      return;
    }

    if (!esEmprendedor(usuarioLogueado)) {
      Swal.fire({
        icon: "warning",
        title: "Acceso denegado",
        text: "Solo los emprendedores pueden crear solicitudes",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    try {
      const res = await SolicitudAPI.puedeCrear(usuarioLogueado.cedula_usuario);
      const data = res?.data || {};
      if (data.puede === false) {
        setBloqueoNueva({ puede: false, motivo: data.motivo || "" });
        Swal.fire({
          icon: "info",
          title: "No puede solicitar otro crédito",
          text: data.motivo || "Ya tiene una solicitud pendiente o un contrato activo.",
          confirmButtonColor: "#4F46E5",
        });
        return;
      }
      setBloqueoNueva({ puede: true, motivo: "" });
    } catch (error) {
      console.error("Error al verificar nueva solicitud:", error);
    }

    setShowModal(true);
    setCurrentStep(1);
    setErrors({});
    setTouched({});
    setMontoFocused(false);
    setFormData({
      cedula_persona: usuarioLogueado.cedula_usuario,
      solicitud: "",
      monto_solicitado: "",
      fecha_solicitud: new Date().toISOString().split("T")[0],
      nombre_emprendimiento: "",
      direccion_empredimiento: "",
      cedula_emprendimiento: usuarioLogueado.cedula_usuario,
      anos_experiencia: "",
      id_clasificacion: "",
      sectorEconomico: "",
      subsector: "",
    });
  };

  const handleNextStep = () => {
    const step1Fields = ["solicitud", "monto_solicitado", "fecha_solicitud"];
    const newTouched = { ...touched };
    step1Fields.forEach((field) => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    if (validateForm(1)) {
      setCurrentStep(2);
    }
  };

  const handleGuardarSolicitud = async () => {
    const usuarioLogueado = usuarioAPI.getCurrentUser();

    if (!usuarioLogueado?.cedula_usuario) {
      Swal.fire({
        icon: "warning",
        title: "Atención",
        text: "No se ha detectado un usuario logueado",
        confirmButtonColor: "#4F46E5",
      });
      navigate("/login");
      return;
    }

    if (!esEmprendedor(usuarioLogueado)) {
      Swal.fire({
        icon: "warning",
        title: "Acceso denegado",
        text: "Solo los emprendedores pueden crear solicitudes",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    const allFields = [
      "solicitud",
      "monto_solicitado",
      "fecha_solicitud",
      "nombre_emprendimiento",
      "direccion_empredimiento",
      "anos_experiencia",
      "sectorEconomico",
      "subsector",
    ];
    const newTouched = { ...touched };
    allFields.forEach((field) => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    const newErrors = {};
    let isValid = true;
    allFields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    setErrors(newErrors);

    if (!isValid) {
      Swal.fire({
        icon: "error",
        title: "Campos incompletos",
        text:
          Object.values(newErrors)[0] ||
          "Por favor complete todos los campos requeridos correctamente",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    setSaving(true);
    try {
      const solicitudData = {
        cedula_persona: usuarioLogueado.cedula_usuario,
        solicitud: formData.solicitud.trim(),
        fecha_solicitud: formData.fecha_solicitud,
        monto_solicitado: parseFloat(
          parseMontoToNumber(formData.monto_solicitado),
        ),
        estatus: "Pendiente",
      };

      const solicitudResponse = await SolicitudAPI.create(solicitudData);
      if (!solicitudResponse.success) {
        throw new Error(
          solicitudResponse.error || "Error al crear la solicitud",
        );
      }

      const id_solicitud = solicitudResponse.data.id_solicitud;

      const emprendimientoData = {
        id_solicitud,
        id_clasificacion: parseInt(formData.id_clasificacion),
        cedula_emprendimiento: usuarioLogueado.cedula_usuario,
        anos_experiencia: formData.anos_experiencia,
        nombre_emprendimiento: formData.nombre_emprendimiento.trim(),
        direccion_empredimiento: formData.direccion_empredimiento.trim(),
      };

      const emprendimientoResponse =
        await EmprendimientoAPI.create(emprendimientoData);
      if (!emprendimientoResponse.success) {
        // No borrar (política de retención): marcar solicitud como cancelada
        try {
          await SolicitudAPI.updateEstatus(
            id_solicitud,
            "Cancelada",
            "Rollback: falló creación de emprendimiento",
          );
        } catch (_) {
          /* ignore */
        }
        throw new Error(
          emprendimientoResponse.error || "Error al crear el emprendimiento",
        );
      }

      const clasificacion = clasificaciones.find(
        (c) => c.id_clasificacion === parseInt(formData.id_clasificacion),
      );

      const nuevaSolicitudLocal = {
        id: id_solicitud,
        fechaSolicitud: formData.fecha_solicitud,
        emprendimiento: formData.nombre_emprendimiento,
        rifEmprendimiento: usuarioLogueado.cedula_usuario,
        montoSolicitado: parseFloat(formData.monto_solicitado) || 0,
        estatus: "Pendiente",
        motivo_rechazo: null,
        destino: formData.solicitud,
        analista: "Por asignar",
        clasificacion: clasificacion
          ? `${clasificacion.sector} - ${clasificacion.actividad}`
          : "No especificada",
        anos_experiencia: formData.anos_experiencia,
        direccion_emprendimiento: formData.direccion_empredimiento,
        cedula_persona: usuarioLogueado.cedula_usuario,
      };

      setMisSolicitudes([nuevaSolicitudLocal, ...misSolicitudes]);
      setShowModal(false);
      setBloqueoNueva({
        puede: false,
        motivo:
          "Ya tiene una solicitud de crédito en trámite. No puede registrar otra hasta que se rechace o se cierre el crédito.",
      });

      Swal.fire({
        icon: "success",
        title: "¡Éxito!",
        text: "Solicitud guardada exitosamente",
        confirmButtonColor: "#4F46E5",
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (error) {
      console.error("Error al guardar:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Error al guardar: ${error.error || error.message}`,
        confirmButtonColor: "#4F46E5",
      });
      if (error.code === "CREDITO_ABIERTO" || /trámite|contrato activo/i.test(error.error || "")) {
        setBloqueoNueva({ puede: false, motivo: error.error || error.message });
        setShowModal(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleVerDetalle = async (solicitudId) => {
    try {
      let solicitud = misSolicitudes.find((s) => s.id === solicitudId);
      
      if (!solicitud) {
        solicitud = todasSolicitudes.find((s) => s.id === solicitudId);
      }
      
      if (!solicitud) {
        const response = await SolicitudAPI.getById(solicitudId);
        if (response.success && response.data) {
          const data = response.data;
          solicitud = {
            id: data.id_solicitud,
            fechaSolicitud: data.fecha_solicitud,
            emprendimiento: data.nombre_emprendimiento || "Sin especificar",
            rifEmprendimiento: data.cedula_emprendimiento || data.cedula_persona,
            montoSolicitado: parseFloat(data.monto_solicitado) || 0,
            estatus: data.estatus || "Pendiente",
            motivo_rechazo: data.motivo_rechazo,
            destino: data.solicitud,
            analista: "Por asignar",
            clasificacion: data.sector && data.actividad
              ? `${data.sector} - ${data.actividad}`
              : "No especificada",
            anos_experiencia: data.anos_experiencia || "No especificado",
            direccion_emprendimiento: data.direccion_empredimiento || "No especificada",
            cedula_persona: data.cedula_persona,
          };
        }
      }

      if (solicitud) {
        setSelectedSolicitud(solicitud);
        setShowDetailModal(true);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo obtener la información de la solicitud",
          confirmButtonColor: "#4F46E5",
        });
      }
    } catch (error) {
      console.error("Error al obtener detalle:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el detalle de la solicitud",
        confirmButtonColor: "#4F46E5",
      });
    }
  };

  const handleAprobarSolicitud = async (solicitudId) => {
    setSolicitudPreaprobId(solicitudId);
    setCitaForm({ id_inspector: "", fecha_cita: "", hora_inicio: "" });
    setShowCitaPreaprobModal(true);
    setLoadingInspectores(true);
    try {
      const ins = await usuarioAPI.getInspectores();
      const list = ins?.success
        ? (ins.data || [])
        : Array.isArray(ins?.data)
          ? ins.data
          : Array.isArray(ins)
            ? ins
            : [];
      setInspectores(list);
    } catch (err) {
      console.error("Error cargando inspectores:", err);
      setInspectores([]);
    } finally {
      setLoadingInspectores(false);
    }
  };

  const handleConfirmarPreaprobacionConCita = async () => {
    if (!solicitudPreaprobId) return;
    if (!citaForm.id_inspector || !citaForm.fecha_cita || !citaForm.hora_inicio) {
      Swal.fire({
        icon: "warning",
        title: "Datos incompletos",
        text: "Debe asignar inspector, fecha y hora de la cita",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    setUpdatingStatus(true);
    try {
      const response = await SolicitudAPI.updateEstatus(
        solicitudPreaprobId,
        "Recibido",
        null,
        {
          id_inspector: parseInt(citaForm.id_inspector, 10),
          fecha_cita: citaForm.fecha_cita,
          hora_inicio: citaForm.hora_inicio,
        },
      );
      if (response.success) {
        setTodasSolicitudes((prev) =>
          prev.map((sol) =>
            sol.id === solicitudPreaprobId
              ? { ...sol, estatus: "Recibido", motivo_rechazo: null }
              : sol,
          ),
        );

        if (selectedSolicitud && selectedSolicitud.id === solicitudPreaprobId) {
          setSelectedSolicitud({
            ...selectedSolicitud,
            estatus: "Recibido",
            motivo_rechazo: null,
          });
        }

        setShowCitaPreaprobModal(false);
        setSolicitudPreaprobId(null);

        Swal.fire({
          icon: "success",
          title: "¡Recibida!",
          text: "Solicitud recibida y cita registrada exitosamente",
          confirmButtonColor: "#4F46E5",
          timer: 3000,
          timerProgressBar: true,
        });
      } else {
        throw new Error(response.error || "No se pudo pre-aprobar");
      }
    } catch (error) {
      console.error("Error al pre-aprobar:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Error al pre-aprobar: ${error.error || error.message}`,
        confirmButtonColor: "#4F46E5",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRechazarSolicitud = (solicitudId) => {
    setSelectedSolicitudId(solicitudId);
    setMotivoRechazo("");
    setShowRejectModal(true);
  };

  const handleConfirmarRechazo = async () => {
    if (!motivoRechazo.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Campo requerido",
        text: "Por favor, ingrese el motivo del rechazo",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }
    if (motivoRechazo.trim().length < 10) {
      Swal.fire({
        icon: "warning",
        title: "Motivo muy corto",
        text: "El motivo del rechazo debe tener al menos 10 caracteres",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    setUpdatingStatus(true);
    try {
      const response = await SolicitudAPI.updateEstatus(
        selectedSolicitudId,
        "Rechazado",
        motivoRechazo,
      );
      if (response.success) {
        setTodasSolicitudes((prev) =>
          prev.map((sol) =>
            sol.id === selectedSolicitudId
              ? { ...sol, estatus: "Rechazado", motivo_rechazo: motivoRechazo }
              : sol,
          ),
        );
        setMisSolicitudes((prev) =>
          prev.map((sol) =>
            sol.id === selectedSolicitudId
              ? { ...sol, estatus: "Rechazado", motivo_rechazo: motivoRechazo }
              : sol,
          ),
        );
        
        if (selectedSolicitud && selectedSolicitud.id === selectedSolicitudId) {
          setSelectedSolicitud({
            ...selectedSolicitud,
            estatus: "Rechazado",
            motivo_rechazo: motivoRechazo,
          });
        }
        setShowRejectModal(false);
        setMotivoRechazo("");
        setSelectedSolicitudId(null);

        await Swal.fire({
          icon: "success",
          title: "¡Rechazada!",
          text: "Solicitud rechazada correctamente",
          confirmButtonColor: "#4F46E5",
          timer: 3000,
          timerProgressBar: true,
        });
      } else {
        throw new Error(response.error || "No se pudo rechazar la solicitud");
      }
    } catch (error) {
      console.error("Error al rechazar:", error);
      const msg =
        error?.error ||
        error?.message ||
        (typeof error === "string" ? error : null) ||
        "Error al rechazar la solicitud";
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
        confirmButtonColor: "#4F46E5",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleLogout = () => {
    usuarioAPI.logout();
  };

  const markAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm("");
    setStatusFilter("todos");
  };

  // ===== DATOS DERIVADOS =====

  const getFilteredData = (data) => {
    return data.filter((solicitud) => {
      const matchesSearch =
        solicitud.emprendimiento
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        solicitud.id?.toString().includes(searchTerm) ||
        (activeTab === "todas" && 
          solicitud.nombre_solicitante?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "todos" ||
        solicitud.estatus === statusFilter ||
        (statusFilter === "Recibido" && esEstatusRecibido(solicitud.estatus));
      return matchesSearch && matchesStatus;
    });
  };

  const getStatusIcon = (estatus) => {
    const Icon = ESTATUS_ICONOS[estatus];
    return Icon ? <Icon size={12} /> : null;
  };

  const user = {
    name: currentUser?.nombre_completo || "Usuario",
    email: currentUser?.cedula_usuario || "",
    role: esEmprendedor(currentUser) ? "Emprendedor" : 
           currentUser?.nombre_rol || "Usuario",
    avatar: null,
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const textPrimary = darkMode ? "text-white" : "text-gray-900";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-500";
  const labelStyle = darkMode ? "text-gray-300" : "text-gray-700";

  // ===== RENDER =====

  return (
    <div
      className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}
    >
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        user={user}
        handleLogout={handleLogout}
        unreadCount={unreadCount}
        markAsRead={markAsRead}
      />

      <div className="flex flex-1">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeTab="creditos"
          setActiveTab={() => {}}
          darkMode={darkMode}
        />

        <main
          className={`flex-1 transition-all duration-200 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}
        >
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            {/* Título */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1
                  className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                >
                  Solicitudes de crédito
                </h1>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {esEmprendedor(currentUser) 
                    ? "Gestiona tus solicitudes de crédito" 
                    : "Gestiona todas las solicitudes del sistema"}
                </p>
              </div>
              <ExportButtons
                data={(esEmprendedor(currentUser) ? misSolicitudes : todasSolicitudes).map((s) => ({
                  id_solicitud: s.id,
                  cedula_persona: s.cedula_persona,
                  nombre_completo: s.nombre_solicitante || s.emprendimiento || "",
                  monto_solicitado: s.montoSolicitado,
                  fecha_solicitud: s.fechaSolicitud,
                  estatus: s.estatus,
                }))}
                columns={[
                  { key: "id_solicitud", label: "ID" },
                  { key: "cedula_persona", label: "Cédula" },
                  { key: "nombre_completo", label: "Nombre" },
                  { key: "monto_solicitado", label: "Monto" },
                  { key: "fecha_solicitud", label: "Fecha" },
                  { key: "estatus", label: "Estatus" },
                ]}
                title="Solicitudes de Crédito"
                fileName="solicitudes"
                moduloApi="solicitudes"
                darkMode={darkMode}
              />
            </div>

            {/* Tabs */}
            {currentUser && (
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto scroll-x-tabs">
                {esEmprendedor(currentUser) && (
                  <button
                    onClick={() => handleTabChange("mis-solicitudes")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "mis-solicitudes"
                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <User size={18} />
                    Mis Solicitudes
                    <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                      darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                    }`}>
                      {misSolicitudes.length}
                    </span>
                  </button>
                )}
                
                {!esEmprendedor(currentUser) && (
                  <button
                    onClick={() => handleTabChange("todas")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "todas"
                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <Users size={18} />
                    Todas las Solicitudes
                    <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                      darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                    }`}>
                      {todasSolicitudes.length}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Filtros */}
            {currentUser && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                {((esEmprendedor(currentUser) && activeTab === "mis-solicitudes") || 
                  (!esEmprendedor(currentUser) && activeTab === "todas")) && (
                  <div className="relative flex-1 w-full sm:max-w-md">
                    <Search
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder={activeTab === "mis-solicitudes" 
                        ? "Buscar por emprendimiento o ID..." 
                        : "Buscar por solicitante, emprendimiento o ID..."
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-indigo-400"
                    />
                  </div>
                )}

                {((esEmprendedor(currentUser) && activeTab === "mis-solicitudes") || 
                  (!esEmprendedor(currentUser) && activeTab === "todas")) && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-gray-400 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-10 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Recibido">Recibido</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                )}

                {activeTab === "mis-solicitudes" && esEmprendedor(currentUser) && (
                  <button
                    onClick={handleNuevaSolicitud}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    title={bloqueoNueva.puede ? "Nueva solicitud" : bloqueoNueva.motivo}
                  >
                    <Plus size={18} />
                    <span>Nueva Solicitud</span>
                  </button>
                )}
                {activeTab === "mis-solicitudes" && esEmprendedor(currentUser) && !bloqueoNueva.puede && bloqueoNueva.motivo && (
                  <p className={`w-full text-xs ${darkMode ? "text-amber-300" : "text-amber-700"}`}>
                    {bloqueoNueva.motivo}
                  </p>
                )}
              </div>
            )}

            {/* TABLA 1: Mis Solicitudes - Solo visible para emprendedores */}
            {activeTab === "mis-solicitudes" && esEmprendedor(currentUser) && (
              <div
                className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-lg border shadow-sm overflow-hidden`}
              >
                {loadingMisSolicitudes ? (
                  <div className="p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                    <p className={`text-sm ${textSecondary} mt-3`}>
                      Cargando tus solicitudes...
                    </p>
                  </div>
                ) : (
                  <>
                    {getFilteredData(misSolicitudes).length > 0 ? (
                      <div className="overflow-x-auto table-scroll">
                        <table className="w-full">
                          <thead
                            className={`${darkMode ? "bg-gray-700/50" : "bg-gray-50"} border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}
                          >
                            <tr>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                ID
                              </th>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                Emprendimiento
                              </th>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                RIF
                              </th>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                Monto
                              </th>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                Estatus
                              </th>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody
                            className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-100"}`}
                          >
                            {getFilteredData(misSolicitudes).map((solicitud) => (
                              <tr
                                key={solicitud.id}
                                className={`${darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50"} transition-colors`}
                              >
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`text-sm font-mono ${textPrimary}`}
                                  >
                                    {solicitud.id}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`text-sm font-medium ${textPrimary}`}
                                  >
                                    {solicitud.emprendimiento}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-sm ${textSecondary}`}>
                                    {solicitud.rifEmprendimiento}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`text-sm font-medium ${textPrimary}`}
                                  >
                                    {formatMonto(solicitud.montoSolicitado)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${ESTATUS_COLORES[solicitud.estatus] || "bg-gray-50 text-gray-700 border-gray-200"}`}
                                  >
                                    {getStatusIcon(solicitud.estatus)}
                                    {etiquetaEstatus(solicitud.estatus)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <ActionButton
                                      icon={Eye}
                                      onClick={() => handleVerDetalle(solicitud.id)}
                                      tooltip="Ver detalles"
                                      darkMode={darkMode}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <EmptyState 
                        onNew={handleNuevaSolicitud} 
                        darkMode={darkMode}
                        message="No tienes solicitudes creadas"
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {/* TABLA 2: Todas las Solicitudes - Solo visible para analistas y administradores */}
            {activeTab === "todas" && !esEmprendedor(currentUser) && (
              <div
                className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-lg border shadow-sm overflow-hidden`}
              >
                {loadingTodasSolicitudes ? (
                  <div className="p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                    <p className={`text-sm ${textSecondary} mt-3`}>
                      Cargando todas las solicitudes...
                    </p>
                  </div>
                ) : (
                  <>
                    {getFilteredData(todasSolicitudes).length > 0 ? (
                      <div className="overflow-x-auto table-scroll">
                        <table className="w-full">
                          <thead
                            className={`${darkMode ? "bg-gray-700/50" : "bg-gray-50"} border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}
                          >
                            <tr>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                ID
                              </th>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                Solicitante
                              </th>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                Emprendimiento
                              </th>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                Monto
                              </th>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                Estatus
                              </th>
                              <th
                                className={`px-4 py-3 text-left text-xs font-medium ${textSecondary} uppercase tracking-wider`}
                              >
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody
                            className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-100"}`}
                          >
                            {getFilteredData(todasSolicitudes).map((solicitud) => (
                              <tr
                                key={solicitud.id}
                                className={`${darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50"} transition-colors`}
                              >
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`text-sm font-mono ${textPrimary}`}
                                  >
                                    {solicitud.id}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`text-sm font-medium ${textPrimary}`}
                                  >
                                    {solicitud.nombre_solicitante || solicitud.cedula_persona}
                                    {solicitud.id_rol_usu === 1 && (
                                      <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                        Emprendedor
                                      </span>
                                    )}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`text-sm ${textPrimary}`}
                                  >
                                    {solicitud.emprendimiento}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`text-sm font-medium ${textPrimary}`}
                                  >
                                    {formatMonto(solicitud.montoSolicitado)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${ESTATUS_COLORES[solicitud.estatus] || "bg-gray-50 text-gray-700 border-gray-200"}`}
                                  >
                                    {getStatusIcon(solicitud.estatus)}
                                    {etiquetaEstatus(solicitud.estatus)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <ActionButton
                                      icon={Eye}
                                      onClick={() => handleVerDetalle(solicitud.id)}
                                      tooltip="Ver detalles"
                                      darkMode={darkMode}
                                    />
                                    {solicitud.estatus === "Pendiente" && puedeAccionarSolicitudes(currentUser) && (
                                      <ActionButton
                                        icon={CheckCircle}
                                        onClick={() => handleAprobarSolicitud(solicitud.id)}
                                        tooltip="Pre-Aprobar"
                                        variant="success"
                                        darkMode={darkMode}
                                      />
                                    )}
                                    {solicitud.estatus === "Pendiente" && puedeAccionarSolicitudes(currentUser) && (
                                      <ActionButton
                                        icon={XCircle}
                                        onClick={() => handleRechazarSolicitud(solicitud.id)}
                                        tooltip="Rechazar"
                                        variant="danger"
                                        darkMode={darkMode}
                                      />
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <EmptyState 
                        darkMode={darkMode}
                        message="No hay solicitudes en el sistema"
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Modal Nueva Solicitud */}
          {showModal && (
            <Modal
              title="Nueva Solicitud de Crédito"
              onClose={() => setShowModal(false)}
              darkMode={darkMode}
            >
              <div className="space-y-5">
                {/* Indicador de pasos */}
                <div className="flex items-center justify-center mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep === 1
                          ? "bg-indigo-600 text-white"
                          : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
                      }`}
                    >
                      1
                    </div>
                    <div
                      className={`w-16 h-1 ${currentStep === 2 ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`}
                    ></div>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep === 2
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      2
                    </div>
                  </div>
                </div>

                {/* Banner de usuario */}
                <div
                  className={`p-3 rounded-md ${darkMode ? "bg-indigo-900/30" : "bg-indigo-50"} text-sm`}
                >
                  <p
                    className={darkMode ? "text-indigo-300" : "text-indigo-800"}
                  >
                    Solicitante:{" "}
                    {persona.nombreCompleto || currentUser?.cedula_usuario}
                    {esEmprendedor(currentUser) && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                        Emprendedor
                      </span>
                    )}
                  </p>
                </div>

                {/* Paso 1: Datos de la Solicitud */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <h3 className={`text-base font-semibold ${textPrimary}`}>
                      Datos de la Solicitud
                    </h3>

                    <ValidatedInput
                      label="Motivo / Descripción"
                      name="solicitud"
                      type="textarea"
                      value={formData.solicitud}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.solicitud}
                      touched={touched.solicitud}
                      darkMode={darkMode}
                      required
                      rows="3"
                      placeholder="Describa el motivo del préstamo..."
                      maxLength={500}
                    />

                    <div>
                      <label
                        className={`block text-sm font-medium mb-1.5 ${labelStyle}`}
                      >
                        Monto Solicitado (USD){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span
                            className={`text-sm ${errors.monto_solicitado && touched.monto_solicitado ? "text-red-500" : darkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            $
                          </span>
                        </div>
                        <input
                          type="text"
                          name="monto_solicitado"
                          value={
                            montoFocused
                              ? formData.monto_solicitado
                              : formData.monto_solicitado
                                ? formatMonto(
                                    parseFloat(formData.monto_solicitado) || 0,
                                  )
                                : ""
                          }
                          onChange={handleChange}
                          onFocus={handleMontoFocus}
                          onBlur={handleMontoBlur}
                          placeholder="0.00"
                          className={`w-full pl-8 pr-3 py-2 text-sm rounded-md border outline-none focus:ring-1 ${
                            errors.monto_solicitado && touched.monto_solicitado
                              ? "border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10"
                              : darkMode
                                ? "bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
                                : "bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                          }`}
                        />
                      </div>
                      {touched.monto_solicitado && errors.monto_solicitado && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {errors.monto_solicitado}
                        </p>
                      )}
                    </div>

                    <ValidatedInput
                      label="Fecha de Solicitud"
                      name="fecha_solicitud"
                      type="date"
                      value={formData.fecha_solicitud}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.fecha_solicitud}
                      touched={touched.fecha_solicitud}
                      darkMode={darkMode}
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                )}

                {/* Paso 2: Datos del Emprendimiento */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <h3 className={`text-base font-semibold ${textPrimary}`}>
                      Datos del Emprendimiento
                    </h3>

                    <ValidatedInput
                      label="Nombre del Emprendimiento"
                      name="nombre_emprendimiento"
                      type="text"
                      value={formData.nombre_emprendimiento}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.nombre_emprendimiento}
                      touched={touched.nombre_emprendimiento}
                      darkMode={darkMode}
                      required
                      placeholder="Ej: Panadería La Espiga"
                      maxLength={100}
                    />

                    <ValidatedInput
                      label="Dirección"
                      name="direccion_empredimiento"
                      type="textarea"
                      value={formData.direccion_empredimiento}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.direccion_empredimiento}
                      touched={touched.direccion_empredimiento}
                      darkMode={darkMode}
                      required
                      rows="2"
                      placeholder="Dirección completa"
                      maxLength={200}
                    />

                    <ValidatedInput
                      label="Años de Experiencia"
                      name="anos_experiencia"
                      type="select"
                      value={formData.anos_experiencia}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.anos_experiencia}
                      touched={touched.anos_experiencia}
                      darkMode={darkMode}
                      required
                    >
                      <option value="">Seleccione</option>
                      {ANOS_OPERANDO.map((año) => (
                        <option key={año} value={año}>
                          {año}
                        </option>
                      ))}
                    </ValidatedInput>

                    <ValidatedInput
                      label="Sector Económico"
                      name="sectorEconomico"
                      type="select"
                      value={formData.sectorEconomico}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.sectorEconomico}
                      touched={touched.sectorEconomico}
                      darkMode={darkMode}
                      required
                    >
                      <option value="">Seleccione un sector</option>
                      {sectoresUnicos.map((sector) => (
                        <option key={sector} value={sector}>
                          {sector}
                        </option>
                      ))}
                    </ValidatedInput>

                    <ValidatedInput
                      label="Actividad / Subsector"
                      name="subsector"
                      type="select"
                      value={formData.subsector}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.subsector}
                      touched={touched.subsector}
                      darkMode={darkMode}
                      required
                      disabled={!formData.sectorEconomico}
                    >
                      <option value="">
                        {!formData.sectorEconomico
                          ? "Primero seleccione un sector"
                          : "Seleccione una actividad"}
                      </option>
                      {formData.sectorEconomico &&
                        actividadesPorSector[formData.sectorEconomico]?.map(
                          (actividad) => (
                            <option key={actividad} value={actividad}>
                              {actividad}
                            </option>
                          ),
                        )}
                    </ValidatedInput>
                  </div>
                )}

                {/* Botones de navegación */}
                <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() =>
                      currentStep > 1
                        ? setCurrentStep(currentStep - 1)
                        : setShowModal(false)
                    }
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      darkMode
                        ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {currentStep === 1 ? "Cancelar" : "Anterior"}
                  </button>
                  {currentStep < 2 ? (
                    <button
                      onClick={handleNextStep}
                      className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Siguiente
                    </button>
                  ) : (
                    <button
                      onClick={handleGuardarSolicitud}
                      className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Check size={16} /> Guardar
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </Modal>
          )}

          {/* Modal de Rechazo */}
          {showRejectModal && (
            <Modal
              title="Rechazar Solicitud"
              onClose={() => setShowRejectModal(false)}
              darkMode={darkMode}
            >
              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${labelStyle}`}
                >
                  Motivo del Rechazo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows="4"
                  className={`w-full px-3 py-2 text-sm rounded-md border outline-none focus:ring-1 focus:ring-red-500 ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white focus:border-red-500"
                      : "bg-white border-gray-300 text-gray-900 focus:border-red-500"
                  }`}
                  placeholder="Explique por qué se rechaza esta solicitud..."
                  autoFocus
                />

                <div className="flex justify-end gap-3 mt-5">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      darkMode
                        ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={updatingStatus}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarRechazo}
                    disabled={updatingStatus}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    {updatingStatus ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
                        Rechazar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Modal de Detalles de Solicitud */}
          {showDetailModal && selectedSolicitud && (
            <Modal
              title={`Solicitud #${selectedSolicitud.id}`}
              onClose={() => {
                setShowDetailModal(false);
                setSelectedSolicitud(null);
              }}
              darkMode={darkMode}
            >
              <div className="space-y-6">
                {/* Encabezado con estado */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full border ${
                      ESTATUS_COLORES[selectedSolicitud.estatus] ||
                      "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {getStatusIcon(selectedSolicitud.estatus)}
                    {etiquetaEstatus(selectedSolicitud.estatus)}
                  </span>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} className={textSecondary} />
                    <span className={textSecondary}>
                      {formatFecha(selectedSolicitud.fechaSolicitud)}
                    </span>
                  </div>
                </div>

                {/* Información del Emprendimiento */}
                <div>
                  <h3 className={`text-lg font-bold ${textPrimary} mb-4`}>
                    🏢 {selectedSolicitud.emprendimiento}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
                    >
                      <p
                        className={`text-xs font-medium ${textSecondary} uppercase tracking-wider mb-1`}
                      >
                        RIF / Cédula
                      </p>
                      <p className={`text-sm font-semibold ${textPrimary}`}>
                        {selectedSolicitud.rifEmprendimiento}
                      </p>
                    </div>

                    <div
                      className={`p-4 rounded-lg ${darkMode ? "bg-emerald-900/20" : "bg-emerald-50"}`}
                    >
                      <p
                        className={`text-xs font-medium ${darkMode ? "text-emerald-400" : "text-emerald-600"} uppercase tracking-wider mb-1`}
                      >
                        Monto Solicitado
                      </p>
                      <p
                        className={`text-xl font-bold ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}
                      >
                        {formatMonto(selectedSolicitud.montoSolicitado)}
                      </p>
                    </div>

                    <div
                      className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
                    >
                      <p
                        className={`text-xs font-medium ${textSecondary} uppercase tracking-wider mb-1`}
                      >
                        Años de Experiencia
                      </p>
                      <p className={`text-sm font-semibold ${textPrimary}`}>
                        {selectedSolicitud.anos_experiencia ||
                          "No especificado"}
                      </p>
                    </div>

                    <div
                      className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
                    >
                      <p
                        className={`text-xs font-medium ${textSecondary} uppercase tracking-wider mb-1`}
                      >
                        Clasificación
                      </p>
                      <p className={`text-sm font-semibold ${textPrimary}`}>
                        {selectedSolicitud.clasificacion}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Destino del Préstamo */}
                <div>
                  <p
                    className={`text-xs font-medium ${textSecondary} uppercase tracking-wider mb-2`}
                  >
                    📝 Destino del Préstamo
                  </p>
                  <div
                    className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
                  >
                    <p
                      className={`text-sm ${textPrimary} whitespace-pre-wrap leading-relaxed`}
                    >
                      {selectedSolicitud.destino || "No especificado"}
                    </p>
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <p
                    className={`text-xs font-medium ${textSecondary} uppercase tracking-wider mb-2`}
                  >
                    📍 Dirección del Emprendimiento
                  </p>
                  <div
                    className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}
                  >
                    <p className={`text-sm ${textPrimary}`}>
                      {selectedSolicitud.direccion_emprendimiento ||
                        "No especificada"}
                    </p>
                  </div>
                </div>

                {/* Motivo de Rechazo (si aplica) */}
                {selectedSolicitud.estatus === "Rechazado" &&
                  selectedSolicitud.motivo_rechazo && (
                    <div
                      className={`p-4 rounded-lg border ${
                        darkMode
                          ? "bg-red-900/20 border-red-800"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium ${
                          darkMode ? "text-red-400" : "text-red-600"
                        } uppercase tracking-wider mb-2`}
                      >
                        ❌ Motivo del Rechazo
                      </p>
                      <p
                        className={`text-sm ${darkMode ? "text-red-300" : "text-red-700"} leading-relaxed`}
                      >
                        {selectedSolicitud.motivo_rechazo}
                      </p>
                    </div>
                  )}

                {/* Botones de acción - SOLO VISIBLE PARA NO EMPRENDEDORES */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {!esEmprendedor(currentUser) && puedeAccionarSolicitudes(currentUser) && selectedSolicitud.estatus === "Pendiente" && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleAprobarSolicitud(selectedSolicitud.id);
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <CheckCircle size={16} />
                        Pre-Aprobar
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleRechazarSolicitud(selectedSolicitud.id);
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <XCircle size={16} />
                        Rechazar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedSolicitud(null);
                    }}
                    className={`w-full sm:w-auto px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      darkMode
                        ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Modal cita al pre-aprobar */}
          {showCitaPreaprobModal && (
            <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
              <div
                className={`w-full max-w-md rounded-xl shadow-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`p-5 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <h3 className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    Pre-aprobar y asignar cita
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Asigne el inspector y la fecha/hora de atención. No se puede
                    ocupar al mismo inspector dos veces a la misma hora.
                  </p>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Inspector *</label>
                    <select
                      value={citaForm.id_inspector}
                      onChange={(e) =>
                        setCitaForm((f) => ({ ...f, id_inspector: e.target.value }))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        darkMode
                          ? "bg-gray-900 border-gray-600 text-white"
                          : "border-gray-200"
                      }`}
                    >
                      <option value="">
                        {loadingInspectores
                          ? "Cargando inspectores..."
                          : "Seleccione inspector..."}
                      </option>
                      {inspectores.map((ins) => {
                        const id = ins.id ?? ins.id_usuario;
                        const nombre =
                          ins.nombre_completo ||
                          `${ins.nombres || ""} ${ins.apellidos || ""}`.trim() ||
                          ins.cedula_usuario ||
                          `Inspector #${id}`;
                        return (
                          <option key={id} value={id}>
                            {nombre}
                          </option>
                        );
                      })}
                    </select>
                    {!loadingInspectores && inspectores.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No hay inspectores registrados. Cree usuarios con rol Inspector.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                    <input
                      type="date"
                      value={citaForm.fecha_cita}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) =>
                        setCitaForm((f) => ({ ...f, fecha_cita: e.target.value }))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        darkMode
                          ? "bg-gray-900 border-gray-600 text-white"
                          : "border-gray-200"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hora *</label>
                    <input
                      type="time"
                      value={citaForm.hora_inicio}
                      onChange={(e) =>
                        setCitaForm((f) => ({ ...f, hora_inicio: e.target.value }))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        darkMode
                          ? "bg-gray-900 border-gray-600 text-white"
                          : "border-gray-200"
                      }`}
                    />
                  </div>
                </div>
                <div
                  className={`p-5 border-t flex justify-end gap-2 ${
                    darkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => {
                      setShowCitaPreaprobModal(false);
                      setSolicitudPreaprobId(null);
                    }}
                    className={`px-4 py-2 rounded-lg border text-sm ${
                      darkMode ? "border-gray-600 text-gray-300" : "border-gray-200"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus || loadingInspectores}
                    onClick={handleConfirmarPreaprobacionConCita}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
                  >
                    {updatingStatus
                      ? "Guardando..."
                      : "Confirmar pre-aprobación y cita"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <Footer darkMode={darkMode} />
        </main>
      </div>
    </div>
  );
};

export default SolicitudesPersona;