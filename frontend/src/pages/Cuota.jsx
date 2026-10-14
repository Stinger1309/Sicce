// ============================================================
// FUNCIONES DE CÁLCULO DE MORA
// ============================================================

const calcularDiasMora = (fechaVencimiento, fechaPago, estado, fechaCierre = null) => {
    if (estado === 'pagado' && fechaPago) {
        const vencimiento = new Date(fechaVencimiento);
        const pago = new Date(fechaPago);
        vencimiento.setHours(0, 0, 0, 0);
        pago.setHours(0, 0, 0, 0);
        
        if (pago <= vencimiento) {
            return 0;
        }
        
        const diffTime = pago - vencimiento;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    
    if (estado !== 'pagado') {
        const vencimiento = new Date(fechaVencimiento);
        vencimiento.setHours(0, 0, 0, 0);
        
        let fechaReferencia;
        if (fechaCierre) {
            fechaReferencia = new Date(fechaCierre);
        } else {
            fechaReferencia = new Date();
        }
        fechaReferencia.setHours(0, 0, 0, 0);
        
        if (fechaReferencia <= vencimiento) {
            return 0;
        }
        
        const diffTime = fechaReferencia - vencimiento;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 5) {
            return 0;
        }
        
        return diffDays;
    }
    
    return 0;
};

const resolverTasaMoraAnual = (fuente) => {
    // Créditos UVC (BCV): mora máxima adicional 0,80% anual.
    const pct = parseFloat(fuente?.morosidad ?? fuente?.morosidad_porcentaje);
    let tasa = 0.008;
    if (Number.isFinite(pct) && pct > 0) {
        tasa = pct > 1 ? pct / 100 : pct;
    } else {
        const decimal = parseFloat(fuente?.interes_mora ?? fuente?.tasaInteresMora);
        if (Number.isFinite(decimal) && decimal > 0) {
            tasa = decimal > 1 ? decimal / 100 : decimal;
        }
    }
    return Math.min(Math.max(tasa, 0), 0.008);
};

/** Tasa diaria = tasa anual / 360 (año comercial VE) */
const calcularTasaMoraDiaria = (tasaAnual) => {
    const tasa = Number(tasaAnual) > 0 ? Number(tasaAnual) : 0.008;
    return Math.min(tasa, 0.008) / 360;
};

/** Mora = Monto × tasa diaria × días (interés simple) */
const calcularMontoMorosidadDiario = (montoCuota, diasMora, tasaMoraDiaria, montoAbonado = 0) => {
    if (diasMora <= 0 || montoCuota <= 0) {
        return 0;
    }
    
    const montoMora = montoCuota * tasaMoraDiaria * diasMora;
    const montoFinal = Math.max(0, montoMora - (Number(montoAbonado) || 0));
    
    return Math.round(montoFinal * 100) / 100;
};

// ============================================================
// IMPORTS
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { useSidebarState } from '../hooks/useAppShell';
import { useNavigate } from "react-router-dom";
import { 
  Search, Plus, CreditCard, Clock, AlertCircle,
  TrendingUp, Calendar, CheckCircle, XCircle, Eye, Download,
  Wallet, Receipt, PhoneCall, User, FileText,
  LayoutGrid, List, Settings, Lock, Loader, Image as ImageIcon
} from "lucide-react";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import Pagination from "../components/Pagination";
import ExportButtons from "../components/ExportButtons";
import CuotaAPI from '../services/api_cuota';
import usuarioAPI from '../services/api_usuario';
import uvcAPI from '../services/api_uvc';
import { uploadToImgBB } from '../services/imgbbService';
import { formatCedulaInput, onlyPhoneDigits, alphanumericRef, blockInvalidNumberKeys } from '../utils/inputFormat';

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

const Cuota = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useSidebarState();
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCuota, setSelectedCuota] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentReceiptModal, setShowPaymentReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  const [allPrestamos, setAllPrestamos] = useState([]);
  const [myPrestamos, setMyPrestamos] = useState([]);
  const [allCuotas, setAllCuotas] = useState([]);
  const [myCuotas, setMyCuotas] = useState([]);
  
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);
  const [activeView, setActiveView] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [fechaCierre, setFechaCierre] = useState(new Date().toISOString().split('T')[0]);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedPrestamoForGeneration, setSelectedPrestamoForGeneration] = useState(null);
  const [generationConfig, setGenerationConfig] = useState({
    cantidadCuotas: 0,
    montoPorCuota: 0,
    frecuencia: "mensual",
    fechaPrimeraCuota: "",
    incluirMora: false
  });
  const [puedeVerificarPagos, setPuedeVerificarPagos] = useState(false);
  const [esEmprendedorCuota, setEsEmprendedorCuota] = useState(false);
  const [uvcInfo, setUvcInfo] = useState(null);
  const [uvcError, setUvcError] = useState(null);

  const user = {
    name: "Administrador IADEY",
    email: "admin@iadey.gob.ve",
    role: "Administrador",
    avatar: null,
    department: "Gestión de Cuotas",
    joinDate: "Enero 2024"
  };

  const [notifications, setNotifications] = useState([
    { id: 1, text: "Pago de cuota registrado", time: "5 min", read: false },
    { id: 2, text: "Nuevo vencimiento próximo", time: "1 hora", read: false },
    { id: 3, text: "Actualización de tasas", time: "3 horas", read: true },
  ]);

  // ============================================================
  // FUNCIONES DE UTILIDAD
  // ============================================================
  
  const isCuotaVigente = (fechaDesde, fechaHasta) => {
    if (!fechaDesde || !fechaHasta) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const desde = new Date(fechaDesde);
    desde.setHours(0, 0, 0, 0);
    const hasta = new Date(fechaHasta);
    hasta.setHours(23, 59, 59, 999);
    return hoy >= desde && hoy <= hasta;
  };

  const getCuotaStatus = (fechaVencimiento, fechaPago, estadoBase, fechaDesde, fechaHasta) => {
    if (estadoBase === "pagado") return "pagado";
    if (estadoBase === "por_confirmar") return "por_confirmar";
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      desde.setHours(0, 0, 0, 0);
      if (hoy < desde) return "proxima";
    }
    
    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);
    
    if (estadoBase === "pendiente") {
      const diffDays = Math.floor((hoy - vencimiento) / (1000 * 60 * 60 * 24));
      
      if (hoy > vencimiento) {
        if (diffDays <= 5) return "en_gracia";
        if (diffDays > 30) return "vencido";
        return "en_mora";
      }
      
      if (isCuotaVigente(fechaDesde, fechaHasta)) return "vigente";
      return "pendiente";
    }
    
    return estadoBase;
  };

  const getProximaCuotaPagableId = (prestamo) => {
    const pendientes = (prestamo?.cuotas || [])
      .filter((c) => c.estado !== "pagado" && c.estado !== "por_confirmar")
      .sort((a, b) => {
        const fa = a.fechaVencimiento || a.fechaHasta || "";
        const fb = b.fechaVencimiento || b.fechaHasta || "";
        if (fa !== fb) return String(fa).localeCompare(String(fb));
        return Number(a.numero) - Number(b.numero);
      });
    return pendientes[0]?.id ?? null;
  };

  const canPayCuota = (cuota, prestamo) => {
    if (!esEmprendedorCuota) return false;
    if (cuota.estado === "pagado" || cuota.estado === "por_confirmar") return false;
    const proximaId = getProximaCuotaPagableId(prestamo);
    return proximaId != null && String(proximaId) === String(cuota.id);
  };

  const getEstadoConfig = (cuota) => {
    const status = getCuotaStatus(cuota.fechaVencimiento, cuota.fechaPago, cuota.estado, cuota.fechaDesde, cuota.fechaHasta);
    
    switch(status) {
      case "pagado":
        return { text: "Pagado", color: "text-green-600", bg: "bg-green-100", icon: CheckCircle };
      case "por_confirmar":
        return { text: "Por confirmar", color: "text-amber-700", bg: "bg-amber-100", icon: Clock };
      case "abono_parcial":
        return { text: "Abono parcial", color: "text-purple-700", bg: "bg-purple-100", icon: Receipt };
      case "vigente":
        return { text: "Vigente", color: "text-blue-600", bg: "bg-blue-100", icon: CreditCard };
      case "en_gracia":
        return { text: "En Gracia", color: "text-teal-600", bg: "bg-teal-100", icon: Clock };
      case "vencido":
        return { text: "Vencido", color: "text-red-600", bg: "bg-red-100", icon: XCircle };
      case "en_mora":
        return { text: "En Mora", color: "text-orange-600", bg: "bg-orange-100", icon: AlertCircle };
      case "proxima":
        return { text: "Próxima", color: "text-gray-600", bg: "bg-gray-100", icon: Lock };
      default:
        return { text: "Pendiente", color: "text-yellow-600", bg: "bg-yellow-100", icon: Clock };
    }
  };

  // ============================================================
  // FUNCIONES PARA FORMATEAR CONTRATOS
  // ============================================================
  
  const formatearContratos = (data, fechaActual) => {
    return data.map(contrato => {
      const tasaMoraAnual = resolverTasaMoraAnual(contrato);
      const tasaDiaria = calcularTasaMoraDiaria(tasaMoraAnual);
      
      const cuotasConMora = (contrato.cuotas || []).map(cuota => {
        const fechaVencimiento = cuota.fecha_hasta ? cuota.fecha_hasta.split('T')[0] : 
                                cuota.fecha_vencimiento ? cuota.fecha_vencimiento.split('T')[0] : '';
        
        const diasMora = calcularDiasMora(
          fechaVencimiento,
          (cuota.fecha_pagada || cuota.fecha_pago)
            ? String(cuota.fecha_pagada || cuota.fecha_pago).split('T')[0]
            : null,
          cuota.estado_cuota,
          fechaActual
        );
        
        const moraPagada = parseFloat(cuota.pagado_interes_mora || 0) || 0;
        const montoMorosidadCalc = calcularMontoMorosidadDiario(
          parseFloat(cuota.monto_cuota) || 0,
          diasMora,
          tasaDiaria,
          moraPagada
        );
        const moraBackend = parseFloat(cuota.monto_morosidad);
        const montoMorosidad =
          cuota.monto_morosidad != null && cuota.monto_morosidad !== '' && !Number.isNaN(moraBackend)
            ? Math.max(moraBackend, montoMorosidadCalc)
            : montoMorosidadCalc;
        
        return {
          id: cuota.id_cuota,
          numero: cuota.num_cuota,
          fechaDesde: cuota.fecha_desde ? cuota.fecha_desde.split('T')[0] : '',
          fechaHasta: cuota.fecha_hasta ? cuota.fecha_hasta.split('T')[0] : '',
          fechaVencimiento: fechaVencimiento,
          monto: parseFloat(cuota.monto_cuota) || 0,
          estado: cuota.estado_cuota,
          fechaPago: (cuota.fecha_pagada || cuota.fecha_pago)
            ? String(cuota.fecha_pagada || cuota.fecha_pago).split('T')[0]
            : null,
          comprobante: cuota.comprobante || cuota.comprobante_pago || null,
          montoPagado: parseFloat(cuota.monto_pagado_acumulado || cuota.monto_pagado) || 0,
          moraPagada,
          dias_mora_cuota: Math.max(parseFloat(cuota.dias_mora_cuota) || 0, diasMora),
          monto_morosidad: montoMorosidad,
          tasa_mora_diaria: tasaDiaria,
          metodoPago: cuota.metodo_pago || null,
          titularCedula: cuota.titular_cedula || null,
          titularNombre: cuota.titular_nombre || null,
          telefonoPago: cuota.telefono_pago || null,
          referencia: cuota.referencia_pago || null,
          tipo_cuota: cuota.tipo_cuota || cuota.tipo || 'Obligatoria',
          usuario_asignado: cuota.usuario_asignado || null,
          capital_cuota: parseFloat(cuota.capital_cuota) || 0,
          interes_corriente: parseFloat(cuota.interes_corriente) || 0,
          gasto_cobranza: parseFloat(cuota.gasto_cobranza) || 0,
          deuda_cascada: cuota.deuda_cascada || null,
          total_pendiente_cascada:
            parseFloat(cuota.total_pendiente_cascada) || null,
        };
      });
      
      const clienteNombre =
        contrato.cliente_nombre ||
        contrato.aprobacion?.cliente_nombre ||
        contrato.emprendedor ||
        'Cliente';
      const clienteCedula =
        contrato.cliente_cedula ||
        contrato.id_cedula_aprob ||
        contrato.cedula_persona_id ||
        contrato.aprobacion?.cliente_cedula ||
        '';

      return {
        id: contrato.id_contrato,
        id_cedula_aprob: contrato.id_cedula_aprob || clienteCedula,
        numero_contrato: contrato.numero_contrato,
        cliente: String(clienteNombre).trim() || 'Cliente',
        cedula: clienteCedula,
        telefono: contrato.cliente_telefono || contrato.aprobacion?.cliente_telefono || '',
        email: contrato.cliente_email || contrato.aprobacion?.cliente_email || '',
        direccion: contrato.cliente_direccion || contrato.aprobacion?.cliente_direccion || '',
        montoTotal: parseFloat(contrato.devolvimiento) || 0,
        montoPagado: 0,
        saldoPendiente: parseFloat(contrato.monto_moneda) || 0,
        tasaInteres: parseFloat(contrato.interes) || 0,
        tasaInteresMora: tasaMoraAnual,
        morosidad: contrato.morosidad,
        plazo: contrato.numero_cuotas || 0,
        cuotasPagadas: 0,
        numero_gracias: contrato.numero_gracias || 0,
        devolvimiento: contrato.devolvimiento,
        monto_moneda: contrato.monto_moneda,
        cuotasPendientes: contrato.numero_cuotas || 0,
        estado: contrato.estatus === 'En espera de cuotas' ? 'pendiente' : 
                contrato.estatus === 'Activo' ? 'activo' :
                contrato.estatus === 'Legal' ? 'legal' :
                contrato.estatus === 'Finalizado' ? 'finalizado' : 'pagado',
        estatusContrato: contrato.estatus,
        fechaInicio: contrato.inicio ? contrato.inicio.split('T')[0] : '',
        fechaCierre: contrato.cierre ? contrato.cierre.split('T')[0] : null,
        montoCuota: cuotasConMora.length > 0 ? cuotasConMora[0].monto : 0,
        cuotas: cuotasConMora,
        totalMorosidad: cuotasConMora.reduce((sum, c) => sum + (c.monto_morosidad || 0), 0)
      };
    });
  };

  // ============================================================
  // CARGAR TODOS LOS CONTRATOS (getAll)
  // ============================================================
  const cargarTodosLosContratos = async () => {
    try {
      setLoadingAll(true);
      console.log('📋 Cargando TODOS los contratos con CuotaAPI.getAll()');
      
      const response = await CuotaAPI.getAll();
      
      if (response.success) {
        const fechaActual = new Date().toISOString().split('T')[0];
        const contratosFormateados = formatearContratos(response.data, fechaActual);
        
        contratosFormateados.forEach(contrato => {
          const pagadas = contrato.cuotas.filter(c => c.estado === 'pagado');
          contrato.cuotasPagadas = pagadas.length;
          contrato.cuotasPendientes = contrato.plazo - pagadas.length;
          contrato.montoPagado = pagadas.reduce((sum, c) => sum + c.monto, 0);
          contrato.saldoPendiente = Math.max(0, contrato.montoTotal - contrato.montoPagado);
        });
        
        setAllPrestamos(contratosFormateados);
        
        const todasLasCuotas = [];
        contratosFormateados.forEach(contrato => {
          contrato.cuotas.forEach(cuota => {
            todasLasCuotas.push({
              ...cuota,
              contratoId: contrato.id,
              id_cedula_aprob: contrato.id_cedula_aprob,
              numero_contrato: contrato.numero_contrato,
              cliente: contrato.cliente,
              cedula: contrato.cedula,
              montoTotal: contrato.montoTotal,
              plazo: contrato.plazo,
              estadoContrato: contrato.estado,
              totalMorosidad: contrato.totalMorosidad
            });
          });
        });
        setAllCuotas(todasLasCuotas);
        
        console.log('✅ Total contratos:', contratosFormateados.length);
        console.log('✅ Total cuotas:', todasLasCuotas.length);
      }
    } catch (error) {
      console.error('Error al cargar todos los contratos:', error);
    } finally {
      setLoadingAll(false);
    }
  };

  // ============================================================
  // CARGAR MIS CONTRATOS (getByCedulaAprob)
  // ============================================================
  const cargarMisContratos = async () => {
    try {
      setLoadingMine(true);
      
      const userData = usuarioAPI.getCurrentUser();
      const cedula = userData?.cedula_usuario || userData?.cedula;
      
      if (!cedula) {
        console.warn('⚠️ Usuario sin cédula, no se pueden cargar "Mis Cuotas"');
        setMyPrestamos([]);
        setMyCuotas([]);
        return;
      }
      
      console.log(`👤 Cargando MIS contratos para cédula: ${cedula}`);
      console.log('🔗 Usando CuotaAPI.getByCedulaAprob()');
      
      const response = await CuotaAPI.getByCedulaAprob(cedula);
      
      if (response.success) {
        const fechaActual = new Date().toISOString().split('T')[0];
        const contratosFormateados = formatearContratos(response.data, fechaActual);
        
        contratosFormateados.forEach(contrato => {
          const pagadas = contrato.cuotas.filter(c => c.estado === 'pagado');
          contrato.cuotasPagadas = pagadas.length;
          contrato.cuotasPendientes = contrato.plazo - pagadas.length;
          contrato.montoPagado = pagadas.reduce((sum, c) => sum + c.monto, 0);
          contrato.saldoPendiente = Math.max(0, contrato.montoTotal - contrato.montoPagado);
        });
        
        setMyPrestamos(contratosFormateados);
        
        const misCuotas = [];
        contratosFormateados.forEach(contrato => {
          contrato.cuotas.forEach(cuota => {
            misCuotas.push({
              ...cuota,
              contratoId: contrato.id,
              id_cedula_aprob: contrato.id_cedula_aprob,
              numero_contrato: contrato.numero_contrato,
              cliente: contrato.cliente,
              cedula: contrato.cedula,
              montoTotal: contrato.montoTotal,
              plazo: contrato.plazo,
              estadoContrato: contrato.estado,
              totalMorosidad: contrato.totalMorosidad
            });
          });
        });
        setMyCuotas(misCuotas);
        
        console.log('✅ Mis contratos:', contratosFormateados.length);
        console.log('✅ Mis cuotas:', misCuotas.length);
      }
    } catch (error) {
      console.error('Error al cargar mis contratos:', error);
      setMyPrestamos([]);
      setMyCuotas([]);
    } finally {
      setLoadingMine(false);
    }
  };

  // ============================================================
  // ACTUALIZAR MOROSIDAD
  // ============================================================
  const actualizarMorosidadDiaria = useCallback(() => {
    const fechaActual = new Date().toISOString().split('T')[0];
    
    setAllPrestamos(prev => prev.map(prestamo => {
      const tasaMoraAnual = resolverTasaMoraAnual(prestamo);
      const tasaDiaria = calcularTasaMoraDiaria(tasaMoraAnual);
      
      const cuotasActualizadas = prestamo.cuotas.map(cuota => {
        if (cuota.estado !== 'pagado') {
          const diasMora = calcularDiasMora(
            cuota.fechaVencimiento,
            cuota.fechaPago,
            cuota.estado,
            fechaActual
          );
          const montoMorosidad = calcularMontoMorosidadDiario(
            cuota.monto,
            diasMora,
            tasaDiaria,
            cuota.moraPagada || 0
          );
          return { ...cuota, dias_mora_cuota: diasMora, monto_morosidad: montoMorosidad };
        }
        return cuota;
      });
      
      return { ...prestamo, tasaInteresMora: tasaMoraAnual, cuotas: cuotasActualizadas };
    }));
    
    setMyPrestamos(prev => prev.map(prestamo => {
      const tasaMoraAnual = resolverTasaMoraAnual(prestamo);
      const tasaDiaria = calcularTasaMoraDiaria(tasaMoraAnual);
      
      const cuotasActualizadas = prestamo.cuotas.map(cuota => {
        if (cuota.estado !== 'pagado') {
          const diasMora = calcularDiasMora(
            cuota.fechaVencimiento,
            cuota.fechaPago,
            cuota.estado,
            fechaActual
          );
          const montoMorosidad = calcularMontoMorosidadDiario(
            cuota.monto,
            diasMora,
            tasaDiaria,
            cuota.moraPagada || 0
          );
          return { ...cuota, dias_mora_cuota: diasMora, monto_morosidad: montoMorosidad };
        }
        return cuota;
      });
      
      return { ...prestamo, tasaInteresMora: tasaMoraAnual, cuotas: cuotasActualizadas };
    }));
  }, []);

  // ============================================================
  // REGISTRAR PAGO
  // ============================================================
  const handleRegisterPayment = async (prestamoId, cuotaNumero, pagoData) => {
    try {
      const {
        montoPagado,
        comprobante,
        metodoPago,
        referencia,
        mora,
        diasMora,
        titularCedula,
        titularNombre,
        telefonoPago,
      } = pagoData;
      const fecha_pagada = new Date().toISOString().split('T')[0];
      
      const cuotaEncontrada =
        allCuotas.find((c) => c.contratoId === prestamoId && c.numero === cuotaNumero) ||
        myCuotas.find((c) => c.contratoId === prestamoId && c.numero === cuotaNumero);
      
      if (!cuotaEncontrada) {
        throw new Error('Cuota no encontrada');
      }
      
      let comprobanteUrl = null;
      if (comprobante instanceof File) {
        try {
          const uploadResult = await uploadToImgBB(comprobante);
          comprobanteUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Error al subir comprobante:', uploadError);
          throw new Error(
            uploadError?.message || 'Error al subir el comprobante de pago'
          );
        }
      } else if (typeof comprobante === 'string' && comprobante.startsWith('http')) {
        comprobanteUrl = comprobante;
      } else if (comprobante?.url) {
        comprobanteUrl = comprobante.url;
      }

      if (!comprobanteUrl) {
        throw new Error('El comprobante de pago es obligatorio');
      }

      // Calentar caché IDI del servidor antes del pago (evita fallo intermitente BCV)
      try {
        const uvcRes = await uvcAPI.getValorActual();
        if (!uvcRes.success || !uvcRes.data?.valor_idi) {
          throw new Error(
            uvcRes.error ||
              'No se pudo obtener el IDI/UVC del BCV. Reintente el pago en unos segundos.'
          );
        }
        setUvcInfo(uvcRes.data);
        setUvcError(null);
      } catch (uvcErr) {
        throw new Error(
          uvcErr.error ||
            uvcErr.message ||
            'No se pudo obtener el IDI/UVC del BCV. Reintente el pago en unos segundos.'
        );
      }
      
      const response = await CuotaAPI.registrarPago(cuotaEncontrada.id, {
        fecha_pagada: fecha_pagada,
        comprobante: comprobanteUrl,
        monto_pagado: montoPagado,
        metodo_pago: metodoPago,
        titular_cedula: titularCedula,
        titular_nombre: titularNombre,
        telefono_pago: telefonoPago || null,
        referencia: referencia || null,
        referencia_pago: referencia || null,
        monto_morosidad: mora || 0,
        dias_mora_cuota: diasMora || 0
      });
      
      if (response.success) {
        const cascada = response.data?.aplicacion_cascada;
        const detalle = cascada
          ? ` Aplicado → gasto:${cascada.gasto} mora:${cascada.mora} interés:${cascada.interes} capital:${cascada.capital}` +
            (cascada.capital_principal > 0 ? ` excedente capital:${cascada.capital_principal}` : '')
          : '';
        const mensajeExito = `✅ ${response.message || `Pago de cuota ${cuotaNumero} registrado.`}${detalle}`;
        
        await cargarTodosLosContratos();
        await cargarMisContratos();
        
        setShowPaymentModal(false);
        setSelectedCuota(null);
        
        setNotifications([
          { id: Date.now(), text: mensajeExito, time: "Justo ahora", read: false },
          ...notifications
        ]);
      }
    } catch (error) {
      console.error('Error al registrar pago:', error);
      alert(
        'Error al registrar el pago: ' +
          (error.error || error.message || 'Error desconocido')
      );
    }
  };

  const handleConfirmarPago = async (cuota) => {
    if (!cuota?.id) return;
    if (!puedeVerificarPagos) {
      alert('No tiene permiso para verificar pagos de cuotas');
      return;
    }
    if (!window.confirm(`¿Verificar que el pago de la cuota #${cuota.numero} efectivamente ingresó?`)) return;
    try {
      const response = await CuotaAPI.confirmarPago(cuota.id, {
        id_usuario: currentUser?.id || currentUser?.id_usuario,
        id_rol: currentUser?.id_rol_usu || currentUser?.id_rol,
      });
      if (response.success) {
        await cargarTodosLosContratos();
        await cargarMisContratos();
        setNotifications([
          { id: Date.now(), text: `✅ Cuota #${cuota.numero} verificada como pagada`, time: "Justo ahora", read: false },
          ...notifications
        ]);
      } else {
        alert(response.error || 'No se pudo verificar');
      }
    } catch (error) {
      alert(error.error || error.message || 'Error al verificar');
    }
  };

  const handleDescargarCumplimiento = async (prestamo) => {
    try {
      const blob = await CuotaAPI.descargarCumplimientoPdf(prestamo.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `cumplimiento_${prestamo.numero_contrato || prestamo.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.error || error.message || 'No se pudo descargar el PDF de cumplimiento');
    }
  };

  // ============================================================
  // VER COMPROBANTE
  // ============================================================
  const handleViewReceipt = (prestamoId, cuota) => {
    const prestamo =
      allPrestamos.find((p) => String(p.id) === String(prestamoId)) ||
      myPrestamos.find((p) => String(p.id) === String(prestamoId)) ||
      null;

    // Si el préstamo no está en memoria, reconstruir con datos de la cuota enriquecida
    const cuotaEnriquecida = {
      ...cuota,
      cliente: cuota.cliente || prestamo?.cliente || 'N/A',
      cedula: cuota.cedula || prestamo?.cedula || 'N/A',
      numero_contrato: cuota.numero_contrato || prestamo?.numero_contrato || prestamoId,
      metodoPago: cuota.metodoPago || cuota.metodo_pago || null,
      titularCedula: cuota.titularCedula || cuota.titular_cedula || null,
      titularNombre: cuota.titularNombre || cuota.titular_nombre || null,
      telefonoPago: cuota.telefonoPago || cuota.telefono_pago || null,
      fechaPago:
        cuota.fechaPago ||
        (cuota.fecha_pagada ? String(cuota.fecha_pagada).split('T')[0] : null) ||
        null,
      monto: Number(cuota.monto ?? cuota.monto_cuota ?? 0),
      montoPagado: Number(cuota.montoPagado ?? cuota.monto_pagado_acumulado ?? 0),
      comprobante: cuota.comprobante || cuota.comprobante_pago || null,
      estado: cuota.estado || cuota.estado_cuota || null,
      numero: cuota.numero ?? cuota.num_cuota ?? '-',
    };

    setSelectedPayment({
      prestamoId,
      cuota: cuotaEnriquecida,
      prestamo: prestamo || {
        id: prestamoId,
        cliente: cuotaEnriquecida.cliente,
        cedula: cuotaEnriquecida.cedula,
        numero_contrato: cuotaEnriquecida.numero_contrato,
      },
    });
    setShowPaymentReceiptModal(true);
  };

  // ============================================================
  // GENERAR CUOTAS
  // ============================================================
  const handleGenerateCuotas = (prestamoId) => {
    const prestamo = allPrestamos.find(p => p.id === prestamoId) || 
                     myPrestamos.find(p => p.id === prestamoId);
    if (prestamo) {
      const cuotasRestantes = prestamo.plazo - prestamo.cuotas.length;
      const montoPorCuota = prestamo.montoCuota || (prestamo.montoTotal / prestamo.plazo);
      
      setGenerationConfig({
        cantidadCuotas: cuotasRestantes > 0 ? cuotasRestantes : prestamo.plazo,
        montoPorCuota: montoPorCuota,
        frecuencia: "mensual",
        fechaPrimeraCuota: new Date().toISOString().split('T')[0],
        incluirMora: false
      });
      
      setSelectedPrestamoForGeneration(prestamo);
      setShowGenerateModal(true);
    }
  };

  const confirmGenerateCuotas = async (configuracion) => {
    if (!selectedPrestamoForGeneration) return;
    
    const config = {
      cantidadCuotas: configuracion.cantidadCuotas,
      frecuencia: configuracion.frecuencia,
      fechaPrimeraCuota: configuracion.fechaPrimeraCuota,
      cuotasGracia: configuracion.cuotasGracia || 0,
      montoObligatorio: configuracion.montoObligatorio || 0,
      montoGracia: configuracion.montoGracia || 0
    };
    
    try {
      const response = await CuotaAPI.generarCuotasManual(selectedPrestamoForGeneration.id, config);
      
      if (response.success) {
        await cargarTodosLosContratos();
        await cargarMisContratos();
        alert(response.message || 'Cuotas generadas exitosamente');
        setShowGenerateModal(false);
        setSelectedPrestamoForGeneration(null);
      }
    } catch (error) {
      console.error('Error al generar cuotas:', error);
      alert(error.response?.data?.error || 'Error al generar las cuotas');
    }
  };

  // ============================================================
  // EFECTOS
  // ============================================================
  useEffect(() => {
    const userData = usuarioAPI.getCurrentUser();
    setCurrentUser(userData);

    const rol = Number(userData?.id_rol_usu || userData?.id_rol || 0);
    const nombreRol = String(userData?.nombre_rol || userData?.rol || '').toLowerCase();
    const emprendedor = rol === 2 || nombreRol.includes('emprendedor');
    setEsEmprendedorCuota(emprendedor);
    if (emprendedor) setActiveView('mine');

    (async () => {
      if (rol === 1) {
        setPuedeVerificarPagos(true);
      } else if (!emprendedor) {
        const ok = await usuarioAPI.checkPermission('pagos_cuota', 'verificar');
        setPuedeVerificarPagos(!!ok);
      } else {
        setPuedeVerificarPagos(false);
      }
    })();
    
    cargarTodosLosContratos();
    cargarMisContratos();

    const refrescarUvc = async () => {
      try {
        const res = await uvcAPI.getValorActual();
        if (res.success) {
          setUvcInfo(res.data);
          setUvcError(null);
          return res.data;
        }
        setUvcError(res.error || 'No se obtuvo el IDI/UVC');
        return null;
      } catch (e) {
        setUvcError(e.error || e.message || 'No se pudo consultar el IDI/UVC del BCV');
        setUvcInfo(null);
        return null;
      }
    };
    refrescarUvc();
    // Mantener IDI en caché del servidor caliente (evita fallos al pagar)
    const uvcInterval = setInterval(refrescarUvc, 10 * 60 * 1000);
    
    const interval = setInterval(() => {
      const nuevaFecha = new Date().toISOString().split('T')[0];
      if (nuevaFecha !== fechaCierre) {
        setFechaCierre(nuevaFecha);
        actualizarMorosidadDiaria();
      }
    }, 60000);
    
    return () => {
      clearInterval(interval);
      clearInterval(uvcInterval);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilter, activeView]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.notifications-menu') && !e.target.closest('.user-menu')) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ============================================================
  // ESTADÍSTICAS Y FILTROS
  // ============================================================
  const getStats = () => {
    const cuotas = activeView === "all" ? allCuotas : myCuotas;
    const prestamos = activeView === "all" ? allPrestamos : myPrestamos;
    
    return [
      {
        id: 1,
        title: "Total Préstamos",
        value: prestamos.length,
        icon: CreditCard,
        bgColor: "bg-blue-50",
        textColor: "text-blue-600"
      },
      {
        id: 2,
        title: "Cuotas Vigentes",
        value: cuotas.filter(c => {
          const status = getCuotaStatus(c.fechaVencimiento, c.fechaPago, c.estado, c.fechaDesde, c.fechaHasta);
          return status === "vigente";
        }).length,
        icon: Clock,
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-600"
      },
      {
        id: 3,
        title: "Cuotas Pagadas",
        value: cuotas.filter(c => c.estado === "pagado").length,
        icon: CheckCircle,
        bgColor: "bg-green-50",
        textColor: "text-green-600"
      },
      {
        id: 4,
        title: "Monto Total en Mora",
        value: `$${cuotas.reduce((sum, c) => sum + (c.monto_morosidad || 0), 0).toFixed(2)}`,
        icon: AlertCircle,
        bgColor: "bg-red-50",
        textColor: "text-red-600"
      }
    ];
  };

  const stats = getStats();
  const getPrestamos = () => activeView === "all" ? allPrestamos : myPrestamos;
  const getCuotas = () => activeView === "all" ? allCuotas : myCuotas;
  const isLoading = activeView === "all" ? loadingAll : loadingMine;

  const filteredPrestamos = getPrestamos().filter(prestamo => {
    const matchesSearch = prestamo.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prestamo.cedula.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === "all" || 
                         (selectedFilter === "sin_cuotas" && prestamo.cuotas.length === 0) ||
                         prestamo.estado === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredCuotas = getCuotas().filter(cuota => {
    const matchesSearch = cuota.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cuota.cedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cuota.contratoId.toString().includes(searchTerm);
    const cuotaStatus = getCuotaStatus(cuota.fechaVencimiento, cuota.fechaPago, cuota.estado, cuota.fechaDesde, cuota.fechaHasta);
    const matchesFilter = selectedFilter === "all" || cuotaStatus === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredCuotas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCuotas = filteredCuotas.slice(startIndex, startIndex + itemsPerPage);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleLogout = () => {
    usuarioAPI.logout();
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className={`min-h-screen min-w-0 flex flex-col overflow-x-hidden ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Header 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        notifications={notifications}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        showUserMenu={showUserMenu}
        setShowUserMenu={setShowUserMenu}
        user={user}
        handleLogout={handleLogout}
        unreadCount={unreadCount}
        markAsRead={markAsRead}
      />

      <div className="flex flex-1">
        <Sidebar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeTab="cuotas"
          setActiveTab={() => {}}
          darkMode={darkMode}
        />

        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <div className="p-3 sm:p-4 md:p-6 mt-16 min-w-0 w-full max-w-full">
            {/* Título */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Gestión de Cuotas
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Créditos en UVC según normativas BCV — cobro con cascada
                </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Última actualización de mora: {fechaCierre}
                </p>
                {currentUser && (
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Usuario: {currentUser.nombre_completo || currentUser.nombres || 'N/A'} 
                    ({currentUser.nombre_rol || currentUser.rol || 'Usuario'})
                    {currentUser.cedula_usuario && ` - Cédula: ${currentUser.cedula_usuario}`}
                  </p>
                )}
              </div>
              <ExportButtons
                data={filteredCuotas.map((c) => ({
                  id: c.id,
                  numero: c.numero,
                  contratoId: c.contratoId,
                  numero_contrato: c.numero_contrato,
                  cliente: c.cliente,
                  cedula: c.cedula,
                  monto: c.monto,
                  estado: c.estado,
                  fechaVencimiento: c.fechaVencimiento,
                  fechaPago: c.fechaPago,
                  dias_mora_cuota: c.dias_mora_cuota,
                  monto_morosidad: c.monto_morosidad,
                }))}
                columns={[
                  { key: "id", label: "ID" },
                  { key: "numero", label: "N° Cuota" },
                  { key: "contratoId", label: "ID Contrato" },
                  { key: "numero_contrato", label: "N° Contrato" },
                  { key: "cliente", label: "Cliente" },
                  { key: "cedula", label: "Cédula" },
                  { key: "monto", label: "Monto" },
                  { key: "estado", label: "Estado" },
                  { key: "fechaVencimiento", label: "Vencimiento" },
                  { key: "fechaPago", label: "Fecha Pago" },
                  { key: "dias_mora_cuota", label: "Días Mora" },
                  { key: "monto_morosidad", label: "Mora" },
                ]}
                title="Pagos de Cuota"
                fileName="cuotas"
                moduloApi="cuotas"
                darkMode={darkMode}
              />
            </div>

            {/* Aviso normativo UVC / BCV */}
            <div className={`mb-6 p-4 rounded-xl border ${
              darkMode ? 'bg-slate-800/80 border-slate-600 text-slate-200' : 'bg-teal-50 border-teal-200 text-teal-950'
            }`}>
              <p className="text-sm font-semibold mb-2">Normativa BCV — Unidad de Valor de Crédito (UVC)</p>
              <ul className={`text-xs space-y-1 list-disc pl-4 ${darkMode ? 'text-slate-300' : 'text-teal-900'}`}>
                <li>Los saldos del crédito están en <b>UVC</b>; el equivalente en bolívares cambia según el IDI oficial del BCV del día.</li>
                <li>El valor IDI/UVC <b>no se inventa</b>: se consulta con la herramienta externa del sistema.</li>
                <li>No hay prórrogas ni cuotas de gracia unilaterales: congelar pagos encarece la deuda en Bs por la indexación diaria.</li>
                <li>Reestructuración o fuerza mayor: acudir a la oficina principal del IADEY en <b>San Felipe, Yaracuy</b>.</li>
              </ul>
              <div className="mt-3 text-xs">
                {uvcInfo ? (
                  <p>
                    IDI vigente: <b>{Number(uvcInfo.valor_idi).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</b> Bs/UVC
                    {uvcInfo.fecha ? ` · ${String(uvcInfo.fecha).slice(0, 10)}` : ''}
                    {uvcInfo.fuente ? ` · Fuente: ${uvcInfo.fuente}` : ''}
                  </p>
                ) : (
                  <p className={darkMode ? 'text-amber-300' : 'text-amber-700'}>
                    {uvcError || 'Consultando IDI/UVC…'} Sin tasa oficial no se mostrará el equivalente en Bs ni se podrá registrar el pago.
                  </p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className={`scroll-x-tabs flex gap-2 p-1 rounded-lg shadow-sm w-full sm:w-fit ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <button
                  onClick={() => {
                    setActiveView("all");
                    setSelectedFilter("all");
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeView === "all"
                      ? "bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white shadow-md"
                      : `${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                  }`}
                >
                  <List size={16} />
                  Todas las Cuotas
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    activeView === "all" 
                      ? "bg-white/20" 
                      : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                  }`}>
                    {allPrestamos.length}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveView("mine");
                    setSelectedFilter("all");
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    activeView === "mine"
                      ? "bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white shadow-md"
                      : `${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                  }`}
                >
                  <Wallet size={16} />
                  Mis Cuotas
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    activeView === "mine" 
                      ? "bg-white/20" 
                      : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                  }`}>
                    {myCuotas.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat) => (
                <div key={stat.id} className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg hover:shadow-xl transition-shadow`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={stat.textColor} size={24} />
                    </div>
                  </div>
                  <h3 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {stat.value}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stat.title}
                  </p>
                </div>
              ))}
            </div>

            {/* Filtros */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={activeView === "all" ? "Buscar por cliente o cédula..." : "Buscar en mis cuotas..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-200 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                />
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className={`px-4 py-2.5 rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-200 text-gray-700'
                  } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                >
                  {activeView === "all" ? (
                    <>
                      <option value="all">Todos los préstamos</option>
                      <option value="activo">Activos</option>
                      <option value="pagado">Pagados</option>
                      <option value="pendiente">Pendientes</option>
                      <option value="sin_cuotas">Sin cuotas generadas</option>
                    </>
                  ) : (
                    <>
                      <option value="all">Todos los estados</option>
                      <option value="vigente">Vigentes</option>
                      <option value="proxima">Próximas</option>
                      <option value="pagado">Pagadas</option>
                      <option value="en_mora">En Mora</option>
                      <option value="vencido">Vencidas</option>
                    </>
                  )}
                </select>
                
                <button 
                  onClick={() => {
                    actualizarMorosidadDiaria();
                    alert('Morosidad actualizada correctamente');
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#E9C46A] to-[#F4A261] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <TrendingUp size={20} />
                  Actualizar Mora
                </button>
                
                <button className="px-4 py-2.5 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
                  <Download size={20} />
                  Exportar
                </button>
              </div>
            </div>

            {/* ============================================================
                VISTA: TODAS LAS CUOTAS (getAll)
                ============================================================ */}
            {activeView === "all" && (
              <div className="space-y-6">
                {loadingAll ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader className="animate-spin text-[#2A9D8F]" size={48} />
                  </div>
                ) : filteredPrestamos.length === 0 ? (
                  <div className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg p-12 text-center`}>
                    <CreditCard size={64} className="mx-auto text-gray-400 mb-4" />
                    <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      No se encontraron préstamos
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No hay préstamos que coincidan con los filtros seleccionados
                    </p>
                  </div>
                ) : (
                  filteredPrestamos.map((prestamo) => (
                    <div key={prestamo.id} className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg overflow-hidden`}>
                      {/* Cabecera del préstamo */}
                      <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${
                              prestamo.estado === 'activo' ? 'bg-green-100' : 
                              prestamo.estado === 'pagado' ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <Wallet className={
                                prestamo.estado === 'activo' ? 'text-green-600' : 
                                prestamo.estado === 'pagado' ? 'text-blue-600' : 'text-gray-600'
                              } size={24} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                  {prestamo.cliente}
                                </h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  prestamo.estado === 'activo' ? 'bg-green-100 text-green-700' : 
                                  prestamo.estado === 'pagado' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {prestamo.estado === 'activo' ? 'ACTIVO' : 
                                   prestamo.estado === 'pagado' ? 'PAGADO' : 'PENDIENTE'}
                                </span>
                                {prestamo.totalMorosidad > 0 && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                    Mora: ${prestamo.totalMorosidad.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <User size={14} className="text-gray-400" />
                                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Cédula: {prestamo.cedula}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText size={14} className="text-gray-400" />
                                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                                    Contrato #{prestamo.numero_contrato || prestamo.id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-gray-400" />
                                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Inicio: {prestamo.fechaInicio}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText size={14} className="text-gray-400" />
                                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                                    Cédula Aprob: {prestamo.id_cedula_aprob || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                              <div>
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Monto Total</p>
                                <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                  ${prestamo.montoTotal.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Saldo</p>
                                <p className={`text-lg font-bold ${prestamo.saldoPendiente > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                  ${prestamo.saldoPendiente.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Mora Total</p>
                                <p className={`text-lg font-bold ${prestamo.totalMorosidad > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  ${prestamo.totalMorosidad?.toFixed(2) || '0.00'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex justify-center gap-2 mt-2">
                              {prestamo.estatusContrato === 'Finalizado' && (
                                <button
                                  onClick={() => handleDescargarCumplimiento(prestamo)}
                                  className="px-6 py-2.5 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-medium"
                                >
                                  <Download size={16} />
                                  PDF Cumplimiento
                                </button>
                              )}
                              {!esEmprendedorCuota && prestamo.cuotas.length === 0 && (
                              <button
                                onClick={() => handleGenerateCuotas(prestamo.id)}
                                className="px-6 py-2.5 bg-gradient-to-r from-[#E9C46A] to-[#F4A261] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-medium"
                              >
                                <Settings size={18} />
                                Generar Cuotas
                              </button>
                              )}
                              <button
                                onClick={() => {
                                  const moraTotal = prestamo.cuotas.reduce((sum, c) => sum + (c.monto_morosidad || 0), 0);
                                  alert(`Mora total del contrato: $${moraTotal.toFixed(2)}\nCuotas en mora: ${prestamo.cuotas.filter(c => c.monto_morosidad > 0).length}`);
                                }}
                                className="px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all flex items-center gap-2"
                              >
                                <AlertCircle size={18} />
                                Ver Mora
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Barra de progreso */}
                        <div className="mt-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Progreso de pago</span>
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                              {prestamo.cuotasPagadas} de {prestamo.plazo} cuotas
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-gradient-to-r from-[#264653] to-[#2A9D8F] h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${prestamo.plazo > 0 ? (prestamo.cuotasPagadas / prestamo.plazo) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tabla de cuotas */}
                      {prestamo.cuotas.length > 0 ? (
                        <div className="overflow-x-auto table-scroll">
                          <table className="w-full">
                            <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">N°</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Tipo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Período Desde</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Período Hasta</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Monto</th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Días Mora</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Monto Mora</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Estado</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha Pago</th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                              {prestamo.cuotas.map((cuota) => {
                                const estadoConfig = getEstadoConfig(cuota);
                                const mora = cuota.monto_morosidad || 0;
                                const totalPagar = cuota.monto + mora;
                                const Icon = estadoConfig.icon;
                                const puedePagar = canPayCuota(cuota, prestamo);
                                
                                return (
                                  <tr key={cuota.numero} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3 text-sm font-medium">{cuota.numero}</td>
                                    <td className="px-4 py-3 text-sm">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        cuota.tipo_cuota === 'Obligatoria' 
                                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                                          : cuota.tipo_cuota === 'Gracias' 
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                      }`}>
                                        {cuota.tipo_cuota || 'Obligatoria'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{cuota.fechaDesde || '-'}</td>
                                    <td className="px-4 py-3 text-sm">{cuota.fechaHasta || cuota.fechaVencimiento || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-right">${cuota.monto.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-center">
                                      {cuota.dias_mora_cuota > 0 ? (
                                        <span className="text-red-600 font-medium">{cuota.dias_mora_cuota} días</span>
                                      ) : (
                                        <span className="text-gray-400">0</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right">
                                      {mora > 0 ? (
                                        <span className="text-red-600 font-medium">${mora.toFixed(2)}</span>
                                      ) : (
                                        <span className="text-gray-400">$0.00</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-medium">
                                      ${totalPagar.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.bg} ${estadoConfig.color}`}>
                                        <Icon size={12} />
                                        {estadoConfig.text}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{cuota.fechaPago || '-'}</td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center justify-center gap-1">
                                        {puedePagar ? (
                                          <button
                                            onClick={() => {
                                              setSelectedCuota({ 
                                                prestamoId: prestamo.id, 
                                                cuotaNumero: cuota.numero, 
                                                monto: cuota.monto, 
                                                mora: mora,
                                                fechaVencimiento: cuota.fechaVencimiento,
                                                fechaDesde: cuota.fechaDesde,
                                                fechaHasta: cuota.fechaHasta,
                                                diasMora: cuota.dias_mora_cuota,
                                                tipo_cuota: cuota.tipo_cuota,
                                                deudaCascada: cuota.deuda_cascada,
                                                totalPendiente:
                                                  cuota.total_pendiente_cascada != null
                                                    ? cuota.total_pendiente_cascada
                                                    : cuota.monto + (mora || 0),
                                                gastoCobranza: cuota.gasto_cobranza,
                                                capitalCuota: cuota.capital_cuota,
                                                interesCorriente: cuota.interes_corriente,
                                              });
                                              setShowPaymentModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-[#2A9D8F] text-white rounded-lg text-xs hover:bg-[#264653] transition-colors flex items-center gap-1"
                                          >
                                            <Receipt size={14} />
                                            Pagar
                                          </button>
                                        ) : cuota.estado === "por_confirmar" && puedeVerificarPagos ? (
                                          <button
                                            onClick={() => handleConfirmarPago(cuota)}
                                            className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs hover:bg-amber-600 transition-colors flex items-center gap-1"
                                            title="Verificar que el pago ingresó"
                                          >
                                            <CheckCircle size={14} />
                                            Verificar
                                          </button>
                                        ) : cuota.estado === "por_confirmar" ? (
                                          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs">
                                            Por verificar
                                          </span>
                                        ) : cuota.estado !== "pagado" ? (
                                          <span className="px-3 py-1.5 bg-gray-200 text-gray-500 rounded-lg text-xs flex items-center gap-1 cursor-not-allowed">
                                            <Lock size={14} />
                                            Bloqueado
                                          </span>
                                        ) : null}
                                        {(cuota.estado === "pagado" || cuota.estado === "por_confirmar" || cuota.comprobante) && (
                                          <button
                                            onClick={() => handleViewReceipt(prestamo.id, cuota)}
                                            className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs hover:bg-gray-100 transition-colors flex items-center gap-1"
                                            title="Ver comprobante"
                                          >
                                            <Eye size={14} />
                                            Ver comprobante
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <Settings size={48} className="mx-auto text-gray-400 mb-3" />
                          <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            No se han generado cuotas para este préstamo
                          </p>
                          {!esEmprendedorCuota && (
                          <button
                            onClick={() => handleGenerateCuotas(prestamo.id)}
                            className="px-5 py-2.5 bg-gradient-to-r from-[#E9C46A] to-[#F4A261] text-white rounded-lg hover:shadow-lg transition-all inline-flex items-center gap-2 font-medium"
                          >
                            <Plus size={18} />
                            Generar Cuotas Ahora
                          </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ============================================================
                VISTA: MIS CUOTAS (getByCedulaAprob)
                ============================================================ */}
            {activeView === "mine" && (
              <div className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg overflow-hidden`}>
                <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        Mis Cuotas
                      </h2>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Cuotas asociadas a tu cédula de aprobación
                      </p>
                      {currentUser && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          Cédula: {currentUser.cedula_usuario || currentUser.cedula || 'No disponible'}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}>
                        Mora Total: ${myCuotas.reduce((sum, c) => sum + (c.monto_morosidad || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto table-scroll">
                  <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Cuota</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Cliente</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Contrato</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Período</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Monto</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Días Mora</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Monto Mora</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha Pago</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {loadingMine ? (
                        <tr>
                          <td colSpan={12} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <Loader className="animate-spin text-[#2A9D8F]" size={40} />
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Cargando mis cuotas...
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedCuotas.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <FileText size={48} className="text-gray-400" />
                              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                No se encontraron cuotas
                              </p>
                              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                No tienes cuotas asociadas a tu cédula de aprobación
                              </p>
                              {currentUser && (
                                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                  Cédula: {currentUser.cedula_usuario || currentUser.cedula || 'No disponible'}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedCuotas.map((cuota) => {
                          const estadoConfig = getEstadoConfig(cuota);
                          const mora = cuota.monto_morosidad || 0;
                          const totalPagar = cuota.monto + mora;
                          const Icon = estadoConfig.icon;
                          const prestamoOfCuota = (activeView === "all" ? allPrestamos : myPrestamos).find(
                            (p) => String(p.id) === String(cuota.contratoId)
                          );
                          const puedePagar = canPayCuota(cuota, prestamoOfCuota);
                          
                          return (
                            <tr 
                              key={`${cuota.contratoId}-${cuota.numero}`} 
                              className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}
                            >
                              <td className="px-4 py-3 text-sm text-center font-medium">
                                {cuota.numero}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  cuota.tipo_cuota === 'Obligatoria' 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                                    : cuota.tipo_cuota === 'Gracias' 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {cuota.tipo_cuota || 'Obligatoria'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div>
                                  <p className="font-medium dark:text-white">{cuota.cliente}</p>
                                  <p className="text-xs text-gray-500">Cédula: {cuota.cedula}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div>
                                  <p className="font-medium dark:text-white">#{cuota.numero_contrato || cuota.contratoId}</p>
                                  <p className="text-xs text-gray-500">ID: {cuota.contratoId}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1">
                                    <Calendar size={12} className="text-gray-400" />
                                    <span className="text-xs text-gray-500">Desde:</span>
                                    <span>{cuota.fechaDesde || '-'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar size={12} className="text-gray-400" />
                                    <span className="text-xs text-gray-500">Hasta:</span>
                                    <span>{cuota.fechaHasta || cuota.fechaVencimiento || '-'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-right">${cuota.monto.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                {cuota.dias_mora_cuota > 0 ? (
                                  <span className="text-red-600 font-medium">{cuota.dias_mora_cuota} días</span>
                                ) : (
                                  <span className="text-gray-400">0</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                {mora > 0 ? (
                                  <span className="text-red-600 font-medium">${mora.toFixed(2)}</span>
                                ) : (
                                  <span className="text-gray-400">$0.00</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium">
                                ${totalPagar.toLocaleString(undefined, {minimumFractionDigits: 2})}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.bg} ${estadoConfig.color}`}>
                                  <Icon size={12} />
                                  {estadoConfig.text}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {cuota.fechaPago || <span className="text-gray-400">-</span>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  {puedePagar ? (
                                    <button
                                      onClick={() => {
                                        setSelectedCuota({ 
                                          prestamoId: cuota.contratoId, 
                                          cuotaNumero: cuota.numero, 
                                          monto: cuota.monto, 
                                          mora: mora,
                                          fechaVencimiento: cuota.fechaVencimiento,
                                          fechaDesde: cuota.fechaDesde,
                                          fechaHasta: cuota.fechaHasta,
                                          diasMora: cuota.dias_mora_cuota,
                                          tipo_cuota: cuota.tipo_cuota,
                                          deudaCascada: cuota.deuda_cascada,
                                          totalPendiente:
                                            cuota.total_pendiente_cascada != null
                                              ? cuota.total_pendiente_cascada
                                              : cuota.monto + (mora || 0),
                                          gastoCobranza: cuota.gasto_cobranza,
                                          capitalCuota: cuota.capital_cuota,
                                          interesCorriente: cuota.interes_corriente,
                                        });
                                        setShowPaymentModal(true);
                                      }}
                                      className="px-3 py-1.5 bg-[#2A9D8F] text-white rounded-lg text-xs hover:bg-[#264653] transition-colors flex items-center gap-1"
                                    >
                                      <Receipt size={14} />
                                      Pagar
                                    </button>
                                  ) : cuota.estado === "por_confirmar" && puedeVerificarPagos ? (
                                    <button
                                      onClick={() => handleConfirmarPago(cuota)}
                                      className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs hover:bg-amber-600 transition-colors flex items-center gap-1"
                                      title="Verificar que el pago ingresó"
                                    >
                                      <CheckCircle size={14} />
                                      Verificar
                                    </button>
                                  ) : cuota.estado === "por_confirmar" ? (
                                    <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs">
                                      Por verificar
                                    </span>
                                  ) : cuota.estado !== "pagado" ? (
                                    <span className="px-3 py-1.5 bg-gray-200 text-gray-500 rounded-lg text-xs flex items-center gap-1 cursor-not-allowed">
                                      <Lock size={14} />
                                      Bloqueado
                                    </span>
                                  ) : null}
                                  {(cuota.estado === "pagado" || cuota.estado === "por_confirmar" || cuota.comprobante) && (
                                    <button
                                      onClick={() => handleViewReceipt(cuota.contratoId, cuota)}
                                      className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs hover:bg-gray-100 transition-colors flex items-center gap-1"
                                      title="Ver comprobante"
                                    >
                                      <Eye size={14} />
                                      Ver comprobante
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Paginación */}
                {filteredCuotas.length > itemsPerPage && (
                  <div className={`px-3 sm:px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      darkMode={darkMode}
                      totalItems={filteredCuotas.length}
                      pageSize={itemsPerPage}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <Footer darkMode={darkMode} />
        </main>
      </div>

      {/* Modal de pago */}
      {showPaymentModal && selectedCuota && (
        <PaymentModal
          selectedCuota={selectedCuota}
          uvcInfo={uvcInfo}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedCuota(null);
          }}
          onConfirm={handleRegisterPayment}
          darkMode={darkMode}
        />
      )}

      {/* Modal de comprobante */}
      {showPaymentReceiptModal && selectedPayment && (
        <ReceiptModal
          selectedPayment={selectedPayment}
          onClose={() => {
            setShowPaymentReceiptModal(false);
            setSelectedPayment(null);
          }}
          darkMode={darkMode}
        />
      )}

      {/* Modal de generar cuotas */}
      {showGenerateModal && selectedPrestamoForGeneration && (
        <GenerateCuotasModal
          prestamo={selectedPrestamoForGeneration}
          config={generationConfig}
          onConfigChange={setGenerationConfig}
          onConfirm={confirmGenerateCuotas}
          onClose={() => {
            setShowGenerateModal(false);
            setSelectedPrestamoForGeneration(null);
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

// ============================================================
// MODAL DE PAGO
// ============================================================

const PaymentModal = ({ selectedCuota, uvcInfo, onClose, onConfirm, darkMode }) => {
  const deuda = selectedCuota.deudaCascada || {
    gasto: selectedCuota.gastoCobranza || 0,
    mora: selectedCuota.mora || 0,
    interes: selectedCuota.interesCorriente || 0,
    capital: selectedCuota.capitalCuota || selectedCuota.monto || 0,
  };
  const totalPendiente =
    selectedCuota.totalPendiente != null
      ? Number(selectedCuota.totalPendiente)
      : Number(deuda.gasto || 0) +
        Number(deuda.mora || 0) +
        Number(deuda.interes || 0) +
        Number(deuda.capital || 0);

  const [comprobante, setComprobante] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [metodoPago, setMetodoPago] = useState("pago_movil");
  const [titularCedula, setTitularCedula] = useState("");
  const [titularNombre, setTitularNombre] = useState("");
  const [telefonoPago, setTelefonoPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [montoPagar, setMontoPagar] = useState(
    totalPendiente > 0 ? totalPendiente.toFixed(2) : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Por favor, seleccione una imagen válida (JPG, PNG, GIF, WEBP)');
        return;
      }
      
      if (file.size > 32 * 1024 * 1024) {
        alert('La imagen no debe superar los 32MB');
        return;
      }
      
      setComprobante(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!uvcInfo?.valor_idi) {
      alert('No hay IDI/UVC oficial del BCV. No se puede registrar el pago sin la herramienta externa.');
      return;
    }
    if (!metodoPago || !['pago_movil', 'transferencia'].includes(metodoPago)) {
      alert("Seleccione método de pago: pago móvil o transferencia");
      return;
    }
    if (!titularCedula.trim()) {
      alert("Indique la cédula del titular de la cuenta");
      return;
    }
    if (!titularNombre.trim()) {
      alert("Indique el nombre del titular de la cuenta");
      return;
    }
    if (metodoPago === 'pago_movil') {
      const tel = onlyPhoneDigits(telefonoPago, 11);
      if (!tel || tel.length < 10) {
        alert("En pago móvil debe indicar el número de teléfono (10 u 11 dígitos)");
        return;
      }
    }
    if (!comprobante) {
      alert("Debe adjuntar el comprobante de pago");
      return;
    }
    const montoNum = parseFloat(String(montoPagar).replace(',', '.'));
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      alert("Indique un monto de pago válido");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);
    
    try {
      setUploadProgress(50);
      
      await onConfirm(selectedCuota.prestamoId, selectedCuota.cuotaNumero, {
        montoPagado: montoNum,
        comprobante,
        metodoPago,
        titularCedula: titularCedula.trim(),
        titularNombre: titularNombre.trim(),
        telefonoPago: metodoPago === 'pago_movil' ? onlyPhoneDigits(telefonoPago, 11) : null,
        referencia: alphanumericRef(referencia, 40),
        mora: deuda.mora || 0,
        diasMora: selectedCuota.diasMora || 0
      });
      
      setUploadProgress(100);
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      alert('Error al procesar el pago: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const row = (label, value, emphasize = false) => (
    <div className="flex justify-between mb-2 text-sm">
      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{label}</span>
      <span className={`font-semibold ${emphasize ? 'text-red-600' : darkMode ? 'text-white' : 'text-gray-800'}`}>
        {Number(value || 0).toFixed(2)} UVC
      </span>
    </div>
  );

  const bsEquiv = (uvc) => {
    if (!uvcInfo?.valor_idi) return null;
    return Math.round(Number(uvc || 0) * Number(uvcInfo.valor_idi) * 100) / 100;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} max-w-md w-full p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Registrar Pago - Cuota N° {selectedCuota.cuotaNumero}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Cascada de cobro (prioridad)
            </h4>
            <p className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              El pago no abona directo a capital. Orden: 1) Gastos cobranza → 2) Mora → 3) Interés corriente → 4) Capital cuota → 5) Capital principal (excedente).
            </p>
            {row('1. Gastos de cobranza', deuda.gasto)}
            {row('2. Intereses de mora', deuda.mora, Number(deuda.mora) > 0)}
            {row('3. Intereses corrientes', deuda.interes)}
            {row('4. Capital de la cuota', deuda.capital)}
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="font-semibold">Total para ponerse al día:</span>
              <span className="text-xl font-bold text-[#2A9D8F]">
                {totalPendiente.toFixed(2)} UVC
              </span>
            </div>
            {bsEquiv(totalPendiente) != null && (
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                ≈ Bs. {bsEquiv(totalPendiente).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                {' '}(IDI {Number(uvcInfo.valor_idi).toLocaleString('es-VE', { minimumFractionDigits: 2 })} — {uvcInfo.fuente})
              </p>
            )}
            {!uvcInfo?.valor_idi && (
              <p className="text-xs mt-1 text-amber-600">
                Sin IDI oficial no se puede calcular el equivalente en bolívares ni registrar el pago.
              </p>
            )}
            <div className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Días de mora: {selectedCuota.diasMora || 0} · Mora UVC tope BCV 0,80% anual
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Monto a pagar (UVC) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={montoPagar}
              onChange={(e) => setMontoPagar(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Puede pagar parcial. Si paga de más, el excedente solo abona capital de cuotas siguientes.
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Método de pago <span className="text-red-500">*</span>
            </label>
            <select
              value={metodoPago}
              onChange={(e) => {
                setMetodoPago(e.target.value);
                if (e.target.value !== 'pago_movil') setTelefonoPago('');
              }}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            >
              <option value="pago_movil">Pago Móvil</option>
              <option value="transferencia">Transferencia Bancaria</option>
            </select>
          </div>

          {metodoPago === 'pago_movil' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Número de teléfono <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="tel"
                autoComplete="tel"
                value={telefonoPago}
                onChange={(e) => setTelefonoPago(onlyPhoneDigits(e.target.value, 11))}
                placeholder="04121234567"
                maxLength={11}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Teléfono desde el que se realizó el pago móvil
              </p>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Cédula del titular <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={titularCedula}
              onChange={(e) => setTitularCedula(formatCedulaInput(e.target.value))}
              placeholder="V-12345678"
              maxLength={10}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Nombre del titular <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titularNombre}
              onChange={(e) => setTitularNombre(e.target.value)}
              placeholder="Nombre completo del titular de la cuenta"
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Número de referencia
            </label>
            <input
              type="text"
              autoComplete="off"
              value={referencia}
              onChange={(e) => setReferencia(alphanumericRef(e.target.value, 40))}
              placeholder="Letras y números (ej. REF12AB34)"
              maxLength={40}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Comprobante de pago <span className="text-red-500">*</span>
            </label>
            <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
              darkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              {previewUrl ? (
                <div className="space-y-2">
                  <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded" />
                  <p className="text-sm text-gray-600">{comprobante?.name}</p>
                  <button
                    onClick={() => {
                      setComprobante(null);
                      setPreviewUrl(null);
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                    }}
                    className="text-red-600 text-sm hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <ImageIcon size={40} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Haga clic para subir el comprobante</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WEBP (max. 32MB)</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {isSubmitting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {uploadProgress < 100 ? 'Procesando pago...' : '¡Pago registrado!'}
                </span>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#264653] to-[#2A9D8F] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Confirmar Pago
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-gray-300 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MODAL PARA VER COMPROBANTE
// ============================================================

const ReceiptModal = ({ selectedPayment, onClose, darkMode }) => {
  const { cuota, prestamo } = selectedPayment;
  const labelCls = darkMode ? 'text-gray-400' : 'text-gray-600';
  const valueCls = darkMode ? 'text-white' : 'text-gray-900';

  const labelMetodo = (metodo) => {
    switch (metodo) {
      case 'pago_movil': return 'Pago Móvil';
      case 'transferencia': return 'Transferencia Bancaria';
      case 'efectivo': return 'Efectivo';
      case 'punto_venta': return 'Punto de Venta';
      default: return metodo || 'No especificado';
    }
  };

  const labelEstado = (estado) => {
    switch (estado) {
      case 'pagado': return 'Pagado';
      case 'por_confirmar': return 'Por verificar';
      case 'en_mora': return 'En mora';
      case 'vencido': return 'Vencido';
      case 'abono_parcial': return 'Abono parcial';
      case 'pendiente': return 'Pendiente';
      default: return estado || '-';
    }
  };

  const cliente = prestamo?.cliente || cuota?.cliente || 'N/A';
  const cedula = prestamo?.cedula || cuota?.cedula || 'N/A';
  const numeroContrato = prestamo?.numero_contrato || cuota?.numero_contrato || prestamo?.id || 'N/A';
  const metodoPago = cuota?.metodoPago || cuota?.metodo_pago;
  const titularCedula = cuota?.titularCedula || cuota?.titular_cedula;
  const titularNombre = cuota?.titularNombre || cuota?.titular_nombre;
  const telefonoPago = cuota?.telefonoPago || cuota?.telefono_pago;
  const fechaPago = cuota?.fechaPago || cuota?.fecha_pagada || '-';
  const referencia = cuota?.referencia || cuota?.referencia_pago;
  const monto = Number(cuota?.monto || cuota?.monto_cuota || 0);
  const mora = Number(cuota?.monto_morosidad || 0);
  const totalPagado = Number(cuota?.montoPagado || cuota?.monto_pagado_acumulado || monto + mora);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Comprobante de Pago
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Información del pago
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className={labelCls}>Cliente:</span>
                <p className={`font-medium ${valueCls}`}>{cliente}</p>
              </div>
              <div>
                <span className={labelCls}>Cédula:</span>
                <p className={`font-medium ${valueCls}`}>{cedula}</p>
              </div>
              <div>
                <span className={labelCls}>N° Contrato:</span>
                <p className={`font-medium ${valueCls}`}>{numeroContrato}</p>
              </div>
              <div>
                <span className={labelCls}>N° Cuota:</span>
                <p className={`font-medium ${valueCls}`}>{cuota?.numero ?? '-'}</p>
              </div>
              <div>
                <span className={labelCls}>Tipo:</span>
                <p className={`font-medium ${valueCls}`}>{cuota?.tipo_cuota || 'Obligatoria'}</p>
              </div>
              <div>
                <span className={labelCls}>Estado:</span>
                <p className={`font-medium ${valueCls}`}>{labelEstado(cuota?.estado)}</p>
              </div>
              <div>
                <span className={labelCls}>Monto cuota:</span>
                <p className={`font-medium ${valueCls}`}>${monto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              {mora > 0 && (
                <div>
                  <span className={labelCls}>Monto mora:</span>
                  <p className="font-medium text-red-600">${mora.toFixed(2)}</p>
                </div>
              )}
              <div>
                <span className={labelCls}>Total pagado:</span>
                <p className="font-medium text-green-600">
                  ${Number(totalPagado).toFixed(2)}
                </p>
              </div>
              <div>
                <span className={labelCls}>Fecha de pago:</span>
                <p className={`font-medium ${valueCls}`}>{fechaPago}</p>
              </div>
              <div>
                <span className={labelCls}>Días de mora:</span>
                <p className={`font-medium ${valueCls}`}>{cuota?.dias_mora_cuota || 0} días</p>
              </div>
              <div>
                <span className={labelCls}>Método de pago:</span>
                <p className={`font-medium ${valueCls}`}>{labelMetodo(metodoPago)}</p>
              </div>
              {metodoPago === 'pago_movil' && (
                <div>
                  <span className={labelCls}>Teléfono pago móvil:</span>
                  <p className={`font-medium ${valueCls}`}>{telefonoPago || 'No registrado'}</p>
                </div>
              )}
              <div>
                <span className={labelCls}>Titular (cédula):</span>
                <p className={`font-medium ${valueCls}`}>{titularCedula || 'No registrado'}</p>
              </div>
              <div>
                <span className={labelCls}>Titular (nombre):</span>
                <p className={`font-medium ${valueCls}`}>{titularNombre || 'No registrado'}</p>
              </div>
              {referencia && (
                <div>
                  <span className={labelCls}>Referencia:</span>
                  <p className={`font-medium ${valueCls}`}>{referencia}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Comprobante
            </h4>
            {(() => {
              const url = typeof cuota?.comprobante === 'string' ? cuota.comprobante : (cuota?.comprobante?.url || '');
              const esImagen = url && (
                /^https?:\/\//i.test(url) ||
                /^data:image\//i.test(url) ||
                /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(url)
              );
              const esPdf = url && /\.pdf(\?|$)/i.test(url);

              if (esImagen) {
                return (
                  <div className={`p-4 rounded border text-center ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <img 
                      src={url} 
                      alt="Comprobante de pago" 
                      className="max-h-96 mx-auto rounded object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling?.classList?.remove('hidden');
                      }}
                    />
                    <p className="hidden text-sm text-red-500 mt-2">No se pudo cargar la imagen</p>
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[#2A9D8F] hover:text-[#264653] text-sm"
                    >
                      <Download size={14} />
                      Abrir / descargar comprobante
                    </a>
                  </div>
                );
              }

              if (url) {
                return (
                  <div className={`p-4 rounded border text-center ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <FileText size={48} className="mx-auto text-[#2A9D8F] mb-2" />
                    <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {esPdf ? 'Comprobante en PDF' : 'Archivo de comprobante disponible'}
                    </p>
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#2A9D8F] text-white rounded-lg hover:bg-[#264653] text-sm"
                    >
                      <Eye size={16} />
                      Ver comprobante
                    </a>
                  </div>
                );
              }

              return (
                <div className={`p-4 rounded border text-center ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <FileText size={48} className="mx-auto text-gray-400 mb-2" />
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No hay comprobante disponible
                  </p>
                </div>
              );
            })()}
          </div>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MODAL PARA GENERAR CUOTAS
// ============================================================

const GenerateCuotasModal = ({ 
  prestamo, 
  config, 
  onConfigChange, 
  onConfirm, 
  onClose, 
  darkMode 
}) => {
  const [cuotasGeneradas, setCuotasGeneradas] = useState([]);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [montosCalculados, setMontosCalculados] = useState({
    montoObligatorio: 0,
    montoGracia: 0
  });
  
  const handleChange = (field, value) => {
    onConfigChange({
      ...config,
      [field]: value
    });
  };
  
  const calcularVistaPrevia = () => {
    const { cantidadCuotas, frecuencia, fechaPrimeraCuota } = config;
    
    if (!cantidadCuotas || !fechaPrimeraCuota) return;
    
    const cuotasGracia = 0; // BCV/UVC: sin cuotas de gracia unilaterales
    const cuotasObligatorias = parseInt(cantidadCuotas) || 0;
    const totalCuotas = cuotasObligatorias;
    
    const montoTotal = parseFloat(prestamo.devolvimiento || prestamo.montoTotal) || 0;
    // Reparto equitativo entre obligatorias + gracias
    const montoPorCuota = totalCuotas > 0 ? montoTotal / totalCuotas : 0;
    const montoObligatorio = montoPorCuota;
    const montoGracia = montoPorCuota;
    
    setMontosCalculados({ montoObligatorio, montoGracia });
    
    const cuotasPrevias = [];
    let fechaActual = new Date(fechaPrimeraCuota);
    let sumaAsignada = 0;
    
    for (let i = 0; i < totalCuotas; i++) {
      const numeroCuota = i + 1;
      const esUltima = i === totalCuotas - 1;
      const tipoCuota = numeroCuota <= cuotasObligatorias ? 'Obligatoria' : 'Gracias';
      let monto = esUltima
        ? Math.round((montoTotal - sumaAsignada) * 100) / 100
        : Math.round(montoPorCuota * 100) / 100;
      if (monto < 0) monto = 0;
      sumaAsignada = Math.round((sumaAsignada + monto) * 100) / 100;
      
      let fechaDesde = new Date(fechaActual);
      let fechaHasta = new Date(fechaActual);
      
      switch(frecuencia) {
        case 'mensual':
          fechaHasta.setMonth(fechaHasta.getMonth() + 1);
          fechaHasta.setDate(fechaHasta.getDate() - 1);
          break;
        case 'quincenal':
          fechaHasta.setDate(fechaHasta.getDate() + 14);
          break;
        case 'semanal':
          fechaHasta.setDate(fechaHasta.getDate() + 6);
          break;
        default:
          fechaHasta.setMonth(fechaHasta.getMonth() + 1);
          fechaHasta.setDate(fechaHasta.getDate() - 1);
      }
      
      cuotasPrevias.push({
        numero: numeroCuota,
        tipo: tipoCuota,
        fecha_desde: fechaDesde.toISOString().split('T')[0],
        fecha_hasta: fechaHasta.toISOString().split('T')[0],
        monto: monto
      });
      
      switch(frecuencia) {
        case 'mensual':
          fechaActual.setMonth(fechaActual.getMonth() + 1);
          break;
        case 'quincenal':
          fechaActual.setDate(fechaActual.getDate() + 15);
          break;
        case 'semanal':
          fechaActual.setDate(fechaActual.getDate() + 7);
          break;
      }
    }
    
    setCuotasGeneradas(cuotasPrevias);
    setMostrarVistaPrevia(true);
  };
  
  const totalObligatorias = cuotasGeneradas
    .filter(c => c.tipo === 'Obligatoria')
    .reduce((sum, cuota) => sum + cuota.monto, 0);
  const totalGracias = 0;
  
  const cuotasGraciaContrato = 0; // UVC/BCV: no se generan gracias unilaterales
  const cuotasObligatoriasIngresadas = parseInt(config.cantidadCuotas) || 0;
  const totalCuotasGenerar = cuotasObligatoriasIngresadas;
  const montoTotalPrestamo = parseFloat(prestamo.devolvimiento || prestamo.montoTotal || 0);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Generar Cuotas - {prestamo.cliente}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle size={24} />
          </button>
        </div>

        <div className={`mb-4 p-3 rounded-lg text-xs ${darkMode ? 'bg-amber-900/40 text-amber-100' : 'bg-amber-50 text-amber-900'}`}>
          Bajo normativa BCV/UVC no se generan cuotas de gracia unilaterales. Si necesita reestructurar,
          acuda a la oficina principal del IADEY en <b>San Felipe, Yaracuy</b>.
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Información del Contrato
              </h4>
              <div className="space-y-2 text-sm">
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Contrato N°: {prestamo.numero_contrato || prestamo.id}
                </p>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Monto Total: <span className="font-semibold">{montoTotalPrestamo.toLocaleString(undefined, {minimumFractionDigits: 2})} UVC</span>
                </p>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Cuotas de Gracia: <span className="font-semibold">0 (no aplica bajo UVC/BCV)</span>
                </p>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Tasa de Mora Anual: <span className="font-semibold">{((Math.min(prestamo.tasaInteresMora || 0.008, 0.008)) * 100).toFixed(2)}%</span>
                </p>
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Número de Cuotas Obligatorias *
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={config.cantidadCuotas}
                onKeyDown={blockInvalidNumberKeys}
                onChange={(e) => handleChange('cantidadCuotas', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
                placeholder="Ej: 10"
              />
            </div>
            
            {config.cantidadCuotas > 0 && (
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <h5 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-blue-800'}`}>
                  Distribución de Cuotas
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className={darkMode ? 'text-gray-400' : 'text-blue-600'}>Obligatorias:</span>
                    <span className={`font-bold ml-1 ${darkMode ? 'text-white' : 'text-blue-800'}`}>
                      {cuotasObligatoriasIngresadas}
                    </span>
                  </div>
                  <div>
                    <span className={darkMode ? 'text-gray-400' : 'text-blue-600'}>Gracias:</span>
                    <span className={`font-bold ml-1 ${darkMode ? 'text-white' : 'text-blue-800'}`}>
                      {cuotasGraciaContrato}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs font-semibold">
                  ➕ Total: {totalCuotasGenerar} cuotas
                </div>
              </div>
            )}
            
            {montosCalculados.montoObligatorio > 0 && (
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
                <h5 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-green-800'}`}>
                  Montos Calculados
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-green-600'}>Cuota Obligatoria:</span>
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-green-800'}`}>
                      ${montosCalculados.montoObligatorio.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                  {montosCalculados.montoGracia > 0 && cuotasGraciaContrato > 0 && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-green-600'}>Cuota Gracia:</span>
                      <span className={`font-bold ${darkMode ? 'text-white' : 'text-green-800'}`}>
                        ${montosCalculados.montoGracia.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Frecuencia de pago
              </label>
              <select
                value={config.frecuencia}
                onChange={(e) => handleChange('frecuencia', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
              >
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
                <option value="semanal">Semanal</option>
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Fecha de primera cuota *
              </label>
              <input
                type="date"
                value={config.fechaPrimeraCuota}
                onChange={(e) => handleChange('fechaPrimeraCuota', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]`}
              />
            </div>
            
            <button
              onClick={calcularVistaPrevia}
              disabled={!config.cantidadCuotas || !config.fechaPrimeraCuota}
              className="w-full px-4 py-2 bg-[#264653] text-white rounded-lg hover:bg-[#1d3a4a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Eye size={18} />
              Calcular Vista Previa
            </button>
          </div>
          
          <div>
            {mostrarVistaPrevia && cuotasGeneradas.length > 0 && (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Vista Previa de Cuotas
                </h4>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Total cuotas:</span>
                    <span className="font-bold">{cuotasGeneradas.length}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="font-semibold">Total a pagar:</span>
                    <span className="font-bold text-[#2A9D8F]">
                      ${(totalObligatorias + totalGracias).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto overflow-x-auto table-scroll">
                  <table className="w-full text-sm">
                    <thead className={darkMode ? 'bg-gray-600' : 'bg-gray-200'}>
                      <tr>
                        <th className="px-2 py-1 text-left">N°</th>
                        <th className="px-2 py-1 text-left">Tipo</th>
                        <th className="px-2 py-1 text-left">Desde</th>
                        <th className="px-2 py-1 text-left">Hasta</th>
                        <th className="px-2 py-1 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotasGeneradas.map((cuota) => (
                        <tr key={cuota.numero} className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                          <td className="px-2 py-1">{cuota.numero}</td>
                          <td className="px-2 py-1">
                            <span className={`px-1 py-0.5 rounded text-xs ${
                              cuota.tipo === 'Obligatoria' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {cuota.tipo}
                            </span>
                          </td>
                          <td className="px-2 py-1">{cuota.fecha_desde}</td>
                          <td className="px-2 py-1">{cuota.fecha_hasta}</td>
                          <td className="px-2 py-1 text-right font-medium">
                            ${cuota.monto.toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-3 pt-6 mt-4 border-t dark:border-gray-700">
          <button
            onClick={() => onConfirm({
              ...config,
              totalCuotas: totalCuotasGenerar,
              cuotasObligatorias: cuotasObligatoriasIngresadas,
              cuotasGracia: cuotasGraciaContrato,
              montoObligatorio: montosCalculados.montoObligatorio,
              montoGracia: montosCalculados.montoGracia
            })}
            disabled={!mostrarVistaPrevia || cuotasGeneradas.length === 0}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#264653] to-[#2A9D8F] text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus size={20} />
            Generar {cuotasGeneradas.length} Cuotas
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cuota;
