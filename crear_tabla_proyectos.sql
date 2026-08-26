-- Script para crear la tabla de Proyectos de forma independiente

CREATE TABLE public.proyectos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sigest TEXT NOT NULL,
    titulo TEXT NOT NULL,
    fecha_cita DATE NOT NULL,
    fecha_construido DATE,
    ejecutado_por TEXT NOT NULL CHECK (ejecutado_por IN ('Mantenimiento', 'Obras', 'TECO')),
    direccion TEXT NOT NULL,
    central TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices útiles para búsquedas futuras
CREATE INDEX idx_proyectos_sigest ON public.proyectos(sigest);
CREATE INDEX idx_proyectos_created_at ON public.proyectos(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso abierto para que no se requiera login
-- (Similar a lo implementado en la aplicación de escaleras)
CREATE POLICY "Permitir lectura pública de proyectos" 
    ON public.proyectos FOR SELECT 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "Permitir inserción pública de proyectos" 
    ON public.proyectos FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

CREATE POLICY "Permitir actualización pública de proyectos" 
    ON public.proyectos FOR UPDATE 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "Permitir eliminación pública de proyectos" 
    ON public.proyectos FOR DELETE 
    TO anon, authenticated 
    USING (true);
