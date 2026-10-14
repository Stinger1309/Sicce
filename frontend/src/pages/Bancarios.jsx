import React, { useState, useEffect, useMemo } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building,
  CheckCircle,
  RefreshCw,
  Landmark,
  FileText,
  Users,
  X,
  Loader,
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";
import bancoAPI from "../services/api_banco";
import usuarioAPI from "../services/api_usuario";

const Bancarios = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("gestionBancaria");
  const [searchTerm, setSearchTerm] = useState("");
  const [creditos, setCreditos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ banco: "", estado: "" });

  const current = usuarioAPI.getCurrentUser() || {};
  const user = {
    name: current.nombre_completo || current.nombres || "Usuario",
    email: current.email || current.correo || "",
    role: current.nombre_rol || current.rol || "Staff",
    avatar: null,
  };

  const loadCreditos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bancoAPI.getCreditos();
      if (res.success) {
        setCreditos(res.data || []);
      } else {
        setError(res.error || "No se pudieron cargar los créditos");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditos();
  }, []);

  const formatMoney = (v) => {
    if (v == null || v === "") return "N/A";
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    if (Number.isNaN(n)) return String(v);
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
      maximumFractionDigits: 2,
    }).format(n);
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    try {
      return new Date(d).toLocaleString("es-VE");
    } catch {
      return String(d);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return creditos.filter((c) => {
      const matchSearch =
        !q ||
        (c.nombre_completo || "").toLowerCase().includes(q) ||
        (c.cedula_persona || "").toLowerCase().includes(q) ||
        (c.nombre_emprendimiento || "").toLowerCase().includes(q) ||
        (c.codigo_expediente || "").toLowerCase().includes(q) ||
        (c.banco_nombre || "").toLowerCase().includes(q);

      const matchBanco = !filters.banco || c.banco_nombre === filters.banco;
      const matchEstado = !filters.estado || c.estatus === filters.estado;
      return matchSearch && matchBanco && matchEstado;
    });
  }, [creditos, searchTerm, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRows = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const bancosUnicos = [...new Set(creditos.map((c) => c.banco_nombre).filter(Boolean))];
  const finalizados = creditos.filter((c) => c.estatus === "Finalizado").length;

  const datosExport = filtered.map((c) => ({
    id: c.id_credito_banco,
    emprendedor: c.nombre_completo,
    cedula: c.cedula_persona,
    emprendimiento: c.nombre_emprendimiento,
    expediente: c.codigo_expediente,
    banco: c.banco_nombre,
    tipo_cuenta: c.tipo_cuenta,
    numero_cuenta: c.numero_cuenta,
    monto: c.monto_solicitado || c.monto_aprobado,
    estatus: c.estatus,
    fecha_direccion: c.fecha_direccion,
    observaciones: c.observaciones,
  }));

  const handleView = async (row) => {
    try {
      const res = await bancoAPI.getCreditoById(row.id_credito_banco);
      setSelected(res.success ? res.data : row);
      setModalOpen(true);
    } catch {
      setSelected(row);
      setModalOpen(true);
    }
  };

  const handleDownloadAval = async (id) => {
    setDownloadingId(id);
    try {
      const actual =
        (selected && String(selected.id_credito_banco) === String(id) && selected) ||
        creditos.find((c) => String(c.id_credito_banco) === String(id));
      const yaEntregado = Boolean(actual?.aval_entregado);

      const blob = await bancoAPI.descargarAvalPdf(id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `aval_iadey_${id}${yaEntregado ? "_entregada" : ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      // Refrescar para ver estado "Entregada"
      await loadCreditos();
      if (selected && String(selected.id_credito_banco) === String(id)) {
        const res = await bancoAPI.getCreditoById(id);
        if (res.success) setSelected(res.data);
      }
    } catch (err) {
      alert("No se pudo generar el PDF aval: " + (err.message || "Error"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleLogout = () => {
    usuarioAPI.logout();
    navigate("/Cierre_sesion");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const markAsRead = (id) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <div className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Header
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
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
                <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                  Crédito a Banco
                </h1>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Solicitudes dirigidas a entidad bancaria con aval institucional IADEY
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadCreditos}
                  className={`p-2 rounded-lg border ${darkMode ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}
                  title="Actualizar"
                >
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
                <ExportButtons
                  data={datosExport}
                  columns={[
                    { key: "id", label: "ID" },
                    { key: "emprendedor", label: "Emprendedor" },
                    { key: "cedula", label: "Cédula" },
                    { key: "emprendimiento", label: "Emprendimiento" },
                    { key: "expediente", label: "Expediente" },
                    { key: "banco", label: "Banco" },
                    { key: "tipo_cuenta", label: "Tipo cuenta" },
                    { key: "numero_cuenta", label: "N° cuenta" },
                    { key: "monto", label: "Monto" },
                    { key: "estatus", label: "Estatus" },
                    { key: "fecha_direccion", label: "Fecha dirección" },
                    { key: "observaciones", label: "Observaciones" },
                  ]}
                  title="Créditos a Banco"
                  fileName="creditos_banco"
                  darkMode={darkMode}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-xl shadow ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                <div className="flex justify-between items-center">
                  <FileText className="text-[#2A9D8F]" size={22} />
                  <span className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {creditos.length}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Total dirigidos</p>
              </div>
              <div className={`p-4 rounded-xl shadow ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                <div className="flex justify-between items-center">
                  <CheckCircle className="text-green-500" size={22} />
                  <span className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {finalizados}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Finalizados</p>
              </div>
              <div className={`p-4 rounded-xl shadow ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                <div className="flex justify-between items-center">
                  <Landmark className="text-indigo-500" size={22} />
                  <span className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {bancosUnicos.length}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Bancos involucrados</p>
              </div>
            </div>

            <div className={`p-4 rounded-xl shadow mb-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar emprendedor, cédula, expediente o banco..."
                    className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${
                      darkMode
                        ? "bg-gray-900 border-gray-700 text-white"
                        : "bg-white border-gray-200"
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    darkMode ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-700"
                  }`}
                >
                  <Filter size={16} /> Filtros
                </button>
              </div>
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <select
                    value={filters.banco}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, banco: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      darkMode ? "bg-gray-900 border-gray-700 text-white" : "border-gray-200"
                    }`}
                  >
                    <option value="">Todos los bancos</option>
                    {bancosUnicos.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <select
                    value={filters.estado}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, estado: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      darkMode ? "bg-gray-900 border-gray-700 text-white" : "border-gray-200"
                    }`}
                  >
                    <option value="">Todos los estatus</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="En proceso">En proceso</option>
                  </select>
                </div>
              )}
            </div>

            <div className={`rounded-xl shadow overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"}`}>
              {loading ? (
                <div className="p-10 flex justify-center text-gray-500 gap-2">
                  <Loader className="animate-spin" size={20} /> Cargando créditos...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-red-600">{error}</div>
              ) : pageRows.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No hay créditos dirigidos a banco todavía.
                </div>
              ) : (
                <div className="overflow-x-auto table-scroll">
                  <table className="min-w-full text-sm">
                    <thead className={darkMode ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-600"}>
                      <tr>
                        <th className="px-4 py-3 text-left">Emprendedor</th>
                        <th className="px-4 py-3 text-left">Expediente</th>
                        <th className="px-4 py-3 text-left">Banco</th>
                        <th className="px-4 py-3 text-left">Monto</th>
                        <th className="px-4 py-3 text-left">Estatus</th>
                        <th className="px-4 py-3 text-left">Aval</th>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((c) => (
                        <tr
                          key={c.id_credito_banco}
                          className={`border-t ${darkMode ? "border-gray-700" : "border-gray-100"}`}
                        >
                          <td className="px-4 py-3">
                            <p className={`font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                              {c.nombre_completo}
                            </p>
                            <p className="text-xs text-gray-500">{c.cedula_persona}</p>
                            <p className="text-xs text-gray-500">{c.nombre_emprendimiento || "—"}</p>
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {c.codigo_expediente || c.id_expediente || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <p className={darkMode ? "text-white" : "text-gray-800"}>{c.banco_nombre}</p>
                            <p className="text-xs text-gray-500">{c.siglas || c.codigo_banco}</p>
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            {formatMoney(c.monto_aprobado || c.monto_solicitado)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                              {c.estatus || "Finalizado"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {c.aval_entregado ? (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                                Entregada
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {formatDate(c.fecha_direccion || c.fecha_finalizado)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleView(c)}
                                className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                                title="Ver información general"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadAval(c.id_credito_banco)}
                                disabled={downloadingId === c.id_credito_banco}
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                title={
                                  c.aval_entregado
                                    ? "Reimprimir PDF aval (marcará ENTREGADA)"
                                    : "Exportar PDF aval IADEY"
                                }
                              >
                                {downloadingId === c.id_credito_banco ? (
                                  <Loader size={16} className="animate-spin" />
                                ) : (
                                  <Download size={16} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className={`flex items-center justify-between px-4 py-3 border-t ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                <p className="text-xs text-gray-500">
                  {filtered.length} registro(s) · Página {currentPage} de {totalPages}
                </p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 rounded disabled:opacity-40">
                    <ChevronsLeft size={16} />
                  </button>
                  <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded disabled:opacity-40">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded disabled:opacity-40">
                    <ChevronRight size={16} />
                  </button>
                  <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1 rounded disabled:opacity-40">
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {modalOpen && selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <div className={`flex items-start justify-between p-5 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>
                  Información general del crédito a banco
                </h2>
                <p className="text-sm text-gray-500">
                  Aval N° {selected.id_credito_banco} · {selected.estatus || "Finalizado"}
                  {selected.aval_entregado ? " · Entregada" : ""}
                </p>
                {selected.aval_entregado && (
                  <span className="inline-flex mt-2 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                    Constancia entregada
                    {selected.fecha_aval_entregado
                      ? ` · ${formatDate(selected.fecha_aval_entregado)}`
                      : ""}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <section className={`p-4 rounded-lg ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users size={16} /> Emprendedor
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Nombre</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>{selected.nombre_completo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cédula</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>{selected.cedula_persona}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>{selected.telefono || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Correo</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>{selected.correo || "N/A"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500">Emprendimiento</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>
                      {selected.nombre_emprendimiento || "N/A"}
                      {selected.sector ? ` · ${selected.sector}` : ""}
                      {selected.actividad ? ` / ${selected.actividad}` : ""}
                    </p>
                  </div>
                </div>
              </section>

              <section className={`p-4 rounded-lg ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building size={16} /> Solicitud
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Expediente</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>{selected.codigo_expediente || selected.id_expediente}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Monto</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>
                      {formatMoney(selected.monto_aprobado || selected.monto_solicitado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Aprobación</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>{selected.estatus_aprobacion || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fecha dirección</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>{formatDate(selected.fecha_direccion)}</p>
                  </div>
                </div>
              </section>

              <section className={`p-4 rounded-lg ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Landmark size={16} /> Banco destino
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Banco</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>{selected.banco_nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Código / siglas</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>
                      {selected.codigo_banco || selected.banco_siglas || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tipo de cuenta</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>{selected.tipo_cuenta || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">N° de cuenta</p>
                    <p className={darkMode ? "text-white" : "text-gray-800"}>{selected.numero_cuenta || "N/A"}</p>
                  </div>
                </div>
              </section>

              {selected.observaciones && (
                <section className={`p-4 rounded-lg ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
                  <h3 className="text-sm font-semibold mb-2">Observaciones</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selected.observaciones}</p>
                </section>
              )}
            </div>

            <div className={`p-5 border-t flex justify-end gap-2 ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
              <button
                type="button"
                onClick={() => handleDownloadAval(selected.id_credito_banco)}
                disabled={downloadingId === selected.id_credito_banco}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A9D8F] text-white text-sm font-medium disabled:opacity-50"
              >
                {downloadingId === selected.id_credito_banco ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {selected.aval_entregado ? "Reimprimir PDF (Entregada)" : "Exportar PDF aval"}
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={`px-4 py-2 rounded-lg border text-sm ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-200"}`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer darkMode={darkMode} />
    </div>
  );
};

export default Bancarios;
