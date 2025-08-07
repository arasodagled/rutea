import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  let error = null;
  let authResult = null;

  if (token_hash && type) {
    // Handle different token types
    if (type === 'invite') {
      // For invitations, redirect without verification
      return NextResponse.redirect(`${origin}/accept-invitation?token_hash=${token_hash}&type=${type}`);
    } else if (type === 'recovery') {
      // For password recovery, redirect to reset page with token
      // The reset page will handle verification when user submits new password
      return NextResponse.redirect(`${origin}/reset-password?token_hash=${token_hash}&type=${type}`);
    } else {
      // Handle other types (signup confirmation, etc.)
      authResult = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });
      error = authResult.error;
    }
  } else if (code) {
    // Handle OAuth callback with code
    authResult = await supabase.auth.exchangeCodeForSession(code);
    error = authResult.error;
  } else {
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=Invalid authentication link`);
  }

  if (!error && (authResult?.data?.session)) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${error?.message || 'Authentication failed'}`);
}