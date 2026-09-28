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
            members: {
              where: { role: "LEADER" },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
          orderBy: { name: "asc" },
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
      ministries: tenant.ministries.map((m) => {
        // Obter todos os líderes (pela tabela MinistryMember role=LEADER, com fallback pro leader direto se houver)
        const leaderMembers = m.members.map((mem) => mem.user);
        if (m.leader && !leaderMembers.some((l) => l.id === m.leader?.id)) {
          leaderMembers.unshift({
            id: m.leader.id,
            name: m.leader.name,
            email: m.leader.email,
            avatarUrl: (m.leader as any).avatarUrl || null,
          });
        }

        return {
          id: m.id,
          name: m.name,
          description: m.description,
          schedule: m.schedule,
          color: m.color,
          icon: m.icon,
          logoUrl: m.logoUrl,
          leaders: leaderMembers,
          leader: leaderMembers[0] || null,
        };
      }),
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
  leaderIds?: string[];
  schedule?: string;
  color?: string;
  icon?: string;
  logoUrl?: string;
}) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada." };
    }

    const leadersToAssign = params.leaderIds && params.leaderIds.length > 0
      ? params.leaderIds
      : params.leaderId
      ? [params.leaderId]
      : [];

    const primaryLeader = leadersToAssign[0] || null;

    const ministry = await prisma.ministry.create({
      data: {
        name: params.name.trim(),
        description: params.description?.trim() || null,
        leaderId: primaryLeader,
        schedule: params.schedule?.trim() || null,
        color: params.color || "#8b5cf6",
        icon: params.icon || "Sparkles",
        logoUrl: params.logoUrl?.trim() || null,
        tenantId: tenant.id,
      },
    });

    // Vincular todos os líderes em MinistryMember com role="LEADER"
    for (const lId of leadersToAssign) {
      await prisma.ministryMember.upsert({
        where: {
          ministryId_userId: {
            ministryId: ministry.id,
            userId: lId,
          },
        },
        update: { role: "LEADER" },
        create: {
          ministryId: ministry.id,
          userId: lId,
          role: "LEADER",
        },
      });
    }

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
  leaderIds?: string[];
  schedule?: string;
  color?: string;
  icon?: string;
  logoUrl?: string;
  churchSlug: string;
}) {
  try {
    const leadersToAssign = params.leaderIds !== undefined
      ? params.leaderIds
      : params.leaderId
      ? [params.leaderId]
      : [];

    const primaryLeader = leadersToAssign[0] || null;

    const ministry = await prisma.ministry.update({
      where: { id: params.id },
      data: {
        name: params.name.trim(),
        description: params.description?.trim() || null,
        leaderId: primaryLeader,
        schedule: params.schedule?.trim() || null,
        color: params.color,
        icon: params.icon,
        logoUrl: params.logoUrl !== undefined ? (params.logoUrl.trim() || null) : undefined,
      },
    });

    // Se foram informados leaderIds, sincroniza os líderes na tabela MinistryMember
    if (params.leaderIds !== undefined) {
      // Remove o papel de LEADER dos membros antigos que não estão mais na lista de líderes
      const currentLeaders = await prisma.ministryMember.findMany({
        where: { ministryId: params.id, role: "LEADER" },
      });

      for (const cur of currentLeaders) {
        if (!leadersToAssign.includes(cur.userId)) {
          // Muda para VOLUNTEER ou remove se não for voluntário
          await prisma.ministryMember.update({
            where: { id: cur.id },
            data: { role: "VOLUNTEER" },
          });
        }
      }

      // Adiciona/garante LEADER para todos os selecionados
      for (const lId of leadersToAssign) {
        await prisma.ministryMember.upsert({
          where: {
            ministryId_userId: {
              ministryId: params.id,
              userId: lId,
            },
          },
          update: { role: "LEADER" },
          create: {
            ministryId: params.id,
            userId: lId,
            role: "LEADER",
          },
        });
      }
    }

    // Busca ministério completo com os líderes atualizados
    const refreshed = await prisma.ministry.findUnique({
      where: { id: params.id },
      include: {
        leader: true,
        members: {
          where: { role: "LEADER" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    const leaderUsers = refreshed?.members.map((m) => m.user) || [];
    if (refreshed?.leader && !leaderUsers.some((l) => l.id === refreshed.leader?.id)) {
      leaderUsers.unshift({
        id: refreshed.leader.id,
        name: refreshed.leader.name,
        email: refreshed.leader.email,
        avatarUrl: (refreshed.leader as any).avatarUrl || null,
      });
    }

    revalidatePath(`/${params.churchSlug}`);
    revalidatePath(`/${params.churchSlug}/ministerios`);

    return {
      success: true,
      ministry: {
        ...ministry,
        leaders: leaderUsers,
        leader: leaderUsers[0] || null,
      },
    };
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
