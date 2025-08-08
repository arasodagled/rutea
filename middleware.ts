import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if this is an auth-related request with token_hash
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('token_hash')) {
    const type = request.nextUrl.searchParams.get('type');
    const token_hash = request.nextUrl.searchParams.get('token_hash');
    
    // Redirect to the auth callback route with parameters
    const redirectUrl = new URL(`/auth/callback?token_hash=${token_hash}&type=${type}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Original root redirect for non-auth requests
  if (request.nextUrl.pathname === '/') {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Add debug header to all other requests
  const response = NextResponse.next();
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