import React, { useState, useEffect } from 'react';
import { useSidebarState } from '../hooks/useAppShell';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Download,
  RefreshCw,
  HardDrive,
  Table2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  CalendarClock
} from 'lucide-react';
import Swal from 'sweetalert2';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import ExportButtons from '../components/ExportButtons';
import respaldoAPI from '../services/api_respaldo';
import usuarioAPI from '../services/api_usuario';

const COLUMNAS_HISTORIAL = [
  { key: 'id_respaldo', label: 'ID' },
  { key: 'created_at', label: 'Fecha' },
  { key: 'usuario_nombre', label: 'Usuario' },
  { key: 'nombre_archivo', label: 'Archivo' },
  { key: 'origen_fmt', label: 'Origen' },
  { key: 'tamanio_fmt', label: 'Tamaño' },
  { key: 'estado', label: 'Estado' },
  { key: 'observaciones', label: 'Observaciones' }
];

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const esAutomatico = (h) =>
  String(h?.origen || h?.tipo || '').toLowerCase() === 'automatico';

const Respaldo = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications] = useState([]);

  const [historial, setHistorial] = useState([]);
  const [tablas, setTablas] = useState([]);
  const [programacion, setProgramacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [descargandoId, setDescargandoId] = useState(null);

  const user = usuarioAPI.getCurrentUser() || {};

  const handleLogout = () => {
    usuarioAPI.logout();
    navigate('/Cierre_sesion');
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [histRes, tabRes, progRes] = await Promise.all([
        respaldoAPI.getHistorial(50),
        respaldoAPI.getTablas(),
        respaldoAPI.getProgramacion()
      ]);
      if (histRes.success) setHistorial(histRes.data || []);
      if (tabRes.success) setTablas(tabRes.data || []);
      if (progRes.success) setProgramacion(progRes.data || null);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar el módulo de respaldo. ¿Ejecutaste el script SQL de migración?',
        confirmButtonColor: '#2A9D8F'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleGenerar = async () => {
    const confirm = await Swal.fire({
      title: 'Generar respaldo manual',
      text: 'Se descargará un archivo SQL y se guardará una copia en el servidor.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2A9D8F',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Generar y descargar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    setGenerando(true);
    try {
      const result = await respaldoAPI.generar();
      await Swal.fire({
        icon: 'success',
        title: 'Respaldo generado',
        html: `
          <p>Archivo: <b>${result.fileName}</b></p>
          <p class="text-sm text-gray-500">Método: ${result.metodo || 'manual'}</p>
        `,
        confirmButtonColor: '#2A9D8F'
      });
      cargarDatos();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.error || error.message || 'No se pudo generar el respaldo',
        confirmButtonColor: '#2A9D8F'
      });
    } finally {
      setGenerando(false);
    }
  };

  const handleDescargar = async (item) => {
    setDescargandoId(item.id_respaldo);
    try {
      await respaldoAPI.descargar(item.id_respaldo, item.nombre_archivo);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'No disponible',
        text:
          error.response?.data?.error ||
          'El archivo ya no está en el servidor. Genere un nuevo respaldo.',
        confirmButtonColor: '#2A9D8F'
      });
    } finally {
      setDescargandoId(null);
    }
  };

  const historialExport = historial.map(h => ({
    ...h,
    created_at: h.created_at ? new Date(h.created_at).toLocaleString('es-VE') : '',
    origen_fmt: esAutomatico(h) ? 'Automático' : 'Manual',
    tamanio_fmt: formatBytes(h.tamanio_bytes)
  }));

  const intervaloDias = programacion?.intervalo_dias || 15;
  const proximoTxt = programacion?.proximo_automatico
    ? new Date(programacion.proximo_automatico).toLocaleString('es-VE')
    : 'Pendiente';
  const ultimoAutoTxt = programacion?.ultimo_automatico?.created_at
    ? new Date(programacion.ultimo_automatico.created_at).toLocaleString('es-VE')
    : 'Aún no hay respaldos automáticos';

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
        unreadCount={0}
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
                  Respaldo de Base de Datos
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Exportación manual y respaldos automáticos cada {intervaloDias} días
                </p>
              </div>
              <ExportButtons
                data={historialExport}
                columns={COLUMNAS_HISTORIAL}
                title="Historial de Respaldos"
                fileName="historial_respaldos"
                darkMode={darkMode}
              />
            </div>

            {/* Programación automática */}
            <div className={`p-5 rounded-xl shadow mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className={`p-3 rounded-full shrink-0 ${darkMode ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
                  <CalendarClock size={28} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Respaldo automático cada {intervaloDias} días
                  </h2>
                  <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    El servidor genera y guarda una copia SQL en disco sin intervención.
                    Los archivos quedan en el historial para descargarlos cuando lo necesites.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>Último automático:</span>
                      <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{ultimoAutoTxt}</p>
                    </div>
                    <div>
                      <span className={darkMode ? 'text-gray-500' : 'text-gray-500'}>Próximo estimado:</span>
                      <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{proximoTxt}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exportación manual */}
            <div className={`p-6 rounded-xl shadow mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className={`p-4 rounded-full ${darkMode ? 'bg-teal-900/40' : 'bg-teal-50'}`}>
                  <Database size={48} className="text-[#2A9D8F]" />
                </div>
                <div className="flex-1">
                  <h2 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Exportación manual
                  </h2>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Descarga ahora un archivo <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">.sql</code> completo
                    y deja una copia guardada en el servidor.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleGenerar}
                      disabled={generando}
                      className="px-5 py-2.5 bg-[#2A9D8F] hover:bg-[#238b7e] text-white rounded-lg flex items-center gap-2 disabled:opacity-60"
                    >
                      {generando ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          Generar y descargar respaldo
                        </>
                      )}
                    </button>
                    <button
                      onClick={cargarDatos}
                      className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm ${
                        darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <RefreshCw size={16} />
                      Actualizar
                    </button>
                  </div>
                </div>
              </div>

              <div className={`mt-6 p-3 rounded-lg flex items-start gap-2 text-sm ${
                darkMode ? 'bg-amber-900/30 text-amber-200' : 'bg-amber-50 text-amber-800'
              }`}>
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <p>
                  El respaldo contiene datos sensibles. No lo compartas por canales inseguros.
                  Para restaurar, usa <code>psql</code> o pgAdmin con el archivo SQL.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <HardDrive className="text-[#2A9D8F]" size={24} />
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Respaldos</span>
                </div>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{historial.length}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>En historial</p>
              </div>
              <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Table2 className="text-blue-500" size={24} />
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Tablas</span>
                </div>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{tablas.length}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>En la base de datos</p>
              </div>
              <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="text-green-500" size={24} />
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Último</span>
                </div>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {historial[0]
                    ? new Date(historial[0].created_at).toLocaleString('es-VE')
                    : 'Sin respaldos aún'}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {historial[0]?.nombre_archivo || '—'}
                </p>
              </div>
            </div>

            {/* Tablas incluidas */}
            {tablas.length > 0 && (
              <div className={`p-4 rounded-xl shadow mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Tablas incluidas en el respaldo
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tablas.map(t => (
                    <span
                      key={t}
                      className={`px-2.5 py-1 rounded text-xs ${
                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Historial */}
            <div className={`rounded-xl shadow overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Historial de respaldos
                </h3>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-500">Cargando...</div>
              ) : historial.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Aún no se han generado respaldos</div>
              ) : (
                <div className="overflow-x-auto table-scroll">
                  <table className="w-full text-sm">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Usuario</th>
                        <th className="px-4 py-3 text-left">Origen</th>
                        <th className="px-4 py-3 text-left">Archivo</th>
                        <th className="px-4 py-3 text-left">Tamaño</th>
                        <th className="px-4 py-3 text-left">Estado</th>
                        <th className="px-4 py-3 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {historial.map(h => (
                        <tr key={h.id_respaldo}>
                          <td className={`px-4 py-3 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {new Date(h.created_at).toLocaleString('es-VE')}
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {h.usuario_nombre || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                esAutomatico(h)
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-teal-100 text-teal-700'
                              }`}
                            >
                              {esAutomatico(h) ? 'Automático' : 'Manual'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 font-mono text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {h.nombre_archivo}
                          </td>
                          <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {formatBytes(h.tamanio_bytes)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                h.estado === 'fallido'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {h.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {h.estado === 'completado' && (
                              <button
                                type="button"
                                onClick={() => handleDescargar(h)}
                                disabled={descargandoId === h.id_respaldo}
                                className="inline-flex items-center gap-1 text-xs text-[#2A9D8F] hover:underline disabled:opacity-50"
                              >
                                {descargandoId === h.id_respaldo ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Download size={14} />
                                )}
                                Descargar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

export default Respaldo;
