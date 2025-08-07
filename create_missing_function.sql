-- La función get_user_profiles_with_emails no existe en la base de datos
-- Este script la creará

-- Crear la función get_user_profiles_with_emails
CREATE OR REPLACE FUNCTION get_user_profiles_with_emails()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  user_type TEXT,
  status TEXT,
  linkedin_url TEXT,
  cv_file_path TEXT,
  cv_file_name TEXT,
  is_first_login BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can view user emails';
  END IF;

  -- Return user profiles with emails
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.first_name,
    up.last_name,
    up.role,
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

-- Verificar que la función se creó correctamente
SELECT 
    'Función creada:' as status,
    proname,
    prorettype::regtype as return_type,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'get_user_profiles_with_emails';

-- Probar la función (solo funcionará si el usuario actual es admin)
SELECT 'Probando función...' as test;
-- SELECT COUNT(*) as total_users FROM get_user_profiles_with_emails();

-- Instrucciones finales
SELECT 
    'INSTRUCCIONES:' as tipo,
    'Después de ejecutar este script, recarga la página /users en la aplicación' as mensaje;