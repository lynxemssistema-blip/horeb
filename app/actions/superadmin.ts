"use server";

import { prisma } from "@/lib/prisma";
import { mailTransporter, testSmtpConnection } from "@/lib/mail";
import { fetchInboxEmails, testImapConnection } from "@/lib/imap";
import { revalidatePath } from "next/cache";

// 1. Métricas do SaaS Horeb para o Super Admin
export async function getSuperAdminMetrics() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        users: true,
        transactions: true,
        branches: true,
      },
    });

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;
    const suspendedTenants = tenants.filter((t) => t.status === "SUSPENDED").length;
    const trialTenants = tenants.filter((t) => t.status === "TRIAL").length;

    // Calcular MRR (Receita Recorrente Mensal)
    const mrr = tenants
      .filter((t) => t.status === "ACTIVE")
      .reduce((acc, t) => acc + (t.monthlyPrice || 249), 0);

    const totalUsers = await prisma.user.count();
    const verifiedUsers = await prisma.user.count({ where: { isEmailVerified: true } });

    const totalTransactions = await prisma.transaction.aggregate({
      _sum: { amount: true },
      _count: true,
    });

    return {
      success: true,
      metrics: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        trialTenants,
        mrr,
        totalUsers,
        verifiedUsers,
        totalDonationsAmount: totalTransactions._sum.amount || 0,
        totalDonationsCount: totalTransactions._count,
      },
    };
  } catch (error: any) {
    console.error("Erro ao buscar métricas do Super Admin:", error);
    return { success: false, error: error.message };
  }
}

// 2. Buscar todas as congregações cadastradas
export async function getAllTenants() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        branches: { select: { id: true, name: true, slug: true } },
        users: { select: { id: true, name: true, email: true, role: true, isEmailVerified: true } },
        _count: { select: { cellGroups: true, transactions: true, users: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, tenants };
  } catch (error: any) {
    return { success: false, tenants: [], error: error.message };
  }
}

// 3. Atualizar assinatura / status / plano de uma congregação
export async function updateTenantSubscription({
  tenantId,
  plan,
  status,
  monthlyPrice,
  setupPrice,
}: {
  tenantId: string;
  plan: string;
  status: string;
  monthlyPrice: number;
  setupPrice: number;
}) {
  try {
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        status,
        monthlyPrice,
        setupPrice,
      },
    });

    revalidatePath("/admin");
    revalidatePath(`/${updated.slug}`);
    return { success: true, tenant: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Buscar e Gerenciar Planos Comerciais
export async function getAllPlans() {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { monthlyPrice: "asc" },
    });
    return { success: true, plans };
  } catch (error: any) {
    return { success: false, plans: [], error: error.message };
  }
}

export async function createOrUpdatePlan(data: {
  id?: string;
  slug: string;
  name: string;
  subtitle?: string;
  badge?: string;
  setupPrice: number;
  monthlyPrice: number;
  targetAudience?: string;
  features: string[];
  highlight?: boolean;
  active?: boolean;
}) {
  try {
    const featuresJson = JSON.stringify(data.features || []);

    if (data.id) {
      const plan = await prisma.plan.update({
        where: { id: data.id },
        data: {
          slug: data.slug,
          name: data.name,
          subtitle: data.subtitle,
          badge: data.badge || null,
          setupPrice: data.setupPrice,
          monthlyPrice: data.monthlyPrice,
          targetAudience: data.targetAudience,
          features: featuresJson,
          highlight: data.highlight ?? false,
          active: data.active ?? true,
        },
      });
      revalidatePath("/admin");
      revalidatePath("/");
      return { success: true, plan };
    } else {
      const plan = await prisma.plan.create({
        data: {
          slug: data.slug,
          name: data.name,
          subtitle: data.subtitle,
          badge: data.badge || null,
          setupPrice: data.setupPrice,
          monthlyPrice: data.monthlyPrice,
          targetAudience: data.targetAudience,
          features: featuresJson,
          highlight: data.highlight ?? false,
          active: data.active ?? true,
        },
      });
      revalidatePath("/admin");
      revalidatePath("/");
      return { success: true, plan };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePlan(planId: string) {
  try {
    await prisma.plan.delete({ where: { id: planId } });
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Gestão Global de Usuários
export async function getAllUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, users };
  } catch (error: any) {
    return { success: false, users: [], error: error.message };
  }
}

export async function manuallyVerifyUser(userId: string) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    revalidatePath("/admin");
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 6. Central de E-mails (Entrada e Saída)
export async function getEmailCenterData() {
  try {
    // 1. Logs de E-mails Enviados / Registrados
    const emailLogs = await prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 2. Buscar Mensagens Reais da Caixa de Entrada (IMAP Hostinger)
    const imapResult = await fetchInboxEmails(15);

    return {
      success: true,
      logs: emailLogs,
      inbox: imapResult.messages || [],
      inboxTotal: imapResult.total || 0,
      imapConnected: imapResult.success,
      imapError: imapResult.error,
    };
  } catch (error: any) {
    return {
      success: false,
      logs: [],
      inbox: [],
      error: error.message,
    };
  }
}

// 7. Enviar E-mail Direto da Central
export async function sendDirectEmail({
  to,
  subject,
  htmlContent,
}: {
  to: string;
  subject: string;
  htmlContent: string;
}) {
  try {
    const res = await mailTransporter.sendMail({
      from: `"Horeb Suporte & Gestão" <suporte@lynxems.com.br>`,
      to,
      subject,
      html: htmlContent,
    });

    await prisma.emailLog.create({
      data: {
        type: "OUTGOING",
        from: "suporte@lynxems.com.br",
        to,
        subject,
        snippet: htmlContent.slice(0, 150).replace(/<[^>]*>/g, ""),
        status: "SENT",
      },
    });

    return { success: true, messageId: res.messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 8. Testar Conexão de E-mail (SMTP e IMAP)
export async function testEmailDiagnostics() {
  const smtpRes = await testSmtpConnection();
  const imapRes = await testImapConnection();

  return {
    smtp: smtpRes,
    imap: imapRes,
  };
}
