-- Cascada de cobro: desglose de cuota + historial de aplicación de pagos
-- Orden: gasto cobranza → interés mora → interés corriente → capital cuota → capital principal

ALTER TABLE configuracion_contrato
  ADD COLUMN IF NOT EXISTS gasto_cobranza_porcentaje DECIMAL(5,2) DEFAULT 2.00;

ALTER TABLE configuracion_contrato
  ADD COLUMN IF NOT EXISTS gasto_cobranza_fijo DECIMAL(14,2) DEFAULT 0;

ALTER TABLE configuracion_contrato
  ADD COLUMN IF NOT EXISTS dias_gracia_mora INTEGER DEFAULT 5;

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS capital_cuota NUMERIC(14,2) DEFAULT 0;

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS interes_corriente NUMERIC(14,2) DEFAULT 0;

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS gasto_cobranza NUMERIC(14,2) DEFAULT 0;

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS pagado_gasto_cobranza NUMERIC(14,2) DEFAULT 0;

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS pagado_interes_mora NUMERIC(14,2) DEFAULT 0;

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS pagado_interes_corriente NUMERIC(14,2) DEFAULT 0;

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS pagado_capital NUMERIC(14,2) DEFAULT 0;

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS monto_pagado_acumulado NUMERIC(14,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS cuota_pago (
  id_pago SERIAL PRIMARY KEY,
  id_cuota INT NOT NULL,
  id_contrato INT NOT NULL,
  monto_total NUMERIC(14,2) NOT NULL,
  abono_gasto_cobranza NUMERIC(14,2) NOT NULL DEFAULT 0,
  abono_interes_mora NUMERIC(14,2) NOT NULL DEFAULT 0,
  abono_interes_corriente NUMERIC(14,2) NOT NULL DEFAULT 0,
  abono_capital_cuota NUMERIC(14,2) NOT NULL DEFAULT 0,
  abono_capital_principal NUMERIC(14,2) NOT NULL DEFAULT 0,
  dias_mora INT DEFAULT 0,
  monto_morosidad_ref NUMERIC(14,2) DEFAULT 0,
  comprobante TEXT,
  metodo_pago VARCHAR(30),
  titular_cedula VARCHAR(20),
  titular_nombre VARCHAR(200),
  fecha_pago DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cuota_pago_cuota ON cuota_pago(id_cuota);
CREATE INDEX IF NOT EXISTS idx_cuota_pago_contrato ON cuota_pago(id_contrato);
