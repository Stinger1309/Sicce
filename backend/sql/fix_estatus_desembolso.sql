-- Normaliza estatus legado de contrato/desembolso
UPDATE contrato
SET estatus = 'Pendiente por confirmar desembolso',
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(TRIM(estatus)) = 'esperando aceptar desembolso'
  AND EXISTS (
    SELECT 1 FROM desembolso d
    WHERE d.id_cont = contrato.id_contrato
      AND d.estatus_desembolso IN ('Pendiente', 'Confirmado')
  );

UPDATE contrato
SET estatus = 'Pendiente por desembolso',
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(TRIM(estatus)) = 'esperando aceptar desembolso'
  AND NOT EXISTS (
    SELECT 1 FROM desembolso d
    WHERE d.id_cont = contrato.id_contrato
      AND d.estatus_desembolso IN ('Pendiente', 'Confirmado')
  );
