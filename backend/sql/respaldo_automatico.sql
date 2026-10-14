-- Extensión historial de respaldos: origen automático + ruta en disco
ALTER TABLE historial_respaldos
  ADD COLUMN IF NOT EXISTS ruta_archivo TEXT;

ALTER TABLE historial_respaldos
  ADD COLUMN IF NOT EXISTS origen VARCHAR(20) DEFAULT 'manual';

UPDATE historial_respaldos
SET origen = CASE
  WHEN LOWER(COALESCE(tipo, '')) = 'automatico' THEN 'automatico'
  ELSE COALESCE(NULLIF(origen, ''), 'manual')
END
WHERE origen IS NULL OR origen = 'manual';
