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

const SESSION_COOKIE_NAME = "horeb_auth_session";

export async function createSession(data: SessionData) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias de persistência
  });
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;
    const session = JSON.parse(cookie.value) as SessionData;
    
    // Aplica o papel simulado se existir
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
  | { authorized: true; user: SessionData; effectiveRole: string }
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

  // Super Admin (Edson Manoel / Lynx EMS) tem acesso irrestrito
  const isSuperAdmin = session.role === "SUPERADMIN" || session.originalRole === "SUPERADMIN";
  if (isSuperAdmin) {
    return { authorized: true, user: session, effectiveRole: session.role };
  }

  // Igreja de cadastro principal do usuário
  if (session.tenantSlug === slug) {
    return { authorized: true, user: session, effectiveRole: session.role };
  }

  // Verificar se o usuário possui acesso delegado a esta congregação específica (Matriz ou Filial)
  const targetTenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, parentId: true },
  });

  if (!targetTenant) {
    return { authorized: false, reason: "NOT_LOGGED_IN" };
  }

  // Verificar na tabela de acessos multi-igreja
  const access = await prisma.userChurchAccess.findUnique({
    where: {
      userId_tenantId: {
        userId: session.userId,
        tenantId: targetTenant.id,
      },
    },
  });

  if (access) {
    return { authorized: true, user: session, effectiveRole: access.role };
  }

  return {
    authorized: false,
    reason: "NOT_MEMBER",
    user: session,
    userChurchSlug: session.tenantSlug,
    requestedChurchSlug: slug,
  };
}
