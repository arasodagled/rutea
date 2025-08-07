-- Script simple para hacer administrador a un usuario específico
-- Reemplaza 'usuario@email.com' con el email real del usuario

-- PASO 1: Reemplaza este email con el email del usuario que quieres hacer admin
DO $$
DECLARE
    user_email TEXT := 'saradelgado95@gmail.com'; -- Email del usuario a hacer admin
    target_user_id UUID;
    profile_exists BOOLEAN := FALSE;
BEGIN
    -- Buscar el ID del usuario por email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    -- Verificar si el usuario existe
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con email % no encontrado', user_email;
    END IF;
    
    -- Verificar si ya tiene perfil
    SELECT EXISTS(
        SELECT 1 FROM user_profiles WHERE user_id = target_user_id
    ) INTO profile_exists;
    
    IF profile_exists THEN
        -- Si ya tiene perfil, actualizar a admin
        UPDATE user_profiles
        SET user_type = 'admin',
            status = 'active',
            updated_at = NOW()
        WHERE user_id = target_user_id;
        
        RAISE NOTICE 'Usuario % actualizado a administrador', user_email;
    ELSE
        -- Si no tiene perfil, crear uno nuevo como admin
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
        
        RAISE NOTICE 'Perfil de administrador creado para %', user_email;
    END IF;
END $$;

-- PASO 2: Verificar que el usuario ahora es admin
SELECT 
    au.email,
    up.user_type,
    up.status,
    up.created_at,
    up.updated_at
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
WHERE au.email = 'saradelgado95@gmail.com' -- Email del usuario admin
AND up.user_type = 'admin';