// pages/Login_administrativo.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IdCard, Lock, AlertCircle, Shield, Eye, EyeOff, ArrowRight, UserPlus, Loader2 } from "lucide-react";
import Swal from 'sweetalert2';
import usuarioAPI from '../services/api_usuario';
import { formatCedulaInput } from '../utils/inputFormat';
import { rutaInicioSesion } from '../utils/roles';

const Login_administrativo = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    cedula_usuario: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [adminExiste, setAdminExiste] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
    
    const init = async () => {
      try {
        const res = await usuarioAPI.adminExists();
        const existe = res.success ? !!res.data?.existe : true;
        setAdminExiste(existe);

        if (!existe) {
          // Sin administrador: forzar registro inicial
          navigate('/Registro-administrador', { replace: true });
          return;
        }
      } catch (_) {
        setAdminExiste(true);
      } finally {
        setCheckingAdmin(false);
      }

      if (usuarioAPI.isAuthenticated()) {
        const user = usuarioAPI.getCurrentUser();
        if (user) {
          const nombreRol = String(user.nombre_rol || user.rol || '').toLowerCase().trim();
          if (nombreRol !== 'emprendedor') {
            navigate(rutaInicioSesion(user), { replace: true });
          } else {
            usuarioAPI.logout();
            showAccessDeniedAlert();
          }
        }
      }
    };

    init();
  }, [navigate]);

  const showErrorAlert = (message) => {
    const isCredenciales = /credencial/i.test(message || '');
    Swal.fire({
      icon: 'error',
      title: isCredenciales ? 'Credenciales incorrectas' : 'Error de autenticación',
      text: message || 'Credenciales incorrectas',
      confirmButtonColor: '#1a3542',
      confirmButtonText: 'Intentar de nuevo',
      timer: 5000,
      timerProgressBar: true,
      background: '#fff',
      backdrop: `rgba(26,53,66,0.4)`
    });
  };

  const showValidationAlert = () => {
    Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      text: 'Por favor completa todos los campos para continuar',
      confirmButtonColor: '#1a3542',
      confirmButtonText: 'Ok',
      timer: 3000,
      background: '#fff'
    });
  };

  const showAccessDeniedAlert = () => {
    Swal.fire({
      icon: 'error',
      title: 'Acceso Denegado',
      text: 'Los emprendedores no tienen acceso al panel administrativo',
      confirmButtonColor: '#1a3542',
      confirmButtonText: 'Entendido',
      timer: 4000,
      timerProgressBar: true,
      background: '#fff'
    });
    setLoginError("Acceso restringido. Solo personal administrativo.");
  };

  const showSuccessAlert = () => {
    Swal.fire({
      icon: 'success',
      title: '¡Bienvenido!',
      text: 'Acceso concedido al panel administrativo',
      confirmButtonColor: '#1a3542',
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
      background: '#fff'
    });
  };

  const showInvalidFormatAlert = () => {
    Swal.fire({
      icon: 'warning',
      title: 'Formato inválido',
      text: 'El formato de cédula no es válido. Use solo números y la letra V/E',
      confirmButtonColor: '#1a3542',
      confirmButtonText: 'Corregir',
      timer: 4000,
      background: '#fff'
    });
  };

  const showServerErrorAlert = () => {
    Swal.fire({
      icon: 'error',
      title: 'Error del servidor',
      text: 'No se pudo conectar con el servidor. Intente más tarde',
      confirmButtonColor: '#1a3542',
      confirmButtonText: 'Intentar de nuevo',
      background: '#fff'
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "cedula_usuario") {
      setFormData(prev => ({ ...prev, [name]: formatCedulaInput(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cedula_usuario || !formData.password) {
      showValidationAlert();
      setLoginError("Por favor completa todos los campos");
      return;
    }
    
    const cedulaRegex = /^[\dVEve-]+$/;
    if (!cedulaRegex.test(formData.cedula_usuario)) {
      showInvalidFormatAlert();
      setLoginError("Formato de cédula inválido");
      return;
    }
    
    setIsLoading(true);
    setLoginError("");
    
    try {
      const response = await usuarioAPI.login(formData.cedula_usuario, formData.password);
      
      if (response.success) {
        const user = response.data;
        const nombreRol = String(user.nombre_rol || user.rol || '').toLowerCase().trim();
        const esEmprendedor = nombreRol === 'emprendedor';
        
        if (!esEmprendedor) {
          showSuccessAlert();
          setTimeout(() => {
            navigate(rutaInicioSesion(user), { replace: true });
          }, 1500);
        } else {
          usuarioAPI.logout();
          showAccessDeniedAlert();
          setLoginError("Acceso restringido. Los emprendedores no pueden acceder al panel administrativo.");
        }
      } else {
        const errorMessage = response.error || response.message || "Credenciales incorrectas";
        showErrorAlert(errorMessage);
        setLoginError(errorMessage);
        setFormData((prev) => ({ ...prev, password: "" }));
      }
    } catch (error) {
      console.error("Error de login administrativo:", error);
      
      const status = error.response?.status;
      let errorMessage = "Error al conectar con el servidor";
      
      if (status === 401) {
        errorMessage = error.response?.data?.error || "Credenciales incorrectas";
        showErrorAlert(errorMessage);
      } else if (status === 403) {
        errorMessage = error.response?.data?.error || "Usuario inactivo o bloqueado";
        showErrorAlert(errorMessage);
      } else if (status === 500) {
        errorMessage = "Error del servidor. Intente más tarde";
        showServerErrorAlert();
      } else if (error.error) {
        errorMessage = error.error;
        showErrorAlert(errorMessage);
      } else {
        showErrorAlert(errorMessage);
      }
      
      setLoginError(errorMessage);
      setFormData((prev) => ({ ...prev, password: "" }));
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3542] to-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="animate-spin" size={22} />
          <span className="text-sm">Verificando sistema...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a3542] to-white flex items-center justify-center p-4">
      <div className={`
        bg-white rounded-2xl shadow-xl w-full max-w-md
        transform transition-all duration-700 ease-out
        border border-gray-100
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
      `}>
        <div className="bg-gradient-to-r from-[#1a3542] to-[#264653] px-4 sm:px-8 py-5 sm:py-6 rounded-t-2xl">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-white/10 p-3 rounded-xl shrink-0">
              <Shield size={28} className="text-white" />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-white">IADEY</h2>
              <p className="text-white/80 text-sm">Panel Administrativo</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {!adminExiste && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800 mb-3">
                No hay un administrador registrado. Debes crear el primer administrador para usar el sistema.
              </p>
              <button
                type="button"
                onClick={() => navigate('/Registro-administrador')}
                className="w-full flex items-center justify-center gap-2 bg-[#1a3542] text-white py-2.5 rounded-lg text-sm font-medium"
              >
                <UserPlus size={16} />
                Registrar administrador
              </button>
            </div>
          )}

          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-1">
              Acceso Administrativo
            </h3>
            <p className="text-gray-500 text-sm">
              Ingresa tus credenciales de personal autorizado
            </p>
          </div>

          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Cédula de Identidad
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IdCard size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="cedula_usuario"
                  value={formData.cedula_usuario}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg
                    focus:outline-none focus:border-[#1a3542] focus:ring-2 focus:ring-[#1a3542]/20
                    transition-all duration-200 bg-white
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="V-12345678"
                  maxLength={10}
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg
                    focus:outline-none focus:border-[#1a3542] focus:ring-2 focus:ring-[#1a3542]/20
                    transition-all duration-200 bg-white
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#1a3542] transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/solicitar-recuperacion?origen=admin")}
                className="text-sm text-[#1a3542] hover:text-[#264653] font-medium 
                  transition-colors duration-200 flex items-center gap-1 group"
              >
                ¿Olvidaste tu contraseña?
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#1a3542] to-[#264653] text-white py-2.5 rounded-lg font-medium
                hover:from-[#264653] hover:to-[#1a3542]
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verificando acceso...</span>
                </div>
              ) : (
                'Acceder al Panel'
              )}
            </button>
          </form>
          
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 text-center">
              <Shield size={12} className="inline mr-1" />
              Área restringida. Solo personal autorizado. No hay registro público de otros usuarios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login_administrativo;
