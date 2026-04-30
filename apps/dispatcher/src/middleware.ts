import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Node.js default max header size is 16KB total. Supabase JWTs in cookies
// can easily hit 8–12KB. We clear and redirect well before Node rejects with 431.
const COOKIE_BLOAT_THRESHOLD = 6144; // 6KB

const PROTECTED_PREFIXES = ['/admin', '/dispatch'];

function hasBloatedCookies(request: NextRequest): boolean {
  const cookieHeader = request.headers.get('cookie') ?? '';
  return cookieHeader.length > COOKIE_BLOAT_THRESHOLD;
}

function clearSupabaseCookies(response: NextResponse): NextResponse {
  response.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith('sb-')) {
      response.cookies.set(name, '', { maxAge: 0, path: '/' });
    }
  });
  return response;
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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

  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    clearSupabaseCookies(response);
  }

  // Belt-and-suspenders: las rutas protegidas también son chequeadas en server components
  // via requireRole(...), pero acá cortamos antes de que se renderice nada del layout admin.
  if (!userId && isProtected(request.nextUrl.pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
