import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerSingleUseEbookDeliveryEmail } from "@/app/actions/ebooks";
import {
  getAsaasPayment,
  getAsaasConfig,
  asaasFetch,
  maskEmailForLog,
} from "@/lib/asaas";
import crypto from "crypto";

// Cache em memória de eventos de webhook processados (Proteção Anti-Replay e Idempotência em rajadas concorrentes)
const processedWebhookEvents = new Map<string, number>();
const WEBHOOK_TTL_MS = 15 * 60 * 1000; // 15 minutos

function isDuplicateOrReplayEvent(eventKey: string): boolean {
  const now = Date.now();
  if (processedWebhookEvents.size > 2000) {
    for (const [k, ts] of processedWebhookEvents.entries()) {
      if (now - ts > WEBHOOK_TTL_MS) processedWebhookEvents.delete(k);
    }
  }
  const existing = processedWebhookEvents.get(eventKey);
  if (existing && now - existing < WEBHOOK_TTL_MS) {
    return true;
  }
  processedWebhookEvents.set(eventKey, now);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { event } = payload;
    let payment = payload.payment;

    // 1. Validação Estrita do Token do Webhook do Asaas (Comparação Timing-Safe)
    const webhookSecret = (process.env.ASAAS_WEBHOOK_SECRET || "").trim();
    const incomingToken = (req.headers.get("asaas-access-token") || "").trim();

    if (!webhookSecret) {
      console.error(
        "[Asaas Webhook] CRÍTICO: ASAAS_WEBHOOK_SECRET não está configurado no servidor."
      );
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    let tokenMatches = false;
    if (incomingToken) {
      const a = Buffer.from(incomingToken);
      const b = Buffer.from(webhookSecret);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        tokenMatches = true;
      }
    }

    if (!tokenMatches) {
      console.warn(
        "[Asaas Webhook] Tentativa bloqueada: Header asaas-access-token inválido ou ausente."
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1B. Proteção contra Replay Attack (Deduplicação por ID de evento do Asaas ou chave composta)
    const deduplicationKey =
      payload.id ||
      `${event}:${payment?.id || payload.subscription?.id || "none"}:${payment?.status || ""}`;
    if (isDuplicateOrReplayEvent(deduplicationKey)) {
      return NextResponse.json({
        success: true,
        received: true,
        idempotentSkip: true,
      });
    }

    // 1C. Verificação Server-to-Server na API Oficial do Asaas (Fonte da Verdade)
    // Nunca confiamos cegamente nos valores de `status` ou `value` vindos do JSON do request:
    if (payment?.id) {
      const verifyRes = await getAsaasPayment(payment.id);
      if (!verifyRes.success || !verifyRes.payment) {
        console.warn(
          `[Asaas Webhook] Pagamento ${payment.id} não encontrado na API oficial do Asaas.`
        );
        return NextResponse.json(
          { error: "Unverified payment resource" },
          { status: 400 }
        );
      }
      // Sobrescreve os dados críticos com o registro oficial retornado diretamente pela API do Asaas
      payment = {
        ...payment,
        status: verifyRes.payment.status,
        value: verifyRes.payment.value,
        customer: verifyRes.payment.customer,
        subscription: verifyRes.payment.subscription || payment.subscription,
        billingType: verifyRes.payment.billingType || payment.billingType,
        dueDate: verifyRes.payment.dueDate || payment.dueDate,
        invoiceUrl: verifyRes.payment.invoiceUrl || payment.invoiceUrl,
        bankSlipUrl: verifyRes.payment.bankSlipUrl || payment.bankSlipUrl,
      };
    }

    console.log(`[Asaas Webhook] Evento autenticado: ${event}`, {
      eventId: payload.id,
      paymentId: payment?.id,
      subscriptionId: payment?.subscription,
      status: payment?.status,
    });

    if (!payment && !payload.subscription) {
      return NextResponse.json({
        received: true,
        note: "Sem dados de pagamento/assinatura",
      });
    }

    const customerId = payment?.customer || payload.subscription?.customer;
    const subscriptionId = payment?.subscription || payload.subscription?.id;

    // 2. Busca se o evento pertence a um Pedido de E-book (ou reconstrói caso o banco tenha sido recriado)
    let ebookOrder = payment?.id
      ? await prisma.ebookOrder.findUnique({
          where: { asaasPaymentId: payment.id },
          include: { ebook: true },
        })
      : null;

    if (
      !ebookOrder &&
      payment?.id &&
      (String(payment.externalReference || "").startsWith("EBOOK_") ||
        String(payment.description || "").toLowerCase().includes("e-book"))
    ) {
      const allEbooks = await prisma.ebookProduct.findMany();
      const refId = String(payment.externalReference || "")
        .replace("EBOOK_", "")
        .trim();
      let matchedEbook = allEbooks.find((e) => e.id === refId);
      if (!matchedEbook) {
        matchedEbook = allEbooks.find((e) => {
          const cleanTitle = e.title.split("—")[0].trim().toLowerCase();
          return (
            cleanTitle &&
            String(payment.description || "").toLowerCase().includes(cleanTitle)
          );
        });
      }
      if (!matchedEbook && allEbooks.length > 0) {
        matchedEbook = allEbooks[0];
      }

      if (matchedEbook && payment.customer) {
        const { apiKey, baseUrl } = getAsaasConfig();
        const custRes = await asaasFetch<any>(
          `${baseUrl}/customers/${encodeURIComponent(payment.customer)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              access_token: apiKey,
            },
          }
        );
        if (custRes.ok && custRes.data?.email) {
          const cust = custRes.data;
          ebookOrder = await prisma.ebookOrder.create({
            data: {
              ebookId: matchedEbook.id,
              buyerName: cust.name || "Cliente Horeb",
              buyerEmail: String(cust.email).trim().toLowerCase(),
              buyerCpf: cust.cpfCnpj || "00000000000",
              buyerPhone: cust.mobilePhone || cust.phone || null,
              amount: Number(payment.value || matchedEbook.price || 9.9),
              billingType: payment.billingType || "PIX",
              status: "PENDING",
              asaasCustomerId: payment.customer,
              asaasPaymentId: payment.id,
              invoiceUrl: payment.invoiceUrl || null,
              downloadToken: crypto.randomBytes(24).toString("hex"),
              downloadUsed: false,
              deliveryEmailSent: false,
            },
            include: { ebook: true },
          });
        }
      }
    }

    if (ebookOrder && payment) {
      const rawDate = payment.paymentDate || payment.clientPaymentDate;
      const paymentDate = rawDate ? new Date(rawDate) : new Date();
      const isNowPaid =
        (event === "PAYMENT_CONFIRMED" ||
          event === "PAYMENT_RECEIVED" ||
          payment.status === "RECEIVED" ||
          payment.status === "CONFIRMED") &&
        (payment.status === "RECEIVED" || payment.status === "CONFIRMED");

      if (isNowPaid) {
        // Transição Atômica Idempotente (Garante que apenas 1 webhook concorrente faça a baixa e incremente salesCount)
        const atomicTransition = await prisma.ebookOrder.updateMany({
          where: {
            id: ebookOrder.id,
            status: { notIn: ["RECEIVED", "CONFIRMED"] },
          },
          data: {
            status: payment.status,
            paidAt: ebookOrder.paidAt || paymentDate,
            invoiceUrl: payment.invoiceUrl || ebookOrder.invoiceUrl,
          },
        });

        if (atomicTransition.count > 0) {
          await prisma.ebookProduct.update({
            where: { id: ebookOrder.ebookId },
            data: { salesCount: { increment: 1 } },
          });
        }

        await triggerSingleUseEbookDeliveryEmail(ebookOrder.id).catch((err) => {
          console.error(
            "[Asaas Webhook] Erro ao enviar e-mail de download único:",
            err?.message || "Erro de envio"
          );
        });
        console.log(
          `[Asaas Webhook] Venda de E-book '${ebookOrder.ebook.title}' CONFIRMADA para ${maskEmailForLog(ebookOrder.buyerEmail)}.`
        );
      } else {
        await prisma.ebookOrder.update({
          where: { id: ebookOrder.id },
          data: {
            status: payment.status || ebookOrder.status,
            invoiceUrl: payment.invoiceUrl || ebookOrder.invoiceUrl,
          },
        });
      }

      return NextResponse.json({
        success: true,
        received: true,
        type: "EBOOK_ORDER",
        orderId: ebookOrder.id,
      });
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          ...(subscriptionId ? [{ asaasSubscriptionId: subscriptionId }] : []),
          ...(customerId ? [{ asaasCustomerId: customerId }] : []),
        ],
      },
    });

    let user = null;
    if (!tenant) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(subscriptionId ? [{ toolsAsaasSubscriptionId: subscriptionId }] : []),
            ...(customerId
              ? [{ toolsAsaasCustomerId: customerId }, { asaasCustomerId: customerId }]
              : []),
          ],
        },
      });
    }

    if (!tenant && !user) {
      console.warn(
        `[Asaas Webhook] Nenhum Tenant ou Usuário encontrado para Asaas Customer: ${customerId} ou Subscription: ${subscriptionId}`
      );
      // Retorna 200 para evitar que o Asaas continue reenviando se for um evento de teste
      return NextResponse.json({ received: true, warning: "Tenant ou Usuário não encontrado" });
    }

    // 3. Processamento de Eventos de Pagamento
    if (payment) {
      const rawDate = payment.paymentDate || payment.clientPaymentDate;
      const paymentDate = rawDate ? new Date(rawDate) : null;

      // 3A. Se for Igreja (Tenant - B2B SaaS)
      if (tenant) {
        // Verifica estado anterior da fatura para garantir idempotência (evita ativar 2x em PAYMENT_CONFIRMED + PAYMENT_RECEIVED)
        const existingInvoice = await prisma.subscriptionInvoice.findUnique({
          where: { asaasPaymentId: payment.id },
        });
        const invoiceAlreadySettled =
          existingInvoice?.status === "RECEIVED" ||
          existingInvoice?.status === "CONFIRMED";

        // Upsert no histórico de faturas
        await prisma.subscriptionInvoice.upsert({
          where: { asaasPaymentId: payment.id },
          create: {
            tenantId: tenant.id,
            asaasPaymentId: payment.id,
            amount: payment.value || 0,
            status: payment.status || "PENDING",
            billingType: payment.billingType,
            dueDate: new Date(payment.dueDate),
            paymentDate,
            invoiceUrl: payment.invoiceUrl,
            bankSlipUrl: payment.bankSlipUrl,
            description: payment.description,
          },
          update: {
            amount: payment.value || 0,
            status: payment.status || "PENDING",
            billingType: payment.billingType,
            dueDate: new Date(payment.dueDate),
            paymentDate,
            invoiceUrl: payment.invoiceUrl || undefined,
            bankSlipUrl: payment.bankSlipUrl || undefined,
          },
        });

        // Lógica de Ativação / Confirmação de Pagamento (Mensal ou Anual) — Idempotente por Fatura
        if (
          (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") &&
          (payment.status === "CONFIRMED" || payment.status === "RECEIVED") &&
          !invoiceAlreadySettled
        ) {
          const isYearly =
            tenant.billingCycle === "YEARLY" ||
            payload.subscription?.cycle === "YEARLY";
          const daysToAdd = isYearly ? 370 : 32;

          const baseDate = new Date(payment.dueDate);
          const nextExpiry = new Date(
            baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000
          );

          const finalExpiry =
            nextExpiry.getTime() > Date.now()
              ? nextExpiry
              : new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              status: "ACTIVE",
              billingCycle: isYearly ? "YEARLY" : "MONTHLY",
              subscriptionExpiresAt: finalExpiry,
              billingType: payment.billingType || tenant.billingType,
            },
          });

          console.log(
            `[Asaas Webhook] Igreja '${tenant.name}' ATIVADA (${isYearly ? "ANUAL" : "MENSAL"}) até ${finalExpiry.toISOString()}`
          );
        } else if (event === "PAYMENT_OVERDUE") {
          console.warn(
            `[Asaas Webhook] Cobrança vencida para igreja '${tenant.name}'`
          );
          if (
            tenant.subscriptionExpiresAt &&
            new Date(tenant.subscriptionExpiresAt).getTime() < Date.now()
          ) {
            await prisma.tenant.update({
              where: { id: tenant.id },
              data: { status: "SUSPENDED" },
            });
          }
        } else if (event === "PAYMENT_REFUNDED") {
          console.warn(
            `[Asaas Webhook] Pagamento estornado para igreja '${tenant.name}'`
          );
        }
      }

      // 3B. Se for Usuário Membro (B2C - Minhas Ferramentas / Instagram Studio)
      if (user) {
        let b2cAlreadySettled = false;
        try {
          const existingB2cInvoice = await (
            prisma as any
          ).personalToolInvoice.findUnique({
            where: { asaasPaymentId: payment.id },
          });
          b2cAlreadySettled =
            existingB2cInvoice?.status === "RECEIVED" ||
            existingB2cInvoice?.status === "CONFIRMED";

          await (prisma as any).personalToolInvoice.upsert({
            where: { asaasPaymentId: payment.id },
            create: {
              userId: user.id,
              asaasPaymentId: payment.id,
              amount: payment.value || 0,
              status: payment.status || "PENDING",
              billingType: payment.billingType,
              dueDate: new Date(payment.dueDate),
              paymentDate,
              invoiceUrl: payment.invoiceUrl,
              description: payment.description,
            },
            update: {
              amount: payment.value || 0,
              status: payment.status || "PENDING",
              billingType: payment.billingType,
              dueDate: new Date(payment.dueDate),
              paymentDate,
              invoiceUrl: payment.invoiceUrl || undefined,
            },
          });
        } catch (invoiceErr: any) {
          console.warn(
            "[Asaas Webhook] Aviso ao registrar PersonalToolInvoice:",
            invoiceErr?.message
          );
        }

        if (
          (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") &&
          (payment.status === "CONFIRMED" || payment.status === "RECEIVED") &&
          !b2cAlreadySettled
        ) {
          const isYearly =
            payload.subscription?.cycle === "YEARLY" ||
            (payment.value && payment.value >= 180);
          const daysToAdd = isYearly ? 370 : 32;
          const baseDate = payment.dueDate
            ? new Date(payment.dueDate)
            : new Date();
          const candidateExpiry = new Date(
            baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000
          );
          const finalExpiry =
            candidateExpiry.getTime() > Date.now()
              ? candidateExpiry
              : new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

          await prisma.user.update({
            where: { id: user.id },
            data: {
              hasToolsSubscription: true,
              toolsSubscriptionStatus: "ACTIVE",
              toolsSubscriptionExpiresAt: finalExpiry,
            } as any,
          });

          console.log(
            `[Asaas Webhook] Usuário ID '${user.id}' ATIVADO no módulo B2C até ${finalExpiry.toISOString()}`
          );
        } else if (event === "PAYMENT_OVERDUE") {
          console.warn(
            `[Asaas Webhook] Fatura B2C vencida para o usuário ID '${user.id}'`
          );
          if (
            (user as any).toolsSubscriptionExpiresAt &&
            new Date((user as any).toolsSubscriptionExpiresAt).getTime() <
              Date.now()
          ) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                hasToolsSubscription: false,
                toolsSubscriptionStatus: "OVERDUE",
              } as any,
            });
          }
        }
      }
    }

    // 4. Processamento de Eventos de Assinatura (Cancelamento / Inativação)
    if (
      event === "SUBSCRIPTION_INACTIVATED" ||
      event === "SUBSCRIPTION_DELETED"
    ) {
      if (tenant) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            status: "CANCELLED",
          },
        });
        console.log(
          `[Asaas Webhook] Assinatura da igreja '${tenant.name}' cancelada/inativada.`
        );
      }

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            hasToolsSubscription: false,
            toolsSubscriptionStatus: "CANCELLED",
          } as any,
        });
        console.log(
          `[Asaas Webhook] Assinatura B2C do usuário ID '${user.id}' cancelada/inativada.`
        );
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error(
      "[Asaas Webhook Error]:",
      error?.message || "Erro interno no webhook"
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
