import { cookies } from "next/headers";
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

// Codificação segura em Base64 para garantir total compatibilidade com RFC 6265 no Safari (iOS / macOS)
function encodeSessionCookie(data: SessionData): string {
  try {
    return Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
  } catch {
    return encodeURIComponent(JSON.stringify(data));
  }
}

function decodeSessionCookie(raw: string): SessionData | null {
  try {
    let text = raw?.trim() || "";
    if (!text) return null;

    // Desfaz URL encoding se existir
    if (text.includes("%")) {
      try {
        text = decodeURIComponent(text);
      } catch {}
    }

    // Se começar com '{', é JSON legado em texto puro
    if (text.startsWith("{")) {
      return JSON.parse(text) as SessionData;
    }

    // Decodifica Base64 seguro
    const decoded = Buffer.from(text, "base64").toString("utf-8");
    if (decoded.startsWith("{")) {
      return JSON.parse(decoded) as SessionData;
    }

    return null;
  } catch {
    return null;
  }
}

export async function createSession(data: SessionData) {
  try {
    const cookieStore = await cookies();
    const encoded = encodeSessionCookie(data);

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

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;
    const session = decodeSessionCookie(cookie.value);
    if (!session) return null;

    // Aplica o papel simulado se existir (para testes e superadmin)
    if (session.role === "SUPERADMIN") {
      const simulatedRole = cookieStore.get("horeb_simulated_role")?.value;
      if (simulatedRole) {
        session.originalRole = "SUPERADMIN"; // guarda o original
        session.role = simulatedRole; // injeta o simulado para a aplicação
      }
    }

    return session;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
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

  // Buscar congregação de destino para validar existência e metadados
  const targetTenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  if (!targetTenant) {
    return { authorized: false, reason: "NOT_LOGGED_IN" };
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
