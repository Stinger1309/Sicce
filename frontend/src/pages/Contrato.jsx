import React, { useState, useEffect } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import {
  Search,
  FileSignature,
  Clock,
  TrendingUp,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  X,
  DollarSign,
  AlertCircle,
  Loader2,
  User,
  Hourglass,
  Eye,
  Gift,
  Users,
  UserCheck,
  Shield,
  Lock,
  Download,
  Camera,
} from "lucide-react";

// Componentes personalizados
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import Pagination from "../components/Pagination";
import ExportButtons from "../components/ExportButtons";

// APIs
import ContratoAPI from "../services/api_contrato";
import configuracionContratoAPI from "../services/api_configuracion_contrato";
import usuarioAPI from "../services/api_usuario";
import CuotaAPI from "../services/api_cuota";
import { blockInvalidNumberKeys, onlyDecimal } from "../utils/inputFormat";
import { uploadToImgBB } from "../services/imgbbService";

const Contrato = () => {
  const navigate = useNavigate();

  // ============================================================
  // ESTADOS - UI y navegación
  // ============================================================
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("contracts");

  // ============================================================
  // ESTADOS - Filtros y paginación
  // ============================================================
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [showFilters, setShowFilters] = useState(false);

  // ============================================================
  // ESTADOS - Sección activa (Mis Contratos / Todos los Contratos)
  // ============================================================
  const [activeSection, setActiveSection] = useState("all");

  // ============================================================
  // ESTADOS - Datos principales
  // ============================================================
  const [contractsData, setContractsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configuracionContrato, setConfiguracionContrato] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [lastContractNumber, setLastContractNumber] = useState(0);

  // ============================================================
  // ESTADOS - Usuario logueado
  // ============================================================
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // ============================================================
  // ESTADOS - Tasas de cambio
  // ============================================================
  const [tasasCambio, setTasasCambio] = useState({ dolares: null, euros: null });
  const [loadingTasas, setLoadingTasas] = useState(false);
  const [errorTasas, setErrorTasas] = useState(null);

  // ============================================================
  // ESTADOS - Modal Gestión de Contrato
  // ============================================================
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [selectedContractForGestion, setSelectedContractForGestion] = useState(null);
  const [montoBolivares, setMontoBolivares] = useState({ bruto: 0, flatMonto: 0, neto: 0 });
  const [formGestion, setFormGestion] = useState({
    numero_contrato: "",
    moneda: "usd",
    monto_moneda: "",
    cambio: "",
    flat: "",
    interes_porcentaje: "",
    devolvimiento: "",
    numero_cuotas: "",
    inicio: "",
    cierre: "",
    numero_gracias: "0",
    frecuencia_pago_contrato: "",
    morosidad: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [fotoContratoFile, setFotoContratoFile] = useState(null);
  const [fotoContratoPreview, setFotoContratoPreview] = useState("");

  // ============================================================
  // ESTADOS - Modal Consulta Contrato
  // ============================================================
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [selectedContractForConsulta, setSelectedContractForConsulta] = useState(null);

  // ============================================================
  // CONFIGURACIÓN DE ESTADOS
  // ============================================================
  const STATUS_CONFIG = {
    "Esperando contrato": {
      color: "gray",
      icon: Hourglass,
      bgColor: "bg-gray-500",
      label: "Esperando contrato",
    },
    "Pendiente por aceptar": {
      color: "yellow",
      icon: Clock,
      bgColor: "bg-yellow-500",
      label: "Pendiente por aceptar",
    },
    "Pendiente por desembolso": {
      color: "orange",
      icon: DollarSign,
      bgColor: "bg-orange-500",
      label: "Pendiente por desembolso",
    },
    "Pendiente por confirmar desembolso": {
      color: "amber",
      icon: Clock,
      bgColor: "bg-amber-500",
      label: "Pendiente por confirmar desembolso",
    },
    "Esperando aceptar desembolso": {
      color: "amber",
      icon: Clock,
      bgColor: "bg-amber-500",
      label: "Pendiente por confirmar desembolso",
    },
    Activo: {
      color: "green",
      icon: CheckCircle,
      bgColor: "bg-green-500",
      label: "Activo",
    },
    Legal: {
      color: "red",
      icon: AlertCircle,
      bgColor: "bg-red-600",
      label: "Legal",
    },
    Finalizado: {
      color: "blue",
      icon: CheckCircle,
      bgColor: "bg-blue-500",
      label: "Finalizado",
    },
    Cancelado: {
      color: "red",
      icon: CheckCircle,
      bgColor: "bg-red-500",
      label: "Cancelado",
    },
    "En espera de cuotas": {
      color: "purple",
      icon: Clock,
      bgColor: "bg-purple-500",
      label: "En espera de cuotas",
    },
  };

  // ============================================================
  // TRANSICIONES DE ESTADO VÁLIDAS
  // ============================================================
  const VALID_STATUS_TRANSITIONS = {
    "Esperando contrato": ["Activo", "Cancelado"],
    "En espera de cuotas": ["Activo", "Cancelado"],
    "Pendiente por aceptar": ["Activo", "Cancelado"],
    "Pendiente por desembolso": ["Activo", "Cancelado"],
    "Pendiente por confirmar desembolso": ["Activo", "Cancelado"],
    "Esperando aceptar desembolso": ["Activo", "Cancelado"],
    Activo: ["Finalizado", "Legal", "Cancelado"],
    Legal: ["Finalizado", "Cancelado"],
    Finalizado: [],
    Cancelado: [],
  };

  // ============================================================
  // HELPERS DE ROL / DUEÑO DEL CONTRATO
  // ============================================================
  const getUserCedula = () =>
    String(
      user?.cedula_usuario ||
        user?.cedula ||
        user?.persona?.cedula ||
        ""
    )
      .trim()
      .toUpperCase();

  const getUserRoleId = () =>
    Number(user?.id_rol_usu || user?.id_rol || 0);

  const getUserRoleName = () =>
    String(user?.nombre_rol || user?.rol || "").toLowerCase();

  const isEmprendedor = () =>
    getUserRoleId() === 2 || getUserRoleName().includes("emprendedor");

  const isStaffContrato = () => !isEmprendedor();

  const normalizeCedula = (c) => String(c || "").trim().toUpperCase();

  const esDuenoContrato = (contract) => {
    const mia = getUserCedula();
    if (!mia) return false;
    const dueño = normalizeCedula(
      contract?.cedula_persona_id ||
        contract?.id_cedula_aprob ||
        contract?.cedula
    );
    return Boolean(dueño) && mia === dueño;
  };

  // ============================================================
  // FUNCIÓN CENTRALIZADA PARA ACTUALIZAR ESTADOS
  // ============================================================
  const updateContractStatus = async (contractId, newStatus, source = "unknown") => {
    try {
      const currentContract = contractsData.find(c => c.id_aprobacion === contractId);
      if (!currentContract) {
        throw new Error("Contrato no encontrado");
      }

      const validNextStates = VALID_STATUS_TRANSITIONS[currentContract.estatus];
      if (!validNextStates || !validNextStates.includes(newStatus)) {
        throw new Error(`Transición inválida: ${currentContract.estatus} → ${newStatus}`);
      }

      const response = await ContratoAPI.updateStatus(contractId, newStatus, {
        cedula_usuario: getUserCedula(),
        nombre_rol: user?.nombre_rol || user?.rol || "",
        id_rol: getUserRoleId(),
      });
      
      if (response.success) {
        setContractsData((prevData) =>
          prevData.map((contract) =>
            contract.id_aprobacion === contractId
              ? { ...contract, estatus: newStatus }
              : contract
          )
        );
        
        console.log(`✅ Estado actualizado: ${contractId} → ${newStatus} (source: ${source})`);
        
        setNotifications((prev) => [
          { 
            id: Date.now(), 
            text: `📄 Contrato #${contractId}: estado actualizado a "${newStatus}"`, 
            time: "Ahora", 
            read: false,
            type: "success"
          },
          ...prev,
        ]);
        
        return true;
      } else {
        throw new Error(response.error || "Error en backend");
      }
    } catch (error) {
      console.error("Error actualizando estado:", error);
      const msg = error?.error || error?.message || "Error al cambiar estado";
      setNotifications((prev) => [
        { 
          id: Date.now(), 
          text: `❌ Error al cambiar estado: ${msg}`, 
          time: "Ahora", 
          read: false,
          type: "error"
        },
        ...prev,
      ]);
      return false;
    }
  };

  // ============================================================
  // FUNCIONES AUXILIARES
  // ============================================================
  const getMonedaNombre = (tipoMoneda) => {
    switch (tipoMoneda) {
      case "usd":
        return "USD";
      case "eur":
        return "EUR";
      default:
        return "VES";
    }
  };

  const getFrecuenciaPagoTexto = (frecuencia) => {
    const map = {
      semanal: "Semanal",
      quincenal: "Quincenal",
      mensual: "Mensual",
      bimestral: "Bimestral",
      trimestral: "Trimestral",
      semestral: "Semestral",
      anual: "Anual",
    };
    return map[frecuencia] || frecuencia || "No definida";
  };

  const formatMonto = (monto) => {
    return monto.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  /** Normaliza montos que pueden venir como "1.200,50", "1200.50" o número */
  const parseMontoNumero = (valor) => {
    if (valor == null || valor === "") return null;
    if (typeof valor === "number" && Number.isFinite(valor)) return valor;
    let s = String(valor).trim().replace(/[^\d.,-]/g, "");
    if (!s) return null;
    if (s.includes(",") && s.includes(".")) {
      // milésimas con punto y decimales con coma: 1.200,50
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  };

  const montoMaximoSolicitado = parseMontoNumero(
    selectedContractForGestion?.monto_solicitado ??
      selectedContractForGestion?.monto_moneda
  );

  const calcularFechaCierre = (fechaInicio, numeroCuotas, frecuenciaPago, numeroGracias = 0) => {
    if (!fechaInicio || !numeroCuotas || !frecuenciaPago) return "";

    const fecha = new Date(fechaInicio);
    const cuotas = parseInt(numeroCuotas);
    const gracias = parseInt(numeroGracias) || 0;
    const totalPeriodos = cuotas + gracias;

    if (isNaN(cuotas) || cuotas <= 0) return "";

    switch (frecuenciaPago) {
      case "semanal":
        fecha.setDate(fecha.getDate() + totalPeriodos * 7);
        break;
      case "quincenal":
        fecha.setDate(fecha.getDate() + totalPeriodos * 15);
        break;
      case "mensual":
        fecha.setMonth(fecha.getMonth() + totalPeriodos);
        break;
      case "bimestral":
        fecha.setMonth(fecha.getMonth() + totalPeriodos * 2);
        break;
      case "trimestral":
        fecha.setMonth(fecha.getMonth() + totalPeriodos * 3);
        break;
      case "semestral":
        fecha.setMonth(fecha.getMonth() + totalPeriodos * 6);
        break;
      case "anual":
        fecha.setFullYear(fecha.getFullYear() + totalPeriodos);
        break;
      default:
        fecha.setMonth(fecha.getMonth() + totalPeriodos);
    }
    return fecha.toISOString().split("T")[0];
  };

  const calcularMontoBolivares = (monto, cambio, flatPorcentaje) => {
    if (!monto || !cambio) return { bruto: 0, flatMonto: 0, neto: 0 };
    const montoNum = parseFloat(monto);
    const cambioNum = parseFloat(cambio);
    if (isNaN(montoNum) || isNaN(cambioNum)) return { bruto: 0, flatMonto: 0, neto: 0 };

    const resultadoBruto = montoNum * cambioNum;

    if (flatPorcentaje && !isNaN(parseFloat(flatPorcentaje))) {
      const flatDecimal = parseFloat(flatPorcentaje) / 100;
      const descuentoFlat = resultadoBruto * flatDecimal;
      const resultadoNeto = resultadoBruto - descuentoFlat;
      return { bruto: resultadoBruto, flatMonto: descuentoFlat, neto: resultadoNeto };
    }

    return { bruto: resultadoBruto, flatMonto: 0, neto: resultadoBruto };
  };

  const calcularDevolvimiento = (montoMoneda, porcentajeInteres) => {
    if (!montoMoneda) return 0;
    const montoNum = parseFloat(montoMoneda);
    if (isNaN(montoNum)) return 0;
    if (porcentajeInteres && !isNaN(parseFloat(porcentajeInteres))) {
      const interesDecimal = parseFloat(porcentajeInteres) / 100;
      return montoNum + montoNum * interesDecimal;
    }
    return montoNum;
  };

  // ============================================================
  // HANDLERS - Aceptar / Rechazar (solo emprendedor dueño)
  // ============================================================
  const aceptarContratoDirecto = async (contract) => {
    if (!isEmprendedor() || !esDuenoContrato(contract)) {
      Swal.fire({
        title: 'Acceso Denegado',
        text: 'Solo el emprendedor titular de este contrato puede aceptarlo.',
        icon: 'error',
        confirmButtonColor: '#d33',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Aceptar contrato?',
      html: `
        <div style="text-align: left;">
          <div style="background: ${darkMode ? '#374151' : '#f8f9fa'}; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>📄 Contrato:</strong> ${contract.numero_contrato || `#${contract.id_aprobacion}`}</p>
            <p style="margin: 5px 0;"><strong>💰 Monto:</strong> ${contract.monto_moneda} ${contract.moneda?.toUpperCase() || "USD"}</p>
            <p style="margin: 5px 0;"><strong>📊 Cuotas:</strong> ${contract.numero_cuotas}</p>
            <p style="margin: 5px 0;"><strong>📅 Período:</strong> ${contract.inicio} al ${contract.cierre}</p>
          </div>
          <p style="color: #e67e22; font-size: 13px; text-align: center;">Al aceptar confirmas los términos del crédito interno IADEY.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2A9D8F',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, aceptar contrato',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      background: darkMode ? '#1f2937' : '#ffffff',
      color: darkMode ? '#f3f4f6' : '#1f2937'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Procesando...',
      text: 'Registrando la aceptación del contrato',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const updated = await updateContractStatus(
      contract.id_aprobacion,
      "Pendiente por desembolso",
      "aceptacion_emprendedor"
    );
    
    if (updated) {
      await Swal.fire({
        title: '¡Contrato aceptado!',
        html: `<p>Estado actual: <strong>Pendiente por desembolso</strong></p>`,
        icon: 'success',
        confirmButtonColor: '#2A9D8F',
        confirmButtonText: 'Continuar',
      });
    } else {
      await Swal.fire({
        title: 'Error al aceptar contrato',
        text: 'No se pudo procesar la aceptación. Intenta nuevamente.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    }
  };

  const rechazarContratoDirecto = async (contract) => {
    if (!isEmprendedor() || !esDuenoContrato(contract)) {
      Swal.fire({
        title: 'Acceso Denegado',
        text: 'Solo el emprendedor titular de este contrato puede rechazarlo.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Rechazar contrato?',
      html: `
        <p>Vas a rechazar el contrato <strong>${contract.numero_contrato || `#${contract.id_aprobacion}`}</strong>.</p>
        <p style="margin-top:8px;color:#c0392b;font-size:13px;">Esta acción no se puede deshacer.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#2A9D8F',
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Volver',
      background: darkMode ? '#1f2937' : '#ffffff',
      color: darkMode ? '#f3f4f6' : '#1f2937'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'Procesando...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const updated = await updateContractStatus(
      contract.id_aprobacion,
      "Cancelado",
      "rechazo_emprendedor"
    );

    if (updated) {
      await Swal.fire({
        title: 'Contrato rechazado',
        text: 'El contrato quedó cancelado.',
        icon: 'success',
        confirmButtonColor: '#2A9D8F',
      });
    } else {
      await Swal.fire({
        title: 'Error al rechazar',
        text: 'No se pudo rechazar el contrato. Intenta nuevamente.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    }
  };

  // ============================================================
  // HANDLERS - Gestión de Contrato
  // ============================================================
  const validateForm = () => {
    const errors = {};
    if (!formGestion.numero_contrato.trim()) errors.numero_contrato = "El número de contrato es requerido";
    if (!formGestion.monto_moneda.trim()) errors.monto_moneda = "El monto en moneda es requerido";
    else if (isNaN(formGestion.monto_moneda) || Number(formGestion.monto_moneda) <= 0)
      errors.monto_moneda = "Ingrese un monto válido";
    else {
      const montoMax = parseMontoNumero(
        selectedContractForGestion?.monto_solicitado ??
          selectedContractForGestion?.monto_moneda
      );
      if (montoMax != null && Number(formGestion.monto_moneda) > montoMax) {
        errors.monto_moneda = `El monto no puede superar lo solicitado (${montoMax})`;
      }
    }
    if (!formGestion.devolvimiento.trim()) errors.devolvimiento = "El devolvimiento es requerido";
    else if (isNaN(formGestion.devolvimiento) || Number(formGestion.devolvimiento) <= 0)
      errors.devolvimiento = "Ingrese un devolvimiento válido";
    if (!formGestion.numero_cuotas.trim()) errors.numero_cuotas = "El número de cuotas es requerido";
    else if (isNaN(formGestion.numero_cuotas) || Number(formGestion.numero_cuotas) <= 0)
      errors.numero_cuotas = "Ingrese un número válido";

    if (formGestion.numero_gracias) {
      const gracias = parseInt(formGestion.numero_gracias);
      const cuotas = parseInt(formGestion.numero_cuotas);
      if (isNaN(gracias) || gracias < 0) errors.numero_gracias = "Ingrese un número válido";
      else if (cuotas && gracias >= cuotas) errors.numero_gracias = "Las gracias deben ser menores al número de cuotas";
    }

    if (!formGestion.inicio) errors.inicio = "La fecha de inicio es requerida";
    if (!formGestion.cierre) errors.cierre = "La fecha de cierre es requerida";
    else if (formGestion.inicio && formGestion.cierre < formGestion.inicio)
      errors.cierre = "La fecha de cierre debe ser posterior al inicio";
    if (!fotoContratoFile) errors.foto_contrato = "Debe adjuntar la foto del contrato ya firmado";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const pedirComprobanteDesembolso = async (idContrato, cedulaAprob) => {
    const pregunta = await Swal.fire({
      title: "¿Se realizó el desembolso?",
      html: `
        <p>Las cuotas ya fueron generadas. Si el desembolso se hizo al firmar el contrato, adjunte el comprobante.</p>
      `,
      icon: "question",
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonColor: "#2A9D8F",
      denyButtonColor: "#6b7280",
      confirmButtonText: "Sí, ya se desembolsó",
      denyButtonText: "Aún no",
      background: darkMode ? "#1f2937" : "#ffffff",
      color: darkMode ? "#f3f4f6" : "#1f2937",
    });

    if (!pregunta.isConfirmed) return false;

    const fileResult = await Swal.fire({
      title: "Comprobante de desembolso",
      html: `
        <p style="margin-bottom:12px;font-size:14px;">Adjunte la foto o captura del comprobante.</p>
        <input type="file" id="swal-comprobante-desembolso" accept="image/*" class="swal2-file" />
      `,
      confirmButtonColor: "#2A9D8F",
      confirmButtonText: "Guardar comprobante",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      background: darkMode ? "#1f2937" : "#ffffff",
      color: darkMode ? "#f3f4f6" : "#1f2937",
      preConfirm: () => {
        const input = document.getElementById("swal-comprobante-desembolso");
        if (!input?.files?.[0]) {
          Swal.showValidationMessage("Debe adjuntar el comprobante");
          return false;
        }
        return input.files[0];
      },
    });

    if (!fileResult.isConfirmed || !fileResult.value) return false;

    Swal.fire({
      title: "Subiendo comprobante...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const upload = await uploadToImgBB(fileResult.value);
    const response = await ContratoAPI.registrarDesembolsoInterno({
      id_cont: idContrato,
      capture_desembolso: upload.url,
      fecha_desembolso: new Date().toISOString().split("T")[0],
      cedula_desembolso: cedulaAprob,
    });
    if (!response.success) {
      throw new Error(response.error || "No se pudo registrar el desembolso");
    }
    return true;
  };

  const confirmarGestion = async () => {
    if (!validateForm()) return;

    const result = await Swal.fire({
      title: "¿Registrar contrato?",
      html: `
        <div style="text-align: left;">
          <p><strong>Número:</strong> ${formGestion.numero_contrato}</p>
          <p><strong>Emprendedor:</strong> ${selectedContractForGestion.emprendedor}</p>
          <p><strong>Monto:</strong> ${formGestion.monto_moneda} ${getMonedaNombre(formGestion.moneda)}</p>
          <p><strong>Cuotas:</strong> ${formGestion.numero_cuotas}</p>
          <p><strong>Frecuencia:</strong> ${getFrecuenciaPagoTexto(formGestion.frecuencia_pago_contrato)}</p>
          <p><strong>Valor en Bs:</strong> Bs. ${formatMonto(montoBolivares.neto)}</p>
          <p style="margin-top:8px;font-size:13px;color:#0f766e;">Se generarán las cuotas automáticamente. El emprendedor no debe aceptar el contrato.</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2A9D8F",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, registrar contrato",
      cancelButtonText: "Cancelar",
      background: darkMode ? "#1f2937" : "#ffffff",
      color: darkMode ? "#f3f4f6" : "#1f2937",
    });

    if (!result.isConfirmed) return;

    setSubmitting(true);

    Swal.fire({
      title: "Registrando contrato...",
      text: "Subiendo foto y generando cuotas",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const idConfig =
        configuracionContrato?.id_configuracion ||
        selectedContractForGestion.id_config ||
        1;
      const cedulaAprob =
        selectedContractForGestion.cedula_persona_id ||
        selectedContractForGestion.id_cedula_aprob ||
        selectedContractForGestion.cedula;

      if (!cedulaAprob) {
        throw new Error("No se encontró la cédula del emprendedor para el contrato");
      }

      const fotoUpload = await uploadToImgBB(fotoContratoFile);

      const contratoData = {
        id_aprob: selectedContractForGestion.id_aprobacion,
        id_config: idConfig,
        id_cedula_aprob: cedulaAprob,
        numero_contrato: formGestion.numero_contrato,
        moneda: getMonedaNombre(formGestion.moneda),
        monto_moneda: String(parseFloat(formGestion.monto_moneda)),
        cambio: `Bs. ${formatMonto(montoBolivares.neto)}`,
        flat: `- Bs ${formatMonto(montoBolivares.flatMonto)}`,
        interes: `${(
          parseFloat(formGestion.monto_moneda) *
          (parseFloat(formGestion.interes_porcentaje || 0) / 100)
        ).toFixed(2)} ${getMonedaNombre(formGestion.moneda)}`,
        devolvimiento: String(parseFloat(formGestion.devolvimiento)),
        numero_cuotas: String(parseInt(formGestion.numero_cuotas, 10)),
        numero_gracias: String(parseInt(formGestion.numero_gracias, 10) || 0),
        inicio: formGestion.inicio,
        cierre: formGestion.cierre,
        frecuencia_pago_contrato: formGestion.frecuencia_pago_contrato,
        morosidad: String(parseFloat(formGestion.morosidad) || 0),
        foto_contrato: fotoUpload.url,
      };

      const response = await ContratoAPI.create(contratoData);
      if (!response.success) {
        throw new Error(response.error || "Error al registrar el contrato");
      }

      const idContrato = response.data?.id_contrato;
      let desembolsado = false;
      if (idContrato) {
        try {
          desembolsado = await pedirComprobanteDesembolso(idContrato, cedulaAprob);
        } catch (desErr) {
          console.error(desErr);
          await Swal.fire({
            title: "Contrato registrado",
            text: desErr?.message || "Las cuotas se generaron, pero no se pudo guardar el comprobante. Puede cargarlo después.",
            icon: "warning",
            confirmButtonColor: "#2A9D8F",
          });
        }
      }

      setContractsData((prevData) =>
        prevData.map((contract) =>
          contract.id_aprobacion === selectedContractForGestion.id_aprobacion
            ? {
                ...contract,
                ...response.data,
                id_contrato: idContrato || contract.id_contrato,
                estatus: "Activo",
                numero_cuotas: formGestion.numero_cuotas,
                numero_gracias: parseInt(formGestion.numero_gracias, 10) || 0,
                inicio: formGestion.inicio,
                cierre: formGestion.cierre,
                numero_contrato: formGestion.numero_contrato,
                moneda: formGestion.moneda,
                monto_moneda: parseFloat(formGestion.monto_moneda),
                cambio: `Bs. ${formatMonto(montoBolivares.neto)}`,
                flat: `- Bs ${formatMonto(montoBolivares.flatMonto)}`,
                interes_porcentaje: parseFloat(formGestion.interes_porcentaje),
                devolvimiento: parseFloat(formGestion.devolvimiento),
                frecuencia_pago_contrato: formGestion.frecuencia_pago_contrato,
                morosidad: parseFloat(formGestion.morosidad) || 0,
                id_cedula_aprob: cedulaAprob,
                foto_contrato: fotoUpload.url,
                capture_desembolso: desembolsado ? "ok" : contract.capture_desembolso,
              }
            : contract
        )
      );

      setLastContractNumber((prev) => prev + 1);
      setNotifications((prev) => [
        {
          id: Date.now(),
          text: `Contrato ${formGestion.numero_contrato} registrado y cuotas generadas`,
          time: "Ahora",
          read: false,
        },
        ...prev,
      ]);
      setShowGestionModal(false);
      setSelectedContractForGestion(null);
      setFotoContratoFile(null);
      setFotoContratoPreview("");

      await Swal.fire({
        title: "¡Contrato registrado!",
        html: `
          El contrato <strong>${formGestion.numero_contrato}</strong> quedó <strong>Activo</strong>.<br/>
          Se generaron las cuotas. El emprendedor ya puede pagar desde Pago de Cuota.
        `,
        icon: "success",
        confirmButtonColor: "#2A9D8F",
        confirmButtonText: "Continuar",
      });
    } catch (error) {
      const msg =
        error?.error ||
        error?.message ||
        (typeof error === "string" ? error : null) ||
        "Ocurrió un error inesperado";
      await Swal.fire({
        title: "Error al registrar contrato",
        text: msg,
        icon: "error",
        confirmButtonColor: "#d33",
      });
      setFormErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const cerrarModalGestion = () => {
    setShowGestionModal(false);
    setSelectedContractForGestion(null);
    setFormErrors({});
    setMontoBolivares({ bruto: 0, flatMonto: 0, neto: 0 });
    setFotoContratoFile(null);
    setFotoContratoPreview("");
  };

  // ============================================================
  // HANDLERS - Inputs del formulario de gestión
  // ============================================================
  const handleMontoMonedaChange = (value) => {
    let clean = onlyDecimal(value, 2);
    const montoMax = parseMontoNumero(
      selectedContractForGestion?.monto_solicitado ??
        selectedContractForGestion?.monto_moneda
    );

    if (clean !== "" && montoMax != null && Number(clean) > montoMax) {
      clean = String(montoMax);
      setFormErrors((prev) => ({
        ...prev,
        monto_moneda: `Máximo permitido: ${montoMax} (monto solicitado)`,
      }));
    } else {
      setFormErrors((prev) => {
        if (!prev.monto_moneda) return prev;
        const { monto_moneda, ...rest } = prev;
        return rest;
      });
    }

    setFormGestion((prev) => ({ ...prev, monto_moneda: clean }));
    if (clean && formGestion.cambio) {
      const montoCalculado = calcularMontoBolivares(clean, formGestion.cambio, formGestion.flat);
      setMontoBolivares(montoCalculado);
    } else {
      setMontoBolivares({ bruto: 0, flatMonto: 0, neto: 0 });
    }
    if (clean && formGestion.interes_porcentaje) {
      const devolvimientoCalculado = calcularDevolvimiento(clean, formGestion.interes_porcentaje);
      setFormGestion((prev) => ({ ...prev, devolvimiento: devolvimientoCalculado.toString() }));
    } else if (clean && !formGestion.interes_porcentaje) {
      setFormGestion((prev) => ({ ...prev, devolvimiento: clean }));
    }
  };

  const handleInteresPorcentajeChange = (value) => {
    setFormGestion((prev) => ({ ...prev, interes_porcentaje: value }));
    if (formGestion.monto_moneda && value) {
      const devolvimientoCalculado = calcularDevolvimiento(formGestion.monto_moneda, value);
      setFormGestion((prev) => ({ ...prev, devolvimiento: devolvimientoCalculado.toString() }));
    } else if (formGestion.monto_moneda && !value) {
      setFormGestion((prev) => ({ ...prev, devolvimiento: formGestion.monto_moneda }));
    }
  };

  const handleNumeroCuotasChange = (value) => {
    setFormGestion((prev) => ({ ...prev, numero_cuotas: value }));
    if (formGestion.inicio && value && configuracionContrato?.frecuencia_pago) {
      const fechaCierre = calcularFechaCierre(
        formGestion.inicio,
        value,
        configuracionContrato.frecuencia_pago,
        formGestion.numero_gracias
      );
      if (fechaCierre) setFormGestion((prev) => ({ ...prev, cierre: fechaCierre }));
    }
  };

  const handleFechaInicioChange = (value) => {
    setFormGestion((prev) => ({ ...prev, inicio: value }));
    if (value && formGestion.numero_cuotas && configuracionContrato?.frecuencia_pago) {
      const fechaCierre = calcularFechaCierre(
        value,
        formGestion.numero_cuotas,
        configuracionContrato.frecuencia_pago,
        formGestion.numero_gracias
      );
      if (fechaCierre) setFormGestion((prev) => ({ ...prev, cierre: fechaCierre }));
    }
  };

  const handleInputChange = (field, value) => {
    if (field === "interes_porcentaje") {
      handleInteresPorcentajeChange(value);
    } else if (field === "numero_cuotas") {
      handleNumeroCuotasChange(value);
    } else if (field === "inicio") {
      handleFechaInicioChange(value);
    } else if (field === "numero_gracias") {
      setFormGestion((prev) => ({ ...prev, numero_gracias: value }));
      if (formGestion.inicio && formGestion.numero_cuotas && configuracionContrato?.frecuencia_pago) {
        const fechaCierre = calcularFechaCierre(
          formGestion.inicio,
          formGestion.numero_cuotas,
          configuracionContrato.frecuencia_pago,
          value
        );
        if (fechaCierre) setFormGestion((prev) => ({ ...prev, cierre: fechaCierre }));
      }
    } else {
      setFormGestion((prev) => ({ ...prev, [field]: value }));
    }
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ============================================================
  // EFECTO - Cargar usuario logueado
  // ============================================================
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoadingUser(true);
        
        const currentUser = usuarioAPI.getCurrentUser();
        
        if (currentUser) {
          console.log('Usuario logueado:', currentUser);
          setUser(currentUser);
        } else {
          console.warn('No hay usuario logueado');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        navigate('/login');
      } finally {
        setLoadingUser(false);
      }
    };
    
    loadUser();
  }, [navigate]);

  // ============================================================
  // EFECTOS - Carga de datos iniciales
  // ============================================================
  useEffect(() => {
    const fetchConfiguracion = async () => {
      try {
        setLoadingConfig(true);
        const response = await configuracionContratoAPI.getCurrent();
        if (response.success && response.data) setConfiguracionContrato(response.data);
      } catch (error) {
        console.error("Error cargando configuración:", error);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfiguracion();
  }, []);

  useEffect(() => {
    const fetchTasasCambio = async () => {
      try {
        setLoadingTasas(true);
        setErrorTasas(null);
        const [dolaresResponse, eurosResponse] = await Promise.all([
          fetch("https://ve.dolarapi.com/v1/dolares"),
          fetch("https://ve.dolarapi.com/v1/euros"),
        ]);

        const dolaresData = await dolaresResponse.json();
        const eurosData = await eurosResponse.json();

        let tasaDolar = null;
        let tasaEuro = null;

        if (Array.isArray(dolaresData) && dolaresData.length > 0) {
          const tasaBCV = dolaresData.find((d) => d.nombre?.toLowerCase().includes("bcv"));
          tasaDolar = tasaBCV?.promedio || dolaresData[0]?.promedio || dolaresData[0]?.valor || null;
        }
        if (Array.isArray(eurosData) && eurosData.length > 0) {
          const tasaBCV = eurosData.find((d) => d.nombre?.toLowerCase().includes("bcv"));
          tasaEuro = tasaBCV?.promedio || eurosData[0]?.promedio || eurosData[0]?.valor || null;
        }

        setTasasCambio({ dolares: tasaDolar, euros: tasaEuro });
      } catch (error) {
        console.error("Error cargando tasas:", error);
        setErrorTasas(error.message);
      } finally {
        setLoadingTasas(false);
      }
    };

    fetchTasasCambio();
    const interval = setInterval(fetchTasasCambio, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // EFECTO - Cargar contratos según sección activa
  // ============================================================
  useEffect(() => {
    const fetchContratos = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);

        const cedulaUsuario = String(
          user?.cedula_usuario || user?.cedula || user?.persona?.cedula || ""
        ).trim();
        const rolId = Number(user?.id_rol_usu || user?.id_rol || 0);
        const rolNombre = String(user?.nombre_rol || user?.rol || "").toLowerCase();
        const esEmprendedorUser =
          rolId === 2 || rolNombre.includes("emprendedor");

        // Emprendedor: solo sus contratos. Staff: cola completa Interno.
        const response = esEmprendedorUser
          ? await ContratoAPI.getByCedula(cedulaUsuario)
          : await ContratoAPI.getAll();

        if (response.success) {
          const dataConDefaults = (response.data || []).map((item) => ({
            ...item,
            numero_cuotas: item.numero_cuotas || "Sin definir",
            inicio: item.inicio || "Sin definir",
            cierre: item.cierre || "Sin definir",
            estatus: item.estatus || "Esperando contrato",
            emprendedor: (item.emprendedor || "").trim() || "Sin definir",
            numero_contrato: item.numero_contrato || "",
            moneda: item.moneda || "usd",
            monto_moneda: item.monto_moneda || item.monto_solicitado || null,
            cambio: item.cambio || null,
            flat: item.flat || null,
            interes_porcentaje: item.interes_porcentaje || item.interes || null,
            devolvimiento: item.devolvimiento || null,
            numero_gracias: item.numero_gracias || 0,
            frecuencia_pago_contrato: item.frecuencia_pago_contrato || null,
            id_cedula_aprob: item.id_cedula_aprob || item.cedula_persona_id || null,
            cedula_persona_id: item.cedula_persona_id || item.id_cedula_aprob || item.cedula || null,
            morosidad: item.morosidad || 0,
            codigo_expediente: item.codigo_expediente || null,
            foto_contrato: item.foto_contrato || null,
            capture_desembolso: item.capture_desembolso || null,
          }));
          setContractsData(dataConDefaults);
          console.log(`✅ ${dataConDefaults.length} contratos cargados`);
        } else {
          setError(response.error || "Error al cargar los contratos");
        }
      } catch (err) {
        console.error('Error en fetchContratos:', err);
        setError(err.error || "Error al conectar con el servidor");
      } finally {
        setLoading(false);
      }
    };
    
    fetchContratos();
  }, [user, activeSection]);

  // ============================================================
  // EFECTO - Sección inicial: listado operativo de contratos
  // ============================================================
  useEffect(() => {
    if (user) {
      setActiveSection("all");
    }
  }, [user]);

  // ============================================================
  // EFECTO - Obtener último número de contrato
  // ============================================================
  useEffect(() => {
    const fetchLastContract = async () => {
      try {
        const response = await ContratoAPI.getLastContractNumber();
        if (response.success && response.data) {
          const lastNumber = response.data.numero_contrato;
          if (lastNumber) {
            const parts = lastNumber.split("-");
            if (parts.length === 3) setLastContractNumber(parseInt(parts[2]) || 0);
          }
        }
      } catch (error) {
        const contractsWithNumbers = contractsData.filter(
          (c) => c.numero_contrato && c.numero_contrato.startsWith("IADEY-")
        );
        if (contractsWithNumbers.length > 0) {
          const numbers = contractsWithNumbers.map((c) => {
            const parts = c.numero_contrato.split("-");
            return parseInt(parts[2]) || 0;
          });
          setLastContractNumber(Math.max(...numbers));
        }
      }
    };
    if (contractsData.length > 0) fetchLastContract();
  }, [contractsData]);

  // ============================================================
  // EFECTO - Configurar modal de gestión
  // ============================================================
  useEffect(() => {
    if (showGestionModal && selectedContractForGestion && configuracionContrato) {
      const currentYear = new Date().getFullYear();
      const nextNumber = lastContractNumber + 1;
      const formattedNumber = String(nextNumber).padStart(3, "0");
      const numeroContratoAuto = `IADEY-${currentYear}-${formattedNumber}`;

      const monedaConfig = configuracionContrato.tipo_moneda || "usd";
      let tasaCambio = "";
      if (monedaConfig === "usd" && tasasCambio.dolares) tasaCambio = tasasCambio.dolares.toString();
      else if (monedaConfig === "eur" && tasasCambio.euros) tasaCambio = tasasCambio.euros.toString();

      const fechaInicioDefault = new Date().toISOString().split("T")[0];
      const cuotasObligatorias =
        configuracionContrato.cuotas_obligatorias?.toString() ||
        (selectedContractForGestion.numero_cuotas !== "Sin definir" ? selectedContractForGestion.numero_cuotas : "");
      const graciasConfig =
        configuracionContrato.cuotas_gracia?.toString() ||
        selectedContractForGestion.numero_gracias?.toString() ||
        "0";

      let fechaCierreDefault = "";
      if (fechaInicioDefault && cuotasObligatorias && configuracionContrato.frecuencia_pago) {
        fechaCierreDefault = calcularFechaCierre(
          fechaInicioDefault,
          cuotasObligatorias,
          configuracionContrato.frecuencia_pago,
          graciasConfig
        );
      }

      const morosidadValue = configuracionContrato.morosidad_porcentaje || 0;

      // Monto preseleccionado = lo solicitado por el emprendedor (tope máximo editable)
      const montoSolicitadoNum = parseMontoNumero(
        selectedContractForGestion.monto_solicitado ??
          selectedContractForGestion.monto_moneda
      );
      const montoPreseleccionado =
        montoSolicitadoNum != null ? String(montoSolicitadoNum) : "";

      let devolvimientoInicial = "";
      if (montoPreseleccionado) {
        const interesCfg = configuracionContrato.interes_porcentaje?.toString() || "";
        devolvimientoInicial = interesCfg
          ? String(calcularDevolvimiento(montoPreseleccionado, interesCfg))
          : montoPreseleccionado;
      }

      const montoCalcInicial =
        montoPreseleccionado && tasaCambio
          ? calcularMontoBolivares(
              montoPreseleccionado,
              tasaCambio,
              configuracionContrato.flat_porcentaje?.toString() || ""
            )
          : { bruto: 0, flatMonto: 0, neto: 0 };

      setFormGestion({
        numero_contrato: numeroContratoAuto,
        moneda: monedaConfig,
        monto_moneda: montoPreseleccionado,
        cambio: tasaCambio,
        flat: configuracionContrato.flat_porcentaje?.toString() || "",
        interes_porcentaje: configuracionContrato.interes_porcentaje?.toString() || "",
        devolvimiento: devolvimientoInicial,
        numero_cuotas: cuotasObligatorias,
        inicio: fechaInicioDefault,
        cierre: fechaCierreDefault,
        numero_gracias: graciasConfig,
        frecuencia_pago_contrato: configuracionContrato.frecuencia_pago || "",
        morosidad: morosidadValue.toString()
      });
      setMontoBolivares(montoCalcInicial);
      setFormErrors({});
    }
  }, [showGestionModal, selectedContractForGestion, lastContractNumber, configuracionContrato, tasasCambio]);

  // ============================================================
  // RENDER - Datos de sección y estadísticas
  // ============================================================
  const contratosActivos = contractsData.filter((c) => c.estatus === "Activo").length;
  const contratosSinDesembolso = contractsData.filter(
    (c) => c.estatus === "Activo" && c.id_contrato && !c.capture_desembolso
  ).length;
  const contratosEsperando = contractsData.filter((c) => c.estatus === "Esperando contrato").length;
  const contratosFinalizados = contractsData.filter((c) => c.estatus === "Finalizado").length;

  const sectionData = {
    contracts: {
      title: "Todos los Contratos",
      description: "Listado completo de contratos del sistema",
      stats: [
        { id: 1, title: "Contratos Activos", value: contratosActivos, icon: CheckCircle, color: "green", bgColor: "bg-green-50", textColor: "text-green-600" },
        { id: 2, title: "Sin comprobante", value: contratosSinDesembolso, icon: DollarSign, color: "orange", bgColor: "bg-orange-50", textColor: "text-orange-600" },
        { id: 3, title: "Esperando registro", value: contratosEsperando, icon: Hourglass, color: "gray", bgColor: "bg-gray-50", textColor: "text-gray-600" },
        { id: 4, title: "Finalizados", value: contratosFinalizados, icon: CheckCircle, color: "blue", bgColor: "bg-blue-50", textColor: "text-blue-600" },
      ],
    },
    myContracts: {
      title: "Mis Contratos",
      description: "Contratos creados por mí",
      stats: [
        { id: 1, title: "Mis Activos", value: contratosActivos, icon: CheckCircle, color: "green", bgColor: "bg-green-50", textColor: "text-green-600" },
        { id: 2, title: "Sin comprobante", value: contratosSinDesembolso, icon: DollarSign, color: "orange", bgColor: "bg-orange-50", textColor: "text-orange-600" },
        { id: 3, title: "Esperando", value: contratosEsperando, icon: Hourglass, color: "gray", bgColor: "bg-gray-50", textColor: "text-gray-600" },
        { id: 4, title: "Finalizados", value: contratosFinalizados, icon: CheckCircle, color: "blue", bgColor: "bg-blue-50", textColor: "text-blue-600" },
      ],
    }
  };

  const currentData = activeSection === "my" ? sectionData.myContracts : sectionData.contracts;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getContractsToShow = () => {
    return contractsData;
  };

  const filteredContracts = getContractsToShow().filter((contract) => {
    const searchFields = [
      contract.id_aprobacion?.toString(), 
      contract.emprendedor, 
      contract.estatus, 
      contract.numero_contrato
    ].join(" ").toLowerCase();
    const matchesSearch = searchFields.includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === "all" || contract.estatus?.toLowerCase() === selectedFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredContracts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);

  // ============================================================
  // RENDER - Componentes de UI
  // ============================================================
  const getStatusComponent = (contract) => {
    const statusConfig = STATUS_CONFIG[contract.estatus];
    if (!statusConfig) {
      return (
        <span className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg text-sm font-medium`}>
          <AlertCircle size={14} />
          {contract.estatus || "Desconocido"}
        </span>
      );
    }
    const IconComponent = statusConfig.icon;
    return (
      <span 
        className={`inline-flex items-center gap-2 px-4 py-2 ${statusConfig.bgColor} text-white rounded-lg text-sm font-medium`}
      >
        <IconComponent size={14} />
        {statusConfig.label}
      </span>
    );
  };

  // ============================================================
  // RENDER - botones de acción según estatus y rol
  // ============================================================
  const getActionButtons = (contract) => {
    const actions = [];
    const estatus = contract.estatus || "Esperando contrato";
    const btnBase =
      "inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shadow-sm";
    const staff = isStaffContrato();

    actions.push(
      <button
        key="ver"
        type="button"
        onClick={() => {
          setSelectedContractForConsulta(contract);
          setShowConsultaModal(true);
        }}
        className={`${btnBase} ${
          darkMode
            ? "bg-slate-600 hover:bg-slate-500 text-white"
            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
        }`}
        title="Ver detalles"
      >
        <Eye size={13} /> Ver
      </button>
    );

    // Solo personal IADEY registra el contrato interno
    if (staff && estatus === "Esperando contrato") {
      actions.push(
        <button
          key="gestionar"
          type="button"
          onClick={() => {
            setSelectedContractForGestion(contract);
            setShowGestionModal(true);
          }}
          className={`${btnBase} bg-[#2A9D8F] hover:bg-[#238b7e] text-white`}
          title="Registrar contrato"
        >
          <FileSignature size={13} /> Registrar contrato
        </button>
      );
    }

    if (
      staff &&
      contract.id_contrato &&
      estatus === "Activo" &&
      !contract.capture_desembolso
    ) {
      actions.push(
        <button
          key="desembolsar"
          type="button"
          onClick={async () => {
            try {
              const cedulaAprob =
                contract.cedula_persona_id ||
                contract.id_cedula_aprob ||
                contract.cedula;
              const ok = await pedirComprobanteDesembolso(contract.id_contrato, cedulaAprob);
              if (ok) {
                setContractsData((prev) =>
                  prev.map((c) =>
                    c.id_contrato === contract.id_contrato
                      ? { ...c, capture_desembolso: "ok", estatus_desembolso: "Confirmado" }
                      : c
                  )
                );
                await Swal.fire({
                  title: "Desembolso registrado",
                  icon: "success",
                  confirmButtonColor: "#2A9D8F",
                });
              }
            } catch (err) {
              Swal.fire({
                title: "Error",
                text: err?.error || err?.message || "No se pudo registrar el desembolso",
                icon: "error",
                confirmButtonColor: "#d33",
              });
            }
          }}
          className={`${btnBase} bg-amber-500 hover:bg-amber-600 text-white`}
          title="Registrar comprobante de desembolso"
        >
          <DollarSign size={13} /> Comprobante desembolso
        </button>
      );
    }

    if (
      staff &&
      ["Pendiente por desembolso", "Activo", "En espera de cuotas"].includes(estatus)
    ) {
      actions.push(
        <button
          key="cancelar"
          type="button"
          onClick={() => {
            Swal.fire({
              title: "¿Cancelar contrato?",
              text: "Esta acción no se puede deshacer.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#d33",
              cancelButtonColor: "#2A9D8F",
              confirmButtonText: "Sí, cancelar",
              cancelButtonText: "No",
            }).then((result) => {
              if (result.isConfirmed) {
                updateContractStatus(contract.id_aprobacion, "Cancelado", "cancelacion");
              }
            });
          }}
          className={`${btnBase} ${
            darkMode
              ? "bg-red-900/40 hover:bg-red-800 text-red-200 border border-red-700"
              : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
          }`}
          title="Cancelar contrato"
        >
          <X size={13} /> Cancelar
        </button>
      );
    }

    if (estatus === "Finalizado") {
      actions.push(
        <button
          key="cumplimiento"
          type="button"
          onClick={async () => {
            try {
              const blob = await CuotaAPI.descargarCumplimientoPdf(contract.id_contrato);
              const url = window.URL.createObjectURL(new Blob([blob]));
              const a = document.createElement("a");
              a.href = url;
              a.download = `cumplimiento_${contract.numero_contrato || contract.id_contrato}.pdf`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (error) {
              Swal.fire({
                title: "Error",
                text: error?.error || error?.message || "No se pudo descargar el PDF",
                icon: "error",
                confirmButtonColor: "#d33",
              });
            }
          }}
          className={`${btnBase} bg-[#2A9D8F] hover:bg-[#264653] text-white`}
          title="PDF de cumplimiento"
        >
          <Download size={13} /> PDF Cumplimiento
        </button>
      );
    }

    return (
      <div className="flex items-center justify-end gap-1.5 flex-wrap max-w-[300px] ml-auto">
        {actions}
      </div>
    );
  };

  const handleLogout = () => {
    usuarioAPI.logout();
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".notifications-menu") && !e.target.closest(".user-menu")) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilter, activeSection]);

  // ============================================================
  // RENDER - Estados de carga y errores
  // ============================================================
  if (loadingUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-[#2A9D8F]" />
          <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Cargando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>Usuario no autenticado</h2>
        <p className={`text-center mb-6 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          Por favor, inicia sesión para acceder a la gestión de contratos.
        </p>
        <button 
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#238b7e] transition-colors"
        >
          Ir al Login
        </button>
      </div>
    );
  }

  const userRole = user?.id_rol_usu || user?.id_rol || 0;
  const isAdmin = userRole === 1;

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <div className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}>
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
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} darkMode={darkMode} />

        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span>Inicio</span>
                <ChevronRight size={14} />
                <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                  Contratos
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    Contratos (manejo interno)
                  </h1>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Aprobaciones con manejo interno listas para generar o dar seguimiento al contrato
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ExportButtons
                    data={contractsData.map((c) => ({
                      id_aprobacion: c.id_aprobacion,
                      numero_contrato: c.numero_contrato,
                      emprendedor: c.emprendedor,
                      id_cedula_aprob: c.id_cedula_aprob,
                      estatus: c.estatus,
                      monto_moneda: c.monto_moneda,
                      moneda: c.moneda,
                      numero_cuotas: c.numero_cuotas,
                      inicio: c.inicio,
                      cierre: c.cierre,
                    }))}
                    columns={[
                      { key: "id_aprobacion", label: "ID" },
                      { key: "numero_contrato", label: "N° Contrato" },
                      { key: "emprendedor", label: "Emprendedor" },
                      { key: "id_cedula_aprob", label: "Cédula" },
                      { key: "estatus", label: "Estatus" },
                      { key: "monto_moneda", label: "Monto" },
                      { key: "moneda", label: "Moneda" },
                      { key: "numero_cuotas", label: "Cuotas" },
                      { key: "inicio", label: "Inicio" },
                      { key: "cierre", label: "Cierre" },
                    ]}
                    title="Contratos"
                    fileName="contratos"
                    moduloApi="contratos"
                    darkMode={darkMode}
                  />
                  {isAdmin && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${darkMode ? "bg-green-900/30 text-green-400" : "bg-green-50 text-green-700"} text-sm font-medium`}>
                      <Shield size={16} />
                      Administrador
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* BOTONES DE SECCIÓN */}
            {/* ============================================================ */}
            <div className="flex flex-wrap gap-3 mb-6">
              {isAdmin ? (
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-[#2A9D8F] text-white shadow-md cursor-default"
                >
                  <UserCheck size={18} />
                  Mis Contratos
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {contractsData.length}
                  </span>
                </button>
              ) : (
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-[#2A9D8F] text-white shadow-md cursor-default"
                >
                  <Users size={18} />
                  Todos los Contratos
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {contractsData.length}
                  </span>
                </button>
              )}
            </div>

            {/* ============================================================ */}
            {/* ESTADÍSTICAS DE LA SECCIÓN ACTIVA */}
            {/* ============================================================ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {currentData?.stats?.map((stat) => (
                <div key={stat.id} className={`p-6 rounded-xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"} shadow-sm hover:shadow-md transition-all`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={stat.textColor} size={22} />
                    </div>
                  </div>
                  <h3 className={`text-2xl font-bold mb-1 ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {loading ? <Loader2 size={24} className="animate-spin" /> : stat.value}
                  </h3>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{stat.title}</p>
                </div>
              ))}
            </div>

            {/* ============================================================ */}
            {/* TABLA DE CONTRATOS */}
            {/* ============================================================ */}
            <div className={`rounded-xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"} shadow-sm overflow-hidden`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {isAdmin ? "Mis Contratos" : "Listado de Contratos"}
                    </h3>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {filteredContracts.length} contratos encontrados
                      {isAdmin && ` (usuario: ${user.nombre_completo || user.nombres || "Sin nombre"})`}
                      {!isAdmin && " 👀 Visión general del sistema"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar por ID, emprendedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full sm:w-80 pl-10 pr-4 py-2.5 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-200"} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] text-sm`}
                      />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-lg border ${showFilters ? "bg-[#2A9D8F] text-white" : darkMode ? "border-gray-600 text-gray-400 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      <Filter size={18} />
                    </button>
                  </div>
                </div>

                {showFilters && (
                  <div className={`mt-4 p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Estatus</label>
                        <select
                          value={selectedFilter}
                          onChange={(e) => setSelectedFilter(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-200"} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] text-sm`}
                        >
                          <option value="all">Todos los estados</option>
                          <option value="activo">Activo</option>
                          <option value="esperando contrato">Esperando contrato</option>
                          <option value="finalizado">Finalizado</option>
                          <option value="legal">Legal</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            setSelectedFilter("all");
                            setSearchTerm("");
                            setShowFilters(false);
                          }}
                          className={`w-full px-4 py-2 rounded-lg border ${darkMode ? "border-gray-600 text-gray-400 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-100"} transition-colors text-sm`}
                        >
                          Limpiar Filtros
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {loading && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={48} className="animate-spin text-[#2A9D8F] mb-4" />
                  <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Cargando contratos...</p>
                </div>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center justify-center py-20">
                  <AlertCircle size={48} className="text-red-500 mb-4" />
                  <p className={`text-lg font-medium ${darkMode ? "text-red-400" : "text-red-600"} mb-2`}>Error al cargar los datos</p>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} mb-4`}>{error}</p>
                  <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#238b7e] transition-colors">
                    Reintentar
                  </button>
                </div>
              )}

              {!loading && !error && currentItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20">
                  <FileText size={48} className="text-gray-400 mb-4" />
                  <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {isAdmin 
                      ? "No tienes contratos creados. Comienza gestionando un nuevo contrato."
                      : "No se encontraron contratos en el sistema"}
                  </p>
                  {isAdmin && (
                    <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-400"} mt-2`}>
                      Los contratos que crees aparecerán aquí automáticamente.
                    </p>
                  )}
                </div>
              )}

              {!loading && !error && currentItems.length > 0 && (
                <>
                  <div className="overflow-x-auto table-scroll">
                    <table className="w-full">
                      <thead>
                        <tr className={`${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID Aprobación</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Emprendedor</th>
                          <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">N° Cuotas</th>
                          <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Gracias</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Inicio</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Cierre</th>
                          <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Frecuencia</th>
                          <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Estatus</th>
                          <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                        {currentItems.map((contract) => (
                          <tr key={contract.id_aprobacion} className={`${darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50"} transition-colors`}>
                            <td className="px-6 py-4 text-sm font-semibold text-[#2A9D8F]">#{contract.id_aprobacion}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${darkMode ? "bg-gray-700" : "bg-blue-50"}`}>
                                  <User size={16} className={darkMode ? "text-gray-300" : "text-blue-600"} />
                                </div>
                                <div>
                                  <span className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>{contract.emprendedor}</span>
                                  <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                                    {contract.cedula_persona_id || "N/A"}
                                  </span>
                                  {contract.numero_contrato && <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Contrato: {contract.numero_contrato}</p>}
                                  {contract.morosidad !== undefined && (
                                    <p className={`text-xs ${darkMode ? "text-orange-400" : "text-orange-600"}`}>Morosidad: {contract.morosidad}%</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {contract.numero_cuotas === "Sin definir" ? (
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>Sin definir</span>
                              ) : (
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-50 text-blue-700"}`}>{contract.numero_cuotas}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {contract.numero_gracias > 0 ? (
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                                  darkMode ? "bg-purple-900/50 text-purple-300" : "bg-purple-50 text-purple-700"
                                }`}>
                                  <Gift size={14} /> {contract.numero_gracias}
                                </span>
                              ) : (
                                <span className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}>0</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" />
                                {contract.inicio === "Sin definir" ? <span className={darkMode ? "text-gray-500" : "text-gray-400"}>Sin definir</span> : contract.inicio}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" />
                                {contract.cierre === "Sin definir" ? <span className={darkMode ? "text-gray-500" : "text-gray-400"}>Sin definir</span> : contract.cierre}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                {contract.frecuencia_pago_contrato 
                                  ? getFrecuenciaPagoTexto(contract.frecuencia_pago_contrato)
                                  : "Pendiente"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {getStatusComponent(contract)}
                            </td>
                            <td className="px-6 py-4">
                              {getActionButtons(contract)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={`px-3 sm:px-6 py-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      darkMode={darkMode}
                      totalItems={filteredContracts.length}
                      pageSize={itemsPerPage}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          <Footer darkMode={darkMode} />
        </main>
      </div>

      {/* MODAL CONSULTA CONTRATO */}
      {showConsultaModal && selectedContractForConsulta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-60" onClick={() => setShowConsultaModal(false)} />
          <div className={`relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${darkMode ? "bg-blue-900/50" : "bg-blue-50"}`}>
                  <FileText size={24} className="text-[#2A9D8F]" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Detalles del Contrato</h3>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Información completa del contrato</p>
                </div>
              </div>
              <button onClick={() => setShowConsultaModal(false)} className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}>
                <X size={22} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                    <FileSignature size={32} className="text-[#2A9D8F]" />
                  </div>
                  <div>
                    <p className={`text-xs uppercase tracking-wider ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Número de Contrato</p>
                    <p className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {selectedContractForConsulta.numero_contrato || "No asignado"}
                    </p>
                  </div>
                </div>
                {getStatusComponent(selectedContractForConsulta)}
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-blue-50"}`}>
                <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <User size={16} /> Información del Emprendedor
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Nombre</p>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>{selectedContractForConsulta.emprendedor}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>ID Aprobación</p>
                    <p className={`font-medium text-[#2A9D8F]`}>#{selectedContractForConsulta.id_aprobacion}</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <DollarSign size={16} /> Información Financiera
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Moneda</p>
                    <p className={`font-medium uppercase ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {selectedContractForConsulta.moneda ? getMonedaNombre(selectedContractForConsulta.moneda) : getMonedaNombre("usd")}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Monto en Moneda</p>
                    <p className={`font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {selectedContractForConsulta.monto_moneda
                        ? `${selectedContractForConsulta.monto_moneda} ${selectedContractForConsulta.moneda?.toUpperCase() || "USD"}`
                        : "No definido"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Tasa de Cambio</p>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>{selectedContractForConsulta.cambio || "No definido"}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Flat</p>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>{selectedContractForConsulta.flat || "No definido"}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>% Interés</p>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {selectedContractForConsulta.interes_porcentaje ? `${selectedContractForConsulta.interes_porcentaje}%` : "No definido"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Devolvimiento</p>
                    <p className={`font-bold text-green-600 dark:text-green-400`}>
                      {selectedContractForConsulta.devolvimiento
                        ? `${selectedContractForConsulta.devolvimiento} ${selectedContractForConsulta.moneda?.toUpperCase() || "USD"}`
                        : "No definido"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Morosidad</p>
                    <p className={`font-medium text-orange-600 dark:text-orange-400`}>
                      {selectedContractForConsulta.morosidad 
                        ? `${selectedContractForConsulta.morosidad}%` 
                        : "No definido"}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  <Calendar size={16} /> Información de Plazo
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Número de Cuotas</p>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {selectedContractForConsulta.numero_cuotas !== "Sin definir" ? `${selectedContractForConsulta.numero_cuotas} cuotas` : "No definido"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Número de Gracias</p>
                    <p className={`font-medium flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
                      <Gift size={16} className="text-purple-500" />
                      {selectedContractForConsulta.numero_gracias || 0} {selectedContractForConsulta.numero_gracias === 1 ? "gracia" : "gracias"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Frecuencia de Pago del Contrato</p>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {selectedContractForConsulta.frecuencia_pago_contrato 
                        ? getFrecuenciaPagoTexto(selectedContractForConsulta.frecuencia_pago_contrato)
                        : "No definida"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Frecuencia Configurada en Sistema</p>
                    <p className={`font-medium text-blue-600 dark:text-blue-400`}>
                      {configuracionContrato ? getFrecuenciaPagoTexto(configuracionContrato.frecuencia_pago) : "No definida"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Cuotas Efectivas</p>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {selectedContractForConsulta.numero_cuotas !== "Sin definir"
                        ? `${Math.max(0, parseInt(selectedContractForConsulta.numero_cuotas) - (selectedContractForConsulta.numero_gracias || 0))} pagos`
                        : "No definido"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Fecha de Inicio</p>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {selectedContractForConsulta.inicio !== "Sin definir" ? selectedContractForConsulta.inicio : "No definido"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Fecha de Cierre</p>
                    <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {selectedContractForConsulta.cierre !== "Sin definir" ? selectedContractForConsulta.cierre : "No definido"}
                    </p>
                  </div>
                </div>
              </div>

              {selectedContractForConsulta.foto_contrato && (
                <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    <Camera size={16} /> Contrato firmado
                  </h4>
                  <a href={selectedContractForConsulta.foto_contrato} target="_blank" rel="noreferrer">
                    <img
                      src={selectedContractForConsulta.foto_contrato}
                      alt="Contrato firmado"
                      className="max-h-72 rounded-lg border object-contain mx-auto"
                    />
                  </a>
                </div>
              )}

              {selectedContractForConsulta.capture_desembolso && (
                <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    <DollarSign size={16} /> Comprobante de desembolso
                  </h4>
                  <a href={selectedContractForConsulta.capture_desembolso} target="_blank" rel="noreferrer">
                    <img
                      src={selectedContractForConsulta.capture_desembolso}
                      alt="Comprobante de desembolso"
                      className="max-h-72 rounded-lg border object-contain mx-auto"
                    />
                  </a>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button onClick={() => setShowConsultaModal(false)} className="px-6 py-2.5 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium">
                  <X size={16} /> Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GESTIÓN DE CONTRATO */}
      {showGestionModal && selectedContractForGestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 bg-opacity-50" onClick={cerrarModalGestion} />
          <div className={`relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto p-6 rounded-xl shadow-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Registrar contrato</h3>
                <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Datos para generar cuotas y foto del contrato ya firmado</p>
              </div>
              <button onClick={cerrarModalGestion} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                <X size={22} className={darkMode ? "text-gray-400" : "text-gray-600"} />
              </button>
            </div>

            <div className={`p-4 rounded-lg mb-6 ${darkMode ? "bg-gray-700/50 border border-gray-600" : "bg-blue-50 border border-blue-100"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-3 rounded-full ${darkMode ? "bg-gray-600" : "bg-blue-100"}`}>
                  <User size={24} className={darkMode ? "text-gray-300" : "text-blue-600"} />
                </div>
                <div>
                  <p className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>{selectedContractForGestion.emprendedor}</p>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    ID Aprobación: <span className="font-semibold text-[#2A9D8F]">#{selectedContractForGestion.id_aprobacion}</span>
                  </p>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Cédula: <span className="font-semibold">{selectedContractForGestion.cedula_persona_id}</span>
                  </p>
                </div>
              </div>
              {configuracionContrato && (
                <div className={`mt-3 pt-3 border-t ${darkMode ? "border-gray-600" : "border-blue-200"} text-sm`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>Frecuencia de Pago:</span>
                      <span className={`ml-2 font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>{getFrecuenciaPagoTexto(configuracionContrato.frecuencia_pago)}</span>
                    </div>
                    <div>
                      <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>Cuotas Obligatorias:</span>
                      <span className={`ml-2 font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>{configuracionContrato.cuotas_obligatorias}</span>
                    </div>
                    {configuracionContrato.cuotas_gracia !== undefined && (
                      <div>
                        <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>Gracias Config:</span>
                        <span className={`ml-2 font-semibold ${darkMode ? "text-purple-400" : "text-purple-600"}`}>
                          <Gift size={12} className="inline mr-1" /> {configuracionContrato.cuotas_gracia}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>Morosidad:</span>
                      <span className={`ml-2 font-semibold ${darkMode ? "text-orange-400" : "text-orange-600"}`}>
                        {configuracionContrato.morosidad_porcentaje || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); confirmarGestion(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Número de Contrato <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <FileSignature className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" value={formGestion.numero_contrato} readOnly className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${darkMode ? "bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed" : "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"} focus:outline-none text-sm font-medium`} />
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Formato: <span className="font-semibold">IADEY-AAAA-NNN</span> (generado automáticamente)</p>
                </div>

                <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-700/30 border border-gray-600" : "bg-gray-50 border border-gray-200"}`}>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Moneda (Configuración)</label>
                  <div className="flex items-center gap-2">
                    <DollarSign size={18} className="text-[#2A9D8F]" />
                    <span className={`text-lg font-semibold uppercase ${darkMode ? "text-white" : "text-gray-800"}`}>
                      {formGestion.monto_moneda ? `${formGestion.monto_moneda} ${getMonedaNombre(formGestion.moneda)}` : getMonedaNombre(formGestion.moneda)}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Moneda configurada en el sistema</p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Monto en Moneda <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={montoMaximoSolicitado != null ? montoMaximoSolicitado : undefined}
                      value={formGestion.monto_moneda}
                      onKeyDown={blockInvalidNumberKeys}
                      onChange={(e) => handleMontoMonedaChange(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${formErrors.monto_moneda ? "border-red-500 focus:ring-red-500" : (darkMode ? "border-gray-600 focus:ring-[#2A9D8F]" : "border-gray-200 focus:ring-[#2A9D8F]")} ${darkMode ? "bg-gray-700 text-white placeholder-gray-400" : "bg-white placeholder-gray-400"} focus:outline-none focus:ring-2 text-sm`}
                      placeholder="0.00"
                    />
                  </div>
                  {formErrors.monto_moneda && <p className="mt-1 text-xs text-red-500">{formErrors.monto_moneda}</p>}
                  {montoMaximoSolicitado != null && !formErrors.monto_moneda && (
                    <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Preseleccionado con el monto solicitado. Puede bajarlo, pero no superar <strong>{formatMonto(montoMaximoSolicitado)}</strong>.
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Cambio (Tasa) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" value={`Bs. ${formatMonto(montoBolivares.neto)}`} readOnly className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${darkMode ? "bg-gray-600 border-gray-500 text-green-400 cursor-not-allowed" : "bg-green-50 border-green-200 text-green-700 cursor-not-allowed"} focus:outline-none text-sm font-semibold`} />
                  </div>
                  <div className="mt-1 flex gap-4 text-xs">
                    {tasasCambio.dolares && <span className={darkMode ? "text-gray-400" : "text-gray-500"}>USD: {Number(tasasCambio.dolares).toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs.</span>}
                    {tasasCambio.euros && <span className={darkMode ? "text-gray-400" : "text-gray-500"}>EUR: {Number(tasasCambio.euros).toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs.</span>}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Flat (%) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">%</span>
                    <input type="text" value={`- Bs ${formatMonto(montoBolivares.flatMonto)}`} readOnly className={`w-full pl-4 pr-10 py-2.5 rounded-lg border ${darkMode ? "bg-gray-600 border-gray-500 text-red-400 cursor-not-allowed" : "bg-red-50 border-red-200 text-red-700 cursor-not-allowed"} focus:outline-none text-sm font-semibold`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>% Interés <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">%</span>
                    <input type="text" value={`${(parseFloat(formGestion.monto_moneda || 0) * (parseFloat(formGestion.interes_porcentaje || 0) / 100)).toFixed(2)} ${getMonedaNombre(formGestion.moneda)}`} readOnly className={`w-full pl-4 pr-10 py-2.5 rounded-lg border ${darkMode ? "bg-gray-600 border-gray-500 text-blue-400 cursor-not-allowed" : "bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed"} focus:outline-none text-sm font-semibold`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Devolvimiento <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="number" step="0.01" value={formGestion.devolvimiento} readOnly className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${darkMode ? "bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed" : "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"} focus:outline-none text-sm font-medium`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Número de Cuotas <span className="text-red-500">*</span></label>
                  <input type="number" value={formGestion.numero_cuotas} onKeyDown={blockInvalidNumberKeys} onChange={(e) => handleNumeroCuotasChange(e.target.value)} className={`w-full px-4 py-2.5 rounded-lg border ${formErrors.numero_cuotas ? "border-red-500 focus:ring-red-500" : (darkMode ? "border-gray-600 focus:ring-[#2A9D8F]" : "border-gray-200 focus:ring-[#2A9D8F]")} ${darkMode ? "bg-gray-700 text-white" : "bg-white"} focus:outline-none focus:ring-2 text-sm`} placeholder="Ej: 12" />
                  {formErrors.numero_cuotas && <p className="mt-1 text-xs text-red-500">{formErrors.numero_cuotas}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Número de Gracias</label>
                  <div className="relative">
                    <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400" size={18} />
                    <input type="number" min="0" max={formGestion.numero_cuotas ? parseInt(formGestion.numero_cuotas) - 1 : 12} value={formGestion.numero_gracias} onKeyDown={blockInvalidNumberKeys} onChange={(e) => handleInputChange("numero_gracias", e.target.value)} className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${formErrors.numero_gracias ? "border-red-500 focus:ring-red-500" : (darkMode ? "border-gray-600 focus:ring-[#2A9D8F]" : "border-gray-200 focus:ring-[#2A9D8F]")} ${darkMode ? "bg-gray-700 text-white" : "bg-white"} focus:outline-none focus:ring-2 text-sm`} placeholder="0" />
                  </div>
                  {formErrors.numero_gracias && <p className="mt-1 text-xs text-red-500">{formErrors.numero_gracias}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Frecuencia de Pago</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" value={configuracionContrato ? getFrecuenciaPagoTexto(configuracionContrato.frecuencia_pago) : "Cargando..."} readOnly className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${darkMode ? "bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed" : "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"} focus:outline-none text-sm`} />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Morosidad anual (%)</label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">%</span>
                    <input 
                      type="text" 
                      value={formGestion.morosidad} 
                      readOnly 
                      className={`w-full pl-4 pr-10 py-2.5 rounded-lg border ${darkMode ? "bg-gray-600 border-gray-500 text-orange-400 cursor-not-allowed" : "bg-orange-50 border-orange-200 text-orange-700 cursor-not-allowed"} focus:outline-none text-sm font-semibold`} 
                    />
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Porcentaje de morosidad anual (interés simple / 360 días)
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Fecha de Inicio <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="date" value={formGestion.inicio} onChange={(e) => handleFechaInicioChange(e.target.value)} className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${formErrors.inicio ? "border-red-500 focus:ring-red-500" : (darkMode ? "border-gray-600 focus:ring-[#2A9D8F]" : "border-gray-200 focus:ring-[#2A9D8F]")} ${darkMode ? "bg-gray-700 text-white" : "bg-white"} focus:outline-none focus:ring-2 text-sm`} />
                  </div>
                  {formErrors.inicio && <p className="mt-1 text-xs text-red-500">{formErrors.inicio}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Fecha de Cierre <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="date" value={formGestion.cierre} readOnly className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${darkMode ? "bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed" : "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"} focus:outline-none text-sm font-medium`} />
                  </div>
                  {formErrors.cierre && <p className="mt-1 text-xs text-red-500">{formErrors.cierre}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Foto del contrato firmado <span className="text-red-500">*</span>
                  </label>
                  <label
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                      formErrors.foto_contrato
                        ? "border-red-400"
                        : darkMode
                        ? "border-gray-600 hover:border-[#2A9D8F] bg-gray-700/30"
                        : "border-gray-300 hover:border-[#2A9D8F] bg-gray-50"
                    }`}
                  >
                    <Camera size={22} className="text-[#2A9D8F]" />
                    <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                      {fotoContratoFile ? fotoContratoFile.name : "Adjuntar foto o captura del contrato ya firmado"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFotoContratoFile(file);
                        if (fotoContratoPreview) URL.revokeObjectURL(fotoContratoPreview);
                        setFotoContratoPreview(file ? URL.createObjectURL(file) : "");
                        if (file) {
                          setFormErrors((prev) => {
                            const { foto_contrato, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                    />
                  </label>
                  {fotoContratoPreview && (
                    <img
                      src={fotoContratoPreview}
                      alt="Vista previa del contrato"
                      className="mt-3 max-h-48 rounded-lg border object-contain mx-auto"
                    />
                  )}
                  {formErrors.foto_contrato && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.foto_contrato}</p>
                  )}
                </div>
              </div>

              {formErrors.submit && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <p className="text-sm text-red-600">{formErrors.submit}</p>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={cerrarModalGestion}
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                    darkMode
                      ? "border border-gray-600 text-gray-300 hover:bg-gray-700"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-md text-sm font-medium bg-[#2A9D8F] hover:bg-[#238b7e] text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <FileSignature size={16} /> Guardar Contrato
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contrato;