import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function parseSignedCookiePayload(rawValue?: string): any | null {
  if (!rawValue) return null;
  try {
    let text = rawValue.trim();
    if (text.includes("%")) {
      try {
        text = decodeURIComponent(text);
      } catch {}
    }
    // Exige estrutura assinada "<base64Payload>.<hmacSignature>"
    if (!text.includes(".")) return null;
    const lastDotIdx = text.lastIndexOf(".");
    const payloadPart = text.slice(0, lastDotIdx);
    const sigPart = text.slice(lastDotIdx + 1);
    if (!payloadPart || sigPart.length < 16) return null;

    const decoded = atob(payloadPart);
    if (decoded.startsWith("{")) {
      return JSON.parse(decoded);
    }
    return null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const sessionCookie = request.cookies.get("horeb_auth_session");
  const session = parseSignedCookiePayload(sessionCookie?.value);

  // 1. Proteção de Perímetro no Painel Global Super Admin (/admin)
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isSuperAdmin =
      session &&
      (session.role === "SUPERADMIN" || session.originalRole === "SUPERADMIN");
    if (!isSuperAdmin) {
      const loginUrl = new URL("/?auth=login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Intercepta o acesso à raiz "/" para redirecionar instantaneamente usuários conectados
  if (pathname === "/") {
    const hasAuthParam = searchParams.has("auth");
    const hasSwitchParam =
      searchParams.has("switch") || searchParams.has("select");
    const hasLogoutParam = searchParams.has("logout");
    const hasHomeParam = searchParams.has("home");

    if (
      !hasAuthParam &&
      !hasSwitchParam &&
      !hasLogoutParam &&
      !hasHomeParam &&
      session?.tenantSlug
    ) {
      if (session.role !== "SUPERADMIN") {
        return NextResponse.redirect(
          new URL(`/${session.tenantSlug}`, request.url)
        );
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.[\\w]+$|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
