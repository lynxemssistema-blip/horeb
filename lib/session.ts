import { cookies } from "next/headers";
import { cache } from "react";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
  originalRole?: string;
  tenantId: string;
  tenantSlug: string;
}

export type AppRole =
  | "SUPERADMIN"
  | "ADMIN"
  | "PASTOR"
  | "SECRETARIA"
  | "FINANCIAL"
  | "LEADER"
  | "KIDS"
  | "PORTEIRO"
  | "MEMBER"
  | (string & {});

const SESSION_COOKIE_NAME = "horeb_auth_session";
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString("hex");

function getSessionSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ASAAS_API_KEY ||
    process.env.ASAAS_API_KEY_B64 ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    EPHEMERAL_FALLBACK_SECRET
  );
}

function signPayload(base64Payload: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(base64Payload)
    .digest("base64url");
}

// Codificação segura em Base64 com assinatura HMAC-SHA256 para impedir falsificação de cookie
function encodeSessionCookie(data: SessionData): string {
  try {
    const base64Payload = Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
    const signature = signPayload(base64Payload);
    return `${base64Payload}.${signature}`;
  } catch {
    return "";
  }
}

function decodeSessionCookie(raw: string): { session: SessionData; isSigned: boolean } | null {
  try {
    let text = raw?.trim() || "";
    if (!text) return null;

    // Desfaz URL encoding se existir
    if (text.includes("%")) {
      try {
        text = decodeURIComponent(text);
      } catch {}
    }

    // Exige estritamente o formato assinado HMAC-SHA256: "<base64Payload>.<hmacSignature>"
    if (!text.includes(".")) {
      return null;
    }

    const lastDotIdx = text.lastIndexOf(".");
    const payloadPart = text.slice(0, lastDotIdx);
    const sigPart = text.slice(lastDotIdx + 1);
    if (!payloadPart || !sigPart) return null;

    const expectedSig = signPayload(payloadPart);
    const sigBuf = Buffer.from(sigPart);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      const decoded = Buffer.from(payloadPart, "base64").toString("utf-8");
      if (decoded.startsWith("{")) {
        return { session: JSON.parse(decoded) as SessionData, isSigned: true };
      }
    }

    return null;
  } catch {
    return null;
  }
}

const VERIFIED_SESSION_TTL_MS = 15_000;
interface CachedVerifiedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  tenantId: string | null;
  tenantSlug: string | null;
  churchAccesses: Array<{ tenantId: string; role: string; tenantSlug: string }>;
  expiresAt: number;
}
const verifiedUserCache = new Map<string, CachedVerifiedUser>();

export function invalidateUserSessionCache(userId?: string) {
  if (userId) {
    verifiedUserCache.delete(userId);
  } else {
    verifiedUserCache.clear();
  }
}

export async function createSession(data: {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
  originalRole?: string;
  tenantId?: string | null;
  tenantSlug?: string | null;
}) {
  try {
    invalidateUserSessionCache(data.userId);
    const cookieStore = await cookies();
    const sessionData: SessionData = {
      userId: data.userId,
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl || null,
      role: data.role,
      originalRole: data.originalRole,
      tenantId: data.tenantId || "",
      tenantSlug: data.tenantSlug || "admin",
    };
    const encoded = encodeSessionCookie(sessionData);

    cookieStore.set(SESSION_COOKIE_NAME, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias de persistência
    });
  } catch {
    // Contexto de cookies() indisponível (ex: scripts ou testes isolados)
  }
}

const resolveRequestSession = cache(async (): Promise<SessionData | null> => {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;
    const parsed = decodeSessionCookie(cookie.value);
    if (!parsed || !parsed.isSigned || !parsed.session?.userId) return null;

    const session: SessionData = { ...parsed.session };
    const now = Date.now();
    let verified = verifiedUserCache.get(session.userId);

    if (!verified || verified.expiresAt <= now) {
      let dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          tenantId: true,
          tenant: { select: { id: true, slug: true } },
          churchAccesses: {
            select: {
              tenantId: true,
              role: true,
              tenant: { select: { slug: true } },
            },
          },
        },
      });

      // Seed de segurança exclusivamente para o SuperAdmin oficial em caso de banco recém-criado
      if (
        !dbUser &&
        session.role === "SUPERADMIN" &&
        session.email?.toLowerCase() === "edsonmanoel2012@gmail.com"
      ) {
        dbUser = await prisma.user.findUnique({
          where: { email: "edsonmanoel2012@gmail.com" },
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            role: true,
            tenantId: true,
            tenant: { select: { id: true, slug: true } },
            churchAccesses: {
              select: {
                tenantId: true,
                role: true,
                tenant: { select: { slug: true } },
              },
            },
          },
        });

        if (!dbUser) {
          dbUser = await prisma.user
            .create({
              data: {
                id: session.userId,
                name: session.name || "Edson Manoel",
                email: "edsonmanoel2012@gmail.com",
                password:
                  "$2b$10$cHivWfrCv7vM5NI0VC7HDO6jMQLSaixB7RGDjKohQFUO1dsfPz5z2",
                role: "SUPERADMIN",
                isEmailVerified: true,
                themePreference: "dark",
                themePalette: "prime",
              },
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                role: true,
                tenantId: true,
                tenant: { select: { id: true, slug: true } },
                churchAccesses: {
                  select: {
                    tenantId: true,
                    role: true,
                    tenant: { select: { slug: true } },
                  },
                },
              },
            })
            .catch(() => null);
        }
      }

      // Se o usuário foi removido do banco, invalida imediatamente a sessão (sem recriar conta)
      if (!dbUser) {
        verifiedUserCache.delete(session.userId);
        return null;
      }

      verified = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl || null,
        role: dbUser.role,
        tenantId: dbUser.tenantId || null,
        tenantSlug: dbUser.tenant?.slug || null,
        churchAccesses: dbUser.churchAccesses.map((ca) => ({
          tenantId: ca.tenantId,
          role: ca.role,
          tenantSlug: ca.tenant.slug,
        })),
        expiresAt: now + VERIFIED_SESSION_TTL_MS,
      };
      if (verifiedUserCache.size > 2000) {
        verifiedUserCache.clear();
      }
      verifiedUserCache.set(dbUser.id, verified);
    }

    session.userId = verified.id;
    session.email = verified.email;
    session.name = verified.name;
    session.avatarUrl = verified.avatarUrl;

    if (verified.role === "SUPERADMIN") {
      session.role = "SUPERADMIN";
    } else if (session.tenantSlug && session.tenantSlug !== "admin") {
      const explicitAccess = verified.churchAccesses.find(
        (ca) => ca.tenantSlug === session.tenantSlug || ca.tenantId === session.tenantId
      );
      if (verified.tenantSlug === session.tenantSlug && verified.tenantId) {
        session.tenantId = verified.tenantId;
        session.role = verified.role;
      } else if (explicitAccess) {
        session.tenantId = explicitAccess.tenantId;
        session.tenantSlug = explicitAccess.tenantSlug;
        session.role = explicitAccess.role;
      } else {
        // Mantém o papel real do usuário sem elevar privilégios
        session.role = verified.role;
        if (verified.tenantId && verified.tenantSlug) {
          session.tenantId = verified.tenantId;
          session.tenantSlug = verified.tenantSlug;
        }
      }
    } else {
      session.role = verified.role;
    }

    // Aplica o papel simulado se existir (exclusivamente para SUPERADMIN)
    if (session.role === "SUPERADMIN") {
      const simulatedRole = cookieStore.get("horeb_simulated_role")?.value;
      if (simulatedRole) {
        session.originalRole = "SUPERADMIN";
        session.role = simulatedRole;
      }
    }

    return session;
  } catch {
    return null;
  }
});

export async function getSession(): Promise<SessionData | null> {
  return resolveRequestSession();
}

export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (raw) {
      const parsed = decodeSessionCookie(raw);
      if (parsed?.session?.userId) {
        invalidateUserSessionCache(parsed.session.userId);
      }
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {}
}

export type AccessCheckResult =
  | {
      authorized: true;
      user: SessionData;
      effectiveRole: string;
      targetTenantId: string;
      targetTenantSlug: string;
    }
  | { authorized: false; reason: "NOT_LOGGED_IN" }
  | {
      authorized: false;
      reason: "NOT_MEMBER";
      user: SessionData;
      userChurchSlug: string;
      requestedChurchSlug: string;
    };

export async function checkChurchAccess(slug: string): Promise<AccessCheckResult> {
  const session = await getSession();

  if (!session) {
    return { authorized: false, reason: "NOT_LOGGED_IN" };
  }

  // Buscar congregação de destino somente leitura (sem auto-criar congregações fantasmas)
  const targetTenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  if (!targetTenant) {
    return {
      authorized: false,
      reason: "NOT_MEMBER",
      user: session,
      userChurchSlug: session.tenantSlug || "admin",
      requestedChurchSlug: slug,
    };
  }

  // Super Admin (Lynx EMS) tem acesso irrestrito a todas as congregações
  const isSuperAdmin = session.role === "SUPERADMIN" || session.originalRole === "SUPERADMIN";
  if (isSuperAdmin) {
    return {
      authorized: true,
      user: session,
      effectiveRole: "SUPERADMIN",
      targetTenantId: targetTenant.id,
      targetTenantSlug: targetTenant.slug,
    };
  }

  // Igreja de cadastro principal do usuário
  if (session.tenantSlug === slug) {
    return {
      authorized: true,
      user: session,
      effectiveRole: session.role,
      targetTenantId: targetTenant.id,
      targetTenantSlug: targetTenant.slug,
    };
  }

  // REGRA DE HIERARQUIA: Se o usuário é ADMIN ou PASTOR da Igreja Sede Matriz,
  // ele possui autorização executiva de acesso a todas as congregações filiais vinculadas
  if (
    (session.role === "ADMIN" || session.role === "PASTOR") &&
    targetTenant.parentId === session.tenantId
  ) {
    return {
      authorized: true,
      user: session,
      effectiveRole: session.role,
      targetTenantId: targetTenant.id,
      targetTenantSlug: targetTenant.slug,
    };
  }

  // Verificar na tabela de acessos multi-igreja explícita
  const access = await prisma.userChurchAccess.findUnique({
    where: {
      userId_tenantId: {
        userId: session.userId,
        tenantId: targetTenant.id,
      },
    },
  });

  if (access) {
    return {
      authorized: true,
      user: session,
      effectiveRole: access.role,
      targetTenantId: targetTenant.id,
      targetTenantSlug: targetTenant.slug,
    };
  }

  return {
    authorized: false,
    reason: "NOT_MEMBER",
    user: session,
    userChurchSlug: session.tenantSlug,
    requestedChurchSlug: slug,
  };
}

/**
 * Guarda Centralizada de Segurança para Server Actions & APIs (RBAC & Multi-Tenant Boundary)
 * Valida a sessão, a congregação e os papéis permitidos antes de tocar no banco de dados.
 */
export async function requirePermission(
  slug: string,
  allowedRoles: AppRole[],
  requiredMenu?: string
): Promise<
  | { authorized: true; user: SessionData; tenantId: string; role: AppRole }
  | { authorized: false; error: string; statusCode: 401 | 403 }
> {
  const access = await checkChurchAccess(slug);
  if (!access.authorized) {
    if (access.reason === "NOT_LOGGED_IN") {
      return {
        authorized: false,
        error: "Sessão expirada ou não autenticado. Faça login para continuar.",
        statusCode: 401,
      };
    }
    return {
      authorized: false,
      error: "Você não possui vínculo autorizado com esta congregação.",
      statusCode: 403,
    };
  }

  const role = access.effectiveRole as AppRole;
  if (role === "SUPERADMIN") {
    return {
      authorized: true,
      user: access.user,
      tenantId: access.targetTenantId,
      role,
    };
  }

  if (allowedRoles.includes(role)) {
    return {
      authorized: true,
      user: access.user,
      tenantId: access.targetTenantId,
      role,
    };
  }

  // Validação dinâmica por menu configurado no RBAC
  if (requiredMenu) {
    try {
      const perm = await prisma.rolePermission.findUnique({
        where: { role: access.effectiveRole },
      });
      if (perm) {
        const allowedMenus = JSON.parse(perm.menuItems || "[]") as string[];
        if (allowedMenus.includes("ALL") || allowedMenus.includes(requiredMenu)) {
          return {
            authorized: true,
            user: access.user,
            tenantId: access.targetTenantId,
            role,
          };
        }
      }
    } catch {}
  }

  return {
    authorized: false,
    error: `Seu perfil (${role}) não possui autorização para executar esta ação.`,
    statusCode: 403,
  };
}
