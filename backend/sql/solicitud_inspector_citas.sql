-- Inspector asignado en pre-aprobación + asegurar tabla citas

ALTER TABLE solicitud
  ADD COLUMN IF NOT EXISTS id_inspector INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_solicitud_inspector'
  ) THEN
    ALTER TABLE solicitud
      ADD CONSTRAINT fk_solicitud_inspector
      FOREIGN KEY (id_inspector) REFERENCES usuario(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_solicitud_inspector ON solicitud(id_inspector);

-- Tabla citas (relación solicitud ↔ inspector / agenda)
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
CREATE INDEX IF NOT EXISTS idx_citas_solicitud ON citas(id_solicitud);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cita_inspector_slot
ON citas (id_inspector, fecha_cita, hora_inicio)
WHERE estatus NOT IN ('Cancelada', 'Reprogramada');

-- Backfill: copiar inspector desde la última cita a la solicitud
UPDATE solicitud s
SET id_inspector = c.id_inspector,
    updated_at = CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (id_solicitud)
    id_solicitud, id_inspector
  FROM citas
  WHERE id_solicitud IS NOT NULL
    AND LOWER(COALESCE(estatus, 'programada')) NOT IN ('cancelada', 'reprogramada')
  ORDER BY id_solicitud, created_at DESC NULLS LAST, id_cita DESC
) c
WHERE s.id_solicitud = c.id_solicitud
  AND s.id_inspector IS NULL;
