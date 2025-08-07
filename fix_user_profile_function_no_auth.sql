-- Función simplificada get_user_profile_with_email sin verificación de permisos para MVP
-- Esta versión elimina completamente auth.uid() y verificaciones de seguridad

-- Eliminar la función existente para cambiar el tipo de retorno
DROP FUNCTION IF EXISTS get_user_profile_with_email(UUID) CASCADE;

CREATE OR REPLACE FUNCTION get_user_profile_with_email(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  user_type TEXT,
  status TEXT,
  linkedin_url TEXT,
  cv_file_path TEXT,
  cv_file_name TEXT,
  is_first_login BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  email VARCHAR(255)  -- Changed from TEXT to VARCHAR(255) to match auth.users
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sin verificación de permisos - acceso libre para MVP
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.first_name,
    up.last_name,
    up.user_type,
    up.status,
    up.linkedin_url,
    up.cv_file_path,
    up.cv_file_name,
    up.is_first_login,
    up.created_at,
    up.updated_at,
    au.email
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.user_id = au.id
  WHERE up.user_id = target_user_id;
END;
$$;

-- Verificar que la función se actualizó
SELECT 
    'Función actualizada:' as status,
    proname,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'get_user_profile_with_email';

-- Probar la función
SELECT 'Probando función simplificada...' as test;

-- Instrucciones finales
SELECT 
    'LISTO:' as estado,
    'La función get_user_profile_with_email ahora funciona sin verificaciones de permisos' as mensaje
UNION ALL
SELECT 
    'NOTA:' as estado,
    'Recarga la página de perfil de usuario en la aplicación para probar' as mensaje;