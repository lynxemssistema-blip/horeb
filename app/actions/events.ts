"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export interface CreateEventInput {
  title: string;
  slogan?: string;
  description?: string;
  imageUrl?: string;
  startDate: string | Date;
  endDate?: string | Date;
  isPublic?: boolean;
  isGlobalFeature?: boolean;
  targetTenantId?: string;
}

/**
 * 1. createEvent(data, userRole, currentTenantId):
 * - Se userRole === 'LOCAL', force tenantId = currentTenantId e isGlobalFeature = false (filial não cria evento global).
 * - Se userRole === 'MASTER' (ou SUPERADMIN), permita definir o tenantId e ativar isGlobalFeature.
 */
export async function createEvent(
  data: CreateEventInput,
  userRole: string = "LOCAL",
  currentTenantId: string
) {
  try {
    const isMaster = userRole === "MASTER" || userRole === "SUPERADMIN";

    // Regras de negócio: determina o alvo inicial
    const rawTarget = isMaster && data.targetTenantId ? data.targetTenantId : currentTenantId;

    // Resolve tenant por id ou por slug (aceita tanto ID cuid quanto slug como 'feker', 'matriz')
    let tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: rawTarget },
          { slug: rawTarget },
        ],
      },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant && currentTenantId) {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { id: currentTenantId },
            { slug: currentTenantId },
          ],
        },
        select: { id: true, slug: true, name: true },
      });
    }

    if (!tenant) {
      return { success: false, error: `Congregação não encontrada com ID ou slug '${rawTarget}'.` };
    }

    const effectiveTenantId = tenant.id;
    const effectiveIsGlobalFeature = isMaster ? Boolean(data.isGlobalFeature) : false;
    const effectiveIsPublic = data.isPublic !== undefined ? Boolean(data.isPublic) : true;

    const event = await prisma.event.create({
      data: {
        title: data.title,
        slogan: data.slogan || null,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isPublic: effectiveIsPublic,
        isGlobalFeature: effectiveIsGlobalFeature,
        tenantId: effectiveTenantId,
      },
      include: {
        tenant: {
          select: { name: true, slug: true, primaryColor: true },
        },
      },
    });

    try {
      revalidatePath("/", "layout");
      revalidatePath(`/${tenant.slug}/agenda`);
      revalidatePath(`/${tenant.slug}/admin/eventos`);
    } catch {}
    return { success: true, event };
  } catch (error: any) {
    console.error("Erro ao criar evento:", error);
    return { success: false, error: error.message || "Erro ao criar evento." };
  }
}

/**
 * 2. getEventsFeed(currentTenantId, isUserLoggedIn, periodFilter):
 * - A query principal: Busque os eventos onde (tenantId == currentTenantId OU isGlobalFeature == true).
 * - Se isUserLoggedIn == false, exclua do resultado os eventos onde isPublic == false.
 * - Ordene por startDate ASC.
 */
export async function getEventsFeed(
  currentTenantId: string,
  isUserLoggedIn: boolean = false,
  periodFilter: "ALL" | "WEEK" | "MONTH" = "ALL",
  includeInactive: boolean = false
) {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: currentTenantId },
          { slug: currentTenantId },
        ],
      },
      select: { id: true },
    });

    const realTenantId = tenant ? tenant.id : currentTenantId;

    const now = new Date();
    let dateFilter: any = {};

    if (periodFilter === "WEEK") {
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      dateFilter = {
        startDate: {
          gte: new Date(now.setHours(0, 0, 0, 0)),
          lte: nextWeek,
        },
      };
    } else if (periodFilter === "MONTH") {
      const nextMonth = new Date();
      nextMonth.setMonth(now.getMonth() + 1);
      dateFilter = {
        startDate: {
          gte: new Date(now.setHours(0, 0, 0, 0)),
          lte: nextMonth,
        },
      };
    }

    const whereClause: any = {
      OR: [
        { tenantId: realTenantId },
        { isGlobalFeature: true },
      ],
      ...dateFilter,
    };

    if (!isUserLoggedIn) {
      whereClause.isPublic = true;
    }

    // Se não tiver permissão para ver inativos (Master/Pastor), só busca eventos ativos
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, primaryColor: true },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return {
      success: true,
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        slogan: e.slogan,
        description: e.description,
        imageUrl: e.imageUrl,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate ? e.endDate.toISOString() : null,
        isPublic: e.isPublic,
        isGlobalFeature: e.isGlobalFeature,
        isActive: e.isActive,
        isPaid: e.isPaid,
        price: e.price,
        tenantId: e.tenantId,
        tenant: e.tenant,
      })),
    };
  } catch (error: any) {
    console.error("Erro ao buscar feed de eventos:", error);
    return { success: false, error: error.message, events: [] };
  }
}


/**
 * 3. seedMockEvents():
 * Gera 3 eventos no banco usando fotos de alta qualidade do Unsplash para testar a UI rica.
 */
export async function seedMockEvents(tenantSlug: string = "matriz") {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada para seed." };
    }

    const mockEvents = [
      {
        title: "Conferência Global Aviva 2026",
        slogan: "Três noites de louvor, profecia e derramamento do Espírito Santo",
        description:
          "O maior encontro de adoração e avivamento de todas as nossas igrejas. Com preletores convidados, bandas ao vivo e momentos inesquecíveis na presença de Deus.",
        imageUrl: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80",
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // Daqui a 3 dias
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
        isPublic: true,
        isGlobalFeature: true, // Destaque geral em todas as igrejas!
        tenantId: tenant.id,
      },
      {
        title: "Noite de Vigília & Intercessão",
        slogan: "Buscando o clamor profético pela nossa cidade e pelas famílias",
        description:
          "Reunião reservada para a membresia e líderes para uma madrugada de adoração intensa, quebra de jugos e clamor pelas congregações.",
        imageUrl: "https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?auto=format&fit=crop&w=1200&q=80",
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6), // Daqui a 6 dias
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6 + 1000 * 60 * 60 * 4),
        isPublic: false, // Exclusivo para membros!
        isGlobalFeature: false,
        tenantId: tenant.id,
      },
      {
        title: "Encontro de Casais: Aliança Blindada",
        slogan: "Jantar especial, restauração familiar e renovação de votos",
        description:
          "Uma noite inesquecível de comunhão, palestra com psicólogos cristãos e ministração para fortalecer o casamento e o lar.",
        imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // Daqui a 2 semanas
        endDate: null,
        isPublic: true,
        isGlobalFeature: false,
        isActive: true,
        isPaid: false,
        price: null,
        tenantId: tenant.id,
      },
      {
        title: "Culto de Celebração",
        slogan: "Uma noite de adoração, comunhão e palavra profética",
        description:
          "Entrada gratuita e livre para toda a família. Reserve seu lugar via RSVP no app e garanta sua credencial com QR Code!",
        imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // Daqui a 2 dias
        endDate: null,
        isPublic: true,
        isGlobalFeature: false,
        isActive: true,
        isPaid: false,
        price: null,
        tenantId: tenant.id,
      },
      {
        title: "Acampamento Jovem",
        slogan: "Imersão espiritual, workshops, louvor e amizade cristã",
        description:
          "O evento mais esperado da juventude! Três dias inesquecíveis com hospedagem, alimentação e preleções especiais. Ingressos nominais protegidos por QR Code individual.",
        imageUrl: "https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&w=1200&q=80",
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10), // Daqui a 10 dias
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 13),
        isPublic: true,
        isGlobalFeature: true,
        isActive: true,
        isPaid: true,
        price: 150.0,
        tenantId: tenant.id,
      },
    ];

    for (const ev of mockEvents) {
      // Criação dos mocks
      await prisma.event.create({
        data: ev,
      });
    }

    try {
      revalidatePath("/", "layout");
      revalidatePath(`/${tenant.slug}/agenda`);
      revalidatePath(`/${tenant.slug}/admin/eventos`);
    } catch {}
    return { success: true, count: mockEvents.length };
  } catch (error: any) {
    console.error("Erro no seedMockEvents:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const session = await getSession();
    const effectiveUserId = session?.userId;
    const effectiveRole = session?.role || "GUEST";

    const isMaster =
      effectiveRole === "SUPERADMIN" ||
      effectiveRole === "ADMIN" ||
      effectiveRole === "MASTER";
    const isPastor = effectiveRole === "PASTOR";

    let hasPermission = isMaster || isPastor;

    if (!hasPermission && effectiveUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { role: true, isPastoralCounselor: true },
      });
      if (
        dbUser?.role === "SUPERADMIN" ||
        dbUser?.role === "ADMIN" ||
        dbUser?.role === "PASTOR" ||
        dbUser?.isPastoralCounselor
      ) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return {
        success: false,
        error: "Permissão negada. Apenas administradores e pastores podem excluir eventos.",
      };
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { tenant: { select: { slug: true } } },
    });

    if (!event) {
      return { success: false, error: "Evento não encontrado." };
    }

    await prisma.event.delete({ where: { id: eventId } });

    try {
      revalidatePath("/", "layout");
      if (event.tenant?.slug) {
        revalidatePath(`/${event.tenant.slug}/agenda`);
        revalidatePath(`/${event.tenant.slug}/admin/eventos`);
      }
    } catch {}

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * toggleEventActive(eventId, userRole):
 * Permite que usuários Master e Pastores ativem ou desativem um evento.
 */
export async function toggleEventActive(eventId: string, userRole?: string) {
  try {
    const session = await getSession();
    const effectiveUserId = session?.userId;
    const effectiveRole = userRole || session?.role || "GUEST";

    const isMaster =
      effectiveRole === "SUPERADMIN" ||
      effectiveRole === "ADMIN" ||
      effectiveRole === "MASTER";
    const isPastor = effectiveRole === "PASTOR";

    let hasPermission = isMaster || isPastor;

    if (!hasPermission && effectiveUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { role: true, isPastoralCounselor: true },
      });
      if (
        dbUser?.role === "SUPERADMIN" ||
        dbUser?.role === "ADMIN" ||
        dbUser?.role === "PASTOR" ||
        dbUser?.isPastoralCounselor
      ) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return {
        success: false,
        error: "Permissão negada. Apenas administradores e pastores podem ativar ou desativar eventos.",
      };
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { tenant: { select: { slug: true } } },
    });

    if (!event) {
      return { success: false, error: "Evento não encontrado." };
    }

    const newActiveState = !event.isActive;

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { isActive: newActiveState },
    });

    try {
      revalidatePath("/", "layout");
      if (event.tenant?.slug) {
        revalidatePath(`/${event.tenant.slug}/agenda`);
        revalidatePath(`/${event.tenant.slug}/admin/eventos`);
      }
    } catch {}

    return {
      success: true,
      isActive: updated.isActive,
      message: updated.isActive ? "Evento ativado com sucesso!" : "Evento desativado com sucesso!",
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao alterar status do evento." };
  }
}

export interface UpdateEventInput {
  id: string;
  title: string;
  slogan?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  isPublic?: boolean;
  isGlobalFeature?: boolean;
  isActive?: boolean;
  isPaid?: boolean;
  price?: number | null;
}

/**
 * 4. updateEvent(data, userRole, currentTenantId):
 * Permite que usuários Master (SUPERADMIN, ADMIN) e Pastores editem eventos existentes.
 */
export async function updateEvent(
  data: UpdateEventInput,
  userRole?: string,
  currentTenantId?: string
) {
  try {
    const session = await getSession();
    const effectiveUserId = session?.userId;
    const effectiveRole = userRole || session?.role || "GUEST";

    const isMaster =
      effectiveRole === "SUPERADMIN" ||
      effectiveRole === "ADMIN" ||
      effectiveRole === "MASTER";
    const isPastor = effectiveRole === "PASTOR";

    let hasPermission = isMaster || isPastor;

    if (!hasPermission && effectiveUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { role: true, isPastoralCounselor: true },
      });
      if (
        dbUser?.role === "SUPERADMIN" ||
        dbUser?.role === "ADMIN" ||
        dbUser?.role === "PASTOR" ||
        dbUser?.isPastoralCounselor
      ) {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return {
        success: false,
        error: "Permissão negada. Apenas administradores e pastores podem editar eventos.",
      };
    }

    const existing = await prisma.event.findUnique({
      where: { id: data.id },
      include: { tenant: { select: { id: true, slug: true } } },
    });

    if (!existing) {
      return { success: false, error: "Evento não encontrado para edição." };
    }

    const effectiveIsGlobalFeature =
      isMaster || isPastor
        ? data.isGlobalFeature !== undefined
          ? Boolean(data.isGlobalFeature)
          : existing.isGlobalFeature
        : existing.isGlobalFeature;

    const effectiveIsPublic =
      data.isPublic !== undefined ? Boolean(data.isPublic) : existing.isPublic;

    const effectiveIsActive =
      data.isActive !== undefined ? Boolean(data.isActive) : existing.isActive;

    const effectiveIsPaid =
      data.isPaid !== undefined ? Boolean(data.isPaid) : existing.isPaid;

    const effectivePrice =
      data.price !== undefined ? (data.price !== null ? Number(data.price) : null) : existing.price;

    const updated = await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title.trim(),
        slogan: data.slogan !== undefined ? (data.slogan ? data.slogan.trim() : null) : existing.slogan,
        description: data.description !== undefined ? (data.description ? data.description.trim() : null) : existing.description,
        imageUrl: data.imageUrl !== undefined ? (data.imageUrl || null) : existing.imageUrl,
        startDate: data.startDate ? new Date(data.startDate) : existing.startDate,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : existing.endDate,
        isPublic: effectiveIsPublic,
        isGlobalFeature: effectiveIsGlobalFeature,
        isActive: effectiveIsActive,
        isPaid: effectiveIsPaid,
        price: effectivePrice,
      },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, primaryColor: true },
        },
      },
    });

    try {
      revalidatePath("/", "layout");
      if (existing.tenant?.slug) {
        revalidatePath(`/${existing.tenant.slug}/agenda`);
        revalidatePath(`/${existing.tenant.slug}/admin/eventos`);
      }
    } catch {}

    return {
      success: true,
      event: {
        id: updated.id,
        title: updated.title,
        slogan: updated.slogan,
        description: updated.description,
        imageUrl: updated.imageUrl,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate ? updated.endDate.toISOString() : null,
        isPublic: updated.isPublic,
        isGlobalFeature: updated.isGlobalFeature,
        isActive: updated.isActive,
        isPaid: updated.isPaid,
        price: updated.price,
        tenantId: updated.tenantId,
        tenant: updated.tenant,
      },
    };
  } catch (error: any) {
    console.error("Erro ao atualizar evento:", error);
    return { success: false, error: error.message || "Erro ao atualizar evento." };
  }
}


export async function getEventById(eventId: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, primaryColor: true },
        },
      },
    });

    if (!event) {
      return { success: false, error: "Evento não encontrado." };
    }

    return {
      success: true,
      event: {
        id: event.id,
        title: event.title,
        slogan: event.slogan,
        description: event.description,
        imageUrl: event.imageUrl,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate ? event.endDate.toISOString() : null,
        isPublic: event.isPublic,
        isGlobalFeature: event.isGlobalFeature,
        tenantId: event.tenantId,
        tenant: event.tenant,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

