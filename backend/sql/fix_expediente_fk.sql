-- Corrige FK errónea: expediente.id_expediente NO debe referenciar requisitos.
-- id_requisitos en expediente es TEXT (lista de IDs), no una FK.
ALTER TABLE expediente
  DROP CONSTRAINT IF EXISTS expediente_id_expediente_fkey;
