-- HABILITAR POLÍTICAS DE ELIMINACIÓN (DELETE) EN SUPABASE
-- Este script permite que se puedan borrar registros y fotos de la base de datos.

-- 1. Políticas RLS para la tabla 'registros'
DROP POLICY IF EXISTS "Permitir eliminar registros" ON public.registros;
CREATE POLICY "Permitir eliminar registros"
    ON public.registros FOR DELETE
    TO authenticated, anon
    USING (true);

-- 2. Políticas RLS para la tabla 'fotos'
DROP POLICY IF EXISTS "Permitir eliminar fotos" ON public.fotos;
CREATE POLICY "Permitir eliminar fotos"
    ON public.fotos FOR DELETE
    TO authenticated, anon
    USING (true);
