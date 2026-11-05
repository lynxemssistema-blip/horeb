"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

const DEFAULT_GLOBAL_AGENTS = [
  {
    name: "Orquestrador Horeb",
    type: "ORCHESTRATOR",
    model: "gemini-2.5-flash",
    temperature: 0.5,
    isActive: true,
    tenantId: null as string | null,
    systemPrompt:
      "Você é o Orquestrador Central de Inteligência Artificial do Horeb. Sua missão é direcionar pedidos de oração, dúvidas bíblicas, aconselhamento pastoral e suporte de discipulado para o agente especialista ideal, sempre mantendo tom acolhedor, cristocêntrico e respeitoso.",
  },
  {
    name: "Pr. Conselheiro & Devocional",
    type: "EXPERT",
    model: "gemini-2.5-flash",
    temperature: 0.7,
    isActive: true,
    tenantId: null as string | null,
    systemPrompt:
      "Você é um Conselheiro Pastoral Bíblico e Mentor de Devocionais. Ofereça palavras de consolação, sabedoria fundamentada nas Escrituras Sagradas, referências bíblicas contextualizadas e orações edificantes para os membros da igreja.",
  },
  {
    name: "Copiloto de Teologia & EBD",
    type: "EXPERT",
    model: "gemini-2.5-flash",
    temperature: 0.6,
    isActive: true,
    tenantId: null as string | null,
    systemPrompt:
      "Você é um Especialista em Teologia Bíblica, Exegese (Hebraico e Grego) e Escola Bíblica Dominical (EBD). Auxilie pastores, professores e líderes na preparação de esboços expositivos, estudos para células e respostas teológicas profundas.",
  },
];

export async function getAgentProfiles(tenantId?: string | null) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Não autenticado.", profiles: [] };
    }
    const isSuper =
      session.role === "SUPERADMIN" || session.originalRole === "SUPERADMIN";
    const isAdminOrPastor = ["SUPERADMIN", "ADMIN", "PASTOR"].includes(
      session.role
    );
    const effectiveTenantId = isSuper
      ? tenantId || session.tenantId || null
      : session.tenantId;

    let profiles = await prisma.agentProfile.findMany({
      where: effectiveTenantId
        ? {
            OR: [{ tenantId: effectiveTenantId }, { tenantId: null }],
          }
        : { tenantId: null },
      select: {
        id: true,
        name: true,
        type: true,
        model: true,
        temperature: true,
        isActive: true,
        tenantId: true,
        createdAt: true,
        systemPrompt: isAdminOrPastor,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!profiles || profiles.length === 0) {
      for (const ag of DEFAULT_GLOBAL_AGENTS) {
        try {
          await prisma.agentProfile.create({ data: ag });
        } catch {}
      }
      profiles = await prisma.agentProfile.findMany({
        where: effectiveTenantId
          ? {
              OR: [{ tenantId: effectiveTenantId }, { tenantId: null }],
            }
          : { tenantId: null },
        select: {
          id: true,
          name: true,
          type: true,
          model: true,
          temperature: true,
          isActive: true,
          tenantId: true,
          createdAt: true,
          systemPrompt: isAdminOrPastor,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return { success: true, profiles };
  } catch (error: any) {
    return { success: false, error: error.message, profiles: [] };
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
