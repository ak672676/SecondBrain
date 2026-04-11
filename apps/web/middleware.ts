import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'sb-token';

export function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  // Protected routes — require auth cookie
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api/documents') ||
    pathname.startsWith('/api/chat');

  // Auth pages — redirect to dashboard if already logged in
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  if (isProtected && !token) {
    // API routes get a 401 JSON response; pages get redirected to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Edge middleware can only check cookie existence, not verify JWT
// (jsonwebtoken uses Node.js crypto which isn't available in edge runtime).
// Full JWT verification happens in API route handlers via getCurrentUser().
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/documents',
    '/api/documents/:path*',
    '/api/chat/:path*',
    '/login',
    '/register',
  ],
};
