const BancoModel = require('../models/bancoModel');
const CreditoBancoModel = require('../models/creditoBancoModel');
const PDFService = require('../services/pdfService');

const bancoController = {
  listBancos: async (req, res) => {
    try {
      const data = await BancoModel.getAllActivos();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  listAll: async (req, res) => {
    try {
      const data = await BancoModel.getAll();
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const data = await BancoModel.create(req.body || {});
      res.status(201).json({ success: true, data, message: 'Banco creado' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const data = await BancoModel.update(req.params.id, req.body || {});
      res.json({ success: true, data, message: 'Banco actualizado' });
    } catch (error) {
      const code = error.message.includes('no encontrado') ? 404 : 400;
      res.status(code).json({ success: false, error: error.message });
    }
  },

  toggleActivo: async (req, res) => {
    try {
      const data = await BancoModel.toggleActivo(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: 'Banco no encontrado' });
      res.json({
        success: true,
        data,
        message: data.activo ? 'Banco activado' : 'Banco desactivado'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  remove: async (req, res) => {
    try {
      const data = await BancoModel.softDelete(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: 'Banco no encontrado' });
      res.json({ success: true, data, message: 'Banco desactivado' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getByCedula: async (req, res) => {
    try {
      const data = await BancoModel.getByCedula(req.params.cedula);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  savePersonaBancos: async (req, res) => {
    try {
      const { cedula, bancos } = req.body;
      if (!cedula || !Array.isArray(bancos) || bancos.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debe indicar cédula y al menos un banco'
        });
      }
      const data = await BancoModel.replacePersonaBancos(cedula, bancos);
      res.status(201).json({ success: true, data, message: 'Bancos guardados' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /** Créditos Interno del emprendedor que requieren / tienen cuenta para desembolso */
  getCreditosInternosCuenta: async (req, res) => {
    try {
      const { cedula } = req.params;
      if (!cedula || !String(cedula).trim()) {
        return res.status(400).json({ success: false, error: 'Cédula requerida' });
      }
      const data = await BancoModel.getCreditosInternosCuenta(String(cedula).trim());
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /** Emprendedor registra número de cuenta para desembolso (manejo Interno) */
  registrarCuentaDesembolso: async (req, res) => {
    try {
      const data = await BancoModel.registrarCuentaDesembolsoInterno(req.body || {});
      res.status(201).json({
        success: true,
        data,
        message: 'Datos de cuenta registrados. Ya puede procederse al desembolso.',
      });
    } catch (error) {
      const msg = error.message || 'Error al registrar la cuenta';
      const code =
        msg.includes('Solo puede') || msg.includes('Solo aplica') ? 403 : 400;
      res.status(code).json({ success: false, error: msg });
    }
  },
};

const creditoBancoController = {
  getAll: async (req, res) => {
    try {
      const data = await CreditoBancoModel.getAll({
        estatus: req.query.estatus,
        cedula: req.query.cedula
      });
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const data = await CreditoBancoModel.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: 'No encontrado' });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  updateEstatus: async (req, res) => {
    try {
      const data = await CreditoBancoModel.updateEstatus(
        req.params.id,
        req.body.estatus,
        req.body.observaciones
      );
      if (!data) return res.status(404).json({ success: false, error: 'No encontrado' });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  generarAvalPdf: async (req, res) => {
    try {
      const credito = await CreditoBancoModel.getById(req.params.id);
      if (!credito) {
        return res.status(404).json({ success: false, error: 'Crédito no encontrado' });
      }

      const yaEntregado = Boolean(credito.aval_entregado);
      const pool = require('../config/db');
      const presidente = await PDFService.obtenerNombrePresidente(pool);

      // Primera descarga: sin marca ENTREGADA. Reimpresiones: con ENTREGADA.
      const buffer = await PDFService.generarPDFAvalBancario({
        ...credito,
        presidente_nombre: presidente,
        aval_entregado: yaEntregado,
        aval_descargas: yaEntregado ? (credito.aval_descargas || 1) : 0,
      });

      if (yaEntregado) {
        await CreditoBancoModel.registrarReimpresionAval(credito.id_credito_banco);
      } else {
        await CreditoBancoModel.marcarAvalEntregado(credito.id_credito_banco);
      }

      const suffix = yaEntregado ? '_entregada' : '';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=aval_iadey_${credito.id_credito_banco}${suffix}.pdf`
      );
      res.setHeader('X-Aval-Entregado', yaEntregado ? '1' : '0');
      res.setHeader('X-Aval-Primera', yaEntregado ? '0' : '1');
      return res.send(buffer);
    } catch (error) {
      console.error('Error PDF aval:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = { bancoController, creditoBancoController };
