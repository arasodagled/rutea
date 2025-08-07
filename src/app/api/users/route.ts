import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    console.log('=== API /users called ===')
    console.log('Environment check:')
    console.log('- SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('- SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const cookieStore = await cookies()
    
    // Use service role key to bypass RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    console.log('Supabase client created successfully')

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('Auth check - User:', !!user, 'Error:', userError)
    
    if (userError || !user) {
      console.log('Authentication failed:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching pending invitations...')
    // Get pending invitations (no RLS restrictions)
    const { data: pendingInvitations, error: invitationsError } = await supabase
      .from('user_invitations')
      .select(`
        id,
        email,
        first_name,
        last_name,
        created_at,
        expires_at,
        status,
        invited_by
      `)
      .eq('status', 'pending')

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }
    console.log('Pending invitations fetched:', pendingInvitations?.length || 0)

    console.log('Fetching active users...')
    // Get active users
    const { data: activeUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        user_type,
        status,
        created_at,
        updated_at
      `)
      .eq('status', 'active')
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
    console.log('Active users fetched:', activeUsers?.length || 0)
    
    console.log('Fetching auth users for emails...')
    // Get emails for active users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return NextResponse.json({ error: 'Failed to fetch user emails' }, { status: 500 })
    }
    console.log('Auth users fetched:', authUsers?.users?.length || 0)
    
    // Create a map of user_id to email
    const emailMap = new Map()
    if (authUsers?.users) {
      authUsers.users.forEach(authUser => {
        emailMap.set(authUser.id, authUser.email)
      })
    }
    
    // Transform data for unified response
    const pendingUsers = pendingInvitations?.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      full_name: `${invitation.first_name} ${invitation.last_name}`.trim() || null,
      status: 'pending' as const,
      is_admin: false,
      created_at: invitation.created_at, // Use created_at instead of invited_at
      updated_at: invitation.created_at, // Use created_at instead of invited_at
      expires_at: invitation.expires_at,
      invited_by: invitation.invited_by ? { id: invitation.invited_by } : null,
      type: 'invitation' as const
    })) || []
    
    const users = activeUsers?.map(user => ({
      id: user.id,
      user_id: user.user_id,  // Add this line
      email: emailMap.get(user.user_id) || '',
      full_name: `${user.first_name} ${user.last_name}`.trim() || null,
      status: user.status,
      is_admin: user.user_type === 'admin',
      created_at: user.created_at,
      updated_at: user.updated_at,
      expires_at: null,
      invited_by: null,
      type: 'user' as const
    })) || []

    // Combine and sort by creation date (newest first)
    const allUsers = [...pendingUsers, ...users]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const summary = {
      total: allUsers.length,
      pending: pendingUsers.length,
      active: users.length
    }

    return NextResponse.json({ users: allUsers, summary })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}