-- ADICION SEGURA Y NO DESTRUCTIVA DE COLUMNAS PARA OBSERVACION DEL AUDITOR
-- No modifica ni elimina ningún registro ni columna existente.

ALTER TABLE public.registros ADD COLUMN IF NOT EXISTS observacion_auditor TEXT;
ALTER TABLE public.registros ADD COLUMN IF NOT EXISTS fecha_observacion_auditor TIMESTAMPTZ;
