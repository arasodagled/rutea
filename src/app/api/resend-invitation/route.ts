import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { invitationId, email } = await request.json();

    // Validate input
    if (!invitationId || !email) {
      return NextResponse.json(
        { error: 'Invitation ID and email are required' },
        { status: 400 }
      );
    }

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
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if current user is admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', currentUser.id)
      .single();

    if (!userProfile || userProfile.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or already accepted' },
        { status: 404 }
      );
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 400 }
      );
    }

    // Create admin client for sending invitation
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return []; },
          setAll() { /* No-op */ },
        },
      }
    );

    // Check if user already exists in auth.users
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    const existingUser = existingUsers.users?.find(user => 
      user.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // Delete the existing user first to allow resending invitation
      const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(
        existingUser.id
      );
      
      if (deleteError) {
        console.error('Error deleting existing user:', deleteError);
        return NextResponse.json(
          { error: 'Failed to prepare user for invitation resend' },
          { status: 500 }
        );
      }
    }

    // Send fresh invitation email (works for both new and recreated users)
    const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/accept-invitation`,
        data: {
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          user_type: 'user'
        }
      }
    );

    if (inviteError) {
      console.error('Error resending invitation email:', inviteError);
      return NextResponse.json(
        { error: 'Failed to resend invitation email: ' + inviteError.message },
        { status: 500 }
      );
    }

    // Update invitation record with new timestamp
    const { error: updateError } = await supabase
      .from('user_invitations')
      .update({ 
        updated_at: new Date().toISOString(),
        // Optionally extend expiration date
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Error updating invitation record:', updateError);
      // Don't fail the request if update fails, email was sent successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully!'
    });

  } catch (error) {
    console.error('Error in resend-invitation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}