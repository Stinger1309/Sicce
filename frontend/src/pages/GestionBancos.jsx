import React, { useState, useEffect } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Landmark,
  Power,
  RefreshCw,
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";
import bancoAPI from "../services/api_banco";
import usuarioAPI from "../services/api_usuario";
import { onlyDigits } from "../utils/inputFormat";

const emptyForm = {
  nombre: "",
  siglas: "",
  codigo_banco: "",
  activo: true,
};

const GestionBancos = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("bancos");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [bancos, setBancos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");

  const current = usuarioAPI.getCurrentUser() || {};
  const user = {
    name: current.nombre_completo || current.nombres || "Administrador",
    email: current.email || current.correo || "",
    role: current.nombre_rol || current.rol || "Admin",
    avatar: null,
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const markAsRead = (id) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const handleLogout = () => {
    usuarioAPI.logout();
    navigate("/Cierre_sesion");
  };

  const cargarBancos = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await bancoAPI.getAll();
      if (res.success) setBancos(res.data || []);
      else {
        setBancos([]);
        setError(res.error || "No se pudieron cargar los bancos");
      }
    } catch (err) {
      setBancos([]);
      setError(err.response?.data?.error || err.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarBancos();
  }, []);

  const filtered = bancos.filter((b) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      (b.nombre || "").toLowerCase().includes(q) ||
      (b.siglas || "").toLowerCase().includes(q) ||
      (b.codigo_banco || "").toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const openCreate = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (banco) => {
    setEditingId(banco.id_banco);
    setFormData({
      nombre: banco.nombre || "",
      siglas: banco.siglas || "",
      codigo_banco: banco.codigo_banco || "",
      activo: banco.activo !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError("El nombre del banco es obligatorio");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        siglas: formData.siglas.trim() || null,
        codigo_banco: formData.codigo_banco.trim() || null,
        activo: !!formData.activo,
      };
      const res = editingId
        ? await bancoAPI.update(editingId, payload)
        : await bancoAPI.create(payload);

      if (!res.success) {
        setError(res.error || "No se pudo guardar");
        return;
      }
      resetForm();
      await cargarBancos();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (banco) => {
    try {
      const res = await bancoAPI.toggleActivo(banco.id_banco);
      if (!res.success) {
        alert(res.error || "No se pudo cambiar el estado");
        return;
      }
      await cargarBancos();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleDelete = async (banco) => {
    if (!window.confirm(`¿Desactivar el banco "${banco.nombre}"? Dejará de aparecer en el registro de emprendedores.`)) {
      return;
    }
    try {
      const res = await bancoAPI.remove(banco.id_banco);
      if (!res.success) {
        alert(res.error || "No se pudo desactivar");
        return;
      }
      await cargarBancos();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const datosExport = filtered.map((b) => ({
    id: b.id_banco,
    nombre: b.nombre,
    siglas: b.siglas,
    codigo: b.codigo_banco,
    activo: b.activo ? "Sí" : "No",
  }));

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
                  <Landmark className="text-[#2A9D8F]" /> Gestión de Bancos
                </h1>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Catálogo de bancos disponibles para emprendedores y créditos bancarios
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cargarBancos}
                  className={`p-2 rounded-lg border ${darkMode ? "border-gray-700 text-gray-300" : "border-gray-200"}`}
                  title="Actualizar"
                >
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
                <ExportButtons
                  data={datosExport}
                  columns={[
                    { key: "id", label: "ID" },
                    { key: "nombre", label: "Nombre" },
                    { key: "siglas", label: "Siglas" },
                    { key: "codigo", label: "Código" },
                    { key: "activo", label: "Activo" },
                  ]}
                  title="Bancos"
                  fileName="bancos"
                  darkMode={darkMode}
                />
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#264653] text-white text-sm font-medium hover:bg-[#1a3542]"
                >
                  <Plus size={16} /> Nuevo banco
                </button>
              </div>
            </div>

            {showForm && (
              <form
                onSubmit={handleSubmit}
                className={`mb-6 p-4 rounded-xl shadow border ${
                  darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {editingId ? "Editar banco" : "Registrar banco"}
                  </h2>
                  <button type="button" onClick={resetForm} className="p-1 rounded hover:bg-gray-100">
                    <X size={18} />
                  </button>
                </div>
                {error && (
                  <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                    {error}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="lg:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                    <input
                      value={formData.nombre}
                      onChange={(e) => setFormData((f) => ({ ...f, nombre: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        darkMode ? "bg-gray-900 border-gray-600 text-white" : "border-gray-200"
                      }`}
                      placeholder="Ej. Banco de Venezuela"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Siglas</label>
                    <input
                      value={formData.siglas}
                      onChange={(e) => setFormData((f) => ({ ...f, siglas: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        darkMode ? "bg-gray-900 border-gray-600 text-white" : "border-gray-200"
                      }`}
                      placeholder="BDV"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Código</label>
                    <input
                      value={formData.codigo_banco}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          codigo_banco: onlyDigits(e.target.value, 4),
                        }))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${
                        darkMode ? "bg-gray-900 border-gray-600 text-white" : "border-gray-200"
                      }`}
                      placeholder="0102"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData((f) => ({ ...f, activo: e.target.checked }))}
                      className="rounded"
                    />
                    Activo (visible en registro de emprendedores)
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2A9D8F] text-white text-sm disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </form>
            )}

            <div className={`p-4 rounded-xl shadow mb-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, siglas o código..."
                  className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${
                    darkMode ? "bg-gray-900 border-gray-700 text-white" : "border-gray-200"
                  }`}
                />
              </div>
            </div>

            <div className={`rounded-xl shadow overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"}`}>
              {loading ? (
                <div className="p-10 text-center text-gray-500">Cargando bancos...</div>
              ) : error && !showForm ? (
                <div className="p-6 text-center text-red-600">{error}</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-gray-500">No hay bancos registrados.</div>
              ) : (
                <div className="overflow-x-auto table-scroll">
                  <table className="min-w-full text-sm">
                    <thead className={darkMode ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-600"}>
                      <tr>
                        <th className="px-4 py-3 text-left">Nombre</th>
                        <th className="px-4 py-3 text-left">Siglas</th>
                        <th className="px-4 py-3 text-left">Código</th>
                        <th className="px-4 py-3 text-left">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((b) => (
                        <tr key={b.id_banco} className={`border-t ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                          <td className={`px-4 py-3 font-medium ${darkMode ? "text-white" : "text-gray-800"}`}>
                            {b.nombre}
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            {b.siglas || "—"}
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            {b.codigo_banco || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold border ${
                                b.activo
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {b.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(b)}
                                className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggle(b)}
                                className={`p-2 rounded-lg ${
                                  b.activo
                                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    : "bg-green-50 text-green-700 hover:bg-green-100"
                                }`}
                                title={b.activo ? "Desactivar" : "Activar"}
                              >
                                <Power size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(b)}
                                className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                                title="Desactivar"
                              >
                                <Trash2 size={16} />
                              </button>
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

export default GestionBancos;
