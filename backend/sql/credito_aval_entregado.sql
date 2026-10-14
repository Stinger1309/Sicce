-- Estado de entrega del PDF aval de crédito a banco
ALTER TABLE credito_banco
  ADD COLUMN IF NOT EXISTS aval_entregado BOOLEAN DEFAULT FALSE;

ALTER TABLE credito_banco
  ADD COLUMN IF NOT EXISTS fecha_aval_entregado TIMESTAMP;

ALTER TABLE credito_banco
  ADD COLUMN IF NOT EXISTS aval_descargas INTEGER DEFAULT 0;
