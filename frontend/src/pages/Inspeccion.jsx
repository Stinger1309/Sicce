// pages/InspeccionRealizada.jsx
import React, { useState, useEffect } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import usuarioAPI from '../services/api_usuario';
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  MapPin,
  User,
  Building,
  FileText,
  Star,
  Eye,
  Download,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Home,
  Users,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Camera,
  FileSignature,
  X,
  Save,
  ClipboardList,
  RefreshCw,
  Database,
  Package,
  Truck,
  Wrench,
  DollarSign,
  Zap,
  Shield,
  Heart,
} from "lucide-react";

// Importamos nuestros componentes personalizados
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";
import InspectionFormCompleto from "../components/InspectionFormCompleto";
import Inspeccion2 from "../components/inspeccion2";
import InspeccionDetalleAgricola from "../components/InspeccionDetalleAgricola";

// Importamos la API de inspección
import inspeccionAPI from "../services/api_inspeccion";

const esInspeccionAgricola = (data) => {
  if (!data) return false;
  if (data.unidad_produccion) return true;
  const sector = String(data.sector || "").toLowerCase();
  return (
    sector.includes("agricultura") ||
    sector.includes("agrícola") ||
    sector.includes("agricola") ||
    sector.includes("pecuaria") ||
    sector.includes("agro")
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const InspeccionRealizada = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedEmprendimiento, setSelectedEmprendimiento] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Nueva inspección programada", time: "5 min", read: false },
    {
      id: 2,
      text: "Informe de inspección listo para revisión",
      time: "1 hora",
      read: false,
    },
    {
      id: 3,
      text: "Emprendimiento aprobado después de inspección",
      time: "3 horas",
      read: true,
    },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("inspRealizadas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedViewInspeccion, setSelectedViewInspeccion] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("general");

  // Estados para la DataTable
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    estatus_inspeccion: "",
    id_tipo_insp_clas: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  // Estado para almacenar las inspecciones de la API
  const [inspecciones, setInspecciones] = useState([]);

  // Estados para el formulario de inspección
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showInspectionFormAgricola, setShowInspectionFormAgricola] = useState(false);
  const [selectedInspeccion, setSelectedInspeccion] = useState(null);
  const [showInspectionFormCompleto, setShowInspectionFormCompleto] = useState(false);
  const [showInspeccion2, setShowInspeccion2] = useState(false);
  const [emprendimientoData, setEmprendimientoData] = useState(null);
  const [sector, setSector] = useState(null);
  const [tipoInspeccionSeleccionada, setTipoInspeccionSeleccionada] = useState(null);

  // Cargar inspecciones desde la API
  useEffect(() => {
    cargarInspecciones();
  }, []);

  const cargarInspecciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await inspeccionAPI.getAll();
      if (response.success) {
        // Un registro por expediente: priorizar la más avanzada (no la Pendiente)
        const inspeccionesUnicas = new Map();
        const prioridad = (estatus) => {
          // Mayor número = más avanzada (se muestra esta)
          if (estatus === "Aprobado" || estatus === "Aprobado con observaciones") return 5;
          if (estatus === "Completada") return 4;
          if (estatus === "Rechazado") return 3;
          if (estatus === "En Revisión" || estatus === "En Proceso") return 2;
          if (estatus === "Pendiente") return 1;
          return 0;
        };

        response.data.forEach((ins) => {
          const mapped = {
            id: ins.id_inspeccion,
            id_inspeccion: ins.id_inspeccion,
            codigo: `INSP-2024-${String(ins.id_inspeccion).padStart(3, "0")}`,
            id_codigo_exp: ins.id_codigo_exp,
            id_tipo_insp_clas: ins.id_tipo_insp_clas,
            estatus_inspeccion: ins.estatus_inspeccion,
            created_at: ins.created_at,
            updated_at: ins.updated_at,
            codigo_expediente:
              ins.codigo_expediente || `EXP-${ins.id_codigo_exp}`,
            nombre_emprendedor: ins.nombre_emprendedor || "No especificado",
            nombre_emprendimiento: ins.nombre_emprendimiento || "No especificado",
            cedula: ins.cedula_emprendedor || ins.cedula || "No especificada",
            sector: ins.sector || "",
            tipo_inspeccion:
              ins.tipo_inspeccion ||
              getTipoInspeccionDefault(ins.id_tipo_insp_clas),
            fechaInspeccion: ins.created_at
              ? new Date(ins.created_at).toISOString().split("T")[0]
              : "-",
            inspector: ins.inspector || "Por asignar",
            resultado: ins.estatus_inspeccion || "Pendiente",
            calificacion: ins.calificacion || 0,
            observaciones: ins.observaciones || "Sin observaciones",
            recomendaciones: ins.recomendaciones || "Sin recomendaciones",
            duracion: ins.duracion || "-",
            actividad: ins.actividad || "No especificada",
            direccion: ins.direccion_empredimiento || ins.direccion || "No especificada",
            telefono: ins.telefono || "No especificado",
            tiene_datos: Boolean(ins.tiene_datos),
          };

          const actual = inspeccionesUnicas.get(ins.id_codigo_exp);
          if (!actual) {
            inspeccionesUnicas.set(ins.id_codigo_exp, mapped);
            return;
          }

          const pNew = prioridad(ins.estatus_inspeccion);
          const pOld = prioridad(actual.estatus_inspeccion);
          const datosNew = mapped.tiene_datos ? 1 : 0;
          const datosOld = actual.tiene_datos ? 1 : 0;
          const idNew = Number(ins.id_inspeccion) || 0;
          const idOld = Number(actual.id_inspeccion) || 0;

          // Prioridad: estatus > tiene formularios guardados > id más reciente
          const better =
            pNew > pOld ||
            (pNew === pOld && datosNew > datosOld) ||
            (pNew === pOld && datosNew === datosOld && idNew > idOld);

          if (better) {
            inspeccionesUnicas.set(ins.id_codigo_exp, mapped);
          }
        });

        setInspecciones(Array.from(inspeccionesUnicas.values()));
      } else {
        setError("Error al cargar las inspecciones");
      }
    } catch (error) {
      console.error("Error al cargar inspecciones:", error);
      setError(
        "Error al conectar con el servidor. Por favor, intente nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRealizarInspeccion = async (inspeccion) => {
    try {
      setLoading(true);
      setError(null);

      if (!inspeccion.id_codigo_exp) {
        throw new Error(
          "El emprendimiento no tiene un código de expediente válido",
        );
      }

      const response = await inspeccionAPI.getEmprendimientoData(
        inspeccion.id_codigo_exp,
      );

      if (response.success && response.data) {
        setSelectedInspeccion(inspeccion);
        setEmprendimientoData(response.data);
        
        // Guardar el tipo de inspección
        setTipoInspeccionSeleccionada(inspeccion.id_tipo_insp_clas);

        const sectorDeterminado = response.data.sector
          ?.toLowerCase()
          .includes("agric")
          ? "agricola"
          : "industria_comercio";
        setSector(sectorDeterminado);
        
        // Agrícola → formulario inspeccion2 (unidad_produccion → anexos)
        // Industria/comercio → InspectionFormCompleto
        if (sectorDeterminado === "agricola") {
          setShowInspeccion2(true);
          setShowInspectionFormCompleto(false);
          setShowInspectionForm(false);
          setShowInspectionFormAgricola(false);
        } else {
          setShowInspectionFormCompleto(true);
          setShowInspeccion2(false);
          setShowInspectionForm(false);
          setShowInspectionFormAgricola(false);
        }
      } else {
        throw new Error("No se pudieron obtener los datos del emprendimiento");
      }
    } catch (error) {
      console.error("Error al cargar datos para inspección:", error);
      setError(error.message || "Error al cargar los datos del emprendimiento");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInspectionResults = async (resultados) => {
    try {
      setLoading(true);
      setError(null);

      // Capturar ID antes de cualquier cierre de modal que limpie el estado
      const idInspeccionExistente =
        selectedInspeccion?.id ||
        selectedInspeccion?.id_inspeccion ||
        resultados?.id_inspeccion ||
        null;
      const idExpediente =
        emprendimientoData?.id_expediente ||
        selectedInspeccion?.id_codigo_exp ||
        resultados?.id_codigo_exp;
      const idTipo =
        selectedInspeccion?.id_tipo_insp_clas ||
        (resultados?.hasOwnProperty("solicitante") ||
        resultados?.hasOwnProperty("unidad_produccion")
          ? 2
          : 1);

      // Verificar si los resultados vienen del formulario agrícola o estándar
      const esFormularioAgricola =
        resultados.hasOwnProperty("solicitante") ||
        resultados.hasOwnProperty("unidad_produccion");

      let inspectionData;

      if (esFormularioAgricola) {
        inspectionData = {
          id_codigo_exp: idExpediente,
          id_tipo_insp_clas: idTipo || 2,
          estatus_inspeccion: "En Revisión",
          datos_solicitante: resultados.solicitante,
          unidad_produccion: resultados.unidad_produccion,
          condiciones_explotacion: resultados.condiciones_explotacion,
          uso_actual_tierra: resultados.uso_actual_tierra,
          infraestructura: resultados.infraestructura,
          maquinaria_equipo: resultados.maquinaria_equipo,
          produccion: resultados.produccion,
          practicas_agronomicas: resultados.practicas_agronomicas,
          pastizales: resultados.pastizales,
          servicios: resultados.servicios,
          costos_produccion: resultados.costos_produccion,
          financieros: resultados.financieros,
          credito: resultados.credito,
          anexos: resultados.anexos,
          tipo_formulario: "agricola_reinspeccion",
        };
      } else {
        inspectionData = {
          id_codigo_exp: idExpediente,
          id_tipo_insp_clas: idTipo || 1,
          estatus_inspeccion: "En Revisión",
          estudio_mercado: {
            descripcion_producto:
              resultados.estudio_mercado?.descripcion_producto || "",
            descripcion_proceso:
              resultados.estudio_mercado?.descripcion_proceso || "",
            usuarios: resultados.estudio_mercado?.usuarios || "",
            productos: resultados.estudio_mercado?.productos || [],
            ventas: resultados.estudio_mercado?.ventas || [],
            materia_prima: resultados.estudio_mercado?.materia_prima || [],
          },
          aspectos_tecnicos: {
            descripcion_local:
              resultados.aspectos_tecnicos?.descripcion_local || "",
            tenencia_local:
              resultados.aspectos_tecnicos?.tenencia_local || "propio",
            maquinaria_existente:
              resultados.aspectos_tecnicos?.maquinaria_existente || [],
            maquinaria_solicitada:
              resultados.aspectos_tecnicos?.maquinaria_solicitada || [],
            recurso_humano:
              resultados.aspectos_tecnicos?.recurso_humano || [],
            servicios_basicos:
              resultados.aspectos_tecnicos?.servicios_basicos || {},
          },
          gastos_mensuales: resultados.gastos_mensuales || [],
          plan_inversion: resultados.plan_inversion || [],
          organizacion_comunidad: {
            tipo_organizacion:
              resultados.organizacion_comunidad?.tipo_organizacion || "",
            necesidades_comunidad:
              resultados.organizacion_comunidad?.necesidades_comunidad || "",
            realiza_aporte:
              resultados.organizacion_comunidad?.realiza_aporte || false,
            descripcion_aporte:
              resultados.organizacion_comunidad?.descripcion_aporte || "",
            tipo_garantia:
              resultados.organizacion_comunidad?.tipo_garantia || "FIANZA",
          },
        };
      }

      let idGuardado = idInspeccionExistente;

      if (idGuardado) {
        const response = await inspeccionAPI.updateFullInspection(
          idGuardado,
          inspectionData,
        );
        if (!response.success) {
          throw new Error(
            response.message || "Error al actualizar la inspección",
          );
        }
      } else {
        if (!idExpediente) {
          throw new Error("No se pudo determinar el expediente de la inspección");
        }
        const createResponse = await inspeccionAPI.create({
          id_codigo_exp: idExpediente,
          id_tipo_insp_clas: idTipo || (esFormularioAgricola ? 2 : 1),
          estatus_inspeccion: "Pendiente",
        });

        if (!createResponse.success) {
          throw new Error(
            createResponse.message || "Error al crear la inspección",
          );
        }

        idGuardado = createResponse.data.id_inspeccion;
        const fullResponse = await inspeccionAPI.updateFullInspection(
          idGuardado,
          {
            ...inspectionData,
            id_inspeccion: idGuardado,
          },
        );

        if (!fullResponse.success) {
          throw new Error(
            fullResponse.message ||
              "Error al guardar los datos de la inspección",
          );
        }
      }

      await cargarInspecciones();
      handleCloseInspectionForm();
      alert(
        `Inspección #${idGuardado} guardada correctamente\nEstatus: Completada\nPasa a Aprobación`,
      );
    } catch (error) {
      console.error("Error al guardar inspección:", error);
      const msg =
        error?.details ||
        error?.error ||
        error?.message ||
        (typeof error === "string" ? error : null) ||
        "Error desconocido";
      setError(msg);
      alert("Error al guardar: " + msg);
    } finally {
      setLoading(false);
    }
  };

  /** Callback cuando InspectionFormCompleto ya guardó por su cuenta */
  const handleInspectionFormCompletoSaved = async () => {
    await cargarInspecciones();
    handleCloseInspectionForm();
    alert("Inspección guardada correctamente\nEstatus: Completada\nPasa a Aprobación");
  };

  const handleCloseInspectionForm = () => {
    setShowInspectionForm(false);
    setShowInspectionFormAgricola(false);
    setShowInspectionFormCompleto(false);
    setShowInspeccion2(false);
    setSelectedInspeccion(null);
    setEmprendimientoData(null);
    setSector(null);
    setTipoInspeccionSeleccionada(null);
  };

  const getTipoInspeccionDefault = (id_tipo_insp_clas) => {
    const tipos = {
      1: "Inicial",
      2: "Re-inspección",
      3: "Periódica",
      4: "Seguimiento",
    };
    return tipos[id_tipo_insp_clas] || "No especificado";
  };

  const estadisticas = React.useMemo(() => {
    const inspeccionesConCalificacion = inspecciones.filter(
      (i) => i.calificacion > 0,
    );

    return {
      total: inspecciones.length,
      aprobadas: inspecciones.filter((i) => i.resultado === "Aprobado").length,
      aprobadasObs: inspecciones.filter(
        (i) => i.resultado === "Aprobado con observaciones",
      ).length,
      rechazadas: inspecciones.filter((i) => i.resultado === "Rechazado")
        .length,
      pendientes: inspecciones.filter((i) => i.resultado === "Pendiente")
        .length,
      promedioCalificacion:
        inspeccionesConCalificacion.length > 0
          ? (
              inspeccionesConCalificacion.reduce(
                (sum, i) => sum + i.calificacion,
                0,
              ) / inspeccionesConCalificacion.length
            ).toFixed(1)
          : "0.0",
    };
  }, [inspecciones]);

  const user = {
    name: "Inspector IADEY",
    email: "inspector@iadey.gob.ve",
    role: "Inspector de Campo",
    avatar: null,
    department: "Dirección de Inspecciones",
    joinDate: "Enero 2024",
    pendingTasks: 5,
    completedTasks: 48,
    performance: "96%",
  };

  const sectionData = {
    inspRealizadas: {
      title: "Inspecciones Realizadas",
      description: "Historial de inspecciones completadas y sus resultados",
      actionButton: "Nueva Inspección",
      pendingTitle: "Inspecciones Recientes",
    },
  };

  const getCurrentSectionData = () => {
    return sectionData.inspRealizadas;
  };

  const currentData = getCurrentSectionData();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredInspecciones = inspecciones.filter((ins) => {
    const matchesSearch =
      searchTerm === "" ||
      Object.values(ins).some(
        (val) =>
          typeof val === "string" &&
          val.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesEstatus =
      filters.estatus_inspeccion === "" ||
      ins.estatus_inspeccion === filters.estatus_inspeccion;

    const matchesTipo =
      filters.id_tipo_insp_clas === "" ||
      ins.id_tipo_insp_clas === parseInt(filters.id_tipo_insp_clas);

    let matchesFecha = true;
    if (
      filters.fechaDesde &&
      filters.fechaHasta &&
      ins.fechaInspeccion !== "-"
    ) {
      const insDate = new Date(ins.fechaInspeccion);
      const desde = new Date(filters.fechaDesde);
      const hasta = new Date(filters.fechaHasta);
      matchesFecha = insDate >= desde && insDate <= hasta;
    }

    return matchesSearch && matchesEstatus && matchesTipo && matchesFecha;
  });

  const sortedInspecciones = [...filteredInspecciones].sort((a, b) => {
    if (sortConfig.key) {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedInspecciones.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedInspecciones = sortedInspecciones.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedInspecciones.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedInspecciones.map((ins) => ins.id));
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleViewDetalle = async (inspeccion) => {
    try {
      setLoadingDetalle(true);
      setActiveModalTab("general");
      const response = await inspeccionAPI.getFullData(
        inspeccion.id || inspeccion.id_inspeccion,
      );
      if (response.success && response.data) {
        setSelectedViewInspeccion(response.data);
        setShowViewModal(true);
      } else {
        alert(response.error || "Error al cargar los detalles");
      }
    } catch (error) {
      console.error("Error al obtener detalle:", error);
      alert(
        error.error ||
          error.details ||
          error.message ||
          "Error al cargar los detalles de la inspección",
      );
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedViewInspeccion(null);
    setActiveModalTab("general");
  };

  const handleDownloadInforme = async (id) => {
    const inspeccionId = id || selectedViewInspeccion?.id_inspeccion;
    if (!inspeccionId) {
      alert("No se encontró el ID de la inspección");
      return;
    }
    try {
      const blob = await inspeccionAPI.descargarInforme(inspeccionId);
      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("El archivo PDF está vacío");
      }
      // Si el servidor envió JSON de error como blob
      if (blob.type && blob.type.includes("application/json")) {
        const text = await blob.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed.error || "Error al generar el informe");
      }
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe_inspeccion_${inspeccionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando informe:", error);
      alert(error.error || error.message || "Error al descargar el informe");
    }
  };

  const handleGenerarCertificado = (id) => {
    console.log("Generar certificado para inspección:", id);
    alert(`Generando certificado para inspección #${id}`);
  };

  const resetFilters = () => {
    setFilters({
      estatus_inspeccion: "",
      id_tipo_insp_clas: "",
      fechaDesde: "",
      fechaHasta: "",
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  const getResultadoBadge = (resultado) => {
    const styles = {
      Aprobado:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      "Aprobado con observaciones":
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Rechazado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Pendiente:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "En Revisión":
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      Completada:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      "Listo para aprobación":
        "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    };
    return styles[resultado] || "bg-gray-100 text-gray-800";
  };

  const getTipoInspeccionBadge = (tipo) => {
    const styles = {
      Inicial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "Re-inspección":
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      Periódica:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
      Pendiente:
        "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return styles[tipo] || "bg-gray-100 text-gray-800";
  };

  const renderStars = (rating) => {
    if (rating === 0) {
      return (
        <div className="flex items-center gap-0.5 text-gray-300">
          Sin calificar
        </div>
      );
    }
    const fullStars = Math.floor(rating);
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Star
            key={i}
            size={14}
            className="fill-yellow-400 text-yellow-400"
          />,
        );
      } else {
        stars.push(
          <Star
            key={i}
            size={14}
            className="text-gray-300 dark:text-gray-600"
          />,
        );
      }
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  const handleLogout = () => {
    usuarioAPI.logout();
  };

  const markAsRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

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

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
        />

        <main
          className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}
        >
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            {/* Título de la sección */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1
                  className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                >
                  {currentData?.title || "Inspecciones Realizadas"}
                </h1>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  {currentData?.description ||
                    "Historial completo de inspecciones realizadas en emprendimientos"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ExportButtons
                  data={inspecciones.map((i) => ({
                    id: i.id,
                    codigo_expediente: i.codigo_expediente,
                    nombre_emprendedor: i.nombre_emprendedor,
                    cedula: i.cedula,
                    tipo_inspeccion: i.tipo_inspeccion,
                    resultado: i.resultado,
                    fechaInspeccion: i.fechaInspeccion,
                    inspector: i.inspector,
                    calificacion: i.calificacion,
                  }))}
                  columns={[
                    { key: "id", label: "ID" },
                    { key: "codigo_expediente", label: "Expediente" },
                    { key: "nombre_emprendedor", label: "Emprendedor" },
                    { key: "cedula", label: "Cédula" },
                    { key: "tipo_inspeccion", label: "Tipo" },
                    { key: "resultado", label: "Resultado" },
                    { key: "fechaInspeccion", label: "Fecha" },
                    { key: "inspector", label: "Inspector" },
                    { key: "calificacion", label: "Calificación" },
                  ]}
                  title="Inspecciones"
                  fileName="inspecciones"
                  moduloApi="inspecciones"
                  darkMode={darkMode}
                />
                <button
                  onClick={cargarInspecciones}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    darkMode
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                  } transition-colors`}
                >
                  <RefreshCw
                    size={18}
                    className={loading ? "animate-spin" : ""}
                  />
                  Actualizar
                </button>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
                <button
                  onClick={cargarInspecciones}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Intentar nuevamente
                </button>
              </div>
            )}

            {/* Indicador de carga */}
            {loading && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <RefreshCw size={20} className="animate-spin" />
                  <span>Cargando inspecciones...</span>
                </div>
              </div>
            )}

            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center justify-between mb-2">
                  <ClipboardCheck className="text-[#2A9D8F]" size={24} />
                  <span
                    className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {estadisticas.total}
                  </span>
                </div>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Total Expedientes
                </p>
              </div>

              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Clock className="text-blue-500" size={24} />
                  <span
                    className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {estadisticas.pendientes}
                  </span>
                </div>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Pendientes
                </p>
              </div>

              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center justify-between mb-2">
                  <ThumbsUp className="text-green-500" size={24} />
                  <span
                    className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {estadisticas.aprobadas}
                  </span>
                </div>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Aprobadas
                </p>
              </div>

              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="text-yellow-500" size={24} />
                  <span
                    className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {estadisticas.aprobadasObs}
                  </span>
                </div>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Aprobadas con Obs.
                </p>
              </div>

              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center justify-between mb-2">
                  <ThumbsDown className="text-red-500" size={24} />
                  <span
                    className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {estadisticas.rechazadas}
                  </span>
                </div>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Rechazadas
                </p>
              </div>

              <div
                className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Star className="text-yellow-500" size={24} />
                  <span
                    className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}
                  >
                    {estadisticas.promedioCalificacion}
                  </span>
                </div>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  Calificación Promedio
                </p>
              </div>
            </div>

            {/* Barra de búsqueda y acciones */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Buscar por código, estatus o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    darkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                      : "bg-white border-gray-200 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                    darkMode
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Filter size={20} />
                  Filtros
                </button>
                {inspecciones.length > 0 && (
                  <div
                    className={`px-4 py-2 text-sm flex items-center gap-2 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    <Database size={16} />
                    {inspecciones.length} expedientes únicos
                  </div>
                )}
              </div>
            </div>

            {/* Panel de filtros */}
            {showFilters && (
              <div
                className={`mb-6 p-4 rounded-lg border ${
                  darkMode
                    ? "border-gray-700 bg-gray-800"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <select
                    value={filters.estatus_inspeccion}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        estatus_inspeccion: e.target.value,
                      })
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <option value="">Todos los estatus</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Aprobado con observaciones">
                      Aprobado con observaciones
                    </option>
                    <option value="Rechazado">Rechazado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Revisión">En Revisión</option>
                  </select>

                  <select
                    value={filters.id_tipo_insp_clas}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        id_tipo_insp_clas: e.target.value,
                      })
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <option value="">Todos los tipos</option>
                    <option value="1">Inicial</option>
                    <option value="2">Re-inspección</option>
                    <option value="3">Periódica</option>
                    <option value="4">Seguimiento</option>
                  </select>

                  <input
                    type="date"
                    value={filters.fechaDesde}
                    onChange={(e) =>
                      setFilters({ ...filters, fechaDesde: e.target.value })
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-200"
                    }`}
                    placeholder="Fecha desde"
                  />

                  <input
                    type="date"
                    value={filters.fechaHasta}
                    onChange={(e) =>
                      setFilters({ ...filters, fechaHasta: e.target.value })
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-200"
                    }`}
                    placeholder="Fecha hasta"
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm text-[#2A9D8F] hover:text-[#264653]"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}

            {/* DataTable de Inspecciones */}
            <div
              className={`rounded-xl border ${
                darkMode
                  ? "border-gray-700 bg-gray-800"
                  : "border-gray-200 bg-white"
              } overflow-hidden`}
            >
              <div className="overflow-x-auto table-scroll">
                <table className="w-full">
                  <thead
                    className={`${darkMode ? "bg-gray-700" : "bg-gray-50"}`}
                  >
                    <tr>
                      <th className="px-4 py-3 w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedRows.length ===
                              paginatedInspecciones.length &&
                            paginatedInspecciones.length > 0
                          }
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
                        />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("codigo")}
                      >
                        <div className="flex items-center gap-2">
                          Código Inspección
                          <ArrowUpDown size={14} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("id_codigo_exp")}
                      >
                        <div className="flex items-center gap-2">
                          Expediente
                          <ArrowUpDown size={14} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("created_at")}
                      >
                        <div className="flex items-center gap-2">
                          Fecha Creación
                          <ArrowUpDown size={14} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("estatus_inspeccion")}
                      >
                        <div className="flex items-center gap-2">
                          Estatus
                          <ArrowUpDown size={14} />
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("updated_at")}
                      >
                        <div className="flex items-center gap-2">
                          Última Actualización
                          <ArrowUpDown size={14} />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}
                  >
                    {paginatedInspecciones.map((inspeccion) => (
                      <tr
                        key={inspeccion.id_codigo_exp}
                        className={`${
                          darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                        } transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(inspeccion.id)}
                            onChange={() => handleSelectRow(inspeccion.id)}
                            className="rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                          >
                            {inspeccion.codigo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div
                              className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                            >
                              {inspeccion.codigo_expediente}
                            </div>
                            <div
                              className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                            >
                              ID: {inspeccion.id_codigo_exp}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-3">
                          <div>
                            <div
                              className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                            >
                              {inspeccion.created_at
                                ? new Date(
                                    inspeccion.created_at,
                                  ).toLocaleDateString("es-ES", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })
                                : "-"}
                            </div>
                            <div
                              className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                            >
                              {inspeccion.created_at
                                ? new Date(
                                    inspeccion.created_at,
                                  ).toLocaleTimeString("es-ES", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${getResultadoBadge(inspeccion.estatus_inspeccion)}`}
                          >
                            {inspeccion.estatus_inspeccion}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div
                              className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                            >
                              {inspeccion.updated_at
                                ? new Date(
                                    inspeccion.updated_at,
                                  ).toLocaleDateString("es-ES", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })
                                : "-"}
                            </div>
                            <div
                              className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                            >
                              {inspeccion.updated_at
                                ? new Date(
                                    inspeccion.updated_at,
                                  ).toLocaleTimeString("es-ES", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewDetalle(inspeccion)}
                              className={`p-1.5 rounded-lg ${
                                darkMode
                                  ? "hover:bg-gray-600"
                                  : "hover:bg-gray-100"
                              } transition-colors group relative`}
                              title="Ver detalles completos"
                            >
                              <Eye size={18} className="text-blue-500" />
                              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                Ver Detalles
                              </span>
                            </button>

                            {inspeccion.estatus_inspeccion === "Pendiente" && (
                              <button
                                onClick={() =>
                                  handleRealizarInspeccion(inspeccion)
                                }
                                className={`p-1.5 rounded-lg ${
                                  darkMode
                                    ? "hover:bg-gray-600"
                                    : "hover:bg-gray-100"
                                } transition-colors group relative`}
                                title="Realizar inspección"
                              >
                                <ClipboardCheck
                                  size={18}
                                  className="text-green-500"
                                />
                                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  Realizar Inspección
                                </span>
                              </button>
                            )}

                            <button
                              onClick={() =>
                                handleDownloadInforme(inspeccion.id)
                              }
                              className={`p-1.5 rounded-lg ${
                                darkMode
                                  ? "hover:bg-gray-600"
                                  : "hover:bg-gray-100"
                              } transition-colors group relative`}
                              title="Descargar informe"
                            >
                              <Download size={18} className="text-purple-500" />
                              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                Descargar Informe
                              </span>
                            </button>

                            {inspeccion.estatus_inspeccion === "Aprobado" && (
                              <button
                                onClick={() =>
                                  handleGenerarCertificado(inspeccion.id)
                                }
                                className={`p-1.5 rounded-lg ${
                                  darkMode
                                    ? "hover:bg-gray-600"
                                    : "hover:bg-gray-100"
                                } transition-colors group relative`}
                                title="Generar certificado"
                              >
                                <FileSignature
                                  size={18}
                                  className="text-green-500"
                                />
                                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  Generar Certificado
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div
                className={`px-4 py-3 flex items-center justify-between border-t ${
                  darkMode ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"}`}
                  >
                    Mostrar
                  </span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 rounded border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span
                    className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"}`}
                  >
                    registros
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"}`}
                  >
                    {startIndex + 1}-
                    {Math.min(
                      startIndex + rowsPerPage,
                      sortedInspecciones.length,
                    )}{" "}
                    de {sortedInspecciones.length}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className={`p-1 rounded ${
                        currentPage === 1
                          ? "text-gray-400 cursor-not-allowed"
                          : darkMode
                            ? "text-gray-300 hover:bg-gray-700"
                            : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <ChevronsLeft size={18} />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className={`p-1 rounded ${
                        currentPage === 1
                          ? "text-gray-400 cursor-not-allowed"
                          : darkMode
                            ? "text-gray-300 hover:bg-gray-700"
                            : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <span
                      className={`px-3 py-1 text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      Página {currentPage} de {totalPages || 1}
                    </span>

                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages || totalPages === 0}
                      className={`p-1 rounded ${
                        currentPage === totalPages || totalPages === 0
                          ? "text-gray-400 cursor-not-allowed"
                          : darkMode
                            ? "text-gray-300 hover:bg-gray-700"
                            : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className={`p-1 rounded ${
                        currentPage === totalPages || totalPages === 0
                          ? "text-gray-400 cursor-not-allowed"
                          : darkMode
                            ? "text-gray-300 hover:bg-gray-700"
                            : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <ChevronsRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Si no hay resultados */}
            {!loading && sortedInspecciones.length === 0 && (
              <div
                className={`text-center py-12 rounded-xl border ${
                  darkMode
                    ? "border-gray-700 bg-gray-800"
                    : "border-gray-200 bg-white"
                }`}
              >
                <ClipboardCheck
                  size={48}
                  className={`mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`}
                />
                <h3
                  className={`text-lg font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
                >
                  No se encontraron inspecciones
                </h3>
                <p
                  className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  {error
                    ? "Ocurrió un error al cargar los datos. Por favor, intente nuevamente."
                    : "No hay inspecciones que coincidan con los filtros aplicados."}
                </p>
                <div className="flex justify-center gap-3 mt-4">
                  {error && (
                    <button
                      onClick={cargarInspecciones}
                      className="px-4 py-2 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653]"
                    >
                      Reintentar
                    </button>
                  )}
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-[#2A9D8F] hover:text-[#264653]"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}
          </div>

          <Footer darkMode={darkMode} />
        </main>
      </div>

      {/* MODAL DEL FORMULARIO DE INSPECCIÓN COMPLETO (TIPO 1) */}
      {showInspectionFormCompleto && selectedInspeccion && emprendimientoData && (
        <InspectionFormCompleto
          isOpen={showInspectionFormCompleto}
          onClose={handleCloseInspectionForm}
          onSave={handleInspectionFormCompletoSaved}
          inspeccionId={selectedInspeccion.id || selectedInspeccion.id_inspeccion}
          expedienteData={emprendimientoData}
          emprendimientoData={emprendimientoData}
          sector={sector || "industria_comercio"}
          darkMode={darkMode}
        />
      )}

      {/* MODAL DEL FORMULARIO DE RE-INSPECCIÓN AGRÍCOLA (TIPO 2) */}
      {showInspeccion2 && selectedInspeccion && emprendimientoData && (
        <Inspeccion2
          isOpen={showInspeccion2}
          onClose={handleCloseInspectionForm}
          onSave={handleSaveInspectionResults}
          inspeccionId={selectedInspeccion.id || selectedInspeccion.id_inspeccion}
          emprendimientoData={emprendimientoData}
          sector={sector || "agricola"}
          darkMode={darkMode}
        />
      )}

      {/* MODAL DE VISUALIZACIÓN COMPLETA CON PESTAÑAS */}
      {showViewModal && selectedViewInspeccion && esInspeccionAgricola(selectedViewInspeccion) && (
        <InspeccionDetalleAgricola
          data={selectedViewInspeccion}
          darkMode={darkMode}
          onClose={handleCloseViewModal}
          onDownloadInforme={handleDownloadInforme}
        />
      )}
      {showViewModal && selectedViewInspeccion && !esInspeccionAgricola(selectedViewInspeccion) && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={handleCloseViewModal}
            />

            <div
              className={`relative rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              {/* Header del Modal */}
              <div
                className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${
                  darkMode
                    ? "border-gray-700 bg-gray-800"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="text-[#2A9D8F]" size={28} />
                  <div>
                    <h3
                      className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      Detalle de Inspección
                    </h3>
                    <p
                      className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                      ID: {selectedViewInspeccion.id_inspeccion} | Exp:{" "}
                      {selectedViewInspeccion.codigo_expediente ||
                        `EXP-${selectedViewInspeccion.id_codigo_exp}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-medium ${
                      selectedViewInspeccion.estatus_inspeccion === "Aprobado"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : selectedViewInspeccion.estatus_inspeccion ===
                            "Rechazado"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : selectedViewInspeccion.estatus_inspeccion ===
                              "En Revisión"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    }`}
                  >
                    {selectedViewInspeccion.estatus_inspeccion || "Pendiente"}
                  </span>
                  <button
                    onClick={handleCloseViewModal}
                    className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <X
                      size={24}
                      className={darkMode ? "text-gray-400" : "text-gray-600"}
                    />
                  </button>
                </div>
              </div>

              {/* Pestañas de navegación */}
              <div
                className={`sticky top-[73px] z-10 px-6 border-b ${
                  darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex gap-0 overflow-x-auto table-scroll">
                  {[
                    { key: "general", label: "General", icon: Building },
                    { key: "mercado", label: "Estudio Mercado", icon: TrendingUp },
                    { key: "tecnicos", label: "Aspectos Técnicos", icon: Wrench },
                    { key: "gastos", label: "Gastos", icon: DollarSign },
                    { key: "inversion", label: "Plan Inversión", icon: TrendingUp },
                    { key: "organizacion", label: "Organización", icon: Users },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveModalTab(tab.key)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeModalTab === tab.key
                          ? "border-[#2A9D8F] text-[#2A9D8F]"
                          : darkMode
                            ? "border-transparent text-gray-400 hover:text-gray-300"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contenido según pestaña activa */}
              <div className="px-6 py-6 space-y-6">
                {/* ======== PESTAÑA GENERAL ======== */}
                {activeModalTab === "general" && (
                  <>
                    {/* Información General */}
                    <div
                      className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}
                    >
                      <h4
                        className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        <Building size={20} className="text-[#2A9D8F]" />
                        Información General
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Emprendimiento
                          </label>
                          <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {selectedViewInspeccion.nombre_emprendimiento || "No especificado"}
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Emprendedor
                          </label>
                          <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {selectedViewInspeccion.nombre_emprendedor || "No especificado"}
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Cédula
                          </label>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.cedula_emprendedor || "No especificada"}
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Sector/Actividad
                          </label>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.sector || "No especificado"} - {selectedViewInspeccion.actividad || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Dirección
                          </label>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.direccion_empredimiento || "No especificada"}
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Teléfono / Correo
                          </label>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.telefono || "N/A"} | {selectedViewInspeccion.correo || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Años de Experiencia
                          </label>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.anos_experiencia || "0"} años
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Monto Solicitado
                          </label>
                          <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {selectedViewInspeccion.monto_solicitado
                              ? `$${parseFloat(selectedViewInspeccion.monto_solicitado).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
                              : "No especificado"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Datos de la Inspección */}
                    <div
                      className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}
                    >
                      <h4
                        className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        <ClipboardCheck size={20} className="text-[#2A9D8F]" />
                        Datos de la Inspección
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Tipo de Inspección
                          </label>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.id_tipo_insp_clas === 1
                              ? "Inicial"
                              : selectedViewInspeccion.id_tipo_insp_clas === 2
                                ? "Re-inspección"
                                : selectedViewInspeccion.id_tipo_insp_clas === 3
                                  ? "Periódica"
                                  : selectedViewInspeccion.id_tipo_insp_clas === 4
                                    ? "Seguimiento"
                                    : "No especificado"}
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Fecha de Creación
                          </label>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.created_at
                              ? new Date(selectedViewInspeccion.created_at).toLocaleDateString("es-VE", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "No disponible"}
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Última Actualización
                          </label>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.updated_at
                              ? new Date(selectedViewInspeccion.updated_at).toLocaleDateString("es-VE", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "No disponible"}
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Inspector
                          </label>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            <User size={14} className="inline mr-1" />
                            {selectedViewInspeccion.inspector || "Por asignar"}
                          </p>
                        </div>
                        <div>
                          <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Calificación
                          </label>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={16}
                                className={
                                  star <= (selectedViewInspeccion.calificacion || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300 dark:text-gray-600"
                                }
                              />
                            ))}
                            <span className={`text-sm font-bold ml-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {selectedViewInspeccion.calificacion || "0"}/5
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Observaciones y Recomendaciones */}
                    {selectedViewInspeccion.observaciones && (
                      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                          <FileText size={20} className="text-[#2A9D8F]" />
                          Observaciones
                        </h4>
                        <p className={`text-sm p-3 rounded ${darkMode ? "bg-gray-600 text-gray-200" : "bg-white text-gray-700 border border-gray-200"}`}>
                          {selectedViewInspeccion.observaciones}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* ======== PESTAÑA ESTUDIO DE MERCADO ======== */}
                {activeModalTab === "mercado" && (
                  <div className="space-y-6">
                    {selectedViewInspeccion.estudio_mercado ? (
                      <>
                        <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                            <Package size={20} className="text-[#2A9D8F]" />
                            Descripción del Producto/Servicio
                          </h4>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.estudio_mercado.descripcion_producto || "No especificado"}
                          </p>
                        </div>

                        <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                            <TrendingUp size={20} className="text-[#2A9D8F]" />
                            Descripción del Proceso Productivo
                          </h4>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.estudio_mercado.descripcion_proceso || "No especificado"}
                          </p>
                        </div>

                        {/* Productos */}
                        {selectedViewInspeccion.estudio_mercado.productos?.length > 0 && (
                          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              <Package size={20} className="text-[#2A9D8F]" />
                              Producción Mensual
                            </h4>
                            <div className="overflow-x-auto table-scroll">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                    <th className="text-left py-2">Producto</th>
                                    <th className="text-left py-2">Unidad</th>
                                    <th className="text-right py-2">Cantidad</th>
                                    <th className="text-right py-2">Costo USD</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedViewInspeccion.estudio_mercado.productos.map((prod, idx) => (
                                    <tr key={idx} className={`border-t ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"}`}>
                                      <td className="py-2">{prod.descripcion_producto}</td>
                                      <td className="py-2">{prod.unidad_medida}</td>
                                      <td className="text-right py-2">{prod.cantidad}</td>
                                      <td className="text-right py-2">${parseFloat(prod.costo_produccion_usd || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Ventas Estimadas */}
                        {selectedViewInspeccion.estudio_mercado.ventas?.length > 0 && (
                          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              <DollarSign size={20} className="text-[#2A9D8F]" />
                              Ventas Estimadas Mensuales
                            </h4>
                            <div className="overflow-x-auto table-scroll">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                    <th className="text-left py-2">Producto</th>
                                    <th className="text-left py-2">Unidad</th>
                                    <th className="text-right py-2">Cantidad</th>
                                    <th className="text-right py-2">Precio Venta USD</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedViewInspeccion.estudio_mercado.ventas.map((venta, idx) => (
                                    <tr key={idx} className={`border-t ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"}`}>
                                      <td className="py-2">{venta.descripcion_producto}</td>
                                      <td className="py-2">{venta.unidad_medida}</td>
                                      <td className="text-right py-2">{venta.cantidad}</td>
                                      <td className="text-right py-2">${parseFloat(venta.precio_venta_usd || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Materia Prima */}
                        {selectedViewInspeccion.estudio_mercado.materia_prima?.length > 0 && (
                          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              <Truck size={20} className="text-[#2A9D8F]" />
                              Materia Prima Mensual
                            </h4>
                            <div className="overflow-x-auto table-scroll">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                    <th className="text-left py-2">Descripción</th>
                                    <th className="text-left py-2">Unidad</th>
                                    <th className="text-right py-2">Cantidad</th>
                                    <th className="text-right py-2">Precio Compra USD</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedViewInspeccion.estudio_mercado.materia_prima.map((mp, idx) => (
                                    <tr key={idx} className={`border-t ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"}`}>
                                      <td className="py-2">{mp.descripcion}</td>
                                      <td className="py-2">{mp.unidad_medida}</td>
                                      <td className="text-right py-2">{mp.cantidad}</td>
                                      <td className="text-right py-2">${parseFloat(mp.precio_compra_usd || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Usuarios */}
                        {selectedViewInspeccion.estudio_mercado.usuarios && (
                          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              <Users size={20} className="text-[#2A9D8F]" />
                              Usuarios/Clientes Potenciales
                            </h4>
                            <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                              {selectedViewInspeccion.estudio_mercado.usuarios}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <TrendingUp size={48} className={`mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
                        <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          No hay datos de estudio de mercado disponibles
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ======== PESTAÑA ASPECTOS TÉCNICOS ======== */}
                {activeModalTab === "tecnicos" && (
                  <div className="space-y-6">
                    {selectedViewInspeccion.aspectos_tecnicos ? (
                      <>
                        <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                            <Home size={20} className="text-[#2A9D8F]" />
                            Descripción del Local
                          </h4>
                          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {selectedViewInspeccion.aspectos_tecnicos.descripcion_local || "No especificado"}
                          </p>
                          <div className="mt-2">
                            <span className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              Tenencia: {" "}
                            </span>
                            <span className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {selectedViewInspeccion.aspectos_tecnicos.tenencia_local === "propio" ? "Propio" : 
                               selectedViewInspeccion.aspectos_tecnicos.tenencia_local === "alquilado" ? "Alquilado" : 
                               "Otro"}
                            </span>
                          </div>
                        </div>

                        {/* Maquinaria Existente */}
                        {selectedViewInspeccion.aspectos_tecnicos.maquinaria_existente?.length > 0 && (
                          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              <Wrench size={20} className="text-[#2A9D8F]" />
                              Maquinaria y Equipo que Posee
                            </h4>
                            <div className="overflow-x-auto table-scroll">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                    <th className="text-left py-2">Descripción</th>
                                    <th className="text-center py-2">Cantidad</th>
                                    <th className="text-right py-2">Precio Unit. USD</th>
                                    <th className="text-right py-2">Total USD</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedViewInspeccion.aspectos_tecnicos.maquinaria_existente.map((maq, idx) => (
                                    <tr key={idx} className={`border-t ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"}`}>
                                      <td className="py-2">{maq.descripcion}</td>
                                      <td className="text-center py-2">{maq.cantidad}</td>
                                      <td className="text-right py-2">${parseFloat(maq.precio_unitario_usd || 0).toFixed(2)}</td>
                                      <td className="text-right py-2">${parseFloat(maq.total_usd || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Maquinaria Solicitada */}
                        {selectedViewInspeccion.aspectos_tecnicos.maquinaria_solicitada?.length > 0 && (
                          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              <Wrench size={20} className="text-[#2A9D8F]" />
                              Maquinaria y Equipo Solicitado
                            </h4>
                            <div className="overflow-x-auto table-scroll">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                    <th className="text-left py-2">Descripción</th>
                                    <th className="text-center py-2">Cantidad</th>
                                    <th className="text-right py-2">Precio Unit. USD</th>
                                    <th className="text-right py-2">Total USD</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedViewInspeccion.aspectos_tecnicos.maquinaria_solicitada.map((maq, idx) => (
                                    <tr key={idx} className={`border-t ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"}`}>
                                      <td className="py-2">{maq.descripcion}</td>
                                      <td className="text-center py-2">{maq.cantidad}</td>
                                      <td className="text-right py-2">${parseFloat(maq.precio_unitario_usd || 0).toFixed(2)}</td>
                                      <td className="text-right py-2">${parseFloat(maq.total_usd || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Recurso Humano */}
                        {selectedViewInspeccion.aspectos_tecnicos.recurso_humano?.length > 0 && (
                          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              <Users size={20} className="text-[#2A9D8F]" />
                              Recurso Humano
                            </h4>
                            <div className="overflow-x-auto table-scroll">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                    <th className="text-left py-2">Tipo</th>
                                    <th className="text-center py-2">Cantidad</th>
                                    <th className="text-right py-2">Salario Mensual USD</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedViewInspeccion.aspectos_tecnicos.recurso_humano.map((rh, idx) => (
                                    <tr key={idx} className={`border-t ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"}`}>
                                      <td className="py-2 capitalize">{rh.tipo_trabajador?.toLowerCase()}</td>
                                      <td className="text-center py-2">{rh.cantidad}</td>
                                      <td className="text-right py-2">${parseFloat(rh.salario_mensual_usd || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Servicios Básicos */}
                        {selectedViewInspeccion.aspectos_tecnicos.servicios_basicos && (
                          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              <Zap size={20} className="text-[#2A9D8F]" />
                              Servicios Básicos Disponibles
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {[
                                { key: "electricidad", label: "Electricidad" },
                                { key: "agua", label: "Agua" },
                                { key: "telefono", label: "Teléfono" },
                                { key: "aseo_urbano", label: "Aseo Urbano" },
                                { key: "cloacas", label: "Cloacas" },
                                { key: "gas", label: "Gas" },
                              ].map((servicio) => (
                                <div key={servicio.key} className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${
                                    selectedViewInspeccion.aspectos_tecnicos.servicios_basicos[servicio.key] 
                                      ? "bg-green-500" 
                                      : "bg-red-500"
                                  }`} />
                                  <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                    {servicio.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Wrench size={48} className={`mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
                        <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          No hay datos de aspectos técnicos disponibles
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ======== PESTAÑA GASTOS ======== */}
                {activeModalTab === "gastos" && (
                  <div className="space-y-6">
                    {selectedViewInspeccion.gastos_mensuales?.length > 0 ? (
                      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                          <DollarSign size={20} className="text-[#2A9D8F]" />
                          Gastos Mensuales
                        </h4>
                        <div className="overflow-x-auto table-scroll">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                <th className="text-left py-2">Concepto</th>
                                <th className="text-right py-2">Monto Actual USD</th>
                                <th className="text-right py-2">Monto Futuro USD</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedViewInspeccion.gastos_mensuales.map((gasto, idx) => (
                                <tr key={idx} className={`border-t ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"}`}>
                                  <td className="py-2 capitalize">{gasto.concepto?.toLowerCase()}</td>
                                  <td className="text-right py-2">${parseFloat(gasto.monto_actual_usd || 0).toFixed(2)}</td>
                                  <td className="text-right py-2">${parseFloat(gasto.monto_futuro_usd || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <DollarSign size={48} className={`mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
                        <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          No hay datos de gastos mensuales disponibles
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ======== PESTAÑA PLAN DE INVERSIÓN ======== */}
                {activeModalTab === "inversion" && (
                  <div className="space-y-6">
                    {selectedViewInspeccion.plan_inversion?.length > 0 ? (
                      <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                          <TrendingUp size={20} className="text-[#2A9D8F]" />
                          Plan de Inversión
                        </h4>
                        <div className="overflow-x-auto table-scroll">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
                                <th className="text-left py-2">Concepto</th>
                                <th className="text-right py-2">Aportes Propios USD</th>
                                <th className="text-right py-2">Monto Solicitado USD</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedViewInspeccion.plan_inversion.map((plan, idx) => (
                                <tr key={idx} className={`border-t ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"}`}>
                                  <td className="py-2 capitalize">{plan.concepto?.toLowerCase()}</td>
                                  <td className="text-right py-2">${parseFloat(plan.aportes_propios_usd || 0).toFixed(2)}</td>
                                  <td className="text-right py-2">${parseFloat(plan.monto_solicitado_usd || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <TrendingUp size={48} className={`mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
                        <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          No hay datos del plan de inversión disponibles
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ======== PESTAÑA ORGANIZACIÓN ======== */}
                {activeModalTab === "organizacion" && (
                  <div className="space-y-6">
                    {selectedViewInspeccion.organizacion_comunidad ? (
                      <>
                        <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                          <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                            <Users size={20} className="text-[#2A9D8F]" />
                            Organización en la Comunidad
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Tipo de Organización
                              </label>
                              <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                {selectedViewInspeccion.organizacion_comunidad.tipo_organizacion || "No especificado"}
                              </p>
                            </div>
                            <div>
                              <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Necesidades de la Comunidad
                              </label>
                              <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                {selectedViewInspeccion.organizacion_comunidad.necesidades_comunidad || "No especificado"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {selectedViewInspeccion.aporte_comunidad && (
                          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              <Heart size={20} className="text-[#2A9D8F]" />
                              Aporte a la Comunidad
                            </h4>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${selectedViewInspeccion.aporte_comunidad.realiza_aporte ? "bg-green-500" : "bg-red-500"}`} />
                                <span className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                                  {selectedViewInspeccion.aporte_comunidad.realiza_aporte ? "Sí realiza aporte" : "No realiza aporte"}
                                </span>
                              </div>
                              {selectedViewInspeccion.aporte_comunidad.descripcion_aporte && (
                                <div>
                                  <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                    Descripción del Aporte
                                  </label>
                                  <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                                    {selectedViewInspeccion.aporte_comunidad.descripcion_aporte}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedViewInspeccion.garantia && (
                          <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              <Shield size={20} className="text-[#2A9D8F]" />
                              Garantía Ofrecida
                            </h4>
                            <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {selectedViewInspeccion.garantia.tipo_garantia === "FIANZA" ? "Fianza" : 
                               selectedViewInspeccion.garantia.tipo_garantia === "HIPOTECA" ? "Hipoteca" : 
                               selectedViewInspeccion.garantia.tipo_garantia || "No especificada"}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Users size={48} className={`mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
                        <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          No hay datos de organización comunitaria disponibles
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer del Modal */}
              <div
                className={`sticky bottom-0 px-6 py-4 border-t flex justify-end gap-3 ${
                  darkMode
                    ? "border-gray-700 bg-gray-800"
                    : "border-gray-200 bg-white"
                }`}
              >
                <button
                  onClick={() => handleDownloadInforme(selectedViewInspeccion.id_inspeccion)}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    darkMode
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Download size={18} />
                  Descargar Informe
                </button>

                {selectedViewInspeccion.estatus_inspeccion === "Aprobado" && (
                  <button
                    onClick={() => handleGenerarCertificado(selectedViewInspeccion.id_inspeccion)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
                  >
                    <FileSignature size={18} />
                    Generar Certificado
                  </button>
                )}

                {selectedViewInspeccion.estatus_inspeccion === "Pendiente" && (
                  <button
                    onClick={() => {
                      handleCloseViewModal();
                      // Determinar qué formulario abrir basado en id_tipo_insp_clas
                      if (selectedViewInspeccion.id_tipo_insp_clas === 2) {
                        setShowInspeccion2(true);
                        setSelectedInspeccion({
                          id: selectedViewInspeccion.id || selectedViewInspeccion.id_inspeccion,
                          id_inspeccion: selectedViewInspeccion.id_inspeccion || selectedViewInspeccion.id,
                          id_codigo_exp: selectedViewInspeccion.id_codigo_exp,
                          estatus_inspeccion: selectedViewInspeccion.estatus_inspeccion,
                          id_tipo_insp_clas: selectedViewInspeccion.id_tipo_insp_clas
                        });
                        setEmprendimientoData({
                          id_expediente: selectedViewInspeccion.id_codigo_exp,
                          nombre_emprendedor: selectedViewInspeccion.nombre_emprendedor,
                          cedula: selectedViewInspeccion.cedula_emprendedor,
                          nombre_emprendimiento: selectedViewInspeccion.nombre_emprendimiento,
                          sector: selectedViewInspeccion.sector,
                        });
                      } else {
                        handleRealizarInspeccion({
                          id: selectedViewInspeccion.id || selectedViewInspeccion.id_inspeccion,
                          id_inspeccion: selectedViewInspeccion.id_inspeccion || selectedViewInspeccion.id,
                          id_codigo_exp: selectedViewInspeccion.id_codigo_exp,
                          estatus_inspeccion: selectedViewInspeccion.estatus_inspeccion,
                          id_tipo_insp_clas: selectedViewInspeccion.id_tipo_insp_clas
                        });
                      }
                    }}
                    className="px-4 py-2 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] text-sm flex items-center gap-2"
                  >
                    <ClipboardCheck size={18} />
                    Realizar Inspección
                  </button>
                )}

                <button
                  onClick={handleCloseViewModal}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    darkMode
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de carga para detalle */}
      {loadingDetalle && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-30">
          <div
            className={`p-6 rounded-lg shadow-xl ${darkMode ? "bg-gray-800" : "bg-white"}`}
          >
            <div className="flex items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-[#2A9D8F]" />
              <span
                className={`text-sm ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                Cargando detalles...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspeccionRealizada;