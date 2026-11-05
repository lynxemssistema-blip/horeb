"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { mailTransporter, testSmtpConnection, getMailSender } from "@/lib/mail";
import { fetchInboxEmails, testImapConnection } from "@/lib/imap";
import { revalidatePath } from "next/cache";

/**
 * Guarda exclusiva para garantir que apenas o Super Administrador execute ações globais
 */
async function requireSuperAdmin() {
  const session = await getSession();
  const isSuper = session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";
  if (!isSuper) {
    throw new Error("Acesso negado: Operação restrita ao Super Administrador da plataforma.");
  }
  return session;
}

// 1. Métricas do SaaS Horeb para o Super Admin
export async function getSuperAdminMetrics() {
  try {
    await requireSuperAdmin();
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        status: true,
        asaasSubscriptionId: true,
        monthlyPrice: true,
      },
    });

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;
    const suspendedTenants = tenants.filter((t) => t.status === "SUSPENDED").length;
    const trialTenants = tenants.filter((t) => t.status === "TRIAL").length;

    // Calcular MRR (Receita Recorrente Mensal Real)
    const mrr = tenants
      .filter((t) => t.status === "ACTIVE" && t.asaasSubscriptionId)
      .reduce((acc, t) => acc + (t.monthlyPrice || 0), 0);

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
    await requireSuperAdmin();
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
    await requireSuperAdmin();
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

// 4. Buscar e Gerenciar Planos Comerciais (com auto-seed caso o banco esteja novo)
const INITIAL_DEFAULT_PLANS = [
  {
    slug: "essencial",
    name: "Essencial",
    subtitle: "Para igrejas pequenas e comunidades em formação",
    badge: null as string | null,
    setupPrice: 490,
    monthlyPrice: 149,
    annualPrice: 1490,
    targetAudience: "Até ~150 membros",
    features: JSON.stringify([
      "Cadastro e gestão de membros e visitantes",
      "Área do membro personalizada (PWA no celular)",
      "Mural de comunicados e avisos oficiais",
      "Agenda de cultos e eventos semanais",
      "Pedidos de oração interativos",
      "Conteúdos e devocionais diários",
      "Módulo Dízimos e Ofertas via PIX Instantâneo",
      "Notificações para membros",
      "Painel administrativo para liderança",
      "Suporte técnico via WhatsApp",
    ]),
    highlight: false,
    active: true,
  },
  {
    slug: "gestao",
    name: "Gestão",
    subtitle: "O plano principal para igrejas médias em franco crescimento",
    badge: "MAIS ESCOLHIDO",
    setupPrice: 790,
    monthlyPrice: 249,
    annualPrice: 2490,
    targetAudience: "Igrejas de 150 a 600 membros",
    features: JSON.stringify([
      "TUDO do Plano Essencial, mais:",
      "Gestão completa de Ministérios e Líderes",
      "Células e Pequenos Grupos nos lares",
      "Escalas de equipes, louvor e diaconia",
      "Controle de presença em cultos e células",
      "Gestão de eventos e inscrições",
      "Gestão Financeira completa (entradas, saídas e relatórios)",
      "Segmentação inteligente de membros",
      "Notificações segmentadas por grupos/ministérios",
      "Suporte prioritário ágil",
    ]),
    highlight: true,
    active: true,
  },
  {
    slug: "premium",
    name: "Premium",
    subtitle: "Para igrejas maiores, catedrais e redes com congregações",
    badge: "MULTISSEDE VIP",
    setupPrice: 1290,
    monthlyPrice: 399,
    annualPrice: 3990,
    targetAudience: "Acima de 600 membros ou multissede",
    features: JSON.stringify([
      "TUDO do Plano Gestão, mais:",
      "Múltiplas congregações (Matriz e Filiais integradas)",
      "Gestão avançada de Prs. e liderança geral",
      "EBD (Escola Bíblica Dominical) e cursos",
      "Check-in Kids com etiquetas e código de segurança",
      "Relatórios analíticos e auditoria avançada",
      "Múltiplos administradores com permissões granulares",
      "Personalizações exclusivas de marca e cores",
      "Integrações via API e automações",
      "Suporte VIP dedicado com gerente de conta",
    ]),
    highlight: false,
    active: true,
  },
];

export async function getAllPlans() {
  try {
    let plans = await prisma.plan.findMany({
      orderBy: { monthlyPrice: "asc" },
    });

    if (!plans || plans.length === 0) {
      for (const p of INITIAL_DEFAULT_PLANS) {
        try {
          await prisma.plan.upsert({
            where: { slug: p.slug },
            update: {},
            create: p,
          });
        } catch (err) {
          console.warn(`Aviso ao semear plano ${p.slug}:`, err);
        }
      }
      plans = await prisma.plan.findMany({
        orderBy: { monthlyPrice: "asc" },
      });
    }

    return { success: true, plans };
  } catch (error: any) {
    return {
      success: true,
      plans: INITIAL_DEFAULT_PLANS.map((p, idx) => ({ ...p, id: `plan_${idx}` })),
      error: error.message,
    };
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
  annualPrice?: number;
  targetAudience?: string;
  features: string[];
  highlight?: boolean;
  active?: boolean;
}) {
  try {
    await requireSuperAdmin();
    const featuresJson = JSON.stringify(data.features || []);
    const calculatedAnnual = data.annualPrice && data.annualPrice > 0 ? data.annualPrice : data.monthlyPrice * 10;

    const isSyntheticId = data.id && data.id.startsWith("plan_");

    if (data.id && !isSyntheticId) {
      const plan = await prisma.plan.update({
        where: { id: data.id },
        data: {
          slug: data.slug,
          name: data.name,
          subtitle: data.subtitle,
          badge: data.badge || null,
          setupPrice: data.setupPrice,
          monthlyPrice: data.monthlyPrice,
          annualPrice: calculatedAnnual,
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
      const plan = await prisma.plan.upsert({
        where: { slug: data.slug },
        update: {
          name: data.name,
          subtitle: data.subtitle,
          badge: data.badge || null,
          setupPrice: data.setupPrice,
          monthlyPrice: data.monthlyPrice,
          annualPrice: calculatedAnnual,
          targetAudience: data.targetAudience,
          features: featuresJson,
          highlight: data.highlight ?? false,
          active: data.active ?? true,
        },
        create: {
          slug: data.slug,
          name: data.name,
          subtitle: data.subtitle,
          badge: data.badge || null,
          setupPrice: data.setupPrice,
          monthlyPrice: data.monthlyPrice,
          annualPrice: calculatedAnnual,
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
    await requireSuperAdmin();
    await prisma.plan.delete({ where: { id: planId } });
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Gestão Global de Usuários (sem expor hashes de senha ou códigos de segurança)
export async function getAllUsers() {
  try {
    await requireSuperAdmin();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        cpf: true,
        role: true,
        isEmailVerified: true,
        tenantId: true,
        createdAt: true,
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
    await requireSuperAdmin();
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
      },
    });

    revalidatePath("/admin");
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUserBySuperAdminAction(userId: string) {
  try {
    await requireSuperAdmin();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Usuário não encontrado." };
    if (user.role === "SUPERADMIN" || user.email === "edsonmanoel2012@gmail.com") {
      return { success: false, error: "O Super Administrador não pode ser excluído." };
    }

    await prisma.userChurchAccess.deleteMany({ where: { userId } });
    await prisma.activationCode.deleteMany({ where: { email: user.email } });
    await prisma.emailLog.deleteMany({ where: { OR: [{ to: user.email }, { from: user.email }] } });
    await prisma.personalToolInvoice.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTenantBySuperAdminAction(tenantId: string) {
  try {
    await requireSuperAdmin();
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return { success: false, error: "Congregação não encontrada." };

    await prisma.userChurchAccess.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function purgeAllNonSuperAdminDataAction() {
  try {
    await requireSuperAdmin();
    await prisma.userChurchAccess.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        NOT: { email: "edsonmanoel2012@gmail.com" },
      },
    });
    await prisma.tenant.deleteMany({});
    await prisma.activationCode.deleteMany({});
    await prisma.emailLog.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.subscriptionInvoice.deleteMany({});
    await prisma.personalToolInvoice.deleteMany({});
    await prisma.prayerRequest.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.cellGroup.deleteMany({});
    await prisma.ministry.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.message.deleteMany({});

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, message: "Todas as congregações e usuários de teste foram excluídos com sucesso." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 6. Central de E-mails (Entrada e Saída - Somente E-mails Relacionados ao App Horeb)
export async function getEmailCenterData() {
  try {
    await requireSuperAdmin();
    // 1. Logs de E-mails Enviados / Registrados pelo App Horeb e Usuários/Congregações conhecidas
    const [emailLogs, appUsers, appTenants] = await Promise.all([
      prisma.emailLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.user.findMany({ select: { email: true } }),
      prisma.tenant.findMany({ select: { name: true, slug: true } }),
    ]);

    const knownEmails = Array.from(
      new Set([
        ...appUsers.map((u) => u.email),
        ...emailLogs.map((l) => l.to),
        ...emailLogs.map((l) => l.from),
      ])
    ).filter(Boolean);

    const knownChurchNames = appTenants.flatMap((t) => [t.name, t.slug]).filter(Boolean);

    // 2. Buscar Mensagens Reais da Caixa de Entrada (IMAP Hostinger) filtrando estritamente as do App Horeb
    const imapResult = await fetchInboxEmails(40, {
      knownEmails,
      knownChurchNames,
    });

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
    await requireSuperAdmin();
    const cleanTo = to.trim().toLowerCase();
    const sender = getMailSender("Horeb Suporte & Gestão");
    const res = await mailTransporter.sendMail({
      from: sender.from,
      envelope: sender.envelope(cleanTo),
      to: cleanTo,
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
  await requireSuperAdmin();
  const smtpRes = await testSmtpConnection();
  const imapRes = await testImapConnection();

  return {
    smtp: smtpRes,
    imap: imapRes,
  };
}

// 9. Buscar e Atualizar Configurações da Promoção
export async function getPromotionConfig() {
  try {
    let config = await prisma.promotionConfig.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        active: true,
        badge: "CONDIÇÃO EXCLUSIVA DE LANÇAMENTO",
        title: "Programa Especial: Primeiras 100 Igrejas de Dezembro/2026",
        description:
          "Para as primeiras 100 igrejas parceiras do mês de dezembro/2026, oferecemos 50% de desconto na taxa de implantação, acompanhamento presencial na secretaria e treinamento VIP de liderança. Em troca, construiremos juntos seu case de sucesso ministerial.",
        discountPercent: 50,
        currentCount: 63,
        targetCount: 100,
        validityText: "Válido até 31 de Dezembro de 2026",
        ctaText: "Garantir Minha Vaga (50% OFF)",
      },
    });

    // Se o registro existente no banco ainda contiver referências antigas a "Outubro", atualiza automaticamente para Dezembro/2026
    if (
      config.title?.includes("Outubro") ||
      config.description?.toLowerCase().includes("outubro") ||
      config.validityText?.includes("Outubro")
    ) {
      config = await prisma.promotionConfig.update({
        where: { id: "default" },
        data: {
          title: config.title.replace(/Outubro/gi, "Dezembro"),
          description: config.description.replace(/outubro/gi, "dezembro"),
          validityText: config.validityText.replace(/Outubro/gi, "Dezembro"),
        },
      });
    }

    return { success: true, config };
  } catch (error: any) {
    return {
      success: false,
      config: {
        id: "default",
        active: true,
        badge: "CONDIÇÃO EXCLUSIVA DE LANÇAMENTO",
        title: "Programa Especial: Primeiras 100 Igrejas de Dezembro/2026",
        description:
          "Para as primeiras 100 igrejas parceiras do mês de dezembro/2026, oferecemos 50% de desconto na taxa de implantação, acompanhamento presencial na secretaria e treinamento VIP de liderança.",
        discountPercent: 50,
        currentCount: 63,
        targetCount: 100,
        validityText: "Válido até 31 de Dezembro de 2026",
        ctaText: "Garantir Minha Vaga (50% OFF)",
      },
    };
  }
}

export async function updatePromotionConfig(data: {
  active: boolean;
  badge: string;
  title: string;
  description: string;
  discountPercent: number;
  currentCount: number;
  targetCount: number;
  validityText: string;
  ctaText: string;
}) {
  try {
    await requireSuperAdmin();
    const config = await prisma.promotionConfig.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true, config };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
