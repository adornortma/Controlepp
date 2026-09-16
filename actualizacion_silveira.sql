-- ACTUALIZACION DE LIDER: REEMPLAZO DE SILVEIRA, ALEJANDRO POR MARZANA, JORGE DANIEL

-- 1. Reasignar los 9 técnicos de la célula SOLANO al líder MARZANA, JORGE DANIEL (Legajo 144527)
UPDATE public.tecnicos
SET lider_id = (SELECT id FROM public.usuarios WHERE email = 'legajo_144527@empresa.com' LIMIT 1)
WHERE lider_id = (SELECT id FROM public.usuarios WHERE email = 'legajo_146710@empresa.com' LIMIT 1);

-- 2. Dar de baja al usuario SILVEIRA, ALEJANDRO (Legajo 146710)
UPDATE public.usuarios
SET activo = false
WHERE email = 'legajo_146710@empresa.com';
