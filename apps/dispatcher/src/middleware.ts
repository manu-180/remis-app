import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_SIZE_LIMIT = 4096;

function hasBloatedCookies(request: NextRequest): boolean {
  const cookieHeader = request.headers.get('cookie') ?? '';
  return cookieHeader.length > COOKIE_SIZE_LIMIT * 4;
}

function clearSupabaseCookies(response: NextResponse): NextResponse {
  response.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith('sb-')) {
      response.cookies.set(name, '', { maxAge: 0, path: '/' });
    }
  });
  return response;
}

export async function middleware(request: NextRequest) {
  // Guard against 431 — oversized Supabase JWT cookies in dev
  if (hasBloatedCookies(request)) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    clearSupabaseCookies(response);
    return response;
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    // Refreshes session — side effect: sets updated session cookies
    await supabase.auth.getUser();
  } catch {
    // Session refresh failed — clear cookies and continue unauthenticated
    clearSupabaseCookies(response);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
