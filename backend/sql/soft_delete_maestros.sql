-- Soft delete (borrado lógico) para módulos maestros
-- Usuarios NO se modifica (sigue política de retención / hard block)

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE requisitos
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE clasificacion_emprendimiento
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE configuracion_contrato
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE roles SET activo = TRUE WHERE activo IS NULL;
UPDATE requisitos SET activo = TRUE WHERE activo IS NULL;
UPDATE clasificacion_emprendimiento SET activo = TRUE WHERE activo IS NULL;
UPDATE configuracion_contrato SET activo = TRUE WHERE activo IS NULL;
