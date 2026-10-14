import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSidebarState } from '../hooks/useAppShell';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, RefreshCw, Users, FileCheck, FolderOpen,
  ClipboardCheck, Handshake, FileSignature, Banknote, CreditCard,
  CalendarRange, FileDown, Loader2
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import ExportButtons from '../components/ExportButtons';
import metricasAPI from '../services/api_metricas';
import usuarioAPI from '../services/api_usuario';
import { exportChartsToPDF } from '../utils/exportUtils';
import { puedeVerMetricas, puedeExportar, rutaInicioSesion } from '../utils/roles';
import Swal from 'sweetalert2';

const COLORS = ['#2A9D8F', '#264653', '#E9C46A', '#F4A261', '#E76F51', '#457B9D', '#1D3557', '#A8DADC'];

const defaultDesde = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d.toISOString().slice(0, 10);
};
const defaultHasta = () => new Date().toISOString().slice(0, 10);

const CHART_DEFS = [
  { id: 'solicitudesPorEstatus', title: 'Solicitudes por estatus', type: 'pie' },
  { id: 'expedientesPorEstatus', title: 'Expedientes por estatus', type: 'bar' },
  { id: 'inspeccionesPorEstatus', title: 'Inspecciones por estatus', type: 'bar', color: '#2A9D8F' },
  { id: 'aprobacionesPorEstatus', title: 'Aprobaciones por estatus', type: 'donut' },
  { id: 'solicitudesPorMes', title: 'Solicitudes por mes', type: 'area' },
  { id: 'expedientesPorMes', title: 'Expedientes por mes', type: 'line' },
  { id: 'usuariosPorRol', title: 'Usuarios por rol', type: 'barH' },
  { id: 'sectorEmprendimientos', title: 'Emprendimientos por sector', type: 'bar', color: '#E9C46A' },
  { id: 'cuotasPorEstado', title: 'Cuotas por estado', type: 'pie' },
];

const StatCard = ({ title, value, icon: Icon, darkMode, color = '#2A9D8F' }) => (
  <div className={`p-4 rounded-xl shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
    <div className="flex items-center justify-between mb-2">
      <Icon size={22} style={{ color }} />
      <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{value ?? 0}</span>
    </div>
    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
  </div>
);

const EmptyChart = ({ darkMode }) => (
  <div className={`h-full flex items-center justify-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
    Sin datos para mostrar
  </div>
);

const periodoTexto = (desde, hasta) => {
  if (desde && hasta) return `${desde} → ${hasta}`;
  if (desde) return `Desde ${desde}`;
  if (hasta) return `Hasta ${hasta}`;
  return 'Sin filtro';
};

function ChartBody({ def, series, darkMode, tooltipStyle }) {
  const rows = Array.isArray(series) ? series : [];
  if (!rows.length) return <EmptyChart darkMode={darkMode} />;

  if (def.type === 'pie' || def.type === 'donut') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="valor"
            nameKey="nombre"
            cx="50%"
            cy="50%"
            innerRadius={def.type === 'donut' ? 45 : 0}
            outerRadius={90}
            label={
              def.type === 'pie'
                ? ({ nombre, percent }) => `${nombre} (${(percent * 100).toFixed(0)}%)`
                : undefined
            }
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (def.type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
          <XAxis dataKey="mes" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
          <YAxis tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="valor" stroke="#2A9D8F" fill="#2A9D8F33" name="Valor" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (def.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
          <XAxis dataKey="mes" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
          <YAxis tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="valor" stroke="#264653" strokeWidth={2} name="Valor" />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (def.type === 'barH') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
          <XAxis type="number" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
          <YAxis dataKey="nombre" type="category" width={100} tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="valor" fill="#457B9D" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
        <XAxis dataKey="nombre" tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
        <YAxis tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="valor" fill={def.color || '#264653'} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const ChartPanel = ({
  def,
  darkMode,
  tooltipStyle,
  series,
  desde,
  hasta,
  appliedDesde,
  appliedHasta,
  loading,
  exporting,
  selected,
  onSelect,
  onChangeDesde,
  onChangeHasta,
  onAplicar,
  onExportar,
  mostrarExportar = false,
}) => {
  const inputClass = `px-2 py-1.5 rounded-md border text-xs w-full ${
    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
  }`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect();
      }}
      className={`p-4 rounded-xl shadow transition-all text-left ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } ${
        selected
          ? 'ring-2 ring-[#2A9D8F] ring-offset-2'
          : 'hover:ring-1 hover:ring-[#2A9D8F]/50'
      } ${darkMode ? 'ring-offset-gray-900' : 'ring-offset-gray-50'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {def.title}
          </h3>
          <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Periodo: {periodoTexto(appliedDesde, appliedHasta)}
            {selected ? ' · Seleccionado' : ''}
          </p>
        </div>
        {loading && <Loader2 size={16} className="animate-spin text-[#2A9D8F] shrink-0" />}
      </div>

      <div
        className="h-64 mb-3"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ChartBody def={def} series={series} darkMode={darkMode} tooltipStyle={tooltipStyle} />
      </div>

      <div
        className={`pt-3 border-t space-y-2 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#2A9D8F]">
          <CalendarRange size={14} />
          Parametrizar este gráfico
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => onChangeDesde(e.target.value)}
              className={`mt-0.5 ${inputClass}`}
            />
          </label>
          <label className="block">
            <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => onChangeHasta(e.target.value)}
              className={`mt-0.5 ${inputClass}`}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAplicar}
            disabled={loading}
            className="px-3 py-1.5 rounded-md text-xs bg-[#264653] text-white hover:bg-[#1d3540] disabled:opacity-50"
          >
            Aplicar fechas
          </button>
          {mostrarExportar && (
          <button
            type="button"
            onClick={onExportar}
            disabled={exporting || loading}
            className="px-3 py-1.5 rounded-md text-xs bg-[#2A9D8F] text-white hover:bg-[#238b7e] disabled:opacity-50 inline-flex items-center gap-1"
          >
            <FileDown size={13} />
            {exporting ? 'Exportando…' : 'Exportar PDF'}
          </button>
          )}
        </div>
      </div>
    </div>
  );
};

const buildInitialChartState = () => {
  const d = defaultDesde();
  const h = defaultHasta();
  const state = {};
  CHART_DEFS.forEach((c) => {
    state[c.id] = {
      desde: d,
      hasta: h,
      appliedDesde: d,
      appliedHasta: h,
      series: [],
      loading: false,
      exporting: false,
    };
  });
  return state;
};

const Graficos = () => {
  const navigate = useNavigate();
  const chartRefs = useRef({});
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);
  const [resumen, setResumen] = useState({});
  const [charts, setCharts] = useState(buildInitialChartState);
  const [selectedId, setSelectedId] = useState(CHART_DEFS[0].id);

  const user = usuarioAPI.getCurrentUser() || {};
  const userPuedeExportar = puedeExportar(user);

  const cargarTodos = useCallback(async () => {
    setLoadingAll(true);
    const d = defaultDesde();
    const h = defaultHasta();
    try {
      const res = await metricasAPI.getResumen({ desde: d, hasta: h });
      if (!res.success) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || 'No se pudieron cargar las métricas',
          confirmButtonColor: '#2A9D8F',
        });
        return;
      }
      setResumen(res.data?.resumen || {});
      setCharts((prev) => {
        const next = { ...prev };
        CHART_DEFS.forEach((c) => {
          next[c.id] = {
            ...next[c.id],
            desde: d,
            hasta: h,
            appliedDesde: d,
            appliedHasta: h,
            series: Array.isArray(res.data?.[c.id]) ? res.data[c.id] : [],
            loading: false,
          };
        });
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  useEffect(() => {
    if (!puedeVerMetricas(user)) {
      navigate(rutaInicioSesion(user), { replace: true });
      return;
    }
    cargarTodos();
  }, [cargarTodos, navigate]);

  const updateChartField = (id, patch) => {
    setCharts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const aplicarFechasGrafico = async (id, fechasOverride = null) => {
    let desde;
    let hasta;
    if (fechasOverride) {
      desde = fechasOverride.desde;
      hasta = fechasOverride.hasta;
    } else {
      // Leer siempre el estado más reciente (evita closure obsoleto)
      const latest = await new Promise((resolve) => {
        setCharts((prev) => {
          resolve(prev[id]);
          return prev;
        });
      });
      if (!latest) return;
      desde = latest.desde;
      hasta = latest.hasta;
    }

    if (desde && hasta && desde > hasta) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango inválido',
        text: 'La fecha desde no puede ser mayor que hasta.',
        confirmButtonColor: '#2A9D8F',
      });
      return;
    }

    updateChartField(id, { loading: true, desde, hasta });
    try {
      const res = await metricasAPI.getResumen({
        desde: desde || undefined,
        hasta: hasta || undefined,
      });
      if (!res.success) {
        throw new Error(res.error || 'Error al filtrar');
      }
      if (!res.data?.periodo && (desde || hasta)) {
        throw new Error(
          'El servidor no está aplicando el filtro de fechas. Reinicia el backend (node server.js).'
        );
      }
      const series = Array.isArray(res.data?.[id]) ? res.data[id] : [];
      setCharts((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          desde,
          hasta,
          appliedDesde: desde,
          appliedHasta: hasta,
          series,
          loading: false,
        },
      }));
      const total = series.reduce((s, r) => s + (Number(r.valor) || 0), 0);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: series.length ? 'success' : 'info',
        title: series.length
          ? `Filtro aplicado (${total} registros)`
          : 'Sin datos en ese periodo',
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (e) {
      updateChartField(id, { loading: false });
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e.message || 'No se pudo aplicar el filtro',
        confirmButtonColor: '#2A9D8F',
      });
    }
  };

  const exportarGrafico = async (id) => {
    const def = CHART_DEFS.find((c) => c.id === id);
    const chart = charts[id];
    const el = chartRefs.current[id];
    if (!def || !chart || !el) return;

    setSelectedId(id);
    updateChartField(id, { exporting: true });
    try {
      // Pequeña espera para que el ring de selección se pinte antes del capture
      await new Promise((r) => setTimeout(r, 50));
      await exportChartsToPDF({
        element: el,
        title: def.title,
        fileName: `grafico_${id}`,
        subtitle: `Periodo: ${periodoTexto(chart.appliedDesde, chart.appliedHasta)} — Generado: ${new Date().toLocaleString('es-VE')}`,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e.message || 'No se pudo exportar el PDF',
        confirmButtonColor: '#2A9D8F',
      });
    } finally {
      updateChartField(id, { exporting: false });
    }
  };

  const tooltipStyle = darkMode
    ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }
    : { backgroundColor: '#fff', border: '1px solid #e5e7eb' };

  const r = resumen || {};
  const selected = charts[selectedId];
  const selectedDef = CHART_DEFS.find((c) => c.id === selectedId);

  const exportRows = [
    { metrica: 'Solicitudes', valor: r.solicitudes },
    { metrica: 'Expedientes', valor: r.expedientes },
    { metrica: 'Inspecciones', valor: r.inspecciones },
    { metrica: 'Aprobaciones', valor: r.aprobaciones },
    { metrica: 'Contratos', valor: r.contratos },
    { metrica: 'Desembolsos', valor: r.desembolsos },
    { metrica: 'Cuotas', valor: r.cuotas },
    { metrica: 'Usuarios', valor: r.usuarios },
    { metrica: 'Emprendedores', valor: r.emprendedores },
    { metrica: 'Inspectores', valor: r.inspectores },
  ];

  return (
    <div className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        notifications={[]}
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
        handleLogout={() => { usuarioAPI.logout(); navigate('/Cierre_sesion'); }}
        unreadCount={0}
        markAsRead={() => {}}
      />

      <div className="flex flex-1">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} darkMode={darkMode} />

        <main className={`flex-1 transition-all duration-200 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <BarChart3 className="text-[#2A9D8F]" />
                  Gráficos y Métricas
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Selecciona un gráfico, filtra por fecha y expórtalo a PDF
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ExportButtons
                  data={exportRows}
                  columns={[
                    { key: 'metrica', label: 'Métrica' },
                    { key: 'valor', label: 'Valor' }
                  ]}
                  title="Métricas del Sistema"
                  fileName="metricas_iadey"
                  darkMode={darkMode}
                />
                <button
                  type="button"
                  onClick={cargarTodos}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-white border text-gray-700'
                  }`}
                >
                  <RefreshCw size={16} className={loadingAll ? 'animate-spin' : ''} />
                  Actualizar todo
                </button>
              </div>
            </div>

            {/* Barra del gráfico seleccionado */}
            {selectedDef && selected && (
              <div className={`mb-6 p-4 rounded-xl shadow flex flex-col lg:flex-row lg:items-end gap-3 ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Gráfico seleccionado</p>
                  <p className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedDef.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Periodo aplicado: {periodoTexto(selected.appliedDesde, selected.appliedHasta)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:min-w-[280px]">
                  <label className="block">
                    <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Desde</span>
                    <input
                      type="date"
                      value={selected.desde}
                      onChange={(e) => updateChartField(selectedId, { desde: e.target.value })}
                      className={`mt-0.5 w-full px-2 py-1.5 rounded-md border text-xs ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </label>
                  <label className="block">
                    <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Hasta</span>
                    <input
                      type="date"
                      value={selected.hasta}
                      onChange={(e) => updateChartField(selectedId, { hasta: e.target.value })}
                      className={`mt-0.5 w-full px-2 py-1.5 rounded-md border text-xs ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarFechasGrafico(selectedId)}
                    disabled={selected.loading}
                    className="px-4 py-2 rounded-lg text-sm bg-[#264653] text-white hover:bg-[#1d3540] disabled:opacity-50"
                  >
                    Aplicar
                  </button>
                  {userPuedeExportar && (
                  <button
                    type="button"
                    onClick={() => exportarGrafico(selectedId)}
                    disabled={selected.exporting || selected.loading}
                    className="px-4 py-2 rounded-lg text-sm bg-[#2A9D8F] text-white hover:bg-[#238b7e] disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <FileDown size={15} />
                    {selected.exporting ? 'Exportando…' : 'Exportar PDF'}
                  </button>
                  )}
                </div>
              </div>
            )}

            {loadingAll && !Object.values(charts).some((c) => c.series?.length) ? (
              <div className="p-12 text-center text-gray-500">Cargando métricas...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                  <StatCard title="Solicitudes" value={r.solicitudes} icon={FileCheck} darkMode={darkMode} />
                  <StatCard title="Expedientes" value={r.expedientes} icon={FolderOpen} darkMode={darkMode} color="#264653" />
                  <StatCard title="Inspecciones" value={r.inspecciones} icon={ClipboardCheck} darkMode={darkMode} color="#E9C46A" />
                  <StatCard title="Aprobaciones" value={r.aprobaciones} icon={Handshake} darkMode={darkMode} color="#F4A261" />
                  <StatCard title="Contratos" value={r.contratos} icon={FileSignature} darkMode={darkMode} color="#E76F51" />
                  <StatCard title="Desembolsos" value={r.desembolsos} icon={Banknote} darkMode={darkMode} color="#457B9D" />
                  <StatCard title="Cuotas" value={r.cuotas} icon={CreditCard} darkMode={darkMode} color="#1D3557" />
                  <StatCard title="Usuarios" value={r.usuarios} icon={Users} darkMode={darkMode} color="#A8DADC" />
                  <StatCard title="Emprendedores" value={r.emprendedores} icon={Users} darkMode={darkMode} color="#2A9D8F" />
                  <StatCard title="Inspectores" value={r.inspectores} icon={ClipboardCheck} darkMode={darkMode} color="#264653" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {CHART_DEFS.map((def) => {
                    const st = charts[def.id];
                    if (!st) return null;
                    // Ocultar cuotas si nunca hay datos tras carga (opcional: siempre mostrar)
                    return (
                      <div
                        key={def.id}
                        ref={(node) => {
                          chartRefs.current[def.id] = node;
                        }}
                      >
                        <ChartPanel
                          def={def}
                          darkMode={darkMode}
                          tooltipStyle={tooltipStyle}
                          series={st.series}
                          desde={st.desde}
                          hasta={st.hasta}
                          appliedDesde={st.appliedDesde}
                          appliedHasta={st.appliedHasta}
                          loading={st.loading}
                          exporting={st.exporting}
                          selected={selectedId === def.id}
                          onSelect={() => setSelectedId(def.id)}
                          onChangeDesde={(v) => updateChartField(def.id, { desde: v })}
                          onChangeHasta={(v) => updateChartField(def.id, { hasta: v })}
                          onAplicar={() => aplicarFechasGrafico(def.id)}
                          onExportar={() => exportarGrafico(def.id)}
                          mostrarExportar={userPuedeExportar}
                        />
                      </div>
                    );
                  })}
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

export default Graficos;
