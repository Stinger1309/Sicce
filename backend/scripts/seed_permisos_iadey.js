require('dotenv').config();
const pool = require('../config/db');
const PermisosModel = require('../models/permisosModel');

const FULL = ['ver', 'modificar', 'eliminar', 'exportar'];
const VER = ['ver'];
const VER_MOD = ['ver', 'modificar'];
const VER_EXP = ['ver', 'exportar'];
const VER_MOD_EXP = ['ver', 'modificar', 'exportar'];

const ADMIN_MODULOS = [
  'dashboard',
  'graficos',
  'solicitudes',
  'expedientes',
  'inspecciones',
  'aprobaciones',
  'citas',
  'creditos_banco',
  'contratos',
  'desembolsos',
  'pagos_cuota',
  'config_usuarios',
  'config_emprendimientos',
  'config_roles',
  'config_contratos',
  'config_requisitos',
  'config_bancos',
  'auditoria',
  'respaldo_bd',
];

function p(menu, acciones) {
  return { menu_item_id: menu, acciones };
}

async function findRol(nombreLike) {
  const r = await pool.query(
    `SELECT id_rol, nombre_rol FROM roles
     WHERE LOWER(TRIM(nombre_rol)) LIKE $1
     ORDER BY id_rol LIMIT 1`,
    [nombreLike]
  );
  return r.rows[0] || null;
}

async function findArea(codigo) {
  const r = await pool.query(
    `SELECT id_area, codigo, nombre_area FROM area
     WHERE LOWER(TRIM(codigo)) = LOWER(TRIM($1))
        OR LOWER(TRIM(nombre_area)) LIKE $2
     LIMIT 1`,
    [codigo, `%${codigo}%`]
  );
  return r.rows[0] || null;
}

(async () => {
  const admin = await findRol('%administrador%') || await findRol('admin');
  const presidente = await findRol('%presid%');
  const emprendedor = await findRol('%emprendedor%');
  const inspector = await findRol('%inspect%');
  const director = await findRol('director%') || await findRol('%director%');
  const secretaria = await findRol('%secretar%');

  const areaAdmin = await findArea('administracion');
  const areaCobranzas = await findArea('cobranzas');
  const areaPresidencia = await findArea('presidencia');
  const areaInspeccion = await findArea('inspeccion');

  console.log('Roles:', { admin, presidente, emprendedor, inspector, director, secretaria });
  console.log('Áreas:', { areaAdmin, areaCobranzas, areaPresidencia, areaInspeccion });

  if (admin) {
    const extras = {
      pagos_cuota: ['ver', 'modificar', 'eliminar', 'exportar', 'registrar', 'verificar'],
      desembolsos: ['ver', 'modificar', 'eliminar', 'exportar', 'confirmar'],
      contratos: ['ver', 'modificar', 'eliminar', 'exportar'],
      graficos: VER_EXP,
      dashboard: VER_EXP,
    };
    const permisos = ADMIN_MODULOS.map((m) => p(m, extras[m] || FULL));
    await PermisosModel.asignarPermisosRol(admin.id_rol, permisos, null);
    console.log('Permisos Administrador OK');
  }

  if (presidente) {
    await PermisosModel.asignarPermisosRol(presidente.id_rol, [
      p('dashboard', VER_EXP),
      p('graficos', VER_EXP),
      p('solicitudes', VER_EXP),
      p('expedientes', VER_EXP),
      p('inspecciones', VER_EXP),
      p('aprobaciones', VER_MOD_EXP),
      p('creditos_banco', VER_MOD_EXP),
    ], null);
    console.log('Permisos Presidente OK');
  }

  if (emprendedor) {
    await PermisosModel.asignarPermisosRol(emprendedor.id_rol, [
      p('solicitudes', VER_MOD),
      p('contratos', VER),
      p('pagos_cuota', ['ver', 'registrar']),
    ], null);
    console.log('Permisos Emprendedor OK');
  }

  if (inspector) {
    const permisosInspector = [
      p('expedientes', VER_MOD),
      p('inspecciones', VER_MOD),
      p('citas', VER_MOD),
    ];
    await PermisosModel.asignarPermisosRol(inspector.id_rol, permisosInspector, null);
    if (areaInspeccion) {
      await PermisosModel.asignarPermisosRol(inspector.id_rol, permisosInspector, areaInspeccion.id_area);
    }
    console.log('Permisos Inspector OK');
  }

  if (director) {
    await PermisosModel.asignarPermisosRol(director.id_rol, [], null);
    if (areaCobranzas) {
      await PermisosModel.asignarPermisosRol(director.id_rol, [
        p('pagos_cuota', ['ver', 'verificar']),
        p('contratos', VER),
      ], areaCobranzas.id_area);
      console.log('Permisos Director + Cobranzas OK');
    }
    if (areaAdmin) {
      await PermisosModel.asignarPermisosRol(director.id_rol, [
        p('contratos', VER_MOD),
        p('desembolsos', VER_MOD),
        p('config_contratos', VER),
      ], areaAdmin.id_area);
      console.log('Permisos Director + Administración OK');
    }
  }

  if (secretaria) {
    await PermisosModel.asignarPermisosRol(secretaria.id_rol, [], null);
    if (areaCobranzas) {
      await PermisosModel.asignarPermisosRol(secretaria.id_rol, [
        p('pagos_cuota', VER),
        p('contratos', VER),
      ], areaCobranzas.id_area);
      console.log('Permisos Secretaria + Cobranzas OK');
    }
    if (areaAdmin) {
      await PermisosModel.asignarPermisosRol(secretaria.id_rol, [
        p('contratos', VER),
        p('desembolsos', VER),
      ], areaAdmin.id_area);
      console.log('Permisos Secretaria + Administración OK');
    }
    if (areaPresidencia) {
      await PermisosModel.asignarPermisosRol(secretaria.id_rol, [
        p('solicitudes', VER),
        p('citas', VER),
        p('aprobaciones', VER),
      ], areaPresidencia.id_area);
      console.log('Permisos Secretaria + Presidencia OK');
    }
    if (areaInspeccion) {
      await PermisosModel.asignarPermisosRol(secretaria.id_rol, [
        p('citas', VER),
        p('inspecciones', VER),
      ], areaInspeccion.id_area);
      console.log('Permisos Secretaria + Inspección OK');
    }
  }

  const resumen = await pool.query(`
    SELECT r.nombre_rol, a.codigo AS area, pr.menu_item_id, pr.acciones
    FROM permisos_rol pr
    JOIN roles r ON r.id_rol = pr.id_rol
    LEFT JOIN area a ON a.id_area = pr.id_area
    ORDER BY r.nombre_rol, a.codigo NULLS FIRST, pr.menu_item_id
  `);
  console.table(resumen.rows);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
