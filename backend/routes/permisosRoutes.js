// routes/permisos.js - Completo con rutas para USUARIO y ROL

const express = require('express');
const router = express.Router();
const permisosController = require('../controllers/permisosController');

// ========== RUTAS DE PERMISOS POR USUARIO ==========

// GET /api/permisos/usuario/:idUsuario - Obtener permisos de un usuario
router.get('/usuario/:idUsuario', permisosController.getPermisosByUsuario);

// POST /api/permisos/usuario/:idUsuario - Asignar/actualizar permisos de un usuario
router.post('/usuario/:idUsuario', permisosController.asignarPermisosUsuario);

// DELETE /api/permisos/usuario/:idUsuario - Eliminar permisos de un usuario
router.delete('/usuario/:idUsuario', permisosController.eliminarPermisosUsuario);

// ========== RUTAS DE PERMISOS POR ROL ==========

// GET /api/permisos/rol/:idRol - Obtener permisos de un rol
router.get('/rol/:idRol', permisosController.getPermisosByRol);

// POST /api/permisos/rol/:idRol - Asignar/actualizar permisos de un rol
router.post('/rol/:idRol', permisosController.asignarPermisosRol);

// DELETE /api/permisos/rol/:idRol - Eliminar permisos de un rol
router.delete('/rol/:idRol', permisosController.eliminarPermisosRol);

// ========== RUTAS GENERALES DE PERMISOS ==========

// GET /api/permisos - Obtener todos los permisos
router.get('/', permisosController.getAllPermisos);

// POST /api/permisos/copiar - Copiar permisos entre usuarios
router.post('/copiar', permisosController.copiarPermisosUsuario);

// GET /api/permisos/verificar/:idUsuario/:menuItemId/:accion - Verificar permiso
router.get('/verificar/:idUsuario/:menuItemId/:accion', permisosController.verificarPermiso);

// ========== RUTAS DE ROLES ==========

// GET /api/roles - Obtener todos los roles
router.get('/roles', permisosController.getRoles);

// GET /api/roles/:id - Obtener un rol por ID
router.get('/roles/:id', permisosController.getRolById);

// POST /api/roles - Crear un nuevo rol
router.post('/roles', permisosController.createRol);

// PUT /api/roles/:id - Actualizar un rol
router.put('/roles/:id', permisosController.updateRol);

// DELETE /api/roles/:id - Eliminar un rol
router.delete('/roles/:id', permisosController.deleteRol);

// GET /api/roles/:id/usuarios - Obtener usuarios de un rol
router.get('/roles/:id/usuarios', permisosController.getUsuariosByRol);

module.exports = router;