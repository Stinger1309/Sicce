import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import recuperacionAPI from '../services/api_recuperacion'; // 👈 CAMBIADO

const VerificarCodigo = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [token, setToken] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);
    const inputRefs = useRef([]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tokenParam = params.get('token');
        
        if (!tokenParam) {
            const origen = params.get('origen') === 'admin' ? 'admin' : 'emprendedor';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Token no válido',
                confirmButtonColor: '#264653'
            }).then(() => navigate(`/solicitar-recuperacion?origen=${origen}`));
            return;
        }
        
        setToken(tokenParam);
    }, [location, navigate]);

    useEffect(() => {
        if (timeLeft <= 0) return;
        
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        
        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleInputChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        
        const newCodigo = [...codigo];
        newCodigo[index] = value.slice(0, 1);
        setCodigo(newCodigo);
        
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
        
        setError('');
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !codigo[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text');
        if (!/^\d{6}$/.test(paste)) return;
        
        const digits = paste.split('');
        setCodigo(digits);
        inputRefs.current[5]?.focus();
    };

    const handleVerify = async () => {
        const codigoCompleto = codigo.join('');
        
        if (codigoCompleto.length !== 6) {
            setError('Por favor ingresa el código de 6 dígitos');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // 👇 USANDO LA FUNCIÓN CORRECTA
            const response = await recuperacionAPI.verificarCodigo(token, codigoCompleto);

            if (response.success) {
                setSuccess(true);
                await Swal.fire({
                    icon: 'success',
                    title: '¡Código verificado!',
                    text: 'Ahora puedes crear una nueva contraseña',
                    confirmButtonColor: '#264653',
                    confirmButtonText: 'Continuar'
                });
                
                navigate(`/cambiar-contrasena?token=${token}&codigo=${codigoCompleto}&origen=${new URLSearchParams(location.search).get('origen') === 'admin' ? 'admin' : 'emprendedor'}`);
            } else {
                throw new Error(response.error || 'Código inválido');
            }
        } catch (error) {
            console.error('Error:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Código inválido';
            setError(errorMsg);
            
            await Swal.fire({
                icon: 'error',
                title: 'Código inválido',
                text: errorMsg,
                confirmButtonColor: '#264653'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            // 👇 USANDO LA FUNCIÓN CORRECTA
            const response = await recuperacionAPI.reenviarCodigo(token);
            
            if (response.success) {
                setTimeLeft(60);
                setCodigo(['', '', '', '', '', '']);
                setError('');
                await Swal.fire({
                    icon: 'success',
                    title: '¡Nuevo código enviado!',
                    text: 'Revisa tu correo electrónico (válido por 1 minuto)',
                    confirmButtonColor: '#264653',
                    timer: 3000
                });
            } else {
                throw new Error(response.error || 'Error al reenviar');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.error || error.message || 'No se pudo reenviar el código',
                confirmButtonColor: '#264653'
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#264653] to-white flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-100 p-8">
                <button
                    onClick={() => {
                        const origen = new URLSearchParams(location.search).get('origen') === 'admin' ? 'admin' : 'emprendedor';
                        navigate(`/solicitar-recuperacion?origen=${origen}`);
                    }}
                    className="flex items-center gap-2 text-[#264653] hover:text-[#2A9D8F] transition-colors mb-6"
                >
                    <ArrowLeft size={20} />
                    <span>Volver</span>
                </button>

                <div className="text-center mb-8">
                    <div className="bg-[#264653]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-[#264653]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#264653]">Verificar Código</h2>
                    <p className="text-gray-600 text-sm mt-2">
                        Ingresa el código de 6 dígitos enviado a tu correo
                    </p>
                    <div className="mt-2">
                        <p className="text-xs text-gray-500">
                            Tiempo restante: {' '}
                            <span className={`font-mono font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-[#264653]'}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </p>
                        {timeLeft <= 10 && timeLeft > 0 && (
                            <p className="text-xs text-red-500 mt-1 animate-pulse">
                                ⚠️ ¡El código expirará pronto!
                            </p>
                        )}
                        {timeLeft === 0 && (
                            <p className="text-xs text-red-500 mt-1">
                                ❌ El código ha expirado
                            </p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <div className="mb-6">
                    <div className="flex justify-center gap-2">
                        {codigo.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleInputChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className={`
                                    w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg
                                    focus:outline-none focus:ring-2 focus:border-transparent
                                    transition-all duration-200
                                    ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-[#264653]'}
                                    ${success ? 'border-green-500 bg-green-50' : ''}
                                `}
                                disabled={isLoading || timeLeft === 0}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-3">
                        Puedes pegar el código completo (Ctrl+V)
                    </p>
                </div>

                <button
                    onClick={handleVerify}
                    disabled={isLoading || timeLeft === 0}
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
                            <span>Verificando...</span>
                        </div>
                    ) : (
                        'Verificar código'
                    )}
                </button>

                <div className="mt-4 text-center">
                    <button
                        onClick={handleResend}
                        className={`
                            text-sm flex items-center justify-center gap-2 mx-auto
                            transition-colors
                            ${timeLeft > 0 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-[#264653] hover:text-[#2A9D8F]'}
                        `}
                        disabled={timeLeft > 0}
                    >
                        <RefreshCw size={16} />
                        {timeLeft > 0 ? (
                            `Espera ${formatTime(timeLeft)} para reenviar`
                        ) : (
                            'Reenviar código'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerificarCodigo;