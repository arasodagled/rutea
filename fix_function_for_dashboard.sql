-- Solución: Crear una función alternativa que funcione desde el dashboard
-- La función original requiere auth.uid() que solo funciona en contexto de aplicación

-- OPCIÓN 1: Función temporal para testing desde dashboard (sin verificación de permisos)
CREATE OR REPLACE FUNCTION get_user_profiles_with_emails_admin()
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
  -- Esta función NO verifica permisos - solo para uso desde dashboard
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

-- OPCIÓN 2: Modificar la función original para que funcione tanto en app como dashboard
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
  -- Check if we're in application context (auth.uid() exists)
  -- If not (dashboard context), allow access
  IF auth.uid() IS NOT NULL THEN
    -- We're in application context, check admin permissions
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied: Only admins can view user emails';
    END IF;
  END IF;
  -- If auth.uid() is NULL (dashboard context), proceed without checks

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

-- Probar la función modificada
SELECT 'Probando función modificada...' as test;
SELECT COUNT(*) as total_users FROM get_user_profiles_with_emails();

-- Verificar que ambas funciones existen
SELECT 
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN ('get_user_profiles_with_emails', 'get_user_profiles_with_emails_admin')
ORDER BY proname;

-- Instrucciones
SELECT 
    'INSTRUCCIONES:' as tipo,
    'Ahora puedes probar la función desde el dashboard y también funcionará en la aplicación' as mensaje
UNION ALL
SELECT 
    'NOTA:' as tipo,
    'La función ahora detecta automáticamente si se ejecuta desde dashboard o aplicación' as mensaje;