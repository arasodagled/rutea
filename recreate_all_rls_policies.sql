-- Script completo para recrear todas las políticas RLS
-- Ejecutar después de eliminar todas las políticas existentes

-- =============================================
-- POLÍTICAS PARA user_profiles
-- =============================================

-- Habilitar RLS en user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 1. Política para ver perfiles (usuarios pueden ver todos los perfiles)
CREATE POLICY "Users can view profiles" ON user_profiles
  FOR SELECT
  USING (true);

-- 2. Política para insertar perfiles (permite creación libre para registro)
CREATE POLICY "Allow profile creation" ON user_profiles
  FOR INSERT
  WITH CHECK (true);

-- 3. Política para actualizar perfiles (usuarios pueden actualizar su propio perfil)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Política para eliminar perfiles (solo admins pueden eliminar)
CREATE POLICY "Admins can delete profiles" ON user_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- =============================================
-- POLÍTICAS PARA user_invitations
-- =============================================

-- Habilitar RLS en user_invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- 1. Política para ver invitaciones (solo admins pueden ver todas)
CREATE POLICY "Admins can view all invitations" ON user_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- 2. Política para crear invitaciones (solo admins pueden crear)
CREATE POLICY "Admins can create invitations" ON user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- 3. Política para actualizar invitaciones (solo admins pueden actualizar)
CREATE POLICY "Admins can update invitations" ON user_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- 4. Política para eliminar invitaciones (solo admins pueden eliminar)
CREATE POLICY "Admins can delete invitations" ON user_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.user_type = 'admin'
    )
  );

-- =============================================
-- POLÍTICAS PARA resumenes
-- =============================================

-- Habilitar RLS en resumenes
ALTER TABLE resumenes ENABLE ROW LEVEL SECURITY;

-- 1. Política para ver resúmenes (usuarios pueden ver sus propios resúmenes)
CREATE POLICY "Users can view own resumenes" ON resumenes
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Política para crear resúmenes (usuarios pueden crear sus propios resúmenes)
CREATE POLICY "Users can create own resumenes" ON resumenes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Política para actualizar resúmenes (usuarios pueden actualizar sus propios resúmenes)
CREATE POLICY "Users can update own resumenes" ON resumenes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Política para eliminar resúmenes (usuarios pueden eliminar sus propios resúmenes)
CREATE POLICY "Users can delete own resumenes" ON resumenes
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- VERIFICACIÓN DE POLÍTICAS CREADAS
-- =============================================

-- Verificar políticas de user_profiles
SELECT 'user_profiles policies:' as table_name;
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- Verificar políticas de user_invitations
SELECT 'user_invitations policies:' as table_name;
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_invitations'
ORDER BY cmd, policyname;

-- Verificar políticas de resumenes
SELECT 'resumenes policies:' as table_name;
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'resumenes'
ORDER BY cmd, policyname;

SELECT 'Todas las políticas RLS han sido recreadas correctamente.' as status;