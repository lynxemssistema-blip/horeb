"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAgentProfiles(tenantId?: string | null) {
  try {
    const profiles = await prisma.agentProfile.findMany({
      where: tenantId ? {
        OR: [{ tenantId }, { tenantId: null }]
      } : {},
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
    const profile = await prisma.agentProfile.create({
      data: {
        name: data.name,
        type: data.type,
        systemPrompt: data.systemPrompt,
        model: data.model || "gemini-1.5-flash",
        temperature: data.temperature || 0.7,
        tenantId: data.tenantId,
      },
    });
    
    if (data.tenantId) {
        const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
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
