"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getWorshipServices(slug: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        logoUrl: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    // 1. Buscar ou inicializar cultos regulares
    let services = await prisma.worshipService.findMany({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (services.length === 0) {
      const defaultServices = await prisma.$transaction([
        prisma.worshipService.create({
          data: {
            tenantId: tenant.id,
            title: "Culto de Celebração de Domingo",
            dayOfWeek: "DOMINGO",
            time: "18:00",
            description: "Culto de adoração, louvor e ministração da Palavra para toda a família.",
          },
        }),
        prisma.worshipService.create({
          data: {
            tenantId: tenant.id,
            title: "Culto de Doutrina & Ensino",
            dayOfWeek: "TERCA",
            time: "19:30",
            description: "Estudo bíblico temático para crescimento espiritual e edificação da fé.",
          },
        }),
        prisma.worshipService.create({
          data: {
            tenantId: tenant.id,
            title: "Culto de Oração & Avivamento",
            dayOfWeek: "QUINTA",
            time: "19:30",
            description: "Clamor pela igreja, famílias, enfermos e salvação de vidas.",
          },
        }),
      ]);
      services = defaultServices;
    }

    // 2. Data de hoje (YYYY-MM-DD)
    const todayYMD = new Date().toISOString().split("T")[0];

    // 3. Buscar atendimentos / presenças de hoje
    const todayAttendances = await prisma.serviceAttendance.findMany({
      where: {
        tenantId: tenant.id,
        serviceDate: todayYMD,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
            pastoralTitle: true,
          },
        },
      },
      orderBy: { checkedInAt: "desc" },
    });

    const totalEligibleMembers = await prisma.user.count({
      where: { tenantId: tenant.id },
    });

    return {
      success: true,
      tenant,
      services,
      todayAttendances,
      totalToday: todayAttendances.length,
      totalEligibleMembers,
      todayYMD,
      currentUser: {
        id: session.userId,
        name: session.name,
        role: session.role,
      },
    };
  } catch (error: any) {
    console.error("Erro ao carregar cultos da portaria:", error);
    return { success: false, error: "Falha ao carregar informações da portaria." };
  }
}

export async function createWorshipService(
  slug: string,
  data: {
    title: string;
    dayOfWeek?: string;
    time?: string;
    description?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "PASTOR", "LEADER"].includes(session.role)) {
      return { success: false, error: "Apenas administradores e líderes podem cadastrar cultos." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const newService = await prisma.worshipService.create({
      data: {
        tenantId: tenant.id,
        title: data.title,
        dayOfWeek: data.dayOfWeek || "DOMINGO",
        time: data.time || "19:00",
        description: data.description || null,
      },
    });

    revalidatePath(`/${slug}/admin/porteiro`);
    return {
      success: true,
      message: `Culto "${newService.title}" cadastrado com sucesso!`,
      service: newService,
    };
  } catch (error: any) {
    console.error("Erro ao criar culto:", error);
    return { success: false, error: "Falha ao cadastrar culto." };
  }
}

export async function validateAndCheckinMember(
  slug: string,
  rawQrCodeOrMemberId: string,
  serviceId?: string,
  serviceName?: string
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const input = rawQrCodeOrMemberId.trim();
    if (!input) {
      return { success: false, error: "QR Code ou código inválido." };
    }

    // 1. Extrair ID ou código do membro a partir do input (suporta URLs, JSON, MEM-XXXX ou CUID)
    let searchUserId: string | null = null;
    let searchCode: string | null = null;

    if (input.includes("member=")) {
      try {
        const url = new URL(input);
        searchUserId = url.searchParams.get("member");
      } catch {
        const match = input.match(/member=([^&]+)/);
        if (match) searchUserId = match[1];
      }
    } else if (input.startsWith("MEM-")) {
      searchCode = input.replace("MEM-", "").toLowerCase();
    } else {
      searchUserId = input;
    }

    // 2. Buscar o membro no banco
    let member = null;
    if (searchUserId) {
      member = await prisma.user.findFirst({
        where: {
          id: searchUserId,
          tenantId: tenant.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          pastoralTitle: true,
          createdAt: true,
        },
      });
    }

    // Se não achou por ID, tentar por código parcial, email ou nome
    if (!member && (searchCode || input)) {
      const q = searchCode || input;
      member = await prisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          OR: [
            { id: { endsWith: q } },
            { email: { equals: q } },
            { name: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          pastoralTitle: true,
          createdAt: true,
        },
      });
    }

    if (!member) {
      return {
        success: false,
        error: "Membro não encontrado nesta congregação. Verifique o crachá.",
      };
    }

    const todayYMD = new Date().toISOString().split("T")[0];
    const resolvedServiceName = serviceName || "Culto de Celebração";

    // 3. Verificar se já fez check-in neste culto hoje
    const existingCheckin = await prisma.serviceAttendance.findFirst({
      where: {
        tenantId: tenant.id,
        userId: member.id,
        serviceDate: todayYMD,
        ...(serviceId ? { serviceId } : {}),
      },
    });

    if (existingCheckin) {
      const formattedTime = format(new Date(existingCheckin.checkedInAt), "HH:mm", {
        locale: ptBR,
      });

      return {
        success: true,
        alreadyCheckedIn: true,
        checkinTime: existingCheckin.checkedInAt,
        message: `Membro já recepcionado às ${formattedTime}!`,
        member,
      };
    }

    // 4. Registrar nova presença
    const newAttendance = await prisma.serviceAttendance.create({
      data: {
        tenantId: tenant.id,
        serviceId: serviceId || null,
        serviceName: resolvedServiceName,
        serviceDate: todayYMD,
        userId: member.id,
        checkedInBy: session.name || "Portaria Digital",
      },
    });

    // 5. Contar total de presenças do membro neste ano
    const totalAttendancesCount = await prisma.serviceAttendance.count({
      where: {
        tenantId: tenant.id,
        userId: member.id,
      },
    });

    revalidatePath(`/${slug}/admin/porteiro`);

    return {
      success: true,
      alreadyCheckedIn: false,
      attendance: newAttendance,
      checkinTime: newAttendance.checkedInAt,
      totalVisits: totalAttendancesCount,
      message: `Seja muito bem-vindo(a), ${member.name.split(" ")[0]}!`,
      member,
    };
  } catch (error: any) {
    console.error("Erro ao validar crachá no porteiro:", error);
    return { success: false, error: "Falha ao registrar presença na portaria." };
  }
}

export async function getMemberAbsenceRadar(slug: string) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "PASTOR", "LEADER"].includes(session.role)) {
      return { success: false, error: "Acesso restrito à liderança." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    // Buscar membros com suas últimas presenças
    const members = await prisma.user.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        pastoralTitle: true,
        serviceAttendances: {
          orderBy: { checkedInAt: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();

    const absenceList = members.map((m) => {
      const lastAttendance = m.serviceAttendances[0]?.checkedInAt;
      let daysAbsent = 999;

      if (lastAttendance) {
        const diffMs = now.getTime() - new Date(lastAttendance).getTime();
        daysAbsent = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        id: m.id,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatarUrl,
        role: m.role,
        pastoralTitle: m.pastoralTitle,
        lastSeenDate: lastAttendance ? new Date(lastAttendance) : null,
        daysAbsent,
      };
    });

    // Ordenar pelos mais ausentes primeiro
    absenceList.sort((a, b) => b.daysAbsent - a.daysAbsent);

    return {
      success: true,
      absenceList,
    };
  } catch (error: any) {
    console.error("Erro ao carregar radar de ausência:", error);
    return { success: false, error: "Falha ao analisar faltas dos membros." };
  }
}
