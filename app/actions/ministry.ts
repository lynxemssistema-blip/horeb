"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * 1. getMinistryWorkspace(ministryId: string):
 * Retorna os dados estruturados do ministério (membros com user, reuniões com MeetingMinute incluída, e tarefas com assignee).
 */
export async function getMinistryWorkspace(ministryId: string) {
  try {
    const ministry = await prisma.ministry.findUnique({
      where: { id: ministryId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            primaryColor: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { role: "asc" }, // LEADER primeiro
        },
        meetings: {
          include: {
            minute: true,
          },
          orderBy: { date: "desc" },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!ministry) {
      return { success: false, error: "Ministério não encontrado." };
    }

    const churchUsers = await prisma.user.findMany({
      where: { tenantId: ministry.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      ministry: {
        id: ministry.id,
        name: ministry.name,
        description: ministry.description,
        schedule: ministry.schedule,
        color: ministry.color,
        icon: ministry.icon,
        logoUrl: ministry.logoUrl,
        tenant: ministry.tenant,
        potentialMembers: churchUsers,
        members: ministry.members.map((m) => ({
          id: m.id,
          role: m.role, // LEADER ou VOLUNTEER
          customFunction: m.customFunction,
          user: m.user,
        })),
        meetings: ministry.meetings.map((mt) => ({
          id: mt.id,
          title: mt.title,
          date: mt.date.toISOString(),
          type: mt.type,
          minute: mt.minute
            ? {
                id: mt.minute.id,
                content: mt.minute.content,
              }
            : null,
        })),
        tasks: ministry.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate.toISOString(),
          status: t.status, // PENDING ou COMPLETED
          assignee: t.assignee,
        })),
      },
    };
  } catch (error: any) {
    console.error("Erro ao carregar workspace do ministério:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 2. toggleTaskStatus(taskId: string, currentStatus: string):
 * Alterna o status da tarefa entre PENDING e COMPLETED no banco.
 */
export async function toggleTaskStatus(taskId: string, currentStatus: string) {
  try {
    const nextStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";

    const updatedTask = await prisma.ministryTask.update({
      where: { id: taskId },
      data: { status: nextStatus },
      include: {
        ministry: {
          include: { tenant: true },
        },
      },
    });

    if (updatedTask.ministry?.tenant) {
      revalidatePath(`/${updatedTask.ministry.tenant.slug}/ministerios/${updatedTask.ministryId}`);
    }

    return { success: true, task: updatedTask };
  } catch (error: any) {
    console.error("Erro ao alternar status da tarefa:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 3. saveMeetingMinute(meetingId: string, content: string):
 * Cria ou atualiza a ata de uma reunião específica.
 */
export async function saveMeetingMinute(meetingId: string, content: string) {
  try {
    const minute = await prisma.meetingMinute.upsert({
      where: { meetingId },
      update: { content },
      create: {
        meetingId,
        content,
      },
      include: {
        meeting: {
          include: {
            ministry: {
              include: { tenant: true },
            },
          },
        },
      },
    });

    if (minute.meeting?.ministry?.tenant) {
      revalidatePath(
        `/${minute.meeting.ministry.tenant.slug}/ministerios/${minute.meeting.ministryId}`
      );
    }

    return { success: true, minute };
  } catch (error: any) {
    console.error("Erro ao salvar ata de reunião:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 4. createTask
 */
export async function createTask(params: {
  ministryId: string;
  title: string;
  dueDate: string;
  assigneeId?: string;
  slug: string;
}) {
  try {
    const task = await prisma.ministryTask.create({
      data: {
        ministryId: params.ministryId,
        title: params.title.trim(),
        dueDate: new Date(params.dueDate),
        assigneeId: params.assigneeId || null,
        status: "PENDING",
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    revalidatePath(`/${params.slug}/ministerios/${params.ministryId}`);
    return {
      success: true,
      task: {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate.toISOString(),
        status: task.status,
        assignee: task.assignee,
      },
    };
  } catch (error: any) {
    console.error("Erro ao criar tarefa:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 5. updateTask
 */
export async function updateTask(params: {
  taskId: string;
  title: string;
  dueDate: string;
  assigneeId?: string;
  slug: string;
}) {
  try {
    const task = await prisma.ministryTask.update({
      where: { id: params.taskId },
      data: {
        title: params.title.trim(),
        dueDate: new Date(params.dueDate),
        assigneeId: params.assigneeId || null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    revalidatePath(`/${params.slug}/ministerios/${task.ministryId}`);
    return {
      success: true,
      task: {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate.toISOString(),
        status: task.status,
        assignee: task.assignee,
      },
    };
  } catch (error: any) {
    console.error("Erro ao atualizar tarefa:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 6. deleteTask
 */
export async function deleteTask(taskId: string, slug: string) {
  try {
    const task = await prisma.ministryTask.delete({
      where: { id: taskId },
    });
    revalidatePath(`/${slug}/ministerios/${task.ministryId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir tarefa:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 7. createMeeting
 */
export async function createMeeting(params: {
  ministryId: string;
  title: string;
  date: string;
  type: string;
  slug: string;
}) {
  try {
    const meeting = await prisma.ministryMeeting.create({
      data: {
        ministryId: params.ministryId,
        title: params.title.trim(),
        date: new Date(params.date),
        type: params.type || "REUNIAO",
      },
    });

    revalidatePath(`/${params.slug}/ministerios/${params.ministryId}`);
    return {
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        date: meeting.date.toISOString(),
        type: meeting.type,
        minute: null,
      },
    };
  } catch (error: any) {
    console.error("Erro ao criar reunião:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 8. deleteMeeting
 */
export async function deleteMeeting(meetingId: string, slug: string) {
  try {
    const meeting = await prisma.ministryMeeting.delete({
      where: { id: meetingId },
    });
    revalidatePath(`/${slug}/ministerios/${meeting.ministryId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir reunião:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 9. addMinistryMember
 */
export async function addMinistryMember(params: {
  ministryId: string;
  userId: string;
  role: string;
  customFunction?: string;
  slug: string;
}) {
  try {
    const member = await prisma.ministryMember.upsert({
      where: {
        ministryId_userId: {
          ministryId: params.ministryId,
          userId: params.userId,
        },
      },
      update: {
        role: params.role || "VOLUNTEER",
        customFunction: params.customFunction?.trim() || null,
      },
      create: {
        ministryId: params.ministryId,
        userId: params.userId,
        role: params.role || "VOLUNTEER",
        customFunction: params.customFunction?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    revalidatePath(`/${params.slug}/ministerios/${params.ministryId}`);
    return { success: true, member };
  } catch (error: any) {
    console.error("Erro ao adicionar membro:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 10. updateMinistryMemberFunction
 */
export async function updateMinistryMemberFunction(params: {
  memberId: string;
  role?: string;
  customFunction?: string;
  slug: string;
}) {
  try {
    const member = await prisma.ministryMember.update({
      where: { id: params.memberId },
      data: {
        role: params.role,
        customFunction: params.customFunction !== undefined ? (params.customFunction.trim() || null) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    revalidatePath(`/${params.slug}/ministerios/${member.ministryId}`);
    return { success: true, member };
  } catch (error: any) {
    console.error("Erro ao atualizar função do membro:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 11. removeMinistryMember
 */
export async function removeMinistryMember(memberId: string, slug: string) {
  try {
    const member = await prisma.ministryMember.delete({
      where: { id: memberId },
    });
    revalidatePath(`/${slug}/ministerios/${member.ministryId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao remover membro:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 4. seedMinistries():
 * Cria 1 Ministério mockado ("Ministério de Louvor") com dados falsos:
 * - 2 membros (Líder e Voluntário) com foto de perfil
 * - 2 tarefas: "Imprimir cifras" como PENDING para ontem (atrasada), "Comprar cabos" como COMPLETED
 * - 1 reunião no passado com ata preenchida (lorem ipsum de decisão)
 */
export async function seedMinistries(tenantSlug: string = "matriz") {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { users: true },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada para seed." };
    }

    // 1. Garantir 2 usuários para o ministério
    let user1 = tenant.users[0];
    let user2 = tenant.users[1];

    if (!user1) {
      user1 = await prisma.user.create({
        data: {
          name: "Lucas Mendonça",
          email: "lucas.louvor@matriz.org",
          role: "LEADER",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          tenantId: tenant.id,
        },
      });
    }

    if (!user2) {
      user2 = await prisma.user.create({
        data: {
          name: "Beatriz Oliveira",
          email: "beatriz.musica@matriz.org",
          role: "MEMBER",
          avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
          tenantId: tenant.id,
        },
      });
    }

    // 2. Criar ou Obter Ministério de Louvor
    let ministry = await prisma.ministry.findFirst({
      where: {
        tenantId: tenant.id,
        name: "Ministério de Louvor",
      },
    });

    if (!ministry) {
      ministry = await prisma.ministry.create({
        data: {
          name: "Ministério de Louvor",
          description: "Equipe de música, adoração, vozes, instrumentos e preparação litúrgica dos cultos.",
          schedule: "Ensaios aos Sábados às 16h",
          color: "#8b5cf6",
          icon: "Music",
          tenantId: tenant.id,
          leaderId: user1.id,
        },
      });
    }

    // 3. Vincular os 2 membros
    await prisma.ministryMember.upsert({
      where: {
        ministryId_userId: {
          ministryId: ministry.id,
          userId: user1.id,
        },
      },
      update: { role: "LEADER" },
      create: {
        ministryId: ministry.id,
        userId: user1.id,
        role: "LEADER",
      },
    });

    await prisma.ministryMember.upsert({
      where: {
        ministryId_userId: {
          ministryId: ministry.id,
          userId: user2.id,
        },
      },
      update: { role: "VOLUNTEER" },
      create: {
        ministryId: ministry.id,
        userId: user2.id,
        role: "VOLUNTEER",
      },
    });

    // 4. Limpar e recriar tarefas de demonstração
    await prisma.ministryTask.deleteMany({
      where: { ministryId: ministry.id },
    });

    // Tarefa 1: PENDING com data de ONTEM (Atrasada -> Badge Vermelho Vibrante!)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0);

    await prisma.ministryTask.create({
      data: {
        ministryId: ministry.id,
        title: "Imprimir cifras",
        dueDate: yesterday,
        status: "PENDING",
        assigneeId: user1.id,
      },
    });

    // Tarefa 2: COMPLETED
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 4);

    await prisma.ministryTask.create({
      data: {
        ministryId: ministry.id,
        title: "Comprar cabos",
        dueDate: futureDate,
        status: "COMPLETED",
        assigneeId: user2.id,
      },
    });

    // 5. Reunião no passado com ata preenchida
    await prisma.ministryMeeting.deleteMany({
      where: { ministryId: ministry.id },
    });

    const pastMeetingDate = new Date();
    pastMeetingDate.setDate(pastMeetingDate.getDate() - 5);
    pastMeetingDate.setHours(19, 30, 0, 0);

    const meeting = await prisma.ministryMeeting.create({
      data: {
        ministryId: ministry.id,
        title: "Alinhamento Litúrgico & Repertório de Páscoa",
        date: pastMeetingDate,
        type: "REUNIAO",
      },
    });

    await prisma.meetingMinute.create({
      data: {
        meetingId: meeting.id,
        content:
          "Reunião iniciada às 19:30 com oração conduzida pelo líder Lucas. Ficou deliberado por unanimidade que o repertório do próximo Domingo de Celebração terá 4 canções congregacionais. A equipe de cordas fará a passagem de som pontualmente às 17h45. Foi aprovada a aquisição de dois cabos P10 blindados para o teclado e a confecção das pastas físicas de cifras para a equipe de apoio vocal.",
      },
    });

    try {
      revalidatePath(`/${tenantSlug}/ministerios/${ministry.id}`);
      revalidatePath(`/${tenantSlug}/ministerios`);
    } catch {}

    return {
      success: true,
      ministryId: ministry.id,
      tenantSlug: tenant.slug,
    };
  } catch (error: any) {
    console.error("Erro no seedMinistries:", error);
    return { success: false, error: error.message };
  }
}
