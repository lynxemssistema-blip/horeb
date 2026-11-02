"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getAgentProfiles(tenantId?: string | null) {
  try {
    const session = await getSession();
    const effectiveTenantId = tenantId || session?.tenantId || null;

    const profiles = await prisma.agentProfile.findMany({
      where: effectiveTenantId
        ? {
            OR: [{ tenantId: effectiveTenantId }, { tenantId: null }],
          }
        : { tenantId: null },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, profiles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAgentProfile(data: {
  name: string;
  type: string;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  tenantId?: string | null;
}) {
  try {
    const session = await getSession();
    if (!session?.userId || !["SUPERADMIN", "ADMIN", "PASTOR"].includes(session.role)) {
      return { success: false, error: "Acesso negado: apenas administradores podem criar agentes." };
    }

    const effectiveTenantId =
      session.role === "SUPERADMIN" ? (data.tenantId ?? null) : (data.tenantId || session.tenantId);

    if (session.role !== "SUPERADMIN" && effectiveTenantId !== session.tenantId) {
      return { success: false, error: "Acesso negado: não é permitido criar agentes para outra congregação." };
    }

    const profile = await prisma.agentProfile.create({
      data: {
        name: data.name,
        type: data.type,
        systemPrompt: data.systemPrompt,
        model: data.model || "gemini-3.6-flash",
        temperature: data.temperature || 0.7,
        tenantId: effectiveTenantId,
      },
    });
    
    if (effectiveTenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: effectiveTenantId } });
      if (tenant) revalidatePath(`/${tenant.slug}/admin/agentes`);
    }

    return { success: true, profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAgentProfile(id: string, data: Partial<{
  name: string;
  type: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  isActive: boolean;
}>) {
  try {
    const session = await getSession();
    if (!session?.userId || !["SUPERADMIN", "ADMIN", "PASTOR"].includes(session.role)) {
      return { success: false, error: "Acesso negado." };
    }

    const existing = await prisma.agentProfile.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Agente não encontrado." };
    }

    if (session.role !== "SUPERADMIN" && existing.tenantId !== session.tenantId) {
      return { success: false, error: "Você só pode editar agentes exclusivos da sua congregação." };
    }

    const profile = await prisma.agentProfile.update({
      where: { id },
      data,
      include: { tenant: true }
    });
    
    if (profile.tenant) {
      revalidatePath(`/${profile.tenant.slug}/admin/agentes`);
    }
    
    return { success: true, profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAgentProfile(id: string) {
  try {
    const session = await getSession();
    if (!session?.userId || !["SUPERADMIN", "ADMIN", "PASTOR"].includes(session.role)) {
      return { success: false, error: "Acesso negado." };
    }

    const existing = await prisma.agentProfile.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Agente não encontrado." };
    }

    if (session.role !== "SUPERADMIN" && existing.tenantId !== session.tenantId) {
      return { success: false, error: "Você só pode excluir agentes exclusivos da sua congregação." };
    }

    const profile = await prisma.agentProfile.delete({
      where: { id },
      include: { tenant: true }
    });
    if (profile.tenant) {
      revalidatePath(`/${profile.tenant.slug}/admin/agentes`);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
