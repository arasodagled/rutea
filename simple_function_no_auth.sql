-- Función simplificada sin verificación de permisos para MVP
-- Esta versión elimina completamente auth.uid() y verificaciones de seguridad

-- Eliminar la función existente para cambiar el tipo de retorno
DROP FUNCTION IF EXISTS get_user_profiles_with_emails CASCADE;

CREATE OR REPLACE FUNCTION get_user_profiles_with_emails()
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
  email VARCHAR(255)  -- Changed from TEXT to VARCHAR(255)
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
  ORDER BY up.created_at DESC;
END;
$$;

-- Verificar que la función se actualizó
SELECT 
    'Función actualizada:' as status,
    proname,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'get_user_profiles_with_emails';

-- Probar la función
SELECT 'Probando función simplificada...' as test;
SELECT COUNT(*) as total_users FROM get_user_profiles_with_emails();

-- Mostrar algunos usuarios de ejemplo
SELECT 
    email,
    user_type,
    status,
    first_name,
    last_name
FROM get_user_profiles_with_emails()
LIMIT 5;

-- Instrucciones finales
SELECT 
    'LISTO:' as estado,
    'La función ahora funciona sin verificaciones de permisos' as mensaje
UNION ALL
SELECT 
    'NOTA:' as estado,
    'Recarga la página /users en la aplicación para probar' as mensaje;