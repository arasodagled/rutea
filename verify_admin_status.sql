-- Script para verificar el estado actual del usuario admin
-- Ejecutar en Supabase SQL Editor para diagnosticar el problema

-- 1. Verificar si el usuario existe en auth.users
SELECT 
    'Usuario en auth.users:' as check_type,
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'saradelgado95@gmail.com';

-- 2. Verificar si el usuario tiene perfil en user_profiles
SELECT 
    'Perfil en user_profiles:' as check_type,
    up.id,
    up.user_id,
    up.user_type,
    up.status,
    up.first_name,
    up.last_name,
    up.created_at,
    up.updated_at,
    au.email
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email = 'saradelgado95@gmail.com';

-- 3. Verificar todos los usuarios admin
SELECT 
    'Todos los admins:' as check_type,
    up.user_type,
    up.status,
    au.email,
    up.created_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE up.user_type = 'admin'
ORDER BY up.created_at DESC;

-- 4. Probar la función get_user_profiles_with_emails directamente
-- (Esto fallará si el usuario actual no es admin)
SELECT 
    'Prueba de función RPC:' as check_type,
    'Intentando ejecutar get_user_profiles_with_emails...' as message;

-- Intentar ejecutar la función (comentado para evitar errores)
-- SELECT * FROM get_user_profiles_with_emails() LIMIT 1;

-- 5. Verificar políticas RLS en user_profiles
SELECT 
    'Políticas RLS:' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 6. Verificar si RLS está habilitado
SELECT 
    'Estado RLS:' as check_type,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 7. Verificar la función get_user_profiles_with_emails
SELECT 
    'Función RPC:' as check_type,
    proname,
    prorettype::regtype,
    prosecdef,
    provolatile
FROM pg_proc 
WHERE proname = 'get_user_profiles_with_emails';