-- Create resumenes table
CREATE TABLE IF NOT EXISTS resumenes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposito TEXT,
  talentos_clave TEXT[] DEFAULT '{}',
  motivaciones TEXT[] DEFAULT '{}',
  experiencia_destacada TEXT,
  claridad_actual TEXT,
  cambio_carrera TEXT,
  vision_1_ano JSONB DEFAULT '{}',
  impacto_ejercicio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE resumenes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own resumenes
CREATE POLICY "Users can view own resumenes" ON resumenes
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own resumenes
CREATE POLICY "Users can insert own resumenes" ON resumenes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own resumenes
CREATE POLICY "Users can update own resumenes" ON resumenes
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own resumenes
CREATE POLICY "Users can delete own resumenes" ON resumenes
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_resumenes_user_id ON resumenes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumenes_created_at ON resumenes(created_at);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_resumenes_updated_at
    BEFORE UPDATE ON resumenes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();