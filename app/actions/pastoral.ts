"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface PastorScheduleDay {
  day: string;
  label: string;
  start: string;
  end: string;
  slots: string[];
}

export interface PastorScheduleConfig {
  activeDays: string[];
  days: PastorScheduleDay[];
  slotDurationMinutes: number;
  modalities: string[];
  location?: string;
}

export interface PastorInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isLiveAvailable: boolean;
  pastoralTitle: string | null;
  pastoralBio: string | null;
  pastoralPhone: string | null;
  pastoralScheduleConfig: PastorScheduleConfig | null;
}

const DEFAULT_SCHEDULE: PastorScheduleConfig = {
  activeDays: ["TERCA", "QUINTA", "SEXTA"],
  days: [
    {
      day: "TERCA",
      label: "Terça-feira",
      start: "14:00",
      end: "18:00",
      slots: ["14:00", "14:40", "15:20", "16:00", "16:40", "17:20"],
    },
    {
      day: "QUINTA",
      label: "Quinta-feira",
      start: "09:00",
      end: "12:00",
      slots: ["09:00", "09:40", "10:20", "11:00", "11:40"],
    },
    {
      day: "SEXTA",
      label: "Sexta-feira",
      start: "14:00",
      end: "17:00",
      slots: ["14:00", "14:40", "15:20", "16:00", "16:40"],
    },
  ],
  slotDurationMinutes: 40,
  modalities: ["ONLINE_CHAT", "PRESENCIAL"],
  location: "Gabinete Pastoral - Templo Central",
};

/**
 * Busca todos os pastores / conselheiros da igreja especificada pelo slug.
 */
export async function getChurchPastors(slug: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, pastorName: true },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada", pastors: [], onlineCount: 0 };
    }

    // Busca usuários com função de Pastor, Admin pastoral ou marcados como conselheiros
    const users = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { role: "PASTOR" },
          { isPastoralCounselor: true },
          { role: "ADMIN" },
          { name: { contains: "Pastor" } },
          { name: { contains: "Pr." } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        isLiveAvailable: true,
        pastoralTitle: true,
        pastoralBio: true,
        pastoralPhone: true,
        pastoralScheduleConfig: true,
      },
      orderBy: [
        { isLiveAvailable: "desc" },
        { name: "asc" },
      ],
    });

    const parsedPastors: PastorInfo[] = users.map((u) => {
      let scheduleConfig: PastorScheduleConfig | null = null;
      if (u.pastoralScheduleConfig) {
        try {
          scheduleConfig = JSON.parse(u.pastoralScheduleConfig);
        } catch {
          scheduleConfig = DEFAULT_SCHEDULE;
        }
      } else {
        scheduleConfig = DEFAULT_SCHEDULE;
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        role: u.role,
        isLiveAvailable: !!u.isLiveAvailable,
        pastoralTitle: u.pastoralTitle || (u.role === "PASTOR" ? "Pastor Titular" : "Liderança Pastoral"),
        pastoralBio: u.pastoralBio || "Disponível para acolhimento espiritual, aconselhamento e oração.",
        pastoralPhone: u.pastoralPhone,
        pastoralScheduleConfig: scheduleConfig,
      };
    });

    const onlineCount = parsedPastors.filter((p) => p.isLiveAvailable).length;

    return {
      success: true,
      churchName: tenant.name,
      pastors: parsedPastors,
      onlineCount,
    };
  } catch (error: any) {
    console.error("Erro ao buscar pastores da igreja:", error);
    return { success: false, error: error.message, pastors: [], onlineCount: 0 };
  }
}

/**
 * Alterna a disponibilidade ao vivo (online/offline) de um pastor.
 */
export async function togglePastorLiveAvailability(slug: string, isAvailable: boolean, targetPastorId?: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const pastorIdToUpdate = targetPastorId || session.userId;

    const user = await prisma.user.findUnique({
      where: { id: pastorIdToUpdate },
    });

    if (!user) {
      return { success: false, error: "Pastor não encontrado." };
    }

    // Apenas o próprio pastor, administradores ou superadmin podem alterar
    const isOwner = session.userId === pastorIdToUpdate;
    const isAdmin = session.role === "ADMIN" || session.role === "SUPERADMIN";
    if (!isOwner && !isAdmin) {
      return { success: false, error: "Permissão negada para alterar o status do pastor." };
    }

    const updated = await prisma.user.update({
      where: { id: pastorIdToUpdate },
      data: {
        isLiveAvailable: isAvailable,
        isPastoralCounselor: true,
      },
      select: {
        id: true,
        name: true,
        isLiveAvailable: true,
      },
    });

    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/devocional`);

    return {
      success: true,
      isLiveAvailable: updated.isLiveAvailable,
      message: updated.isLiveAvailable
        ? "Você agora está ONLINE e pronto para atender membros ao vivo!"
        : "Você agora está OFFLINE para atendimentos ao vivo.",
    };
  } catch (error: any) {
    console.error("Erro ao alternar disponibilidade pastoral:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza as configurações de agenda e perfil de atendimento do pastor.
 */
export async function updatePastorScheduleConfig(params: {
  slug: string;
  pastorId: string;
  pastoralTitle?: string;
  pastoralBio?: string;
  pastoralPhone?: string;
  scheduleConfig: PastorScheduleConfig;
}) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Não autenticado." };

    const isOwner = session.userId === params.pastorId;
    const isAdmin = session.role === "ADMIN" || session.role === "SUPERADMIN";
    if (!isOwner && !isAdmin) {
      return { success: false, error: "Permissão insuficiente." };
    }

    await prisma.user.update({
      where: { id: params.pastorId },
      data: {
        pastoralTitle: params.pastoralTitle,
        pastoralBio: params.pastoralBio,
        pastoralPhone: params.pastoralPhone,
        pastoralScheduleConfig: JSON.stringify(params.scheduleConfig),
        isPastoralCounselor: true,
      },
    });

    revalidatePath(`/${params.slug}`);
    revalidatePath(`/${params.slug}/devocional`);

    return { success: true, message: "Agenda e perfil pastoral salvos com sucesso!" };
  } catch (error: any) {
    console.error("Erro ao atualizar agenda pastoral:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cria uma solicitação de atendimento pastoral:
 * - "LIVE": Usuário chamando o pastor online para conversar ao vivo agora
 * - "SCHEDULED": Usuário agendando um horário futuro na agenda do pastor
 */
export async function createPastoralAppointment(params: {
  slug: string;
  pastorId: string;
  type: "LIVE" | "SCHEDULED";
  userName: string;
  userEmail?: string;
  userPhone?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  subject?: string;
  initialMessage?: string;
}) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true },
    });

    if (!tenant) return { success: false, error: "Igreja não encontrada." };

    const pastor = await prisma.user.findUnique({
      where: { id: params.pastorId },
      select: { id: true, name: true, isLiveAvailable: true, pastoralTitle: true },
    });

    if (!pastor) return { success: false, error: "Pastor selecionado não encontrado." };

    const session = await getSession();

    let scheduledAt: Date | undefined = undefined;
    if (params.type === "SCHEDULED" && params.scheduledDate && params.scheduledTime) {
      scheduledAt = new Date(`${params.scheduledDate}T${params.scheduledTime}:00`);
    }

    const appointment = await prisma.pastoralAppointment.create({
      data: {
        tenantId: tenant.id,
        pastorId: pastor.id,
        userId: session?.userId || null,
        userName: params.userName.trim() || session?.name || "Membro da Igreja",
        userEmail: params.userEmail?.trim() || session?.email || null,
        userPhone: params.userPhone?.trim() || null,
        type: params.type,
        scheduledDate: params.scheduledDate || null,
        scheduledTime: params.scheduledTime || null,
        scheduledAt: scheduledAt || null,
        status: params.type === "LIVE" ? "WAITING" : "WAITING",
        subject: params.subject?.trim() || (params.type === "LIVE" ? "Conversa Pastoral Ao Vivo" : "Aconselhamento Agendado"),
        messages: params.initialMessage?.trim()
          ? {
              create: {
                senderId: session?.userId || null,
                senderName: params.userName.trim() || session?.name || "Membro da Igreja",
                senderRole: "MEMBER",
                content: params.initialMessage.trim(),
              },
            }
          : undefined,
      },
      include: {
        pastor: {
          select: { id: true, name: true, avatarUrl: true, pastoralTitle: true },
        },
        messages: true,
      },
    });

    return {
      success: true,
      appointment,
      message: params.type === "LIVE"
        ? `Chamando ${pastor.name}... Aguarde a confirmação de conexão.`
        : `Atendimento agendado com sucesso para ${params.scheduledDate} às ${params.scheduledTime}!`,
    };
  } catch (error: any) {
    console.error("Erro ao criar atendimento pastoral:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca uma sessão de atendimento pelo ID com todas as mensagens.
 */
export async function getPastoralAppointment(appointmentId: string) {
  try {
    const appointment = await prisma.pastoralAppointment.findUnique({
      where: { id: appointmentId },
      include: {
        pastor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            pastoralTitle: true,
            isLiveAvailable: true,
            pastoralPhone: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!appointment) {
      return { success: false, error: "Atendimento não encontrado." };
    }

    return { success: true, appointment };
  } catch (error: any) {
    console.error("Erro ao buscar atendimento pastoral:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Envia uma mensagem dentro de um atendimento pastoral ativo.
 */
export async function sendPastoralMessage(appointmentId: string, content: string) {
  try {
    if (!content.trim()) return { success: false, error: "Mensagem vazia." };

    const appointment = await prisma.pastoralAppointment.findUnique({
      where: { id: appointmentId },
      include: { pastor: true },
    });

    if (!appointment) return { success: false, error: "Atendimento não encontrado." };

    const session = await getSession();

    // Determina se o remetente é o pastor ou o membro
    const isPastorSender = session?.userId === appointment.pastorId;
    const senderRole = isPastorSender ? "PASTOR" : "MEMBER";
    const senderName = isPastorSender
      ? appointment.pastor.name
      : (session?.name || appointment.userName);

    const message = await prisma.pastoralMessage.create({
      data: {
        appointmentId,
        senderId: session?.userId || null,
        senderName,
        senderRole,
        content: content.trim(),
      },
    });

    // Se o pastor respondeu e estava em WAITING, passa para IN_PROGRESS
    if (isPastorSender && appointment.status === "WAITING") {
      await prisma.pastoralAppointment.update({
        where: { id: appointmentId },
        data: { status: "IN_PROGRESS" },
      });
    }

    return { success: true, message };
  } catch (error: any) {
    console.error("Erro ao enviar mensagem pastoral:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza o status do atendimento (Ex: Concluir, Cancelar, Aceitar)
 */
export async function updatePastoralAppointmentStatus(
  appointmentId: string,
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  pastorNotes?: string
) {
  try {
    const updated = await prisma.pastoralAppointment.update({
      where: { id: appointmentId },
      data: {
        status,
        pastorNotes: pastorNotes !== undefined ? pastorNotes : undefined,
      },
    });

    return { success: true, appointment: updated };
  } catch (error: any) {
    console.error("Erro ao atualizar status do atendimento:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca dados para o painel de atendimento do pastor (Gabinete Pastoral).
 */
export async function getPastoralCabinetData(slug: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Não autenticado." };

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!tenant) return { success: false, error: "Igreja não encontrada." };

    const currentPastor = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        isLiveAvailable: true,
        pastoralTitle: true,
        pastoralBio: true,
        pastoralPhone: true,
        pastoralScheduleConfig: true,
      },
    });

    // Busca todos os atendimentos direcionados a este pastor (ou todos da igreja se for ADMIN/SUPERADMIN)
    const isAdmin = session.role === "ADMIN" || session.role === "SUPERADMIN";
    const whereClause: any = { tenantId: tenant.id };
    if (!isAdmin) {
      whereClause.pastorId = session.userId;
    }

    const appointments = await prisma.pastoralAppointment.findMany({
      where: whereClause,
      include: {
        pastor: {
          select: { id: true, name: true, avatarUrl: true, pastoralTitle: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const waitingLive = appointments.filter((a) => a.type === "LIVE" && a.status === "WAITING");
    const activeLive = appointments.filter((a) => a.type === "LIVE" && a.status === "IN_PROGRESS");
    const scheduled = appointments.filter((a) => a.type === "SCHEDULED" && a.status !== "COMPLETED" && a.status !== "CANCELLED");
    const history = appointments.filter((a) => a.status === "COMPLETED" || a.status === "CANCELLED");

    return {
      success: true,
      pastor: currentPastor,
      stats: {
        waitingCount: waitingLive.length,
        activeCount: activeLive.length,
        scheduledCount: scheduled.length,
      },
      waitingLive,
      activeLive,
      scheduled,
      history,
    };
  } catch (error: any) {
    console.error("Erro ao carregar dados do Gabinete Pastoral:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca atendimentos ativos do membro atual para acompanhamento.
 */
export async function getMemberActivePastoralSessions(slug: string) {
  try {
    const session = await getSession();
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) return { success: true, sessions: [] };

    const whereClause: any = {
      tenantId: tenant.id,
      status: { in: ["WAITING", "IN_PROGRESS"] },
    };

    if (session?.userId) {
      whereClause.userId = session.userId;
    } else {
      return { success: true, sessions: [] };
    }

    const sessions = await prisma.pastoralAppointment.findMany({
      where: whereClause,
      include: {
        pastor: {
          select: { id: true, name: true, avatarUrl: true, pastoralTitle: true, isLiveAvailable: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, sessions };
  } catch (error: any) {
    console.error("Erro ao buscar atendimentos do membro:", error);
    return { success: true, sessions: [] };
  }
}
