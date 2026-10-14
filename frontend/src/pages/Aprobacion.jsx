import React, { useState, useEffect } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import usuarioAPI from '../services/api_usuario';
import { useNavigate } from "react-router-dom";
import {
  Search,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardCheck,
  User,
  Mail,
  FileCheck,
  FileX,
  Loader,
  Filter,
  Info,
  RefreshCw,
  Image,
  Building2,
  CreditCard,
  SearchIcon,
  ThumbsUp,
  ThumbsDown,
  Circle,
  ArrowRight,
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";

import aprobacionAPI from "../services/api_aprobacion";
import requisitosAPI from "../services/api_requisitos";
import inspeccionAPI from "../services/api_inspeccion";
import bancoAPI from "../services/api_banco";
import { uploadMultipleToImgBB, uploadToImgBB } from "../services/imgbbService";
import { formatCedulaInput } from "../utils/inputFormat";

import InspectionFormCompleto from "../components/InspectionFormCompleto";
import Inspeccion2 from "../components/inspeccion2";

const Aprobacion = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      text: "Nueva aprobación pendiente de revisión",
      time: "5 min",
      read: false,
    },
    {
      id: 2,
      text: "Inspección de emprendimiento programada",
      time: "1 hora",
      read: false,
    },
    {
      id: 3,
      text: "Solicitud de crédito en revisión",
      time: "3 horas",
      read: true,
    },
    { id: 4, text: "Contrato listo para firma", time: "1 día", read: true },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("aprobaciones");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [aprobaciones, setAprobaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAprobacion, setSelectedAprobacion] = useState(null);

  const [showVerificacionModal, setShowVerificacionModal] = useState(false);
  const [selectedExpediente, setSelectedExpediente] = useState(null);
  const [requisitosExpediente, setRequisitosExpediente] = useState([]);
  const [loadingRequisitos, setLoadingRequisitos] = useState(false);
  const [savingRequisitos, setSavingRequisitos] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [seleccionManejo, setSeleccionManejo] = useState("");
  const [idInspeccion, setIdInspeccion] = useState("");
  const [bancosEmprendedor, setBancosEmprendedor] = useState([]);
  const [idPersonaBanco, setIdPersonaBanco] = useState("");
  const [loadingBancos, setLoadingBancos] = useState(false);
  const [catalogoBancos, setCatalogoBancos] = useState([]);
  const [bancoCatalogoSel, setBancoCatalogoSel] = useState("");
  const [guardandoBanco, setGuardandoBanco] = useState(false);

  // Estados para el estatus de la solicitud de crédito y la inspección
  const [estatusCredito, setEstatusCredito] = useState("");
  const [estatusInspeccion, setEstatusInspeccion] = useState("");
  
  // 👇 NUEVO ESTADO PARA LA CÉDULA
  const [cedulaPersonaId, setCedulaPersonaId] = useState("");

  // Definir los pasos del progreso
  const pasosProgreso = [
    { id: 1, nombre: "Documentación (Expediente)", icono: ClipboardCheck },
    { id: 2, nombre: "Inspección de Emprendimiento", icono: SearchIcon },
    { id: 3, nombre: "Decisión Final de Crédito", icono: CreditCard },
    { id: 4, nombre: "Tipo de Manejo", icono: Building2 },
  ];

  const user = {
    name: "Administrador IADEY",
    email: "admin@iadey.gob.ve",
    role: "Administrador",
    avatar: null,
    department: "Gestión de Créditos",
    joinDate: "Enero 2024",
    pendingTasks: 8,
    completedTasks: 45,
    performance: "98%",
  };

  // Cargar aprobaciones (expedientes)
  const loadAprobaciones = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Cargando expedientes...");
      const response = await aprobacionAPI.getAll();

      if (response.success) {
        console.log("Expedientes cargados:", response.data.length);
        setAprobaciones(response.data);
      } else {
        setError(response.error || "Error desconocido al cargar expedientes");
      }
    } catch (err) {
      console.error("Error completo:", err);
      setError("Error de conexión al cargar los expedientes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener las imágenes de un requisito específico
  const obtenerImagenesRequisito = (aprobacion, requisitoId) => {
    if (!aprobacion || !requisitoId) {
      return [];
    }

    const parseJSON = (data) => {
      if (!data) return null;
      if (typeof data === 'object') return data;
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (e) {
          return null;
        }
      }
      return null;
    };

    const buscarEnMapa = (mapa, requisitoId) => {
      if (!mapa || typeof mapa !== 'object') return [];
      const keys = [
        String(requisitoId),
        Number(requisitoId),
        requisitoId,
      ];
      for (const k of keys) {
        if (k === undefined || k === null || k === '') continue;
        const val = mapa[k] ?? mapa[String(k)];
        if (!val) continue;
        if (Array.isArray(val)) return val.filter(Boolean);
        if (typeof val === 'string') return [val];
        if (typeof val === 'object' && (val.url || val.foto_url)) {
          return [val.url || val.foto_url];
        }
      }
      return [];
    };

    // Fuentes posibles de imágenes cargadas en expediente
    const fuentes = [
      aprobacion?.expediente?.urls_imagenes,
      aprobacion?.expediente?.documentos,
      aprobacion?.urls_imagenes,
      aprobacion?.documentos,
    ];

    for (const fuente of fuentes) {
      const mapa = parseJSON(fuente);
      const imgs = buscarEnMapa(mapa, requisitoId);
      if (imgs.length > 0) return imgs;
    }

    return [];
  };

  // Cargar todos los requisitos disponibles
  const loadTodosRequisitos = async () => {
    try {
      const response = await requisitosAPI.getAll();
      if (response.success) {
        const requisitosFormateados = response.data.map((req) => ({
          id_requisito: req.id_requisitos || req.id_requisito,
          nombre: req.nombre_requisito || req.nombre,
          descripcion: req.descripcion || "",
          estado_verificacion: "pendiente",
          observacion_no_valido: "",
        }));
        return requisitosFormateados;
      }
      return [];
    } catch (err) {
      console.error("Error al cargar requisitos:", err);
      return [];
    }
  };

  // Calcular el paso actual del progreso
  // Paso 1 (docs) ya se verificó en Expediente
  const inspeccionDecidida = (est) => {
    const e = String(est || "").toLowerCase();
    return (
      e.includes("aprob") ||
      e.includes("rechaz")
    );
  };

  const calcularPasoActual = () => {
    if (!inspeccionDecidida(estatusInspeccion)) return 2;
    if (!estatusCredito) return 3;
    const creditoRechazado = String(estatusCredito).toLowerCase().includes("rechaz");
    if (!creditoRechazado && !seleccionManejo) return 4;
    return 4;
  };

  // Calcular el porcentaje de progreso general
  const calcularProgresoGeneral = () => {
    let progreso = 25; // Documentación ya verificada en Expediente
    if (inspeccionDecidida(estatusInspeccion)) progreso += 25;
    if (estatusCredito) progreso += 25;
    const creditoRechazado = String(estatusCredito).toLowerCase().includes("rechaz");
    if (creditoRechazado || seleccionManejo) progreso += 25;
    return Math.min(progreso, 100);
  };

  // Verificar si un paso está completado
  const isPasoCompletado = (pasoId) => {
    const creditoRechazado = String(estatusCredito).toLowerCase().includes("rechaz");
    switch(pasoId) {
      case 1:
        return true;
      case 2:
        return inspeccionDecidida(estatusInspeccion);
      case 3:
        return inspeccionDecidida(estatusInspeccion) && Boolean(estatusCredito);
      case 4:
        return (
          inspeccionDecidida(estatusInspeccion) &&
          Boolean(estatusCredito) &&
          (creditoRechazado || Boolean(seleccionManejo))
        );
      default:
        return false;
    }
  };

  // Verificar si un paso está activo
  const isPasoActivo = (pasoId) => {
    return calcularPasoActual() === pasoId;
  };

  // Abrir modal de detalle
  const handleOpenDetail = (aprobacion) => {
    setSelectedAprobacion(aprobacion);
    setShowDetailModal(true);
  };

  // Abrir modal de verificación
  const handleOpenVerificacion = async (aprobacion) => {
    console.log("🔍 DATOS DE APROBACIÓN RECIBIDOS:", aprobacion);
    console.log("🔍 CÉDULA EN DATOS RECIBIDOS:", aprobacion.cedula);
    console.log("🔍 CÉDULA PERSONA ID:", aprobacion.cedula_persona_id);
    console.log("🔍 ID USUARIO:", aprobacion.id_usuario);

    setSelectedAprobacion(aprobacion);
    setObservaciones(aprobacion.observaciones || "");
    setSeleccionManejo(aprobacion.seleccion_manejo || "");
    setIdInspeccion(
      aprobacion.id_inspeccion ? String(aprobacion.id_inspeccion) : "",
    );
    
    // Inspección Completada aún requiere decisión Aprobado/Rechazado del presidente
    const estIns = aprobacion.estatus_inspeccion || "";
    const estInsNorm = String(estIns).toLowerCase();
    if (
      estInsNorm === "completada" ||
      estInsNorm === "pendiente" ||
      !estIns
    ) {
      setEstatusInspeccion("");
    } else {
      setEstatusInspeccion(estIns);
    }
    setEstatusCredito(aprobacion.estatus_aprobacion || "");
    setIdPersonaBanco(aprobacion.id_persona_banco ? String(aprobacion.id_persona_banco) : "");
    setBancosEmprendedor([]);
    
    // 👇 INICIALIZAR LA CÉDULA CON MÚLTIPLES FUENTES
    const cedulaInicial = 
      aprobacion.cedula || 
      aprobacion.cedula_persona_id || 
      aprobacion.id_usuario || 
      "";
    setCedulaPersonaId(cedulaInicial);
    console.log("📋 CÉDULA INICIAL ASIGNADA:", cedulaInicial);

    if (cedulaInicial) {
      setLoadingBancos(true);
      Promise.all([
        bancoAPI.getByCedula(cedulaInicial),
        bancoAPI.getCatalogo(),
      ])
        .then(([res, cat]) => {
          const list = res.success ? (res.data || []) : [];
          setBancosEmprendedor(list);
          if (cat.success) setCatalogoBancos(cat.data || []);
          if (list.length === 1 && !aprobacion.id_persona_banco) {
            setIdPersonaBanco(String(list[0].id_persona_banco));
          }
        })
        .catch(() => setBancosEmprendedor([]))
        .finally(() => setLoadingBancos(false));
    } else {
      bancoAPI.getCatalogo().then((cat) => {
        if (cat.success) setCatalogoBancos(cat.data || []);
      }).catch(() => {});
    }
    
    setLoadingRequisitos(true);

    try {
      let datosCompletos = { ...aprobacion };

      // Siempre recargar expediente para tener urls_imagenes / cédula actualizadas
      if (aprobacion.id_expediente) {
        try {
          const responseExpediente = await aprobacionAPI.getById(aprobacion.id_expediente);
          if (responseExpediente.success && responseExpediente.data) {
            const cedulaCompleta =
              responseExpediente.data.cedula ||
              responseExpediente.data.cedula_persona_id ||
              "";

            if (cedulaCompleta) {
              setCedulaPersonaId(cedulaCompleta);
            }

            datosCompletos = {
              ...datosCompletos,
              ...responseExpediente.data,
              urls_imagenes:
                responseExpediente.data.urls_imagenes ||
                datosCompletos.urls_imagenes,
              documentos:
                responseExpediente.data.documentos ||
                responseExpediente.data.urls_imagenes ||
                datosCompletos.documentos,
              expediente: {
                ...(datosCompletos.expediente || {}),
                ...(responseExpediente.data.expediente || {}),
                urls_imagenes:
                  responseExpediente.data.expediente?.urls_imagenes ||
                  responseExpediente.data.urls_imagenes ||
                  datosCompletos.urls_imagenes,
                documentos:
                  responseExpediente.data.expediente?.documentos ||
                  responseExpediente.data.urls_imagenes ||
                  datosCompletos.documentos,
              },
            };
            setSelectedAprobacion(datosCompletos);
          }
        } catch (err) {
          console.error("Error al cargar datos del expediente:", err);
        }
      }

      if (
        datosCompletos.verificacion_requisitos &&
        Array.isArray(datosCompletos.verificacion_requisitos) &&
        datosCompletos.verificacion_requisitos.length > 0
      ) {
        const requisitosActualizados = datosCompletos.verificacion_requisitos.map(req => ({
          ...req,
          estado_verificacion: "verificado",
          observacion_no_valido: "",
        }));
        setRequisitosExpediente(requisitosActualizados);
      }
      else if (
        datosCompletos.requisitos_expediente &&
        Array.isArray(datosCompletos.requisitos_expediente) &&
        datosCompletos.requisitos_expediente.length > 0
      ) {
        const requisitosConEstado = datosCompletos.requisitos_expediente.map(
          (req) => ({
            ...req,
            estado_verificacion: "verificado",
            observacion_no_valido: "",
          }),
        );
        setRequisitosExpediente(requisitosConEstado);
      }
      else {
        const requisitos = await loadTodosRequisitos();
        setRequisitosExpediente(
          requisitos.map((r) => ({
            ...r,
            estado_verificacion: "verificado",
            observacion_no_valido: "",
          })),
        );
      }

      setShowVerificacionModal(true);
    } catch (err) {
      console.error("Error al abrir modal de verificación:", err);
      alert("Error al cargar los requisitos");
    } finally {
      setLoadingRequisitos(false);
    }
  };

  // Cerrar modales
  const handleCloseModals = () => {
    setShowDetailModal(false);
    setShowVerificacionModal(false);
    setSelectedAprobacion(null);
    setRequisitosExpediente([]);
    setObservaciones("");
    setSeleccionManejo("");
    setIdInspeccion("");
    setEstatusCredito("");
    setEstatusInspeccion("");
    setCedulaPersonaId("");
    setBancosEmprendedor([]);
    setIdPersonaBanco("");
    setBancoCatalogoSel("");
  };

  // Cambiar el estado de verificación del requisito
  const cambiarEstadoVerificacion = (index, nuevoEstado) => {
    const nuevosRequisitos = [...requisitosExpediente];
    nuevosRequisitos[index] = {
      ...nuevosRequisitos[index],
      estado_verificacion: nuevoEstado,
      observacion_no_valido: nuevoEstado !== 'no_valido' ? '' : nuevosRequisitos[index].observacion_no_valido,
    };
    setRequisitosExpediente(nuevosRequisitos);
  };

  // Actualizar la observación cuando no es válido
  const actualizarObservacionNoValido = (index, observacion) => {
    const nuevosRequisitos = [...requisitosExpediente];
    nuevosRequisitos[index] = {
      ...nuevosRequisitos[index],
      observacion_no_valido: observacion,
    };
    setRequisitosExpediente(nuevosRequisitos);
  };

  // Guardar verificación de requisitos
  const handleSaveVerificacion = async () => {
    if (!selectedAprobacion) {
      alert("❌ No hay expediente seleccionado");
      return;
    }

    console.log("📋 ESTADO ACTUAL DE CÉDULA:", {
      cedulaPersonaId: cedulaPersonaId,
      selectedAprobacion_cedula: selectedAprobacion.cedula,
      selectedAprobacion_cedula_persona_id: selectedAprobacion.cedula_persona_id,
      selectedAprobacion_id_usuario: selectedAprobacion.id_usuario
    });

    // 👇 OBTENER CÉDULA DE MÚLTIPLES FUENTES (SIN TRIM)
    let cedulaFinal = cedulaPersonaId;
    
    if (!cedulaFinal || cedulaFinal === "") {
      cedulaFinal = selectedAprobacion.cedula || 
                    selectedAprobacion.cedula_persona_id || 
                    selectedAprobacion.id_usuario || 
                    "";
    }
    
    if (!cedulaFinal || cedulaFinal === "") {
      const inputElement = document.querySelector('input[placeholder="Ingrese la cédula..."]');
      if (inputElement) {
        cedulaFinal = inputElement.value || "";
      }
    }

    console.log("📋 CÉDULA FINAL A ENVIAR:", cedulaFinal);

    if (!cedulaFinal || cedulaFinal === "") {
      alert("⚠️ Debe ingresar la cédula del solicitante");
      return;
    }

    // Validaciones existentes (SIN TRIM)
    if (idInspeccion && idInspeccion !== "") {
      if (isNaN(parseInt(idInspeccion))) {
        alert("❌ El ID de inspección debe ser un número válido");
        return;
      }
    }

    if (!selectedAprobacion.id_expediente) {
      alert("❌ Error: El expediente no tiene un ID válido");
      return;
    }

    const progresoGeneral = calcularProgresoGeneral();
    const creditoRechazado = String(estatusCredito || "")
      .toLowerCase()
      .includes("rechaz");
    const creditoAprobado =
      String(estatusCredito || "").toLowerCase().includes("aprob") &&
      !creditoRechazado;

    if (progresoGeneral === 100 || creditoAprobado || creditoRechazado) {
      if (!estatusCredito) {
        alert("⚠️ Debe seleccionar si la solicitud de crédito es Aprobada o Rechazada");
        return;
      }
      if (!inspeccionDecidida(estatusInspeccion)) {
        alert("⚠️ Debe seleccionar si la inspección es Aprobada o Rechazada");
        return;
      }
      if (creditoAprobado && !seleccionManejo) {
        alert("⚠️ Debe seleccionar el tipo de manejo (Interno o Banco)");
        return;
      }
      if (creditoAprobado && seleccionManejo === "Banco" && !idPersonaBanco) {
        alert("⚠️ Debe seleccionar el banco al cual se direccionará el crédito");
        return;
      }
    }

    // Requisitos ya verificados en Expediente
    const requisitosParaEnviar = (requisitosExpediente.length
      ? requisitosExpediente
      : [{ id_requisito: 1, nombre: "Documentación verificada en Expediente" }]
    ).map((req) => ({
      id_requisito: req.id_requisito || 1,
      nombre: req.nombre || "Documento",
      verificado: true,
      estado_verificacion: "verificado",
      observacion_no_valido: null,
    }));

    const idInsp =
      idInspeccion &&
      String(idInspeccion) !== String(selectedAprobacion.id_expediente)
        ? parseInt(idInspeccion, 10)
        : selectedAprobacion.id_inspeccion
          ? parseInt(selectedAprobacion.id_inspeccion, 10)
          : null;

    const datosVerificacion = {
      requisitos: requisitosParaEnviar,
      observaciones: observaciones || "",
      seleccion_manejo: creditoAprobado ? seleccionManejo || null : null,
      id_inspeccion: idInsp && !Number.isNaN(idInsp) ? idInsp : null,
      estatus_aprobacion: estatusCredito || "Pendiente",
      estatus_inspeccion: estatusInspeccion || null,
      cedula_persona_id: cedulaFinal,
      id_persona_banco:
        creditoAprobado && seleccionManejo === "Banco" && idPersonaBanco
          ? parseInt(idPersonaBanco, 10)
          : null,
    };

    await enviarVerificacion(datosVerificacion);
  };

  const enviarVerificacion = async (datosVerificacion) => {
    setSavingRequisitos(true);
    try {
      console.log("📤 ENVIANDO DATOS AL SERVIDOR:", JSON.stringify(datosVerificacion, null, 2));

      const response = await aprobacionAPI.verificarRequisitos(
        selectedAprobacion.id_expediente,
        datosVerificacion,
      );

      if (response.success) {
        const idCredito =
          response.id_credito_banco ||
          response.data?.id_credito_banco ||
          null;
        const debeDescargar =
          response.descargar_aval ||
          response.data?.descargar_aval ||
          Boolean(idCredito);

        if (
          debeDescargar &&
          idCredito &&
          String(datosVerificacion.estatus_aprobacion || "")
            .toLowerCase()
            .includes("aprob") &&
          datosVerificacion.seleccion_manejo === "Banco"
        ) {
          try {
            const blob = await bancoAPI.descargarAvalPdf(idCredito);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `aval_iadey_credito_${idCredito}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
          } catch (pdfErr) {
            console.error("Error descargando PDF aval:", pdfErr);
            alert(
              "Aprobación guardada, pero no se pudo descargar el PDF del aval automáticamente.",
            );
          }
        }

        alert(
          "✅ Requisitos verificados y guardados exitosamente\n" +
            (response.message || "") +
            (debeDescargar
              ? "\nSe descargó el PDF de dirección de crédito a banco."
              : ""),
        );
        handleCloseModals();
        loadAprobaciones();
      } else {
        alert("❌ Error: " + (response.error || "Error desconocido"));
      }
    } catch (err) {
      console.error("Error al guardar:", err);
      alert(
        `❌ Error al guardar la verificación de requisitos: ${err.message}`,
      );
    } finally {
      setSavingRequisitos(false);
    }
  };

  // Calcular progreso de verificación
  const calcularProgreso = (requisitos) => {
    if (!requisitos || requisitos.length === 0) return 0;
    const verificados = requisitos.filter((r) => r.estado_verificacion === 'verificado').length;
    return Math.round((verificados / requisitos.length) * 100);
  };

  // Cargar datos al iniciar
  useEffect(() => {
    if (activeTab === "aprobaciones") {
      loadAprobaciones();
    }
  }, [activeTab]);

  // Manejar logout
  const handleLogout = () => {
    usuarioAPI.logout();
  };

  // Marcar notificación como leída
  const markAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest(".notifications-menu") &&
        !e.target.closest(".user-menu")
      ) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Filtrar aprobaciones
  const filteredAprobaciones = aprobaciones.filter((aprob) => {
    const matchesSearch =
      searchTerm === "" ||
      aprob.codigo_expediente
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      aprob.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aprob.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aprob.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      selectedFilter === "all" ||
      aprob.estatus_aprobacion === selectedFilter ||
      aprob.estatus === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAprobaciones = filteredAprobaciones.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredAprobaciones.length / itemsPerPage);

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Fecha inválida";
    }
  };

  // Color según estatus
  const getStatusColor = (estatus) => {
    const colors = {
      Pendiente: "bg-yellow-100 text-yellow-800 border-yellow-300",
      "En Proceso": "bg-blue-100 text-blue-800 border-blue-300",
      Aprobado: "bg-green-100 text-green-800 border-green-300",
      Rechazado: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[estatus] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Icono según estatus
  const getStatusIcon = (estatus) => {
    const icons = {
      Pendiente: <Clock size={20} className="text-yellow-600" />,
      "En Proceso": <FileText size={20} className="text-blue-600" />,
      Aprobado: <CheckCircle size={20} className="text-green-600" />,
      Rechazado: <AlertCircle size={20} className="text-red-600" />,
    };
    return (
      icons[estatus] || <AlertCircle size={20} className="text-gray-600" />
    );
  };

  // Color según tipo de manejo
  const getManejoColor = (manejo) => {
    const colors = {
      Interno: "bg-purple-100 text-purple-800 border-purple-300",
      Banco: "bg-indigo-100 text-indigo-800 border-indigo-300",
    };
    return colors[manejo] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Icono según tipo de manejo
  const getManejoIcon = (manejo) => {
    switch (manejo) {
      case "Interno":
        return "🏢";
      case "Banco":
        return "🏦";
      default:
        return "❓";
    }
  };

  // Estadísticas
  const stats = {
    total: aprobaciones.length,
    pendientes: aprobaciones.filter(
      (a) => a.estatus_aprobacion === "Pendiente" || a.estatus === "Pendiente",
    ).length,
    enProceso: aprobaciones.filter(
      (a) =>
        a.estatus_aprobacion === "En Proceso" || a.estatus === "En Proceso",
    ).length,
    aprobados: aprobaciones.filter(
      (a) => a.estatus_aprobacion === "Aprobado" || a.estatus === "Aprobado",
    ).length,
    rechazados: aprobaciones.filter(
      (a) => a.estatus_aprobacion === "Rechazado" || a.estatus === "Rechazado",
    ).length,
  };

  // Contador de notificaciones no leídas
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .modal-scroll-content {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 transparent;
        }
        
        .modal-scroll-content::-webkit-scrollbar {
          width: 8px;
        }
        
        .modal-scroll-content::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 4px;
        }
        
        .modal-scroll-content::-webkit-scrollbar-thumb {
          background-color: #CBD5E0;
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        
        .modal-scroll-content::-webkit-scrollbar-thumb:hover {
          background-color: #A0AEC0;
        }
        
        .dark .modal-scroll-content::-webkit-scrollbar-thumb {
          background-color: #4A5568;
        }
        
        .dark .modal-scroll-content::-webkit-scrollbar-thumb:hover {
          background-color: #718096;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #CBD5E0;
          border-radius: 3px;
          transition: background-color 0.2s;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #A0AEC0;
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #4A5568;
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #718096;
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 transparent;
        }
        
        .dark .custom-scrollbar {
          scrollbar-color: #4A5568 transparent;
        }
      `}</style>

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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
        />

        <main
          className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}
        >
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            {/* Título */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1
                  className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                >
                  Gestión de Aprobaciones
                </h1>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Verificación de requisitos y aprobación de expedientes
                </p>
              </div>
              <ExportButtons
                data={aprobaciones.map((a) => ({
                  id_expediente: a.id_expediente,
                  codigo_expediente: a.codigo_expediente,
                  nombre: `${a.nombres || ""} ${a.apellidos || ""}`.trim(),
                  cedula: a.cedula || a.cedula_persona_id || "",
                  estatus_aprobacion: a.estatus_aprobacion || a.estatus,
                  seleccion_manejo: a.seleccion_manejo || "",
                  estatus_inspeccion: a.estatus_inspeccion || "",
                }))}
                columns={[
                  { key: "id_expediente", label: "ID Expediente" },
                  { key: "codigo_expediente", label: "Código" },
                  { key: "nombre", label: "Nombre" },
                  { key: "cedula", label: "Cédula" },
                  { key: "estatus_aprobacion", label: "Estatus" },
                  { key: "seleccion_manejo", label: "Manejo" },
                  { key: "estatus_inspeccion", label: "Inspección" },
                ]}
                title="Aprobaciones"
                fileName="aprobaciones"
                moduloApi="aprobaciones"
                darkMode={darkMode}
              />
            </div>

            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Briefcase className="text-blue-600" size={20} />
                  </div>
                  <h3
                    className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {stats.total}
                  </h3>
                </div>
                <p
                  className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Total Expedientes
                </p>
              </div>

              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-yellow-50">
                    <Clock className="text-yellow-600" size={20} />
                  </div>
                  <h3
                    className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {stats.pendientes}
                  </h3>
                </div>
                <p
                  className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Pendientes
                </p>
              </div>

              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                  <h3
                    className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {stats.enProceso}
                  </h3>
                </div>
                <p
                  className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  En Proceso
                </p>
              </div>

              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-green-50">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <h3
                    className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {stats.aprobados}
                  </h3>
                </div>
                <p
                  className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Aprobados                </p>
              </div>

              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-red-50">
                    <AlertCircle className="text-red-600" size={20} />
                  </div>
                  <h3
                    className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {stats.rechazados}
                  </h3>
                </div>
                <p
                  className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Rechazados
                </p>
              </div>
            </div>

            {/* Barra de búsqueda y filtros */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre o email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    darkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                      : "bg-white border-gray-200 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={selectedFilter}
                  onChange={(e) => {
                    setSelectedFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg border ${
                    darkMode
                      ? "bg-gray-800 border-gray-700 text-white"
                      : "bg-white border-gray-200"
                  } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                >
                  <option value="all">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="En Proceso">En Proceso</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="Rechazado">Rechazado</option>
                </select>

                <button
                  onClick={loadAprobaciones}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw
                    size={20}
                    className={loading ? "animate-spin" : ""}
                  />
                  Actualizar
                </button>
              </div>
            </div>

            {/* Tabla de Expedientes */}
            <div
              className={`rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg overflow-hidden`}
            >
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2A9D8F] mx-auto"></div>
                  <p
                    className={`mt-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Cargando expedientes...
                  </p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <AlertCircle
                    className="mx-auto text-red-500 mb-4"
                    size={48}
                  />
                  <p className="text-red-500 mb-4">{error}</p>
                  <button
                    onClick={loadAprobaciones}
                    className="px-4 py-2 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto table-scroll">
                    <table className="w-full">
                      <thead>
                        <tr
                          className={`${darkMode ? "bg-gray-700" : "bg-gray-50"}`}
                        >
                          <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-700">
                            Expediente
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-700">
                            Solicitante
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-700">
                            Manejo
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-700">
                            Estado
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-700">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}
                      >
                        {currentAprobaciones.length > 0 ? (
                          currentAprobaciones.map((aprobacion) => (
                            <tr
                              key={aprobacion.id_expediente}
                              className={`${
                                darkMode
                                  ? "hover:bg-gray-700/50"
                                  : "hover:bg-gray-50"
                              } transition-colors`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-700 text-gray-700">
                                {aprobacion.codigo_expediente}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-700 text-gray-700">
                                <div>
                                  <p className="font-medium">
                                    {aprobacion.nombres} {aprobacion.apellidos}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {aprobacion.email}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {aprobacion.seleccion_manejo ? (
                                  <span
                                    className={`px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full border ${getManejoColor(aprobacion.seleccion_manejo)}`}
                                  >
                                    {getManejoIcon(
                                      aprobacion.seleccion_manejo,
                                    )}{" "}
                                    {aprobacion.seleccion_manejo}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    No definido
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full border ${getStatusColor(aprobacion.estatus_aprobacion || aprobacion.estatus)}`}
                                >
                                  {getStatusIcon(
                                    aprobacion.estatus_aprobacion || "Sin definir"
                                  )}
                                  {aprobacion.estatus_aprobacion || "Sin definir"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      handleOpenVerificacion(aprobacion)
                                    }
                                    className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                    title="Verificar/Editar requisitos"
                                  >
                                    <ClipboardCheck size={18} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleOpenDetail(aprobacion)
                                    }
                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Ver detalles"
                                  >
                                    <Eye size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-6 py-8 text-center text-sm dark:text-gray-400 text-gray-500"
                            >
                              No se encontraron expedientes
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {filteredAprobaciones.length > 0 && (
                    <div
                      className={`px-6 py-4 flex items-center justify-between border-t dark:border-gray-700 border-gray-200`}
                    >
                      <div className="text-sm dark:text-gray-400 text-gray-600">
                        Mostrando {indexOfFirstItem + 1} a{" "}
                        {Math.min(indexOfLastItem, filteredAprobaciones.length)}{" "}
                        de {filteredAprobaciones.length} expedientes
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          className={`p-2 rounded-lg ${
                            currentPage === 1
                              ? "text-gray-400 cursor-not-allowed"
                              : darkMode
                                ? "text-gray-300 hover:bg-gray-700"
                                : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <ChevronLeft size={20} />
                        </button>

                        {[...Array(totalPages)].map((_, index) => (
                          <button
                            key={index + 1}
                            onClick={() => setCurrentPage(index + 1)}
                            className={`px-3 py-1 rounded-lg text-sm ${
                              currentPage === index + 1
                                ? "bg-[#2A9D8F] text-white"
                                : darkMode
                                  ? "text-gray-300 hover:bg-gray-700"
                                  : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {index + 1}
                          </button>
                        ))}

                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages),
                            )
                          }
                          disabled={currentPage === totalPages}
                          className={`p-2 rounded-lg ${
                            currentPage === totalPages
                              ? "text-gray-400 cursor-not-allowed"
                              : darkMode
                                ? "text-gray-300 hover:bg-gray-700"
                                : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Footer darkMode={darkMode} />
        </main>
      </div>

      {/* ==================== MODAL DE VERIFICACIÓN DE REQUISITOS ==================== */}
      {showVerificacionModal && selectedAprobacion && (
        <div className="fixed inset-0 z-50">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            {/* Fondo */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={handleCloseModals}
            />

            {/* Modal */}
            <div
              className={`relative w-full max-w-6xl rounded-2xl shadow-xl flex flex-col ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
              style={{ maxHeight: '90vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* HEADER FIJO */}
              <div
                className={`flex-shrink-0 flex items-center justify-between px-6 py-4 border-b ${
                  darkMode ? "border-gray-700" : "border-gray-100"
                }`}
              >
                <div>
                  <h3
                    className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Proceso de Aprobación
                  </h3>
                  <p
                    className={`text-sm mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Expediente: {selectedAprobacion.codigo_expediente} | ID: #
                    {selectedAprobacion.id_expediente}
                  </p>
                </div>
                <button
                  onClick={handleCloseModals}
                  className={`p-1 rounded-lg ${
                    darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  } transition-colors`}
                >
                  <X
                    size={20}
                    className={darkMode ? "text-gray-400" : "text-gray-500"}
                  />
                </button>
              </div>

              {/* BARRA DE PROGRESO GENERAL */}
              <div className={`flex-shrink-0 px-6 py-4 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      Progreso General del Proceso
                    </h4>
                    <span className={`text-sm font-bold ${darkMode ? "text-[#2A9D8F]" : "text-[#2A9D8F]"}`}>
                      {calcularProgresoGeneral()}%
                    </span>
                  </div>
                  
                  <div className={`w-full h-3 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#264653] to-[#2A9D8F] transition-all duration-500 ease-out"
                      style={{ width: `${calcularProgresoGeneral()}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {pasosProgreso.map((paso) => {
                    const IconoPaso = paso.icono;
                    const completado = isPasoCompletado(paso.id);
                    const activo = isPasoActivo(paso.id);
                    
                    return (
                      <div key={paso.id} className="flex flex-col items-center">
                        <div
                          className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                            completado
                              ? "bg-[#2A9D8F] border-[#2A9D8F]"
                              : activo
                              ? "border-[#2A9D8F] bg-[#2A9D8F]/10 animate-pulse-slow"
                              : darkMode
                              ? "border-gray-600 bg-gray-700"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {completado ? (
                            <CheckCircle size={18} className="text-white" />
                          ) : (
                            <IconoPaso
                              size={18}
                              className={
                                activo
                                  ? "text-[#2A9D8F]"
                                  : darkMode
                                  ? "text-gray-500"
                                  : "text-gray-400"
                              }
                            />
                          )}
                        </div>
                        <div className="mt-2 text-center">
                          <p
                            className={`text-xs font-medium leading-tight ${
                              completado
                                ? "text-[#2A9D8F]"
                                : activo
                                ? darkMode
                                  ? "text-white"
                                  : "text-gray-900"
                                : darkMode
                                ? "text-gray-500"
                                : "text-gray-400"
                            }`}
                          >
                            {paso.nombre}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              completado
                                ? "text-green-500"
                                : activo
                                ? "text-[#2A9D8F]"
                                : darkMode
                                ? "text-gray-600"
                                : "text-gray-400"
                            }`}
                          >
                            {completado
                              ? "✓ Completado"
                              : activo
                              ? "En progreso..."
                              : "Pendiente"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CONTENIDO CON SCROLL */}
              <div 
                className="flex-1 overflow-y-auto px-6 py-5 modal-scroll-content"
                style={{ minHeight: 0 }}
              >
                {/* Sección 1: Información del Solicitante CON CAMPO DE CÉDULA EDITABLE */}
                <div className="mb-8">
                  <h3
                    className={`text-lg font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Información del Solicitante
                  </h3>
                  <div
                    className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg ${
                      darkMode ? "bg-gray-700/50" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <User
                        size={18}
                        className={darkMode ? "text-gray-400" : "text-gray-500"}
                      />
                      <div>
                        <p
                          className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Solicitante
                        </p>
                        <p
                          className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                        >
                          {selectedAprobacion.nombres}{" "}
                          {selectedAprobacion.apellidos}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail
                        size={18}
                        className={darkMode ? "text-gray-400" : "text-gray-500"}
                      />
                      <div>
                        <p
                          className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Email
                        </p>
                        <p
                          className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                        >
                          {selectedAprobacion.email}
                        </p>
                      </div>
                    </div>

                    {/* 👇 CAMPO DE CÉDULA EDITABLE */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                        <User size={18} className="text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Cédula / ID Persona <span className="text-red-500">*</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={cedulaPersonaId}
                            onChange={(e) => {
                              const value = formatCedulaInput(e.target.value);
                              setCedulaPersonaId(value);
                            }}
                            placeholder="V-12345678"
                            maxLength={10}
                            className={`w-full px-3 py-1.5 text-sm rounded-lg border ${
                              darkMode
                                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                                : "bg-white border-gray-200 placeholder-gray-400 focus:border-purple-500"
                            } focus:ring-1 focus:ring-purple-500 transition-colors`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const cedulaAuto = 
                                selectedAprobacion.cedula || 
                                selectedAprobacion.cedula_persona_id || 
                                selectedAprobacion.id_usuario || 
                                "";
                              if (cedulaAuto) {
                                setCedulaPersonaId(formatCedulaInput(cedulaAuto));
                                console.log("✅ Cédula autocompletada:", cedulaAuto);
                                alert(`✅ Cédula automática: ${formatCedulaInput(cedulaAuto)}`);
                              } else {
                                alert("⚠️ No se encontró una cédula automática");
                              }
                            }}
                            className="px-3 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                            title="Auto-completar cédula"
                          >
                            <RefreshCw size={14} />
                            Auto
                          </button>
                        </div>
                        <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-400"}`}>
                          💡 Ingrese manualmente o use el botón "Auto" para autocompletar
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección 2: Documentación ya verificada en Expediente - PASO 1 */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      Paso 1: Documentación
                    </h3>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      ✓ Verificada en Expediente
                    </span>
                  </div>
                  <div
                    className={`p-4 rounded-lg ${
                      darkMode
                        ? "bg-emerald-900/20 border border-emerald-700/40 text-emerald-200"
                        : "bg-emerald-50 border border-emerald-200 text-emerald-900"
                    }`}
                  >
                    <p className="text-sm">
                      La documentación ya fue verificada en el módulo de Expediente.
                      El presidente no debe volver a verificar los requisitos.
                    </p>
                  </div>
                </div>

                {/* Sección 3: Inspección de Emprendimiento - PASO 2 */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      Paso 2: Inspección de Emprendimiento
                    </h3>
                    {estatusInspeccion && (
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        String(estatusInspeccion).toLowerCase().includes("aprob")
                          ? "bg-green-100 text-green-700"
                          : String(estatusInspeccion).toLowerCase().includes("rechaz")
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}>
                        {String(estatusInspeccion).toLowerCase().includes("aprob")
                          ? "✓ Aprobada"
                          : String(estatusInspeccion).toLowerCase().includes("rechaz")
                            ? "✗ Rechazada"
                            : estatusInspeccion}
                      </span>
                    )}
                  </div>
                  
                  <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-xl">📊</div>
                      <div>
                        <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Estatus actual de la inspección
                        </p>
                        <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {selectedAprobacion.estatus_inspeccion || "No realizada"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className={`block text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Cambiar estatus de la inspección:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setEstatusInspeccion("Aprobado")}
                          className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                            estatusInspeccion === "Aprobado"
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : darkMode
                                ? "border-gray-600 hover:border-green-500"
                                : "border-gray-200 hover:border-green-500"
                          }`}
                        >
                          <ThumbsUp size={18} className={estatusInspeccion === "Aprobado" ? "text-green-600" : ""} />
                          <span className={`text-sm font-medium ${
                            estatusInspeccion === "Aprobado"
                              ? "text-green-700 dark:text-green-400"
                              : darkMode ? "text-gray-300" : "text-gray-700"
                          }`}>
                            Aprobar Inspección
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEstatusInspeccion("Rechazado")}
                          className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                            estatusInspeccion === "Rechazado"
                              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                              : darkMode
                                ? "border-gray-600 hover:border-red-500"
                                : "border-gray-200 hover:border-red-500"
                          }`}
                        >
                          <ThumbsDown size={18} className={estatusInspeccion === "Rechazado" ? "text-red-600" : ""} />
                          <span className={`text-sm font-medium ${
                            estatusInspeccion === "Rechazado"
                              ? "text-red-700 dark:text-red-400"
                              : darkMode ? "text-gray-300" : "text-gray-700"
                          }`}>
                            Rechazar Inspección
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`block text-xs ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                      >
                        ℹ️ La inspección se visualiza en el módulo de inspección
                      </span>
                      <button
                        onClick={() => {
                          window.location.href = "/Inspeccion";
                        }}
                        className={`mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          darkMode
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                      >
                        <span>🔍</span>
                        Ir al módulo de inspección
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sección 4: Decisión Final de Crédito - PASO 3 */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      Paso 3: Decisión Final de Crédito
                    </h3>
                    {estatusCredito && (
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        estatusCredito === "Aprobado"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {estatusCredito === "Aprobado" ? "✓ Aprobado" : "✗ Rechazado"}
                      </span>
                    )}
                  </div>
                  
                  <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-xl">💰</div>
                        <div>
                          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Monto solicitado
                          </p>
                          <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                            ${selectedAprobacion.monto_solicitado?.toLocaleString() || "0"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-xl">📊</div>
                        <div>
                          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Estatus actual
                          </p>
                          <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {selectedAprobacion.estatus_aprobacion || "Pendiente"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Decisión final sobre la solicitud de crédito:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setEstatusCredito("Aprobado")}
                          className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-colors ${
                            estatusCredito === "Aprobado"
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg"
                              : darkMode
                                ? "border-gray-600 hover:border-green-500 hover:shadow-lg"
                                : "border-gray-200 hover:border-green-500 hover:shadow-lg"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            estatusCredito === "Aprobado" ? "bg-green-500" : "bg-green-100"
                          }`}>
                            <ThumbsUp size={16} className={estatusCredito === "Aprobado" ? "text-white" : "text-green-600"} />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-bold ${
                              estatusCredito === "Aprobado"
                                ? "text-green-700 dark:text-green-400"
                                : darkMode ? "text-gray-300" : "text-gray-700"
                            }`}>
                              APROBAR CRÉDITO
                            </p>
                            <p className="text-xs text-gray-500">
                              La solicitud será aprobada
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEstatusCredito("Rechazado")}
                          className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-colors ${
                            estatusCredito === "Rechazado"
                              ? "border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg"
                              : darkMode
                                ? "border-gray-600 hover:border-red-500 hover:shadow-lg"
                                : "border-gray-200 hover:border-red-500 hover:shadow-lg"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            estatusCredito === "Rechazado" ? "bg-red-500" : "bg-red-100"
                          }`}>
                            <ThumbsDown size={16} className={estatusCredito === "Rechazado" ? "text-white" : "text-red-600"} />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-bold ${
                              estatusCredito === "Rechazado"
                                ? "text-red-700 dark:text-red-400"
                                : darkMode ? "text-gray-300" : "text-gray-700"
                            }`}>
                              RECHAZAR CRÉDITO
                            </p>
                            <p className="text-xs text-gray-500">
                              La solicitud será rechazada
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección 5: Tipo de Manejo - PASO 4 */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      Paso 4: Tipo de Manejo del Crédito
                    </h3>
                    {seleccionManejo && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        ✓ Completado
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSeleccionManejo("Interno");
                        setIdPersonaBanco("");
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        seleccionManejo === "Interno"
                          ? "border-[#2A9D8F] bg-[#2A9D8F]/5"
                          : darkMode
                            ? "border-gray-700 bg-gray-800"
                            : "border-gray-200 bg-white"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          seleccionManejo === "Interno"
                            ? "border-[#2A9D8F] bg-[#2A9D8F]"
                            : darkMode
                              ? "border-gray-600"
                              : "border-gray-300"
                        }`}
                      >
                        {seleccionManejo === "Interno" && (
                          <CheckCircle size={12} className="text-white" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span>🏢</span>
                          <p
                            className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                          >
                            Manejo Interno
                          </p>
                        </div>
                        <p
                          className={`text-xs mt-0.5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                        >
                          El crédito será manejado internamente por IADEY. El emprendedor deberá registrar su cuenta bancaria antes del desembolso.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSeleccionManejo("Banco");
                        if (bancosEmprendedor.length === 1) {
                          setIdPersonaBanco(String(bancosEmprendedor[0].id_persona_banco));
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        seleccionManejo === "Banco"
                          ? "border-[#2A9D8F] bg-[#2A9D8F]/5"
                          : darkMode
                            ? "border-gray-700 bg-gray-800"
                            : "border-gray-200 bg-white"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          seleccionManejo === "Banco"
                            ? "border-[#2A9D8F] bg-[#2A9D8F]"
                            : darkMode
                              ? "border-gray-600"
                              : "border-gray-300"
                        }`}
                      >
                        {seleccionManejo === "Banco" && (
                          <CheckCircle size={12} className="text-white" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span>🏦</span>
                          <p
                            className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                          >
                            Banco
                          </p>
                        </div>
                        <p
                          className={`text-xs mt-0.5 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                        >
                          El crédito será manejado a través de una entidad
                          bancaria
                        </p>
                      </div>
                    </button>
                  </div>

                  {seleccionManejo === "Banco" && (
                    <div className={`mt-4 p-4 rounded-lg border ${
                      darkMode ? "border-gray-700 bg-gray-800/60" : "border-indigo-100 bg-indigo-50/50"
                    }`}>
                      <h4 className={`text-sm font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
                        Banco destino del crédito
                      </h4>
                      <p className={`text-xs mb-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        Seleccione a cuál de los bancos registrados por el emprendedor se direccionará el crédito.
                      </p>
                      {loadingBancos ? (
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Loader size={14} className="animate-spin" /> Cargando bancos...
                        </p>
                      ) : bancosEmprendedor.length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            El emprendedor no tiene bancos registrados. Asigne uno del catálogo para continuar.
                          </p>
                          <select
                            value={bancoCatalogoSel}
                            onChange={(e) => setBancoCatalogoSel(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg border text-sm ${
                              darkMode ? "bg-gray-900 border-gray-600 text-white" : "bg-white border-gray-200"
                            }`}
                          >
                            <option value="">Seleccione un banco...</option>
                            {(catalogoBancos.length
                              ? catalogoBancos
                              : []
                            ).map((b) => (
                              <option key={b.id_banco} value={b.id_banco}>
                                {b.nombre} {b.codigo_banco ? `(${b.codigo_banco})` : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!bancoCatalogoSel || guardandoBanco}
                            onClick={async () => {
                              const ced = cedulaPersonaId || selectedAprobacion?.cedula || selectedAprobacion?.cedula_persona_id;
                              if (!ced || !bancoCatalogoSel) return;
                              setGuardandoBanco(true);
                              try {
                                if (!catalogoBancos.length) {
                                  const cat = await bancoAPI.getCatalogo();
                                  if (cat.success) setCatalogoBancos(cat.data || []);
                                }
                                const res = await bancoAPI.savePersonaBancos(ced, [
                                  { id_banco: parseInt(bancoCatalogoSel, 10), tipo_cuenta: "Ahorro", es_preferida: true },
                                ]);
                                if (res.success) {
                                  const listRes = await bancoAPI.getByCedula(ced);
                                  const list = listRes.success ? (listRes.data || []) : [];
                                  setBancosEmprendedor(list);
                                  if (list[0]) setIdPersonaBanco(String(list[0].id_persona_banco));
                                  setBancoCatalogoSel("");
                                } else {
                                  alert(res.error || "No se pudo guardar el banco");
                                }
                              } catch (err) {
                                alert(err.response?.data?.error || err.message || "Error al guardar banco");
                              } finally {
                                setGuardandoBanco(false);
                              }
                            }}
                            className="px-3 py-2 rounded-lg bg-[#2A9D8F] text-white text-sm disabled:opacity-50"
                          >
                            {guardandoBanco ? "Guardando..." : "Asignar banco al emprendedor"}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {bancosEmprendedor.map((b) => (
                            <button
                              key={b.id_persona_banco}
                              type="button"
                              onClick={() => setIdPersonaBanco(String(b.id_persona_banco))}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                                String(idPersonaBanco) === String(b.id_persona_banco)
                                  ? "border-[#2A9D8F] bg-[#2A9D8F]/10"
                                  : darkMode
                                    ? "border-gray-600 bg-gray-900"
                                    : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                String(idPersonaBanco) === String(b.id_persona_banco)
                                  ? "border-[#2A9D8F] bg-[#2A9D8F]"
                                  : "border-gray-300"
                              }`}>
                                {String(idPersonaBanco) === String(b.id_persona_banco) && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                                  {b.banco_nombre} {b.siglas ? `(${b.siglas})` : ""}
                                </p>
                                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                  {b.tipo_cuenta || "Cuenta"} · {b.numero_cuenta || "Sin número"}
                                  {b.es_preferida ? " · Preferida" : ""}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sección 6: Observaciones Generales */}
                <div className="mb-6">
                  <h4
                    className={`text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Observaciones Generales de la Verificación
                  </h4>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Agregar observaciones sobre la verificación de requisitos (opcional)"
                    rows={3}
                    className={`w-full px-3 py-2 text-sm rounded-lg border resize-none ${
                      darkMode
                        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-200 placeholder-gray-400"
                    } focus:ring-1 focus:ring-[#2A9D8F] focus:border-[#2A9D8F]`}
                  />
                </div>

                <input
                  type="hidden"
                  value={idInspeccion}
                  onChange={(e) => setIdInspeccion(e.target.value)}
                />
              </div>

              {/* ========== FOOTER FIJO ========== */}
              <div
                className={`flex-shrink-0 flex justify-between items-center px-6 py-4 border-t ${
                  darkMode ? "border-gray-700" : "border-gray-100"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {calcularProgresoGeneral() === 100
                      ? "✅ Todos los pasos completados"
                      : `⚠️ Completado: ${calcularProgresoGeneral()}%`}
                  </div>
                  <div className={`text-xs px-3 py-1 rounded-full ${
                    cedulaPersonaId && cedulaPersonaId !== ""
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {cedulaPersonaId && cedulaPersonaId !== "" 
                      ? `✅ Cédula: ${cedulaPersonaId}` 
                      : "⚠️ Cédula requerida"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCloseModals}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      darkMode
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleSaveVerificacion}
                    disabled={savingRequisitos}
                    className={`px-6 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      calcularProgresoGeneral() === 100
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-[#2A9D8F] hover:bg-[#238b7e] text-white"
                    }`}
                  >
                    {savingRequisitos ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <ClipboardCheck size={16} />
                        {calcularProgresoGeneral() === 100
                          ? "Finalizar Proceso"
                          : "Guardar Progreso"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DE DETALLE ==================== */}
      {showDetailModal && selectedAprobacion && (
        <div className="fixed inset-0 z-50">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={handleCloseModals}
            />
            <div
              className={`relative w-full max-w-2xl rounded-2xl shadow-xl flex flex-col ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
              style={{ maxHeight: '85vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
                <div>
                  <h3 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                    Detalle del Expediente #{selectedAprobacion.id_expediente}
                  </h3>
                  <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Código: {selectedAprobacion.codigo_expediente}
                  </p>
                </div>
                <button
                  onClick={handleCloseModals}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                >
                  <X size={20} className={darkMode ? "text-gray-400" : "text-gray-600"} />
                </button>
              </div>

              <div 
                className="flex-1 overflow-y-auto px-6 py-6 modal-scroll-content"
                style={{ minHeight: 0 }}
              >
                <div className="space-y-6">
                  <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                    <h4 className={`font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
                      Información del Solicitante
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Nombre Completo</p>
                        <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {selectedAprobacion.nombres} {selectedAprobacion.apellidos}
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Cédula</p>
                        <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {selectedAprobacion.cedula || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Email</p>
                        <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {selectedAprobacion.email}
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Teléfono</p>
                        <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {selectedAprobacion.telefono || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                    <h4 className={`font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
                      Estado del Expediente
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Estado</p>
                        <span className={`px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full border mt-1 ${getStatusColor(selectedAprobacion.estatus_aprobacion || selectedAprobacion.estatus)}`}>
                          {getStatusIcon(selectedAprobacion.estatus_aprobacion || selectedAprobacion.estatus)}
                          {selectedAprobacion.estatus_aprobacion || selectedAprobacion.estatus}
                        </span>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Tipo de Manejo</p>
                        {selectedAprobacion.seleccion_manejo ? (
                          <span className={`px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full border mt-1 ${getManejoColor(selectedAprobacion.seleccion_manejo)}`}>
                            {getManejoIcon(selectedAprobacion.seleccion_manejo)} {selectedAprobacion.seleccion_manejo}
                          </span>
                        ) : (
                          <p className={`font-medium mt-1 ${darkMode ? "text-white" : "text-gray-900"}`}>No definido</p>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Fecha de Creación</p>
                        <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {formatDate(selectedAprobacion.created_at)}
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Última Actualización</p>
                        <p className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {formatDate(selectedAprobacion.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCloseModals}
                  className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Aprobacion;