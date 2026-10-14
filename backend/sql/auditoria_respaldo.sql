-- Script de migración: Auditoría y Respaldo BD
-- Ejecutar en bases de datos ya existentes

CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria SERIAL PRIMARY KEY,
    id_usuario INTEGER,
    usuario_nombre VARCHAR(200),
    modulo VARCHAR(100) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    descripcion TEXT,
    tabla_afectada VARCHAR(100),
    registro_id VARCHAR(100),
    datos_anteriores TEXT,
    datos_nuevos TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON auditoria(modulo);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(id_usuario);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria(accion);

CREATE TABLE IF NOT EXISTS historial_respaldos (
    id_respaldo SERIAL PRIMARY KEY,
    id_usuario INTEGER,
    usuario_nombre VARCHAR(200),
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) DEFAULT 'completo',
    tamanio_bytes BIGINT,
    estado VARCHAR(30) DEFAULT 'completado',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE SET NULL
);

-- Permisos para el primer usuario existente (no asume id=1)
INSERT INTO Permisos (id_usu, menu_item_id, acciones)
SELECT u.id, 'auditoria', '["ver", "exportar", "limpiar"]'
FROM usuario u
WHERE NOT EXISTS (
  SELECT 1 FROM Permisos p WHERE p.id_usu = u.id AND p.menu_item_id = 'auditoria'
);

INSERT INTO Permisos (id_usu, menu_item_id, acciones)
SELECT u.id, 'respaldo_bd', '["ver", "exportar", "restaurar"]'
FROM usuario u
WHERE NOT EXISTS (
  SELECT 1 FROM Permisos p WHERE p.id_usu = u.id AND p.menu_item_id = 'respaldo_bd'
);
