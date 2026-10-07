"use server";

import { prisma } from "@/lib/prisma";
import {
  getAsaasConfig,
  getOrCreateAsaasCustomer,
  createAsaasSubscription,
  listAsaasSubscriptionPayments,
  getAsaasPaymentPixQrCode,
  cancelAsaasSubscription,
} from "@/lib/asaas";
import { revalidatePath } from "next/cache";

/**
 * Retorna o status da configuração do Asaas
 */
export async function getAsaasIntegrationStatus() {
  const config = getAsaasConfig();
  return {
    isConfigured: config.isConfigured,
    environment: config.env,
  };
}

/**
 * 1. Cria ou Atualiza a Assinatura da Igreja no Asaas
 * Suporta ciclo MENSAL e ANUAL, além de aplicação de Cupom/Palavra-chave de Desconto.
 */
export async function createTenantSubscription(params: {
  tenantId: string;
  cpfCnpj: string;
  customerEmail: string;
  customerPhone?: string;
  billingType?: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  planSlug?: string;
  monthlyPrice?: number;
  billingCycle?: "MONTHLY" | "YEARLY";
  couponCode?: string;
}) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada" };
    }

    const { isConfigured } = getAsaasConfig();
    if (!isConfigured) {
      return {
        success: false,
        error:
          "Chave de API do Asaas não configurada. Defina ASAAS_API_KEY no arquivo .env do servidor.",
      };
    }

    const activePlan = params.planSlug || tenant.plan || "GESTAO";
    const cycle = params.billingCycle || (tenant.billingCycle as "MONTHLY" | "YEARLY") || "MONTHLY";

    // 1. Definição do Preço Base (Mensal ou Anual)
    let basePrice = params.monthlyPrice || tenant.monthlyPrice || 249;
    
    // Se for Anual, calcula o valor do plano anual (10 meses em vez de 12 = 2 meses grátis)
    let finalPrice = cycle === "YEARLY" ? basePrice * 10 : basePrice;

    // 2. Aplicação de Palavra-chave / Cupom de Desconto (se fornecido)
    let appliedCoupon: string | null = null;
    let appliedDiscountPercent = 0;

    if (params.couponCode?.trim()) {
      const cleanCode = params.couponCode.trim().toUpperCase().replace(/\s+/g, "");
      const coupon = await prisma.discountCoupon.findUnique({
        where: { code: cleanCode },
      });

      if (coupon && coupon.active) {
        const notExpired = !coupon.validUntil || new Date(coupon.validUntil).getTime() > Date.now();
        const hasUses = !coupon.maxUses || coupon.usedCount < coupon.maxUses;

        if (notExpired && hasUses) {
          appliedCoupon = coupon.code;
          appliedDiscountPercent = coupon.discountPercent;
          finalPrice = Math.round(finalPrice * (1 - coupon.discountPercent / 100));

          // Incrementa uso do cupom
          await prisma.discountCoupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }

    // 3. Cadastra ou recupera o cliente no Asaas
    const customerRes = await getOrCreateAsaasCustomer({
      name: tenant.name,
      cpfCnpj: params.cpfCnpj,
      email: params.customerEmail,
      phone: params.customerPhone || tenant.phone || undefined,
      externalReference: tenant.id,
    });

    if (!customerRes.success || !customerRes.customer) {
      return {
        success: false,
        error: customerRes.error || "Não foi possível criar o cliente no Asaas",
      };
    }

    const asaasCustomer = customerRes.customer;

    // Atualiza o Tenant com o ID do cliente Asaas, Plano, Ciclo e Desconto
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        asaasCustomerId: asaasCustomer.id,
        billingType: params.billingType || "UNDEFINED",
        plan: activePlan,
        billingCycle: cycle,
        monthlyPrice: cycle === "MONTHLY" ? finalPrice : Math.round(finalPrice / 12),
        couponCode: appliedCoupon,
        discountPercent: appliedDiscountPercent,
      },
    });

    // 4. Se já tinha uma assinatura ativa anterior, cancela no Asaas antes de criar a nova
    if (tenant.asaasSubscriptionId) {
      try {
        await cancelAsaasSubscription(tenant.asaasSubscriptionId);
      } catch (err) {
        console.warn("Aviso ao cancelar assinatura anterior:", err);
      }
    }

    // 5. Define a data do primeiro vencimento respeitando a degustação gratuita de 30 dias
    const now = new Date();
    let dueDate = new Date();

    if (tenant.subscriptionExpiresAt && new Date(tenant.subscriptionExpiresAt) > now) {
      // Se ainda está no período de teste, a 1ª fatura no Asaas só vence no término do teste
      dueDate = new Date(tenant.subscriptionExpiresAt);
    } else {
      // Degustação de 30 dias gratuitos a partir de agora sem cobrança imediata
      dueDate.setDate(now.getDate() + 30);
    }

    const dueDateStr = dueDate.toISOString().split("T")[0];

    const cycleLabel = cycle === "YEARLY" ? "ANUAL" : "MENSAL";
    const discountLabel = appliedDiscountPercent > 0 ? ` (${appliedDiscountPercent}% OFF - ${appliedCoupon})` : "";
    const description = `Assinatura ${cycleLabel} Horeb Sistema Eclesiástico - Plano ${activePlan}${discountLabel} (${tenant.name})`;

    // 6. Cria a assinatura recorrente no Asaas (Mensal ou Anual)
    const subRes = await createAsaasSubscription({
      customerId: asaasCustomer.id,
      value: finalPrice,
      nextDueDate: dueDateStr,
      description,
      billingType: params.billingType || "UNDEFINED",
      cycle: cycle === "YEARLY" ? "YEARLY" : "MONTHLY",
    });

    if (!subRes.success || !subRes.subscription) {
      return {
        success: false,
        error: subRes.error || "Não foi possível gerar a assinatura no Asaas",
      };
    }

    const subscription = subRes.subscription;

    // Salva o ID da nova assinatura no Tenant e atualiza a validade do período
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        asaasSubscriptionId: subscription.id,
        subscriptionExpiresAt: dueDate,
      },
    });

    // 7. Busca as cobranças geradas dessa assinatura para obter link e QR Code
    let firstPaymentInfo: {
      invoiceUrl?: string;
      bankSlipUrl?: string;
      pixQrCode?: string;
      pixQrCodeImage?: string;
      dueDate?: string;
      amount?: number;
    } = {};

    const paymentsRes = await listAsaasSubscriptionPayments(subscription.id);
    if (paymentsRes.success && paymentsRes.payments && paymentsRes.payments.length > 0) {
      const firstPayment = paymentsRes.payments[0];

      // Busca o PIX Copia-e-Cola e Imagem QR Code
      const pixRes = await getAsaasPaymentPixQrCode(firstPayment.id);

      // Salva no banco de dados como fatura pendente
      await prisma.subscriptionInvoice.upsert({
        where: { asaasPaymentId: firstPayment.id },
        create: {
          tenantId: tenant.id,
          asaasPaymentId: firstPayment.id,
          amount: firstPayment.value,
          status: firstPayment.status,
          billingType: firstPayment.billingType,
          dueDate: new Date(firstPayment.dueDate),
          invoiceUrl: firstPayment.invoiceUrl,
          bankSlipUrl: firstPayment.bankSlipUrl,
          pixQrCode: pixRes.success ? pixRes.pix?.payload : null,
          pixQrCodeImage: pixRes.success ? pixRes.pix?.encodedImage : null,
          description: firstPayment.description,
        },
        update: {
          amount: firstPayment.value,
          status: firstPayment.status,
          dueDate: new Date(firstPayment.dueDate),
          invoiceUrl: firstPayment.invoiceUrl,
          bankSlipUrl: firstPayment.bankSlipUrl,
          pixQrCode: pixRes.success ? pixRes.pix?.payload : null,
          pixQrCodeImage: pixRes.success ? pixRes.pix?.encodedImage : null,
        },
      });

      firstPaymentInfo = {
        invoiceUrl: firstPayment.invoiceUrl,
        bankSlipUrl: firstPayment.bankSlipUrl,
        pixQrCode: pixRes.success ? pixRes.pix?.payload : undefined,
        pixQrCodeImage: pixRes.success ? pixRes.pix?.encodedImage : undefined,
        dueDate: firstPayment.dueDate,
        amount: firstPayment.value,
      };
    }

    revalidatePath("/admin");
    return {
      success: true,
      customerId: asaasCustomer.id,
      subscriptionId: subscription.id,
      firstPayment: firstPaymentInfo,
      appliedDiscount: appliedDiscountPercent,
      cycle,
      finalPrice,
    };
  } catch (error: any) {
    console.error("Erro ao criar assinatura Asaas:", error);
    return { success: false, error: error.message || "Erro interno ao processar assinatura" };
  }
}

/**
 * 2. Consulta Informações Detalhadas de Assinatura e Faturas de uma Igreja
 */
export async function getTenantSubscriptionDetails(tenantId: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        invoices: {
          orderBy: { dueDate: "desc" },
          take: 12,
        },
      },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada" };
    }

    return {
      success: true,
      data: {
        tenantId: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        status: tenant.status,
        monthlyPrice: tenant.monthlyPrice,
        billingCycle: tenant.billingCycle || "MONTHLY",
        couponCode: tenant.couponCode,
        discountPercent: tenant.discountPercent,
        subscriptionExpiresAt: tenant.subscriptionExpiresAt,
        asaasCustomerId: tenant.asaasCustomerId,
        asaasSubscriptionId: tenant.asaasSubscriptionId,
        billingType: tenant.billingType,
        invoices: tenant.invoices,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 3. Cancela a Assinatura no Asaas
 */
export async function cancelTenantSubscriptionAction(tenantId: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada" };
    }

    if (tenant.asaasSubscriptionId) {
      await cancelAsaasSubscription(tenant.asaasSubscriptionId);
    }

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: "CANCELLED",
      },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 4. Sincroniza faturas diretamente da API do Asaas
 */
export async function syncTenantAsaasInvoices(tenantId: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || !tenant.asaasSubscriptionId) {
      return { success: false, error: "Igreja sem assinatura ativa no Asaas" };
    }

    const paymentsRes = await listAsaasSubscriptionPayments(tenant.asaasSubscriptionId);
    if (!paymentsRes.success || !paymentsRes.payments) {
      return { success: false, error: paymentsRes.error || "Erro ao consultar faturas no Asaas" };
    }

    for (const payment of paymentsRes.payments) {
      const rawDate = payment.paymentDate || payment.clientPaymentDate;
      const paymentDate = rawDate ? new Date(rawDate) : null;

      await prisma.subscriptionInvoice.upsert({
        where: { asaasPaymentId: payment.id },
        create: {
          tenantId: tenant.id,
          asaasPaymentId: payment.id,
          amount: payment.value,
          status: payment.status,
          billingType: payment.billingType,
          dueDate: new Date(payment.dueDate),
          paymentDate,
          invoiceUrl: payment.invoiceUrl,
          bankSlipUrl: payment.bankSlipUrl,
          description: payment.description,
        },
        update: {
          amount: payment.value,
          status: payment.status,
          billingType: payment.billingType,
          dueDate: new Date(payment.dueDate),
          paymentDate,
          invoiceUrl: payment.invoiceUrl || undefined,
          bankSlipUrl: payment.bankSlipUrl || undefined,
        },
      });
    }

    revalidatePath("/admin");
    return { success: true, count: paymentsRes.payments.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 5. Painel Executivo SuperAdmin: Métricas Financeiras SaaS, Inadimplência e Projeções
 */
export async function getSaaSFinancialMetrics() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        invoices: {
          orderBy: { dueDate: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const coupons = await prisma.discountCoupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Contadores por Status
    const activeTenants = tenants.filter((t) => t.status === "ACTIVE");
    const trialTenants = tenants.filter((t) => t.status === "TRIAL");
    const suspendedTenants = tenants.filter((t) => t.status === "SUSPENDED");
    const cancelledTenants = tenants.filter((t) => t.status === "CANCELLED");

    // Cálculo do MRR (Monthly Recurring Revenue)
    const mrr = activeTenants.reduce((acc, t) => {
      const price = t.monthlyPrice || 249;
      return acc + price;
    }, 0);

    // ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Inadimplência: Faturas com status OVERDUE
    const overdueInvoices = await prisma.subscriptionInvoice.findMany({
      where: { status: "OVERDUE" },
      include: { tenant: { select: { name: true, slug: true, pastorName: true, phone: true } } },
    });

    const totalOverdueAmount = overdueInvoices.reduce((acc, inv) => acc + inv.amount, 0);

    // Projeções Financeiras baseadas no Ticket Médio Real (ou R$ 249 padrão)
    const averageTicket = activeTenants.length > 0 ? Math.round(mrr / activeTenants.length) : 249;

    const projections = [
      { goal: "Primeira Meta (25 Igrejas)", churches: 25, mrr: 25 * averageTicket, arr: 25 * averageTicket * 12 },
      { goal: "Expansão (50 Igrejas)", churches: 50, mrr: 50 * averageTicket, arr: 50 * averageTicket * 12 },
      { goal: "Centena (100 Igrejas)", churches: 100, mrr: 100 * averageTicket, arr: 100 * averageTicket * 12 },
      { goal: "Escala Nacional (250 Igrejas)", churches: 250, mrr: 250 * averageTicket, arr: 250 * averageTicket * 12 },
      { goal: "Liderança de Mercado (500 Igrejas)", churches: 500, mrr: 500 * averageTicket, arr: 500 * averageTicket * 12 },
    ];

    return {
      success: true,
      metrics: {
        totalTenants: tenants.length,
        activeCount: activeTenants.length,
        trialCount: trialTenants.length,
        suspendedCount: suspendedTenants.length,
        cancelledCount: cancelledTenants.length,
        mrr,
        arr,
        averageTicket,
        overdueCount: overdueInvoices.length,
        totalOverdueAmount,
      },
      projections,
      overdueInvoices,
      tenants,
      coupons,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
