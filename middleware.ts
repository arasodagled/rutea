import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Simple test: always redirect root to login for now
  if (request.nextUrl.pathname === '/') {
    const redirectUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set('X-Debug-Middleware', 'redirecting-to-login');
    return response;
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