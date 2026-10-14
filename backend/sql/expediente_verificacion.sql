-- Verificación documental por requisito en expediente
ALTER TABLE expediente
  ADD COLUMN IF NOT EXISTS verificacion_documentos TEXT;

-- Comentario: JSON { "id_requisito": { "estado": "ok"|"vencido", "observacion": "..." } }
