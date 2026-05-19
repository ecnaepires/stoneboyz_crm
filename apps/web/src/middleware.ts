import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('better-auth.session_token');
  const isAuthPage = request.nextUrl.pathname.startsWith('/sign-');

  if (!sessionCookie && !isAuthPage) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL('/customers', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|portal|_next/static|_next/image|favicon.ico).*)'],
};
