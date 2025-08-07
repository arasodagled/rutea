import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, firstName, lastName, userType = 'user' } = await request.json();

    // Validate input
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
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

    // Create admin client for user creation
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

    // Check if user already exists in auth.users using listUsers
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Adjust as needed
    });
    
    const userExists = existingUsers.users?.some(user => 
      user.email?.toLowerCase() === email.toLowerCase()
    );
    
    if (userExists) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create the user immediately with pending status
    const { data: newUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: false, // User will confirm when accepting invitation
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        user_type: userType,
        invited_by: currentUser.id
      }
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create user profile immediately with pending status
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: newUser.user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        user_type: userType,
        status: 'pending',
        is_first_login: true
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Clean up the created user
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Create invitation record for tracking
    // Remove the immediate user creation - let Supabase handle it
    // Comment out or remove this section:
    /*
    const { data: newUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: false,
      user_metadata: { ... }
    });
    */

    // Just create the invitation record
    const { error: invitationError } = await supabase
      .from('user_invitations')
      .insert({
        email: email.toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        invited_by: currentUser.id,
        status: 'pending'
      });

    if (invitationError) {
      console.error('Error creating invitation record:', invitationError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Send invitation email - this will create the user when they accept
    const { error: emailError } = await adminSupabase.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/accept-invitation`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          user_type: userType
        }
      }
    );

    if (emailError) {
      console.error('Error sending invitation email:', emailError);
      return NextResponse.json({
        success: true,
        warning: 'User created but invitation email could not be sent. Please contact the user directly.'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'User created and invitation sent successfully!'
    });

  } catch (error) {
    console.error('Error in invite-user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}