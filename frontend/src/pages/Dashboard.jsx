// pages/Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useSidebarState } from "../hooks/useAppShell";
import usuarioAPI from "../services/api_usuario";
import metricasAPI from "../services/api_metricas";
import { useNavigate } from "react-router-dom";
import { puedeVerMetricas, rutaInicioSesion } from "../utils/roles";
import {
  Search,
  RefreshCw,
  Briefcase,
  ClipboardCheck,
  Handshake,
  FileSignature,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Users,
  Building,
  Loader2,
  ArrowRight,
  Calendar,
  Banknote,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

const formatFechaRelativa = (fecha) => {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} d`;
  return d.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatHora = (fecha) => {
  if (!fecha) return "--:--";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
};

const labelActividad = (tipo) => {
  const map = {
    solicitud: "Solicitud",
    expediente: "Expediente",
    inspeccion: "Inspección",
    contrato: "Contrato",
  };
  return map[tipo] || tipo || "Actividad";
};

const rutaPorTipo = (tipoOType) => {
  const t = String(tipoOType || "").toLowerCase();
  if (t.includes("solicitud")) return "/Solicitud";
  if (t.includes("expediente")) return "/Expediente";
  if (t.includes("inspeccion") || t.includes("inspección")) return "/Inspeccion";
  if (t.includes("aprobacion") || t.includes("aprobación")) return "/Aprobacion";
  if (t.includes("contrato")) return "/Contrato";
  if (t.includes("desembolso")) return "/Desembolso";
  if (t.includes("cuota")) return "/Cuota";
  if (t.includes("cita")) return "/Citas";
  return null;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metricas, setMetricas] = useState(null);

  const currentUser = usuarioAPI.getCurrentUser() || {};
  const user = {
    name:
      currentUser.nombre_completo ||
      currentUser.name ||
      [currentUser.nombres, currentUser.apellidos].filter(Boolean).join(" ") ||
      "Usuario IADEY",
    email: currentUser.correo || currentUser.email || "",
    role: currentUser.nombre_rol || currentUser.role || "Usuario",
    avatar: currentUser.avatar || null,
  };

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await metricasAPI.getResumen();
      if (res?.success) {
        setMetricas(res.data);
      } else {
        setError(res?.error || "No se pudieron cargar las métricas");
        setMetricas(null);
      }
    } catch (e) {
      console.error(e);
      setError("Error al conectar con el servidor");
      setMetricas(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!puedeVerMetricas(currentUser)) {
      navigate(rutaInicioSesion(currentUser), { replace: true });
      return;
    }
    cargar();
  }, []);

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

  const r = metricas?.resumen || {};

  const countEstatus = (lista, predicado) => {
    if (!Array.isArray(lista)) return null;
    let total = 0;
    let matched = false;
    for (const row of lista) {
      const nombre = String(row?.nombre || "");
      if (predicado(nombre.toLowerCase())) {
        matched = true;
        total += Number(row?.valor) || 0;
      }
    }
    return matched ? total : null;
  };

  const preAprobadasDesdeLista = countEstatus(
    metricas?.solicitudesPorEstatus,
    (n) =>
      n === "recibido" ||
      (n.includes("pre") && n.includes("aprob"))
  );
  const pendientesDesdeLista = countEstatus(
    metricas?.solicitudesPorEstatus,
    (n) => n === "pendiente" || n.startsWith("pendiente ")
  );
  const incompletasDesdeLista = countEstatus(
    metricas?.solicitudesPorEstatus,
    (n) => n.includes("incomplet")
  );

  const solicitudesPreAprobadas =
    r.solicitudesPreAprobadas ?? preAprobadasDesdeLista ?? 0;
  const solicitudesPendientes =
    r.solicitudesPendientes ?? pendientesDesdeLista ?? 0;
  const solicitudesIncompletas =
    r.solicitudesIncompletas ?? incompletasDesdeLista ?? 0;

  const stats = [
    {
      id: 1,
      title: "Expedientes",
      value: r.expedientes ?? 0,
      subtitle: `${r.expedientesListosInspeccion ?? 0} listos p/ inspección`,
      icon: Briefcase,
      color: "blue",
      path: "/Expediente",
    },
    {
      id: 2,
      title: "Inspecciones pendientes",
      value: r.inspeccionesPendientes ?? 0,
      subtitle: `${r.inspeccionesCompletadas ?? 0} completadas`,
      icon: ClipboardCheck,
      color: "orange",
      path: "/Inspeccion",
    },
    {
      id: 3,
      title: "Solicitudes recibidas",
      value: solicitudesPreAprobadas,
      subtitle: `${solicitudesPendientes} pendientes · ${solicitudesIncompletas} incompletas`,
      icon: Handshake,
      color: "green",
      path: "/Solicitud",
    },
    {
      id: 4,
      title: "Contratos activos",
      value: r.contratosActivos ?? 0,
      subtitle: `${r.contratosPendientesDesembolso ?? 0} p/ desembolso`,
      icon: FileSignature,
      color: "purple",
      path: "/Contrato",
    },
  ];

  const accesosRapidos = [
    { label: "Solicitudes", desc: "Pre-aprobación y seguimiento", path: "/Solicitud", icon: Handshake },
    { label: "Expedientes", desc: "Documentación del crédito", path: "/Expediente", icon: Briefcase },
    { label: "Inspecciones", desc: "Visitas de campo", path: "/Inspeccion", icon: ClipboardCheck },
    { label: "Aprobaciones", desc: "Dictamen final", path: "/Aprobacion", icon: FileSignature },
    { label: "Citas", desc: "Agenda de atención", path: "/Citas", icon: Calendar },
    { label: "Contratos", desc: "Formalización", path: "/Contrato", icon: FileSignature },
    { label: "Desembolsos", desc: "Liberación de fondos", path: "/Desembolso", icon: Banknote },
    { label: "Cuotas", desc: "Cobranza y mora", path: "/Cuota", icon: CreditCard },
    { label: "Gráficos", desc: "Indicadores y reportes", path: "/Graficos", icon: BarChart3 },
  ];

  const quickSummary = [
    { label: "Solicitudes totales", value: r.solicitudes ?? 0, path: "/Solicitud" },
    { label: "Recibidas", value: solicitudesPreAprobadas, path: "/Solicitud" },
    { label: "Pendientes", value: solicitudesPendientes, path: "/Solicitud" },
    { label: "Tasa de aprobación", value: `${r.tasaAprobacion ?? 0}%`, path: "/Aprobacion" },
    { label: "Emprendedores", value: r.emprendedores ?? 0, path: "/Usuario" },
    { label: "Desembolsos pendientes", value: r.desembolsosPendientes ?? 0, path: "/Desembolso" },
    { label: "Cuotas en mora/vencidas", value: r.cuotasVencidas ?? 0, path: "/Cuota" },
  ];

  const pendientes = useMemo(() => {
    const list = Array.isArray(metricas?.pendientesRecientes)
      ? metricas.pendientesRecientes
      : [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        String(item.name || "").toLowerCase().includes(q) ||
        String(item.type || "").toLowerCase().includes(q) ||
        String(item.status || "").toLowerCase().includes(q)
    );
  }, [metricas, searchTerm]);

  const actividad = Array.isArray(metricas?.actividadReciente)
    ? metricas.actividadReciente
    : [];

  const notifications = actividad.slice(0, 6).map((a, idx) => ({
    id: idx + 1,
    text: `${labelActividad(a.tipo)}: ${a.titulo}${a.detalle ? ` (${a.detalle})` : ""}`,
    time: formatFechaRelativa(a.fecha),
    read: idx > 2,
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    usuarioAPI.logout();
  };

  const markAsRead = () => {};

  return (
    <div
      className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden app-shell-bg ${
        darkMode ? "dark bg-gray-900" : ""
      }`}
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
          darkMode={darkMode}
        />

        <main
          className={`flex-1 min-w-0 transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "lg:ml-20"
          }`}
        >
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1
                  className={`text-2xl sm:text-3xl font-bold ${
                    darkMode ? "text-white" : "text-[#264653]"
                  }`}
                >
                  Panel de Control
                </h1>
                <p
                  className={`text-sm ${
                    darkMode ? "text-teal-200/70" : "text-[#2A9D8F]"
                  }`}
                >
                  Resumen operativo de SICCE · datos en tiempo real
                </p>
              </div>
              <button
                type="button"
                onClick={cargar}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white hover:shadow-lg transition-all disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                Actualizar
              </button>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Buscar en pendientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    darkMode
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                      : "bg-white border-gray-200 placeholder-gray-500"
                  } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate("/Solicitud")}
                  className="px-4 py-2 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Ir a Solicitudes
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/Inspeccion")}
                  className={`px-4 py-2 rounded-lg border ${
                    darkMode
                      ? "border-gray-600 text-gray-200 hover:bg-gray-800"
                      : "border-gray-300 text-gray-700 hover:bg-white"
                  }`}
                >
                  Inspecciones
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/Graficos")}
                  className={`px-4 py-2 rounded-lg border ${
                    darkMode
                      ? "border-gray-600 text-gray-200 hover:bg-gray-800"
                      : "border-gray-300 text-gray-700 hover:bg-white"
                  }`}
                >
                  Ver gráficos
                </button>
              </div>
            </div>

            {/* Accesos rápidos reales */}
            <div className="mb-8">
              <h2
                className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
                  darkMode ? "text-teal-300/80" : "text-[#264653]"
                }`}
              >
                Accesos rápidos
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {accesosRapidos.map((acceso, idx) => {
                  const Icon = acceso.icon;
                  const accents = [
                    "from-[#e6f6f4] to-white border-[#2A9D8F]/25",
                    "from-[#fff8e8] to-white border-[#E9C46A]/40",
                    "from-[#edf7ff] to-white border-sky-300/40",
                    "from-[#fff1eb] to-white border-[#E76F51]/25",
                  ];
                  const accent = accents[idx % accents.length];
                  return (
                    <button
                      key={acceso.path}
                      type="button"
                      onClick={() => navigate(acceso.path)}
                      className={`text-left p-3 rounded-xl border bg-gradient-to-br transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        darkMode
                          ? "from-gray-800 to-gray-800/80 border-teal-800/40 hover:border-teal-500/50"
                          : accent
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`p-1.5 rounded-lg ${
                          darkMode ? "bg-teal-900/50" : "bg-white/80 shadow-sm"
                        }`}>
                          <Icon size={16} className="text-[#2A9D8F] shrink-0" />
                        </span>
                        <span
                          className={`text-sm font-semibold truncate ${
                            darkMode ? "text-white" : "text-[#264653]"
                          }`}
                        >
                          {acceso.label}
                        </span>
                      </div>
                      <p
                        className={`text-xs line-clamp-2 ${
                          darkMode ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {acceso.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {loading && !metricas ? (
              <div
                className={`flex items-center justify-center py-24 ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                <Loader2 className="animate-spin mr-2" size={22} />
                Cargando datos...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {stats.map((stat) => (
                    <SectionStatCard
                      key={stat.id}
                      stat={stat}
                      darkMode={darkMode}
                      onClick={() => stat.path && navigate(stat.path)}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div
                    className={`lg:col-span-2 p-6 rounded-xl sicce-card ${
                      darkMode ? "bg-gray-800 border-teal-800/30" : "bg-white/90"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4 gap-2">
                      <h3
                        className={`text-lg font-semibold ${
                          darkMode ? "text-white" : "text-gray-800"
                        }`}
                      >
                        Pendientes recientes
                      </h3>
                      <button
                        type="button"
                        onClick={() => navigate("/Solicitud")}
                        className="text-xs text-[#2A9D8F] hover:underline inline-flex items-center gap-1"
                      >
                        Ver solicitudes <ArrowRight size={12} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {pendientes.length > 0 ? (
                        pendientes.map((item, idx) => (
                          <PendingItem
                            key={`${item.type}-${item.id}-${idx}`}
                            item={item}
                            darkMode={darkMode}
                            onOpen={() => {
                              const ruta = rutaPorTipo(item.type);
                              if (ruta) navigate(ruta);
                            }}
                          />
                        ))
                      ) : (
                        <p
                          className={`text-center py-8 ${
                            darkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          No hay elementos pendientes
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className={`p-6 rounded-xl sicce-card ${
                      darkMode
                        ? "bg-gray-800 border-teal-800/30"
                        : "bg-gradient-to-br from-white to-[#e6f6f4]/60"
                    }`}
                  >
                    <h3
                      className={`text-lg font-semibold mb-4 ${
                        darkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      Resumen rápido
                    </h3>
                    <div className="space-y-3">
                      {quickSummary.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => item.path && navigate(item.path)}
                          className={`w-full flex justify-between items-center gap-3 text-left rounded-lg px-2 py-1.5 transition-colors ${
                            darkMode ? "hover:bg-gray-700/60" : "hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            {item.label}
                          </span>
                          <span
                            className={`text-lg font-semibold inline-flex items-center gap-1 ${
                              darkMode ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {item.value}
                            <ExternalLink size={12} className="opacity-50" />
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <MiniMetric
                        icon={Users}
                        label="Usuarios"
                        value={r.usuarios ?? 0}
                        darkMode={darkMode}
                        onClick={() => navigate("/Usuario")}
                      />
                      <MiniMetric
                        icon={Building}
                        label="Emprend."
                        value={r.emprendimientos ?? 0}
                        darkMode={darkMode}
                        onClick={() => navigate("/Expediente")}
                      />
                      <MiniMetric
                        icon={CreditCard}
                        label="Desembolsos"
                        value={r.desembolsos ?? 0}
                        darkMode={darkMode}
                        onClick={() => navigate("/Desembolso")}
                      />
                      <MiniMetric
                        icon={TrendingUp}
                        label="Aprobadas"
                        value={r.aprobacionesAprobadas ?? 0}
                        darkMode={darkMode}
                        onClick={() => navigate("/Aprobacion")}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={`p-6 rounded-xl sicce-card ${
                    darkMode
                      ? "bg-gray-800 border-teal-800/30"
                      : "bg-gradient-to-br from-white via-white to-[#fff8e8]/70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <h3
                      className={`text-lg font-semibold ${
                        darkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      Actividad reciente
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate("/Graficos")}
                      className="text-xs text-[#2A9D8F] hover:underline inline-flex items-center gap-1"
                    >
                      Ver indicadores <ArrowRight size={12} />
                    </button>
                  </div>
                  {actividad.length > 0 ? (
                    <div className="space-y-2">
                      {actividad.map((a, index) => {
                        const ruta = rutaPorTipo(a.tipo);
                        return (
                          <button
                            key={`${a.tipo}-${a.titulo}-${index}`}
                            type="button"
                            onClick={() => ruta && navigate(ruta)}
                            disabled={!ruta}
                            className={`w-full flex items-start gap-4 text-left rounded-lg p-2 transition-colors ${
                              ruta
                                ? darkMode
                                  ? "hover:bg-gray-700/50"
                                  : "hover:bg-gray-50"
                                : "cursor-default"
                            }`}
                          >
                            <div
                              className={`text-sm ${
                                darkMode ? "text-gray-500" : "text-gray-400"
                              } min-w-[60px]`}
                            >
                              {formatHora(a.fecha)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${
                                  darkMode ? "text-white" : "text-gray-800"
                                }`}
                              >
                                {labelActividad(a.tipo)} · {a.titulo}
                                {a.detalle ? ` — ${a.detalle}` : ""}
                              </p>
                              <p
                                className={`text-xs mt-1 ${
                                  darkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                {a.actor?.trim() || "Sistema"} ·{" "}
                                {formatFechaRelativa(a.fecha)}
                              </p>
                            </div>
                            {ruta && (
                              <ArrowRight
                                size={14}
                                className={`mt-1 shrink-0 ${
                                  darkMode ? "text-gray-500" : "text-gray-400"
                                }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p
                      className={`text-center py-8 ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Sin actividad reciente
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <Footer darkMode={darkMode} />
        </main>
      </div>
    </div>
  );
};

const SectionStatCard = ({ stat, darkMode, onClick }) => {
  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-teal-100 text-[#2A9D8F]",
      yellow: "bg-amber-100 text-amber-600",
      red: "bg-red-100 text-red-600",
      purple: "bg-amber-100 text-amber-700",
      orange: "bg-orange-100 text-orange-600",
    };
    return colors[color] || colors.blue;
  };

  const getStatSkin = (color) => {
    if (darkMode) return "bg-gray-800 border border-teal-800/30";
    const map = {
      blue: "sicce-stat-blue",
      green: "sicce-stat-green",
      orange: "sicce-stat-orange",
      purple: "sicce-stat-purple",
    };
    return map[color] || "sicce-stat-green";
  };

  const Icon = stat.icon;
  const classes = getColorClasses(stat.color);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-6 rounded-xl text-left w-full sicce-card hover:shadow-xl hover:-translate-y-0.5 transition-all ${getStatSkin(
        stat.color
      )} ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${classes.split(" ")[0]}`}>
          <Icon className={classes.split(" ")[1]} size={24} />
        </div>
        <ArrowRight
          size={16}
          className={darkMode ? "text-teal-400" : "text-[#2A9D8F]"}
        />
      </div>
      <h3
        className={`text-2xl font-bold mb-1 ${
          darkMode ? "text-white" : "text-[#264653]"
        }`}
      >
        {stat.value}
      </h3>
      <p className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
        {stat.title}
      </p>
      {stat.subtitle && (
        <p
          className={`text-xs mt-1 ${
            darkMode ? "text-gray-500" : "text-gray-500"
          }`}
        >
          {stat.subtitle}
        </p>
      )}
    </button>
  );
};

const MiniMetric = ({ icon: Icon, label, value, darkMode, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-3 rounded-lg border text-left w-full transition-colors ${
      darkMode
        ? "border-gray-700 hover:bg-gray-700/40"
        : "border-gray-200 hover:bg-gray-50"
    }`}
  >
    <div className="flex items-center gap-2 mb-1">
      <Icon size={14} className="text-[#2A9D8F]" />
      <span
        className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
      >
        {label}
      </span>
    </div>
    <p
      className={`text-lg font-semibold ${
        darkMode ? "text-white" : "text-gray-800"
      }`}
    >
      {value}
    </p>
  </button>
);

const PendingItem = ({ item, darkMode, onOpen }) => {
  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("pend")) return "bg-yellow-500";
    if (s.includes("incomplet")) return "bg-red-500";
    if (s.includes("aprob") || s.includes("activo") || s.includes("complet"))
      return "bg-green-500";
    if (s.includes("revis") || s.includes("proceso") || s.includes("listo"))
      return "bg-blue-500";
    return "bg-gray-500";
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`p-4 rounded-lg border w-full text-left ${
        darkMode
          ? "border-gray-700 hover:bg-gray-700/50"
          : "border-gray-200 hover:bg-gray-50"
      } transition-all`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(
                item.status
              )}`}
            />
            <h4
              className={`font-medium truncate ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {item.name || "Sin nombre"}
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                Tipo:
              </span>
              <span
                className={`ml-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {item.type}
              </span>
            </div>
            <div>
              <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                Fecha:
              </span>
              <span
                className={`ml-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {item.date || "—"}
              </span>
            </div>
            <div>
              <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                Estatus:
              </span>
              <span
                className={`ml-1 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {item.status}
              </span>
            </div>
            {item.priority && (
              <div>
                <span className={darkMode ? "text-gray-400" : "text-gray-500"}>
                  Prioridad:
                </span>
                <span
                  className={`ml-1 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {item.priority}
                </span>
              </div>
            )}
          </div>
        </div>
        <ArrowRight
          size={16}
          className={`mt-1 shrink-0 ${
            darkMode ? "text-gray-500" : "text-gray-400"
          }`}
        />
      </div>
    </button>
  );
};

export default Dashboard;
