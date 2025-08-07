import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    );

    // Get current user
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      return NextResponse.json({
        error: 'Auth error',
        details: userError.message,
        user: null,
        profile: null
      });
    }

    if (!currentUser) {
      return NextResponse.json({
        error: 'No authenticated user',
        user: null,
        profile: null
      });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    return NextResponse.json({
      user: {
        id: currentUser.id,
        email: currentUser.email,
        created_at: currentUser.created_at
      },
      profile: userProfile,
      profileError: profileError?.message || null,
      isAdmin: userProfile?.user_type === 'admin'
    });

  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}