// components/Header.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  Menu, X, ChevronDown,
  LogOut, Shield, Building2, Bell
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import usuarioAPI from '../services/api_usuario';
import notificacionAPI from '../services/api_notificacion';
import { setAuthItem } from '../utils/authStorage';

// Constants
const ROLE_CONFIG = {
  admin: { icon: Shield, label: 'Administrador' },
  administrador: { icon: Shield, label: 'Administrador' },
  emprendedor: { icon: Building2, label: 'Emprendedor' }
};

const ROLE_DISPLAY_NAMES = {
  admin: 'Administrador',
  administrador: 'Administrador',
  emprendedor: 'Emprendedor'
};

// Custom hook for user info management
const useUserInfo = () => {
  const [userInfo, setUserInfo] = useState({
    nombres: '',
    apellidos: '',
    nombre_completo: '',
    cedula: '',
    role: '',
    estatus: ''
  });

  const loadUserInfo = useCallback(async () => {
    try {
      const storedUser = usuarioAPI.getCurrentUser();
      if (!storedUser) {
        console.log('No hay usuario almacenado');
        return;
      }

      console.log('Usuario almacenado:', storedUser);

      // Función para obtener el rol correctamente
      const getRole = (user) => {
        if (user.rol) return user.rol;
        if (user.nombre_rol) return user.nombre_rol;
        if (user.id_rol_usu) {
          const roleMap = {
            1: 'Administrador',
            2: 'Administrador',
            3: 'Emprendedor'
          };
          return roleMap[user.id_rol_usu] || 'Usuario';
        }
        return 'Usuario';
      };

      // Si tiene nombres y apellidos, usar esos datos directamente
      if (storedUser.nombres && storedUser.apellidos) {
        const role = getRole(storedUser);
        console.log('Rol obtenido de storedUser:', role);
        
        setUserInfo({
          nombres: storedUser.nombres,
          apellidos: storedUser.apellidos,
          nombre_completo: `${storedUser.nombres} ${storedUser.apellidos}`,
          cedula: storedUser.cedula_usuario || '',
          role: role,
          estatus: storedUser.estatus || ''
        });
        return;
      }

      // Si no tiene nombres, intentar obtener del API
      if (storedUser.cedula_usuario) {
        const response = await usuarioAPI.getUsuarioByCedula(storedUser.cedula_usuario);
        if (response?.success && response?.data) {
          const data = response.data;
          const role = data.rol || data.nombre_rol || getRole(data);
          
          console.log('Rol obtenido del API:', role);
          
          setUserInfo({
            nombres: data.nombres || data.persona?.nombres || '',
            apellidos: data.apellidos || data.persona?.apellidos || '',
            nombre_completo: data.nombre_completo || 
              data.persona?.nombre_completo || 
              `${data.nombres || ''} ${data.apellidos || ''}`.trim(),
            cedula: data.cedula_usuario || storedUser.cedula_usuario,
            role: role,
            estatus: data.estatus || storedUser.estatus || ''
          });
          
          // Actualizar sesión de esta pestaña (sessionStorage)
          const updatedUser = {
            ...storedUser,
            rol: role,
            nombre_rol: role,
            nombres: data.nombres || data.persona?.nombres || '',
            apellidos: data.apellidos || data.persona?.apellidos || '',
            nombre_completo: data.nombre_completo || 
              data.persona?.nombre_completo || 
              `${data.nombres || ''} ${data.apellidos || ''}`.trim()
          };
          setAuthItem('user', JSON.stringify(updatedUser));
          setAuthItem('usuario', JSON.stringify(updatedUser));
          
          return;
        }
      }

      // Fallback con datos mínimos
      const role = getRole(storedUser);
      console.log('Rol fallback:', role);
      
      setUserInfo(prev => ({
        ...prev,
        cedula: storedUser.cedula_usuario || '',
        role: role,
        estatus: storedUser.estatus || ''
      }));
      
    } catch (error) {
      console.error('Error cargando información del usuario:', error);
    }
  }, []);

  useEffect(() => {
    loadUserInfo();
  }, [loadUserInfo]);

  return userInfo;
};

// Custom hook for click outside detection
const useClickOutside = (refs, handlers) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      refs.forEach(({ ref, handler }) => {
        if (ref.current && !ref.current.contains(event.target)) {
          handler(false);
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, handlers]);
};

// Función para mostrar confirmación de cierre de sesión con navegación
const showLogoutConfirmation = async (handleLogout, navigate) => {
  const result = await Swal.fire({
    title: '¿Cerrar sesión?',
    text: '¿Estás seguro de que deseas cerrar tu sesión actual?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Sí, cerrar sesión',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: 'rounded-lg shadow-xl',
      title: 'text-lg font-semibold',
      confirmButton: 'px-4 py-2 text-sm font-medium rounded-md',
      cancelButton: 'px-4 py-2 text-sm font-medium rounded-md'
    }
  });

  if (result.isConfirmed) {
    Swal.fire({
      title: 'Cerrando sesión...',
      text: 'Por favor espera un momento',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      await handleLogout();
      
      // Redirigir a la página de cierre de sesión
      navigate('/Cierre_sesion');
      
      await Swal.fire({
        title: '¡Sesión cerrada!',
        text: 'Has cerrado sesión exitosamente',
        icon: 'success',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-lg shadow-xl'
        }
      });
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'No se pudo cerrar la sesión. Intenta de nuevo.',
        icon: 'error',
        confirmButtonColor: '#dc2626',
        customClass: {
          popup: 'rounded-lg shadow-xl',
          confirmButton: 'px-4 py-2 text-sm font-medium rounded-md'
        }
      });
    }
  }
};

// Helper functions for user display
const getDisplayName = (userInfo) => {
  if (userInfo.nombres && userInfo.apellidos) {
    const [firstName] = userInfo.nombres.trim().split(' ');
    const [firstLastName] = userInfo.apellidos.trim().split(' ');
    return `${firstName} ${firstLastName}`;
  }
  
  if (userInfo.nombre_completo) {
    const names = userInfo.nombre_completo.trim().split(' ');
    return names.length >= 2 ? `${names[0]} ${names[names.length - 1]}` : names[0];
  }
  
  return userInfo.cedula ? `V-${userInfo.cedula}` : 'Usuario';
};

const getFullName = (userInfo) => {
  if (userInfo.nombres && userInfo.apellidos) {
    return `${userInfo.nombres} ${userInfo.apellidos}`;
  }
  return userInfo.nombre_completo || getDisplayName(userInfo);
};

const getFormattedRole = (role) => {
  return ROLE_DISPLAY_NAMES[role?.toLowerCase()] || role || 'Usuario';
};

const getInitials = (userInfo) => {
  if (userInfo.nombres && userInfo.apellidos) {
    return (userInfo.nombres[0] + userInfo.apellidos[0]).toUpperCase();
  }
  
  const name = getDisplayName(userInfo);
  if (name && !name.startsWith('V-')) {
    const parts = name.split(' ');
    return parts.length >= 2 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name[0].toUpperCase();
  }
  
  return userInfo.cedula?.substring(0, 2).toUpperCase() || 'U';
};

const getRoleBadge = (role) => {
  return ROLE_CONFIG[role?.toLowerCase()] || null;
};

const formatNotifTime = (createdAt) => {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

// Sub-components
const UserAvatar = ({ initials, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-xl'
  };

  return (
    <div className={`
      ${sizeClasses[size]} rounded-md flex items-center justify-center 
      text-white font-medium bg-slate-600
    `}>
      {initials}
    </div>
  );
};

const MenuItem = React.memo(({ icon: Icon, text, onClick, className = "" }) => (
  <button 
    onClick={onClick} 
    className={`
      w-full flex items-center gap-3 px-3 py-2 rounded-md 
      transition-all duration-150 text-sm text-slate-600 
      hover:bg-slate-50 hover:text-slate-900 ${className}
    `}
  >
    <Icon size={16} />
    <span>{text}</span>
  </button>
));

MenuItem.displayName = 'MenuItem';

const UserMenuDropdown = React.memo(({ 
  userInfo, showUserMenu, setShowUserMenu, 
  handleLogout, userMenuRef, navigate 
}) => {
  const displayName = useMemo(() => getDisplayName(userInfo), [userInfo]);
  const fullName = useMemo(() => getFullName(userInfo), [userInfo]);
  const formattedRole = useMemo(() => getFormattedRole(userInfo.role), [userInfo.role]);
  const initials = useMemo(() => getInitials(userInfo), [userInfo]);
  const roleBadge = useMemo(() => getRoleBadge(userInfo.role), [userInfo.role]);

  const handleLogoutClick = useCallback(() => {
    setShowUserMenu(false);
    showLogoutConfirmation(handleLogout, navigate);
  }, [handleLogout, setShowUserMenu, navigate]);

  if (!showUserMenu) return null;

  return (
    <div 
      ref={userMenuRef} 
      className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1rem))] rounded-lg shadow-xl z-50 overflow-hidden bg-white border border-slate-200"
    >
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <UserAvatar initials={initials} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-slate-900">
              {displayName}
            </p>
            <p className="text-xs mt-1 text-slate-500">
              {formattedRole}
            </p>
            {userInfo.cedula && (
              <p className="text-xs mt-0.5 text-slate-400">
                C.I: {userInfo.cedula}
              </p>
            )}
          </div>
        </div>
        {roleBadge && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-slate-300 bg-slate-100 text-slate-700">
              <roleBadge.icon size={12} />
              {roleBadge.label}
            </span>
          </div>
        )}
      </div>

      <div className="p-1.5">
        <MenuItem 
          icon={LogOut} 
          text="Cerrar Sesión" 
          onClick={handleLogoutClick}
          className="text-red-600 hover:bg-red-50"
        />
      </div>
    </div>
  );
});

UserMenuDropdown.displayName = 'UserMenuDropdown';

// Main Header component
const Header = ({ 
  sidebarOpen, 
  setSidebarOpen,
  notifications: notificationsProp,
  showNotifications,
  setShowNotifications,
  showUserMenu, 
  setShowUserMenu, 
  handleLogout, 
  unreadCount: unreadCountProp, 
  markAsRead: markAsReadProp 
}) => {
  const navigate = useNavigate();
  const userInfo = useUserInfo();
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const userMenuButtonRef = useRef(null);

  const [apiNotificaciones, setApiNotificaciones] = useState([]);
  const [apiNoLeidas, setApiNoLeidas] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const cargarNotificaciones = useCallback(async () => {
    try {
      let usuario = null;
      try {
        usuario = usuarioAPI.getCurrentUser();
      } catch {
        usuario = null;
      }
      if (!usuario?.id) return;

      setLoadingNotif(true);
      const res = await notificacionAPI.getMias({ limit: 30 });
      if (res?.success) {
        setApiNotificaciones(res.data || []);
        setApiNoLeidas(typeof res.no_leidas === 'number' ? res.no_leidas : 0);
      }
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    } finally {
      setLoadingNotif(false);
    }
  }, []);

  useEffect(() => {
    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [cargarNotificaciones]);

  // Preferir API real; fusionar props locales si no hay API o como fallback
  const listaNotificaciones = useMemo(() => {
    if (apiNotificaciones.length > 0) {
      return apiNotificaciones.map((n) => ({
        id: n.id_notificacion,
        text: n.titulo || n.mensaje || 'Notificación',
        detalle: n.mensaje || '',
        time: formatNotifTime(n.created_at),
        read: !!n.leida,
        enlace: n.enlace || null,
        fromApi: true,
      }));
    }
    return (notificationsProp || []).map((n) => ({
      id: n.id,
      text: n.text || n.titulo || 'Notificación',
      detalle: n.detalle || n.mensaje || '',
      time: n.time || '',
      read: !!n.read || !!n.leida,
      enlace: n.enlace || null,
      fromApi: false,
    }));
  }, [apiNotificaciones, notificationsProp]);

  const badgeCount = useMemo(() => {
    if (apiNotificaciones.length > 0 || apiNoLeidas > 0) return apiNoLeidas;
    if (typeof unreadCountProp === 'number') return unreadCountProp;
    return (notificationsProp || []).filter((n) => !n.read).length;
  }, [apiNotificaciones, apiNoLeidas, unreadCountProp, notificationsProp]);

  const handleMarkAsRead = useCallback(async (notif) => {
    if (notif.fromApi) {
      try {
        await notificacionAPI.marcarLeida(notif.id);
        setApiNotificaciones((prev) =>
          prev.map((n) =>
            n.id_notificacion === notif.id ? { ...n, leida: true } : n
          )
        );
        setApiNoLeidas((c) => Math.max(0, c - (notif.read ? 0 : 1)));
      } catch (err) {
        console.error('Error marcando notificación:', err);
      }
    } else if (markAsReadProp) {
      markAsReadProp(notif.id);
    }
    if (notif.enlace) {
      setShowNotifications(false);
      navigate(notif.enlace);
    }
  }, [markAsReadProp, navigate, setShowNotifications]);

  const handleMarkAll = useCallback(async () => {
    try {
      await notificacionAPI.marcarTodas();
      setApiNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setApiNoLeidas(0);
      if (notificationsProp?.length && markAsReadProp) {
        notificationsProp.forEach((n) => markAsReadProp(n.id));
      }
    } catch (err) {
      console.error('Error marcando todas:', err);
    }
  }, [notificationsProp, markAsReadProp]);

  const toggleNotifications = useCallback((e) => {
    e.stopPropagation();
    setShowUserMenu(false);
    setShowNotifications((prev) => {
      const next = !prev;
      if (next) cargarNotificaciones();
      return next;
    });
  }, [setShowNotifications, setShowUserMenu, cargarNotificaciones]);

  // DEBUG: Verificar estado del usuario
  useEffect(() => {
    console.log('UserInfo en Header:', userInfo);
  }, [userInfo]);

  const displayName = useMemo(() => getDisplayName(userInfo), [userInfo]);
  const initials = useMemo(() => getInitials(userInfo), [userInfo]);
  const formattedRole = useMemo(() => getFormattedRole(userInfo.role), [userInfo.role]);

  const clickOutsideRefs = useMemo(() => [
    { ref: notificationRef, handler: setShowNotifications },
    { ref: userMenuRef, handler: setShowUserMenu }
  ], [setShowNotifications, setShowUserMenu]);

  useClickOutside(clickOutsideRefs, [setShowNotifications, setShowUserMenu]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, [setSidebarOpen]);

  const toggleUserMenu = useCallback((e) => {
    e.stopPropagation();
    setShowNotifications(false);
    setShowUserMenu(prev => !prev);
  }, [setShowUserMenu, setShowNotifications]);

  return (
    <header className={`
      fixed top-0 w-full z-50 h-16 border-b shadow-sm 
      transition-all duration-300
      bg-gradient-to-r from-white via-[#f7fbfb] to-[#fff8e8]
      border-teal-100
      ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'}
    `}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#264653] via-[#2A9D8F] to-[#E9C46A]" />
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg transition-all duration-200 hover:bg-[#e6f6f4] text-[#264653]"
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-semibold text-[#264653]">SICCE</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#e6f6f4] text-[#2A9D8F]">
              Panel
            </span>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1 lg:gap-2">
          {/* Notificaciones */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative p-2 rounded-lg transition-all hover:bg-[#e6f6f4] text-[#264653]"
              aria-label="Notificaciones"
              aria-expanded={showNotifications}
            >
              <Bell size={20} />
              {badgeCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#E76F51] text-white text-[10px] font-bold shadow-sm">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-1rem))] rounded-lg shadow-xl z-50 overflow-hidden bg-white border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Notificaciones</h3>
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    className="text-xs text-[#2A9D8F] hover:underline disabled:opacity-50"
                    disabled={badgeCount === 0}
                  >
                    Marcar todas
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {loadingNotif && listaNotificaciones.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500 text-center">Cargando...</p>
                  ) : listaNotificaciones.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500 text-center">Sin notificaciones</p>
                  ) : (
                    listaNotificaciones.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleMarkAsRead(n)}
                        className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          !n.read ? 'bg-teal-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && (
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-[#2A9D8F] shrink-0" />
                          )}
                          <div className={`flex-1 min-w-0 ${n.read ? 'pl-4' : ''}`}>
                            <p className={`text-sm truncate ${!n.read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                              {n.text}
                            </p>
                            {n.detalle && n.detalle !== n.text && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.detalle}</p>
                            )}
                            {n.time && (
                              <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu trigger */}
          <div className="relative">
            <button
              ref={userMenuButtonRef}
              onClick={toggleUserMenu}
              className="flex items-center gap-2 lg:gap-3 p-1.5 rounded-lg transition-all hover:bg-slate-100 text-slate-700"
              aria-expanded={showUserMenu}
              aria-haspopup="true"
            >
              <UserAvatar initials={initials} size="sm" />
              <div className="hidden lg:block text-left max-w-[160px]">
                <p className="text-sm font-medium truncate text-slate-800">
                  {displayName}
                </p>
                <p className="text-xs truncate text-slate-500">
                  {formattedRole}
                </p>
              </div>
              <ChevronDown 
                size={14} 
                className={`hidden lg:block transition-transform text-slate-500 ${showUserMenu ? 'rotate-180' : ''}`} 
              />
            </button>

            <UserMenuDropdown
              userInfo={userInfo}
              showUserMenu={showUserMenu}
              setShowUserMenu={setShowUserMenu}
              handleLogout={handleLogout}
              userMenuRef={userMenuRef}
              navigate={navigate}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);
