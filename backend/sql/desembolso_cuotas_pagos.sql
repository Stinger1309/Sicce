-- Campos denegación de desembolso
ALTER TABLE desembolso
  ADD COLUMN IF NOT EXISTS motivo_denegacion TEXT;

ALTER TABLE desembolso
  ADD COLUMN IF NOT EXISTS comprobante_denegacion TEXT;

-- Campos de pago de cuota (método + titular)
ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(30);

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS titular_cedula VARCHAR(20);

ALTER TABLE cuota
  ADD COLUMN IF NOT EXISTS titular_nombre VARCHAR(200);

-- Permiso verificar en pagos_cuota para Administrador
UPDATE permisos_rol
SET acciones = '["ver", "registrar", "editar", "eliminar", "historial", "reporte", "exportar", "verificar"]',
    updated_at = CURRENT_TIMESTAMP
WHERE menu_item_id = 'pagos_cuota'
  AND id_rol IN (SELECT id_rol FROM roles WHERE LOWER(nombre_rol) LIKE '%admin%');

-- Si no existe fila de pagos_cuota para admin, insertar
INSERT INTO permisos_rol (id_rol, menu_item_id, acciones, created_at, updated_at)
SELECT r.id_rol, 'pagos_cuota',
       '["ver", "registrar", "editar", "eliminar", "historial", "reporte", "exportar", "verificar"]',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM roles r
WHERE LOWER(r.nombre_rol) LIKE '%admin%'
  AND NOT EXISTS (
    SELECT 1 FROM permisos_rol pr
    WHERE pr.id_rol = r.id_rol AND pr.menu_item_id = 'pagos_cuota'
  );

-- Emprendedor: ver desembolsos y pagos_cuota
INSERT INTO permisos_rol (id_rol, menu_item_id, acciones, created_at, updated_at)
SELECT r.id_rol, v.menu_item_id, v.acciones, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM roles r
CROSS JOIN (VALUES
  ('desembolsos', '["ver", "confirmar", "denegar"]'),
  ('pagos_cuota', '["ver", "registrar"]')
) AS v(menu_item_id, acciones)
WHERE LOWER(r.nombre_rol) LIKE '%emprendedor%'
  AND NOT EXISTS (
    SELECT 1 FROM permisos_rol pr
    WHERE pr.id_rol = r.id_rol AND pr.menu_item_id = v.menu_item_id
  );
