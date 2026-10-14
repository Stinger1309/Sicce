-- Permisos por ROL, notificaciones, citas y ajustes de cuotas

-- 1) Permisos por rol
CREATE TABLE IF NOT EXISTS permisos_rol (
    id_permisos_rol SERIAL PRIMARY KEY,
    id_rol INTEGER NOT NULL REFERENCES roles(id_rol) ON DELETE CASCADE,
    menu_item_id VARCHAR(50) NOT NULL,
    acciones TEXT NOT NULL DEFAULT '["ver"]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_rol, menu_item_id)
);

-- Migrar permisos existentes de usuarios → roles (si aún no hay)
INSERT INTO permisos_rol (id_rol, menu_item_id, acciones)
SELECT DISTINCT u.id_rol_usu, p.menu_item_id, p.acciones
FROM Permisos p
JOIN usuario u ON u.id = p.id_usu
WHERE u.id_rol_usu IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM permisos_rol pr
  WHERE pr.id_rol = u.id_rol_usu AND pr.menu_item_id = p.menu_item_id
);

-- Seed admin: rol Administrador si no tiene permisos
INSERT INTO permisos_rol (id_rol, menu_item_id, acciones)
SELECT r.id_rol, v.menu_item_id, v.acciones
FROM roles r
CROSS JOIN (VALUES
  ('dashboard', '["ver","modificar","eliminar","exportar"]'),
  ('graficos', '["ver","exportar"]'),
  ('solicitudes', '["ver","modificar","eliminar","exportar"]'),
  ('expedientes', '["ver","modificar","eliminar","exportar"]'),
  ('inspecciones', '["ver","modificar","eliminar","exportar"]'),
  ('aprobaciones', '["ver","modificar","eliminar","exportar"]'),
  ('creditos_banco', '["ver","modificar","eliminar","exportar"]'),
  ('contratos', '["ver","modificar","eliminar","exportar"]'),
  ('desembolsos', '["ver","modificar","eliminar","exportar"]'),
  ('pagos_cuota', '["ver","modificar","eliminar","exportar"]'),
  ('citas', '["ver","modificar","eliminar","exportar"]'),
  ('config_usuarios', '["ver","modificar","eliminar","exportar"]'),
  ('config_emprendimientos', '["ver","modificar","eliminar","exportar"]'),
  ('config_roles', '["ver","modificar","eliminar","exportar"]'),
  ('config_contratos', '["ver","modificar","exportar"]'),
  ('config_requisitos', '["ver","modificar","eliminar","exportar"]'),
  ('config_bancos', '["ver","modificar","eliminar","exportar"]'),
  ('auditoria', '["ver","exportar","eliminar"]'),
  ('respaldo_bd', '["ver","modificar","exportar"]')
) AS v(menu_item_id, acciones)
WHERE LOWER(r.nombre_rol) LIKE '%admin%'
AND NOT EXISTS (
  SELECT 1 FROM permisos_rol pr WHERE pr.id_rol = r.id_rol AND pr.menu_item_id = v.menu_item_id
);

-- Seed Inspector / Presidente: ver citas
INSERT INTO permisos_rol (id_rol, menu_item_id, acciones)
SELECT r.id_rol, 'citas', '["ver"]'
FROM roles r
WHERE (
  LOWER(r.nombre_rol) LIKE '%inspect%'
  OR LOWER(r.nombre_rol) LIKE '%presiden%'
)
AND NOT EXISTS (
  SELECT 1 FROM permisos_rol pr
  WHERE pr.id_rol = r.id_rol AND pr.menu_item_id = 'citas'
);

-- 2) Notificaciones internas
CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario_destino INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    id_usuario_origen INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    tipo VARCHAR(50) DEFAULT 'info',
    modulo VARCHAR(80),
    enlace VARCHAR(255),
    leida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_destino ON notificaciones(id_usuario_destino, leida, created_at DESC);

-- 3) Citas / agenda
CREATE TABLE IF NOT EXISTS citas (
    id_cita SERIAL PRIMARY KEY,
    id_expediente INTEGER REFERENCES expediente(id_expediente) ON DELETE SET NULL,
    id_solicitud INTEGER REFERENCES solicitud(id_solicitud) ON DELETE SET NULL,
    id_inspector INTEGER NOT NULL REFERENCES usuario(id),
    cedula_emprendedor VARCHAR(20) REFERENCES persona(cedula),
    titulo VARCHAR(200) NOT NULL DEFAULT 'Atención de crédito',
    descripcion TEXT,
    fecha_cita DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME,
    estatus VARCHAR(40) DEFAULT 'Programada',
    created_by INTEGER REFERENCES usuario(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_citas_inspector_fecha ON citas(id_inspector, fecha_cita, hora_inicio);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_cita);

-- Evitar doble reserva del mismo inspector a la misma hora (estatus activos)
CREATE UNIQUE INDEX IF NOT EXISTS uq_cita_inspector_slot
ON citas (id_inspector, fecha_cita, hora_inicio)
WHERE estatus NOT IN ('Cancelada', 'Reprogramada');
