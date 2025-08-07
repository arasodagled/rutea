import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find the user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Failed to list users:', listError);
      return NextResponse.json(
        { error: 'Failed to find user' },
        { status: 500 }
      );
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    );
    
    if (updateError) {
      console.error('Password update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to set password: ' + updateError.message },
        { status: 500 }
      );
    }
    
    // Create or update user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        email: user.email,
        status: 'active',
        is_first_login: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (profileError) {
      console.error('Profile creation failed:', profileError);
      // Don't fail the entire process for profile errors
    }
    
    // If you have a user_invitations table, mark the invitation as accepted
    try {
      await supabaseAdmin
        .from('user_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('email', user.email)
        .eq('status', 'pending');
    } catch (inviteUpdateError) {
      console.log('Note: Could not update user_invitations table:', inviteUpdateError);
    }
    
    return NextResponse.json({ 
      success: true,
      email: user.email,
      user_id: user.id
    });
    
  } catch (error) {
    console.error('Complete invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to complete invitation: ' + (error as Error).message },
      { status: 500 }
    );
  }
}