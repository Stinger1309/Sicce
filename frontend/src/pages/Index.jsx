// App.js
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import logo from "../assets/logo.png";
import heroImage from "../assets/logoprincipal.png";
import LoginEmprendedor from "./Login";
import LoginAdministrativo from "./Login_administrativo";
import { onlyPhoneDigits } from "../utils/inputFormat";

import {
  BookOpen,
  Award,
  Users,
  Calendar,
  ChevronRight,
  Star,
  Clock,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  Menu,
  X,
  Briefcase,
  Leaf,
  Scale,
  ShoppingBag,
  LandPlot,
  Sprout,
  ScrollText,
  PiggyBank,
  CalendarRange,
  HelpCircle,
  User,
  LogOut,
  Settings,
  LayoutDashboard,
  Store,
  ChevronDown,
  UserCog,
  UserCircle
} from "lucide-react";

// ================ COMPONENTES REUTILIZABLES ================

const AnimatedCounter = ({ end, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const countRef = React.useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.5 }
    );

    if (countRef.current) observer.observe(countRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isVisible) return;

    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      setCount(start >= end ? end : Math.floor(start));
      if (start >= end) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible, end, duration]);

  return (
    <span ref={countRef}>
      {count}
      {suffix}
    </span>
  );
};

const Section = ({ id, children, className = "", bgColor = "bg-white" }) => (
  <section id={id} className={`py-20 ${bgColor} ${className}`}>
    <div className="container mx-auto px-6">{children}</div>
  </section>
);

const SectionHeader = ({ subtitle, title, highlight, description }) => (
  <div className="text-center mb-16">
    <span className="text-[#264653] font-semibold text-sm uppercase tracking-wider">
      {subtitle}
    </span>
    <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mt-2 mb-4">
      {title}{" "}
      {highlight && <span className="text-[#2A9D8F]">{highlight}</span>}
    </h2>
    {description && (
      <p className="text-xl text-gray-600 max-w-3xl mx-auto">{description}</p>
    )}
  </div>
);

const Button = ({ children, variant = "primary", className = "", ...props }) => {
  const baseStyles = "px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl";
  
  const variants = {
    primary: "bg-[#264653] text-white hover:bg-[#2A9D8F]",
    secondary: "bg-[#2A9D8F] text-white hover:bg-[#264653]",
    outline: "border-2 border-[#264653] text-[#264653] hover:bg-[#264653] hover:text-white",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// ================ DATOS ================

const navigationItems = [
  { name: "Inicio", path: "/" },
  { name: "Quiénes Somos", path: "/quienes-somos" },
  { name: "Servicios", path: "/servicios" },
  { name: "Formación", path: "/formacion" },
  { name: "Contacto", path: "/contacto" }
];

const servicios = [
  {
    icon: <BookOpen size={40} />,
    title: "Formación",
    description: "Programas de capacitación y desarrollo empresarial",
    color: "from-[#264653] to-[#2A9D8F]",
    items: [
      "Universidad del Emprendimiento",
      "Talleres de capacitación especializados",
    ],
  },
  {
    icon: <ScrollText size={40} />,
    title: "Formalización",
    description: "Apoyo en la formalización de emprendimientos",
    color: "from-[#264653] to-[#2A9D8F]",
    items: [
      "Certificado de Emprender Juntos",
      "Pre-registro para RIF de Emprendimiento",
    ],
  },
  {
    icon: <PiggyBank size={40} />,
    title: "Financiamiento",
    description: "Apoyo financiero para emprendedores y productores",
    color: "from-[#264653] to-[#2A9D8F]",
    items: [
      "Enlace con bancos públicos y privados",
      "Financiamiento de kit conuqueros",
    ],
  },
  {
    icon: <ShoppingBag size={40} />,
    title: "Ferias",
    description: "Expo-ferias en los 14 municipios del estado",
    color: "from-[#264653] to-[#2A9D8F]",
    items: [
      "Visibilidad para marcas locales",
      "Exposición de productos agrícolas",
    ],
  },
  {
    icon: <Scale size={40} />,
    title: "Asesorías Legales",
    description: "Asesoramiento legal para emprendedores y empresarios",
    color: "from-[#264653] to-[#2A9D8F]",
    items: [
      "Asesorías legales y financieras",
      "Apoyo a comerciantes y productores",
    ],
  },
  {
    icon: <Sprout size={40} />,
    title: "Asistencia Técnica",
    description: "Apoyo técnico para unidades de producción",
    color: "from-[#264653] to-[#2A9D8F]",
    items: [
      "Elaboración de proyectos agrícolas",
      "Asesoría en área vegetal y animal",
    ],
  },
];

const valores = [
  { icon: <Award size={40} />, title: "Justicia Social", text: "Compromiso con el desarrollo equitativo" },
  { icon: <Users size={40} />, title: "Democracia", text: "Participación ciudadana en el desarrollo" },
  { icon: <Star size={40} />, title: "Eficiencia", text: "Optimización de recursos y resultados" },
  { icon: <Briefcase size={40} />, title: "Libre Competencia", text: "Fomento de la iniciativa privada" },
  { icon: <Leaf size={40} />, title: "Protección Ambiental", text: "Desarrollo sostenible" },
  { icon: <CalendarRange size={40} />, title: "Productividad", text: "Impulso a la producción local" },
];

const testimonios = [
  {
    initials: "MP",
    name: "María Pérez",
    year: "2023",
    text: "Gracias al IADEY pude formalizar mi emprendimiento y acceder a financiamiento para hacer crecer mi negocio.",
    rating: 5,
    color: "from-[#264653] to-[#2A9D8F]",
  },
  {
    initials: "JG",
    name: "José Gutiérrez",
    year: "2022",
    text: "Las asesorías técnicas y los talleres de capacitación me ayudaron a mejorar mi producción agrícola significativamente.",
    rating: 5,
    color: "from-[#264653] to-[#2A9D8F]",
  },
  {
    initials: "CR",
    name: "Carmen Rodríguez",
    year: "2023",
    text: "Participar en las expo-ferias me permitió dar a conocer mis productos en todo el estado Yaracuy.",
    rating: 5,
    color: "from-[#264653] to-[#2A9D8F]",
  },
];

const municipios = [
  "Aristides Bastidas",
  "Bolívar",
  "Bruzual",
  "Cocorote",
  "Independencia",
  "José Antonio Páez",
  "La Trinidad",
  "Manuel Monge",
  "Nirgua",
  "Peña",
  "San Felipe",
  "Sucre",
  "Urachiche",
  "Veroes",
];

// ================ COMPONENTE DE SELECCIÓN DE ROL PARA LOGIN ================

const LoginRoleSelector = ({ onSelectRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles = [
    {
      id: 'admin',
      name: 'Administrativo',
      icon: <UserCog size={20} />,
      description: 'Acceso al panel de administración',
      color: 'from-[#264653] to-[#2A9D8F]'
    },
    {
      id: 'emprendedor',
      name: 'Emprendedor',
      icon: <Store size={20} />,
      description: 'Gestiona tu emprendimiento en nuestra institucion',
      color: 'from-[#264653] to-[#2A9D8F]'
    }
  ];

  const handleRoleSelect = (role) => {
    onSelectRole(role);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden md:flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl bg-[#264653] text-white hover:bg-[#2A9D8F]"
      >
        <User size={20} />
        <span>Iniciar sesión</span>
        <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1rem))] bg-white rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Selecciona tu perfil</p>
            <p className="text-xs text-gray-500">Elige el tipo de acceso</p>
          </div>
          
          <div className="py-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${role.color} flex items-center justify-center text-white mr-3 group-hover:scale-110 transition-transform`}>
                  {role.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{role.name}</p>
                  <p className="text-xs text-gray-500">{role.description}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#264653] group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-center text-gray-500">
              ¿No tienes cuenta? <a href="#/contacto" className="text-[#2A9D8F] hover:underline">Contáctanos</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ================ COMPONENTE DE MENÚ DE USUARIO ================

const UserMenu = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = {
    admin: [
      { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: <Users size={18} />, label: 'Gestionar Usuarios', path: '/admin/usuarios' },
      { icon: <Settings size={18} />, label: 'Configuración', path: '/admin/configuracion' },
    ],
    emprendedor: [
      { icon: <Store size={18} />, label: 'Mi Emprendimiento', path: '/emprendedor/mi-negocio' },
      { icon: <BookOpen size={18} />, label: 'Mis Cursos', path: '/emprendedor/cursos' },
      { icon: <Calendar size={18} />, label: 'Mis Eventos', path: '/emprendedor/eventos' },
    ]
  };

  const currentMenuItems = menuItems[user?.role] || [];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-2 transition-all duration-300"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-[#264653] to-[#2A9D8F] rounded-full flex items-center justify-center text-white font-bold text-sm">
          {getInitials(user?.name)}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs opacity-75 capitalize">{user?.role === 'admin' ? 'Administrativo' : 'Emprendedor'}</p>
        </div>
        <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          
          <div className="py-2">
            {currentMenuItems.map((item, index) => (
              <a
                key={index}
                href={`#${item.path}`}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.hash = item.path;
                  setIsOpen(false);
                }}
                className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#264653] transition-colors"
              >
                <span className="mr-3 text-gray-500">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
          
          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} className="mr-3" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ================ COMPONENTES DE SECCIÓN ================

const Header = ({ mobileMenuOpen, setMobileMenuOpen, isAuthenticated, user, onLogout, onRoleSelect }) => {
  const handleNavigation = (path) => {
    window.location.hash = path;
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white fixed w-full z-50 shadow-lg">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <a href="/" className="flex items-center space-x-3">
          <img src={logo} alt="IADEY" className="h-10 w-auto" />
          <span className="text-2xl font-bold tracking-tight">
            IADEY<span className="text-[#E9C46A]">.</span>
          </span>
        </a>

        <ul className="hidden md:flex space-x-8">
          {navigationItems.map((item) => (
            <li key={item.path}>
              <a
                href={`#${item.path}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation(item.path);
                }}
                className="relative py-2 group"
              >
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#E9C46A] transition-all duration-300 group-hover:w-full"></span>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            <LoginRoleSelector onSelectRole={onRoleSelect} />
          )}
          
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white text-gray-800 absolute top-full left-0 w-full shadow-xl">
          <ul className="flex flex-col py-4">
            {navigationItems.map((item) => (
              <li key={item.path}>
                <a
                  href={`#${item.path}`}
                  className="block px-6 py-3 hover:bg-gray-100 hover:text-[#264653] transition"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation(item.path);
                  }}
                >
                  {item.name}
                </a>
              </li>
            ))}
            <li className="px-6 pt-3">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-600 capitalize">{user?.role === 'admin' ? 'Administrativo' : 'Emprendedor'}</p>
                  </div>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-red-500 text-white px-8 py-4 rounded-lg font-semibold text-lg flex items-center justify-center space-x-2"
                  >
                    <LogOut size={20} />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      onRoleSelect('admin');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 bg-[#264653] text-white hover:bg-[#2A9D8F]"
                  >
                    <UserCog size={20} />
                    <span>Administrativo</span>
                  </button>
                  <button
                    onClick={() => {
                      onRoleSelect('emprendedor');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 bg-[#2A9D8F] text-white hover:bg-[#264653]"
                  >
                    <Store size={20} />
                    <span>Emprendedor</span>
                  </button>
                </div>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

const HeroSection = () => (
  <section id="inicio" className="relative pt-24 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-[#264653] to-[#ffffffff]">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>

    <div className="container relative mx-auto px-4 sm:px-6 py-12 sm:py-20 text-white overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        <div className="flex-1 animate-fadeInUp w-full min-w-0">
          <div className="inline-block bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm mb-6 border border-white/20">
            Instituto Autónomo de Desarrollo Económico de Estado Yaracuy
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
            Impulsando el{" "}
            <span className="text-[#E9C46A] relative inline-block">
              Desarrollo
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0,5 Q25,0 50,5 T100,5" stroke="#E9C46A" strokeWidth="2" fill="none" />
              </svg>
            </span>
            <br />
            Socioeconómico de Yaracuy
          </h1>
          <p className="text-base sm:text-xl mb-8 text-gray-100 max-w-2xl">
            Fomentamos el crecimiento sobre la base de los principios de justicia social,
            democracia, eficiencia, libre competencia, protección del ambiente,
            productividad y solidaridad.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#/servicios"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = "/servicios";
              }}
              className="group flex items-center justify-center px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl bg-[#264653] text-white hover:bg-[#2A9D8F]"
            >
              Conocer Servicios
              <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </a>
            <a
              href="#/contacto"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = "/contacto";
              }}
              className="px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl bg-[#2A9D8F] text-white hover:bg-[#264653]"
            >
              Solicitar Asesoría
            </a>
          </div>

          <div className="flex flex-wrap gap-8 mt-12">
            <StatItem value="14" label="Municipios" />
            <StatItem value={<AnimatedCounter end={1000} suffix="+" />} label="Emprendedores" />
            <StatItem value={<AnimatedCounter end={500} suffix="+" />} label="Productores" />
          </div>
        </div>

        <div className="flex-1 relative animate-fadeInUp animation-delay-200">
          <div className="relative z-10">
            <img src={heroImage} alt="IADEY - Desarrollo Económico" className="rounded-2xl shadow-2xl w-full h-auto object-cover" />
          </div>
          <div className="absolute top-1/2 right-0 sm:-right-4 w-48 sm:w-72 h-48 sm:h-72 bg-[#E9C46A]/20 rounded-full blur-3xl pointer-events-none hidden sm:block"></div>
        </div>
      </div>
    </div>
  </section>
);

const StatItem = ({ value, label }) => (
  <div className="text-center">
    <div className="text-4xl font-bold text-[#E9C46A]">{value}</div>
    <div className="text-gray-200">{label}</div>
  </div>
);

const QuienesSomosSection = () => (
  <Section id="quienes-somos">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div className="animate-fadeInLeft">
        <span className="text-[#264653] font-semibold text-sm uppercase tracking-wider">
          Conócenos
        </span>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mt-2 mb-6">
          ¿Quiénes <span className="text-[#2A9D8F]">Somos</span>?
        </h2>
        <div className="prose prose-lg text-gray-600 space-y-4">
          <p>
            El Instituto Autónomo de Desarrollo Económico del Estado Yaracuy (IADEY)
            fomenta el crecimiento socioeconómico de nuestra entidad federal sobre
            la base de los principios de justicia social, democracia, eficiencia,
            libre competencia, protección del ambiente, productividad y solidaridad.
          </p>
          <p>
            Mediante programas y proyectos que conjugan el financiamiento, la
            capacitación y la asistencia técnica, trabajamos para asegurar el
            desarrollo humano integral de todos los yaracuyanos.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-xl">
            <div className="text-3xl font-bold text-[#2A9D8F]">14</div>
            <div className="text-sm text-gray-600">Municipios atendidos</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl">
            <div className="text-3xl font-bold text-[#2A9D8F]">20+</div>
            <div className="text-sm text-gray-600">Años de experiencia</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeInRight">
        {valores.slice(0, 4).map((valor, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition">
            <div className="text-[#264653] mb-3">{valor.icon}</div>
            <h3 className="font-bold text-lg mb-1">{valor.title}</h3>
            <p className="text-sm text-gray-600">{valor.text}</p>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

const ServiciosSection = () => (
  <Section id="servicios" bgColor="bg-gradient-to-b from-gray-50 to-white">
    <SectionHeader
      subtitle="Atención a los usuarios"
      title="Nuestros"
      highlight="Servicios"
      description="Acompañamiento integral para emprendedores, comerciantes y productores"
    />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {servicios.map((servicio, index) => (
        <ServicioCard key={index} servicio={servicio} />
      ))}
    </div>
  </Section>
);

const ServicioCard = ({ servicio }) => (
  <div className="group bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden">
    <div className={`h-2 bg-gradient-to-r ${servicio.color}`}></div>
    <div className="p-8">
      <div className={`w-16 h-16 bg-gradient-to-r ${servicio.color} rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
        {servicio.icon}
      </div>
      <h3 className="text-2xl font-bold mb-3">{servicio.title}</h3>
      <p className="text-gray-600 mb-6">{servicio.description}</p>

      <div className="space-y-3 mb-6">
        {servicio.items.map((item, i) => (
          <div key={i} className="flex items-center text-gray-700">
            <CheckCircle size={18} className="text-[#2A9D8F] mr-2 flex-shrink-0" />
            <span className="text-sm">{item}</span>
          </div>
        ))}
      </div>

      <Button className="w-full text-center mt-4">Solicitar información</Button>
    </div>
  </div>
);

const FeriasSection = () => (
  <Section id="ferias">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl animate-fadeInLeft">
        <h3 className="text-3xl font-bold mb-6">Expo-Ferias en los <span className="text-[#2A9D8F]">14 municipios</span></h3>
        <p className="text-gray-600 mb-8">
          Realizamos expo-ferias en todo el estado Yaracuy para dar a conocer las marcas
          y productos de cada uno de los emprendedores y productores agrícolas.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {municipios.map((municipio, index) => (
            <div key={index} className="bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-[#2A9D8F] hover:text-white transition">
              {municipio}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeInRight">
        <div className="bg-[#264653] text-white p-6 rounded-xl">
          <ShoppingBag size={40} className="mb-3" />
          <div className="text-2xl font-bold">200+</div>
          <div className="text-sm opacity-90">Emprendedores participantes</div>
        </div>
        <div className="bg-[#2A9D8F] text-white p-6 rounded-xl">
          <Sprout size={40} className="mb-3" />
          <div className="text-2xl font-bold">50+</div>
          <div className="text-sm opacity-90">Productores agrícolas</div>
        </div>
        <div className="bg-[#E9C46A] text-gray-800 p-6 rounded-xl sm:col-span-2">
          <Calendar size={40} className="mb-3" />
          <div className="text-2xl font-bold">Eventos mensuales</div>
          <div className="text-sm opacity-90">Próxima feria: Consultar calendario</div>
        </div>
      </div>
    </div>
  </Section>
);

const TestimoniosSection = () => (
  <Section id="testimonios" bgColor="bg-gradient-to-b from-gray-50 to-white">
    <SectionHeader
      subtitle="Testimonios"
      title="Voces del"
      highlight="Éxito"
      description="Emprendedores y productores que han crecido con nuestro apoyo"
    />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {testimonios.map((testimonio, index) => (
        <TestimonioCard key={index} testimonio={testimonio} />
      ))}
    </div>
  </Section>
);

const TestimonioCard = ({ testimonio }) => (
  <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-r ${testimonio.color} opacity-10 rounded-bl-full`}></div>
    <div className="flex items-center mb-6">
      <div className={`w-16 h-16 bg-gradient-to-r ${testimonio.color} rounded-2xl flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform duration-300`}>
        {testimonio.initials}
      </div>
      <div className="ml-4">
        <h4 className="font-bold text-lg">{testimonio.name}</h4>
        <p className="text-sm text-gray-500">Emprendedor {testimonio.year}</p>
      </div>
    </div>
    <p className="text-gray-600 italic mb-6">"{testimonio.text}"</p>
    <div className="flex text-[#E9C46A]">
      {[...Array(testimonio.rating)].map((_, i) => (
        <Star key={i} size={18} fill="currentColor" />
      ))}
    </div>
  </div>
);

const ContactoSection = () => (
  <section id="contacto" className="relative py-20 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-[#264653] to-[#2A9D8F]">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>

    <div className="container relative mx-auto px-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <ContactInfo />
        <ContactForm />
      </div>
    </div>
  </section>
);

const ContactInfo = () => (
  <div className="text-white animate-fadeInLeft">
    <h2 className="text-4xl md:text-5xl font-bold mb-6">
      ¿Listo para{" "}
      <span className="text-[#E9C46A]">emprender</span>?
    </h2>
    <p className="text-xl mb-8 text-gray-100">
      Contáctanos y descubre cómo podemos ayudarte a hacer crecer tu negocio o
      emprendimiento en el estado Yaracuy.
    </p>
    
    <div className="space-y-6">
      <ContactItem icon={<Phone size={20} />} label="Teléfono" value="+58 123 456 789" />
      <ContactItem icon={<Mail size={20} />} label="Email" value="info@iadey.gob.ve" />
      <ContactItem icon={<MapPin size={20} />} label="Oficina central" value="San Felipe, Estado Yaracuy" />
    </div>
    
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-3">Horario de atención</h3>
      <p className="text-gray-100">Lunes a Viernes: 8:00 am - 4:00 pm</p>
    </div>
  </div>
);

const ContactItem = ({ icon, label, value }) => (
  <div className="flex items-center group cursor-pointer">
    <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 group-hover:bg-white group-hover:text-[#264653] transition-all duration-300">
      {icon}
    </div>
    <div>
      <div className="text-sm text-gray-300">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  </div>
);

const ContactForm = () => (
  <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 animate-fadeInRight">
    <h3 className="text-2xl font-bold text-white mb-6">Solicita información</h3>
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <input type="text" placeholder="Nombre completo" className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-[#E9C46A] transition" />
      <input type="email" placeholder="Email" className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-[#E9C46A] transition" />
      <input type="tel" placeholder="Teléfono" className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-[#E9C46A] transition" />
      <select className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:border-[#E9C46A] transition">
        <option value="" className="bg-gray-800">Tipo de servicio</option>
        <option value="formacion" className="bg-gray-800">Formación</option>
        <option value="formalizacion" className="bg-gray-800">Formalización</option>
        <option value="financiamiento" className="bg-gray-800">Financiamiento</option>
        <option value="ferias" className="bg-gray-800">Ferias</option>
        <option value="asesorias" className="bg-gray-800">Asesorías</option>
      </select>
      <Button className="w-full">Enviar mensaje</Button>
    </form>
  </div>
);

const Footer = () => (
  <footer className="bg-gray-900 text-white py-12">
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="text-2xl font-bold mb-4">
            IADEY<span className="text-[#E9C46A]">.</span>
          </div>
          <p className="text-gray-400">
            Instituto Autónomo de Desarrollo Económico del Estado Yaracuy
          </p>
          <p className="text-gray-400 mt-2 text-sm">
            RIF: J-12345678-9
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-4">Servicios</h4>
          <ul className="space-y-2 text-gray-400">
            <li><a href="#/servicios" className="hover:text-[#E9C46A] transition">Formación</a></li>
            <li><a href="#/servicios" className="hover:text-[#E9C46A] transition">Formalización</a></li>
            <li><a href="#/servicios" className="hover:text-[#E9C46A] transition">Financiamiento</a></li>
            <li><a href="#/servicios" className="hover:text-[#E9C46A] transition">Ferias</a></li>
            <li><a href="#/servicios" className="hover:text-[#E9C46A] transition">Asesorías</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-4">Enlaces rápidos</h4>
          <ul className="space-y-2 text-gray-400">
            <li><a href="#" className="hover:text-[#E9C46A] transition">Preguntas frecuentes</a></li>
            <li><a href="#" className="hover:text-[#E9C46A] transition">Requisitos</a></li>
            <li><a href="#" className="hover:text-[#E9C46A] transition">Calendario de ferias</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-4">Legal</h4>
          <ul className="space-y-2 text-gray-400">
            <li><a href="#" className="hover:text-[#E9C46A] transition">Términos y condiciones</a></li>
            <li><a href="#" className="hover:text-[#E9C46A] transition">Política de privacidad</a></li>
            <li><a href="#" className="hover:text-[#E9C46A] transition">Base legal</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
        <p>
          &copy; 2024 IADEY - Instituto Autónomo de Desarrollo Económico del Estado Yaracuy.
          Todos los derechos reservados.
        </p>
      </div>
    </div>
  </footer>
);

// ================ PÁGINAS ================

const HomePage = () => (
  <>
    <HeroSection />
    <QuienesSomosSection />
    <ServiciosSection />
    <FeriasSection />
    <TestimoniosSection />
    <ContactoSection />
  </>
);

const QuienesSomosPage = () => (
  <div className="pt-24">
    <Section>
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          ¿Quiénes <span className="text-[#2A9D8F]">Somos</span>?
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Instituto Autónomo de Desarrollo Económico del Estado Yaracuy
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-20">
        <div className="prose prose-lg text-gray-600">
          <p>
            El Instituto Autónomo de Desarrollo Económico del Estado Yaracuy (IADEY)
            es una institución pública dedicada a fomentar el crecimiento socioeconómico
            de nuestra entidad federal sobre la base de los principios de justicia social,
            democracia, eficiencia, libre competencia, protección del ambiente,
            productividad y solidaridad.
          </p>
          <p>
            Desde nuestra fundación, hemos trabajado incansablemente para apoyar a
            emprendedores, comerciantes y productores del estado Yaracuy, brindándoles
            las herramientas necesarias para hacer crecer sus negocios y contribuir al
            desarrollo económico de la región.
          </p>
        </div>

        <div className="bg-gray-50 p-8 rounded-2xl">
          <h3 className="text-2xl font-bold mb-6">Misión y Visión</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-[#264653] mb-2">Misión</h4>
              <p className="text-gray-600">
                Impulsar el desarrollo económico del estado Yaracuy mediante programas
                y proyectos que conjugan el financiamiento, la capacitación y la asistencia
                técnica, asegurando el desarrollo humano integral de todos los yaracuyanos.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-[#264653] mb-2">Visión</h4>
              <p className="text-gray-600">
                Ser la institución líder en el fomento del desarrollo económico sostenible
                en el estado Yaracuy, reconocida por su innovación, eficiencia y compromiso
                social.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-center mb-12">Nuestros Valores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {valores.map((valor, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition">
              <div className="text-[#264653] mb-3">{valor.icon}</div>
              <h3 className="font-bold text-lg mb-2">{valor.title}</h3>
              <p className="text-gray-600">{valor.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  </div>
);

const ServiciosPage = () => (
  <div className="pt-24">
    <Section bgColor="bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          Nuestros <span className="text-[#2A9D8F]">Servicios</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Acompañamiento integral para emprendedores, comerciantes y productores
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {servicios.map((servicio, index) => (
          <ServicioCard key={index} servicio={servicio} />
        ))}
      </div>
    </Section>
  </div>
);

const FormacionPage = () => {
  const programas = [
    {
      title: "Universidad del Emprendimiento",
      duration: "6 meses",
      modality: "Mixta (Presencial/Virtual)",
      description: "Programa integral para desarrollar habilidades empresariales",
      topics: [
        "Plan de negocios",
        "Marketing digital",
        "Finanzas para emprendedores",
        "Liderazgo y gestión"
      ]
    },
    {
      title: "Talleres de Capacitación",
      duration: "Variable",
      modality: "Presencial",
      description: "Cursos especializados en diversas áreas del emprendimiento",
      topics: [
        "Formalización de empresas",
        "E-commerce",
        "Redes sociales para negocios",
        "Atención al cliente"
      ]
    },
    {
      title: "Diplomado en Gestión Empresarial",
      duration: "4 meses",
      modality: "Virtual",
      description: "Formación avanzada en administración de empresas",
      topics: [
        "Gestión financiera",
        "Recursos humanos",
        "Marketing estratégico",
        "Operaciones y logística"
      ]
    }
  ];

  return (
    <div className="pt-24">
      <Section>
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 mb-6">
            Programas de <span className="text-[#2A9D8F]">Formación</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Capacitación integral para el desarrollo de tus habilidades empresariales
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          {programas.map((programa, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-[#264653] to-[#2A9D8F]"></div>
              <div className="p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-[#264653] to-[#2A9D8F] rounded-xl flex items-center justify-center text-white mb-6">
                  <BookOpen size={32} />
                </div>
                
                <h3 className="text-2xl font-bold mb-4">{programa.title}</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-600">
                    <Clock size={18} className="mr-2" />
                    <span className="text-sm">Duración: {programa.duration}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users size={18} className="mr-2" />
                    <span className="text-sm">Modalidad: {programa.modality}</span>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4">{programa.description}</p>
                
                <div className="space-y-2 mb-6">
                  {programa.topics.map((topic, i) => (
                    <div key={i} className="flex items-center text-gray-700">
                      <CheckCircle size={16} className="text-[#2A9D8F] mr-2" />
                      <span className="text-sm">{topic}</span>
                    </div>
                  ))}
                </div>
                
                <Button className="w-full">Inscribirme</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-[#264653] to-[#2A9D8F] rounded-3xl p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">¿Listo para comenzar tu formación?</h2>
          <p className="text-xl mb-8 opacity-90">
            Inscríbete en nuestros programas y lleva tu emprendimiento al siguiente nivel
          </p>
          <Button variant="secondary" className="bg-white text-[#264653] hover:bg-gray-100">
            Ver calendario de cursos
          </Button>
        </div>
      </Section>
    </div>
  );
};

const ContactoPage = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    tipo: '',
    mensaje: ''
  });
  const [enviado, setEnviado] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "telefono" ? onlyPhoneDigits(value, 11) : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Formulario enviado:', formData);
    setEnviado(true);
    setTimeout(() => setEnviado(false), 5000);
  };

  const oficinas = [
    {
      ciudad: "San Felipe",
      direccion: "Av. Principal, Edif. IADEY, San Felipe, Estado Yaracuy",
      telefono: "+58 123 456 789",
      email: "sanfelipe@iadey.gob.ve",
      horario: "Lun-Vie: 8:00 am - 4:00 pm"
    },
    {
      ciudad: "Nirgua",
      direccion: "Calle Bolívar, Local IADEY, Nirgua, Estado Yaracuy",
      telefono: "+58 123 456 790",
      email: "nirgua@iadey.gob.ve",
      horario: "Lun-Vie: 8:00 am - 4:00 pm"
    },
    {
      ciudad: "Yaritagua",
      direccion: "Av. Independencia, Edif. IADEY, Yaritagua, Estado Yaracuy",
      telefono: "+58 123 456 791",
      email: "yaritagua@iadey.gob.ve",
      horario: "Lun-Vie: 8:00 am - 4:00 pm"
    }
  ];

  return (
    <div className="pt-24">
      <Section>
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 mb-6">
            <span className="text-[#2A9D8F]">Contacto</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Estamos aquí para ayudarte. Contáctanos por cualquier consulta o solicitud
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Envíanos un mensaje</h2>
            
            {enviado ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-700 mb-2">¡Mensaje enviado!</h3>
                <p className="text-green-600">
                  Nos pondremos en contacto contigo a la brevedad posible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  name="nombre"
                  placeholder="Nombre completo"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Correo electrónico"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent"
                />
                <input
                  type="tel"
                  name="telefono"
                  placeholder="Teléfono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent"
                />
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent"
                >
                  <option value="">Tipo de consulta</option>
                  <option value="formacion">Formación</option>
                  <option value="formalizacion">Formalización</option>
                  <option value="financiamiento">Financiamiento</option>
                  <option value="ferias">Ferias</option>
                  <option value="asesoria">Asesoría</option>
                  <option value="otro">Otro</option>
                </select>
                <textarea
                  name="mensaje"
                  placeholder="Mensaje"
                  value={formData.mensaje}
                  onChange={handleChange}
                  required
                  rows="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:border-transparent"
                ></textarea>
                <Button type="submit" className="w-full flex items-center justify-center">
                  Enviar mensaje
                </Button>
              </form>
            )}
          </div>

          <div>
            <div className="bg-gradient-to-r from-[#264653] to-[#2A9D8F] rounded-2xl p-8 text-white mb-8">
              <h2 className="text-2xl font-bold mb-6">Información de contacto</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="mr-3 flex-shrink-0" size={20} />
                  <p>Av. Principal, Edif. IADEY, San Felipe, Estado Yaracuy</p>
                </div>
                <div className="flex items-center">
                  <Phone className="mr-3" size={20} />
                  <p>+58 123 456 789</p>
                </div>
                <div className="flex items-center">
                  <Mail className="mr-3" size={20} />
                  <p>info@iadey.gob.ve</p>
                </div>
                <div className="flex items-start">
                  <Clock className="mr-3 flex-shrink-0" size={20} />
                  <p>Lunes a Viernes: 8:00 am - 4:00 pm<br />Sábados: 9:00 am - 12:00 pm</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">Oficinas regionales</h2>
              <div className="space-y-6">
                {oficinas.map((oficina, index) => (
                  <div key={index} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                    <h3 className="font-bold text-[#264653] mb-2">{oficina.ciudad}</h3>
                    <p className="text-sm text-gray-600 mb-1">{oficina.direccion}</p>
                    <p className="text-sm text-gray-600 mb-1">📞 {oficina.telefono}</p>
                    <p className="text-sm text-gray-600 mb-1">✉️ {oficina.email}</p>
                    <p className="text-sm text-gray-600">🕒 {oficina.horario}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-xl h-96">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3927.362245439106!2d-68.7423826!3d10.1604899!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e8868b3b3b3b3b3%3A0x3b3b3b3b3b3b3b3b!2sSan%20Felipe%2C%20Yaracuy!5e0!3m2!1ses!2sve!4v1620000000000!5m2!1ses!2sve"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            title="Mapa de ubicación"
          ></iframe>
        </div>
      </Section>
    </div>
  );
};

// ================ COMPONENTE PRINCIPAL CON ROUTER ================

const App = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedRole, setSelectedRole] = useState(null);

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || "/";
      setCurrentPath(hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    // Redirigir al login correspondiente según el rol
    if (role === 'admin') {
      window.location.hash = "/login-administrativo";
    } else {
      window.location.hash = "/login";
    }
  };

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setSelectedRole(null);
    
    // Redirigir según el rol
    if (userData.role === 'admin') {
      window.location.hash = "/admin/dashboard";
    } else {
      window.location.hash = "/emprendedor/dashboard";
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setSelectedRole(null);
    window.location.hash = "/";
  };

  const renderPage = () => {
    // Rutas protegidas
    if (currentPath === "/admin/dashboard" && (!isAuthenticated || user?.role !== 'admin')) {
      window.location.hash = "/";
      return null;
    }
    
    if (currentPath === "/emprendedor/dashboard" && (!isAuthenticated || user?.role !== 'emprendedor')) {
      window.location.hash = "/";
      return null;
    }

    switch (currentPath) {
      case "/login":
        return <LoginEmprendedor 
          onLoginSuccess={handleLoginSuccess} 
          selectedRole="emprendedor"
        />;
      case "/login-administrativo":
        return <LoginAdministrativo 
          onLoginSuccess={handleLoginSuccess} 
          selectedRole="admin"
        />;
      case "/admin/dashboard":
        return <AdminDashboard user={user} />;
      case "/emprendedor/dashboard":
        return <EmprendedorDashboard user={user} />;
      case "/quienes-somos":
        return <QuienesSomosPage />;
      case "/servicios":
        return <ServiciosPage />;
      case "/formacion":
        return <FormacionPage />;
      case "/contacto":
        return <ContactoPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {currentPath !== "/login" && currentPath !== "/login-administrativo" && (
        <Header
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
          onRoleSelect={handleRoleSelect}
        />
      )}
      <main>
        {renderPage()}
      </main>
      {currentPath !== "/login" && currentPath !== "/login-administrativo" && <Footer />}

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
        .animate-fadeInLeft { animation: fadeInLeft 0.6s ease-out forwards; }
        .animate-fadeInRight { animation: fadeInRight 0.6s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animation-delay-200 { animation-delay: 200ms; opacity: 0; animation-fill-mode: forwards; }
      `}</style>
    </div>
  );
};

export default App;