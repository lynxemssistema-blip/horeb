"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

    // Regras de negócio inegociáveis
    const effectiveTenantId = isMaster && data.targetTenantId ? data.targetTenantId : currentTenantId;
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

    revalidatePath("/", "layout");
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
  periodFilter: "ALL" | "WEEK" | "MONTH" = "ALL"
) {
  try {
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
        { tenantId: currentTenantId },
        { isGlobalFeature: true },
      ],
      ...dateFilter,
    };

    if (!isUserLoggedIn) {
      whereClause.isPublic = true;
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
    } catch {}
    return { success: true, count: mockEvents.length };
  } catch (error: any) {
    console.error("Erro no seedMockEvents:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEvent(eventId: string) {
  try {
    await prisma.event.delete({ where: { id: eventId } });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
