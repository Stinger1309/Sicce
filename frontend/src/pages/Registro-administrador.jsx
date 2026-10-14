import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, IdCard, Lock, User, Mail, Phone, Eye, EyeOff,
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Home
} from 'lucide-react';
import Swal from 'sweetalert2';
import usuarioAPI from '../services/api_usuario';

const RegistroAdministrador = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    nacionalidad: 'V',
    cedula: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    telefono: '',
    correo: '',
    estado_civil: 'Soltero',
    direccion: '',
    estado: 'Yaracuy',
    municipio: '',
    parroquia: '',
    clave: '',
    confirmar_clave: ''
  });

  useEffect(() => {
    setIsVisible(true);
    (async () => {
      try {
        const res = await usuarioAPI.adminExists();
        if (res.success && res.data?.existe) {
          await Swal.fire({
            icon: 'info',
            title: 'Registro no disponible',
            text: 'Ya existe un administrador. Inicia sesión con tus credenciales.',
            confirmButtonColor: '#1a3542'
          });
          navigate('/Login_administrativo', { replace: true });
          return;
        }
      } catch (_) {
        /* si falla la verificación, permitir intentar el registro (el backend bloqueará) */
      } finally {
        setChecking(false);
      }
    })();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'cedula') v = value.replace(/\D/g, '').slice(0, 8);
    if (name === 'nombres' || name === 'apellidos') v = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (name === 'telefono') v = value.replace(/[^\d-]/g, '').slice(0, 12);
    if (name === 'correo') v = value.toLowerCase().trim();
    setForm(prev => ({ ...prev, [name]: v }));
    setError('');
  };

  const validarPaso1 = () => {
    if (!form.cedula || form.cedula.length < 6) {
      setError('Ingresa una cédula válida (mínimo 6 dígitos)');
      return false;
    }
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      setError('Nombres y apellidos son obligatorios');
      return false;
    }
    if (!form.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
      setError('Ingresa un correo electrónico válido');
      return false;
    }
    if (!form.telefono) {
      setError('El teléfono es obligatorio');
      return false;
    }
    return true;
  };

  const validarPaso2 = () => {
    if (form.clave.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (/\s/.test(form.clave)) {
      setError('La contraseña no puede contener espacios');
      return false;
    }
    if (form.clave !== form.confirmar_clave) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validarPaso1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarPaso2()) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await usuarioAPI.registrarPrimerAdmin({
        ...form,
        cedula: `${form.nacionalidad}-${form.cedula}`,
        nacionalidad: form.nacionalidad
      });

      if (!res.success) {
        throw new Error(res.error || 'No se pudo registrar el administrador');
      }

      await Swal.fire({
        icon: 'success',
        title: '¡Administrador creado!',
        text: 'Ya puedes iniciar sesión en el panel administrativo.',
        confirmButtonColor: '#1a3542',
        confirmButtonText: 'Ir al login'
      });

      navigate('/Login_administrativo', { replace: true });
    } catch (err) {
      const msg = err.message || 'Error al registrar';
      setError(msg);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg,
        confirmButtonColor: '#1a3542'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a3542] to-white flex items-center justify-center">
        <div className="text-white text-sm">Verificando sistema...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a3542] to-white flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="bg-gradient-to-r from-[#1a3542] to-[#264653] px-8 py-6 rounded-t-2xl">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-white/10 p-3 rounded-xl">
              <Shield size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">IADEY</h2>
              <p className="text-white/80 text-sm">Registro del Administrador</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-[#1a3542]' : 'bg-gray-200'}`} />
              <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-[#1a3542]' : 'bg-gray-200'}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              {step === 1 ? 'Datos personales' : 'Credenciales de acceso'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Configuración inicial del sistema. Solo se permite un registro público de administrador.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nac.</label>
                  <select
                    name="nacionalidad"
                    value={form.nacionalidad}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3542]/20 focus:border-[#1a3542]"
                  >
                    <option value="V">V</option>
                    <option value="E">E</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                  <div className="relative">
                    <IdCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="cedula"
                      value={form.cedula}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3542]/20 focus:border-[#1a3542]"
                      placeholder="12345678"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="nombres"
                      value={form.nombres}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3542]/20 focus:border-[#1a3542]"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                  <input
                    name="apellidos"
                    value={form.apellidos}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3542]/20 focus:border-[#1a3542]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      name="correo"
                      value={form.correo}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3542]/20 focus:border-[#1a3542]"
                      placeholder="admin@iadey.gob.ve"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3542]/20 focus:border-[#1a3542]"
                      placeholder="0412-1234567"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={form.fecha_nacimiento}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3542]/20 focus:border-[#1a3542]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <div className="relative">
                  <Home size={16} className="absolute left-3 top-3 text-gray-400" />
                  <textarea
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    rows={2}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3542]/20 focus:border-[#1a3542]"
                    placeholder="Dirección de residencia"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#1a3542] to-[#264653] text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-95"
              >
                Continuar
                <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="clave"
                    value={form.clave}
                    onChange={handleChange}
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3542]/20 focus:border-[#1a3542]"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmar_clave"
                    value={form.confirmar_clave}
                    onChange={handleChange}
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3542]/20 focus:border-[#1a3542]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-800 flex gap-2">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                Se creará el rol Administrador con acceso completo al sistema.
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
                >
                  <ArrowLeft size={18} />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-[#1a3542] to-[#264653] text-white py-2.5 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Registrando...' : 'Crear administrador'}
                </button>
              </div>
            </form>
          )}

          <button
            type="button"
            onClick={() => navigate('/Login_administrativo')}
            className="mt-6 w-full text-sm text-[#1a3542] hover:underline flex items-center justify-center gap-1"
          >
            <ArrowLeft size={14} />
            Volver al login administrativo
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistroAdministrador;
