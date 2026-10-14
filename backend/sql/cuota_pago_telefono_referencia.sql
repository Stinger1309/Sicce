-- Campos extras de pago de cuota: referencia alfanumérica + teléfono (pago móvil)
ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(60);

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS telefono_pago VARCHAR(20);

ALTER TABLE cuota_pago
  ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(60);

ALTER TABLE cuota_pago
  ADD COLUMN IF NOT EXISTS telefono_pago VARCHAR(20);
