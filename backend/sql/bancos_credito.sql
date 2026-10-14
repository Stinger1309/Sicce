-- Bancos, cuentas del emprendedor y créditos dirigidos a banco

CREATE TABLE IF NOT EXISTS bancos (
    id_banco SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    siglas VARCHAR(30),
    codigo_banco VARCHAR(10),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS persona_bancos (
    id_persona_banco SERIAL PRIMARY KEY,
    cedula_persona VARCHAR(20) NOT NULL REFERENCES persona(cedula) ON DELETE CASCADE ON UPDATE CASCADE,
    id_banco INTEGER NOT NULL REFERENCES bancos(id_banco),
    tipo_cuenta VARCHAR(30) DEFAULT 'Ahorro',
    numero_cuenta VARCHAR(40),
    es_preferida BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cedula_persona, id_banco, numero_cuenta)
);

CREATE TABLE IF NOT EXISTS credito_banco (
    id_credito_banco SERIAL PRIMARY KEY,
    id_aprobacion INTEGER NOT NULL REFERENCES aprobacion(id_aprobacion) ON DELETE CASCADE,
    id_expediente INTEGER REFERENCES expediente(id_expediente),
    id_solicitud INTEGER REFERENCES solicitud(id_solicitud),
    cedula_persona VARCHAR(20) NOT NULL REFERENCES persona(cedula),
    id_persona_banco INTEGER NOT NULL REFERENCES persona_bancos(id_persona_banco),
    monto_solicitado VARCHAR(100),
    monto_aprobado VARCHAR(100),
    estatus VARCHAR(40) NOT NULL DEFAULT 'Finalizado',
    observaciones TEXT,
    fecha_direccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_finalizado TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE credito_banco
  ADD COLUMN IF NOT EXISTS aval_entregado BOOLEAN DEFAULT FALSE;

ALTER TABLE credito_banco
  ADD COLUMN IF NOT EXISTS fecha_aval_entregado TIMESTAMP;

ALTER TABLE credito_banco
  ADD COLUMN IF NOT EXISTS aval_descargas INTEGER DEFAULT 0;

ALTER TABLE aprobacion
  ADD COLUMN IF NOT EXISTS id_persona_banco INTEGER REFERENCES persona_bancos(id_persona_banco);

-- Catálogo de bancos Venezuela (si vacío)
INSERT INTO bancos (nombre, siglas, codigo_banco)
SELECT v.nombre, v.siglas, v.codigo
FROM (VALUES
  ('Banco de Venezuela', 'BDV', '0102'),
  ('Banesco', 'BANESCO', '0134'),
  ('Banco Mercantil', 'MERCANTIL', '0105'),
  ('BBVA Provincial', 'PROVINCIAL', '0108'),
  ('Banco Bicentenario', 'BICENTENARIO', '0175'),
  ('Banco del Tesoro', 'TESORO', '0163'),
  ('Banco Nacional de Crédito', 'BNC', '0191'),
  ('Banco Exterior', 'EXTERIOR', '0115'),
  ('Banco Sofitasa', 'SOFITASA', '0137'),
  ('Banco Plaza', 'PLAZA', '0138'),
  ('Banco Caroní', 'CARONI', '0128'),
  ('Banplus', 'BANPLUS', '0174'),
  ('Banco Activo', 'ACTIVO', '0171'),
  ('Banco Venezolano de Crédito', 'BVC', '0104')
) AS v(nombre, siglas, codigo)
WHERE NOT EXISTS (SELECT 1 FROM bancos LIMIT 1);
