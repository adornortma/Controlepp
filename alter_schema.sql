-- 1. Modificar columnas en registros para permitir nulos ya que no habrá login
ALTER TABLE public.registros ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE public.registros ALTER COLUMN tecnico_id DROP NOT NULL;
ALTER TABLE public.registros ALTER COLUMN tecnico_legajo DROP NOT NULL;

-- 2. Agregar nuevos campos requeridos para el registro del técnico
ALTER TABLE public.registros ADD COLUMN IF NOT EXISTS central TEXT;
ALTER TABLE public.registros ADD COLUMN IF NOT EXISTS lider_nombre TEXT;
ALTER TABLE public.registros ADD COLUMN IF NOT EXISTS distrito TEXT;

-- 3. Habilitar inserción anónima (pública) en registros y fotos
DROP POLICY IF EXISTS "Los líderes pueden insertar registros" ON public.registros;
DROP POLICY IF EXISTS "Permitir inserción pública de registros" ON public.registros;
CREATE POLICY "Permitir inserción pública de registros"
    ON public.registros FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Los líderes pueden insertar fotos asociadas a sus registros" ON public.fotos;
DROP POLICY IF EXISTS "Permitir inserción pública de fotos" ON public.fotos;
CREATE POLICY "Permitir inserción pública de fotos"
    ON public.fotos FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 4. Habilitar inserción anónima (pública) en el bucket de storage
DROP POLICY IF EXISTS "Permitir subida de fotos a usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida pública de fotos" ON storage.objects;
CREATE POLICY "Permitir subida pública de fotos"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'fotos-escaleras');

DROP POLICY IF EXISTS "Permitir lectura pública de fotos a anónimos" ON storage.objects;
CREATE POLICY "Permitir lectura pública de fotos a anónimos"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'fotos-escaleras');

-- 5. Habilitar lectura anónima (pública) en registros y fotos
DROP POLICY IF EXISTS "Permitir lectura pública de registros" ON public.registros;
CREATE POLICY "Permitir lectura pública de registros"
    ON public.registros FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Permitir lectura pública de fotos" ON public.fotos;
CREATE POLICY "Permitir lectura pública de fotos"
    ON public.fotos FOR SELECT
    TO anon, authenticated
    USING (true);

-- 6. Modificar tabla public.tecnicos para agregar celula y lider_id
ALTER TABLE public.tecnicos ADD COLUMN IF NOT EXISTS celula TEXT;
ALTER TABLE public.tecnicos ADD COLUMN IF NOT EXISTS lider_id UUID REFERENCES public.usuarios(id);

-- 7. Habilitar lectura pública de tecnicos y usuarios para anon (asistente sin login)
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver los tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "Permitir lectura pública de tecnicos" ON public.tecnicos;
CREATE POLICY "Permitir lectura pública de tecnicos"
    ON public.tecnicos FOR SELECT
    TO anon, authenticated
    USING (activo = true);

DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver la lista de usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Permitir lectura pública de usuarios" ON public.usuarios;
CREATE POLICY "Permitir lectura pública de usuarios"
    ON public.usuarios FOR SELECT
    TO anon, authenticated
    USING (activo = true);

