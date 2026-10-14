// components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const Footer = ({ darkMode }) => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { text: "Panel de control", to: "/Dashboard" },
    { text: "Solicitudes", to: "/Solicitud" },
    { text: "Expedientes", to: "/Expediente" },
    { text: "Inspecciones", to: "/Inspeccion" },
    { text: "Aprobaciones", to: "/Aprobacion" },
    { text: "Gráficos", to: "/Graficos" },
  ];

  const operacionLinks = [
    { text: "Citas", to: "/Citas" },
    { text: "Contratos", to: "/Contrato" },
    { text: "Desembolsos", to: "/Desembolso" },
    { text: "Cuotas", to: "/Cuota" },
    { text: "Bancarios", to: "/Bancarios" },
  ];

  const contactInfo = [
    { icon: Mail, text: "info@iadey.gob.ve", href: "mailto:info@iadey.gob.ve" },
    { icon: Phone, text: "+58 0254-231-0000", href: "tel:+5802542310000" },
    { icon: MapPin, text: "San Felipe, Yaracuy", href: null },
  ];

  const linkClass = `text-sm hover:text-[#2A9D8F] transition-colors ${
    darkMode ? "text-gray-400" : "text-gray-600"
  }`;

  return (
    <footer
      className={`mt-auto ${
        darkMode ? "bg-gray-950 text-gray-300" : "bg-gradient-to-b from-white to-[#eef7f5] text-gray-600"
      } border-t ${darkMode ? "border-teal-900/40" : "border-teal-100"}`}
    >
      <div className="h-1 bg-gradient-to-r from-[#264653] via-[#2A9D8F] to-[#E9C46A]" />
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3
              className={`text-lg font-semibold ${
                darkMode ? "text-teal-200" : "text-[#264653]"
              }`}
            >
              SICCE
            </h3>
            <p className="text-sm leading-relaxed">
              Sistema de información de créditos y control de emprendimientos
              del Instituto Autónomo de Desarrollo Económico del Estado Yaracuy
              (IADEY).
            </p>
          </div>

          <div className="space-y-4">
            <h3
              className={`text-lg font-semibold ${
                darkMode ? "text-teal-200" : "text-[#264653]"
              }`}
            >
              Módulos
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3
              className={`text-lg font-semibold ${
                darkMode ? "text-teal-200" : "text-[#264653]"
              }`}
            >
              Operación
            </h3>
            <ul className="space-y-2">
              {operacionLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3
              className={`text-lg font-semibold ${
                darkMode ? "text-teal-200" : "text-[#264653]"
              }`}
            >
              Contacto
            </h3>
            <ul className="space-y-3">
              {contactInfo.map((item) => {
                const Icon = item.icon;
                const content = (
                  <>
                    <Icon size={16} className="shrink-0 text-[#2A9D8F]" />
                    <span className="text-sm">{item.text}</span>
                  </>
                );
                return (
                  <li key={item.text}>
                    {item.href ? (
                      <a
                        href={item.href}
                        className={`inline-flex items-center gap-2 hover:text-[#2A9D8F] ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {content}
                      </a>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-2 ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {content}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div
          className={`mt-8 pt-6 border-t text-center text-xs ${
            darkMode
              ? "border-gray-800 text-gray-500"
              : "border-gray-200 text-gray-500"
          }`}
        >
          © {currentYear} SICCE · IADEY. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
