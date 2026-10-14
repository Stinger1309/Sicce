// pages/Usuario.jsx

import React, { useState, useEffect, useMemo } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import { 
  Search,
  Plus, 
  Edit,
  Eye,
  EyeOff,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
  UserCheck,
  UserX,
  Shield,
  Lock,
  Unlock,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle,
  Trash2,
  Key,
  Activity,
  X,
  Loader2,
  Hash
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import ExportButtons from "../components/ExportButtons";
import personaAPI from "../services/api_persona";
import usuarioAPI from "../services/api_usuario";
import rolAPI from "../services/api_rol";
import areaAPI from "../services/api_area";
import { rolRequiereArea } from "../utils/roles";

const Usuario = () => {
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [rolesDB, setRolesDB] = useState([]);
  const [areasDB, setAreasDB] = useState([]);
  
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Bienvenido al sistema de gestión de usuarios", time: "ahora", read: false },
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("usuarios");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Estados para validaciones y UI
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Datos del backend
  const [usuarios, setUsuarios] = useState([]);
  
  // Dominios de correo
  const dominiosCorreo = [
    "gmail.com", "hotmail.com", "outlook.com", "yahoo.com",
    "yahoo.es", "outlook.es", "hotmail.es", "gmail.com.ve",
    "cantv.net", "movistar.com.ve", "digitel.com.ve", "iadey.gob.ve"
  ];

  // Datos geográficos de Yaracuy
  const municipiosYaracuy = [
    "Aristides Bastidas", "Bolívar", "Bruzual", "Cocorote",
    "Independencia", "José Antonio Páez", "La Trinidad", "Manuel Monge",
    "Nirgua", "Peña", "San Felipe", "Sucre", "Urachiche", "Veroes",
  ];

  const parroquiasPorMunicipio = {
    "Aristides Bastidas": ["San Pablo"],
    Bolívar: ["Aroa"],
    Bruzual: ["Chivacoa", "Campo Elías"],
    Cocorote: ["Cocorote"],
    Independencia: ["Independencia"],
    "José Antonio Páez": ["Sabana de Parra"],
    "La Trinidad": ["Boraure"],
    "Manuel Monge": ["Yumare"],
    Nirgua: ["Nirgua", "Salom", "Temerla"],
    Peña: ["Yaritagua", "San Andrés"],
    "San Felipe": ["San Felipe", "Albarico", "San Javier"],
    Sucre: ["Sucre"],
    Urachiche: ["Urachiche"],
    Veroes: ["Farriar", "El Farrial"],
  };

  // Formulario de usuario - USAMOS CÉDULA COMO IDENTIFICADOR
  const [formData, setFormData] = useState({
    cedula_original: "", // Guardamos la cédula original para identificar la persona
    nacionalidad: "V",
    cedula: "",
    nombres: "",
    apellidos: "",
    fecha_nacimiento: "",
    telefono: "",
    correo_local: "",
    correo_dominio: "",
    correo: "",
    estado_civil: "",
    direccion: "",
    estado: "Yaracuy",
    municipio: "",
    parroquia: "",
    tipo_persona: "usuario_sistema",
    clave: "",
    confirmPassword: "",
    id_rol_usu: "",
    id_area: "",
    estatus: "activo",
  });

  // Estados para la DataTable
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'fechaRegistro', direction: 'desc' });
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    id_rol_usu: '',
    estatus: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  // ============================================================================
  // UTILIDADES
  // ============================================================================
  
  const limpiarErrorCampo = (nombreCampo) => {
    if (fieldErrors[nombreCampo]) {
      setFieldErrors((prev) => ({ ...prev, [nombreCampo]: null }));
    }
    if (error) setError("");
  };

  const capitalizeWhileTyping = (text) => {
    if (!text) return text;
    return text.split(" ").map(word => 
      word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word
    ).join(" ");
  };

  const formatearTelefono = (valor) => {
    let soloNumeros = valor.replace(/[^\d]/g, "").slice(0, 11);
    return soloNumeros.length <= 4 ? soloNumeros : `${soloNumeros.slice(0, 4)}-${soloNumeros.slice(4)}`;
  };

  const capitalizeText = (text) => {
    if (!text) return text;
    return text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  };

  // ============================================================================
  // VALIDACIONES
  // ============================================================================
  
  const validarCedulaVenezolana = (cedula, nacionalidad) => {
    if (!cedula) return null;
    const soloNumeros = cedula.replace(/[^\d]/g, "");
    
    if (nacionalidad === "V") {
      if (soloNumeros.length < 6 || soloNumeros.length > 8) return "La cédula venezolana debe tener entre 6 y 8 dígitos";
      if (/^0+$/.test(soloNumeros)) return "La cédula no puede ser solo ceros";
      if (/^(\d)\1{5,}$/.test(soloNumeros)) return "La cédula no puede tener dígitos repetitivos";
    } else if (nacionalidad === "E") {
      if (soloNumeros.length < 4 || soloNumeros.length > 12) return "La cédula de extranjero debe tener entre 4 y 12 dígitos";
    }
    return null;
  };

  const validarNombreCompleto = (nombre, tipo) => {
    if (!nombre) return null;
    const trimmed = nombre.trim();
    if (trimmed.length < 2) return `Los ${tipo} deben tener al menos 2 caracteres`;
    if (trimmed.length > 50) return `Los ${tipo} no deben exceder los 50 caracteres`;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?0-9]/.test(trimmed)) return `Los ${tipo} solo deben contener letras y espacios`;
    if (/\s{2,}/.test(trimmed)) return `Los ${tipo} no deben tener múltiples espacios consecutivos`;
    return null;
  };

  const validarTelefono = (telefono) => {
    if (!telefono) return null;
    const cleaned = telefono.replace(/[\s\-\(\)]/g, "");
    if (!/^[\d+]+$/.test(cleaned)) return "El teléfono solo debe contener números y el signo +";
    
    const patterns = [
      /^(?:0412|0414|0416|0424|0410|0426|0418|0420)\d{7}$/,
      /^\+58(?:412|414|416|424|410|426|418|420)\d{7}$/,
      /^(?:0212|0234|0235|0236|0237|0238|0239|0240|0241|0242|0243|0244|0245|0246|0247|0248|0249|0251|0252|0253|0254|0255|0256|0257|0258|0259|0261|0262|0263|0264|0265|0266|0267|0268|0269|0271|0272|0273|0274|0275|0276|0277|0278|0279|0281|0282|0283|0284|0285|0286|0287|0288|0289)\d{7}$/
    ];
    
    if (!patterns.some(p => p.test(cleaned))) {
      return "Ingresa un número de teléfono venezolano válido (Ej: 0412-1234567)";
    }
    return null;
  };

  const validarCorreo = (correo, correo_local, correo_dominio) => {
    if (correo_local && correo_local.includes("@")) {
      return "No incluyas @dominio en el nombre de usuario. Selecciona el dominio en la lista desplegable.";
    }
    if (!correo_local && !correo) return null;
    
    if (correo && !correo_local && !correo_dominio) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return !emailRegex.test(correo) ? "Ingresa un correo electrónico válido" : null;
    }
    
    if (!correo_local) return "Ingresa la parte local del correo (antes del @)";
    if (!correo_dominio) return "Selecciona un dominio para tu correo";
    if (correo_local.length < 3) return "El nombre de usuario debe tener al menos 3 caracteres";
    if (correo_local.length > 64) return "El nombre de usuario es muy largo (máximo 64 caracteres)";
    if (/^[._]|[._]$/.test(correo_local)) return "El nombre de usuario no puede empezar o terminar con puntos o guiones";
    if (/[._]{2,}/.test(correo_local)) return "No se permiten puntos o guiones consecutivos";
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return !emailRegex.test(correo) ? "El correo generado no es válido" : null;
  };

  const validarFechaNacimiento = (fecha) => {
    if (!fecha) return null;
    const fechaNac = new Date(fecha);
    const hoy = new Date();
    const fechaMinima = new Date("1930-01-01");
    
    if (isNaN(fechaNac.getTime())) return "Fecha de nacimiento inválida";
    if (fechaNac > hoy) return "La fecha de nacimiento no puede ser futura";
    if (fechaNac < fechaMinima) return "Fecha de nacimiento demasiado antigua (anterior a 1930)";
    
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
    
    if (edad < 18) return "Debes ser mayor de 18 años para registrarte";
    if (edad > 100) return "Si eres mayor de 100 años, por favor contacta con soporte";
    return null;
  };

  const validarContrasena = (contrasena) => {
    if (!contrasena) return "La contraseña es obligatoria";
    if (contrasena.length < 8) return "La contraseña debe tener al menos 8 caracteres";
    if (contrasena.length > 50) return "La contraseña no debe exceder los 50 caracteres";
    if (!/[A-Z]/.test(contrasena)) return "La contraseña debe contener al menos una letra mayúscula";
    if (!/[a-z]/.test(contrasena)) return "La contraseña debe contener al menos una letra minúscula";
    if (!/[0-9]/.test(contrasena)) return "La contraseña debe contener al menos un número";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(contrasena)) return "La contraseña debe contener al menos un carácter especial";
    return null;
  };

  const validarCampo = (name, value) => {
    switch (name) {
      case "cedula": return validarCedulaVenezolana(value, formData.nacionalidad);
      case "nombres": return validarNombreCompleto(value, "nombres");
      case "apellidos": return validarNombreCompleto(value, "apellidos");
      case "telefono": return validarTelefono(value);
      case "correo": return validarCorreo(value, formData.correo_local, formData.correo_dominio);
      case "fecha_nacimiento": return validarFechaNacimiento(value);
      case "clave": return validarContrasena(value);
      case "confirmPassword": return value !== formData.clave ? "Las contraseñas no coinciden" : null;
      default: return null;
    }
  };

  const validarFormularioCompleto = () => {
    const errors = {};
    
    if (!formData.cedula) errors.cedula = "La cédula es obligatoria";
    else { const e = validarCedulaVenezolana(formData.cedula, formData.nacionalidad); if (e) errors.cedula = e; }
    
    if (!formData.nombres) errors.nombres = "Los nombres son obligatorios";
    else { const e = validarNombreCompleto(formData.nombres, "nombres"); if (e) errors.nombres = e; }
    
    if (!formData.apellidos) errors.apellidos = "Los apellidos son obligatorios";
    else { const e = validarNombreCompleto(formData.apellidos, "apellidos"); if (e) errors.apellidos = e; }
    
    const correoError = validarCorreo(formData.correo, formData.correo_local, formData.correo_dominio);
    if (correoError) errors.correo = correoError;
    
    if (!formData.id_rol_usu) errors.id_rol_usu = "Debes seleccionar un rol para el usuario";
    const rolSel = rolesDB.find((r) => String(r.id_rol) === String(formData.id_rol_usu));
    if (rolSel && rolRequiereArea(rolSel) && !formData.id_area) {
      errors.id_area = "Este rol requiere un área (Presidencia, Administración, Cobranzas, etc.)";
    }
    
    if (modalMode === "create") {
      if (!formData.clave) errors.clave = "La contraseña es obligatoria";
      else { const e = validarContrasena(formData.clave); if (e) errors.clave = e; }
      
      if (!formData.confirmPassword) errors.confirmPassword = "Debes confirmar la contraseña";
      else if (formData.clave !== formData.confirmPassword) errors.confirmPassword = "Las contraseñas no coinciden";
    }
    
    if (formData.municipio && !formData.parroquia) errors.parroquia = "Por favor selecciona una parroquia";
    if (formData.telefono) { const e = validarTelefono(formData.telefono); if (e) errors.telefono = e; }
    if (formData.fecha_nacimiento) { const e = validarFechaNacimiento(formData.fecha_nacimiento); if (e) errors.fecha_nacimiento = e; }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================================
  // HANDLERS DEL FORMULARIO
  // ============================================================================
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type !== "checkbox") limpiarErrorCampo(name);
    
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    
    let nuevoValor = value;
    
    if (name === "cedula") nuevoValor = value.replace(/[^\d]/g, "");
    if (name === "telefono") nuevoValor = formatearTelefono(value);
    if (name === "nombres" || name === "apellidos") nuevoValor = capitalizeWhileTyping(value);
    
    if (name === "correo_local") {
      nuevoValor = value.toLowerCase().replace(/[^a-z0-9._]/g, "");
      if (nuevoValor.includes("@")) {
        nuevoValor = nuevoValor.split("@")[0];
        setFieldErrors(prev => ({ ...prev, correo: "No incluyas @dominio aquí" }));
      }
      const correoCompleto = nuevoValor && formData.correo_dominio ? `${nuevoValor}@${formData.correo_dominio}` : "";
      setFormData((prev) => ({ ...prev, correo_local: nuevoValor, correo: correoCompleto }));
      return;
    }
    
    if (name === "correo_dominio") {
      const correoCompleto = formData.correo_local && value ? `${formData.correo_local}@${value}` : "";
      setFormData((prev) => ({ ...prev, correo_dominio: value, correo: correoCompleto }));
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name]: nuevoValor }));
    if (name === "municipio") setFormData((prev) => ({ ...prev, parroquia: "" }));
  };
  
  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === "nombres" || name === "apellidos") {
      const capitalized = capitalizeText(value);
      if (capitalized !== value) setFormData(prev => ({ ...prev, [name]: capitalized }));
    }
    const error = validarCampo(name, value);
    if (error && value.trim() !== "") setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  const estadosCiviles = ["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a", "Unión Libre"];

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================
  
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    await Promise.all([cargarUsuarios(), cargarRoles(), cargarAreas()]);
  };

  const cargarRoles = async () => {
    try {
      const response = await rolAPI.getAllRoles();
      if (response.success) setRolesDB(response.data);
    } catch (err) {
      console.error("Error cargando roles:", err);
    }
  };

  const cargarAreas = async () => {
    try {
      const response = await areaAPI.getAll();
      if (response.success) setAreasDB(response.data || []);
    } catch (err) {
      console.error("Error cargando áreas:", err);
    }
  };

  const cargarUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await usuarioAPI.getAllUsuarios();
      if (response.success) {
        const usuariosFormateados = response.data.map(usuario => {
          // Debug: Ver qué datos vienen del backend
          console.log("📦 Datos del usuario desde backend:", usuario);
          
          return {
            ...usuario,
            id: usuario.id,
            cedula_usuario: usuario.cedula_usuario,
            nombre_completo: usuario.nombre_completo || `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim(),
            email: usuario.email || usuario.correo,
            telefono: usuario.telefono || usuario.persona?.telefono,
            fechaRegistro: usuario.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            rol: usuario.nombre_rol || usuario.rol,
            nombre_area: usuario.nombre_area,
            id_area: usuario.id_area,
            // La cédula de la persona es la misma que cedula_usuario
            persona_cedula: usuario.cedula_usuario
          };
        });
        setUsuarios(usuariosFormateados);
      }
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      setError("Error al cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ESTADÍSTICAS
  // ============================================================================
  
  const estadisticas = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.estatus === "activo").length,
    inactivos: usuarios.filter(u => u.estatus === "inactivo").length,
    bloqueados: usuarios.filter(u => u.estatus === "bloqueado").length,
    porRol: {},
    accesosRecientes: usuarios.filter(u => {
      if (!u.ultimo_acceso) return false;
      return (new Date() - new Date(u.ultimo_acceso)) / (1000 * 60 * 60 * 24) <= 7;
    }).length
  };

  rolesDB.forEach(rol => {
    estadisticas.porRol[rol.nombre_rol] = usuarios.filter(u => 
      u.id_rol_usu === rol.id_rol || u.rol === rol.nombre_rol
    ).length;
  });

  const esRolUnico = (nombre) => {
    const n = String(nombre || "").toLowerCase().trim();
    return (
      n === "administrador" ||
      n === "admin" ||
      n.startsWith("administrador") ||
      n.includes("presid")
    );
  };

  const mismoTipoUnico = (nombreA, nombreB) => {
    const a = String(nombreA || "").toLowerCase().trim();
    const b = String(nombreB || "").toLowerCase().trim();
    const aAdmin = a === "administrador" || a === "admin" || a.startsWith("administrador");
    const bAdmin = b === "administrador" || b === "admin" || b.startsWith("administrador");
    if (aAdmin && bAdmin) return true;
    if (a.includes("presid") && b.includes("presid")) return true;
    return false;
  };

  // Admin/Presidente solo si no hay otro usuario ACTIVO con ese rol
  const rolesParaFormulario = useMemo(() => {
    return rolesDB.filter((rol) => {
      if (!esRolUnico(rol.nombre_rol)) return true;
      const ocupado = usuarios.some((u) => {
        if (String(u.estatus || "").toLowerCase() !== "activo") return false;
        if (modalMode === "edit" && selectedUser && u.id === selectedUser.id) return false;
        const nombreU = u.nombre_rol || u.rol || "";
        return (
          Number(u.id_rol_usu) === Number(rol.id_rol) ||
          mismoTipoUnico(nombreU, rol.nombre_rol)
        );
      });
      return !ocupado;
    });
  }, [rolesDB, usuarios, modalMode, selectedUser]);

  // ============================================================================
  // FILTROS Y ORDENAMIENTO
  // ============================================================================
  
  const filteredUsuarios = usuarios.filter(user => {
    const matchesSearch = !searchTerm || 
      [user.nombre_completo, user.email, user.cedula_usuario, user.rol].some(v => 
        v && v.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesRol = !filters.id_rol_usu || user.id_rol_usu?.toString() === filters.id_rol_usu;
    const matchesEstado = !filters.estatus || user.estatus === filters.estatus;
    let matchesFecha = true;
    if (filters.fechaDesde && filters.fechaHasta && user.fechaRegistro) {
      const userDate = new Date(user.fechaRegistro);
      matchesFecha = userDate >= new Date(filters.fechaDesde) && userDate <= new Date(filters.fechaHasta);
    }
    return matchesSearch && matchesRol && matchesEstado && matchesFecha;
  });

  const sortedUsuarios = [...filteredUsuarios].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal = a[sortConfig.key] || '';
    let bVal = b[sortConfig.key] || '';
    if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
    return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
  });

  const totalPages = Math.ceil(sortedUsuarios.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsuarios = sortedUsuarios.slice(startIndex, startIndex + rowsPerPage);

  // ============================================================================
  // HANDLERS DE USUARIOS
  // ============================================================================
  
  const handleViewUser = (user) => {
    setSelectedUser(user);
    setModalMode("view");
    setModalOpen(true);
  };

  const handleEditUser = (user) => {
    // Debug: Ver qué datos tiene el usuario al editar
    console.log("✏️ Editando usuario:", user);
    
    setSelectedUser(user);
    setFieldErrors({});
    
    let correo_local = "", correo_dominio = "";
    const email = user.email || user.correo || "";
    if (email && email.includes("@")) {
      [correo_local, correo_dominio] = email.split("@");
      if (!dominiosCorreo.includes(correo_dominio)) correo_dominio = "";
    }
    
    // La cédula de la persona es la misma que cedula_usuario
    const cedulaPersona = user.cedula_usuario || "";
    const cedulaSinPrefijo = cedulaPersona.replace(/^[VE]-/, "");
    const nacionalidad = cedulaPersona.startsWith("E-") ? "E" : "V";
    
    setFormData({
      cedula_original: cedulaPersona, // Guardamos la cédula original para identificar la persona
      nacionalidad: nacionalidad,
      cedula: cedulaSinPrefijo,
      nombres: user.nombres || "",
      apellidos: user.apellidos || "",
      fecha_nacimiento: user.fecha_nacimiento?.split('T')[0] || "",
      telefono: user.telefono || "",
      correo_local, correo_dominio, correo: email,
      estado_civil: user.estado_civil || "",
      direccion: user.direccion || "",
      estado: user.estado || "Yaracuy",
      municipio: user.municipio || "",
      parroquia: user.parroquia || "",
      tipo_persona: user.tipo_persona || "usuario_sistema",
      clave: "", confirmPassword: "",
      id_rol_usu: user.id_rol_usu?.toString() || "",
      id_area: user.id_area ? String(user.id_area) : "",
      estatus: user.estatus || "activo",
    });
    
    console.log("📝 FormData después de editar:", formData);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setFieldErrors({});
    setFormData({
      cedula_original: "",
      nacionalidad: "V", cedula: "", nombres: "", apellidos: "",
      fecha_nacimiento: "", telefono: "", correo_local: "", correo_dominio: "", correo: "",
      estado_civil: "", direccion: "", estado: "Yaracuy", municipio: "", parroquia: "",
      tipo_persona: "usuario_sistema", clave: "", confirmPassword: "", id_rol_usu: "", id_area: "", estatus: "activo",
    });
    setModalMode("create");
    setModalOpen(true);
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setModalMode("resetPassword");
    setModalOpen(true);
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.estatus === "activo" ? "inactivo" : "activo";
    try {
      setLoading(true);
      const response = await usuarioAPI.cambiarEstatus(user.id, newStatus);
      if (response.success) {
        setSuccessMessage(`Usuario ${user.nombre_completo} ${newStatus === "activo" ? "activado" : "desactivado"} correctamente`);
        await cargarUsuarios();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error("Error cambiando estatus:", err);
      setError("Error al cambiar el estado del usuario");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const { blockDeleteWithAlert } = await import("../utils/retentionPolicy");
    blockDeleteWithAlert("usuario");
  };

  // ============================================================================
  // GUARDADO DE USUARIO - CORREGIDO PARA USAR CÉDULA COMO PK
  // ============================================================================
  
  const handleSaveUser = async () => {
    if (!validarFormularioCompleto()) {
      setError("Por favor corrige los errores marcados en el formulario");
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const cedulaFormateada = `${formData.nacionalidad.toUpperCase()}-${formData.cedula}`;
      const correoFinal = formData.correo || (formData.correo_local && formData.correo_dominio ? `${formData.correo_local}@${formData.correo_dominio}` : "");
      
      // Datos de persona
      const personaData = {
        nacionalidad: formData.nacionalidad,
        cedula: cedulaFormateada,
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        telefono: formData.telefono || null,
        correo: correoFinal,
        estado_civil: formData.estado_civil || null,
        direccion: formData.direccion || null,
        estado: formData.estado || null,
        municipio: formData.municipio || null,
        parroquia: formData.parroquia || null,
        tipo_persona: formData.tipo_persona,
      };
      
      if (modalMode === "create") {
        // CREACIÓN: Guardar persona y luego usuario
        const personaResponse = await personaAPI.createPersona(personaData);
        if (!personaResponse.success) throw new Error(personaResponse.error || "Error al crear la persona");
        
        const usuarioData = {
          cedula_usuario: cedulaFormateada,
          clave: formData.clave,
          id_rol_usu: parseInt(formData.id_rol_usu),
          id_area: formData.id_area ? parseInt(formData.id_area, 10) : null,
          estatus: "activo"
        };
        
        const usuarioResponse = await usuarioAPI.createUsuario(usuarioData);
        if (!usuarioResponse.success) throw new Error(usuarioResponse.error || "Error al crear el usuario");
        
        setSuccessMessage(`Usuario ${formData.nombres} ${formData.apellidos} creado exitosamente`);
        
      } else if (modalMode === "edit" && selectedUser) {
        // EDICIÓN: Usar la cédula como identificador de la persona
        // La cédula original es la que tenía antes de editar
        const cedulaOriginal = formData.cedula_original || selectedUser.cedula_usuario;
        
        if (!cedulaOriginal) {
          throw new Error("No se encontró la cédula de la persona para actualizar");
        }
        
        console.log("🔄 Actualizando persona con cédula:", cedulaOriginal);
        console.log("📝 Datos a actualizar:", personaData);
        console.log("📝 Nueva cédula:", cedulaFormateada);
        
        // Si la cédula cambió, necesitamos actualizar también la referencia en usuario
        const cedulaCambio = cedulaOriginal !== cedulaFormateada;
        
        // Actualizar persona (usando la cédula original como identificador)
        const personaResponse = await personaAPI.updatePersona(cedulaOriginal, personaData);
        if (!personaResponse.success) {
          throw new Error(personaResponse.error || "Error al actualizar la persona");
        }
        
        // Si la cédula cambió, actualizar la cédula en el usuario también
        if (cedulaCambio) {
          const usuarioData = {
            cedula_usuario: cedulaFormateada,
            id_rol_usu: parseInt(formData.id_rol_usu),
            id_area: formData.id_area ? parseInt(formData.id_area, 10) : null,
            estatus: formData.estatus.toLowerCase()
          };
          const usuarioResponse = await usuarioAPI.updateUsuario(selectedUser.id, usuarioData);
          if (!usuarioResponse.success) {
            throw new Error(usuarioResponse.error || "Error al actualizar el usuario");
          }
        } else {
          // Solo actualizar rol y estatus
          const usuarioData = {
            id_rol_usu: parseInt(formData.id_rol_usu),
            id_area: formData.id_area ? parseInt(formData.id_area, 10) : null,
            estatus: formData.estatus.toLowerCase()
          };
          const usuarioResponse = await usuarioAPI.updateUsuario(selectedUser.id, usuarioData);
          if (!usuarioResponse.success) {
            throw new Error(usuarioResponse.error || "Error al actualizar el usuario");
          }
        }
        
        setSuccessMessage(`Usuario ${formData.nombres} ${formData.apellidos} actualizado exitosamente`);
      }
      
      await cargarUsuarios();
      setModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error("❌ Error guardando usuario:", err);
      setError(err.message || "Error al guardar el usuario");
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (selectedUser) {
      try {
        setLoading(true);
        const tempPassword = Math.random().toString(36).slice(-8);
        const response = await usuarioAPI.updatePassword(selectedUser.id, tempPassword);
        if (response.success) {
          setSuccessMessage(`Contraseña restablecida. Nueva contraseña temporal: ${tempPassword}`);
          setModalOpen(false);
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      } catch (err) {
        console.error("Error restableciendo contraseña:", err);
        setError("Error al restablecer la contraseña");
      } finally {
        setLoading(false);
      }
    }
  };

  // ============================================================================
  // UTILIDADES DE RENDERIZADO
  // ============================================================================
  
  const getEstadoBadge = (estatus) => {
    const styles = {
      'activo': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'inactivo': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      'bloqueado': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return styles[estatus] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoTexto = (estatus) => ({ 'activo': 'Activo', 'inactivo': 'Inactivo', 'bloqueado': 'Bloqueado' }[estatus] || estatus);

  const getNombreRol = (id_rol_usu) => {
    const rol = rolesDB.find(r => r.id_rol === parseInt(id_rol_usu));
    return rol ? rol.nombre_rol : id_rol_usu;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "Nunca";
    return new Date(dateTimeString).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = () => {
    usuarioAPI.logout();
  };

  const getPasswordValidation = (password) => ({
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  });

  const hasError = (fieldName) => !!fieldErrors[fieldName];
  const getErrorMessage = (fieldName) => fieldErrors[fieldName];

  // ============================================================================
  // RENDERIZADO - MODAL FORMULARIO
  // ============================================================================
  
  const renderFormModal = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nacionalidad */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nacionalidad *</label>
          <select name="nacionalidad" value={formData.nacionalidad} onChange={handleChange}
            className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}>
            <option value="V">Venezolano(a)</option>
            <option value="E">Extranjero(a)</option>
          </select>
        </div>
        
        {/* Cédula */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Cédula *</label>
          <div className="relative">
            <Hash size={18} className="absolute left-3 top-3 text-gray-400" />
            <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} onBlur={handleBlur}
              className={`w-full pl-10 pr-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('cedula') ? 'border-red-500' : ''}`}
              placeholder="12345678" />
          </div>
          {hasError('cedula') && <p className="text-xs text-red-500 mt-1">{getErrorMessage('cedula')}</p>}
        </div>
        
        {/* Nombres */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nombres *</label>
          <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} onBlur={handleBlur}
            className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('nombres') ? 'border-red-500' : ''}`}
            placeholder="Tus nombres" />
          {hasError('nombres') && <p className="text-xs text-red-500 mt-1">{getErrorMessage('nombres')}</p>}
        </div>
        
        {/* Apellidos */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Apellidos *</label>
          <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} onBlur={handleBlur}
            className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('apellidos') ? 'border-red-500' : ''}`}
            placeholder="Tus apellidos" />
          {hasError('apellidos') && <p className="text-xs text-red-500 mt-1">{getErrorMessage('apellidos')}</p>}
        </div>
        
        {/* Fecha de Nacimiento */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Fecha de Nacimiento</label>
          <div className="relative">
            <Calendar size={18} className="absolute left-3 top-3 text-gray-400" />
            <input 
              type="date" 
              name="fecha_nacimiento" 
              value={formData.fecha_nacimiento} 
              onChange={handleChange} 
              onBlur={handleBlur}
              className={`w-full pl-10 pr-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('fecha_nacimiento') ? 'border-red-500' : ''}`}
            />
          </div>
          {hasError('fecha_nacimiento') && <p className="text-xs text-red-500 mt-1">{getErrorMessage('fecha_nacimiento')}</p>}
        </div>
        
        {/* Teléfono */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Teléfono</label>
          <div className="relative">
            <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
            <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} onBlur={handleBlur}
              className={`w-full pl-10 pr-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('telefono') ? 'border-red-500' : ''}`}
              placeholder="0412-1234567" />
          </div>
          {hasError('telefono') && <p className="text-xs text-red-500 mt-1">{getErrorMessage('telefono')}</p>}
        </div>
        
        {/* Correo */}
        <div className="col-span-2">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Correo Electrónico *</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
              <input type="text" name="correo_local" value={formData.correo_local} onChange={handleChange} onBlur={handleBlur}
                className={`w-full pl-10 pr-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('correo') ? 'border-red-500' : ''}`}
                placeholder="usuario" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-bold text-lg">@</span>
              <select name="correo_dominio" value={formData.correo_dominio} onChange={handleChange}
                className={`flex-1 sm:w-48 px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}>
                <option value="">Seleccionar dominio</option>
                {dominiosCorreo.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          {hasError('correo') && <p className="text-xs text-red-500 mt-1"><AlertCircle size={12} className="inline" /> {getErrorMessage('correo')}</p>}
          {formData.correo && !hasError('correo') && (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-xs text-green-600 dark:text-green-400"><CheckCircle size={14} className="inline" /> Correo: <strong>{formData.correo}</strong></p>
            </div>
          )}
        </div>
        
        {/* Estado Civil */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Estado Civil</label>
          <select name="estado_civil" value={formData.estado_civil} onChange={handleChange}
            className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}>
            <option value="">Seleccionar</option>
            {estadosCiviles.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        
        {/* Rol */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Rol *</label>
          <select name="id_rol_usu" value={formData.id_rol_usu} onChange={handleChange}
            className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('id_rol_usu') ? 'border-red-500' : ''}`}>
            <option value="">Seleccionar rol</option>
            {rolesParaFormulario.map(rol => <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre_rol}</option>)}
          </select>
          {hasError('id_rol_usu') && <p className="text-xs text-red-500 mt-1">{getErrorMessage('id_rol_usu')}</p>}
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Solo puede haber un Administrador y un Presidente(a) activos. Director y Secretaria requieren un área.
          </p>
        </div>

        {rolRequiereArea(rolesDB.find((r) => String(r.id_rol) === String(formData.id_rol_usu))) && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Área *</label>
            <select name="id_area" value={formData.id_area} onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('id_area') ? 'border-red-500' : ''}`}>
              <option value="">Seleccionar área</option>
              {areasDB.map((area) => (
                <option key={area.id_area} value={area.id_area}>{area.nombre_area}</option>
              ))}
            </select>
            {hasError('id_area') && <p className="text-xs text-red-500 mt-1">{getErrorMessage('id_area')}</p>}
          </div>
        )}

        {/* Dirección */}
        <div className="col-span-2">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dirección</label>
          <input type="text" name="direccion" value={formData.direccion} onChange={handleChange}
            className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            placeholder="Dirección de residencia" />
        </div>

        {/* Estado (geográfico) */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Estado</label>
          <select name="estado" value={formData.estado} onChange={handleChange}
            className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}>
            <option value="Yaracuy">Yaracuy</option>
          </select>
        </div>

        {/* Municipio */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Municipio</label>
          <select name="municipio" value={formData.municipio} onChange={handleChange}
            className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}>
            <option value="">Seleccionar municipio</option>
            {municipiosYaracuy.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Parroquia */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Parroquia</label>
          <select name="parroquia" value={formData.parroquia} onChange={handleChange}
            className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('parroquia') ? 'border-red-500' : ''}`}>
            <option value="">Seleccionar parroquia</option>
            {formData.municipio && parroquiasPorMunicipio[formData.municipio]?.map(p => 
              <option key={p} value={p}>{p}</option>
            )}
          </select>
          {hasError('parroquia') && <p className="text-xs text-red-500 mt-1">{getErrorMessage('parroquia')}</p>}
        </div>

        {/* Estado del usuario (solo edición) */}
        {modalMode === "edit" ? (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Estado del Usuario</label>
            <select name="estatus" value={formData.estatus} onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>
        ) : (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Estado</label>
            <div className={`px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-green-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} />
                <span className="font-medium">Activo</span>
              </div>
            </div>
          </div>
        )}

        {/* Contraseña (solo crear) */}
        {modalMode === "create" && (
          <>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contraseña *</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                <input type={showPassword ? "text" : "password"} name="clave" value={formData.clave} onChange={handleChange} onBlur={handleBlur}
                  className={`w-full pl-10 pr-10 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('clave') ? 'border-red-500' : ''}`}
                  placeholder="Mínimo 8 caracteres" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formData.clave && (
                <div className="mt-2 space-y-1">
                  {Object.entries(getPasswordValidation(formData.clave)).map(([key, valid]) => {
                    const labels = { minLength: "Mínimo 8 caracteres", hasUpperCase: "Una mayúscula", hasLowerCase: "Una minúscula", hasNumber: "Un número", hasSpecialChar: "Un carácter especial" };
                    return (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        <div className={`w-3 h-3 rounded-full ${valid ? 'bg-green-500' : 'border-2 border-gray-300'}`} />
                        <span className={valid ? "text-green-600 dark:text-green-400" : "text-gray-500"}>{labels[key]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {hasError('clave') && <p className="text-xs text-red-500 mt-1">{getErrorMessage('clave')}</p>}
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirmar Contraseña *</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur}
                  className={`w-full pl-10 pr-10 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] ${hasError('confirmPassword') ? 'border-red-500' : ''}`}
                  placeholder="Repite tu contraseña" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-gray-400">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {hasError('confirmPassword') && <p className="text-xs text-red-500 mt-1">{getErrorMessage('confirmPassword')}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // DATOS MOCK (para UI)
  // ============================================================================
  
  const currentUser = {
    name: "Administrador IADEY",
    email: "admin@iadey.gob.ve",
    role: "Administrador",
  };

  const currentData = {
    title: "Gestión de Usuarios",
    description: "Administración de usuarios del sistema IADEY",
  };

  // ============================================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================================
  
  return (
    <div className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Header 
        darkMode={darkMode} setDarkMode={setDarkMode}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        notifications={notifications} showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        showUserMenu={showUserMenu} setShowUserMenu={setShowUserMenu}
        user={currentUser} handleLogout={handleLogout}
        unreadCount={notifications.filter(n => !n.read).length}
        markAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n))}
      />

      <div className="flex flex-1">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} darkMode={darkMode} />

        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            {/* Mensajes */}
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg flex justify-between items-center">
                <span><CheckCircle size={20} className="inline mr-2" />{successMessage}</span>
                <button onClick={() => setSuccessMessage(null)}><X size={20} /></button>
              </div>
            )}
            {error && (
              <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex justify-between items-center">
                <span><AlertCircle size={20} className="inline mr-2" />{error}</span>
                <button onClick={() => setError(null)}><X size={20} /></button>
              </div>
            )}

            {/* Título */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{currentData.title}</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{currentData.description}</p>
              </div>
              <ExportButtons
                data={usuarios.map((u) => ({
                  id: u.id,
                  cedula_usuario: u.cedula_usuario,
                  nombre_completo: u.nombre_completo,
                  email: u.email,
                  telefono: u.telefono,
                  rol: u.rol || u.nombre_rol,
                  estatus: u.estatus,
                  ultimo_acceso: u.ultimo_acceso,
                  created_at: u.created_at,
                }))}
                columns={[
                  { key: "id", label: "ID" },
                  { key: "cedula_usuario", label: "Cédula" },
                  { key: "nombre_completo", label: "Nombre" },
                  { key: "email", label: "Correo" },
                  { key: "telefono", label: "Teléfono" },
                  { key: "rol", label: "Rol" },
                  { key: "estatus", label: "Estatus" },
                  { key: "ultimo_acceso", label: "Último acceso" },
                  { key: "created_at", label: "Registro" },
                ]}
                title="Usuarios"
                fileName="usuarios"
                moduloApi="usuarios"
                darkMode={darkMode}
              />
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {[
                { icon: Users, color: 'text-[#2A9D8F]', value: estadisticas.total, label: 'Total Usuarios' },
                { icon: UserCheck, color: 'text-green-500', value: estadisticas.activos, label: 'Usuarios Activos' },
                { icon: UserX, color: 'text-red-500', value: estadisticas.bloqueados + estadisticas.inactivos, label: 'Inactivos/Bloqueados' },
                { icon: Shield, color: 'text-purple-500', value: estadisticas.porRol['Administrador'] || 0, label: 'Administradores' },
                { icon: Activity, color: 'text-blue-500', value: estadisticas.accesosRecientes, label: 'Accesos últimos 7 días' },
              ].map((stat, i) => (
                <div key={i} className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={stat.color} size={24} />
                    <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stat.value}</span>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Búsqueda y acciones */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" placeholder="Buscar por nombre, email, cédula o rol..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-200 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <Filter size={20} /> Filtros
                </button>
                <button onClick={handleCreateUser} disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />} Nuevo Usuario
                </button>
              </div>
            </div>

            {/* Filtros */}
            {showFilters && (
              <div className={`mb-6 p-4 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select value={filters.id_rol_usu} onChange={(e) => setFilters({...filters, id_rol_usu: e.target.value})}
                    className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}>
                    <option value="">Todos los roles</option>
                    {rolesDB.map(rol => <option key={rol.id_rol} value={rol.id_rol}>{rol.nombre_rol}</option>)}
                  </select>
                  <select value={filters.estatus} onChange={(e) => setFilters({...filters, estatus: e.target.value})}
                    className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}>
                    <option value="">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                  <div className="flex gap-2">
                    <input type="date" value={filters.fechaDesde} onChange={(e) => setFilters({...filters, fechaDesde: e.target.value})}
                      className={`w-1/2 px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`} />
                    <input type="date" value={filters.fechaHasta} onChange={(e) => setFilters({...filters, fechaHasta: e.target.value})}
                      className={`w-1/2 px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`} />
                  </div>
                </div>
              </div>
            )}

            {/* Tabla de usuarios */}
            {loading && !usuarios.length ? (
              <div className={`text-center py-12 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <Loader2 size={48} className="mx-auto mb-4 animate-spin text-gray-400" />
                <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Cargando usuarios...</h3>
              </div>
            ) : (
              <div className={`rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} overflow-hidden`}>
                <div className="overflow-x-auto table-scroll">
                  <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-4 py-3 w-12"><input type="checkbox" checked={selectedRows.length === paginatedUsuarios.length && paginatedUsuarios.length > 0}
                          onChange={() => setSelectedRows(selectedRows.length === paginatedUsuarios.length ? [] : paginatedUsuarios.map(u => u.id))}
                          className="rounded border-gray-300 text-[#2A9D8F]" /></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => setSortConfig({key: 'nombre_completo', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>
                          <div className="flex items-center gap-2">Usuario <ArrowUpDown size={14} /></div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Acceso</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {paginatedUsuarios.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <Users size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
                              <p className={`text-lg font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No se encontraron usuarios</p>
                              <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Intenta ajustar los filtros de búsqueda</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedUsuarios.map(usuario => (
                          <tr key={usuario.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                            <td className="px-4 py-3"><input type="checkbox" checked={selectedRows.includes(usuario.id)}
                              onChange={() => setSelectedRows(prev => prev.includes(usuario.id) ? prev.filter(id => id !== usuario.id) : [...prev, usuario.id])}
                              className="rounded border-gray-300 text-[#2A9D8F]" /></td>
                            <td className="px-4 py-3">
                              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{usuario.nombre_completo}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{usuario.cedula_usuario}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{usuario.email}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{usuario.telefono || 'No registrado'}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                {usuario.rol || getNombreRol(usuario.id_rol_usu)}
                                {usuario.nombre_area ? ` · ${usuario.nombre_area}` : ''}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${getEstadoBadge(usuario.estatus)}`}>{getEstadoTexto(usuario.estatus)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatDateTime(usuario.ultimo_acceso)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Registro: {formatDate(usuario.created_at)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                <button onClick={() => handleViewUser(usuario)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Ver detalles">
                                  <Eye size={18} className="text-[#2A9D8F]" />
                                </button>
                                <button onClick={() => handleEditUser(usuario)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Editar">
                                  <Edit size={18} className="text-blue-500" />
                                </button>
                                <button onClick={() => handleResetPassword(usuario)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Restablecer contraseña">
                                  <Key size={18} className="text-orange-500" />
                                </button>
                                <button onClick={() => handleToggleStatus(usuario)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={usuario.estatus === "activo" ? "Desactivar" : "Activar"}>
                                  {usuario.estatus === "activo" ? <Lock size={18} className="text-orange-500" /> : <Unlock size={18} className="text-green-500" />}
                                </button>
                                <button onClick={() => handleDeleteUser(usuario)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-50 cursor-not-allowed"
                                  title="Eliminación bloqueada por política de retención (10 años)">
                                  <Trash2 size={18} className="text-red-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {paginatedUsuarios.length > 0 && (
                  <div className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>Mostrar</span>
                      <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className={`px-2 py-1 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}>
                        {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>registros</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                        {startIndex + 1}-{Math.min(startIndex + rowsPerPage, sortedUsuarios.length)} de {sortedUsuarios.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 disabled:opacity-50"><ChevronsLeft size={18} /></button>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 disabled:opacity-50"><ChevronLeft size={18} /></button>
                        <span className={`px-3 py-1 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>Página {currentPage} de {totalPages || 1}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 disabled:opacity-50"><ChevronRight size={18} /></button>
                        <button onClick={() => setCurrentPage(totalPages || 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-1 disabled:opacity-50"><ChevronsRight size={18} /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal */}
            {modalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className={`rounded-xl w-full max-h-[90vh] overflow-y-auto 'max-w-4xl' ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
                  <div className={`p-6 border-b sticky top-0 z-10 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <div className="flex justify-between items-center">
                      <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {modalMode === "create" && "Crear Nuevo Usuario"}
                        {modalMode === "edit" && "Editar Usuario"}
                        {modalMode === "view" && "Detalles del Usuario"}
                        {modalMode === "resetPassword" && "Restablecer Contraseña"}
                      </h2>
                      <button onClick={() => setModalOpen(false)} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}><X size={20} /></button>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {(modalMode === "create" || modalMode === "edit") && renderFormModal()}
                    
                    {modalMode === "view" && selectedUser && (
                      <div className="space-y-6">
                        <div className="flex justify-center">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#264653] to-[#2A9D8F] flex items-center justify-center text-white text-3xl font-bold">
                            {selectedUser.nombre_completo?.charAt(0) || 'U'}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            ['Nombre Completo', selectedUser.nombre_completo],
                            ['Cédula', selectedUser.cedula_usuario],
                            ['Correo Electrónico', selectedUser.email],
                            ['Teléfono', selectedUser.telefono || 'No registrado'],
                            ['Rol', selectedUser.rol || getNombreRol(selectedUser.id_rol_usu)],
                            ['Estado', getEstadoTexto(selectedUser.estatus)],
                            ['Fecha Registro', formatDate(selectedUser.created_at)],
                            ['Último Acceso', formatDateTime(selectedUser.ultimo_acceso)],
                          ].map(([label, value], i) => (
                            <div key={i} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                              <label className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</label>
                              <p className={`font-medium mt-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {modalMode === "resetPassword" && selectedUser && (
                      <div className="space-y-4">
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            ¿Está seguro de restablecer la contraseña para el usuario <strong>{selectedUser.nombre_completo}</strong>?
                          </p>
                          <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Se generará una contraseña temporal que el usuario deberá cambiar en su próximo inicio de sesión.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {(modalMode === "create" || modalMode === "edit" || modalMode === "resetPassword") && (
                    <div className={`p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <button onClick={() => setModalOpen(false)}
                        className={`px-4 py-2 rounded-lg border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        Cancelar
                      </button>
                      <button 
                        onClick={modalMode === "resetPassword" ? handleConfirmResetPassword : handleSaveUser} 
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-[#2A9D8F] text-white hover:bg-[#264653] disabled:opacity-50 flex items-center gap-2">
                        {loading && <Loader2 size={18} className="animate-spin" />}
                        {modalMode === "resetPassword" ? "Restablecer Contraseña" : modalMode === "create" ? "Crear Usuario" : "Guardar Cambios"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <Footer darkMode={darkMode} />
        </main>
      </div>
    </div>
  );
};

export default Usuario;