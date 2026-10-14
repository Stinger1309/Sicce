// App.js
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Recuperacion de contraseña
import SolicitarRecuperacion from './pages/SolicitarRecuperacion';
import VerificarCodigo from './pages/VerificarCodigo';
import CambiarContrasena from './pages/CambiarContrasena';

// Importación de páginas
import Cierre_sesion from './pages/Cierre_sesion.jsx';
import Index from "./pages/Index";
import Login from "./pages/Login";
import Login_administrativo from './pages/Login_administrativo.jsx';
import Dashboard from "./pages/Dashboard";
import Solicitud from "./pages/Solicitud.jsx";
import Expediente from "./pages/Expediente.jsx";
import Inspeccion from "./pages/Inspeccion.jsx";
import Aprobacion from "./pages/Aprobacion.jsx";
import Bancarios from "./pages/Bancarios.jsx";
import Contrato from "./pages/Contrato.jsx";
import RegistroEmprendedor from "./pages/Registro-emprendedor.jsx";
import Desembolso from "./pages/Desembolso.jsx";
import Cuota from "./pages/Cuota.jsx";

//Configuaciones de sistema
import Usuario from "./pages/Usuario.jsx";
import Roles from "./pages/Roles.jsx";
import Clasificacion_emprendimiento from "./pages/Clasificacion_emprendimiento.jsx";
import Configuracion_requisitos from "./pages/Configuracion_requisitos.jsx";
import Configuracion_contrato from "./pages/Configuracion_contrato.jsx";
import Auditoria from "./pages/Auditoria.jsx";
import Respaldo from "./pages/Respaldo.jsx";
import RegistroAdministrador from "./pages/Registro-administrador.jsx";
import Graficos from "./pages/Graficos.jsx";
import GestionBancos from "./pages/GestionBancos.jsx";
import Citas from "./pages/Citas.jsx";

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const raw =
    sessionStorage.getItem('usuario') ||
    sessionStorage.getItem('user');
  let user = null;
  try {
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }
  
  if (!user) {
    return <Navigate to="/Login" replace />;
  }
  
  return children;
};

function App() {
  const [user, setUser] = useState(null);

  // Verificar sesión de esta pestaña (sessionStorage) al cargar
  useEffect(() => {
    try {
      // Limpiar restos viejos en localStorage (no rehidratar)
      ['usuario', 'user', 'token', 'userRole', 'userId', 'rememberToken'].forEach((k) => {
        localStorage.removeItem(k);
      });
      const storedUser = sessionStorage.getItem('usuario') || sessionStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <Router>
      <Routes>

        {/* Recuperar contraseña */}
        <Route path="/solicitar-recuperacion" element={<SolicitarRecuperacion />} />
        <Route path="/verificar-codigo" element={<VerificarCodigo />} />
        <Route path="/cambiar-contrasena" element={<CambiarContrasena />} />

        {/* Rutas públicas */}
        <Route path="/" element={<Index />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/Cierre_sesion" element={<Cierre_sesion />} />
        <Route path="/Login_administrativo" element={<Login_administrativo />} />
        <Route path="/Registro-administrador" element={<RegistroAdministrador />} />
        <Route path="/Dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/Solicitud" element={<ProtectedRoute><Solicitud /></ProtectedRoute>} />
        <Route path="/Expediente" element={<ProtectedRoute><Expediente /></ProtectedRoute>} />
        <Route path="/Inspeccion" element={<ProtectedRoute><Inspeccion /></ProtectedRoute>} />
        <Route path="/Aprobacion" element={<ProtectedRoute><Aprobacion /></ProtectedRoute>} />
        <Route path="/Citas" element={<ProtectedRoute><Citas /></ProtectedRoute>} />
        <Route path="/Bancarios" element={<ProtectedRoute><Bancarios /></ProtectedRoute>} />
        <Route path="/Contrato" element={<ProtectedRoute><Contrato /></ProtectedRoute>} />
        <Route path="/Registro-emprendedor" element={<RegistroEmprendedor />} />
        <Route path="/Desembolso" element={<ProtectedRoute><Desembolso /></ProtectedRoute>} />
        <Route path="/Cuota" element={<ProtectedRoute><Cuota/></ProtectedRoute>} />

        {/*Configuarion del sistema */}
        <Route path="/Usuario" element={<ProtectedRoute><Usuario /></ProtectedRoute>} />
        <Route path="/Roles" element={<ProtectedRoute><Roles /></ProtectedRoute>} />
        <Route path="/Clasificacion_emprendimiento" element={<ProtectedRoute><Clasificacion_emprendimiento /></ProtectedRoute>} />
        <Route path="/Configuracion_requisitos" element={<ProtectedRoute><Configuracion_requisitos /></ProtectedRoute>} />
        <Route path="/Configuracion_contrato" element={<ProtectedRoute><Configuracion_contrato /></ProtectedRoute>} />
        <Route path="/Auditoria" element={<ProtectedRoute><Auditoria /></ProtectedRoute>} />
        <Route path="/Respaldo" element={<ProtectedRoute><Respaldo /></ProtectedRoute>} />
        <Route path="/Graficos" element={<ProtectedRoute><Graficos /></ProtectedRoute>} />
        <Route path="/GestionBancos" element={<ProtectedRoute><GestionBancos /></ProtectedRoute>} />

      </Routes>
    </Router>
  );
}

export default App;