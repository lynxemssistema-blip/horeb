import { cookies } from "next/headers";
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

function getSessionSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ASAAS_API_KEY ||
    "horeb-lynx-ems-hmac-secret-2026-v1"
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

    // 1. Verificar formato assinado: "<base64Payload>.<hmacSignature>"
    if (text.includes(".")) {
      const lastDotIdx = text.lastIndexOf(".");
      const payloadPart = text.slice(0, lastDotIdx);
      const sigPart = text.slice(lastDotIdx + 1);
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
    }

    // 2. Fallback para cookies legados sem assinatura (serão validados contra o banco em getSession)
    if (text.startsWith("{")) {
      return { session: JSON.parse(text) as SessionData, isSigned: false };
    }

    const decoded = Buffer.from(text, "base64").toString("utf-8");
    if (decoded.startsWith("{")) {
      return { session: JSON.parse(decoded) as SessionData, isSigned: false };
    }

    return null;
  } catch {
    return null;
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

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;
    const parsed = decodeSessionCookie(cookie.value);
    if (!parsed || !parsed.session?.userId) return null;

    let session = parsed.session;

    // Se for um cookie legado sem assinatura HMAC, valida estritamente no banco de dados contra falsificação
    if (!parsed.isSigned) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          tenantId: true,
          tenant: { select: { slug: true } },
        },
      });
      if (!dbUser || dbUser.email.toLowerCase() !== session.email?.toLowerCase()) {
        return null;
      }
      session = {
        userId: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
        role: dbUser.role,
        tenantId: dbUser.tenantId || session.tenantId || "",
        tenantSlug: dbUser.tenant?.slug || session.tenantSlug || "admin",
      };
    } else if (session.tenantSlug && session.tenantSlug !== "admin") {
      // Auto-recuperação transparente caso o banco SQLite do container tenha sido recriado
      try {
        const existingTenant = await prisma.tenant.findUnique({
          where: { slug: session.tenantSlug },
          select: { id: true, slug: true },
        });
        if (!existingTenant) {
          const recoveredTenantId = session.tenantId || `tenant-${session.tenantSlug}`;
          const formattedName =
            session.tenantSlug.charAt(0).toUpperCase() +
            session.tenantSlug.slice(1).replace(/-/g, " ");
          const trialExpiresAt = new Date();
          trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

          const createdTenant = await prisma.tenant.create({
            data: {
              id: recoveredTenantId,
              name: formattedName.toLowerCase().startsWith("igreja")
                ? formattedName
                : `Igreja ${formattedName}`,
              slug: session.tenantSlug,
              primaryColor: "#d97706",
              pastorName: session.name || `Pr. ${formattedName}`,
              plan: "PREMIUM",
              status: "TRIAL",
              monthlyPrice: 399,
              setupPrice: 1290,
              subscriptionExpiresAt: trialExpiresAt,
            },
          });

          session.tenantId = createdTenant.id;
        } else {
          session.tenantId = existingTenant.id;
        }

        // Garantir que o usuário da sessão também exista no banco local
        if (session.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: session.email.toLowerCase() },
            select: { id: true },
          });
          const userIdToUse = existingUser?.id || session.userId;
          if (!existingUser) {
            await prisma.user.create({
              data: {
                id: session.userId,
                name: session.name || "Administrador",
                email: session.email.toLowerCase(),
                role: session.role || "ADMIN",
                isEmailVerified: true,
                themePreference: "dark",
                themePalette: "prime",
                tenantId: session.tenantId,
              },
            });
          }
          await prisma.userChurchAccess.upsert({
            where: {
              userId_tenantId: {
                userId: userIdToUse,
                tenantId: session.tenantId,
              },
            },
            update: { role: session.role || "ADMIN" },
            create: {
              userId: userIdToUse,
              tenantId: session.tenantId,
              role: session.role || "ADMIN",
            },
          });
        }
      } catch (recoverErr) {
        console.warn("Aviso ao sincronizar sessão com banco local:", recoverErr);
      }
    }

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
  let targetTenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  // Se a congregação não existir no banco mas o usuário logado pertence a ela (ou é SUPERADMIN),
  // recria automaticamente a congregação para evitar perda em rebuilds e loops de redirecionamento
  if (!targetTenant && (session.tenantSlug === slug || session.role === "SUPERADMIN" || session.originalRole === "SUPERADMIN")) {
    try {
      const formattedName =
        slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

      const created = await prisma.tenant.create({
        data: {
          id: session.tenantSlug === slug && session.tenantId ? session.tenantId : undefined,
          name: formattedName.toLowerCase().startsWith("igreja")
            ? formattedName
            : `Igreja ${formattedName}`,
          slug,
          primaryColor: "#d97706",
          pastorName: session.name || `Pr. ${formattedName}`,
          plan: "PREMIUM",
          status: "TRIAL",
          monthlyPrice: 399,
          setupPrice: 1290,
          subscriptionExpiresAt: trialExpiresAt,
        },
        select: { id: true, name: true, slug: true, parentId: true },
      });
      targetTenant = created;
    } catch {
      targetTenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true, parentId: true },
      });
    }
  }

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
