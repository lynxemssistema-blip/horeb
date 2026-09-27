"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getChurchMinistries(churchSlug: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: churchSlug },
      include: {
        ministries: {
          include: {
            leader: true,
          },
          orderBy: { createdAt: "asc" },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada." };
    }

    return {
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        primaryColor: tenant.primaryColor,
        plan: tenant.plan,
      },
      ministries: tenant.ministries.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        schedule: m.schedule,
        color: m.color,
        icon: m.icon,
        leader: m.leader ? { id: m.leader.id, name: m.leader.name, email: m.leader.email } : null,
      })),
      potentialLeaders: tenant.users,
    };
  } catch (error: any) {
    console.error("Erro ao buscar ministérios:", error);
    return { success: false, error: error.message };
  }
}

export async function createMinistry(params: {
  tenantSlug: string;
  name: string;
  description?: string;
  leaderId?: string;
  schedule?: string;
  color?: string;
  icon?: string;
}) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada." };
    }

    const ministry = await prisma.ministry.create({
      data: {
        name: params.name.trim(),
        description: params.description?.trim() || null,
        leaderId: params.leaderId || null,
        schedule: params.schedule?.trim() || null,
        color: params.color || "#8b5cf6",
        icon: params.icon || "Sparkles",
        tenantId: tenant.id,
      },
      include: { leader: true },
    });

    revalidatePath(`/${tenant.slug}`);
    revalidatePath(`/${tenant.slug}/ministerios`);

    return { success: true, ministry };
  } catch (error: any) {
    console.error("Erro ao criar ministério:", error);
    return { success: false, error: error.message };
  }
}

export async function updateMinistry(params: {
  id: string;
  name: string;
  description?: string;
  leaderId?: string;
  schedule?: string;
  color?: string;
  icon?: string;
  churchSlug: string;
}) {
  try {
    const ministry = await prisma.ministry.update({
      where: { id: params.id },
      data: {
        name: params.name.trim(),
        description: params.description?.trim() || null,
        leaderId: params.leaderId || null,
        schedule: params.schedule?.trim() || null,
        color: params.color,
        icon: params.icon,
      },
      include: { leader: true },
    });

    revalidatePath(`/${params.churchSlug}`);
    revalidatePath(`/${params.churchSlug}/ministerios`);

    return { success: true, ministry };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMinistry(id: string, churchSlug: string) {
  try {
    await prisma.ministry.delete({
      where: { id },
    });

    revalidatePath(`/${churchSlug}`);
    revalidatePath(`/${churchSlug}/ministerios`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
