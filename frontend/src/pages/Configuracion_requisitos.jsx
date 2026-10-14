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
  FileText
} from "lucide-react";

// Componentes personalizados
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";
import requisitosAPI from "../services/api_requisitos";

const ConfiguracionRequisitos = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("requisitos");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Estados para la gestión de requisitos
  const [requisitos, setRequisitos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    nombre_requisito: ""
  });

  // Datos del usuario y notificaciones
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Bienvenido al módulo de requisitos", time: "ahora", read: false },
  ]);

  const user = {
    name: "Analista IADEY",
    email: "analista@iadey.gob.ve",
    role: "Analista de Requisitos",
    avatar: null,
    department: "Dirección de Fomento"
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarRequisitos();
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

  // Función para cargar requisitos desde la API
  const cargarRequisitos = async () => {
    setLoading(true);
    try {
      const response = await requisitosAPI.getAll();
      if (response.success) {
        setRequisitos(response.data);
      } else {
        console.error('Error al cargar requisitos:', response.error);
        setRequisitos([]);
      }
    } catch (error) {
      console.error('Error en cargarRequisitos:', error);
      setRequisitos([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para crear o actualizar requisito
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre_requisito.trim()) {
      alert('El nombre del requisito es obligatorio');
      return;
    }
    
    try {
      if (editingId) {
        // Actualizar existente
        const response = await requisitosAPI.update(editingId, formData);
        if (response.success) {
          await cargarRequisitos();
          addNotification(`Requisito "${formData.nombre_requisito}" actualizado`);
        } else {
          console.error('Error al actualizar:', response.error);
          alert(response.error || 'Error al actualizar el requisito');
        }
      } else {
        // Crear nuevo
        const response = await requisitosAPI.create(formData);
        if (response.success) {
          await cargarRequisitos();
          addNotification(`Nuevo requisito "${formData.nombre_requisito}" creado`);
        } else {
          console.error('Error al crear:', response.error);
          alert(response.error || 'Error al crear el requisito');
        }
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      alert(error.error || 'Error al procesar la solicitud');
    } finally {
      // Limpiar formulario
      resetForm();
    }
  };

  // Agregar notificación
  const addNotification = (text) => {
    setNotifications(prev => [{
      id: Date.now(),
      text: text,
      time: "ahora",
      read: false
    }, ...prev]);
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({ nombre_requisito: "" });
    setEditingId(null);
  };

  // Función para editar un requisito
  const handleEdit = (requisito) => {
    setEditingId(requisito.id_requisitos);
    setFormData({
      nombre_requisito: requisito.nombre_requisito
    });
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Función para eliminar un requisito (borrado lógico)
  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Desactivar el requisito "${nombre}"?\n\nNo se borrará de la base de datos; solo dejará de mostrarse.`)) {
      return;
    }
    try {
      const response = await requisitosAPI.delete(id);
      if (response.success) {
        await cargarRequisitos();
        addNotification(`Requisito "${nombre}" desactivado`);
      } else {
        alert(response.error || 'No se pudo desactivar el requisito');
      }
    } catch (error) {
      console.error('Error al desactivar requisito:', error);
      alert(error.message || 'Error al desactivar el requisito');
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const handleLogout = () => {
    usuarioAPI.logout();
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  // Filtrar requisitos por búsqueda
  const filteredRequisitos = requisitos.filter(r => 
    searchTerm === '' || 
    r.nombre_requisito.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  Configuración de Requisitos
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Gestión de requisitos para emprendimientos
                </p>
              </div>
              <ExportButtons
                data={requisitos}
                columns={[
                  { key: "id_requisitos", label: "ID" },
                  { key: "nombre_requisito", label: "Requisito" },
                  { key: "created_at", label: "Creado" },
                ]}
                title="Requisitos"
                fileName="requisitos"
                moduloApi="requisitos"
                darkMode={darkMode}
              />
            </div>

            {/* Estadísticas simples */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Requisitos</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {requisitos.length}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Activos</p>
                <p className={`text-2xl font-bold text-green-600`}>
                  {requisitos.length}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Última actualización</p>
                <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Formulario */}
            <div className={`rounded-lg shadow-md p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                {editingId ? "Editar Requisito" : "Nuevo Requisito"}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nombre del Requisito *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre_requisito}
                    onChange={(e) => setFormData({...formData, nombre_requisito: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                    placeholder="Ej: Registro Único de Información Fiscal (RIF)"
                  />
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Ingrese el nombre completo del requisito necesario para emprendimientos
                  </p>
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
                        Agregar Requisito
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
                  placeholder="Buscar requisito..."
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

            {/* Tabla de Requisitos */}
            <div className={`rounded-lg shadow-md overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="overflow-x-auto table-scroll">
                <table className="w-full">
                  <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                        Nombre del Requisito
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
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                            <p className="mt-2">Cargando requisitos...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredRequisitos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
                            {searchTerm ? 'No se encontraron resultados' : 'No hay requisitos registrados'}
                            {!searchTerm && (
                              <div className="mt-3">
                                <button
                                  onClick={() => document.querySelector('form button[type="submit"]').focus()}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                  + Agregar el primer requisito
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRequisitos.map((requisito) => (
                        <tr key={requisito.id_requisitos} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                          <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            #{requisito.id_requisitos}
                          </td>
                          <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-blue-500" />
                              {requisito.nombre_requisito}
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-sm text-center ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {requisito.created_at 
                              ? new Date(requisito.created_at).toLocaleDateString('es-ES')
                              : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(requisito)}
                                className={`p-1 rounded transition-colors ${
                                  darkMode 
                                    ? 'text-blue-400 hover:bg-gray-600' 
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                title="Editar requisito"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(requisito.id_requisitos, requisito.nombre_requisito)}
                                className={`p-1 rounded transition-colors ${
                                  darkMode 
                                    ? 'text-red-400 hover:bg-gray-600' 
                                    : 'text-red-600 hover:bg-red-50'
                                }`}
                                title="Eliminar requisito"
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
              
              {/* Footer de la tabla con información */}
              {!loading && filteredRequisitos.length > 0 && (
                <div className={`px-6 py-3 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Mostrando {filteredRequisitos.length} de {requisitos.length} requisitos
                  </p>
                </div>
              )}
            </div>
          </div>

          <Footer darkMode={darkMode} />
        </main>
      </div>
    </div>
  );
};

export default ConfiguracionRequisitos;