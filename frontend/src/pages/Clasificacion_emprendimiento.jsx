// pages/ClasificacionEmprendimiento.jsx
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
  Search
} from "lucide-react";

// Mantenemos los componentes personalizados
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";
import clasidEmprendAPI from "../services/api_clasificacion_emprendimiento";

const ClasificacionEmprendimiento = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("clasificacion");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Estados para la gestión de clasificaciones
  const [clasificaciones, setClasificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    sector: "Industria",
    actividad: "",
    n_ins_asig: 1
  });

  // Opciones de sector
  const sectorOptions = ["Industria", "Comercio", "Agricultura"];

  // Datos del usuario y notificaciones
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Nueva clasificación agregada", time: "5 min", read: false },
    { id: 2, text: "Clasificación actualizada correctamente", time: "1 hora", read: false },
  ]);

  const user = {
    name: "Analista IADEY",
    email: "analista@iadey.gob.ve",
    role: "Analista de Clasificación",
    avatar: null,
    department: "Dirección de Fomento"
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarClasificaciones();
  }, []);

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

  // Función para cargar clasificaciones desde la API
  const cargarClasificaciones = async () => {
    setLoading(true);
    try {
      const response = await clasidEmprendAPI.getAll();
      if (response.success) {
        setClasificaciones(response.data);
      } else {
        console.error('Error al cargar clasificaciones:', response.error);
        // Mantener datos de ejemplo en caso de error
        setClasificaciones([]);
      }
    } catch (error) {
      console.error('Error en cargarClasificaciones:', error);
      setClasificaciones([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para crear o actualizar clasificación
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        // Actualizar existente
        const response = await clasidEmprendAPI.update(editingId, formData);
        if (response.success) {
          await cargarClasificaciones(); // Recargar la lista
          setNotifications([{
            id: Date.now(),
            text: `Clasificación "${formData.sector}" actualizada`,
            time: "ahora",
            read: false
          }, ...notifications]);
        } else {
          console.error('Error al actualizar:', response.error);
          alert('Error al actualizar la clasificación');
        }
      } else {
        // Crear nueva
        const response = await clasidEmprendAPI.create(formData);
        if (response.success) {
          await cargarClasificaciones(); // Recargar la lista
          setNotifications([{
            id: Date.now(),
            text: `Nueva clasificación "${formData.sector}" creada`,
            time: "ahora",
            read: false
          }, ...notifications]);
        } else {
          console.error('Error al crear:', response.error);
          alert('Error al crear la clasificación');
        }
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      alert(error.error || 'Error al procesar la solicitud');
    } finally {
      // Limpiar formulario
      setFormData({ sector: "Industria", actividad: "", n_ins_asig: 1 });
      setEditingId(null);
    }
  };

  // Función para editar una clasificación
  const handleEdit = (clasificacion) => {
    setEditingId(clasificacion.id_clasificacion);
    setFormData({
      sector: clasificacion.sector,
      actividad: clasificacion.actividad,
      n_ins_asig: clasificacion.n_ins_asig
    });
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Función para eliminar una clasificación (borrado lógico)
  const handleDelete = async (id, sector) => {
    if (!window.confirm(`¿Desactivar la clasificación "${sector}"?\n\nNo se borrará de la base de datos; solo dejará de mostrarse.`)) {
      return;
    }
    try {
      const response = await clasidEmprendAPI.delete(id);
      if (response.success) {
        await cargarClasificaciones();
        setNotifications([{
          id: Date.now(),
          text: `Clasificación "${sector}" desactivada`,
          time: "ahora",
          read: false
        }, ...notifications]);
      } else {
        alert(response.error || 'No se pudo desactivar la clasificación');
      }
    } catch (error) {
      console.error('Error al desactivar clasificación:', error);
      alert(error.error || error.message || 'Error al desactivar la clasificación');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ sector: "Industria", actividad: "", n_ins_asig: 1 });
  };

  const handleLogout = () => {
    usuarioAPI.logout();
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  // Filtrar clasificaciones por búsqueda
  const filteredClasificaciones = clasificaciones.filter(c => 
    searchTerm === '' || 
    c.sector.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.actividad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
                  Clasificación de Emprendimientos
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Gestión de sectores y actividades para clasificación empresarial
                </p>
              </div>
              <ExportButtons
                data={clasificaciones}
                columns={[
                  { key: "id_clasificacion", label: "ID" },
                  { key: "sector", label: "Sector" },
                  { key: "actividad", label: "Actividad" },
                  { key: "n_ins_asig", label: "N° Inspecciones" },
                  { key: "created_at", label: "Creado" },
                ]}
                title="Emprendimientos"
                fileName="emprendimientos"
                moduloApi="emprendimientos"
                darkMode={darkMode}
              />
            </div>

            {/* Estadísticas simples */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Clasificaciones</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {clasificaciones.length}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>1 Inspección</p>
                <p className={`text-2xl font-bold text-yellow-600`}>
                  {clasificaciones.filter(c => c.n_ins_asig === 1).length}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>2 Inspecciones</p>
                <p className={`text-2xl font-bold text-green-600`}>
                  {clasificaciones.filter(c => c.n_ins_asig === 2).length}
                </p>
              </div>
            </div>

            {/* Formulario */}
            <div className={`rounded-lg shadow-md p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                {editingId ? "Editar Clasificación" : "Nueva Clasificación"}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sector - Ahora es un Select */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Sector *
                    </label>
                    <select
                      required
                      value={formData.sector}
                      onChange={(e) => setFormData({...formData, sector: e.target.value})}
                      className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {sectorOptions.map((opcion) => (
                        <option key={opcion} value={opcion}>
                          {opcion}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actividad */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Actividad *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.actividad}
                      onChange={(e) => setFormData({...formData, actividad: e.target.value})}
                      className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                      placeholder="Ej: Desarrollo de Software"
                    />
                  </div>

                  {/* Número de Inspecciones */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      N° Inspeccion Asignada *
                    </label>
                    <select
                      required
                      value={formData.n_ins_asig}
                      onChange={(e) => setFormData({...formData, n_ins_asig: parseInt(e.target.value)})}
                      className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="">Seleccionar</option>
                      <option value={1}>1 - ( Insdustria y Comercio )</option>
                      <option value={2}>2 - ( Agricultura )</option>
                    </select>
                  </div>
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
                  placeholder="Buscar por sector o actividad..."
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

            {/* Tabla de Clasificaciones */}
            <div className={`rounded-lg shadow-md overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="overflow-x-auto table-scroll">
                <table className="w-full">
                  <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        Sector
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        Actividad
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        N° Inspeccion
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        Fecha Registro
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Cargando...
                          </div>
                        </td>
                      </tr>
                    ) : filteredClasificaciones.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {searchTerm ? 'No se encontraron resultados' : 'No hay clasificaciones registradas'}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredClasificaciones.map((clasificacion) => (
                        <tr key={clasificacion.id_clasificacion} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            #{clasificacion.id_clasificacion}
                          </td>
                          <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              clasificacion.sector === "Industria" 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : clasificacion.sector === "Comercio"
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {clasificacion.sector}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {clasificacion.actividad}
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              clasificacion.n_ins_asig === 1 
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                              {clasificacion.n_ins_asig}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-sm text-center ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {formatDate(clasificacion.created_at)}
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(clasificacion)}
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
                                onClick={() => handleDelete(clasificacion.id_clasificacion, clasificacion.sector)}
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
          </div>

          <Footer darkMode={darkMode} />
        </main>
      </div>
    </div>
  );
};

export default ClasificacionEmprendimiento;