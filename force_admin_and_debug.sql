-- Script para forzar permisos de admin y diagnosticar problemas de sesión
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Forzar actualización del usuario a admin (por si el script anterior falló)
DO $$
DECLARE
    user_email TEXT := 'saradelgado95@gmail.com';
    target_user_id UUID;
    profile_count INTEGER;
BEGIN
    -- Buscar el usuario
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario % no encontrado en auth.users', user_email;
    END IF;
    
    -- Contar perfiles existentes
    SELECT COUNT(*) INTO profile_count
    FROM user_profiles
    WHERE user_id = target_user_id;
    
    IF profile_count = 0 THEN
        -- Crear perfil si no existe
        INSERT INTO user_profiles (
            user_id,
            first_name,
            last_name,
            user_type,
            status,
            is_first_login
        ) VALUES (
            target_user_id,
            'Admin',
            'User',
            'admin',
            'active',
            false
        );
        RAISE NOTICE 'Perfil de admin creado para %', user_email;
    ELSE
        -- Actualizar perfil existente
        UPDATE user_profiles
        SET user_type = 'admin',
            status = 'active',
            updated_at = NOW()
        WHERE user_id = target_user_id;
        RAISE NOTICE 'Perfil actualizado a admin para %', user_email;
    END IF;
    
    -- Mostrar información del usuario
    RAISE NOTICE 'Usuario ID: %', target_user_id;
    RAISE NOTICE 'Perfiles encontrados: %', profile_count;
END $$;

-- PASO 2: Verificar el resultado
SELECT 
    'Verificación final:' as status,
    au.id as user_id,
    au.email,
    up.user_type,
    up.status,
    up.created_at,
    up.updated_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.email = 'saradelgado95@gmail.com';

-- PASO 3: Probar la función directamente con el usuario específico
-- Esto nos dirá si el problema es de permisos o de la función
DO $$
DECLARE
    test_result RECORD;
    user_id_to_test UUID;
BEGIN
    -- Obtener el ID del usuario
    SELECT id INTO user_id_to_test
    FROM auth.users
    WHERE email = 'saradelgado95@gmail.com';
    
    -- Intentar ejecutar la función como si fuera ese usuario
    RAISE NOTICE 'Probando función con usuario ID: %', user_id_to_test;
    
    -- Verificar si el usuario es admin según la lógica de la función
    IF EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.user_id = user_id_to_test AND up.user_type = 'admin'
    ) THEN
        RAISE NOTICE 'Usuario ES admin según la base de datos';
    ELSE
        RAISE NOTICE 'Usuario NO es admin según la base de datos';
    END IF;
END $$;

-- PASO 4: Verificar que la función existe y está bien definida
SELECT 
    'Estado de la función:' as check_type,
    proname,
    prosecdef as is_security_definer,
    provolatile,
    prosrc
FROM pg_proc 
WHERE proname = 'get_user_profiles_with_emails';

-- PASO 5: Instrucciones para el usuario
SELECT 
    'INSTRUCCIONES:' as tipo,
    'Después de ejecutar este script, cierra sesión y vuelve a iniciar sesión en la aplicación' as mensaje
UNION ALL
SELECT 
    'NOTA:' as tipo,
    'El problema puede ser que la sesión actual no refleje los nuevos permisos' as mensaje;