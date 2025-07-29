import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  // Debug: Log all URL parameters to understand what's being received
  console.log('=== AUTH CALLBACK DEBUG ===');
  console.log('Full URL:', request.url);
  console.log('All search params:');
  for (const [key, value] of searchParams.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  console.log('Code parameter:', code);
  console.log('Token hash parameter:', token_hash);
  console.log('Type parameter:', type);
  console.log('==========================');

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
     // Handle email verification with token_hash and type (newer flow)
     console.log('Using verifyOtp with token_hash and type');
     authResult = await supabase.auth.verifyOtp({
       type,
       token_hash,
     });
     error = authResult.error;
     console.log('VerifyOtp result:', { error: authResult.error, user: authResult.data?.user?.id, session: !!authResult.data?.session });
  } else if (code) {
    // Handle OAuth callback with code (older flow)
    console.log('Using exchangeCodeForSession with code');
    authResult = await supabase.auth.exchangeCodeForSession(code);
    error = authResult.error;
    console.log('ExchangeCodeForSession result:', { error: authResult.error, user: authResult.data?.user?.id, session: !!authResult.data?.session });
  } else {
    console.log('No authentication parameters found - this means the email link is not properly formatted');
    console.log('Expected: either (token_hash + type) OR (code)');
    console.log('This suggests the Supabase email template needs to be updated');
  }

  // Check current session state
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('Current session after auth attempt:', { 
    hasSession: !!session, 
    userId: session?.user?.id, 
    sessionError 
  });

  if (!error && (authResult?.data?.session || session)) {
    console.log('Authentication successful, redirecting to:', `${origin}${next}`);
    return NextResponse.redirect(`${origin}${next}`);
  } else {
    console.log('Authentication failed:', { error, hasAuthResult: !!authResult, hasSession: !!session });
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}