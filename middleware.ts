import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Intercepta o acesso à raiz "/" para redirecionar instantaneamente usuários conectados
  if (pathname === "/") {
    const hasAuthParam = searchParams.has("auth");
    const hasSwitchParam = searchParams.has("switch") || searchParams.has("select");
    const hasLogoutParam = searchParams.has("logout");

    // Se o usuário não estiver executando uma troca de igreja ou login explícito
    if (!hasAuthParam && !hasSwitchParam && !hasLogoutParam) {
      const sessionCookie = request.cookies.get("horeb_auth_session");
      if (sessionCookie?.value) {
        try {
          const session = JSON.parse(decodeURIComponent(sessionCookie.value));
          if (session && session.tenantSlug) {
            if (session.role === "SUPERADMIN") {
              return NextResponse.redirect(new URL("/admin", request.url));
            }
            return NextResponse.redirect(new URL(`/${session.tenantSlug}`, request.url));
          }
        } catch {
          // Em caso de falha de decodificação do cookie, segue para a página normalmente
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
