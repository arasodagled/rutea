import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { resumen } = await req.json();
    
    // Get cookies and create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {
            // Cookie modifications are not allowed in Server Components
          },
          remove() {
            // Cookie modifications are not allowed in Server Components
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Save resumen to database
    const { data, error } = await supabase
      .from('resumenes')
      .insert({
        user_id: user.id,
        proposito: resumen.proposito,
        talentos_clave: resumen.talentos_clave,
        motivaciones: resumen.motivaciones,
        experiencia_destacada: resumen.experiencia_destacada,
        claridad_actual: resumen.claridad_actual,
        cambio_carrera: resumen.cambio_carrera,
        vision_1_ano: resumen.vision_1_ano,
        impacto_ejercicio: resumen.impacto_ejercicio,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving resumen:', error);
      return NextResponse.json({ error: 'Failed to save resumen' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in resumen API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}