import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SENSITIVE_PATH_REGEX =
  /(?:^|\/)(?:\.env(?:\..+)?|\.git(?:\/|$)|prisma(?:\/|$)|.*\.(?:db|sqlite|sqlite3|db-wal|db-shm|db-journal|sql|bak|pem|key))$/i;

const RESERVED_ROOT_SEGMENTS = new Set([
  "admin",
  "api",
  "activate",
  "ebooks",
  "select-church",
  "_next",
]);

function getConfiguredSessionSecret(): string | null {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ASAAS_API_KEY ||
    process.env.ASAAS_API_KEY_B64 ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

async function verifyAndParseSignedCookie(rawValue?: string): Promise<any | null> {
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
    if (!payloadPart || sigPart.length < 32) return null;

    const secret = getConfiguredSessionSecret();
    if (secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sigBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(payloadPart)
      );
      const bytes = new Uint8Array(sigBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const expectedSig = btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      if (sigPart.length !== expectedSig.length) return null;
      let diff = 0;
      for (let i = 0; i < sigPart.length; i++) {
        diff |= sigPart.charCodeAt(i) ^ expectedSig.charCodeAt(i);
      }
      if (diff !== 0) return null;
    } else if (process.env.NODE_ENV === "production") {
      return null;
    }

    const rawBinary = atob(payloadPart);
    const utf8Bytes = new Uint8Array(rawBinary.length);
    for (let i = 0; i < rawBinary.length; i++) {
      utf8Bytes[i] = rawBinary.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(utf8Bytes);
    if (decoded.startsWith("{")) {
      return JSON.parse(decoded);
    }
    return null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 0. Bloqueio estrito de arquivos internos de banco de dados / segredos na borda HTTP
  if (SENSITIVE_PATH_REGEX.test(pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const sessionCookie = request.cookies.get("horeb_auth_session");
  const session = await verifyAndParseSignedCookie(sessionCookie?.value);

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

  // 1b. Proteção de Perímetro para áreas administrativas de congregação (/[slug]/admin e /[slug]/configuracoes)
  const pathParts = pathname.split("/").filter(Boolean);
  if (
    pathParts.length >= 2 &&
    !RESERVED_ROOT_SEGMENTS.has(pathParts[0].toLowerCase()) &&
    (pathParts[1] === "admin" || pathParts[1] === "configuracoes")
  ) {
    if (!session?.userId) {
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
    "/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|eot|map|mp4|webm)$|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
