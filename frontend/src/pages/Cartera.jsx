// pages/VerContratos.jsx
import React, { useState, useEffect } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import usuarioAPI from '../services/api_usuario';
import { useNavigate } from "react-router-dom"; // ← Esta línea es crucial
import { 
  Search, 
  Plus, 
  Grid, 
  List,
  Briefcase,
  DollarSign,
  ShoppingCart,
  Star,
  Edit,
  MessageCircle,
  Upload,
  CheckCircle,
  ClipboardCheck,
  Handshake,
  CreditCard,
  FileSignature,
  Users,
  FileText,
  Building,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  UserCheck
} from "lucide-react";

// Importamos nuestros componentes personalizados
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";

const VerContratos = () => {
  const navigate = useNavigate(); // ← Ahora useNavigate está definido
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Nuevo expediente de emprendedor pendiente", time: "5 min", read: false },
    { id: 2, text: "Inspección de emprendimiento programada", time: "1 hora", read: false },
    { id: 3, text: "Solicitud de crédito en revisión", time: "3 horas", read: true },
    { id: 4, text: "Contrato listo para firma", time: "1 día", read: true },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Datos del usuario
  const user = {
    name: "Administrador IADEY",
    email: "admin@iadey.gob.ve",
    role: "Administrador",
    avatar: null,
    department: "Gestión de Créditos",
    joinDate: "Enero 2024",
    pendingTasks: 8,
    completedTasks: 45,
    performance: "98%"
  };

  // Datos específicos por sección
  const sectionData = {
    overview: {
      title: "Panel de Control",
      description: "Resumen general del sistema IADEY",
      stats: [
        { id: 1, title: "Expedientes Activos", value: "156", change: "+12", icon: Briefcase, color: "blue", bgColor: "bg-blue-50", textColor: "text-blue-600" },
        { id: 2, title: "Inspecciones Pendientes", value: "23", change: "+5", icon: ClipboardCheck, color: "orange", bgColor: "bg-orange-50", textColor: "text-orange-600" },
        { id: 3, title: "Solicitudes Crédito", value: "45", change: "+8", icon: Handshake, color: "green", bgColor: "bg-green-50", textColor: "text-green-600" },
        { id: 4, title: "Contratos Activos", value: "89", change: "+15", icon: FileSignature, color: "purple", bgColor: "bg-purple-50", textColor: "text-purple-600" },
      ],
      pendingItems: [
        { id: 1, name: "María González", type: "Nuevo expediente", date: "2024-03-12", status: "Pendiente", priority: "Alta" },
        { id: 2, name: "Juan Pérez", type: "Actualización documentos", date: "2024-03-11", status: "En proceso", priority: "Media" },
        { id: 3, name: "Carlos Rodríguez", type: "Revisión inicial", date: "2024-03-10", status: "Pendiente", priority: "Alta" },
      ],
      actionButton: "Nuevo Registro",
      pendingTitle: "Actividad Reciente"
    },
    projects: {
      title: "Expedientes de Emprendedores",
      description: "Gestión de expedientes de emprendedores",
      stats: [
        { id: 1, title: "Total Expedientes", value: "245", icon: Briefcase, color: "blue" },
        { id: 2, title: "En Revisión", value: "38", icon: Clock, color: "yellow" },
        { id: 3, title: "Documentación Pendiente", value: "52", icon: FileText, color: "orange" },
        { id: 4, title: "Completados", value: "155", icon: CheckCircle, color: "green" },
      ],
      pendingItems: [
        { id: 1, name: "María González", type: "Nuevo expediente", date: "2024-03-12", status: "Pendiente", priority: "Alta" },
        { id: 2, name: "Juan Pérez", type: "Actualización documentos", date: "2024-03-11", status: "En proceso", priority: "Media" },
        { id: 3, name: "Carlos Rodríguez", type: "Revisión inicial", date: "2024-03-10", status: "Pendiente", priority: "Alta" },
      ],
      actionButton: "Nuevo Expediente",
      pendingTitle: "Expedientes Pendientes"
    },
    insp: {
      title: "Inspecciones de Emprendimiento",
      description: "Programación y seguimiento de inspecciones",
      stats: [
        { id: 1, title: "Inspecciones Programadas", value: "18", icon: Calendar, color: "blue" },
        { id: 2, title: "Pendientes de Realizar", value: "12", icon: Clock, color: "yellow" },
        { id: 3, title: "En Proceso", value: "5", icon: Users, color: "purple" },
        { id: 4, title: "Completadas Mes", value: "34", icon: CheckCircle, color: "green" },
      ],
      pendingItems: [
        { id: 1, name: "Restaurante El Sazón", type: "Inspección inicial", date: "2024-03-15", inspector: "Ing. Martínez", status: "Programada" },
        { id: 2, name: "Taller Mecánico Rápido", type: "Re-inspección", date: "2024-03-14", inspector: "Ing. López", status: "Pendiente" },
        { id: 3, name: "Tienda de Ropa Moda", type: "Inspección final", date: "2024-03-13", inspector: "Ing. García", status: "En proceso" },
      ],
      actionButton: "Programar Inspección",
      pendingTitle: "Inspecciones Programadas"
    },
    team: {
      title: "Aprobación de Solicitudes de Crédito",
      description: "Evaluación y aprobación de solicitudes de crédito",
      stats: [
        { id: 1, title: "Solicitudes Pendientes", value: "28", icon: Clock, color: "yellow" },
        { id: 2, title: "En Análisis", value: "15", icon: Search, color: "blue" },
        { id: 3, title: "Aprobadas Mes", value: "42", icon: CheckCircle, color: "green" },
        { id: 4, title: "Rechazadas", value: "8", icon: AlertCircle, color: "red" },
      ],
      pendingItems: [
        { id: 1, name: "Comercializadora ABC", monto: "$50,000", fecha: "2024-03-12", riesgo: "Bajo", estado: "En análisis" },
        { id: 2, name: "Industrias del Valle", monto: "$120,000", fecha: "2024-03-11", riesgo: "Medio", estado: "Pendiente documentos" },
        { id: 3, name: "Servicios Generales GH", monto: "$35,000", fecha: "2024-03-10", riesgo: "Bajo", estado: "Aprobación final" },
      ],
      actionButton: "Nueva Solicitud",
      pendingTitle: "Solicitudes en Análisis"
    },
    documents: {
      title: "Gestión de Contratos",
      description: "Administración de contratos y convenios",
      stats: [
        { id: 1, title: "Contratos Activos", value: "89", icon: FileSignature, color: "green" },
        { id: 2, title: "Por Firmar", value: "23", icon: Clock, color: "yellow" },
        { id: 3, title: "Vencimiento Próximo", value: "12", icon: AlertCircle, color: "red" },
        { id: 4, title: "Renovaciones", value: "8", icon: TrendingUp, color: "blue" },
      ],
      pendingItems: [
        { id: 1, name: "Contrato Servicios TI", empresa: "TecnoSolutions", vencimiento: "2024-04-15", estado: "Activo" },
        { id: 2, name: "Convenio Mantenimiento", empresa: "ServiTotal", vencimiento: "2024-03-30", estado: "Por renovar" },
        { id: 3, name: "Acuerdo Comercial", empresa: "Distribuidora del Sur", vencimiento: "2024-03-25", estado: "Firma pendiente" },
      ],
      actionButton: "Nuevo Contrato",
      pendingTitle: "Contratos por Revisar"
    },
    analytics: {
      title: "Desembolsos y Cuotas",
      description: "Control de desembolsos y seguimiento de cuotas",
      stats: [
        { id: 1, title: "Desembolsos Mes", value: "$2.5M", icon: CreditCard, color: "green" },
        { id: 2, title: "Cuotas por Cobrar", value: "$850K", icon: Clock, color: "yellow" },
        { id: 3, title: "Mora >30 días", value: "$125K", icon: AlertCircle, color: "red" },
        { id: 4, title: "Recuperación", value: "95%", icon: TrendingUp, color: "blue" },
      ],
      pendingItems: [
        { id: 1, name: "Inversiones del Centro", monto: "$25,000", vencimiento: "2024-03-15", estado: "Pendiente", dias: "5" },
        { id: 2, name: "Constructora Moderna", monto: "$45,000", vencimiento: "2024-03-10", estado: "Vencido", dias: "-2" },
        { id: 3, name: "Agroindustrias Unidas", monto: "$32,000", vencimiento: "2024-03-20", estado: "Programado", dias: "10" },
      ],
      actionButton: "Registrar Desembolso",
      pendingTitle: "Próximos Vencimientos"
    }
  };

  // Configuración para submenús
  const settingsData = {
    title: "Configuración del Sistema",
    description: "Administración de usuarios, emprendimientos y parámetros",
    stats: [
      { id: 1, title: "Usuarios Activos", value: "24", icon: Users, color: "blue" },
      { id: 2, title: "Emprendimientos Registrados", value: "156", icon: Building, color: "green" },
      { id: 3, title: "Parámetros Configurados", value: "89", icon: FileText, color: "purple" },
    ],
    pendingItems: [],
    actionButton: "Nueva Configuración",
    pendingTitle: "Configuraciones Recientes"
  };

  // Obtener datos según la pestaña activa con validación segura
  const getCurrentSectionData = () => {
    // Si es una pestaña de configuración
    if (activeTab.startsWith("settings-")) {
      return settingsData;
    }
    
    // Si la pestaña existe en sectionData, devolver esos datos
    if (sectionData[activeTab]) {
      return sectionData[activeTab];
    }
    
    // Por defecto, devolver overview
    return sectionData.overview;
  };

  const currentData = getCurrentSectionData();

  // Notificaciones no leídas
  const unreadCount = notifications.filter(n => !n.read).length;

  // Manejar logout
  const handleLogout = () => {
    usuarioAPI.logout();
  };

  // Marcar notificaciones como leídas
  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
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
            <div className="mb-6">
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {currentData?.title || "Panel de Control"}
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {currentData?.description || "Bienvenido al sistema IADEY"}
              </p>
            </div>

            {/* Barra de búsqueda y acciones */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={`Buscar en ${(currentData?.title || "el sistema").toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-200 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                />
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  className="px-4 py-2 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus size={20} />
                  {currentData?.actionButton || "Nueva Acción"}
                </button>
              </div>
            </div>

            {/* Tarjetas de estadísticas específicas de la sección */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {currentData?.stats?.map((stat) => (
                <SectionStatCard key={stat.id} stat={stat} darkMode={darkMode} />
              ))}
            </div>

            {/* Contenido específico por sección */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Lista de elementos pendientes */}
              <div className={`lg:col-span-2 p-6 rounded-xl ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } shadow-lg`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {currentData?.pendingTitle || "Elementos Pendientes"}
                </h3>
                <div className="space-y-4">
                  {currentData?.pendingItems?.length > 0 ? (
                    currentData.pendingItems.map((item) => (
                      <PendingItem 
                        key={item.id} 
                        item={item} 
                        darkMode={darkMode}
                        sectionType={activeTab}
                      />
                    ))
                  ) : (
                    <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No hay elementos pendientes
                    </p>
                  )}
                </div>
              </div>

              {/* Resumen rápido */}
              <div className={`p-6 rounded-xl ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } shadow-lg`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Resumen Rápido
                </h3>
                <QuickSummary sectionType={activeTab} darkMode={darkMode} />
              </div>
            </div>

            {/* Timeline de actividades recientes */}
            <div className={`p-6 rounded-xl ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-lg`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Actividad Reciente
              </h3>
              <ActivityTimeline sectionType={activeTab} darkMode={darkMode} />
            </div>
          </div>

          <Footer darkMode={darkMode} />
        </main>
      </div>
    </div>
  );
};

// Componente para estadísticas específicas de sección
const SectionStatCard = ({ stat, darkMode }) => {
  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-50 text-blue-600",
      green: "bg-green-50 text-green-600",
      yellow: "bg-yellow-50 text-yellow-600",
      red: "bg-red-50 text-red-600",
      purple: "bg-purple-50 text-purple-600",
      orange: "bg-orange-50 text-orange-600",
      cyan: "bg-cyan-50 text-cyan-600"
    };
    return colors[color] || colors.blue;
  };

  const Icon = stat.icon;
  
  return (
    <div className={`p-6 rounded-xl ${
      darkMode ? 'bg-gray-800' : 'bg-white'
    } shadow-lg hover:shadow-xl transition-all`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${getColorClasses(stat.color).split(' ')[0]}`}>
          <Icon className={getColorClasses(stat.color).split(' ')[1]} size={24} />
        </div>
      </div>
      <h3 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        {stat.value}
      </h3>
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {stat.title}
      </p>
    </div>
  );
};

// Componente para elementos pendientes
const PendingItem = ({ item, darkMode }) => {
  const getStatusColor = (status) => {
    const colors = {
      'Pendiente': 'bg-yellow-500',
      'En proceso': 'bg-blue-500',
      'Completado': 'bg-green-500',
      'Urgente': 'bg-red-500',
      'Programada': 'bg-purple-500',
      'Vencido': 'bg-red-500',
      'Activo': 'bg-green-500',
      'Por renovar': 'bg-orange-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className={`p-4 rounded-lg border ${
      darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
    } transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
            <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {item.name}
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {Object.entries(item).map(([key, value]) => {
              if (key !== 'id' && key !== 'name' && key !== 'status') {
                return (
                  <div key={key}>
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {key}: 
                    </span>
                    <span className={`ml-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {value}
                    </span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
        <button className="text-[#2A9D8F] hover:text-[#264653] text-sm">
          Ver detalles
        </button>
      </div>
    </div>
  );
};

// Componente de resumen rápido
const QuickSummary = ({ sectionType, darkMode }) => {
  const summaries = {
    overview: [
      { label: "Tiempo promedio respuesta", value: "2.5 días" },
      { label: "Tasa de aprobación", value: "78%" },
      { label: "Satisfacción", value: "4.8/5" },
    ],
    projects: [
      { label: "Documentos pendientes", value: "156" },
      { label: "Tiempo revisión", value: "1.5 días" },
      { label: "Completados hoy", value: "8" },
    ],
    insp: [
      { label: "Inspecciones hoy", value: "5" },
      { label: "Tiempo promedio", value: "45 min" },
      { label: "Aprobadas", value: "12" },
    ],
    team: [
      { label: "Monto total solicitado", value: "$3.2M" },
      { label: "Tasa aprobación", value: "65%" },
      { label: "Tiempo análisis", value: "3 días" },
    ],
    documents: [
      { label: "Próximos a vencer", value: "12" },
      { label: "Firmados hoy", value: "5" },
      { label: "Valor total", value: "$5.8M" },
    ],
    analytics: [
      { label: "Tasa recuperación", value: "95%" },
      { label: "Mora promedio", value: "15 días" },
      { label: "Desembolsos hoy", value: "$350K" },
    ]
  };

  // Para pestañas de configuración, mostrar resumen de configuración
  if (sectionType.startsWith("settings-")) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Última configuración
          </span>
          <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Hoy
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Cambios pendientes
          </span>
          <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            3
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Última actualización
          </span>
          <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            10:30 AM
          </span>
        </div>
      </div>
    );
  }

  const currentSummary = summaries[sectionType] || summaries.overview;

  return (
    <div className="space-y-4">
      {currentSummary.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {item.label}
          </span>
          <span className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// Componente de timeline de actividad
const ActivityTimeline = ({ sectionType, darkMode }) => {
  const activities = {
    overview: [
      { time: "10:30", action: "Nuevo expediente creado", user: "María G." },
      { time: "09:45", action: "Inspección completada", user: "Inspector López" },
      { time: "09:00", action: "Solicitud aprobada", user: "Analista Pérez" },
    ],
    projects: [
      { time: "11:20", action: "Documentos subidos", user: "Juan P." },
      { time: "10:15", action: "Expediente revisado", user: "Tú" },
      { time: "09:30", action: "Nuevo registro", user: "Ana M." },
    ],
    insp: [
      { time: "11:00", action: "Inspección programada", user: "Ing. García" },
      { time: "10:30", action: "Informe subido", user: "Ing. López" },
      { time: "09:45", action: "Resultados enviados", user: "Sistema" },
    ]
  };

  // Para pestañas de configuración, mostrar actividades de configuración
  if (sectionType.startsWith("settings-")) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'} min-w-[60px]`}>
            11:30
          </div>
          <div className="flex-1">
            <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Usuario creado
            </p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Por: Admin
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'} min-w-[60px]`}>
            10:15
          </div>
          <div className="flex-1">
            <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Parámetros actualizados
            </p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Por: Sistema
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentActivities = activities[sectionType] || activities.overview;

  return (
    <div className="space-y-4">
      {currentActivities.map((activity, index) => (
        <div key={index} className="flex items-start gap-4">
          <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'} min-w-[60px]`}>
            {activity.time}
          </div>
          <div className="flex-1">
            <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {activity.action}
            </p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Por: {activity.user}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VerContratos;