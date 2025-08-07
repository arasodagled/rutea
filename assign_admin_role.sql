-- Script para asignar rol de administrador a usuarios autenticados sin user_profile
-- Ejecutar en Supabase SQL Editor

-- Función para crear perfil de administrador para usuarios existentes
CREATE OR REPLACE FUNCTION create_admin_profile(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    target_user_id UUID;
    existing_profile_count INTEGER;
BEGIN
    -- Buscar el usuario por email en auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    -- Verificar si el usuario existe
    IF target_user_id IS NULL THEN
        RETURN 'ERROR: Usuario con email ' || user_email || ' no encontrado en auth.users';
    END IF;
    
    -- Verificar si ya tiene un perfil
    SELECT COUNT(*) INTO existing_profile_count
    FROM user_profiles
    WHERE user_id = target_user_id;
    
    IF existing_profile_count > 0 THEN
        -- Si ya tiene perfil, solo actualizar el user_type a admin
        UPDATE user_profiles
        SET user_type = 'admin',
            status = 'active',
            updated_at = NOW()
        WHERE user_id = target_user_id;
        
        RETURN 'SUCCESS: Usuario ' || user_email || ' actualizado a administrador';
    ELSE
        -- Si no tiene perfil, crear uno nuevo con rol admin
        INSERT INTO user_profiles (
            user_id,
            first_name,
            last_name,
            user_type,
            status,
            is_first_login
        ) VALUES (
            target_user_id,
            '',
            '',
            'admin',
            'active',
            false
        );
        
        RETURN 'SUCCESS: Perfil de administrador creado para ' || user_email;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejemplo de uso:
-- SELECT create_admin_profile('admin@example.com');

-- Script directo para asignar admin (reemplaza 'admin@example.com' con el email real)
/*
DO $$
DECLARE
    admin_email TEXT := 'admin@example.com'; -- CAMBIAR POR EL EMAIL REAL
    result TEXT;
BEGIN
    SELECT create_admin_profile(admin_email) INTO result;
    RAISE NOTICE '%', result;
END $$;
*/

-- Verificar usuarios administradores
SELECT 
    up.user_type,
    up.first_name,
    up.last_name,
    up.status,
    au.email,
    up.created_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE up.user_type = 'admin'
ORDER BY up.created_at DESC;

-- Verificar usuarios autenticados sin perfil
SELECT 
    au.id,
    au.email,
    au.created_at,
    'Sin perfil' as status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC;