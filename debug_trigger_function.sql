-- Script para debuggear la función handle_new_user
-- Ejecutar en Supabase SQL Editor para identificar el error específico

-- 1. Verificar que la función existe y está correctamente configurada
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  provolatile as volatility,
  pronargs as num_args,
  prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Verificar que el trigger existe y está activo
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement,
  action_orientation,
  action_condition
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 3. Verificar estructura de las tablas involucradas
SELECT 'user_profiles structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

SELECT 'user_invitations structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_invitations'
ORDER BY ordinal_position;

-- 4. Verificar permisos en las tablas
SELECT 
  'user_profiles permissions:' as info,
  has_table_privilege('user_profiles', 'SELECT') as can_select,
  has_table_privilege('user_profiles', 'INSERT') as can_insert,
  has_table_privilege('user_profiles', 'UPDATE') as can_update;

SELECT 
  'user_invitations permissions:' as info,
  has_table_privilege('user_invitations', 'SELECT') as can_select,
  has_table_privilege('user_invitations', 'INSERT') as can_insert,
  has_table_privilege('user_invitations', 'UPDATE') as can_update;

-- 5. Verificar estado de RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_invitations', 'resumenes')
ORDER BY tablename;

-- 6. Intentar simular la inserción que haría el trigger
-- NOTA: Este es solo un test, NO ejecutar el INSERT real
/*
TEST QUERY (NO EJECUTAR):
INSERT INTO user_profiles (user_id, first_name, last_name, user_type)
VALUES ('00000000-0000-0000-0000-000000000000', '', '', 'user');
*/

-- 7. Verificar si hay constraints que puedan estar fallando
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'user_profiles'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 8. Verificar logs de errores recientes (si están disponibles)
SELECT 'Verificación completa. Revisar todos los resultados para identificar el problema.' as status;

-- 9. Mostrar el código actual de la función para verificar sintaxis
SELECT prosrc as function_code
FROM pg_proc 
WHERE proname = 'handle_new_user';