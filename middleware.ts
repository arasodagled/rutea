import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Check if this is an auth-related request with token_hash
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('token_hash')) {
    const type = request.nextUrl.searchParams.get('type');
    const token_hash = request.nextUrl.searchParams.get('token_hash');
    
    // Redirect to the auth callback route with parameters
    const redirectUrl = new URL(`/auth/callback?token_hash=${token_hash}&type=${type}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // List of public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/reset-password',
    '/auth/callback',
    '/auth/auth-code-error',
    '/accept-invitation'
  ];
  
  // Check if the current path is a public path
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith(`${path}/`)
  );
  
  // If it's a public path, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Direct check for auth cookies - faster than creating Supabase client
  const hasAccessToken = request.cookies.has('sb-access-token');
  const hasRefreshToken = request.cookies.has('sb-refresh-token');
  
  // If no auth cookies are present, redirect to login immediately
  if (!hasAccessToken && !hasRefreshToken) {
    console.log('No auth cookies found, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // For all other paths, proceed with Supabase client for session verification
  const response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  const { data: { session } } = await supabase.auth.getSession();
  
  // If user is not authenticated and trying to access a protected route, redirect to login
  if (!session) {
    console.log('No valid session found, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Original root redirect for non-auth requests
  if (request.nextUrl.pathname === '/') {
    // If we have a session, redirect to chat-onboarding instead of login
    const redirectUrl = new URL('/chat-onboarding', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Add debug header to all other requests
  response.headers.set('X-Debug-Middleware', `processed-${request.nextUrl.pathname}`);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|api).*)',
  ],
};