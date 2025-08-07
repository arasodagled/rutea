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
    const { password, token } = await request.json();
    
    if (!password || !token) {
      return NextResponse.json(
        { error: 'Password and token are required' },
        { status: 400 }
      );
    }
    
    // Verify the invitation token first
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'invite'
    });
    
    if (verifyError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      );
    }
    
    // Use admin client to update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    );
    
    if (updateError) {
      console.error('Admin password update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }
    
    // Update user profile status
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ 
        status: 'active',
        is_first_login: true
      })
      .eq('user_id', user.id);
    
    if (profileError) {
      console.error('Profile update failed:', profileError);
      // Don't fail the whole operation for this
    }
    
    // Update invitation status
    const { error: inviteError } = await supabaseAdmin
      .from('user_invitations')
      .update({ status: 'accepted' })
      .eq('email', user.email);
    
    if (inviteError) {
      console.error('Invitation update failed:', inviteError);
      // Don't fail the whole operation for this
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Set invitation password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}