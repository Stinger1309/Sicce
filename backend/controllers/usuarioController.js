// controllers/usuarioController.js
const UsuarioModel = require('../models/usuarioModel');
const bcrypt = require('bcrypt');

const usuarioController = {
  // Obtener todos los usuarios
  async getAll(req, res) {
    try {
      const usuarios = await UsuarioModel.getAll();
      // Ocultar claves
      const usuariosSinClave = usuarios.map(u => {
        const { clave, ...resto } = u;
        return resto;
      });
      res.json({ success: true, data: usuariosSinClave });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener usuario por ID
  async getById(req, res) {
    try {
      const usuario = await UsuarioModel.getById(req.params.id);
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
      const { clave, ...usuarioSinClave } = usuario;
      res.json({ success: true, data: usuarioSinClave });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Obtener usuario por cédula
  async getByCedula(req, res) {
    try {
      const usuario = await UsuarioModel.getByCedula(req.params.cedula_usuario);
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
      // No enviar la contraseña en la respuesta
      const { clave, ...usuarioSinClave } = usuario;
      res.json({ success: true, data: usuarioSinClave });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

// Crear usuario
async create(req, res) {
  try {
    const { cedula_usuario, clave, id_rol_usu, estatus, id_area } = req.body;

    // Validar que id_rol_usu sea un número válido
    if (!id_rol_usu || isNaN(parseInt(id_rol_usu))) {
      return res.status(400).json({ 
        success: false, 
        error: 'El rol del usuario es requerido y debe ser un ID válido' 
      });
    }

    // Verificar si ya existe la cédula
    const existeCedula = await UsuarioModel.getByCedula(cedula_usuario);
    if (existeCedula) {
      return res.status(400).json({ success: false, error: 'Ya existe un usuario con esta cédula' });
    }

    const estatusFinal = estatus || 'activo';
    const areaFinal = id_area ? parseInt(id_area, 10) : null;
    if (String(estatusFinal).toLowerCase() === 'activo') {
      await UsuarioModel.assertRolUnicoDisponible(parseInt(id_rol_usu, 10));
    }
    await UsuarioModel.assertAreaSegunRol(parseInt(id_rol_usu, 10), areaFinal);

    // Hashear contraseña
    const saltRounds = 10;
    const claveHasheada = await bcrypt.hash(clave, saltRounds);

    const nuevoUsuario = await UsuarioModel.create({
      cedula_usuario,
      clave: claveHasheada,
      id_rol_usu: parseInt(id_rol_usu),
      estatus: estatusFinal,
      id_area: areaFinal,
    });

    res.status(201).json({ success: true, data: nuevoUsuario });
  } catch (error) {
    const msg = error.message || 'Error al crear usuario';
    const isBusiness = /Ya existe un (Presidente|Administrador)|requiere un área/i.test(msg);
    res.status(isBusiness ? 400 : 500).json({ success: false, error: msg });
  }
},

// Actualizar usuario
async update(req, res) {
  try {
    const { id_rol_usu, estatus, id_area } = req.body;
    
    // Validar que id_rol_usu sea un número válido si se proporciona
    if (id_rol_usu && isNaN(parseInt(id_rol_usu))) {
      return res.status(400).json({ 
        success: false, 
        error: 'El rol del usuario debe ser un ID válido' 
      });
    }

    const actual = await UsuarioModel.getById(req.params.id);
    if (!actual) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const rolFinal = id_rol_usu !== undefined && id_rol_usu !== null && id_rol_usu !== ''
      ? parseInt(id_rol_usu, 10)
      : actual.id_rol_usu;
    const estatusFinal = estatus !== undefined ? estatus : actual.estatus;
    const areaFinal = id_area !== undefined
      ? (id_area ? parseInt(id_area, 10) : null)
      : actual.id_area;

    if (String(estatusFinal || '').toLowerCase() === 'activo') {
      await UsuarioModel.assertRolUnicoDisponible(rolFinal, parseInt(req.params.id, 10));
    }
    await UsuarioModel.assertAreaSegunRol(rolFinal, areaFinal);

    const usuarioActualizado = await UsuarioModel.update(req.params.id, { 
      id_rol_usu: id_rol_usu !== undefined && id_rol_usu !== null && id_rol_usu !== ''
        ? parseInt(id_rol_usu, 10)
        : undefined, 
      estatus,
      id_area: id_area !== undefined ? areaFinal : undefined,
    });
    
    if (!usuarioActualizado) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: usuarioActualizado });
  } catch (error) {
    const msg = error.message || 'Error al actualizar usuario';
    const isBusiness = /Ya existe un (Presidente|Administrador)|requiere un área/i.test(msg);
    res.status(isBusiness ? 400 : 500).json({ success: false, error: msg });
  }
},

  // Obtener roles disponibles
  async getRoles(req, res) {
    try {
      const disponibles = String(req.query.disponibles || '') === '1' ||
        String(req.query.disponibles || '').toLowerCase() === 'true';
      const excludeUserId = req.query.excludeUserId
        ? parseInt(req.query.excludeUserId, 10)
        : null;

      const roles = disponibles
        ? await UsuarioModel.getRolesDisponibles(
            Number.isFinite(excludeUserId) ? excludeUserId : null
          )
        : await UsuarioModel.getRoles();
      res.json({ success: true, data: roles });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getPresidenteActivo(req, res) {
    try {
      const data = await UsuarioModel.getPresidenteActivo();
      res.json({
        success: true,
        data,
        message: data
          ? 'Presidente(a) activo encontrado'
          : 'No hay Presidente(a) activo registrado',
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Listar inspectores (rol Inspector / id 3)
  async getInspectores(req, res) {
    try {
      const inspectores = await UsuarioModel.getInspectores();
      const data = inspectores.map(u => {
        const { clave, ...resto } = u;
        return resto;
      });
      res.json({
        success: true,
        data,
        count: data.length,
        message: data.length
          ? `${data.length} inspector(es) encontrado(s)`
          : 'No hay inspectores registrados. Cree usuarios con rol Inspector (id_rol = 3).'
      });
    } catch (error) {
      console.error('Error en getInspectores:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Verificar si existe al menos un administrador / usuario administrativo
  async adminExists(req, res) {
    try {
      const existe = await UsuarioModel.existeAdministrador();
      res.json({
        success: true,
        data: { existe },
        message: existe
          ? 'Ya existe personal administrativo registrado'
          : 'No hay administrador. Se requiere registro inicial.'
      });
    } catch (error) {
      console.error('Error en adminExists:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Registro público de emprendedor (persona + usuario + bancos, atómico)
  async registrarEmprendedor(req, res) {
    try {
      const {
        nacionalidad,
        cedula,
        nombres,
        apellidos,
        fecha_nacimiento,
        telefono,
        correo,
        estado_civil,
        direccion,
        estado,
        municipio,
        parroquia,
        tipo_persona,
        clave,
        bancos,
      } = req.body;

      if (!cedula || !nombres || !apellidos || !correo || !clave) {
        return res.status(400).json({
          success: false,
          error: 'Cédula, nombres, apellidos, correo y contraseña son requeridos',
        });
      }

      if (String(clave).length < 6) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres',
        });
      }

      if (!Array.isArray(bancos) || bancos.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debe indicar al menos un banco y el número de cuenta (20 dígitos)',
        });
      }

      const cedulaFormateada = String(cedula).includes('-')
        ? String(cedula).toUpperCase()
        : `${(nacionalidad || 'V').toUpperCase()}-${cedula}`;

      const saltRounds = 10;
      const claveHasheada = await bcrypt.hash(clave, saltRounds);

      const result = await UsuarioModel.registrarEmprendedorCompleto({
        persona: {
          nacionalidad: (nacionalidad || 'V').toUpperCase(),
          cedula: cedulaFormateada,
          nombres,
          apellidos,
          fecha_nacimiento: fecha_nacimiento || '1990-01-01',
          telefono: telefono || '',
          correo,
          estado_civil: estado_civil || 'Soltero',
          direccion: direccion || '',
          estado: estado || 'Yaracuy',
          municipio: municipio || '',
          parroquia: parroquia || '',
          tipo_persona: tipo_persona || 'emprendedor',
        },
        claveHasheada,
        bancos: Array.isArray(bancos) ? bancos : [],
      });

      res.status(201).json({
        success: true,
        data: {
          usuario: result.usuario,
          persona: result.persona,
          bancos: result.bancos,
        },
        message: 'Emprendedor registrado correctamente. Ya puedes iniciar sesión.',
      });
    } catch (error) {
      console.error('Error en registrarEmprendedor:', error);
      const status = error.status || (error.code === '23503' || error.code === '23505' ? 400 : 500);
      let mensaje = error.message || 'Error al registrar emprendedor';
      if (error.code === '23503') {
        mensaje =
          'No se pudo crear la cuenta: los datos de la persona no coinciden con la cédula. Intente de nuevo.';
      }
      if (error.code === '23505') {
        mensaje = 'Ya existe un registro con esos datos (cédula o correo).';
      }
      res.status(status).json({
        success: false,
        error: mensaje,
      });
    }
  },

  // Registro público del PRIMER administrador (bloqueado si ya hay uno)
  async registrarPrimerAdmin(req, res) {
    try {
      const {
        nacionalidad, cedula, nombres, apellidos, fecha_nacimiento,
        telefono, correo, estado_civil, direccion, estado, municipio,
        parroquia, clave
      } = req.body;

      if (!cedula || !nombres || !apellidos || !correo || !clave) {
        return res.status(400).json({
          success: false,
          error: 'Cédula, nombres, apellidos, correo y contraseña son requeridos'
        });
      }

      if (String(clave).length < 6) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      const yaExiste = await UsuarioModel.existeAdministrador();
      if (yaExiste) {
        return res.status(403).json({
          success: false,
          error: 'Ya existe un administrador. El registro público no está disponible.'
        });
      }

      const cedulaFormateada = cedula.includes('-')
        ? cedula.toUpperCase()
        : `${(nacionalidad || 'V').toUpperCase()}-${cedula}`;

      const saltRounds = 10;
      const claveHasheada = await bcrypt.hash(clave, saltRounds);

      const result = await UsuarioModel.registrarPrimerAdministrador(
        {
          nacionalidad: (nacionalidad || 'V').toUpperCase(),
          cedula: cedulaFormateada,
          nombres,
          apellidos,
          fecha_nacimiento: fecha_nacimiento || '1990-01-01',
          telefono: telefono || '',
          correo,
          estado_civil: estado_civil || 'Soltero',
          direccion: direccion || '',
          estado: estado || 'Yaracuy',
          municipio: municipio || '',
          parroquia: parroquia || '',
          tipo_persona: 'Administrador'
        },
        claveHasheada
      );

      res.status(201).json({
        success: true,
        data: result.usuario,
        message: 'Administrador registrado correctamente. Ya puedes iniciar sesión.'
      });
    } catch (error) {
      console.error('Error en registrarPrimerAdmin:', error);
      const status = error.status || 500;
      res.status(status).json({
        success: false,
        error: error.message || 'Error al registrar administrador'
      });
    }
  },

  async updatePassword(req, res) {
    try {
      const { nuevaClave } = req.body;
      const saltRounds = 10;
      const claveHasheada = await bcrypt.hash(nuevaClave, saltRounds);
      
      const usuario = await UsuarioModel.updatePassword(req.params.id, claveHasheada);
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
      res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const usuario = await UsuarioModel.delete(req.params.id);
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
      res.json({ success: true, message: 'Usuario eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async cambiarEstatus(req, res) {
    try {
      const { estatus } = req.body;
      const actual = await UsuarioModel.getById(req.params.id);
      if (!actual) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      if (String(estatus || '').toLowerCase() === 'activo') {
        await UsuarioModel.assertRolUnicoDisponible(
          actual.id_rol_usu,
          parseInt(req.params.id, 10)
        );
      }

      const usuario = await UsuarioModel.cambiarEstatus(req.params.id, estatus);
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
      const { clave, ...usuarioSinClave } = usuario;
      res.json({ success: true, data: usuarioSinClave });
    } catch (error) {
      const msg = error.message || 'Error al cambiar estatus';
      const isBusiness = /Ya existe un (Presidente|Administrador)|requiere un área/i.test(msg);
      res.status(isBusiness ? 400 : 500).json({ success: false, error: msg });
    }
  },

  // Login
  async login(req, res) {
    try {
      const { cedula_usuario, clave } = req.body;
      
      if (!cedula_usuario || !clave) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cédula y contraseña son requeridos' 
        });
      }
      
      const usuario = await UsuarioModel.getByCedula(cedula_usuario);
      
      if (!usuario) {
        return res.status(401).json({ 
          success: false, 
          error: 'Credenciales incorrectas' 
        });
      }

      const estatusNorm = String(usuario.estatus || '').toLowerCase();
      if (estatusNorm !== 'activo') {
        return res.status(403).json({ 
          success: false, 
          error: 'Usuario inactivo. Contacte al administrador.' 
        });
      }

      const claveValida = await bcrypt.compare(clave, usuario.clave);
      
      if (!claveValida) {
        return res.status(401).json({ 
          success: false, 
          error: 'Credenciales incorrectas' 
        });
      }

      await UsuarioModel.updateUltimoAcceso(cedula_usuario);

      const { clave: _, ...usuarioSinClave } = usuario;
      
      const usuarioRespuesta = {
        ...usuarioSinClave,
        id_rol_usu: usuario.id_rol_usu,
        rol: usuario.nombre_rol || usuario.rol,
        nombre_rol: usuario.nombre_rol || usuario.rol,
        requiere_area: usuario.requiere_area,
        id_area: usuario.id_area || null,
        nombre_area: usuario.nombre_area || null,
      };
      
      res.json({ 
        success: true, 
        data: usuarioRespuesta,
        token: `session_${usuario.id}_${Date.now()}`
      });
      
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
      });
    }
  }
};

module.exports = usuarioController;