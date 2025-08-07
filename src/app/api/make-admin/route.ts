import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
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
    
    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    if (existingProfile) {
      // Update existing profile to admin
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          user_type: 'admin',
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update profile', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Profile updated to admin successfully',
        profile: { ...existingProfile, user_type: 'admin', status: 'active' }
      });
    } else {
      // Create new admin profile
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: currentUser.id,
          first_name: '',
          last_name: '',
          user_type: 'admin',
          status: 'active',
          is_first_login: false
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to create admin profile', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Admin profile created successfully',
        profile: newProfile
      });
    }

  } catch (error) {
    console.error('Make admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}