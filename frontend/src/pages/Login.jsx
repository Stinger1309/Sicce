// pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IdCard,
  Lock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import Swal from 'sweetalert2';
import usuarioAPI from "../services/api_usuario";
import { formatCedulaInput, validateCedulaFormat } from "../utils/inputFormat";
import { rutaInicioSesion } from "../utils/roles";

const Login = () => {
  const navigate = useNavigate();

  // ==================== ESTADOS ====================
  const [formData, setFormData] = useState({
    cedula_usuario: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({
    cedula: "",
    password: "",
  });

  // ==================== EFECTOS ====================
  useEffect(() => {
    setIsVisible(true);

    // Verificar si ya está autenticado
    if (usuarioAPI.isAuthenticated()) {
      const user = usuarioAPI.getCurrentUser();
      if (user) {
        const nombreRol = String(user.nombre_rol || user.rol || '').toLowerCase().trim();
        if (nombreRol === 'emprendedor') {
          navigate(rutaInicioSesion(user), { replace: true });
        } else {
          usuarioAPI.logout();
          Swal.fire({
            icon: 'warning',
            title: 'Acceso restringido',
            text: 'Solo los emprendedores pueden acceder al sistema',
            confirmButtonColor: '#264653',
            confirmButtonText: 'Entendido'
          });
        }
      }
    }
  }, [navigate]);

  // ==================== VALIDACIONES ====================
  const hasSpaces = (str) => /\s/.test(str);

  const validatePassword = (password) => {
    if (password.length < 6) {
      return {
        valid: false,
        message: "La contraseña debe tener al menos 6 caracteres",
      };
    }
    if (hasSpaces(password)) {
      return {
        valid: false,
        message: "La contraseña no puede contener espacios",
      };
    }
    return { valid: true };
  };

  // ==================== MANEJADORES ====================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFieldErrors((prev) => ({
      ...prev,
      [name === "cedula_usuario" ? "cedula" : "password"]: "",
    }));
    setLoginError("");

    if (name === "cedula_usuario") {
      setFormData((prev) => ({
        ...prev,
        cedula_usuario: formatCedulaInput(value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    if (name === "cedula_usuario" && value) {
      const formattedValue = formatCedulaInput(value);
      if (formattedValue !== value) {
        setFormData((prev) => ({ ...prev, cedula_usuario: formattedValue }));
      }
      
      const validation = validateCedulaFormat(formattedValue || value);
      if (!validation.valid) {
        setFieldErrors((prev) => ({ ...prev, cedula: validation.message }));
      }
    }

    if (name === "password" && value) {
      const validation = validatePassword(value);
      if (!validation.valid) {
        setFieldErrors((prev) => ({ ...prev, password: validation.message }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reiniciar errores
    setFieldErrors({ cedula: "", password: "" });
    setLoginError("");

    // Validar campos vacíos
    if (!formData.cedula_usuario || !formData.password) {
      const message =
        !formData.cedula_usuario && !formData.password
          ? "Por favor completa todos los campos"
          : !formData.cedula_usuario
          ? "Por favor ingresa tu cédula de identidad"
          : "Por favor ingresa tu contraseña";

      setLoginError(message);

      if (!formData.cedula_usuario) {
        setFieldErrors((prev) => ({ ...prev, cedula: "Campo requerido" }));
      }
      if (!formData.password) {
        setFieldErrors((prev) => ({ ...prev, password: "Campo requerido" }));
      }
      return;
    }

    // Validar cédula
    const cedulaValidation = validateCedulaFormat(formData.cedula_usuario);
    if (!cedulaValidation.valid) {
      setFieldErrors((prev) => ({ ...prev, cedula: cedulaValidation.message }));
      setLoginError(cedulaValidation.message);
      return;
    }

    // Validar contraseña
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      setFieldErrors((prev) => ({ ...prev, password: passwordValidation.message }));
      setLoginError(passwordValidation.message);
      return;
    }

    setIsLoading(true);

    try {
      const response = await usuarioAPI.login(formData.cedula_usuario, formData.password);
      
      // Verificar si success es true
      if (response && response.success === true) {
        // Obtener el usuario guardado
        const storedUser = usuarioAPI.getCurrentUser();
        
        // Solo permitir rol Emprendedor
        const nombreRol = String(storedUser?.nombre_rol || storedUser?.rol || '').toLowerCase().trim();
        if (storedUser && nombreRol === 'emprendedor') {
          // Es emprendedor, permitir acceso
          await Swal.fire({
            icon: 'success',
            title: '¡Bienvenido Emprendedor!',
            text: 'Has iniciado sesión correctamente',
            confirmButtonColor: '#264653',
            confirmButtonText: 'Continuar',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: true,
            allowOutsideClick: false
          });
          
          setTimeout(() => {
            navigate(rutaInicioSesion(storedUser), { replace: true });
          }, 500);
        } else {
          // No es emprendedor, mostrar error y cerrar sesión
          usuarioAPI.logout();
          
          await Swal.fire({
            icon: 'error',
            title: 'Acceso restringido',
            text: 'Solo los emprendedores pueden acceder al sistema',
            confirmButtonColor: '#264653',
            confirmButtonText: 'Entendido'
          });
          
          setLoginError('Acceso restringido. Solo emprendedores pueden ingresar.');
          setFormData((prev) => ({ ...prev, password: "" }));
          setIsLoading(false);
        }
      } else {
        // Credenciales incorrectas o error del servidor
        const errorMessage =
          response?.error ||
          response?.message ||
          "Credenciales incorrectas";
        
        await Swal.fire({
          icon: 'error',
          title: 'Credenciales incorrectas',
          text: errorMessage,
          confirmButtonColor: '#264653',
          confirmButtonText: 'Intentar de nuevo',
        });
        
        setLoginError(errorMessage);
        setFormData((prev) => ({ ...prev, password: "" }));
        setIsLoading(false);
      }
    } catch (error) {
      // Errores graves de red o servidor
      console.error("Error grave en login:", error);

      const status = error.response?.status;
      const apiMsg = error.response?.data?.error || error.response?.data?.message;
      const isAuthError = status === 401 || status === 403;
      const errorMessage = isAuthError
        ? (apiMsg || "Credenciales incorrectas")
        : (apiMsg || "Error de conexión. Verifica tu conexión a internet.");
      
      await Swal.fire({
        icon: 'error',
        title: isAuthError ? 'Credenciales incorrectas' : 'Error de conexión',
        text: errorMessage,
        confirmButtonColor: '#264653',
        confirmButtonText: 'Reintentar',
      });
      
      setLoginError(errorMessage);
      setFormData((prev) => ({ ...prev, password: "" }));
      setIsLoading(false);
    }
  };

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#264653] to-white flex items-center justify-center p-4">
      <div
        className={`
          bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-100
          transform transition-all duration-700 ease-out
          ${isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}
        `}
      >
        {/* Header */}
        <div className="bg-[#264653] px-4 sm:px-8 py-5 sm:py-6 rounded-t-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
            <div className="bg-white/10 p-3 rounded-xl shrink-0">
              <User size={28} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Inicio de Sesión</h2>
              <p className="text-white/80 text-xs sm:text-sm break-anywhere">
                Instituto Autónomo del Desarrollo Económico del Estado Yaracuy
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-8">
          {/* Mensaje de error inline */}
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">{loginError}</p>
                {(loginError === "Credenciales incorrectas" ||
                  loginError === "Las credenciales son incorrectas" ||
                  /credencial/i.test(loginError)) && (
                  <p className="text-xs text-red-600 mt-1">
                    Verifica tu cédula y contraseña e intenta nuevamente
                  </p>
                )}
                {loginError.includes("Acceso restringido") && (
                  <p className="text-xs text-red-600 mt-1">
                    Solo los emprendedores pueden acceder al sistema
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo: Cédula */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Cédula de Identidad
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IdCard
                    size={18}
                    className={fieldErrors.cedula ? "text-red-400" : "text-gray-400"}
                  />
                </div>
                <input
                  type="text"
                  name="cedula_usuario"
                  value={formData.cedula_usuario}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`
                    w-full pl-10 pr-3 py-2.5 border rounded-lg
                    focus:outline-none focus:ring-2 transition-all duration-200 bg-white
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      fieldErrors.cedula
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-[#264653] focus:ring-[#264653]/20"
                    }
                  `}
                  placeholder="V-12345678"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
              {fieldErrors.cedula ? (
                <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fieldErrors.cedula}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1 ml-1">
                  V para Venezolano | E para Extranjero | Solo números sin prefijo
                </p>
              )}
            </div>

            {/* Campo: Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock
                    size={18}
                    className={fieldErrors.password ? "text-red-400" : "text-gray-400"}
                  />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`
                    w-full pl-10 pr-10 py-2.5 border rounded-lg
                    focus:outline-none focus:ring-2 transition-all duration-200 bg-white
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      fieldErrors.password
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-[#264653] focus:ring-[#264653]/20"
                    }
                  `}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#264653] transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fieldErrors.password}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1 ml-1">
                  Mínimo 6 caracteres, sin espacios
                </p>
              )}
            </div>

            {/* Botón de inicio de sesión */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#264653] text-white py-2.5 rounded-lg font-medium
                hover:bg-[#1a3542] active:bg-[#0f232e]
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                shadow-sm hover:shadow"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Verificando credenciales...</span>
                </div>
              ) : (
                "Iniciar Sesión"
              )}
            </button>

            {/* Registro */}
            <p className="text-center text-gray-600 text-sm mt-6">
              ¿No tienes una cuenta?{" "}
              <button
                type="button"
                onClick={() => navigate("/registro-emprendedor")}
                className="text-[#264653] font-semibold hover:text-[#2A9D8F] transition-colors"
              >
                Regístrate aquí
              </button>
            </p>

<div className="text-center mt-4">
    <button
        type="button"
        onClick={() => navigate('/solicitar-recuperacion?origen=emprendedor')}
        className="text-sm text-[#264653] hover:text-[#2A9D8F] transition-colors"
    >
        ¿Olvidaste tu contraseña?
    </button>
</div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;