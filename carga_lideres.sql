-- 1. Insertar todos los líderes en la tabla 'usuarios'
INSERT INTO public.usuarios (id, nombre, email, rol, activo) VALUES
(gen_random_uuid(), 'ADORNO, RUBEN DARIO', 'legajo_151079@empresa.com', 'lider', true),
(gen_random_uuid(), 'CORDOBA, MAXIMILIANO GASTON', 'legajo_149007@empresa.com', 'lider', true),
(gen_random_uuid(), 'ARMIGNACCO, ADRIAN PABLO', 'legajo_151223@empresa.com', 'lider', true),
(gen_random_uuid(), 'PEREZ, RICARDO DANIEL', 'legajo_145542@empresa.com', 'lider', true),
(gen_random_uuid(), 'MEREP, FERNANDO DANIEL', 'legajo_173828@empresa.com', 'lider', true),
(gen_random_uuid(), 'GONZALEZ, HERNAN RAFAEL', 'legajo_151347@empresa.com', 'lider', true),
(gen_random_uuid(), 'LUNA, NORBERTO', 'legajo_503477@empresa.com', 'lider', true),
(gen_random_uuid(), 'D''ADAMO, LEANDRO MARTIN', 'legajo_148205@empresa.com', 'lider', true),
(gen_random_uuid(), 'MARCHAT, JONATAN JAVIER', 'legajo_503381@empresa.com', 'lider', true),
(gen_random_uuid(), 'ROMERO, GUSTAVO MANUEL', 'legajo_146225@empresa.com', 'lider', true),
(gen_random_uuid(), 'AMIGO, SEBASTIAN', 'legajo_148516@empresa.com', 'lider', true),
(gen_random_uuid(), 'BORGIONE, SERGIO NICOLAS', 'legajo_148059@empresa.com', 'lider', true),
(gen_random_uuid(), 'SOBRINO, ESTEBAN ANIBAL', 'legajo_146741@empresa.com', 'lider', true),
(gen_random_uuid(), 'ALBANESE, JESUS MARIA', 'legajo_151910@empresa.com', 'lider', true),
(gen_random_uuid(), 'DI SANTO, NICOLAS', 'legajo_500611@empresa.com', 'lider', true),
(gen_random_uuid(), 'LIGUORI, DANIEL GERMAN', 'legajo_149160@empresa.com', 'lider', true),
(gen_random_uuid(), 'GOMEZ, SERGIO LEONARDO', 'legajo_182441@empresa.com', 'lider', true),
(gen_random_uuid(), 'MARZANA, JORGE DANIEL', 'legajo_144527@empresa.com', 'lider', true),
(gen_random_uuid(), 'RIOS, ORLANDO ANIBAL', 'legajo_151467@empresa.com', 'lider', true),
(gen_random_uuid(), 'MARCHAT, ALEJANDRO ALBERTO', 'legajo_151521@empresa.com', 'lider', true),
(gen_random_uuid(), 'MARTINEZ, PABLO', 'legajo_144493@empresa.com', 'lider', true),
(gen_random_uuid(), 'SILVEIRA, ALEJANDRO', 'legajo_146710@empresa.com', 'lider', true),
(gen_random_uuid(), 'CADARIO, PABLO', 'legajo_151458@empresa.com', 'lider', true),
(gen_random_uuid(), 'GRISOLIA, CAMILO', 'legajo_147900@empresa.com', 'lider', true),
(gen_random_uuid(), 'KOZDRON, MATIAS NICOLAS', 'legajo_176571@empresa.com', 'lider', true),
(gen_random_uuid(), 'CORNEJO BENITEZ, DEMIAN DARIO', 'legajo_149162@empresa.com', 'lider', true),
(gen_random_uuid(), 'MAZEIKAITE, GUSTAVO', 'legajo_144580@empresa.com', 'lider', true),
(gen_random_uuid(), 'MEZA, JORGE', 'legajo_151443@empresa.com', 'lider', true),
(gen_random_uuid(), 'MARIANI, NORBERTO MAXIMILIANO', 'legajo_144388@empresa.com', 'lider', true),
(gen_random_uuid(), 'SALDIAS, PABLO FERNANDO', 'legajo_151522@empresa.com', 'lider', true)
ON CONFLICT (email) DO NOTHING;

-- 2. Vincular automáticamente a los técnicos con sus líderes según la célula
-- (Esta consulta asocia a cada técnico con el líder correspondiente de su célula de forma insensible a acentos/guiones bajos)
CREATE OR REPLACE FUNCTION public.limpiar_texto(t TEXT) RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(TRANSLATE(REPLACE(t, '_', ' '), 'ÁÉÍÓÚáéíóúÑñ', 'AEIOUaeiounn'));
END;
$$ LANGUAGE plpgsql;

-- Mapear y actualizar lider_id en la tabla tecnicos
UPDATE public.tecnicos t
SET lider_id = u.id
FROM public.usuarios u
WHERE (
  (u.nombre = 'ADORNO, RUBEN DARIO' AND public.limpiar_texto(t.celula) = 'berazategui') OR
  (u.nombre = 'CORDOBA, MAXIMILIANO GASTON' AND public.limpiar_texto(t.celula) = 'bernal') OR
  (u.nombre = 'ARMIGNACCO, ADRIAN PABLO' AND public.limpiar_texto(t.celula) = 'ms varela') OR
  (u.nombre = 'PEREZ, RICARDO DANIEL' AND public.limpiar_texto(t.celula) = 'quilmes') OR
  (u.nombre = 'MEREP, FERNANDO DANIEL' AND public.limpiar_texto(t.celula) = 'ranelagh') OR
  (u.nombre = 'GONZALEZ, HERNAN RAFAEL' AND public.limpiar_texto(t.celula) = 'varela 1') OR
  (u.nombre = 'LUNA, NORBERTO' AND public.limpiar_texto(t.celula) = 'varela 2') OR
  (u.nombre = 'D''ADAMO, LEANDRO MARTIN' AND public.limpiar_texto(t.celula) = 'gm lanus') OR
  (u.nombre = 'MARCHAT, JONATAN JAVIER' AND public.limpiar_texto(t.celula) = 'gm lomas') OR
  (u.nombre = 'ROMERO, GUSTAVO MANUEL' AND public.limpiar_texto(t.celula) = 'gm monte grande') OR
  (u.nombre = 'AMIGO, SEBASTIAN' AND public.limpiar_texto(t.celula) = 'gm quilmes varela') OR
  (u.nombre = 'BORGIONE, SERGIO NICOLAS' AND public.limpiar_texto(t.celula) = 'lanus') OR
  (u.nombre = 'SOBRINO, ESTEBAN ANIBAL' AND public.limpiar_texto(t.celula) = 'monte chingolo') OR
  (u.nombre = 'ALBANESE, JESUS MARIA' AND public.limpiar_texto(t.celula) = 'ms lanus') OR
  (u.nombre = 'DI SANTO, NICOLAS' AND (public.limpiar_texto(t.celula) = 'pineyro' OR public.limpiar_texto(t.celula) = 'piñeyro')) OR
  (u.nombre = 'LIGUORI, DANIEL GERMAN' AND public.limpiar_texto(t.celula) = 'sarandi') OR
  (u.nombre = 'GOMEZ, SERGIO LEONARDO' AND public.limpiar_texto(t.celula) = 'banfield') OR
  (u.nombre = 'MARZANA, JORGE DANIEL' AND public.limpiar_texto(t.celula) = 'calzada') OR
  (u.nombre = 'RIOS, ORLANDO ANIBAL' AND public.limpiar_texto(t.celula) = 'llavallol') OR
  (u.nombre = 'MARCHAT, ALEJANDRO ALBERTO' AND public.limpiar_texto(t.celula) = 'lomas') OR
  (u.nombre = 'MARTINEZ, PABLO' AND public.limpiar_texto(t.celula) = 'ms lomas') OR
  (u.nombre = 'SILVEIRA, ALEJANDRO' AND public.limpiar_texto(t.celula) = 'solano') OR
  (u.nombre = 'CADARIO, PABLO' AND public.limpiar_texto(t.celula) = 'gestion contrata') OR
  (u.nombre = 'GRISOLIA, CAMILO' AND public.limpiar_texto(t.celula) = 'mant prev capital') OR
  (u.nombre = 'KOZDRON, MATIAS NICOLAS' AND public.limpiar_texto(t.celula) = 'mant prev sur') OR
  (u.nombre = 'CORNEJO BENITEZ, DEMIAN DARIO' AND public.limpiar_texto(t.celula) = 'adrogue') OR
  (u.nombre = 'MAZEIKAITE, GUSTAVO' AND public.limpiar_texto(t.celula) = 'burzaco') OR
  (u.nombre = 'MEZA, JORGE' AND public.limpiar_texto(t.celula) = 'ezeiza') OR
  (u.nombre = 'MARIANI, NORBERTO MAXIMILIANO' AND public.limpiar_texto(t.celula) = 'monte grande') OR
  (u.nombre = 'SALDIAS, PABLO FERNANDO' AND public.limpiar_texto(t.celula) = 'ms monte grande')
);

-- Limpiar función temporal
DROP FUNCTION public.limpiar_texto(TEXT);
