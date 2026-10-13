import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 1. Validação de Segurança do Token do Webhook do Asaas
    const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;
    const incomingToken = req.headers.get("asaas-access-token");

    if (webhookSecret && incomingToken !== webhookSecret) {
      console.warn("[Asaas Webhook] Token de autorização inválido ou ausente.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const { event, payment } = payload;

    console.log(`[Asaas Webhook] Evento recebido: ${event}`, {
      paymentId: payment?.id,
      subscriptionId: payment?.subscription,
      customer: payment?.customer,
      value: payment?.value,
      status: payment?.status,
    });

    if (!payment && !payload.subscription) {
      return NextResponse.json({ received: true, note: "Sem dados de pagamento/assinatura" });
    }

    const customerId = payment?.customer || payload.subscription?.customer;
    const subscriptionId = payment?.subscription || payload.subscription?.id;

    // 2. Busca se o evento pertence a uma Igreja (Tenant - B2B) ou a um Usuário Membro (User - B2C)
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
            ...(customerId ? [{ toolsAsaasCustomerId: customerId }] : []),
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

        // Lógica de Ativação / Confirmação de Pagamento
        if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
          const baseDate = new Date(payment.dueDate);
          const nextExpiry = new Date(baseDate.getTime() + 32 * 24 * 60 * 60 * 1000);

          const finalExpiry =
            nextExpiry.getTime() > Date.now()
              ? nextExpiry
              : new Date(Date.now() + 32 * 24 * 60 * 60 * 1000);

          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              status: "ACTIVE",
              subscriptionExpiresAt: finalExpiry,
              billingType: payment.billingType || tenant.billingType,
            },
          });

          console.log(
            `[Asaas Webhook] Igreja '${tenant.name}' ATIVADA até ${finalExpiry.toISOString()}`
          );
        } else if (event === "PAYMENT_OVERDUE") {
          console.warn(`[Asaas Webhook] Cobrança vencida para igreja '${tenant.name}'`);
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
          console.warn(`[Asaas Webhook] Pagamento estornado para igreja '${tenant.name}'`);
        }
      }

      // 3B. Se for Usuário Membro (B2C - Minhas Ferramentas / Instagram Studio)
      if (user) {
        try {
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
        } catch (invoiceErr) {
          console.warn("[Asaas Webhook] Aviso ao registrar PersonalToolInvoice:", invoiceErr);
        }

        if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
          // Determina se é plano anual pelo valor (> R$ 100) ou ciclo
          const isYearly = payload.subscription?.cycle === "YEARLY" || (payment.value && payment.value > 100);
          const daysToAdd = isYearly ? 370 : 32;
          const finalExpiry = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

          await prisma.user.update({
            where: { id: user.id },
            data: {
              hasToolsSubscription: true,
              toolsSubscriptionStatus: "ACTIVE",
              toolsSubscriptionExpiresAt: finalExpiry,
            } as any,
          });

          console.log(
            `[Asaas Webhook] Usuário '${user.name}' ATIVADO no módulo B2C até ${finalExpiry.toISOString()}`
          );
        } else if (event === "PAYMENT_OVERDUE") {
          console.warn(`[Asaas Webhook] Fatura B2C vencida para o usuário '${user.name}'`);
          if (
            (user as any).toolsSubscriptionExpiresAt &&
            new Date((user as any).toolsSubscriptionExpiresAt).getTime() < Date.now()
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
    if (event === "SUBSCRIPTION_INACTIVATED" || event === "SUBSCRIPTION_DELETED") {
      if (tenant) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            status: "CANCELLED",
          },
        });
        console.log(`[Asaas Webhook] Assinatura da igreja '${tenant.name}' cancelada/inativada.`);
      }

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            hasToolsSubscription: false,
            toolsSubscriptionStatus: "CANCELLED",
          } as any,
        });
        console.log(`[Asaas Webhook] Assinatura B2C do usuário '${user.name}' cancelada/inativada.`);
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error("[Asaas Webhook Error]:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno processando webhook" },
      { status: 500 }
    );
  }
}
