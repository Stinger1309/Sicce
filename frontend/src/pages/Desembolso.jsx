import React, { useState, useEffect } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import { useNavigate, useLocation } from "react-router-dom";
import Swal from 'sweetalert2';
import {
  DollarSign,
  Clock,
  CheckCircle,
  X,
  AlertCircle,
  Loader2,
  User,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Eye,
  Send,
  History,
  Upload,
  FileImage,
  Trash2,
  Hourglass,
  PlusCircle,
  Users,
  UserCheck,
  CreditCard
} from "lucide-react";

// Componentes personalizados
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";
import DesembolsoAPI from '../services/api_desembolso';
import bancoAPI from '../services/api_banco';
import { uploadToImgBB } from '../services/imgbbService';
import usuarioAPI from '../services/api_usuario';
import { esEmprendedor as esRolEmprendedor } from '../utils/roles';
import {
  normalizarNumeroCuenta,
  validarNumeroCuentaVE,
} from '../utils/cuentaBancariaVE';

const Desembolso = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ============================================================
  // ESTADOS - UI y navegación
  // ============================================================
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("disbursements");

  // ============================================================
  // ESTADOS - Filtros y paginación
  // ============================================================
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageMis, setCurrentPageMis] = useState(1);
  const [itemsPerPage] = useState(8);
  const [showFilters, setShowFilters] = useState(false);

  // ============================================================
  // ESTADOS - Datos principales (DESEMBOLSOS)
  // ============================================================
  const [disbursementsData, setDisbursementsData] = useState([]);
  const [misDisbursementsData, setMisDisbursementsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMis, setLoadingMis] = useState(false);
  const [error, setError] = useState(null);

  // ============================================================
  // ESTADOS - Modal Crear Desembolso
  // ============================================================
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [captureImage, setCaptureImage] = useState(null);
  const [capturePreview, setCapturePreview] = useState(null);
  const [formDesembolso, setFormDesembolso] = useState({
    id_cont: "",
    fecha_desembolso: new Date().toISOString().split("T")[0],
    cedula_desembolso: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ============================================================
  // ESTADOS - Modal Confirmación
  // ============================================================
  const [showConfirmacionModal, setShowConfirmacionModal] = useState(false);
  const [selectedDisbursement, setSelectedDisbursement] = useState(null);
  const [confirmacionImage, setConfirmacionImage] = useState(null);
  const [confirmacionPreview, setConfirmacionPreview] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [modoModalDesembolso, setModoModalDesembolso] = useState('denegar'); // denegar | confirmar

  // ============================================================
  // ESTADOS - Modal Detalle
  // ============================================================
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [selectedDisbursementDetail, setSelectedDisbursementDetail] = useState(null);

  // ============================================================
  // ESTADOS - Modal Contratos Pendientes
  // ============================================================
  const [showContratosModal, setShowContratosModal] = useState(false);
  const [contratosPendientes, setContratosPendientes] = useState([]);
  const [loadingContratos, setLoadingContratos] = useState(false);

  // ============================================================
  // ESTADOS - Datos de cuenta (crédito Interno → emprendedor)
  // ============================================================
  const [creditosCuenta, setCreditosCuenta] = useState([]);
  const [loadingCreditosCuenta, setLoadingCreditosCuenta] = useState(false);
  const [catalogoBancos, setCatalogoBancos] = useState([]);
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [creditoCuentaSel, setCreditoCuentaSel] = useState(null);
  const [formCuenta, setFormCuenta] = useState({
    id_banco: "",
    tipo_cuenta: "Ahorro",
    numero_cuenta: "",
  });
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);

  // ============================================================
  // ESTADOS - Rol del usuario
  // ============================================================
  const [userRole, setUserRole] = useState(null);

  // ============================================================
  // DATOS DEL USUARIO - OBTENIDOS DEL API DE USUARIO
  // ============================================================
  const [user, setUser] = useState({
    id: null,
    name: "",
    email: "",
    role: "",
    avatar: null,
    department: "",
    joinDate: "",
    pendingTasks: 0,
    completedTasks: 0,
    performance: "",
    cedula: "",
    nombres: "",
    apellidos: "",
    nombre_completo: "",
  });

  // ============================================================
  // CONFIGURACIÓN DE ESTADOS
  // ============================================================
  const STATUS_CONFIG = {
    "Pendiente": {
      color: "orange",
      icon: Clock,
      bgColor: "bg-orange-500",
      label: "Pendiente"
    },
    "Confirmado": {
      color: "green",
      icon: CheckCircle,
      bgColor: "bg-green-500",
      label: "Confirmado"
    },
    "Rechazado": {
      color: "red",
      icon: X,
      bgColor: "bg-red-500",
      label: "Rechazado"
    }
  };

  // ============================================================
  // FUNCIONES AUXILIARES
  // ============================================================
  const getMonedaNombre = (tipoMoneda) => {
    switch (tipoMoneda?.toLowerCase()) {
      case "usd": return "USD";
      case "eur": return "EUR";
      default: return "VES";
    }
  };

  const formatMonto = (monto) => {
    if (!monto && monto !== 0) return "0.00";
    return Number(monto).toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No definida";
    const parts = dateString.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  // ============================================================
  // FUNCIONES API
  // ============================================================

  // Obtener todos los desembolsos
  const fetchDesembolsos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await DesembolsoAPI.getAll();
      if (response.data.success) {
        setDisbursementsData(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        throw new Error(response.data.error || 'Error al cargar desembolsos');
      }
    } catch (error) {
      console.error('Error fetching disbursements:', error);
      setError(error.response?.data?.error || error.message || 'No se pudieron cargar los desembolsos');
      setDisbursementsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Obtener desembolsos del emprendedor por cédula
  const fetchMisDesembolsos = async () => {
    const ced =
      user?.cedula ||
      user?.cedula_usuario ||
      "";
    const esEmprendedorUser = esRolEmprendedor(user) || Number(userRole) === 2;

    if (!esEmprendedorUser) {
      setMisDisbursementsData([]);
      setLoadingMis(false);
      return;
    }

    if (!ced) {
      setMisDisbursementsData([]);
      setLoadingMis(false);
      return;
    }

    try {
      setLoadingMis(true);
      const response = await DesembolsoAPI.getByCedula(ced);
      if (response.data?.success) {
        setMisDisbursementsData(response.data.data || []);
      } else {
        setMisDisbursementsData([]);
      }
    } catch (error) {
      console.error('Error fetching mis desembolsos:', error);
      setMisDisbursementsData([]);
    } finally {
      setLoadingMis(false);
    }
  };

  /** Créditos Interno: el emprendedor debe cargar su cuenta antes del desembolso */
  const fetchCreditosCuenta = async () => {
    const ced = String(user?.cedula || user?.cedula_usuario || "").trim();
    const esEmprendedorUser = esRolEmprendedor(user) || Number(userRole) === 2;
    if (!esEmprendedorUser || !ced) {
      setCreditosCuenta([]);
      setCatalogoBancos([]);
      return;
    }
    try {
      setLoadingCreditosCuenta(true);
      const [credRes, bancosRes] = await Promise.all([
        bancoAPI.getCreditosInternosCuenta(ced),
        bancoAPI.getByCedula(ced),
      ]);
      if (credRes?.success) setCreditosCuenta(credRes.data || []);
      else setCreditosCuenta([]);

      // Solo bancos elegidos en el registro inicial (persona_bancos)
      const lista = Array.isArray(bancosRes?.data) ? bancosRes.data : [];
      const unicos = [];
      const seen = new Set();
      for (const b of lista) {
        const id = Number(b.id_banco);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        unicos.push({
          id_banco: id,
          nombre: b.banco_nombre || b.nombre || `Banco #${id}`,
          siglas: b.siglas || "",
          codigo_banco: b.codigo_banco || null,
        });
      }
      setCatalogoBancos(unicos);
    } catch (error) {
      console.error("Error cargando créditos para cuenta:", error);
      setCreditosCuenta([]);
      setCatalogoBancos([]);
    } finally {
      setLoadingCreditosCuenta(false);
    }
  };

  const abrirModalCuenta = (credito) => {
    const bancosDisponibles = catalogoBancos;
    const idActual = credito?.id_banco ? String(credito.id_banco) : "";
    const idValido = bancosDisponibles.some((b) => String(b.id_banco) === idActual)
      ? idActual
      : bancosDisponibles.length === 1
        ? String(bancosDisponibles[0].id_banco)
        : "";

    setCreditoCuentaSel(credito);
    setFormCuenta({
      id_banco: idValido,
      tipo_cuenta: credito?.tipo_cuenta || "Ahorro",
      numero_cuenta:
        credito?.numero_cuenta && !String(credito.numero_cuenta).startsWith("SIN-")
          ? String(credito.numero_cuenta)
          : "",
    });
    setShowCuentaModal(true);
  };

  const guardarCuentaDesembolso = async () => {
    const ced = String(user?.cedula || user?.cedula_usuario || "").trim();
    if (!creditoCuentaSel?.id_aprobacion || !ced) return;

    if (!formCuenta.id_banco) {
      Swal.fire({
        title: "Banco requerido",
        text: "Seleccione el banco de su cuenta",
        icon: "warning",
        confirmButtonColor: "#2A9D8F",
      });
      return;
    }

    const bancoSel = catalogoBancos.find(
      (b) => String(b.id_banco) === String(formCuenta.id_banco)
    );
    const validacion = validarNumeroCuentaVE(formCuenta.numero_cuenta, {
      codigoBancoSeleccionado: bancoSel?.codigo_banco,
      codigosValidos: catalogoBancos
        .map((b) => b.codigo_banco)
        .filter(Boolean),
    });
    if (!validacion.ok) {
      Swal.fire({
        title: "Número de cuenta inválido",
        text: validacion.error,
        icon: "warning",
        confirmButtonColor: "#2A9D8F",
      });
      return;
    }
    const numero = validacion.numero;

    setGuardandoCuenta(true);
    try {
      const res = await bancoAPI.registrarCuentaDesembolso({
        cedula: ced,
        id_aprobacion: creditoCuentaSel.id_aprobacion,
        id_banco: parseInt(formCuenta.id_banco, 10),
        tipo_cuenta: formCuenta.tipo_cuenta || "Ahorro",
        numero_cuenta: numero,
      });
      if (!res?.success) {
        throw new Error(res?.error || "No se pudo guardar la cuenta");
      }
      await Swal.fire({
        title: "Cuenta registrada",
        text: "Sus datos bancarios quedaron guardados. El desembolso podrá realizarse.",
        icon: "success",
        confirmButtonColor: "#2A9D8F",
      });
      setShowCuentaModal(false);
      setCreditoCuentaSel(null);
      await fetchCreditosCuenta();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error?.error || error?.message || "No se pudo registrar la cuenta",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    } finally {
      setGuardandoCuenta(false);
    }
  };

  // Obtener contratos pendientes por desembolso
  const fetchContratosPendientes = async () => {
    try {
      setLoadingContratos(true);
      const response = await DesembolsoAPI.getContratosPendientes();
      if (response.data.success) {
        setContratosPendientes(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setContratosPendientes([]);
      }
    } catch (error) {
      console.error('Error fetching contratos pendientes:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar los contratos pendientes',
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    } finally {
      setLoadingContratos(false);
    }
  };

  // Verificar si un contrato ya tiene desembolso
  const verificarDesembolsoExistente = async (id_cont) => {
    try {
      const response = await DesembolsoAPI.verificarDesembolso(id_cont);
      return response.data.existe;
    } catch (error) {
      console.error('Error verificando desembolso:', error);
      return false;
    }
  };

  // ============================================================
  // HANDLERS - Confirmar / Denegar Desembolso (emprendedor)
  // ============================================================
  const confirmarDesembolsoDirecto = async (disbursement) => {
    const result = await Swal.fire({
      title: '¿Le llegó el desembolso?',
      html: `
        <p>Contrato <strong>${disbursement.numero_contrato || '#' + disbursement.id_cont}</strong></p>
        <p style="margin-top:8px;font-size:13px;">Si <strong>no</strong> le llegó, deberá adjuntar un estado de cuenta o comprobante que lo demuestre.</p>
      `,
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonColor: '#15c933',
      denyButtonColor: '#e2230a',
      cancelButtonColor: '#8b8d91',
      confirmButtonText: 'Sí, me llegó',
      denyButtonText: 'No me llegó',
      cancelButtonText: 'Cerrar',
      background: darkMode ? '#1f2937' : '#ffffff',
      color: darkMode ? '#f3f4f6' : '#1f2937'
    });

    if (result.isDenied) {
      setSelectedDisbursement(disbursement);
      setShowConfirmacionModal(true);
      setConfirmacionImage(null);
      setConfirmacionPreview(null);
      setModoModalDesembolso('denegar');
      return;
    }

    if (!result.isConfirmed) return;

    setConfirmando(true);
    Swal.fire({
      title: 'Confirmando desembolso...',
      text: 'Se generarán las cuotas automáticamente',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const ced =
        user?.cedula ||
        user?.cedula_usuario ||
        "";
      const response = await DesembolsoAPI.confirmarPago(disbursement.id_desembolso, {
        fecha_confirmacion: new Date().toISOString().split("T")[0],
        cedula_usuario: ced,
        nombre_rol: user?.nombre_rol || user?.rol || "",
        id_rol: userRole || user?.id_rol_usu || user?.id_rol,
      });

      if (response.data?.success) {
        await Swal.fire({
          title: '¡Desembolso confirmado!',
          html: 'Las cuotas fueron generadas y el contrato quedó <strong>Activo</strong>.',
          icon: 'success',
          confirmButtonColor: '#2A9D8F',
        });
        await fetchDesembolsos();
        await fetchMisDesembolsos();
      } else {
        throw new Error(response.data?.error || "Error al confirmar desembolso");
      }
    } catch (error) {
      await Swal.fire({
        title: 'Error al confirmar',
        text: error?.error || error?.message || 'Ocurrió un error',
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    } finally {
      setConfirmando(false);
    }
  };

  // ============================================================
  // HANDLERS - Crear Desembolso
  // ============================================================
  
  const abrirModalCrear = () => {
    setFormDesembolso({
      id_cont: "",
      fecha_desembolso: new Date().toISOString().split("T")[0],
      cedula_desembolso: user.cedula || ""
    });
    setCaptureImage(null);
    setCapturePreview(null);
    setFormErrors({});
    setShowCrearModal(true);
  };

  const abrirModalSeleccionarContrato = async () => {
    await fetchContratosPendientes();
    setShowContratosModal(true);
  };

  const getCedulaEmprendedor = (contrato = {}) =>
    String(
      contrato.cedula_persona_id ||
        contrato.id_cedula_aprob ||
        contrato.cedula ||
        contrato.cedula_desembolso ||
        ""
    ).trim();

  const contratoTieneCuentaLista = (contrato) => {
    if (contrato.seleccion_manejo !== "Interno") return true;
    if (contrato.cuenta_lista === false || contrato.cuenta_lista === "f") return false;
    return Boolean(contrato.cuenta_lista);
  };

  const seleccionarContrato = (contrato) => {
    if (!contratoTieneCuentaLista(contrato)) {
      Swal.fire({
        title: "Cuenta bancaria pendiente",
        html: `
          <p style="text-align:left;margin:0 0 8px">
            Este crédito es de manejo <strong>Interno</strong> y el emprendedor
            aún no registró su cuenta bancaria.
          </p>
          <p style="text-align:left;margin:0;font-size:13px;opacity:.85">
            Pídale que entre a <strong>Desembolso</strong> con su usuario y complete
            banco + número de cuenta. Luego podrá registrar el desembolso.
          </p>
        `,
        icon: "warning",
        confirmButtonColor: "#2A9D8F",
      });
      return;
    }
    setFormDesembolso({
      id_cont: contrato.id_contrato,
      fecha_desembolso: new Date().toISOString().split("T")[0],
      cedula_desembolso: getCedulaEmprendedor(contrato),
    });
    setShowContratosModal(false);
    setShowCrearModal(true);
  };

  const handleInputChange = (field, value) => {
    setFormDesembolso(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'Error',
          text: 'La imagen no puede superar los 5MB',
          icon: 'error',
          confirmButtonColor: '#d33'
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturePreview(reader.result);
        setCaptureImage(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formDesembolso.id_cont) {
      errors.id_cont = "Debe seleccionar un contrato";
    }
    if (!formDesembolso.fecha_desembolso) {
      errors.fecha_desembolso = "La fecha de desembolso es requerida";
    }
    if (!captureImage) {
      errors.capture_desembolso = "Debe adjuntar el comprobante de desembolso";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const registrarDesembolso = async () => {
    if (!validateForm()) return;

    const existe = await verificarDesembolsoExistente(formDesembolso.id_cont);
    if (existe) {
      Swal.fire({
        title: 'Error',
        text: 'Este contrato ya tiene un desembolso registrado',
        icon: 'error',
        confirmButtonColor: '#d33'
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Registrar desembolso?',
      html: `
        <div style="text-align: left;">
          <div style="background: ${darkMode ? '#374151' : '#f8f9fa'}; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>📄 ID Contrato:</strong> ${formDesembolso.id_cont}</p>
            <p style="margin: 5px 0;"><strong>📅 Fecha Desembolso:</strong> ${formatDate(formDesembolso.fecha_desembolso)}</p>
            <p style="margin: 5px 0;"><strong>🪪 Cédula:</strong> ${formDesembolso.cedula_desembolso || 'No asignada'}</p>
            <p style="margin: 5px 0;"><strong>👤 Usuario:</strong> ${user.nombre_completo || user.name || 'No especificado'}</p>
          </div>
          <p style="color: #e67e22; font-size: 13px; text-align: center;">⚠️ Una vez registrado, el desembolso quedará pendiente de confirmación.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2A9D8F',
      cancelButtonColor: '#d33',
      confirmButtonText: '✅ Sí, registrar desembolso',
      cancelButtonText: '❌ Cancelar',
      reverseButtons: true,
      background: darkMode ? '#1f2937' : '#ffffff',
      color: darkMode ? '#f3f4f6' : '#1f2937'
    });

    if (!result.isConfirmed) return;

    if (!formDesembolso.cedula_desembolso) {
      Swal.fire({
        title: "Cédula requerida",
        text: "No se pudo determinar la cédula del emprendedor. Seleccione el contrato nuevamente.",
        icon: "warning",
        confirmButtonColor: "#2A9D8F",
      });
      return;
    }

    setSubmitting(true);
    
    Swal.fire({
      title: 'Subiendo imagen y registrando desembolso...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      let imageUrl = null;
      if (captureImage) {
        try {
          const uploadResult = await uploadToImgBB(captureImage);
          imageUrl = uploadResult.url;
          console.log('✅ Imagen subida a ImgBB:', imageUrl);
        } catch (uploadError) {
          console.error('Error al subir imagen a ImgBB:', uploadError);
          throw new Error('Error al subir la imagen. Por favor, intente nuevamente.');
        }
      }

      const desembolsoData = {
        id_cont: formDesembolso.id_cont,
        fecha_desembolso: formDesembolso.fecha_desembolso,
        estatus_desembolso: 'Pendiente',
        capture_desembolso: imageUrl,
        usuario_id: user.id,
        cedula_desembolso: formDesembolso.cedula_desembolso,
      };

      const response = await DesembolsoAPI.create(desembolsoData);
      
      if (response.data.success) {
        const newDesembolso = response.data.data;
        
        setDisbursementsData(prev => [newDesembolso, ...prev]);
        
        if (newDesembolso.cedula_desembolso === user.cedula) {
          setMisDisbursementsData(prev => [newDesembolso, ...prev]);
        }
        
        Swal.fire({
          title: '¡Desembolso registrado! 🎉',
          html: `
            Se ha registrado el desembolso exitosamente.<br/>
            <strong>Estado:</strong> Pendiente de confirmación<br/>
            <strong>Cédula:</strong> ${formDesembolso.cedula_desembolso || 'No asignada'}<br/>
            Se notificará cuando sea confirmado.
          `,
          icon: 'success',
          confirmButtonColor: '#2A9D8F',
          confirmButtonText: 'Continuar',
          timer: 3000,
          timerProgressBar: true
        });

        setNotifications((prev) => [
          { 
            id: Date.now(), 
            text: `💰 Desembolso registrado para contrato #${formDesembolso.id_cont} - Pendiente de confirmación`, 
            time: "Ahora", 
            read: false,
            type: "success"
          },
          ...prev,
        ]);

        setShowCrearModal(false);
        resetFormDesembolso();
        await fetchDesembolsos();
        await fetchMisDesembolsos();
      } else {
        throw new Error(response.data.error || "Error al registrar desembolso");
      }
    } catch (error) {
      console.error('Error registrando desembolso:', error);
      Swal.fire({
        title: 'Error al registrar desembolso',
        text: error.response?.data?.error || error.message || 'Ocurrió un error inesperado',
        icon: 'error',
        confirmButtonColor: '#d33'
      });
      setFormErrors({ submit: error.response?.data?.error || "Error al guardar el desembolso" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetFormDesembolso = () => {
    setFormDesembolso({
      id_cont: "",
      fecha_desembolso: new Date().toISOString().split("T")[0],
      cedula_desembolso: user.cedula || ""
    });
    setCaptureImage(null);
    setCapturePreview(null);
    setFormErrors({});
  };

  const cerrarModalCrear = () => {
    setShowCrearModal(false);
    resetFormDesembolso();
  };

  // ============================================================
  // HANDLERS - Confirmar Desembolso
  // ============================================================
  const abrirConfirmacion = (disbursement) => {
    setSelectedDisbursement(disbursement);
    setShowConfirmacionModal(true);
    setConfirmacionImage(null);
    setConfirmacionPreview(null);
  };

  const handleConfirmacionImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'Error',
          text: 'La imagen no puede superar los 5MB',
          icon: 'error',
          confirmButtonColor: '#d33'
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfirmacionPreview(reader.result);
        setConfirmacionImage(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmarDesembolso = async () => {
    // Modal usado para DENEGAR con comprobante obligatorio
    if (!confirmacionImage) {
      Swal.fire({
        title: 'Comprobante requerido',
        text: 'Debe adjuntar un estado de cuenta o comprobante que demuestre que el desembolso no llegó. De lo contrario, confirme que sí le llegó.',
        icon: 'warning',
        confirmButtonColor: '#2A9D8F',
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Denegar desembolso?',
      text: 'Se registrará su comprobante y el contrato volverá a Pendiente por desembolso.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#2A9D8F',
      confirmButtonText: 'Sí, denegar',
      cancelButtonText: 'Cancelar',
    });
    if (!result.isConfirmed) return;

    setConfirmando(true);
    Swal.fire({
      title: 'Registrando denegación...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const uploadResult = await uploadToImgBB(confirmacionImage);
      const ced = user?.cedula || user?.cedula_usuario || "";
      const response = await DesembolsoAPI.denegarDesembolso(
        selectedDisbursement.id_desembolso,
        {
          comprobante_denegacion: uploadResult.url,
          motivo_denegacion: 'El emprendedor indica que el desembolso no fue recibido',
          cedula_usuario: ced,
        }
      );

      if (response.data?.success) {
        await Swal.fire({
          title: 'Desembolso denegado',
          text: 'El contrato volvió a Pendiente por desembolso para un nuevo registro.',
          icon: 'success',
          confirmButtonColor: '#2A9D8F',
        });
        setShowConfirmacionModal(false);
        setSelectedDisbursement(null);
        setConfirmacionImage(null);
        setConfirmacionPreview(null);
        await fetchDesembolsos();
        await fetchMisDesembolsos();
      } else {
        throw new Error(response.data?.error || 'Error al denegar');
      }
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: error?.error || error?.message || 'No se pudo denegar',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    } finally {
      setConfirmando(false);
    }
  };

  // ============================================================
  // HANDLERS - Ver Detalle
  // ============================================================
  const verDetalleDesembolso = (disbursement) => {
    setSelectedDisbursementDetail(disbursement);
    setShowDetalleModal(true);
  };

  // ============================================================
  // EFECTOS
  // ============================================================
  
  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    const loadUserData = () => {
      const currentUser = usuarioAPI.getCurrentUser();
      console.log('Usuario logueado:', currentUser);
      
      if (currentUser) {
        // Guardar el rol del usuario
        const roleId = currentUser.id_rol_usu || currentUser.rol_id || null;
        setUserRole(roleId);
        console.log('Rol del usuario:', roleId);
        
        setUser({
          id: currentUser.id || currentUser.id_usuario,
          name: currentUser.nombre_completo || currentUser.nombres || 'Usuario',
          email: currentUser.email || currentUser.correo || '',
          role: currentUser.nombre_rol || currentUser.rol || 'Usuario',
          nombre_rol: currentUser.nombre_rol || currentUser.rol || '',
          rol: currentUser.nombre_rol || currentUser.rol || '',
          avatar: null,
          department: currentUser.departamento || '',
          joinDate: currentUser.fecha_registro || 'Fecha no disponible',
          pendingTasks: 0,
          completedTasks: 0,
          performance: '',
          cedula: currentUser.cedula_usuario || currentUser.cedula || '',
          cedula_usuario: currentUser.cedula_usuario || currentUser.cedula || '',
          nombres: currentUser.nombres || '',
          apellidos: currentUser.apellidos || '',
          nombre_completo: currentUser.nombre_completo || `${currentUser.nombres || ''} ${currentUser.apellidos || ''}`.trim(),
          id_rol_usu: currentUser.id_rol_usu || currentUser.rol_id || null,
        });
      }
    };
    
    loadUserData();
    
    // Escuchar cambios en la autenticación
    const handleAuthChange = () => {
      loadUserData();
    };
    
    window.addEventListener('authChange', handleAuthChange);
    
    return () => {
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  const esEmprendedor =
    esRolEmprendedor(user) ||
    esRolEmprendedor({
      nombre_rol: user?.nombre_rol || user?.rol || user?.role,
      id_rol_usu: userRole,
    }) ||
    Number(userRole) === 2 ||
    String(user?.nombre_rol || user?.rol || user?.role || "")
      .toLowerCase()
      .includes("emprendedor");

  // Cargar desembolsos cuando el usuario tenga cédula / rol
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      // Esperar a que el usuario esté hidratado desde sesión
      if (!user?.id && userRole == null && !user?.cedula) {
        return;
      }

      try {
        if (esEmprendedor) {
          // La tabla de staff no aplica; evitar spinner infinito en stats/listado
          if (!cancelled) {
            setLoading(false);
            setDisbursementsData([]);
            setError(null);
          }
          if (user?.cedula) {
            await fetchMisDesembolsos();
            if (!cancelled) await fetchCreditosCuenta();
          } else if (!cancelled) {
            setMisDisbursementsData([]);
            setCreditosCuenta([]);
            setLoadingMis(false);
          }
        } else {
          await fetchDesembolsos();
          if (!cancelled) {
            setMisDisbursementsData([]);
            setCreditosCuenta([]);
            setLoadingMis(false);
          }
        }
      } catch (err) {
        console.error("Error cargando Desembolso:", err);
        if (!cancelled) {
          setDisbursementsData([]);
          setMisDisbursementsData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMis(false);
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [user.cedula, user.id, userRole, esEmprendedor]);

  // Desde Contrato: abrir registro de desembolso con cédula del emprendedor
  useEffect(() => {
    if (esEmprendedor) return;
    if (!location.state?.abrirRegistro) return;
    const idContrato = location.state?.id_contrato;

    const abrirDesdeContrato = async () => {
      if (!idContrato) {
        abrirModalSeleccionarContrato();
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }

      const cedulaDesdeState = String(location.state?.cedula_emprendedor || "").trim();

      try {
        const response = await DesembolsoAPI.getContratosPendientes();
        const lista = response.data?.data || [];
        const contrato = lista.find(
          (c) => String(c.id_contrato) === String(idContrato)
        );
        const cedula =
          cedulaDesdeState || getCedulaEmprendedor(contrato || {});

        setFormDesembolso({
          id_cont: idContrato,
          fecha_desembolso: new Date().toISOString().split("T")[0],
          cedula_desembolso: cedula,
        });
        setCaptureImage(null);
        setCapturePreview(null);
        setFormErrors({});
        setShowCrearModal(true);

        if (!cedula) {
          Swal.fire({
            title: "Cédula no encontrada",
            text: "El contrato no tiene cédula de emprendedor en la aprobación. Revise el expediente.",
            icon: "warning",
            confirmButtonColor: "#2A9D8F",
          });
        }
      } catch (error) {
        console.error("Error al abrir desembolso desde contrato:", error);
        setFormDesembolso({
          id_cont: idContrato,
          fecha_desembolso: new Date().toISOString().split("T")[0],
          cedula_desembolso: cedulaDesdeState,
        });
        setShowCrearModal(true);
      } finally {
        navigate(location.pathname, { replace: true, state: {} });
      }
    };

    abrirDesdeContrato();
  }, [location.state, esEmprendedor]);

  useEffect(() => {
    setCurrentPage(1);
    setCurrentPageMis(1);
  }, [searchTerm, selectedFilter]);

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

  // ============================================================
  // RENDER - Datos de sección y estadísticas
  // ============================================================
  
  const desembolsosPendientes = disbursementsData.filter(d => d.estatus_desembolso === "Pendiente").length;
  const desembolsosConfirmados = disbursementsData.filter(d => d.estatus_desembolso === "Confirmado").length;
  const totalDesembolsos = disbursementsData.length;
  const misDesembolsosCount = esEmprendedor ? misDisbursementsData.length : 0;

  const sectionData = {
    disbursements: {
      title: "Gestión de Desembolsos",
      description: "Administración de desembolsos a emprendedores",
      stats: [
        { id: 1, title: "Total Desembolsos", value: totalDesembolsos, icon: DollarSign, color: "blue", bgColor: "bg-blue-50", textColor: "text-blue-600" },
        { id: 2, title: "Desembolsos Pendientes", value: desembolsosPendientes, icon: Hourglass, color: "yellow", bgColor: "bg-yellow-50", textColor: "text-yellow-600" },
        { id: 3, title: "Desembolsos Confirmados", value: desembolsosConfirmados, icon: CheckCircle, color: "green", bgColor: "bg-green-50", textColor: "text-green-600" },
        { id: 4, title: "Mis Desembolsos", value: misDesembolsosCount, icon: UserCheck, color: "purple", bgColor: "bg-purple-50", textColor: "text-purple-600" },
      ],
    },
  };

  const currentData = sectionData.disbursements;
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ============================================================
  // RENDER - Componentes de UI
  // ============================================================
  const getStatusComponent = (disbursement) => {
    const statusConfig = STATUS_CONFIG[disbursement.estatus_desembolso];
    if (!statusConfig) {
      return (
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg text-sm font-medium">
          <AlertCircle size={14} />
          {disbursement.estatus_desembolso}
        </span>
      );
    }
    const IconComponent = statusConfig.icon;
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 ${statusConfig.bgColor} text-white rounded-lg text-sm font-medium`}>
        <IconComponent size={14} />
        {statusConfig.label}
      </span>
    );
  };

  const handleLogout = () => {
    usuarioAPI.logout();
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  // ============================================================
  // FUNCIÓN PARA RENDERIZAR UNA TABLA DE DESEMBOLSOS
  // ============================================================
  const renderDisbursementTable = (data, title, emptyMessage, currentPageState, setCurrentPageState, loadingState = false, isMisDesembolsos = false) => {
    const filteredData = data.filter((disbursement) => {
      const searchFields = [
        disbursement.id_desembolso?.toString(), 
        disbursement.id_cont?.toString(),
        disbursement.emprendedor || '',
        disbursement.numero_contrato || '',
        disbursement.cedula_desembolso || '',
        disbursement.id_cedula_aprob || '',
      ].join(" ").toLowerCase();
      
      const matchesSearch = searchFields.includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      if (selectedFilter === "pendientes") {
        matchesFilter = disbursement.estatus_desembolso === "Pendiente";
      } else if (selectedFilter === "confirmados") {
        matchesFilter = disbursement.estatus_desembolso === "Confirmado";
      }
      
      return matchesSearch && matchesFilter;
    });

    const indexOfLastItem = currentPageState * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    if (loadingState) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={48} className="animate-spin text-[#2A9D8F] mb-4" />
          <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Cargando {title.toLowerCase()}...</p>
        </div>
      );
    }

    if (error && data.length === 0 && title === "todos los desembolsos") {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <p className={`text-lg font-medium ${darkMode ? "text-red-400" : "text-red-600"} mb-2`}>Error al cargar los datos</p>
          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} mb-4`}>{error}</p>
          <button onClick={() => fetchDesembolsos()} className="px-4 py-2 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#238b7e] transition-colors">
            Reintentar
          </button>
        </div>
      );
    }

    if (currentItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <DollarSign size={48} className="text-gray-400 mb-4" />
          <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <>
        <div className="overflow-x-auto table-scroll">
          <table className="w-full">
            <thead>
              <tr className={`${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID Desembolso</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID Contrato</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Emprendedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Cédula</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Monto</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
              {currentItems.map((disbursement) => (
                <tr key={disbursement.id_desembolso} className={`${darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50"} transition-colors`}>
                  <td className="px-6 py-4 text-sm font-semibold text-[#2A9D8F]">
                    #{disbursement.id_desembolso}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {disbursement.id_cont}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${darkMode ? "bg-gray-700" : "bg-blue-50"}`}>
                        <User size={16} className={darkMode ? "text-gray-300" : "text-blue-600"} />
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                          {disbursement.emprendedor || 'No especificado'}
                        </div>
                        {disbursement.numero_contrato && (
                          <div className="text-xs text-gray-500">N° {disbursement.numero_contrato}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-gray-400" />
                      <span>{disbursement.cedula_desembolso || disbursement.id_cedula_aprob || 'No asignada'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div>
                      <span className="font-bold">{formatMonto(disbursement.monto ?? disbursement.monto_moneda)}</span>
                      <span className="text-xs ml-1">{getMonedaNombre(disbursement.moneda)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    {formatDate(disbursement.fecha_desembolso)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusComponent(disbursement)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => verDetalleDesembolso(disbursement)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Eye size={14} /> Ver Detalle
                      </button>
                      
                      {/* Emprendedor: el desembolso ya no se confirma en el sistema */}
                      {false && isMisDesembolsos &&
                       esEmprendedor &&
                       disbursement.estatus_desembolso === "Pendiente" && (
                        <button
                          onClick={() => confirmarDesembolsoDirecto(disbursement)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <CheckCircle size={14} /> Confirmar / Denegar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={`px-6 py-4 border-t ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredData.length)} de {filteredData.length} {title.toLowerCase()}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPageState((prev) => Math.max(prev - 1, 1))} 
                  disabled={currentPageState === 1} 
                  className={`p-2 rounded-lg border ${currentPageState === 1 ? (darkMode ? "border-gray-600 text-gray-600 cursor-not-allowed" : "border-gray-200 text-gray-300 cursor-not-allowed") : (darkMode ? "border-gray-600 text-gray-400 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50")}`}
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                  <button 
                    key={page} 
                    onClick={() => setCurrentPageState(page)} 
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${currentPageState === page ? "bg-[#2A9D8F] text-white" : (darkMode ? "text-gray-400 hover:bg-gray-700 border border-gray-600" : "text-gray-600 hover:bg-gray-100 border border-gray-200")}`}
                  >
                    {page}
                  </button>
                ))}
                {totalPages > 5 && (
                  <span className="text-gray-400">...</span>
                )}
                <button 
                  onClick={() => setCurrentPageState((prev) => Math.min(prev + 1, totalPages))} 
                  disabled={currentPageState === totalPages} 
                  className={`p-2 rounded-lg border ${currentPageState === totalPages ? (darkMode ? "border-gray-600 text-gray-600 cursor-not-allowed" : "border-gray-200 text-gray-300 cursor-not-allowed") : (darkMode ? "border-gray-600 text-gray-400 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50")}`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

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
                <span className={darkMode ? "text-gray-300" : "text-gray-700"}>Gestión de Desembolsos</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Gestión de Desembolsos</h1>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Administración de desembolsos a emprendedores</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ExportButtons
                    data={disbursementsData.map((d) => ({
                      id_desembolso: d.id_desembolso,
                      id_cont: d.id_cont,
                      emprendedor: d.emprendedor,
                      numero_contrato: d.numero_contrato,
                      cedula: d.cedula_desembolso || d.id_cedula_aprob,
                      monto: d.monto ?? d.monto_moneda,
                      moneda: d.moneda,
                      fecha_desembolso: d.fecha_desembolso,
                      estatus_desembolso: d.estatus_desembolso,
                    }))}
                    columns={[
                      { key: "id_desembolso", label: "ID" },
                      { key: "id_cont", label: "ID Contrato" },
                      { key: "emprendedor", label: "Emprendedor" },
                      { key: "numero_contrato", label: "N° Contrato" },
                      { key: "cedula", label: "Cédula" },
                      { key: "monto", label: "Monto" },
                      { key: "moneda", label: "Moneda" },
                      { key: "fecha_desembolso", label: "Fecha" },
                      { key: "estatus_desembolso", label: "Estado" },
                    ]}
                    title="Desembolsos"
                    fileName="desembolsos"
                    moduloApi="desembolsos"
                    darkMode={darkMode}
                  />
                  {!esEmprendedor && (
                  <button
                    onClick={abrirModalSeleccionarContrato}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    <PlusCircle size={18} />
                    Nuevo Desembolso
                  </button>
                  )}
                </div>
              </div>
            </div>

            {/* Estadísticas */}
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

            {/* Filtros */}
            <div className={`rounded-xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"} shadow-sm overflow-hidden mb-6`}>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar por ID, contrato, emprendedor, cédula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full sm:w-80 pl-10 pr-4 py-2.5 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-200"} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] text-sm`}
                      />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-lg border ${showFilters ? "bg-[#2A9D8F] text-white" : darkMode ? "border-gray-600 text-gray-400 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      <Filter size={18} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {disbursementsData.length} desembolsos totales
                    </span>
                  </div>
                </div>

                {showFilters && (
                  <div className={`mt-4 p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Estado de Desembolso</label>
                        <select
                          value={selectedFilter}
                          onChange={(e) => setSelectedFilter(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-200"} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] text-sm`}
                        >
                          <option value="all">Todos los desembolsos</option>
                          <option value="pendientes">Pendientes</option>
                          <option value="confirmados">Confirmados</option>
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
            </div>

            {/* SECCIÓN 0: DATOS DE CUENTA - EMPRENDEDOR (crédito Interno) */}
            {esEmprendedor && (
              <div className={`rounded-xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"} shadow-sm overflow-hidden mb-6`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
                  <CreditCard size={20} className="text-[#2A9D8F]" />
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                      Datos de cuenta para desembolso
                    </h3>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      Si su crédito fue aprobado con manejo Interno, registre banco y número de cuenta antes del desembolso.
                    </p>
                  </div>
                  <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {creditosCuenta.filter((c) => !c.cuenta_completa).length} pendientes
                  </span>
                </div>

                {loadingCreditosCuenta ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-[#2A9D8F]" />
                  </div>
                ) : creditosCuenta.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                      No tiene créditos con manejo Interno pendientes de datos bancarios.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Aprobación</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Emprendimiento</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Contrato</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase">Cuenta</th>
                          <th className="px-4 py-3 text-center text-xs font-medium uppercase">Acción</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                        {creditosCuenta.map((credito) => {
                          const completa =
                            credito.cuenta_completa === true ||
                            credito.cuenta_completa === "t";
                          return (
                            <tr key={credito.id_aprobacion} className={darkMode ? "hover:bg-gray-700/40" : "hover:bg-gray-50"}>
                              <td className="px-4 py-3 text-sm">#{credito.id_aprobacion}</td>
                              <td className="px-4 py-3 text-sm">
                                {credito.nombre_emprendimiento || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {credito.numero_contrato || (
                                  <span className="text-gray-400">Sin contrato aún</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {completa ? (
                                  <span className="text-emerald-600">
                                    {credito.banco_nombre || "Banco"} · {credito.tipo_cuenta} · {credito.numero_cuenta}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-600">
                                    <AlertCircle size={14} /> Pendiente de registrar
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => abrirModalCuenta(credito)}
                                  className={`px-3 py-1.5 rounded-lg text-sm text-white transition-colors ${
                                    completa
                                      ? "bg-gray-500 hover:bg-gray-600"
                                      : "bg-[#2A9D8F] hover:bg-[#238b7e]"
                                  }`}
                                >
                                  {completa ? "Actualizar cuenta" : "Registrar cuenta"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN 1: MIS DESEMBOLSOS - EMPRENDEDOR */}
            {esEmprendedor && (
              <div className={`rounded-xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"} shadow-sm overflow-hidden mb-6`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                  <UserCheck size={20} className="text-[#2A9D8F]" />
                  <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    Mis Desembolsos
                  </h3>
                  <span className={`ml-auto text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {misDisbursementsData.length} registros
                  </span>
                  {user.cedula && (
                    <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                      Cédula: {user.cedula}
                    </span>
                  )}
                </div>
                {renderDisbursementTable(
                  misDisbursementsData, 
                  "mis desembolsos", 
                  user.cedula ? "No tienes desembolsos registrados con tu cédula" : "No hay cédula de usuario configurada",
                  currentPageMis,
                  setCurrentPageMis,
                  loadingMis,
                  true
                )}
              </div>
            )}

            {/* SECCIÓN 2: TODOS LOS DESEMBOLSOS - STAFF */}
            {!esEmprendedor && (
              <div className={`rounded-xl ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-100"} shadow-sm overflow-hidden`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                  <Users size={20} className="text-[#2A9D8F]" />
                  <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    Todos los Desembolsos
                  </h3>
                  <span className={`ml-auto text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {disbursementsData.length} registros
                  </span>
                </div>
                {renderDisbursementTable(
                  disbursementsData, 
                  "todos los desembolsos", 
                  "No hay desembolsos registrados",
                  currentPage,
                  setCurrentPage,
                  loading,
                  false
                )}
              </div>
            )}

          </div>
          <Footer darkMode={darkMode} />
        </main>
      </div>

      {/* MODAL CREAR DESEMBOLSO */}
      {showCrearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={cerrarModalCrear} />
          <div className={`relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${darkMode ? "bg-emerald-900/50" : "bg-emerald-50"}`}>
                  <Send size={24} className="text-[#2A9D8F]" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Registrar Desembolso</h3>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Complete la información del desembolso</p>
                </div>
              </div>
              <button onClick={cerrarModalCrear} className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}>
                <X size={22} />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); registrarDesembolso(); }}>
                <div className="space-y-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      ID del Contrato <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formDesembolso.id_cont}
                      onChange={(e) => handleInputChange("id_cont", e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg border ${formErrors.id_cont ? "border-red-500 focus:ring-red-500" : (darkMode ? "border-gray-600 focus:ring-[#2A9D8F]" : "border-gray-200 focus:ring-[#2A9D8F]")} ${darkMode ? "bg-gray-700 text-white" : "bg-white"} focus:outline-none focus:ring-2 text-sm`}
                      placeholder="Ej: 1, 2, 3..."
                      readOnly
                    />
                    {formErrors.id_cont && <p className="mt-1 text-xs text-red-500">{formErrors.id_cont}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Cédula del Emprendedor
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={formDesembolso.cedula_desembolso}
                        onChange={(e) => handleInputChange("cedula_desembolso", e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${darkMode ? "border-gray-600 focus:ring-[#2A9D8F]" : "border-gray-200 focus:ring-[#2A9D8F]"} ${darkMode ? "bg-gray-700 text-white" : "bg-white"} focus:outline-none focus:ring-2 text-sm`}
                        placeholder="Cédula del emprendedor"
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Fecha de Desembolso <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="date"
                        value={formDesembolso.fecha_desembolso}
                        onChange={(e) => handleInputChange("fecha_desembolso", e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${formErrors.fecha_desembolso ? "border-red-500 focus:ring-red-500" : (darkMode ? "border-gray-600 focus:ring-[#2A9D8F]" : "border-gray-200 focus:ring-[#2A9D8F]")} ${darkMode ? "bg-gray-700 text-white" : "bg-white"} focus:outline-none focus:ring-2 text-sm`}
                      />
                    </div>
                    {formErrors.fecha_desembolso && <p className="mt-1 text-xs text-red-500">{formErrors.fecha_desembolso}</p>}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Comprobante de Desembolso <span className="text-red-500">*</span>
                    </label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${capturePreview ? (darkMode ? "border-emerald-500 bg-emerald-900/20" : "border-emerald-500 bg-emerald-50") : (darkMode ? "border-gray-600 hover:border-gray-500" : "border-gray-300 hover:border-gray-400")} transition-colors cursor-pointer`}
                         onClick={() => document.getElementById("captureInput").click()}>
                      {capturePreview ? (
                        <div className="space-y-3">
                          <img src={capturePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                          <div className="flex items-center justify-center gap-2">
                            <FileImage size={16} className="text-emerald-500" />
                            <span className="text-sm text-emerald-500">Imagen cargada exitosamente</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCaptureImage(null);
                              setCapturePreview(null);
                            }}
                            className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1 mx-auto"
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload size={48} className="mx-auto text-gray-400" />
                          <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                            Haz clic para subir el comprobante
                          </p>
                          <p className="text-xs text-gray-500">Formatos: JPG, PNG, PDF (máx. 5MB)</p>
                        </div>
                      )}
                      <input
                        id="captureInput"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                    {formErrors.capture_desembolso && <p className="mt-1 text-xs text-red-500">{formErrors.capture_desembolso}</p>}
                  </div>

                  {formErrors.submit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-500" />
                      <p className="text-sm text-red-600">{formErrors.submit}</p>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-4">
                    <button type="button" onClick={cerrarModalCrear} disabled={submitting} className={`px-6 py-2.5 rounded-lg border ${darkMode ? "border-gray-600 text-gray-400 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"} transition-colors text-sm font-medium disabled:opacity-50`}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium disabled:opacity-50">
                      {submitting ? <><Loader2 size={16} className="animate-spin" /> Registrando...</> : <><Send size={16} /> Registrar Desembolso</>}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN DE DESEMBOLSO */}
      {showConfirmacionModal && selectedDisbursement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirmacionModal(false)} />
          <div className={`relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${darkMode ? "bg-red-900/50" : "bg-red-50"}`}>
                  <AlertCircle size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Denegar Desembolso</h3>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Adjunte un estado de cuenta o comprobante que demuestre que no le llegó</p>
                </div>
              </div>
              <button onClick={() => setShowConfirmacionModal(false)} className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}>
                <X size={22} />
              </button>
            </div>

            <div className="p-6">
              <div className={`p-4 rounded-lg mb-6 ${darkMode ? "bg-gray-700/50 border border-gray-600" : "bg-red-50 border border-red-100"}`}>
                <div className="flex items-center gap-3">
                  <AlertCircle size={24} className="text-red-500" />
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Sin comprobante no puede denegar el desembolso
                    </p>
                    <p className="text-xs text-red-600">Debe aceptar el desembolso o adjuntar prueba de que no llegó</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <h4 className="text-sm font-semibold mb-3">Información del Desembolso</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className={darkMode ? "text-gray-400" : "text-gray-500"}>ID Desembolso:</span>
                      <p className="font-semibold">#{selectedDisbursement.id_desembolso}</p>
                    </div>
                    <div>
                      <span className={darkMode ? "text-gray-400" : "text-gray-500"}>ID Contrato:</span>
                      <p>{selectedDisbursement.id_cont}</p>
                    </div>
                    <div>
                      <span className={darkMode ? "text-gray-400" : "text-gray-500"}>Emprendedor:</span>
                      <p>{selectedDisbursement.emprendedor || 'No especificado'}</p>
                    </div>
                    <div>
                      <span className={darkMode ? "text-gray-400" : "text-gray-500"}>Cédula:</span>
                      <p>{selectedDisbursement.cedula_desembolso || selectedDisbursement.id_cedula_aprob || 'No asignada'}</p>
                    </div>
                    <div>
                      <span className={darkMode ? "text-gray-400" : "text-gray-500"}>Monto:</span>
                      <p>{formatMonto(selectedDisbursement.monto ?? selectedDisbursement.monto_moneda)} {getMonedaNombre(selectedDisbursement.moneda)}</p>
                    </div>
                    <div>
                      <span className={darkMode ? "text-gray-400" : "text-gray-500"}>Fecha:</span>
                      <p>{formatDate(selectedDisbursement.fecha_desembolso)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Comprobante / estado de cuenta <span className="text-red-500">*</span>
                  </label>
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center ${confirmacionPreview ? (darkMode ? "border-emerald-500 bg-emerald-900/20" : "border-emerald-500 bg-emerald-50") : (darkMode ? "border-gray-600 hover:border-gray-500" : "border-gray-300 hover:border-gray-400")} transition-colors cursor-pointer`}
                       onClick={() => document.getElementById("confirmacionInput").click()}>
                    {confirmacionPreview ? (
                      <div className="space-y-3">
                        <img src={confirmacionPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                        <div className="flex items-center justify-center gap-2">
                          <FileImage size={16} className="text-emerald-500" />
                          <span className="text-sm text-emerald-500">Imagen cargada exitosamente</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmacionImage(null);
                            setConfirmacionPreview(null);
                          }}
                          className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1 mx-auto"
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload size={48} className="mx-auto text-gray-400" />
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Haz clic para subir el comprobante o estado de cuenta
                        </p>
                        <p className="text-xs text-gray-500">Formatos: JPG, PNG, PDF (máx. 5MB)</p>
                      </div>
                    )}
                    <input
                      id="confirmacionInput"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleConfirmacionImageChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button onClick={() => setShowConfirmacionModal(false)} disabled={confirmando} className={`px-6 py-2.5 rounded-lg border ${darkMode ? "border-gray-600 text-gray-400 hover:bg-gray-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"} transition-colors text-sm font-medium disabled:opacity-50`}>
                    Cancelar
                  </button>
                  <button onClick={confirmarDesembolso} disabled={confirmando || !confirmacionImage} className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium disabled:opacity-50">
                    {confirmando ? <><Loader2 size={16} className="animate-spin" /> Registrando...</> : <><AlertCircle size={16} /> Denegar Desembolso</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE DESEMBOLSO */}
      {showDetalleModal && selectedDisbursementDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDetalleModal(false)} />
          <div className={`relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${darkMode ? "bg-blue-900/50" : "bg-blue-50"}`}>
                  <Eye size={24} className="text-[#2A9D8F]" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Detalle del Desembolso</h3>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    #{selectedDisbursementDetail.id_desembolso} - {selectedDisbursementDetail.emprendedor || 'Sin especificar'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowDetalleModal(false)} className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}>
                <X size={22} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>ID Desembolso</p>
                      <p className="font-semibold">#{selectedDisbursementDetail.id_desembolso}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>ID Contrato</p>
                      <p>{selectedDisbursementDetail.id_cont}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Emprendedor</p>
                      <p>{selectedDisbursementDetail.emprendedor || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Cédula</p>
                      <p>{selectedDisbursementDetail.cedula_desembolso || selectedDisbursementDetail.id_cedula_aprob || 'No asignada'}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Monto</p>
                      <p className="font-bold text-[#2A9D8F]">{formatMonto(selectedDisbursementDetail.monto ?? selectedDisbursementDetail.monto_moneda)} {getMonedaNombre(selectedDisbursementDetail.moneda)}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Fecha de Desembolso</p>
                      <p>{formatDate(selectedDisbursementDetail.fecha_desembolso)}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Estado</p>
                      {getStatusComponent(selectedDisbursementDetail)}
                    </div>
                    {selectedDisbursementDetail.fecha_confirmacion && (
                      <div>
                        <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Fecha de Confirmación</p>
                        <p>{formatDate(selectedDisbursementDetail.fecha_confirmacion)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedDisbursementDetail.capture_desembolso || selectedDisbursementDetail.capture_confirmacion) && (
                  <div className="space-y-4">
                    {selectedDisbursementDetail.capture_desembolso && (
                      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                        <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          <FileImage size={16} className="text-blue-500" />
                          Comprobante de Desembolso
                        </h4>
                        <div className={`rounded-lg overflow-hidden border ${darkMode ? "border-gray-600" : "border-gray-200"}`}>
                          <img 
                            src={selectedDisbursementDetail.capture_desembolso} 
                            alt="Comprobante de desembolso"
                            className="w-full h-auto max-h-96 object-contain bg-gray-100 dark:bg-gray-900"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMTAwIDEwMEM4OC45NTQzIDEwMCA4MCAxMDguOTU0IDgwIDEyMEM4MCAxMzEuMDQ2IDg4Ljk1NDMgMTQwIDEwMCAxNDBDMTExLjA0NiAxNDAgMTIwIDEzMS4wNDYgMTIwIDEyMEMxMjAgMTA4Ljk1NCAxMTEuMDQ2IDEwMCAxMDAgMTAwWk04MiAxMjBDODIgMTEwLjA1OCA5MC4wNTggMTAyIDEwMCAxMDJDMTEwLjA0MiAxMDIgMTE4IDExMC4wNTggMTE4IDEyMEMxMTggMTI5Ljk0MiAxMTAuMDQyIDEzOCAxMDAgMTM4QzkwLjA1OCAxMzggODIgMTI5Ljk0MiA4MiAxMjBaIiBmaWxsPSIjOUM5RkE2Ii8+PHBhdGggZD0iTTEwMCA2NEM4Mi4zMjcgNjQgNjggNzguMzI3IDY4IDk2QzY4IDExMy42NzMgODIuMzI3IDEyOCAxMDAgMTI4QzExNy42NzMgMTI4IDEzMiAxMTMuNjczIDEzMiA5NkMxMzIgNzguMzI3IDExNy42NzMgNjQgMTAwIDY0Wk03MCA5NkM3MCA3OS40MzEgODMuNDMxIDY2IDEwMCA2NkMxMTYuNTY5IDY2IDEzMCA3OS40MzEgMTMwIDk2QzEzMCAxMTIuNTY5IDExNi41NjkgMTI2IDEwMCAxMjZDODMuNDMxIDEyNiA3MCAxMTIuNTY5IDcwIDk2WiIgZmlsbD0iIzlDOUZBNiIvPjwvc3ZnPg==';
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {selectedDisbursementDetail.capture_confirmacion && (
                      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                        <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          <FileImage size={16} className="text-emerald-500" />
                          Comprobante de Confirmación
                        </h4>
                        <div className={`rounded-lg overflow-hidden border ${darkMode ? "border-gray-600" : "border-gray-200"}`}>
                          <img 
                            src={selectedDisbursementDetail.capture_confirmacion} 
                            alt="Comprobante de confirmación"
                            className="w-full h-auto max-h-96 object-contain bg-gray-100 dark:bg-gray-900"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMTAwIDEwMEM4OC45NTQzIDEwMCA4MCAxMDguOTU0IDgwIDEyMEM4MCAxMzEuMDQ2IDg4Ljk1NDMgMTQwIDEwMCAxNDBDMTExLjA0NiAxNDAgMTIwIDEzMS4wNDYgMTIwIDEyMEMxMjAgMTA4Ljk1NCAxMTEuMDQ2IDEwMCAxMDAgMTAwWk04MiAxMjBDODIgMTEwLjA1OCA5MC4wNTggMTAyIDEwMCAxMDJDMTEwLjA0MiAxMDIgMTE4IDExMC4wNTggMTE4IDEyMEMxMTggMTI5Ljk0MiAxMTAuMDQyIDEzOCAxMDAgMTM4QzkwLjA1OCAxMzggODIgMTI5Ljk0MiA4MiAxMjBaIiBmaWxsPSIjOUM5RkE2Ii8+PHBhdGggZD0iTTEwMCA2NEM4Mi4zMjcgNjQgNjggNzguMzI3IDY4IDk2QzY4IDExMy42NzMgODIuMzI3IDEyOCAxMDAgMTI4QzExNy42NzMgMTI4IDEzMiAxMTMuNjczIDEzMiA5NkMxMzIgNzguMzI3IDExNy42NzMgNjQgMTAwIDY0Wk03MCA5NkM3MCA3OS40MzEgODMuNDMxIDY2IDEwMCA2NkMxMTYuNTY5IDY2IDEzMCA3OS40MzEgMTMwIDk2QzEzMCAxMTIuNTY5IDExNi41NjkgMTI2IDEwMCAxMjZDODMuNDMxIDEyNiA3MCAxMTIuNTY5IDcwIDk2WiIgZmlsbD0iIzlDOUZBNiIvPjwvc3ZnPg==';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                {false && selectedDisbursementDetail.estatus_desembolso === "Pendiente" && esEmprendedor && (
                  <button
                    onClick={() => {
                      setShowDetalleModal(false);
                      confirmarDesembolsoDirecto(selectedDisbursementDetail);
                    }}
                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-2 text-sm font-medium mr-3"
                  >
                    <CheckCircle size={16} /> Confirmar / Denegar
                  </button>
                )}
                <button onClick={() => setShowDetalleModal(false)} className="px-6 py-2.5 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SELECCIÓN DE CONTRATOS PENDIENTES */}
      {showContratosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowContratosModal(false)} />
          <div className={`relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${darkMode ? "bg-blue-900/50" : "bg-blue-50"}`}>
                  <FileText size={24} className="text-[#2A9D8F]" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>Seleccionar Contrato</h3>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Seleccione un contrato para registrar el desembolso
                  </p>
                </div>
              </div>
              <button onClick={() => setShowContratosModal(false)} className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}>
                <X size={22} />
              </button>
            </div>

            <div className="p-6">
              {loadingContratos ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={48} className="animate-spin text-[#2A9D8F] mb-4" />
                  <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Cargando contratos...</p>
                </div>
              ) : contratosPendientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <FileText size={48} className="text-gray-400 mb-4" />
                  <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>No hay contratos pendientes por desembolso</p>
                </div>
              ) : (
                <div className="overflow-x-auto table-scroll">
                  <table className="w-full">
                    <thead>
                      <tr className={`${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">N° Contrato</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Emprendedor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Cédula</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Cuenta</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Monto</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                      {contratosPendientes.map((contrato) => {
                        const cuentaOk = contratoTieneCuentaLista(contrato);
                        return (
                        <tr key={contrato.id_contrato} className={`${darkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50"} transition-colors`}>
                          <td className="px-4 py-3 text-sm">#{contrato.id_contrato}</td>
                          <td className="px-4 py-3 text-sm font-medium">{contrato.numero_contrato}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-gray-400" />
                              <span className="text-sm">{contrato.emprendedor || contrato.emprendedor_nombre || 'No especificado'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <CreditCard size={14} className="text-gray-400" />
                              <span>{getCedulaEmprendedor(contrato) || 'No asignada'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {contrato.seleccion_manejo === "Interno" ? (
                              cuentaOk ? (
                                <span className="text-emerald-600 text-xs">
                                  {contrato.banco_nombre || "OK"} · {contrato.numero_cuenta}
                                </span>
                              ) : (
                                <span className="text-amber-600 text-xs flex items-center gap-1">
                                  <AlertCircle size={12} /> Sin cuenta
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">{contrato.seleccion_manejo || "—"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold">{formatMonto(contrato.monto_moneda)}</span>
                            <span className="text-xs ml-1">{getMonedaNombre(contrato.moneda)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => seleccionarContrato(contrato)}
                              disabled={!cuentaOk}
                              title={!cuentaOk ? "El emprendedor debe registrar su cuenta primero" : "Seleccionar"}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 mx-auto ${
                                cuentaOk
                                  ? "bg-[#2A9D8F] text-white hover:bg-[#238b7e]"
                                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                              }`}
                            >
                              <PlusCircle size={14} /> Seleccionar
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO DE CUENTA BANCARIA (emprendedor / Interno) */}
      {showCuentaModal && creditoCuentaSel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !guardandoCuenta && setShowCuentaModal(false)}
          />
          <div
            className={`relative w-full max-w-lg mx-4 rounded-xl shadow-2xl ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div
              className={`flex items-center justify-between p-5 border-b ${
                darkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <div>
                <h3
                  className={`text-lg font-bold ${
                    darkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  Datos de cuenta bancaria
                </h3>
                <p
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Aprobación #{creditoCuentaSel.id_aprobacion}
                  {creditoCuentaSel.numero_contrato
                    ? ` · Contrato ${creditoCuentaSel.numero_contrato}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={guardandoCuenta}
                onClick={() => setShowCuentaModal(false)}
                className={`p-2 rounded-lg ${
                  darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Banco <span className="text-red-500">*</span>
                </label>
                <select
                  value={formCuenta.id_banco}
                  onChange={(e) =>
                    setFormCuenta((prev) => ({ ...prev, id_banco: e.target.value }))
                  }
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-200"
                  }`}
                  disabled={catalogoBancos.length === 0}
                >
                  <option value="">
                    {catalogoBancos.length === 0
                      ? "No tiene bancos en su registro"
                      : "Seleccione un banco"}
                  </option>
                  {catalogoBancos.map((b) => (
                    <option key={b.id_banco} value={b.id_banco}>
                      {b.nombre}
                      {b.siglas ? ` (${b.siglas})` : ""}
                    </option>
                  ))}
                </select>
                {catalogoBancos.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    Solo se muestran los bancos que eligió al registrarse. Si no
                    aparece ninguno, actualice su perfil o contacte a IADEY.
                  </p>
                )}
                {catalogoBancos.length > 0 && (
                  <p className={`mt-1.5 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Solo bancos declarados en su registro inicial.
                  </p>
                )}
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Tipo de cuenta
                </label>
                <select
                  value={formCuenta.tipo_cuenta}
                  onChange={(e) =>
                    setFormCuenta((prev) => ({
                      ...prev,
                      tipo_cuenta: e.target.value,
                    }))
                  }
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <option value="Ahorro">Ahorro</option>
                  <option value="Corriente">Corriente</option>
                </select>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1.5 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Número de cuenta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  value={formCuenta.numero_cuenta}
                  onChange={(e) =>
                    setFormCuenta((prev) => ({
                      ...prev,
                      numero_cuenta: normalizarNumeroCuenta(e.target.value).slice(0, 20),
                    }))
                  }
                  placeholder="Ej. 01340123456789012345"
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-200"
                  }`}
                />
                <p
                  className={`mt-1 text-xs ${
                    darkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  Exactamente 20 dígitos. Sin letras, guiones ni espacios. Los
                  primeros 4 deben ser el código del banco
                  {formCuenta.id_banco
                    ? ` (${
                        catalogoBancos.find(
                          (b) => String(b.id_banco) === String(formCuenta.id_banco)
                        )?.codigo_banco || "según banco seleccionado"
                      })`
                    : " seleccionado"}
                  .
                  {formCuenta.numero_cuenta
                    ? ` (${formCuenta.numero_cuenta.length}/20)`
                    : ""}
                </p>
              </div>
            </div>

            <div
              className={`flex justify-end gap-2 p-5 border-t ${
                darkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <button
                type="button"
                disabled={guardandoCuenta}
                onClick={() => setShowCuentaModal(false)}
                className={`px-4 py-2 rounded-lg text-sm border ${
                  darkMode
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardandoCuenta}
                onClick={guardarCuentaDesembolso}
                className="px-4 py-2 rounded-lg text-sm bg-[#2A9D8F] text-white hover:bg-[#238b7e] disabled:opacity-60 flex items-center gap-2"
              >
                {guardandoCuenta ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Guardando...
                  </>
                ) : (
                  "Guardar cuenta"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Desembolso;