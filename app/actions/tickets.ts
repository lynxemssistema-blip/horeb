"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendTicketPurchaseEmail } from "@/lib/mail";

export interface PurchaseTicketResult {
  success: boolean;
  message?: string;
  error?: string;
  tickets?: any[];
}

/**
 * 1. purchaseTickets(eventId, quantity, guestNames, buyerEmail):
 * - Simula Gateway de Pagamento com delay de 2 segundos.
 * - Cria N linhas na tabela Ticket (uma para cada nome no array guestNames).
 * - Simula disparo de e-mail com QR Codes em anexo.
 */
export async function purchaseTickets(
  eventId: string,
  quantity: number,
  guestNames: string[],
  buyerEmail: string
): Promise<PurchaseTicketResult> {
  try {
    const cleanEmail = buyerEmail?.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: "Informe um e-mail válido para receber os ingressos." };
    }

    if (!guestNames || guestNames.length === 0) {
      return { success: false, error: "Informe o nome de todos os convidados." };
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { tenant: true },
    });

    if (!event) {
      return { success: false, error: "Evento não encontrado." };
    }

    // Simulação do Gateway de Pagamento (delay de 2 segundos)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Cria os ingressos individualmente para gerar UUIDs únicos
    const createdTickets = [];
    const validCount = Math.min(quantity, guestNames.length);

    for (let i = 0; i < validCount; i++) {
      const gName = guestNames[i]?.trim() || `Convidado ${i + 1}`;
      const ticket = await prisma.ticket.create({
        data: {
          eventId: event.id,
          buyerEmail: cleanEmail,
          guestName: gName,
          status: "VALID",
        },
        include: {
          event: {
            select: {
              title: true,
              startDate: true,
              imageUrl: true,
              tenant: { select: { name: true, slug: true } },
            },
          },
        },
      });
      createdTickets.push(ticket);
    }

    // Disparo real de e-mail com os ingressos e QR Codes via Hostinger SMTP
    const mailResult = await sendTicketPurchaseEmail({
      to: cleanEmail,
      eventName: event.title,
      eventDate: event.startDate
        ? new Date(event.startDate).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined,
      eventLocation: event.slogan || undefined,
      churchName: event.tenant?.name || "Horeb",
      churchSlug: event.tenant?.slug || undefined,
      primaryColor: event.tenant?.primaryColor || "#f59e0b",
      logoUrl: event.tenant?.logoUrl || undefined,
      tickets: createdTickets.map((t) => ({
        id: t.id,
        guestName: t.guestName,
      })),
    });

    // Registrar no log de e-mails para auditoria
    try {
      await prisma.emailLog.create({
        data: {
          type: "OUTGOING",
          from: "suporte@lynxems.com.br",
          to: cleanEmail,
          subject: `Ingressos Confirmados: ${event.title}`,
          snippet: `${createdTickets.length} ingressos emitidos para ${cleanEmail}`,
          status: mailResult.success ? "SENT" : "FAILED",
          code: createdTickets[0]?.id?.substring(0, 8),
        },
      });
    } catch {}

    try {
      revalidatePath("/", "layout");
      if (event.tenant?.slug) {
        revalidatePath(`/${event.tenant.slug}/meus-ingressos`);
      }
    } catch {}

    return {
      success: true,
      message: `${createdTickets.length} ingresso(s) emitido(s) com sucesso e enviados para ${cleanEmail}!`,
      tickets: createdTickets,
    };
  } catch (error: any) {
    console.error("Erro na compra de ingressos:", error);
    return { success: false, error: error.message || "Falha ao processar compra de ingressos." };
  }
}

/**
 * 2. getUserTickets(buyerEmail):
 * Retorna todos os tickets válidos e usados vinculados àquele e-mail.
 */
export async function getUserTickets(buyerEmail: string) {
  try {
    const cleanEmail = buyerEmail?.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, tickets: [] };
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        buyerEmail: cleanEmail,
      },
      include: {
        event: {
          include: {
            tenant: {
              select: { name: true, slug: true, primaryColor: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      tickets: tickets.map((t) => ({
        id: t.id,
        eventId: t.eventId,
        buyerEmail: t.buyerEmail,
        guestName: t.guestName,
        status: t.status, // VALID, USED, CANCELLED
        createdAt: t.createdAt.toISOString(),
        event: {
          id: t.event.id,
          title: t.event.title,
          slogan: t.event.slogan,
          imageUrl: t.event.imageUrl,
          startDate: t.event.startDate.toISOString(),
          endDate: t.event.endDate ? t.event.endDate.toISOString() : null,
          isPaid: t.event.isPaid,
          price: t.event.price,
          tenant: t.event.tenant,
        },
      })),
    };
  } catch (error: any) {
    console.error("Erro ao buscar ingressos:", error);
    return { success: false, error: error.message, tickets: [] };
  }
}

/**
 * 3. validateDoorTicket(ticketId):
 * O "Motor da Catraca Antifraude".
 * - Busca o ingresso pelo ID no banco.
 * - Se não existir: retorna { success: false, message: "QR Code Inválido ou Inexistente." }
 * - Se 'VALID': update atômico para 'USED' e retorna { success: true, message: "Acesso Liberado", guestName }
 * - Se já for 'USED': retorna { success: false, message: "ACESSO NEGADO: Este ingresso já foi validado anteriormente!" }
 */
export async function validateDoorTicket(ticketId: string) {
  try {
    const cleanId = ticketId?.trim();
    if (!cleanId) {
      return { success: false, message: "QR Code Inválido ou não informado." };
    }

    // Busca o ingresso no banco
    const ticket = await prisma.ticket.findUnique({
      where: { id: cleanId },
      include: {
        event: {
          select: {
            title: true,
            startDate: true,
            tenant: { select: { name: true, slug: true } },
          },
        },
      },
    });

    if (!ticket) {
      return {
        success: false,
        message: "QR Code Inválido ou Inexistente.",
      };
    }

    // Se já foi utilizado anteriormente
    if (ticket.status === "USED") {
      return {
        success: false,
        message: "ACESSO NEGADO: Este ingresso já foi validado anteriormente!",
        guestName: ticket.guestName,
        eventTitle: ticket.event.title,
      };
    }

    if (ticket.status === "CANCELLED") {
      return {
        success: false,
        message: "ACESSO NEGADO: Este ingresso foi cancelado!",
        guestName: ticket.guestName,
        eventTitle: ticket.event.title,
      };
    }

    // UPDATE atômico para USED
    const updated = await prisma.ticket.update({
      where: { id: cleanId },
      data: {
        status: "USED",
      },
    });

    try {
      revalidatePath("/", "layout");
      if (ticket.event.tenant?.slug) {
        revalidatePath(`/${ticket.event.tenant.slug}/meus-ingressos`);
      }
    } catch {}

    return {
      success: true,
      message: "Acesso Liberado",
      guestName: ticket.guestName,
      eventTitle: ticket.event.title,
      validatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("Erro na validação do ingresso na catraca:", error);
    return {
      success: false,
      message: "Erro no servidor ao validar ingresso: " + (error.message || "Erro desconhecido"),
    };
  }
}
