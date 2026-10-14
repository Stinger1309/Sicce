import React, { useState, useEffect, useCallback } from 'react';
import { useSidebarState } from '../hooks/useAppShell';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Eye,
  Activity,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import Swal from 'sweetalert2';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import ExportButtons from '../components/ExportButtons';
import auditoriaAPI from '../services/api_auditoria';
import usuarioAPI from '../services/api_usuario';

const COLUMNAS = [
  { key: 'id_auditoria', label: 'ID' },
  { key: 'created_at', label: 'Fecha' },
  { key: 'nombre_usuario', label: 'Usuario' },
  { key: 'modulo', label: 'Módulo' },
  { key: 'accion', label: 'Acción' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'ip_address', label: 'IP' }
];

const ROWS_PER_PAGE = 10;

const Auditoria = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications] = useState([]);

  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [filtros, setFiltros] = useState({
    modulo: '',
    accion: '',
    busqueda: '',
    desde: '',
    hasta: ''
  });

  const user = usuarioAPI.getCurrentUser() || {};
  const unreadCount = 0;

  const handleLogout = () => {
    usuarioAPI.logout();
    navigate('/Cierre_sesion');
  };

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 500,
        offset: 0,
        ...(filtros.modulo && { modulo: filtros.modulo }),
        ...(filtros.accion && { accion: filtros.accion }),
        ...(filtros.busqueda && { busqueda: filtros.busqueda }),
        ...(filtros.desde && { desde: filtros.desde }),
        ...(filtros.hasta && { hasta: filtros.hasta + 'T23:59:59' })
      };

      const [listRes, statsRes, filtrosRes] = await Promise.all([
        auditoriaAPI.getAll(params),
        auditoriaAPI.getEstadisticas(),
        auditoriaAPI.getFiltros()
      ]);

      if (listRes.success) {
        setRegistros(listRes.data || []);
        setTotal(listRes.total || 0);
        setCurrentPage(1);
      }
      if (statsRes.success) setStats(statsRes.data);
      if (filtrosRes.success) {
        setModulos(filtrosRes.data.modulos || []);
        setAcciones(filtrosRes.data.acciones || []);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar la auditoría. ¿Ejecutaste el script SQL de migración?',
        confirmButtonColor: '#2A9D8F'
      });
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Volver a página 1 al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filtros.modulo, filtros.accion, filtros.busqueda, filtros.desde, filtros.hasta]);

  const totalPages = Math.max(1, Math.ceil(registros.length / ROWS_PER_PAGE));
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const paginatedRegistros = registros.slice(startIndex, startIndex + ROWS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleLimpiar = async () => {
    const result = await Swal.fire({
      title: 'Limpiar auditoría',
      html: 'Eliminar registros anteriores a <b>90 días</b>?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await auditoriaAPI.limpiar(90);
      Swal.fire({
        icon: 'success',
        title: 'Listo',
        text: res.message || `Eliminados: ${res.data?.eliminados || 0}`,
        confirmButtonColor: '#2A9D8F'
      });
      cargarDatos();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.error || error.message,
        confirmButtonColor: '#2A9D8F'
      });
    }
  };

  const formatFecha = (f) => {
    if (!f) return '—';
    return new Date(f).toLocaleString('es-VE');
  };

  const datosExport = registros.map(r => ({
    ...r,
    created_at: formatFecha(r.created_at),
    nombre_usuario: r.nombre_usuario || r.usuario_nombre || '—'
  }));

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
        user={{
          name: user.nombre_completo || user.name || 'Usuario',
          email: user.correo || user.email || '',
          role: user.nombre_rol || 'Usuario',
          avatar: null
        }}
        handleLogout={handleLogout}
        unreadCount={unreadCount}
        markAsRead={() => {}}
      />

      <div className="flex flex-1">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
        />

        <main className={`flex-1 transition-all duration-200 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Auditoría del Sistema
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Registro de acciones realizadas por los usuarios
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ExportButtons
                  data={datosExport}
                  columns={COLUMNAS}
                  title="Auditoría del Sistema"
                  fileName="auditoria"
                  moduloApi="auditoria"
                  darkMode={darkMode}
                />
                <button
                  onClick={cargarDatos}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
                    darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white border text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw size={16} />
                  Actualizar
                </button>
                <button
                  onClick={handleLimpiar}
                  className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm bg-red-600 text-white hover:bg-red-700"
                >
                  <Trash2 size={16} />
                  Limpiar
                </button>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <Activity className="text-[#2A9D8F]" size={28} />
                    <div>
                      <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stats.total}</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total registros</p>
                    </div>
                  </div>
                </div>
                <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <Calendar className="text-blue-500" size={28} />
                    <div>
                      <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stats.hoy}</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hoy</p>
                    </div>
                  </div>
                </div>
                <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <Filter className="text-amber-500" size={28} />
                    <div>
                      <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{total}</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Filtrados</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros */}
            <div className={`p-4 rounded-xl shadow mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="relative md:col-span-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
                    className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
                    }`}
                  />
                </div>
                <select
                  value={filtros.modulo}
                  onChange={(e) => setFiltros(f => ({ ...f, modulo: e.target.value }))}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
                  }`}
                >
                  <option value="">Todos los módulos</option>
                  {modulos.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={filtros.accion}
                  onChange={(e) => setFiltros(f => ({ ...f, accion: e.target.value }))}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
                  }`}
                >
                  <option value="">Todas las acciones</option>
                  {acciones.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filtros.desde}
                    onChange={(e) => setFiltros(f => ({ ...f, desde: e.target.value }))}
                    className={`flex-1 px-2 py-2 rounded-lg border text-sm ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
                    }`}
                  />
                  <input
                    type="date"
                    value={filtros.hasta}
                    onChange={(e) => setFiltros(f => ({ ...f, hasta: e.target.value }))}
                    className={`flex-1 px-2 py-2 rounded-lg border text-sm ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className={`rounded-xl shadow overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {loading ? (
                <div className="p-12 text-center text-gray-500">Cargando...</div>
              ) : registros.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No hay registros de auditoría</div>
              ) : (
                <div className="overflow-x-auto table-scroll">
                  <table className="w-full text-sm">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Fecha</th>
                        <th className="px-4 py-3 text-left font-medium">Usuario</th>
                        <th className="px-4 py-3 text-left font-medium">Módulo</th>
                        <th className="px-4 py-3 text-left font-medium">Acción</th>
                        <th className="px-4 py-3 text-left font-medium">Descripción</th>
                        <th className="px-4 py-3 text-left font-medium">IP</th>
                        <th className="px-4 py-3 text-center font-medium">Ver</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {paginatedRegistros.map((r) => (
                        <tr key={r.id_auditoria} className={darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                          <td className={`px-4 py-3 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {formatFecha(r.created_at)}
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {r.nombre_usuario || r.usuario_nombre || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-xs bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                              {r.modulo}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              r.accion === 'eliminar' ? 'bg-red-100 text-red-700' :
                              r.accion === 'crear' ? 'bg-green-100 text-green-700' :
                              r.accion === 'exportar' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {r.accion}
                            </span>
                          </td>
                          <td className={`px-4 py-3 max-w-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {r.descripcion || '—'}
                          </td>
                          <td className={`px-4 py-3 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {r.ip_address || '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setDetalle(r)}
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-[#2A9D8F]"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Paginación: 10 registros por página */}
              {!loading && registros.length > 0 && (
                <div className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                    {startIndex + 1}–{Math.min(startIndex + ROWS_PER_PAGE, registros.length)} de {registros.length}
                    {total > registros.length ? ` (total filtrable: ${total})` : ''}
                  </span>
                  <div className="flex items-center gap-1 justify-center">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1 disabled:opacity-50"
                      title="Primera página"
                    >
                      <ChevronsLeft size={18} />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 disabled:opacity-50"
                      title="Anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className={`px-3 py-1 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 disabled:opacity-50"
                      title="Siguiente"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1 disabled:opacity-50"
                      title="Última página"
                    >
                      <ChevronsRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <Footer darkMode={darkMode} />
        </main>
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-lg rounded-xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Detalle #{detalle.id_auditoria}
              </h3>
              <button onClick={() => setDetalle(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className={`p-4 space-y-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <p><strong>Fecha:</strong> {formatFecha(detalle.created_at)}</p>
              <p><strong>Usuario:</strong> {detalle.nombre_usuario || detalle.usuario_nombre || '—'}</p>
              <p><strong>Módulo:</strong> {detalle.modulo}</p>
              <p><strong>Acción:</strong> {detalle.accion}</p>
              <p><strong>Descripción:</strong> {detalle.descripcion || '—'}</p>
              <p><strong>Tabla:</strong> {detalle.tabla_afectada || '—'}</p>
              <p><strong>ID registro:</strong> {detalle.registro_id || '—'}</p>
              <p><strong>IP:</strong> {detalle.ip_address || '—'}</p>
              {detalle.datos_nuevos && (
                <div>
                  <strong>Datos nuevos:</strong>
                  <pre className={`mt-1 p-2 rounded text-xs overflow-auto max-h-40 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    {typeof detalle.datos_nuevos === 'string'
                      ? detalle.datos_nuevos
                      : JSON.stringify(detalle.datos_nuevos, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auditoria;
