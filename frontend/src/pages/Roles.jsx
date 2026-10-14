// pages/Roles.jsx
import React, { useState, useEffect } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import usuarioAPI from '../services/api_usuario';
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Shield,
  Loader2
} from "lucide-react";

// Mantenemos los componentes personalizados
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";
import rolAPI from "../services/api_rol";
import permisosAPI from "../services/api_permisos";
import areaAPI from "../services/api_area";
import { ESTRUCTURA_MENU, parseAcciones } from "../utils/menuPermisos";
import { rolRequiereArea } from "../utils/roles";

const Roles = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("roles");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Estados para la gestión de roles
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    nombre_rol: "",
    descripcion: "",
    requiere_area: false,
    unico: false,
  });

  const [areas, setAreas] = useState([]);
  const [vista, setVista] = useState("roles");
  const [areaForm, setAreaForm] = useState({ nombre_area: "", codigo: "", descripcion: "" });
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [areaPermisosId, setAreaPermisosId] = useState("");

  // Permisos por rol
  const [permisosModalOpen, setPermisosModalOpen] = useState(false);
  const [rolPermisos, setRolPermisos] = useState(null);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState({});
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [savingPermisos, setSavingPermisos] = useState(false);

  // Datos del usuario y notificaciones
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Nuevo rol agregado", time: "5 min", read: false },
    { id: 2, text: "Rol actualizado correctamente", time: "1 hora", read: false },
  ]);

  const user = {
    name: "Analista IADEY",
    email: "analista@iadey.gob.ve",
    role: "Administrador",
    avatar: null,
    department: "Dirección de Fomento"
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarRoles();
    cargarAreas();
  }, []);

  const cargarAreas = async () => {
    try {
      const response = await areaAPI.getAll();
      if (response.success) setAreas(response.data || []);
    } catch (error) {
      console.error("Error al cargar áreas:", error);
    }
  };

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.notifications-menu') && !e.target.closest('.user-menu')) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Función para cargar roles desde la API
  const cargarRoles = async () => {
    setLoading(true);
    try {
      const response = await rolAPI.getAllRoles();
      if (response.success) {
        setRoles(response.data);
      } else {
        console.error('Error al cargar roles:', response.error);
        setRoles([]);
      }
    } catch (error) {
      console.error('Error en cargarRoles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para crear o actualizar rol
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.nombre_rol || formData.nombre_rol.trim() === '') {
      alert('El nombre del rol es obligatorio');
      return;
    }

    try {
      if (editingId) {
        // Actualizar existente
        const response = await rolAPI.updateRol(editingId, formData);
        if (response.success) {
          await cargarRoles(); // Recargar la lista
          setNotifications([{
            id: Date.now(),
            text: `Rol "${formData.nombre_rol}" actualizado`,
            time: "ahora",
            read: false
          }, ...notifications]);
        } else {
          console.error('Error al actualizar:', response.error);
          alert(response.error || 'Error al actualizar el rol');
        }
      } else {
        // Crear nuevo
        const response = await rolAPI.createRol(formData);
        if (response.success) {
          await cargarRoles(); // Recargar la lista
          setNotifications([{
            id: Date.now(),
            text: `Nuevo rol "${formData.nombre_rol}" creado`,
            time: "ahora",
            read: false
          }, ...notifications]);
        } else {
          console.error('Error al crear:', response.error);
          alert(response.error || 'Error al crear el rol');
        }
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      alert(error.error || 'Error al procesar la solicitud');
    } finally {
      // Limpiar formulario
      setFormData({ nombre_rol: "", descripcion: "", requiere_area: false, unico: false });
      setEditingId(null);
    }
  };

  // Función para editar un rol
  const handleEdit = (rol) => {
    setEditingId(rol.id_rol);
    setFormData({
      nombre_rol: rol.nombre_rol,
      descripcion: rol.descripcion || "",
      requiere_area: Boolean(rol.requiere_area),
      unico: Boolean(rol.unico),
    });
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Función para eliminar un rol (borrado lógico)
  const handleDelete = async (id, nombre_rol) => {
    if (!window.confirm(`¿Desactivar el rol "${nombre_rol}"?\n\nNo se borrará de la base de datos; solo dejará de mostrarse.`)) {
      return;
    }
    try {
      const response = await rolAPI.deleteRol(id);
      if (response.success) {
        await cargarRoles();
        setNotifications([{
          id: Date.now(),
          text: `Rol "${nombre_rol}" desactivado`,
          time: "ahora",
          read: false
        }, ...notifications]);
      } else {
        alert(response.error || 'No se pudo desactivar el rol');
      }
    } catch (error) {
      console.error('Error al desactivar rol:', error);
      alert(error.message || 'Error al desactivar el rol');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ nombre_rol: "", descripcion: "", requiere_area: false, unico: false });
  };

  const handleSubmitArea = async (e) => {
    e.preventDefault();
    if (!areaForm.nombre_area.trim()) {
      alert("El nombre del área es obligatorio");
      return;
    }
    try {
      const payload = {
        nombre_area: areaForm.nombre_area.trim(),
        codigo: areaForm.codigo.trim() || areaForm.nombre_area.trim(),
        descripcion: areaForm.descripcion.trim() || null,
      };
      const res = editingAreaId
        ? await areaAPI.update(editingAreaId, payload)
        : await areaAPI.create(payload);
      if (!res.success) {
        alert(res.error || "No se pudo guardar el área");
        return;
      }
      await cargarAreas();
      setAreaForm({ nombre_area: "", codigo: "", descripcion: "" });
      setEditingAreaId(null);
    } catch (err) {
      alert(err.message || "Error al guardar el área");
    }
  };

  const openPermisosModal = async (rol, idArea = "") => {
    setRolPermisos(rol);
    setAreaPermisosId(idArea ? String(idArea) : "");
    setPermisosModalOpen(true);
    setLoadingPermisos(true);
    const inicial = {};
    Object.keys(ESTRUCTURA_MENU).forEach((key) => {
      inicial[key] = [];
    });
    try {
      const res = await permisosAPI.getPermisosByRol(rol.id_rol, idArea || null);
      if (res.success && Array.isArray(res.data)) {
        res.data.forEach((p) => {
          const menuKey = Object.keys(ESTRUCTURA_MENU).find(
            (k) => ESTRUCTURA_MENU[k].menu_item_id === p.menu_item_id
          );
          if (menuKey) {
            const acciones = parseAcciones(p.acciones);
            const disponibles = ESTRUCTURA_MENU[menuKey].acciones_disponibles;
            inicial[menuKey] = acciones.includes("*")
              ? [...disponibles]
              : acciones.filter((a) => disponibles.includes(a));
          }
        });
      }
      setPermisosSeleccionados(inicial);
    } catch (err) {
      console.error("Error cargando permisos del rol:", err);
      setPermisosSeleccionados(inicial);
      alert("No se pudieron cargar los permisos del rol");
    } finally {
      setLoadingPermisos(false);
    }
  };

  const toggleAccionRol = (menuKey, accion) => {
    setPermisosSeleccionados((prev) => {
      const actuales = prev[menuKey] || [];
      const next = actuales.includes(accion)
        ? actuales.filter((a) => a !== accion)
        : [...actuales, accion];
      return { ...prev, [menuKey]: next };
    });
  };

  const handleGuardarPermisosRol = async () => {
    if (!rolPermisos) return;
    setSavingPermisos(true);
    try {
      const permisos = Object.keys(ESTRUCTURA_MENU)
        .map((key) => {
          const acciones = permisosSeleccionados[key] || [];
          if (acciones.length === 0) return null;
          return {
            menu_item_id: ESTRUCTURA_MENU[key].menu_item_id,
            acciones: JSON.stringify(acciones),
          };
        })
        .filter(Boolean);

      const res = await permisosAPI.asignarPermisosRol(
        rolPermisos.id_rol,
        permisos,
        areaPermisosId || null
      );
      if (!res.success) {
        alert(res.error || "No se pudieron guardar los permisos");
        return;
      }
      setPermisosModalOpen(false);
      setRolPermisos(null);
      setNotifications([
        {
          id: Date.now(),
          text: `Permisos actualizados para "${rolPermisos.nombre_rol}"${
            areaPermisosId
              ? ` / ${areas.find((a) => String(a.id_area) === String(areaPermisosId))?.nombre_area || ""}`
              : ""
          }`,
          time: "ahora",
          read: false,
        },
        ...notifications,
      ]);
    } catch (err) {
      alert(err.message || "Error al guardar permisos");
    } finally {
      setSavingPermisos(false);
    }
  };

  const handleLogout = () => {
    usuarioAPI.logout();
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  // Filtrar roles por búsqueda
  const filteredRoles = roles.filter(rol => 
    searchTerm === '' || 
    rol.nombre_rol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rol.descripcion && rol.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
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

        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            {/* Título de la sección */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Roles, áreas y permisos
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  El rol es el cargo (Director, Secretaria, Presidente). El área es la unidad (Cobranzas, Administración, Presidencia).
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVista("roles")}
                    className={`px-3 py-1.5 rounded-md text-sm ${vista === "roles" ? "bg-[#2A9D8F] text-white" : darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}`}
                  >
                    Roles
                  </button>
                  <button
                    type="button"
                    onClick={() => setVista("areas")}
                    className={`px-3 py-1.5 rounded-md text-sm ${vista === "areas" ? "bg-[#2A9D8F] text-white" : darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}`}
                  >
                    Áreas
                  </button>
                </div>
              </div>
              <ExportButtons
                data={roles}
                columns={[
                  { key: "id_rol", label: "ID" },
                  { key: "nombre_rol", label: "Nombre" },
                  { key: "created_at", label: "Creado" },
                ]}
                title="Roles"
                fileName="roles"
                moduloApi="roles"
                darkMode={darkMode}
              />
            </div>

            {/* Estadísticas simples */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Roles</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {roles.length}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Última actualización</p>
                <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {roles.length > 0 ? formatDate(roles[0].updated_at || roles[0].created_at) : 'Sin datos'}
                </p>
              </div>
            </div>

            {vista === "roles" && (
            <>
            {/* Formulario */}
            <div className={`rounded-lg shadow-md p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                {editingId ? "Editar Rol" : "Nuevo Rol"}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre del Rol */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Nombre del Rol *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre_rol}
                      onChange={(e) => setFormData({...formData, nombre_rol: e.target.value})}
                      className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                      placeholder="Ej: Administrador, Usuario, Analista"
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={formData.descripcion || ""}
                      onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                      className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                      placeholder="Descripción del rol (opcional)"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <label className={`inline-flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={!!formData.requiere_area}
                      onChange={(e) => setFormData({ ...formData, requiere_area: e.target.checked })}
                    />
                    Requiere área
                  </label>
                  <label className={`inline-flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={!!formData.unico}
                      onChange={(e) => setFormData({ ...formData, unico: e.target.checked })}
                    />
                    Rol único (un solo usuario activo)
                  </label>
                </div>

                {/* Botones del formulario */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {editingId ? (
                      <>
                        <Save size={18} />
                        Actualizar
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Agregar
                      </>
                    )}
                  </button>
                  
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                        darkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <X size={18} />
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Barra de búsqueda */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full sm:w-96 pl-10 pr-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-200 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>

            {/* Tabla de Roles */}
            <div className={`rounded-lg shadow-md overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="overflow-x-auto table-scroll">
                <table className="w-full">
                  <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        Descripción
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        Fecha Creación
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Cargando...
                          </div>
                        </td>
                      </tr>
                    ) : filteredRoles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {searchTerm ? 'No se encontraron resultados' : 'No hay roles registrados'}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRoles.map((rol) => (
                        <tr key={rol.id_rol} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            #{rol.id_rol}
                          </td>
                          <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span className={`px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`}>
                              {rol.nombre_rol}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {rol.descripcion || 'Sin descripción'}
                            <div className="text-xs text-gray-500 mt-1">
                              {rol.requiere_area ? 'Requiere área' : 'Sin área'}
                              {rol.unico ? ' · Único' : ''}
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-sm text-center ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {formatDate(rol.created_at)}
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openPermisosModal(rol)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  darkMode 
                                    ? 'text-purple-300 bg-purple-900/40 hover:bg-purple-900/70' 
                                    : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                                }`}
                                title="Permisos"
                              >
                                <Shield size={14} />
                                Permisos
                              </button>
                              <button
                                onClick={() => handleEdit(rol)}
                                className={`p-1 rounded transition-colors ${
                                  darkMode 
                                    ? 'text-blue-400 hover:bg-gray-600' 
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                title="Editar"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(rol.id_rol, rol.nombre_rol)}
                                className={`p-1 rounded transition-colors ${
                                  darkMode 
                                    ? 'text-red-400 hover:bg-gray-600' 
                                    : 'text-red-600 hover:bg-red-50'
                                }`}
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            )}

            {vista === "areas" && (
              <>
                <div className={`rounded-lg shadow-md p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    {editingAreaId ? "Editar área" : "Nueva área"}
                  </h2>
                  <form onSubmit={handleSubmitArea} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      required
                      placeholder="Nombre (ej. Cobranzas)"
                      value={areaForm.nombre_area}
                      onChange={(e) => setAreaForm({ ...areaForm, nombre_area: e.target.value })}
                      className={`px-3 py-2 rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <input
                      placeholder="Código (ej. cobranzas)"
                      value={areaForm.codigo}
                      onChange={(e) => setAreaForm({ ...areaForm, codigo: e.target.value })}
                      className={`px-3 py-2 rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <input
                      placeholder="Descripción"
                      value={areaForm.descripcion}
                      onChange={(e) => setAreaForm({ ...areaForm, descripcion: e.target.value })}
                      className={`px-3 py-2 rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <div className="md:col-span-3 flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-[#2A9D8F] text-white rounded-md">
                        {editingAreaId ? "Actualizar" : "Agregar"}
                      </button>
                      {editingAreaId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAreaId(null);
                            setAreaForm({ nombre_area: "", codigo: "", descripcion: "" });
                          }}
                          className="px-4 py-2 rounded-md border"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>
                <div className={`rounded-lg shadow-md overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs uppercase">Área</th>
                        <th className="px-4 py-3 text-left text-xs uppercase">Código</th>
                        <th className="px-4 py-3 text-left text-xs uppercase">Descripción</th>
                        <th className="px-4 py-3 text-center text-xs uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {areas.map((a) => (
                        <tr key={a.id_area} className={darkMode ? 'border-t border-gray-700' : 'border-t'}>
                          <td className={`px-4 py-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{a.nombre_area}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{a.codigo}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{a.descripcion || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              className="text-[#2A9D8F] text-sm"
                              onClick={() => {
                                setEditingAreaId(a.id_area);
                                setAreaForm({
                                  nombre_area: a.nombre_area,
                                  codigo: a.codigo || "",
                                  descripcion: a.descripcion || "",
                                });
                              }}
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <Footer darkMode={darkMode} />
        </main>
      </div>

      {/* Modal permisos por rol */}
      {permisosModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
            <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Permisos del rol
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {rolPermisos?.nombre_rol}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setPermisosModalOpen(false); setRolPermisos(null); }}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {rolRequiereArea(rolPermisos) && (
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Área para estos permisos
                  </label>
                  <select
                    value={areaPermisosId}
                    onChange={(e) => openPermisosModal(rolPermisos, e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">General (todas las áreas)</option>
                    {areas.map((a) => (
                      <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Ejemplo: Director + Cobranzas ve cuotas y contratos. Secretaria + Presidencia ve aprobaciones.
                  </p>
                </div>
              )}
              {loadingPermisos ? (
                <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} /> Cargando permisos...
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(ESTRUCTURA_MENU).map(([key, modulo]) => (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-100 bg-gray-50'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {modulo.nombre}
                          </p>
                          <p className="text-xs text-gray-500">{modulo.menu_item_id} · {modulo.seccion}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {modulo.acciones_disponibles.map((accion) => (
                            <label
                              key={accion}
                              className={`inline-flex items-center gap-1.5 text-sm capitalize cursor-pointer ${
                                darkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={(permisosSeleccionados[key] || []).includes(accion)}
                                onChange={() => toggleAccionRol(key, accion)}
                                className="rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
                              />
                              {accion}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`p-4 border-t flex justify-end gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => { setPermisosModalOpen(false); setRolPermisos(null); }}
                className={`px-4 py-2 rounded-lg border ${
                  darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarPermisosRol}
                disabled={savingPermisos || loadingPermisos}
                className="px-4 py-2 rounded-lg bg-[#2A9D8F] text-white hover:bg-[#264653] disabled:opacity-50 inline-flex items-center gap-2"
              >
                {savingPermisos && <Loader2 size={16} className="animate-spin" />}
                Guardar permisos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;