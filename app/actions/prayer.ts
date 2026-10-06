"use server";

import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { sendPrayerResponseEmail } from "@/lib/mail";

export interface SubmitPrayerParams {
  tenantSlug: string;
  authorName?: string;
  authorEmail?: string;
  authorPhone?: string;
  content: string;
  isAnonymous?: boolean;
}

/**
 * 1. Enviar Pedido de Oração (Público ou Membro)
 */
export async function submitPrayerRequest(params: SubmitPrayerParams) {
  const { tenantSlug, authorName, authorEmail, authorPhone, content, isAnonymous } = params;

  if (!content || content.trim().length < 5) {
    return {
      success: false,
      error: "O pedido de oração deve ter pelo menos 5 caracteres.",
    };
  }

  try {
    const cleanContent = isAnonymous
      ? `[Anônimo] ${content.trim()}`
      : `${authorName ? `[${authorName}] ` : ""}${content.trim()}`;

    // 1. Salvar no Prisma (Local)
    const localTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, name: true },
    });

    if (localTenant?.id) {
      await prisma.prayerRequest.create({
        data: {
          tenantId: localTenant.id,
          content: cleanContent,
          authorName: isAnonymous ? "Anônimo" : (authorName?.trim() || null),
          authorEmail: isAnonymous ? null : (authorEmail?.trim()?.toLowerCase() || null),
          authorPhone: isAnonymous ? null : (authorPhone?.trim() || null),
          isAnonymous: !!isAnonymous,
          status: "PENDING",
        },
      });
    }

    // 2. Sincronizar com Supabase se disponível
    try {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", tenantSlug)
        .single();

      if (tenant?.id) {
        await supabase.from("prayer_requests").insert({
          tenant_id: tenant.id,
          author_name: isAnonymous ? "Anônimo" : authorName || "Membro da Igreja",
          content: content.trim(),
          is_anonymous: !!isAnonymous,
          status: "PENDING",
        });
      }
    } catch (sbErr) {
      console.warn("Supabase prayer sync warning:", sbErr);
    }

    try {
      revalidatePath(`/${tenantSlug}`);
      revalidatePath(`/${tenantSlug}/admin/oracoes`);
    } catch {}

    return {
      success: true,
      message: "Seu pedido de oração foi enviado com sucesso! Nossos pastores e intercessores estarão orando por você.",
    };
  } catch (error) {
    console.error("Erro ao registrar pedido de oração:", error);
    return {
      success: false,
      error: "Não foi possível registrar o pedido de oração. Tente novamente.",
    };
  }
}

/**
 * 2. Obter Todos os Pedidos de Oração da Igreja (Para Pastores e Administradores)
 */
export async function getChurchPrayerRequests(slug: string) {
  try {
    const session = await getSession();
    const isLeadership =
      session?.role === "ADMIN" ||
      session?.role === "PASTOR" ||
      session?.role === "SUPERADMIN";

    if (!isLeadership) {
      return { success: false, error: "Acesso restrito à liderança pastoral e administração." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const requests = await prisma.prayerRequest.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });

    const counts = {
      total: requests.length,
      pending: requests.filter((r) => r.status === "PENDING" || r.status === "ACTIVE").length,
      praying: requests.filter((r) => r.status === "PRAYING").length,
      answered: requests.filter((r) => r.status === "ANSWERED").length,
    };

    return {
      success: true,
      tenant,
      requests,
      counts,
      currentUserRole: session?.role || "MEMBER",
      currentUserName: session?.name || "Pastor",
    };
  } catch (error: any) {
    console.error("Erro ao buscar pedidos de oração:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 3. Responder ao Pedido de Oração e Enviar Palavra Pastoral (com Notificação por E-mail)
 */
export async function respondToPrayerRequest(params: {
  requestId: string;
  responseMessage: string;
  slug: string;
}) {
  try {
    const session = await getSession();
    const isLeadership =
      session?.role === "ADMIN" ||
      session?.role === "PASTOR" ||
      session?.role === "SUPERADMIN";

    if (!isLeadership) {
      return { success: false, error: "Apenas pastores e administradores podem enviar respostas pastorais." };
    }

    if (!params.responseMessage || params.responseMessage.trim().length < 5) {
      return { success: false, error: "A mensagem pastoral de resposta deve ter pelo menos 5 caracteres." };
    }

    const request = await prisma.prayerRequest.findUnique({
      where: { id: params.requestId },
      include: { tenant: true },
    });

    if (!request) {
      return { success: false, error: "Pedido de oração não encontrado." };
    }

    const pastorName = session?.name || "Pastor da Igreja";
    const cleanResponse = params.responseMessage.trim();

    // 1. Atualizar o pedido no banco
    const updatedRequest = await prisma.prayerRequest.update({
      where: { id: params.requestId },
      data: {
        responseMessage: cleanResponse,
        respondedBy: pastorName,
        respondedAt: new Date(),
        status: "ANSWERED",
      },
    });

    // 2. Se o autor tiver e-mail cadastrado, enviar e-mail com a palavra pastoral
    let emailSent = false;
    if (request.authorEmail && !request.isAnonymous) {
      const mailRes = await sendPrayerResponseEmail({
        to: request.authorEmail,
        recipientName: request.authorName || undefined,
        churchName: request.tenant.name,
        churchSlug: request.tenant.slug,
        pastorName,
        prayerContent: request.content.replace(/^\[.*?\]\s*/, ""),
        responseMessage: cleanResponse,
        primaryColor: request.tenant.primaryColor,
        logoUrl: request.tenant.logoUrl,
      });

      if (mailRes.success) {
        emailSent = true;
        try {
          await prisma.emailLog.create({
            data: {
              type: "OUTGOING",
              from: "suporte@lynxems.com.br",
              to: request.authorEmail,
              subject: `Resposta Pastoral: ${request.tenant.name}`,
              snippet: `O ${pastorName} orou e respondeu ao seu pedido de oração.`,
              status: "SENT",
            },
          });
        } catch {}
      }
    }

    try {
      revalidatePath(`/${params.slug}/admin/oracoes`);
      revalidatePath(`/${params.slug}`);
    } catch {}

    return {
      success: true,
      request: updatedRequest,
      emailSent,
      message: emailSent
        ? `Resposta pastoral salva e e-mail de bênção enviado para ${request.authorEmail}!`
        : "Resposta pastoral registrada com sucesso no sistema!",
    };
  } catch (error: any) {
    console.error("Erro ao responder pedido de oração:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 4. Atualizar Status do Pedido (PENDING, PRAYING, ANSWERED)
 */
export async function updatePrayerStatus(requestId: string, status: string, slug: string) {
  try {
    const session = await getSession();
    const isLeadership =
      session?.role === "ADMIN" ||
      session?.role === "PASTOR" ||
      session?.role === "SUPERADMIN";

    if (!isLeadership) {
      return { success: false, error: "Permissão insuficiente." };
    }

    const updated = await prisma.prayerRequest.update({
      where: { id: requestId },
      data: { status },
    });

    try {
      revalidatePath(`/${slug}/admin/oracoes`);
      revalidatePath(`/${slug}`);
    } catch {}

    return { success: true, request: updated };
  } catch (error: any) {
    console.error("Erro ao atualizar status do pedido de oração:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 5. Excluir Pedido de Oração
 */
export async function deletePrayerRequest(requestId: string, slug: string) {
  try {
    const session = await getSession();
    const isLeadership =
      session?.role === "ADMIN" ||
      session?.role === "PASTOR" ||
      session?.role === "SUPERADMIN";

    if (!isLeadership) {
      return { success: false, error: "Permissão insuficiente." };
    }

    await prisma.prayerRequest.delete({
      where: { id: requestId },
    });

    try {
      revalidatePath(`/${slug}/admin/oracoes`);
      revalidatePath(`/${slug}`);
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir pedido de oração:", error);
    return { success: false, error: error.message };
  }
}
