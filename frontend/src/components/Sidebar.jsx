// components/Sidebar.jsx - Con integración de API corregida
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  FileCheck,
  ClipboardCheck,
  Handshake,
  FileSignature,
  CreditCard,
  Settings,
  ChevronDown,
  ChevronLeft,
  Building,
  FileText,
  Landmark,
  LayoutDashboard,
  Users,
  FolderOpen,
  X,
  Banknote,
  Shield,
  Lock,
  Loader2,
  ScrollText,
  DatabaseBackup,
  BarChart3,
  Calendar
} from "lucide-react";
import permisosAPI from "../services/api_permisos";
import usuarioAPI from "../services/api_usuario";
import { parseAcciones } from "../utils/menuPermisos";
import { esAdministrador } from "../utils/roles";
import { useBodyScrollLock } from "../hooks/useAppShell";
import sicceLogo from "../assets/sicce-logo.png";

const Sidebar = ({ sidebarOpen, setSidebarOpen, darkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  
  // Estados para permisos
  const [userPermissions, setUserPermissions] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingPermisos, setLoadingPermisos] = useState(true);
  const [errorPermisos, setErrorPermisos] = useState(null);

  useBodyScrollLock(isMobile && sidebarOpen);

  // Estructura de menú con sus menu_item_id
  const menuItems = [
    { 
      id: "panel", 
      icon: LayoutDashboard, 
      text: "Panel General", 
      path: "/Dashboard", 
      section: "principal",
      menu_item_id: "dashboard",
      requiredPermission: "ver"
    },
    { 
      id: "graf", 
      icon: BarChart3, 
      text: "Gráficos", 
      path: "/Graficos", 
      section: "principal",
      menu_item_id: "graficos",
      requiredPermission: "ver"
    },
    { 
      id: "sol", 
      icon: FileCheck, 
      text: "Solicitud de Crédito", 
      path: "/Solicitud", 
      section: "operaciones",
      menu_item_id: "solicitudes",
      requiredPermission: "ver"
    },
    { 
      id: "exp", 
      icon: FolderOpen, 
      text: "Expediente", 
      path: "/Expediente", 
      section: "operaciones",
      menu_item_id: "expedientes",
      requiredPermission: "ver"
    },
    { 
      id: "ins", 
      icon: ClipboardCheck, 
      text: "Inspección", 
      path: "/Inspeccion", 
      section: "operaciones",
      menu_item_id: "inspecciones",
      requiredPermission: "ver"
    },
    { 
      id: "apr", 
      icon: Handshake, 
      text: "Aprobación", 
      path: "/Aprobacion", 
      section: "operaciones",
      menu_item_id: "aprobaciones",
      requiredPermission: "ver"
    },
    {
      id: "citas",
      icon: Calendar,
      text: "Citas",
      path: "/Citas",
      section: "principal",
      menu_item_id: "citas",
      requiredPermission: "ver"
    },
    { 
      id: "banc", 
      icon: Landmark, 
      text: "Crédito a Banco", 
      path: "/Bancarios", 
      section: "financiero",
      menu_item_id: "creditos_banco",
      requiredPermission: "ver"
    },
    { 
      id: "cont", 
      icon: FileSignature, 
      text: "Contrato", 
      path: "/Contrato", 
      section: "financiero",
      menu_item_id: "contratos",
      requiredPermission: "ver"
    },
    { 
      id: "des", 
      icon: Banknote, 
      text: "Comprobantes", 
      path: "/Desembolso", 
      section: "financiero",
      menu_item_id: "desembolsos",
      requiredPermission: "ver"
    },
    { 
      id: "cuo", 
      icon: CreditCard, 
      text: "Pago de Cuota", 
      path: "/Cuota", 
      section: "financiero",
      menu_item_id: "pagos_cuota",
      requiredPermission: "ver"
    }
  ];

  const settingsSubItems = [
    { 
      id: "user", 
      icon: Users, 
      text: "Usuarios", 
      path: "/Usuario",
      menu_item_id: "config_usuarios",
      requiredPermission: "ver"
    },
    { 
      id: "empr", 
      icon: Building, 
      text: "Emprendimientos", 
      path: "/Clasificacion_emprendimiento",
      menu_item_id: "config_emprendimientos",
      requiredPermission: "ver"
    },
    { 
      id: "roles", 
      icon: Users, 
      text: "Roles", 
      path: "/Roles",
      menu_item_id: "config_roles",
      requiredPermission: "ver"
    },
    { 
      id: "configCont", 
      icon: FileText, 
      text: "Contratos", 
      path: "/Configuracion_contrato",
      menu_item_id: "config_contratos",
      requiredPermission: "ver"
    },
    { 
      id: "req", 
      icon: FileText, 
      text: "Requisitos", 
      path: "/Configuracion_requisitos",
      menu_item_id: "config_requisitos",
      requiredPermission: "ver"
    },
    { 
      id: "bancos", 
      icon: Landmark, 
      text: "Bancos", 
      path: "/GestionBancos",
      menu_item_id: "config_bancos",
      requiredPermission: "ver"
    },
    { 
      id: "aud", 
      icon: ScrollText, 
      text: "Auditoría", 
      path: "/Auditoria",
      menu_item_id: "auditoria",
      requiredPermission: "ver"
    },
    { 
      id: "resp", 
      icon: DatabaseBackup, 
      text: "Respaldo BD", 
      path: "/Respaldo",
      menu_item_id: "respaldo_bd",
      requiredPermission: "ver"
    }
  ];

  // Cargar permisos del usuario
  useEffect(() => {
    cargarPermisosUsuario();
  }, []);

  // Escuchar cambios de autenticación
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('Auth change detected, reloading permissions...');
      cargarPermisosUsuario();
    };
    
    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  const cargarPermisosUsuario = async () => {
    try {
      setLoadingPermisos(true);
      setErrorPermisos(null);
      
      // Obtener usuario actual usando usuarioAPI
      const currentUser = usuarioAPI.getCurrentUser();
      
      console.log('Current user from session:', currentUser);
      
      if (!currentUser) {
        console.warn('No se encontró usuario en sesión');
        setLoadingPermisos(false);
        return;
      }

      // Obtener el ID del usuario (buscar en múltiples campos)
      const userId = currentUser.id || 
                     currentUser.id_usuario || 
                     currentUser.userId;
      
      console.log('User ID:', userId);
      
      if (!userId) {
        console.warn('No se encontró ID de usuario');
        setLoadingPermisos(false);
        return;
      }

      // Verificar si es administrador
      const userRole = currentUser.nombre_rol || 
                       currentUser.rol;
      
      console.log('User role:', userRole);
      
      if (esAdministrador(currentUser) || userRole === 'Administrador' || userRole === 'Admin') {
        console.log('Usuario administrador - acceso total');
        setIsAdmin(true);
        setUserPermissions({ all: ['*'] });
        setLoadingPermisos(false);
        return;
      }

      // Obtener permisos desde la API
      console.log('Obteniendo permisos para usuario ID:', userId);
      const response = await permisosAPI.getPermisosByUsuario(userId);
      
      console.log('Respuesta de permisos:', response);
      
      if (response.success && response.data) {
        const permisosMap = {};
        
        response.data.forEach(permiso => {
          console.log('Procesando permiso:', permiso);
          const acciones = parseAcciones(permiso.acciones);
          permisosMap[permiso.menu_item_id] = acciones.length ? acciones : ['ver'];
        });
        
        console.log('Permisos procesados:', permisosMap);
        setUserPermissions(permisosMap);
      } else {
        console.warn('No se pudieron obtener permisos:', response.error);
        setErrorPermisos(response.error || 'Error al cargar permisos');
      }
    } catch (error) {
      console.error('Error cargando permisos del usuario:', error);
      setErrorPermisos('Error al cargar permisos');
    } finally {
      setLoadingPermisos(false);
    }
  };

  // Verificar si un item debe mostrarse
  const hasPermission = (menuItemId, requiredPermission = 'ver', isPublic = false) => {
  // Si es público, siempre visible
  if (isPublic) return true;
  
  // Si es administrador, acceso total
  if (isAdmin) return true;
  
  // Si no hay permisos cargados, no mostrar
  if (!userPermissions || Object.keys(userPermissions).length === 0) return false;
  
  // Si tiene acceso total
  if (userPermissions.all && userPermissions.all.includes('*')) return true;
  
  // Obtener permisos para este menú
  const permisosMenu = userPermissions[menuItemId];
  
  // Si no hay permisos para este menú
  if (!permisosMenu) return false;
  
  // Si tiene acceso total a este menú
  if (permisosMenu.includes('*')) return true;
  
  // Verificar permiso específico
  return permisosMenu.includes(requiredPermission);
};

  // Filtrar items según permisos
  const filteredMenuItems = menuItems.filter(item => 
  item.public || hasPermission(item.menu_item_id, item.requiredPermission)
);

  const filteredSettingsSubItems = settingsSubItems.filter(item => 
    hasPermission(item.menu_item_id, item.requiredPermission)
  );

  const showSettings = filteredSettingsSubItems.length > 0;

  // Efectos de resize y ruta
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith("/configuracion") && sidebarOpen) {
      setSettingsOpen(true);
    }
  }, [location.pathname, sidebarOpen]);

  // Handlers
  const handleMenuItemClick = (item) => {
    navigate(item.path);
    if (isMobile) setSidebarOpen(false);
  };

  const handleSettingsClick = () => {
    if (sidebarOpen) {
      setSettingsOpen(!settingsOpen);
    } else {
      setSidebarOpen(true);
      setSettingsOpen(true);
    }
  };

  const handleSubItemClick = (subItem) => {
    navigate(subItem.path);
    if (isMobile) setSidebarOpen(false);
  };

  // Utilidades de renderizado
  const isItemActive = (itemPath) => {
    if (itemPath === "/") return location.pathname === "/";
    return location.pathname.toLowerCase() === itemPath.toLowerCase();
  };

  const isSettingsActive = () => {
    return filteredSettingsSubItems.some(item => location.pathname === item.path);
  };

  const getSectionTitle = (section) => {
    const titles = {
      principal: "PRINCIPAL",
      operaciones: "OPERACIONES",
      financiero: "GESTIÓN FINANCIERA",
      sistema: "SISTEMA"
    };
    return titles[section];
  };

  // Estilos
  const sidebarStyles = darkMode
    ? "bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 border-teal-900/40 text-gray-300"
    : "bg-gradient-to-b from-white via-[#f7fbfb] to-[#eef7f5] border-teal-100 text-gray-600";

  const itemActiveStyles = darkMode
    ? "bg-gradient-to-r from-teal-700/50 to-teal-600/20 text-white shadow-sm ring-1 ring-teal-500/30"
    : "bg-gradient-to-r from-[#2A9D8F] to-[#264653] text-white shadow-md shadow-teal-900/15";

  const itemHoverStyles = darkMode
    ? "hover:bg-teal-900/30 hover:text-teal-100"
    : "hover:bg-[#e6f6f4] hover:text-[#264653]";

  // Estado de carga
  if (loadingPermisos) {
    return (
      <aside
        className={`
          fixed left-0 top-0 h-full z-50 border-r ${sidebarStyles}
          ${sidebarOpen ? "w-64" : "w-20"}
          transition-all duration-200 flex items-center justify-center
          ${isMobile ? (sidebarOpen ? "translate-x-0" : "-translate-x-full") : ""}
          ${!isMobile && !sidebarOpen ? "lg:w-20" : ""}
        `}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
          {sidebarOpen && (
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Cargando menú...
            </span>
          )}
        </div>
      </aside>
    );
  }

  // Si no hay permisos y no es admin
  if (!isAdmin && Object.keys(userPermissions).length === 0 && !loadingPermisos) {
    return (
      <aside
        className={`
          fixed left-0 top-0 h-full z-50 border-r ${sidebarStyles}
          ${sidebarOpen ? "w-64" : "w-20"}
          transition-all duration-200
          ${isMobile ? (sidebarOpen ? "translate-x-0" : "-translate-x-full") : ""}
        `}
      >
        <div className="h-full flex flex-col items-center justify-center p-4">
          <Lock size={32} className={`mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          {sidebarOpen && (
            <div className="text-center">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Sin permisos
              </p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Contacta al administrador
              </p>
              {errorPermisos && (
                <p className="text-xs text-red-500 mt-2">{errorPermisos}</p>
              )}
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Overlay para móvil */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        className={`
          fixed left-0 top-0 h-full z-50
          border-r
          ${sidebarStyles}
          ${sidebarOpen ? "w-64" : "w-20"}
          ${isMobile 
            ? sidebarOpen ? "translate-x-0" : "-translate-x-full"
            : "translate-x-0"
          }
          transition-transform duration-200 ease-out
          flex flex-col
        `}
      >
        {/* Logo SICCE (sin redirección) */}
        <div
          className={`relative flex flex-col items-center justify-center border-b bg-white ${
            sidebarOpen ? "h-40 px-3 py-3" : "h-24 px-2 py-2"
          } ${darkMode ? "border-teal-900/40" : "border-teal-100"}`}
        >
          <div className="w-full h-full flex items-center justify-center" title="SICCE">
            <img
              src={sicceLogo}
              alt="SICCE"
              className={`object-contain object-center select-none pointer-events-none ${
                sidebarOpen ? "h-36 w-auto max-w-[240px]" : "h-16 w-16"
              }`}
            />
          </div>

          {isMobile && sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100 text-gray-500"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Indicador de rol */}
        {sidebarOpen && (
          <div className={`px-4 py-2.5 border-b ${
            darkMode
              ? 'border-teal-900/40 bg-gradient-to-r from-teal-950/60 to-gray-900'
              : 'border-teal-100 bg-gradient-to-r from-[#e6f6f4] to-[#fff8e8]'
          }`}>
            <div className="flex items-center gap-2">
              <Shield size={14} className={isAdmin ? 'text-emerald-500' : 'text-[#2A9D8F]'} />
              <span className={`text-xs font-medium ${darkMode ? 'text-teal-200' : 'text-[#264653]'}`}>
                {isAdmin ? 'Administrador' : 'Usuario'}
              </span>
              {isAdmin && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded ml-auto">
                  Acceso total
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto p-3">
          {sidebarOpen ? (
            /* Modo expandido */
            <>
              {['principal', 'operaciones', 'financiero'].map((section) => {
                const sectionItems = filteredMenuItems.filter(item => item.section === section);
                if (sectionItems.length === 0) return null;
                
                return (
                  <div key={section} className="mb-4">
                    <div className={`px-2 mb-2 text-[10px] font-bold tracking-wider ${
                      darkMode ? 'text-teal-400/80' : 'text-[#2A9D8F]'
                    }`}>
                      {getSectionTitle(section)}
                    </div>
                    {sectionItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleMenuItemClick(item)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg
                          text-sm transition-all duration-150
                          ${isItemActive(item.path) ? itemActiveStyles : ''}
                          ${!isItemActive(item.path) ? itemHoverStyles : ''}
                        `}
                      >
                        <item.icon
                          size={18}
                          className={`flex-shrink-0 ${
                            isItemActive(item.path)
                              ? 'text-white'
                              : darkMode ? 'text-teal-400/80' : 'text-[#2A9D8F]'
                          }`}
                        />
                        <span className="flex-1 text-left font-medium">{item.text}</span>
                      </button>
                    ))}
                  </div>
                );
              })}

              {showSettings && (
                <>
                  <div className={`my-2 border-t ${darkMode ? 'border-teal-900/40' : 'border-teal-100'}`} />
                  <div>
                    <div className={`px-2 mb-2 text-[10px] font-bold tracking-wider ${
                      darkMode ? 'text-amber-400/80' : 'text-amber-600'
                    }`}>
                      SISTEMA
                    </div>
                    <button
                      onClick={handleSettingsClick}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
                        ${isSettingsActive() ? itemActiveStyles : ''}
                        ${!isSettingsActive() ? itemHoverStyles : ''}
                      `}
                    >
                      <Settings
                        size={18}
                        className={`flex-shrink-0 ${
                          isSettingsActive()
                            ? 'text-white'
                            : darkMode ? 'text-amber-400/80' : 'text-amber-600'
                        }`}
                      />
                      <span className="flex-1 text-left font-medium">Configuración</span>
                      <ChevronDown 
                        size={14} 
                        className={`transition-transform duration-150 ${settingsOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {settingsOpen && (
                      <div className={`ml-4 mt-1 pl-2 border-l-2 ${
                        darkMode ? 'border-teal-700/50' : 'border-[#2A9D8F]/40'
                      }`}>
                        {filteredSettingsSubItems.map((subItem) => (
                          <button
                            key={subItem.id}
                            onClick={() => handleSubItemClick(subItem)}
                            className={`
                              w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm
                              transition-colors duration-150
                              ${location.pathname === subItem.path
                                ? (darkMode ? 'bg-teal-800/40 text-white' : 'bg-[#e6f6f4] text-[#264653] font-medium')
                                : (darkMode ? 'text-gray-400 hover:bg-teal-900/30 hover:text-teal-100' : 'text-gray-500 hover:bg-[#e6f6f4] hover:text-[#264653]')
                              }
                            `}
                          >
                            <subItem.icon size={14} className="flex-shrink-0 text-[#2A9D8F]" />
                            <span>{subItem.text}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            /* Modo colapsado */
            <>
              {filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item)}
                  className={`
                    w-full flex justify-center p-2.5 mb-1 rounded-lg
                    transition-all duration-150
                    ${isItemActive(item.path) ? itemActiveStyles : ''}
                    ${!isItemActive(item.path) ? itemHoverStyles : ''}
                  `}
                  title={item.text}
                >
                  <item.icon
                    size={20}
                    className={
                      isItemActive(item.path)
                        ? 'text-white'
                        : darkMode ? 'text-teal-400' : 'text-[#2A9D8F]'
                    }
                  />
                </button>
              ))}

              {showSettings && (
                <>
                  <div className={`my-2 border-t ${darkMode ? 'border-teal-900/40' : 'border-teal-100'}`} />
                  <button
                    onClick={handleSettingsClick}
                    className={`
                      w-full flex justify-center p-2.5 rounded-lg transition-all duration-150
                      ${isSettingsActive() ? itemActiveStyles : ''}
                      ${!isSettingsActive() ? itemHoverStyles : ''}
                    `}
                    title="Configuración"
                  >
                    <Settings
                      size={20}
                      className={
                        isSettingsActive()
                          ? 'text-white'
                          : darkMode ? 'text-amber-400' : 'text-amber-600'
                      }
                    />
                  </button>
                </>
              )}
            </>
          )}
        </nav>

        {/* Botón colapsar - Desktop */}
        {!isMobile && (
          <div className={`p-3 border-t ${darkMode ? 'border-teal-900/40' : 'border-teal-100'}`}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`
                w-full flex justify-center p-2 rounded-lg transition-colors duration-150
                ${darkMode
                  ? 'hover:bg-teal-900/40 text-teal-400'
                  : 'hover:bg-[#e6f6f4] text-[#2A9D8F]'}
              `}
            >
              <ChevronLeft size={16} className={`transition-transform duration-200 ${!sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;