// controllers/permisosController.js - Completo con controladores para USUARIO y ROL

const PermisosModel = require('../models/permisosModel');

const permisosController = {
  // ========== PERMISOS POR USUARIO ==========

  async getPermisosByUsuario(req, res) {
    try {
      const { idUsuario } = req.params;
      const permisos = await PermisosModel.getPermisosByUsuario(idUsuario);
      
      res.json({ 
        success: true, 
        data: permisos,
        total: permisos.length
      });
    } catch (error) {
      console.error('Error en getPermisosByUsuario:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener los permisos del usuario' 
      });
    }
  },

  async asignarPermisosUsuario(req, res) {
    try {
      const { idUsuario } = req.params;
      const { permisos } = req.body;
      
      if (!permisos || !Array.isArray(permisos)) {
        return res.status(400).json({ 
          success: false, 
          error: 'El campo "permisos" debe ser un array de {menu_item_id, acciones}' 
        });
      }

      for (const permiso of permisos) {
        if (!permiso.menu_item_id || !permiso.acciones) {
          return res.status(400).json({
            success: false,
            error: 'Cada permiso debe tener menu_item_id y acciones'
          });
        }
      }

      const resultado = await PermisosModel.asignarPermisosUsuario(idUsuario, permisos);
      
      if (resultado) {
        res.json({ 
          success: true, 
          message: 'Permisos actualizados correctamente para el usuario',
          total_permisos: permisos.length
        });
      } else {
        throw new Error('No se pudieron asignar los permisos');
      }
    } catch (error) {
      console.error('Error en asignarPermisosUsuario:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Error al asignar permisos al usuario' 
      });
    }
  },

  async eliminarPermisosUsuario(req, res) {
    try {
      const { idUsuario } = req.params;
      const resultado = await PermisosModel.eliminarPermisosUsuario(idUsuario);
      
      res.json({ 
        success: true, 
        message: resultado ? 'Permisos eliminados correctamente' : 'El usuario no tenía permisos asignados'
      });
    } catch (error) {
      console.error('Error en eliminarPermisosUsuario:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Error al eliminar los permisos del usuario' 
      });
    }
  },

  async copiarPermisosUsuario(req, res) {
    try {
      const { id_usuario_origen, id_usuario_destino } = req.body;
      
      if (!id_usuario_origen || !id_usuario_destino) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren id_usuario_origen e id_usuario_destino'
        });
      }

      const resultado = await PermisosModel.copiarPermisosUsuario(
        id_usuario_origen, 
        id_usuario_destino
      );
      
      res.json({ 
        success: true, 
        message: resultado ? 'Permisos copiados exitosamente' : 'No se pudieron copiar los permisos'
      });
    } catch (error) {
      console.error('Error en copiarPermisosUsuario:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Error al copiar permisos' 
      });
    }
  },

  // ========== PERMISOS POR ROL ==========

  async getPermisosByRol(req, res) {
    try {
      const { idRol } = req.params;
      const idArea = req.query.id_area || null;
      const rolExiste = await PermisosModel.getRolById(idRol);
      if (!rolExiste) {
        return res.status(404).json({ success: false, error: 'El rol especificado no existe' });
      }
      const permisos = await PermisosModel.getPermisosByRol(idRol, idArea);
      res.json({ success: true, data: permisos, total: permisos.length, rol: rolExiste.nombre_rol });
    } catch (error) {
      console.error('Error en getPermisosByRol:', error);
      res.status(500).json({ success: false, error: 'Error al obtener los permisos del rol' });
    }
  },

  async asignarPermisosRol(req, res) {
    try {
      const { idRol } = req.params;
      const { permisos, id_area } = req.body;
      
      const rolExiste = await PermisosModel.getRolById(idRol);
      if (!rolExiste) {
        return res.status(404).json({ success: false, error: 'El rol especificado no existe' });
      }

      if (!permisos || !Array.isArray(permisos)) {
        return res.status(400).json({ success: false, error: 'El campo "permisos" debe ser un array' });
      }

      for (const permiso of permisos) {
        if (!permiso.menu_item_id || !permiso.acciones) {
          return res.status(400).json({ success: false, error: 'Cada permiso debe tener menu_item_id y acciones' });
        }
      }

      const resultado = await PermisosModel.asignarPermisosRol(idRol, permisos, id_area);
      
      res.json({ 
        success: true, 
        message: `Permisos actualizados para el rol "${rolExiste.nombre_rol}"`,
        total_permisos: permisos.length
      });
    } catch (error) {
      console.error('Error en asignarPermisosRol:', error);
      res.status(500).json({ success: false, error: error.message || 'Error al asignar permisos al rol' });
    }
  },

  async eliminarPermisosRol(req, res) {
    try {
      const { idRol } = req.params;
      const rolExiste = await PermisosModel.getRolById(idRol);
      if (!rolExiste) {
        return res.status(404).json({ success: false, error: 'El rol especificado no existe' });
      }
      const resultado = await PermisosModel.eliminarPermisosRol(idRol);
      res.json({ 
        success: true, 
        message: resultado ? `Permisos eliminados para el rol "${rolExiste.nombre_rol}"` : 'El rol no tenía permisos asignados'
      });
    } catch (error) {
      console.error('Error en eliminarPermisosRol:', error);
      res.status(500).json({ success: false, error: error.message || 'Error al eliminar los permisos del rol' });
    }
  },

  // ========== GENERALES ==========

  async getAllPermisos(req, res) {
    try {
      const permisos = await PermisosModel.getAllPermisos();
      res.json({ success: true, data: permisos, total: permisos.length });
    } catch (error) {
      console.error('Error en getAllPermisos:', error);
      res.status(500).json({ success: false, error: 'Error al obtener los permisos' });
    }
  },

  async verificarPermiso(req, res) {
    try {
      const { idUsuario, menuItemId, accion } = req.params;
      const tienePermiso = await PermisosModel.verificarPermiso(idUsuario, menuItemId, accion);
      res.json({ success: true, tiene_permiso: tienePermiso });
    } catch (error) {
      console.error('Error en verificarPermiso:', error);
      res.status(500).json({ success: false, error: 'Error al verificar el permiso' });
    }
  },

  // ========== ROLES ==========

  async getRoles(req, res) {
    try {
      const roles = await PermisosModel.getAllRoles();
      res.json({ success: true, data: roles, total: roles.length });
    } catch (error) {
      console.error('Error en getRoles:', error);
      res.status(500).json({ success: false, error: 'Error al obtener los roles' });
    }
  },

  async getRolById(req, res) {
    try {
      const { id } = req.params;
      const rol = await PermisosModel.getRolById(id);
      if (!rol) return res.status(404).json({ success: false, error: 'Rol no encontrado' });
      res.json({ success: true, data: rol });
    } catch (error) {
      console.error('Error en getRolById:', error);
      res.status(500).json({ success: false, error: 'Error al obtener el rol' });
    }
  },

  async createRol(req, res) {
    try {
      const { nombre_rol, descripcion } = req.body;
      if (!nombre_rol || nombre_rol.trim().length < 3) {
        return res.status(400).json({ success: false, error: 'El nombre del rol debe tener al menos 3 caracteres' });
      }
      const rolExistente = await PermisosModel.getRolByNombre(nombre_rol.trim());
      if (rolExistente) {
        return res.status(409).json({ success: false, error: 'Ya existe un rol con ese nombre' });
      }
      const nuevoRol = await PermisosModel.createRol(nombre_rol.trim(), descripcion?.trim() || '');
      res.status(201).json({ success: true, data: nuevoRol, message: 'Rol creado exitosamente' });
    } catch (error) {
      console.error('Error en createRol:', error);
      res.status(500).json({ success: false, error: error.message || 'Error al crear el rol' });
    }
  },

  async updateRol(req, res) {
    try {
      const { id } = req.params;
      const { nombre_rol, descripcion } = req.body;
      const rolExiste = await PermisosModel.getRolById(id);
      if (!rolExiste) return res.status(404).json({ success: false, error: 'Rol no encontrado' });
      if (!nombre_rol || nombre_rol.trim().length < 3) {
        return res.status(400).json({ success: false, error: 'El nombre del rol debe tener al menos 3 caracteres' });
      }
      const rolActualizado = await PermisosModel.updateRol(id, nombre_rol.trim(), descripcion?.trim() || rolExiste.descripcion);
      res.json({ success: true, data: rolActualizado, message: 'Rol actualizado exitosamente' });
    } catch (error) {
      console.error('Error en updateRol:', error);
      res.status(500).json({ success: false, error: error.message || 'Error al actualizar el rol' });
    }
  },

  async deleteRol(req, res) {
    try {
      const { id } = req.params;
      const rolExiste = await PermisosModel.getRolById(id);
      if (!rolExiste) return res.status(404).json({ success: false, error: 'Rol no encontrado' });
      const usuariosConRol = await PermisosModel.getUsuariosByRol(id);
      if (usuariosConRol?.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: `No se puede eliminar el rol porque tiene ${usuariosConRol.length} usuario(s) asignado(s)`,
          usuarios: usuariosConRol.length
        });
      }
      await PermisosModel.deleteRol(id);
      res.json({ success: true, message: 'Rol eliminado correctamente' });
    } catch (error) {
      console.error('Error en deleteRol:', error);
      res.status(500).json({ success: false, error: error.message || 'Error al eliminar el rol' });
    }
  },

  async getUsuariosByRol(req, res) {
    try {
      const { id } = req.params;
      const rolExiste = await PermisosModel.getRolById(id);
      if (!rolExiste) return res.status(404).json({ success: false, error: 'Rol no encontrado' });
      const usuarios = await PermisosModel.getUsuariosByRol(id);
      res.json({ success: true, data: usuarios, total: usuarios.length, rol: rolExiste.nombre_rol });
    } catch (error) {
      console.error('Error en getUsuariosByRol:', error);
      res.status(500).json({ success: false, error: 'Error al obtener usuarios del rol' });
    }
  }
};

module.exports = permisosController;