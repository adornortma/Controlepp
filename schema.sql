-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Usuarios (Líderes y Administradores)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY, -- Se asociará con auth.users.id
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL CHECK (rol IN ('lider', 'administrador')),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Técnicos
CREATE TABLE public.tecnicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legajo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    distrito TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Registros
CREATE TABLE public.registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tecnico_id UUID NOT NULL REFERENCES public.tecnicos(id),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
    numero_serie TEXT NOT NULL,
    tecnico_nombre TEXT NOT NULL, -- Histórico
    tecnico_legajo TEXT NOT NULL, -- Histórico
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'observado')),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Fotos
CREATE TABLE public.fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id UUID NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('advertencia', 'numero_serie', 'escalera')),
    url TEXT NOT NULL, -- URL de acceso o path en el bucket
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices recomendados para optimización
CREATE INDEX idx_registros_usuario_id ON public.registros(usuario_id);
CREATE INDEX idx_registros_tecnico_id ON public.registros(tecnico_id);
CREATE INDEX idx_registros_created_at ON public.registros(created_at DESC);
CREATE INDEX idx_fotos_registro_id ON public.fotos(registro_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para usuarios
CREATE POLICY "Los usuarios autenticados pueden ver la lista de usuarios"
    ON public.usuarios FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Los administradores pueden insertar usuarios"
    ON public.usuarios FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.rol = 'administrador'
        )
    );

CREATE POLICY "Los administradores pueden actualizar usuarios"
    ON public.usuarios FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.rol = 'administrador'
        )
    );

CREATE POLICY "Los administradores pueden eliminar usuarios"
    ON public.usuarios FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.rol = 'administrador'
        )
    );


-- Políticas de RLS para tecnicos
CREATE POLICY "Los usuarios autenticados pueden ver los tecnicos"
    ON public.tecnicos FOR SELECT
    TO authenticated
    USING (true);

-- Políticas de RLS para registros
CREATE POLICY "Los líderes pueden ver sus propios registros"
    ON public.registros FOR SELECT
    TO authenticated
    USING (
        usuario_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.rol = 'administrador'
        )
    );

CREATE POLICY "Los líderes pueden insertar registros"
    ON public.registros FOR INSERT
    TO authenticated
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Los administradores pueden actualizar registros (cambiar estado)"
    ON public.registros FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id = auth.uid() AND usuarios.rol = 'administrador'
        )
    );

-- Políticas de RLS para fotos
CREATE POLICY "Los usuarios autenticados pueden ver fotos si tienen acceso al registro"
    ON public.fotos FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.registros
            WHERE registros.id = fotos.registro_id
        )
    );

CREATE POLICY "Los líderes pueden insertar fotos asociadas a sus registros"
    ON public.fotos FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.registros
            WHERE registros.id = fotos.registro_id AND registros.usuario_id = auth.uid()
        )
    );

-- 5. Trigger para sincronizar auth.users con public.usuarios automáticamente al registrarse
-- Si ya existe un registro de usuario cargado con ese correo electrónico, asocia el UUID de auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si el email ya existe en public.usuarios (cargado por csv/excel)
    IF EXISTS (SELECT 1 FROM public.usuarios WHERE email = NEW.email) THEN
        UPDATE public.usuarios
        SET id = NEW.id,
            activo = true
        WHERE email = NEW.email;
    ELSE
        -- Si no existe, crearlo con rol líder por defecto
        INSERT INTO public.usuarios (id, nombre, email, rol, activo)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'nombre', 'Líder de Campo'),
            NEW.email,
            'lider',
            true
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Configurar Bucket de Almacenamiento
-- NOTA: Esto asume que el esquema storage ya existe en Supabase (por defecto sí).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'fotos-escaleras',
    'fotos-escaleras',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS para el Bucket (storage.objects)
CREATE POLICY "Permitir lectura pública de fotos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'fotos-escaleras');

CREATE POLICY "Permitir subida de fotos a usuarios autenticados"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'fotos-escaleras');

-- 7. Datos de prueba iniciales (Técnicos de ejemplo)
INSERT INTO public.tecnicos (legajo, nombre, distrito, activo) VALUES
('T001', 'Juan Pérez', 'Norte', true),
('T002', 'Carlos López', 'Sur', true),
('T003', 'Martín Gómez', 'Este', true),
('T004', 'Santiago Rodríguez', 'Oeste', true),
('T005', 'Facundo Fernández', 'Centro', true);

-- Usuario Administrador semilla para pruebas directas en SQL (email: admin@escaleras.com)
-- Para que se asocie en auth, se creará primero en public.usuarios.
-- Cuando el usuario se registre o cree en auth.users con este email, heredará el rol 'administrador'
INSERT INTO public.usuarios (id, nombre, email, rol, activo) VALUES
('00000000-0000-0000-0000-000000000000', 'Administrador Semilla', 'admin@escaleras.com', 'administrador', true)
ON CONFLICT (email) DO NOTHING;
