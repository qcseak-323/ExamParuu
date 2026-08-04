import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic auth redirect. In Next.js 16 this file is `proxy.ts` — what used
 * to be `middleware.ts`.
 *
 * This only checks that a session cookie is *present*. It deliberately does
 * not validate it: sessions live in Postgres, Prisma can't run here, and
 * Next's own guidance is that proxy is for optimistic checks rather than
 * authorization. The real check is `requireTrainer()` in each page, which
 * hits the database. This exists purely so a signed-out visitor gets an
 * instant redirect instead of rendering a gated route and bouncing.
 */

// Auth.js v5 prefixes the cookie with `__Secure-` when served over HTTPS.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

/** Everything a signed-out visitor is allowed to see. */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/login/check-email",
  "/legal/terms",
  "/legal/privacy",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Auth.js's own endpoints must stay reachable or sign-in can't complete.
  return pathname.startsWith("/api/auth");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some(
    (name) => request.cookies.get(name)?.value,
  );
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Skip Next's internals and static files; matching them would redirect the
  // very assets the login page needs to render.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
