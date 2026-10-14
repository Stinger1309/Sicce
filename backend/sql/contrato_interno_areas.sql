-- Contrato interno IADEY: foto del contrato firmado
-- Rol + Área para personal administrativo

ALTER TABLE contrato
  ADD COLUMN IF NOT EXISTS foto_contrato TEXT;

CREATE TABLE IF NOT EXISTS area (
    id_area SERIAL PRIMARY KEY,
    nombre_area VARCHAR(80) NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_area_codigo
  ON area (LOWER(TRIM(codigo)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_area_nombre
  ON area (LOWER(TRIM(nombre_area)));

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS requiere_area BOOLEAN DEFAULT FALSE;

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS unico BOOLEAN DEFAULT FALSE;

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS id_area INTEGER REFERENCES area(id_area) ON DELETE SET NULL;

ALTER TABLE permisos_rol
  ADD COLUMN IF NOT EXISTS id_area INTEGER REFERENCES area(id_area) ON DELETE CASCADE;

INSERT INTO area (nombre_area, codigo, descripcion)
SELECT v.nombre_area, v.codigo, v.descripcion
FROM (VALUES
  ('Presidencia', 'presidencia', 'Despacho de la Presidencia'),
  ('Administración', 'administracion', 'Dirección de Administración'),
  ('Cobranzas', 'cobranzas', 'Dirección de Cobranzas'),
  ('Inspección', 'inspeccion', 'Área de inspecciones de campo'),
  ('Sistema', 'sistema', 'Administración técnica del sistema')
) AS v(nombre_area, codigo, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM area a WHERE LOWER(TRIM(a.codigo)) = LOWER(TRIM(v.codigo))
);

INSERT INTO roles (nombre_rol, requiere_area, unico, activo)
SELECT v.nombre_rol, v.requiere_area, v.unico, TRUE
FROM (VALUES
  ('Director', TRUE, FALSE),
  ('Secretaria', TRUE, FALSE)
) AS v(nombre_rol, requiere_area, unico)
WHERE NOT EXISTS (
  SELECT 1 FROM roles r WHERE LOWER(TRIM(r.nombre_rol)) = LOWER(TRIM(v.nombre_rol))
);
