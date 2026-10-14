import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import recuperacionAPI from '../services/api_recuperacion'; // 👈 CAMBIADO

const CambiarContrasena = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = useState('');
    const [codigo, setCodigo] = useState('');
    const [formData, setFormData] = useState({
        nueva_clave: '',
        confirmar_clave: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tokenParam = params.get('token');
        const codigoParam = params.get('codigo');
        
        if (!tokenParam || !codigoParam) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Datos de verificación incompletos',
                confirmButtonColor: '#264653'
            }).then(() => {
                const origen = params.get('origen') === 'admin' ? 'admin' : 'emprendedor';
                navigate(`/solicitar-recuperacion?origen=${origen}`);
            });
            return;
        }
        
        setToken(tokenParam);
        setCodigo(codigoParam);
    }, [location, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const { nueva_clave, confirmar_clave } = formData;

        if (nueva_clave.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (nueva_clave !== confirmar_clave) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (/\s/.test(nueva_clave)) {
            setError('La contraseña no puede contener espacios');
            return;
        }

        setIsLoading(true);

        try {
            // 👇 USANDO LA FUNCIÓN CORRECTA
            const response = await recuperacionAPI.cambiarContrasena(token, codigo, nueva_clave);

            if (response.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Contraseña actualizada!',
                    text: 'Tu contraseña ha sido cambiada exitosamente',
                    confirmButtonColor: '#264653',
                    confirmButtonText: 'Iniciar sesión'
                });
                
                navigate(new URLSearchParams(location.search).get('origen') === 'admin' ? '/Login_administrativo' : '/Login');
            } else {
                throw new Error(response.error || 'Error al cambiar la contraseña');
            }
        } catch (error) {
            console.error('Error:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Error al cambiar la contraseña';
            setError(errorMsg);
            
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMsg,
                confirmButtonColor: '#264653'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const hasUpperCase = (str) => /[A-Z]/.test(str);
    const hasLowerCase = (str) => /[a-z]/.test(str);
    const hasNumber = (str) => /[0-9]/.test(str);
    const isLongEnough = (str) => str.length >= 6;

    const getPasswordStrength = (password) => {
        let strength = 0;
        if (isLongEnough(password)) strength++;
        if (hasUpperCase(password)) strength++;
        if (hasLowerCase(password)) strength++;
        if (hasNumber(password)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(formData.nueva_clave);
    const getStrengthLabel = () => {
        if (passwordStrength <= 1) return { label: 'Débil', color: 'text-red-500' };
        if (passwordStrength === 2) return { label: 'Media', color: 'text-yellow-500' };
        if (passwordStrength === 3) return { label: 'Fuerte', color: 'text-green-500' };
        return { label: 'Muy fuerte', color: 'text-green-600' };
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#264653] to-white flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-100 p-8">
                <div className="text-center mb-8">
                    <div className="bg-[#264653]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} className="text-[#264653]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#264653]">Nueva Contraseña</h2>
                    <p className="text-gray-600 text-sm mt-2">
                        Crea una nueva contraseña para tu cuenta
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nueva Contraseña
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={18} className="text-gray-400" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="nueva_clave"
                                value={formData.nueva_clave}
                                onChange={handleChange}
                                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg
                                    focus:outline-none focus:ring-2 focus:ring-[#264653] focus:border-transparent
                                    transition-all duration-200"
                                placeholder="Mínimo 6 caracteres"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#264653] transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        
                        {formData.nueva_clave && (
                            <div className="mt-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div
                                            key={level}
                                            className={`
                                                h-1 flex-1 rounded-full transition-all duration-300
                                                ${level <= passwordStrength 
                                                    ? 'bg-[#264653]' 
                                                    : 'bg-gray-200'}
                                            `}
                                        />
                                    ))}
                                </div>
                                <p className={`text-xs mt-1 ${getStrengthLabel().color}`}>
                                    Fortaleza: {getStrengthLabel().label}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Confirmar Contraseña
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={18} className="text-gray-400" />
                            </div>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmar_clave"
                                value={formData.confirmar_clave}
                                onChange={handleChange}
                                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg
                                    focus:outline-none focus:ring-2 focus:ring-[#264653] focus:border-transparent
                                    transition-all duration-200"
                                placeholder="Confirma tu nueva contraseña"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#264653] transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {formData.confirmar_clave && formData.nueva_clave !== formData.confirmar_clave && (
                            <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                        )}
                        {formData.confirmar_clave && formData.nueva_clave === formData.confirmar_clave && formData.nueva_clave.length >= 6 && (
                            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                                <CheckCircle size={12} />
                                Las contraseñas coinciden
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#264653] text-white py-2.5 rounded-lg font-medium
                            hover:bg-[#1a3542] transition-all duration-200 disabled:opacity-50
                            disabled:cursor-not-allowed shadow-sm hover:shadow"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                                <span>Actualizando...</span>
                            </div>
                        ) : (
                            'Cambiar contraseña'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CambiarContrasena;