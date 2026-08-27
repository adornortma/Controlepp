-- Script para crear la tabla de Proyectos con la NUEVA estructura de 15 campos

-- 1. Eliminar la tabla anterior si existe
DROP TABLE IF EXISTS public.proyectos;

-- 2. Crear la tabla con la estructura real del Excel
CREATE TABLE public.proyectos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activo TEXT,
    address_id TEXT,
    central TEXT,
    sisvadi TEXT,
    estado_maximo TEXT,
    nombre_de_calle TEXT,
    nro TEXT,
    const_of TEXT,
    poligono TEXT,
    fecha_cita DATE,
    contrata TEXT,
    estado TEXT,
    fecha_conectado DATE,
    a_conectar TEXT,
    c_sp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices útiles para búsquedas futuras
CREATE INDEX idx_proyectos_activo ON public.proyectos(activo);
CREATE INDEX idx_proyectos_sisvadi ON public.proyectos(sisvadi);
CREATE INDEX idx_proyectos_created_at ON public.proyectos(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso abierto para que no se requiera login
CREATE POLICY "Permitir lectura pblica de proyectos" 
    ON public.proyectos FOR SELECT 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "Permitir insercin pblica de proyectos" 
    ON public.proyectos FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

CREATE POLICY "Permitir actualizacin pblica de proyectos" 
    ON public.proyectos FOR UPDATE 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "Permitir eliminacin pblica de proyectos" 
    ON public.proyectos FOR DELETE 
    TO anon, authenticated 
    USING (true);
