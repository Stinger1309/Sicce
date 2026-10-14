import React, { useEffect } from 'react';
import { LogOut, ShieldCheck, ArrowLeft, CheckCircle } from 'lucide-react';
import usuarioAPI from '../services/api_usuario';

const CierreSesion = () => {
  useEffect(() => {
    // Asegurar limpieza total por si el logout previo fue incompleto
    usuarioAPI.logout();
  }, []);

  const handleVolverInicio = () => {
    window.location.href = '/';
  };

  // Patrón de fondo como variable
  const patternStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Fondo con efecto de gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] opacity-90"></div>
      
      {/* Patrón de fondo con estilo inline */}
      <div 
        className="absolute inset-0"
        style={patternStyle}
      ></div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Tarjeta principal con efecto glassmorphism */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          
          {/* Cabecera minimalista */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-white/10">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-white font-bold text-2xl tracking-wider">I</span>
              </div>
            </div>
            <h1 className="text-white text-2xl font-light tracking-widest">
              IADEV
            </h1>
            <p className="text-white/60 text-xs font-light tracking-wider mt-1">
              YARACUY · VENEZUELA
            </p>
          </div>

          {/* Cuerpo principal */}
          <div className="px-8 py-8 text-center">
            {/* Icono de cierre con animación */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-5 rounded-full border border-white/20 backdrop-blur-sm">
                <LogOut className="w-14 h-14 text-white" strokeWidth={1.5} />
              </div>
            </div>

            {/* Título */}
            <h2 className="text-3xl font-light text-white mb-2 tracking-wide">
              Sesión cerrada
            </h2>

            {/* Badge de seguridad */}
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-300 bg-emerald-500/20 rounded-full px-4 py-1 w-fit mx-auto mb-6 border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-light tracking-wider">CIERRE SEGURO</span>
            </div>

            {/* Mensaje principal con diseño moderno */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-white/10">
              <div className="flex items-start gap-3 text-left">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white/90 text-sm font-light leading-relaxed">
                    Has cerrado sesión correctamente.
                  </p>
                  <p className="text-white/60 text-xs font-light leading-relaxed mt-2">
                    Gracias por confiar en nosotros. Te esperamos pronto para seguir construyendo el futuro de Yaracuy.
                  </p>
                </div>
              </div>
            </div>

            {/* Valores institucionales en formato moderno */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {['Justicia Social', 'Democracia', 'Eficiencia', 'Solidaridad'].map((valor) => (
                <div key={valor} className="bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                  <span className="text-white/50 text-[10px] font-light tracking-wider uppercase">
                    {valor}
                  </span>
                </div>
              ))}
            </div>

            {/* Botón de acción con efecto moderno */}
            <button
              onClick={handleVolverInicio}
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 p-[1px] hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300"
            >
              <div className="relative bg-[#0a0a0a] rounded-2xl px-6 py-3.5 transition-all duration-300 group-hover:bg-transparent">
                <span className="relative flex items-center justify-center gap-2 text-white font-light tracking-wider group-hover:text-white">
                  <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                  Volver al inicio
                </span>
              </div>
            </button>

            {/* Footer minimalista */}
            <p className="text-white/30 text-[10px] font-light tracking-wider mt-6">
              © {new Date().getFullYear()} IADEV · Todos los derechos reservados
            </p>
          </div>
        </div>

        {/* Elementos decorativos */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};

export default CierreSesion;