import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
  Search,
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";
import citaAPI from "../services/api_cita";
import usuarioAPI from "../services/api_usuario";
import { esInspector } from "../utils/roles";

/** Extrae YYYY-MM-DD sin desfase por zona horaria. */
const toDateKey = (fecha) => {
  if (!fecha) return "";
  if (typeof fecha === "string") {
    const m = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const localTodayKey = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

const formatFecha = (fecha) => {
  if (!fecha) return "—";
  const d = toDateKey(fecha);
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const formatHora = (hora) => {
  if (!hora) return "—";
  return String(hora).slice(0, 5);
};

const monthStartFromKey = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
};

const Citas = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("citas");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const didAutoJump = useRef(false);

  const current = usuarioAPI.getCurrentUser() || {};
  const user = {
    name: current.nombre_completo || current.nombres || "Administrador",
    email: current.email || current.correo || "",
    role: current.nombre_rol || current.rol || "Admin",
    avatar: null,
  };
  const userId = current.id || current.id_usuario || current.userId;
  const soyInspector = esInspector(current);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const markAsRead = (id) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const handleLogout = () => {
    usuarioAPI.logout();
    navigate("/Cierre_sesion");
  };

  const cargarCitas = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      // Inspector solo ve sus citas asignadas
      if (soyInspector && userId) {
        params.id_inspector = userId;
      }

      const res = await citaAPI.getAll(params);
      if (res.success) setCitas(res.data || []);
      else {
        setCitas([]);
        setError(res.error || "No se pudieron cargar las citas");
      }
    } catch (err) {
      setCitas([]);
      setError(err.response?.data?.error || err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCitas();
  }, []);

  // Si el mes actual no tiene citas, saltar al mes más cercano con agenda
  useEffect(() => {
    if (loading || didAutoJump.current || citas.length === 0) return;

    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth() + 1;
    const enMes = citas.some((c) => {
      const key = toDateKey(c.fecha_cita);
      if (!key) return false;
      const [cy, cm] = key.split("-").map(Number);
      return cy === y && cm === m;
    });
    if (enMes) {
      didAutoJump.current = true;
      return;
    }

    const today = localTodayKey();
    const keys = citas.map((c) => toDateKey(c.fecha_cita)).filter(Boolean).sort();
    const upcoming = keys.find((k) => k >= today) || keys[keys.length - 1];
    if (upcoming) {
      didAutoJump.current = true;
      setViewMonth(monthStartFromKey(upcoming));
    }
  }, [citas, loading, viewMonth]);

  const citasDelMes = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth() + 1;
    return citas.filter((c) => {
      const key = toDateKey(c.fecha_cita);
      if (!key) return false;
      const [cy, cm] = key.split("-").map(Number);
      return cy === y && cm === m;
    });
  }, [citas, viewMonth]);

  const citasPorDia = useMemo(() => {
    const map = {};
    citasDelMes.forEach((c) => {
      const key = toDateKey(c.fecha_cita);
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [citasDelMes]);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, key, count: (citasPorDia[key] || []).length });
    }
    return cells;
  }, [viewMonth, citasPorDia]);

  const filtered = useMemo(() => {
    let list = citasDelMes;
    if (selectedDate) {
      list = list.filter((c) => toDateKey(c.fecha_cita) === selectedDate);
    }
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      return (
        (c.inspector_nombre || "").toLowerCase().includes(q) ||
        (c.emprendedor_nombre || "").toLowerCase().includes(q) ||
        (c.codigo_expediente || "").toLowerCase().includes(q) ||
        (c.estatus || "").toLowerCase().includes(q) ||
        (c.titulo || "").toLowerCase().includes(q)
      );
    });
  }, [citasDelMes, selectedDate, searchTerm]);

  const handleCancelar = async (cita) => {
    if (cita.estatus === "Cancelada" || cita.estatus === "Atendida") return;
    if (!window.confirm(`¿Cancelar la cita del ${formatFecha(cita.fecha_cita)} a las ${formatHora(cita.hora_inicio)}?`)) {
      return;
    }
    try {
      const res = await citaAPI.cancelar(cita.id_cita);
      if (!res.success) {
        alert(res.error || "No se pudo cancelar la cita");
        return;
      }
      await cargarCitas();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Error al cancelar");
    }
  };

  const monthLabel = viewMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const datosExport = filtered.map((c) => ({
    fecha: formatFecha(c.fecha_cita),
    hora: formatHora(c.hora_inicio),
    inspector: c.inspector_nombre || "",
    emprendedor: c.emprendedor_nombre || "",
    expediente: c.codigo_expediente || "",
    estatus: c.estatus || "",
  }));

  const estatusClass = (estatus) => {
    const e = (estatus || "").toLowerCase();
    if (e === "cancelada") return "bg-red-100 text-red-800 border-red-200";
    if (e === "reprogramada") return "bg-amber-100 text-amber-800 border-amber-200";
    if (e === "atendida" || e === "completada" || e === "realizada") {
      return "bg-green-100 text-green-800 border-green-200";
    }
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const otrosMesesCount = citas.length - citasDelMes.length;

  return (
    <div className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
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

        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-20"}`}>
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-800"}`}>
                  <Calendar className="text-[#2A9D8F]" /> Citas
                </h1>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Agenda mensual de citas de inspección y atención
                  {!loading && citas.length > 0 && (
                    <span className="ml-1">({citas.length} en total)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cargarCitas}
                  className={`p-2 rounded-lg border ${darkMode ? "border-gray-700 text-gray-300" : "border-gray-200"}`}
                  title="Actualizar"
                >
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
                <ExportButtons
                  data={datosExport}
                  columns={[
                    { key: "fecha", label: "Fecha" },
                    { key: "hora", label: "Hora" },
                    { key: "inspector", label: "Inspector" },
                    { key: "emprendedor", label: "Emprendedor" },
                    { key: "expediente", label: "Expediente" },
                    { key: "estatus", label: "Estatus" },
                  ]}
                  title="Citas"
                  fileName="citas"
                  darkMode={darkMode}
                />
              </div>
            </div>

            {/* Calendario mensual */}
            <div className={`mb-6 p-4 rounded-xl shadow ${darkMode ? "bg-gray-800" : "bg-white"}`}>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(null);
                    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
                  }}
                  className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className={`text-lg font-semibold capitalize ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {monthLabel}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(null);
                    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
                  }}
                  className={`p-2 rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell, idx) => {
                  if (!cell) {
                    return <div key={`empty-${idx}`} className="aspect-square min-h-[48px]" />;
                  }
                  const isSelected = selectedDate === cell.key;
                  const isToday = cell.key === localTodayKey();
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => setSelectedDate((prev) => (prev === cell.key ? null : cell.key))}
                      className={`aspect-square min-h-[48px] rounded-lg border text-sm flex flex-col items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-[#2A9D8F] text-white border-[#2A9D8F]"
                          : isToday
                          ? darkMode
                            ? "border-[#2A9D8F] bg-gray-700 text-white"
                            : "border-[#2A9D8F] bg-teal-50 text-gray-800"
                          : darkMode
                          ? "border-gray-700 hover:bg-gray-700 text-gray-200"
                          : "border-gray-100 hover:bg-gray-50 text-gray-800"
                      }`}
                    >
                      <span className="font-medium">{cell.day}</span>
                      {cell.count > 0 && (
                        <span
                          className={`mt-0.5 text-[10px] px-1.5 rounded-full ${
                            isSelected ? "bg-white/25" : "bg-[#264653] text-white"
                          }`}
                        >
                          {cell.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                    Filtrando: {formatFecha(selectedDate)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="text-[#2A9D8F] hover:underline"
                  >
                    Ver todas del mes
                  </button>
                </div>
              )}
            </div>

            <div className={`p-4 rounded-xl shadow mb-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por inspector, emprendedor, expediente..."
                  className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${
                    darkMode ? "bg-gray-900 border-gray-700 text-white" : "border-gray-200"
                  }`}
                />
              </div>
            </div>

            <div className={`rounded-xl shadow overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"}`}>
              {loading ? (
                <div className="p-10 text-center text-gray-500">Cargando citas...</div>
              ) : error ? (
                <div className="p-6 text-center text-red-600">{error}</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-gray-500 space-y-2">
                  <p>No hay citas para mostrar en {monthLabel}.</p>
                  {otrosMesesCount > 0 && (
                    <p className="text-sm">
                      Hay {otrosMesesCount} cita(s) en otros meses. Usa las flechas del calendario para navegar.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto table-scroll">
                  <table className="min-w-full text-sm">
                    <thead className={darkMode ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-600"}>
                      <tr>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Hora</th>
                        <th className="px-4 py-3 text-left">Inspector</th>
                        <th className="px-4 py-3 text-left">Emprendedor</th>
                        <th className="px-4 py-3 text-left">Expediente</th>
                        <th className="px-4 py-3 text-left">Estatus</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => (
                        <tr key={c.id_cita} className={`border-t ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                          <td className={`px-4 py-3 ${darkMode ? "text-white" : "text-gray-800"}`}>
                            {formatFecha(c.fecha_cita)}
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            {formatHora(c.hora_inicio)}
                            {c.hora_fin ? ` – ${formatHora(c.hora_fin)}` : ""}
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {(c.inspector_nombre || "").trim() || "—"}
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {(c.emprendedor_nombre || "").trim() || c.cedula_emprendedor || "—"}
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {c.codigo_expediente || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold border ${estatusClass(c.estatus)}`}>
                              {c.estatus || "Programada"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              {c.estatus !== "Cancelada" && c.estatus !== "Atendida" && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelar(c)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs"
                                  title="Cancelar cita"
                                >
                                  <XCircle size={14} />
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Footer darkMode={darkMode} />
    </div>
  );
};

export default Citas;
