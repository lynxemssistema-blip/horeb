"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  getOrCreateAsaasCustomer,
  createAsaasSubscription,
  getAsaasPaymentPixQrCode,
  getAsaasConfig,
} from "@/lib/asaas";

export interface PersonalToolsConfigData {
  id: string;
  title: string;
  badge: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  active: boolean;
  features: string[];
}

const DEFAULT_TOOLS_CONFIG: PersonalToolsConfigData = {
  id: "default",
  title: "Estúdio de Fotos & Instagram Pro",
  badge: "MÓDULO PESSOAL EXCLUSIVO",
  description:
    "Câmera de alta resolução com filtros de cinema para cultos e palcos de louvor, ajustes de iluminação e formatos prontos para postagem no Instagram.",
  monthlyPrice: 19.9,
  annualPrice: 199.0,
  trialDays: 30,
  active: true,
  features: [
    "Câmera Nativa do Celular & Selfie em Alta Definição",
    "8 Filtros de Cinema Exclusivos (Louvor Vivo, Golden Hour, B&W)",
    "Formatos Oficiais do Instagram: 1:1 Feed, 4:5 Retrato e 9:16 Stories",
    "Ajustes Finos de Iluminação, Contraste, Calor e Vinheta",
    "Selos de Fé e Brasão da Igreja em Alta Resolução",
    "Compartilhamento Direto no Feed ou Stories em 1 Toque",
  ],
};

/**
 * 1. Obter Configurações e Preços do Módulo Pessoal (Gerenciado pelo SuperAdmin)
 */
export async function getPersonalToolsConfig(): Promise<{
  success: boolean;
  config: PersonalToolsConfigData;
}> {
  try {
    const dbConfig = await (prisma as any).personalToolsConfig?.findUnique({
      where: { id: "default" },
    });

    if (dbConfig) {
      let parsedFeatures = DEFAULT_TOOLS_CONFIG.features;
      try {
        parsedFeatures = JSON.parse(dbConfig.features);
      } catch {
        // fallback
      }

      return {
        success: true,
        config: {
          id: dbConfig.id,
          title: dbConfig.title,
          badge: dbConfig.badge || DEFAULT_TOOLS_CONFIG.badge,
          description: dbConfig.description,
          monthlyPrice: Number(dbConfig.monthlyPrice),
          annualPrice: Number(dbConfig.annualPrice),
          trialDays: Number(dbConfig.trialDays),
          active: Boolean(dbConfig.active),
          features: parsedFeatures,
        },
      };
    }
  } catch (error) {
    console.warn("PersonalToolsConfig usando fallback padrão:", error);
  }

  return { success: true, config: DEFAULT_TOOLS_CONFIG };
}

/**
 * 2. Atualizar Preços e Configurações do Módulo Pessoal (SuperAdmin)
 */
export async function updatePersonalToolsConfig(data: {
  title: string;
  badge?: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  active: boolean;
  features?: string[];
}): Promise<{ success: boolean; config?: any; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return { success: false, error: "Apenas SuperAdmin pode alterar os preços deste módulo." };
    }

    const featuresJson = JSON.stringify(data.features || DEFAULT_TOOLS_CONFIG.features);

    const updated = await (prisma as any).personalToolsConfig.upsert({
      where: { id: "default" },
      update: {
        title: data.title,
        badge: data.badge || DEFAULT_TOOLS_CONFIG.badge,
        description: data.description,
        monthlyPrice: data.monthlyPrice,
        annualPrice: data.annualPrice,
        trialDays: data.trialDays,
        active: data.active,
        features: featuresJson,
      },
      create: {
        id: "default",
        title: data.title,
        badge: data.badge || DEFAULT_TOOLS_CONFIG.badge,
        description: data.description,
        monthlyPrice: data.monthlyPrice,
        annualPrice: data.annualPrice,
        trialDays: data.trialDays,
        active: data.active,
        features: featuresJson,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, config: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 3. Consultar Status da Assinatura Pessoal do Usuário
 * (No primeiro acesso do usuário, ativa automaticamente 30 dias de uso grátis!)
 */
export async function getUserToolsSubscription(userId: string): Promise<{
  hasActiveSubscription: boolean;
  status: "INACTIVE" | "TRIAL" | "ACTIVE" | "OVERDUE" | "CANCELLED";
  expiresAt: string | null;
  isTrial: boolean;
  remainingDays: number;
  planName?: string;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        hasToolsSubscription: true,
        toolsSubscriptionStatus: true,
        toolsSubscriptionExpiresAt: true,
      } as any,
    });

    if (!user) {
      return {
        hasActiveSubscription: false,
        status: "INACTIVE",
        expiresAt: null,
        isTrial: false,
        remainingDays: 0,
      };
    }

    const { config } = await getPersonalToolsConfig();
    const trialDays = config.trialDays > 0 ? config.trialDays : 30;
    const now = new Date();

    // 1. PRIMEIRO ACESSO DO USUÁRIO AO APP / FERRAMENTAS:
    // Se o usuário nunca teve período de teste ou assinatura registrada (primeira vez no app),
    // ativamos automaticamente os 30 dias de degustação gratuita!
    if (
      !(user as any).toolsSubscriptionExpiresAt &&
      (!(user as any).toolsSubscriptionStatus || (user as any).toolsSubscriptionStatus === "INACTIVE")
    ) {
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDays);

      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            hasToolsSubscription: true,
            toolsSubscriptionStatus: "TRIAL",
            toolsSubscriptionExpiresAt: trialExpiresAt,
          } as any,
        });

        return {
          hasActiveSubscription: true,
          status: "TRIAL",
          expiresAt: trialExpiresAt.toISOString(),
          isTrial: true,
          remainingDays: trialDays,
          planName: "Instagram Camera Studio Pro",
        };
      } catch (err) {
        console.error("Erro ao ativar degustação automática de 30 dias:", err);
      }
    }

    // 2. USUÁRIO JÁ POSSUI HISTÓRICO: VERIFICAR SE O TRIAL OU ASSINATURA EXPIROU
    const expires = (user as any).toolsSubscriptionExpiresAt
      ? new Date((user as any).toolsSubscriptionExpiresAt)
      : null;

    const isExpired = expires ? expires < now : false;
    const rawStatus = ((user as any).toolsSubscriptionStatus || "INACTIVE") as
      | "INACTIVE"
      | "TRIAL"
      | "ACTIVE"
      | "OVERDUE"
      | "CANCELLED";

    const remainingDays = expires
      ? Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Se o período expirou (seja trial ou fatura não renovada)
    if (isExpired) {
      if (rawStatus !== "OVERDUE") {
        await prisma.user.update({
          where: { id: userId },
          data: {
            hasToolsSubscription: false,
            toolsSubscriptionStatus: "OVERDUE",
          } as any,
        }).catch(() => {});
      }

      return {
        hasActiveSubscription: false,
        status: "OVERDUE",
        expiresAt: expires ? expires.toISOString() : null,
        isTrial: false,
        remainingDays: 0,
        planName: "Instagram Camera Studio Pro",
      };
    }

    const hasActive =
      Boolean((user as any).hasToolsSubscription) &&
      !isExpired &&
      (rawStatus === "ACTIVE" || rawStatus === "TRIAL");

    return {
      hasActiveSubscription: hasActive,
      status: rawStatus,
      expiresAt: expires ? expires.toISOString() : null,
      isTrial: rawStatus === "TRIAL",
      remainingDays,
      planName: "Instagram Camera Studio Pro",
    };
  } catch (error) {
    return {
      hasActiveSubscription: false,
      status: "INACTIVE",
      expiresAt: null,
      isTrial: false,
      remainingDays: 0,
    };
  }
}

/**
 * 4. Ativar Degustação Gratuita (Trial) para o Usuário
 */
export async function startPersonalToolsTrial(userId: string): Promise<{
  success: boolean;
  error?: string;
  expiresAt?: string;
}> {
  try {
    const { config } = await getPersonalToolsConfig();
    const trialDays = config.trialDays > 0 ? config.trialDays : 30;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + trialDays);

    await prisma.user.update({
      where: { id: userId },
      data: {
        hasToolsSubscription: true,
        toolsSubscriptionStatus: "TRIAL",
        toolsSubscriptionExpiresAt: expiresAt,
      } as any,
    });

    revalidatePath("/");
    return { success: true, expiresAt: expiresAt.toISOString() };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao ativar degustação." };
  }
}

/**
 * 5. Assinar Módulo Pessoal via Asaas (PIX ou Cartão)
 */
export async function subscribePersonalToolsAsaas(data: {
  userId: string;
  cpfCnpj: string;
  phone?: string;
  cycle: "MONTHLY" | "YEARLY";
  billingType: "PIX" | "CREDIT_CARD";
  churchSlug?: string;
}): Promise<{
  success: boolean;
  error?: string;
  pixQrCode?: string;
  pixQrCodeImage?: string;
  invoiceUrl?: string;
  paymentId?: string;
  amount?: number;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { tenant: true },
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    const { config } = await getPersonalToolsConfig();
    const amount = data.cycle === "YEARLY" ? config.annualPrice : config.monthlyPrice;

    // 1. Criar ou Buscar Cliente no Asaas
    const customerRes = await getOrCreateAsaasCustomer({
      name: user.name,
      cpfCnpj: data.cpfCnpj,
      email: user.email,
      phone: data.phone || undefined,
      externalReference: `USER_${user.id}`,
    });

    if (!customerRes.success || !customerRes.customer) {
      return { success: false, error: customerRes.error || "Erro ao criar cliente no Asaas." };
    }

    const asaasCustomer = customerRes.customer;

    // 2. Data de Vencimento (Hoje para liberação imediata)
    const today = new Date().toISOString().split("T")[0];

    // 3. Criar Assinatura Recorrente no Asaas
    const description = `Horeb B2C: ${config.title} (${data.cycle === "YEARLY" ? "Anual" : "Mensal"}) - ${user.name}`;

    const subRes = await createAsaasSubscription({
      customerId: asaasCustomer.id,
      value: amount,
      nextDueDate: today,
      description,
      billingType: data.billingType,
      cycle: data.cycle,
    });

    if (!subRes.success || !subRes.subscription) {
      return { success: false, error: subRes.error || "Falha ao criar assinatura no Asaas." };
    }

    const asaasSub = subRes.subscription;

    // 4. Buscar a primeira cobrança gerada para obter o PIX / Link
    const { apiKey, baseUrl } = getAsaasConfig();
    const paymentsRes = await fetch(`${baseUrl}/subscriptions/${asaasSub.id}/payments`, {
      method: "GET",
      headers: { "Content-Type": "application/json", access_token: apiKey },
      cache: "no-store",
    });

    let firstPayment: any = null;
    if (paymentsRes.ok) {
      const pData = await paymentsRes.json();
      if (pData.data && pData.data.length > 0) {
        firstPayment = pData.data[0];
      }
    }

    let pixQrCode = "";
    let pixQrCodeImage = "";

    if (firstPayment && (data.billingType === "PIX" || firstPayment.billingType === "PIX")) {
      const pixRes = await getAsaasPaymentPixQrCode(firstPayment.id);
      if (pixRes.success && pixRes.pix) {
        pixQrCode = pixRes.pix.payload;
        pixQrCodeImage = pixRes.pix.encodedImage;
      }
    }

    // 5. Salvar referência no Banco de Dados
    const expiresAt = new Date();
    if (data.cycle === "YEARLY") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        toolsAsaasCustomerId: asaasCustomer.id,
        toolsAsaasSubscriptionId: asaasSub.id,
        hasToolsSubscription: true,
        toolsSubscriptionStatus: "ACTIVE",
        toolsSubscriptionExpiresAt: expiresAt,
      } as any,
    });

    // Registrar Invoice
    if (firstPayment) {
      try {
        await (prisma as any).personalToolInvoice?.create({
          data: {
            userId: user.id,
            asaasPaymentId: firstPayment.id,
            amount,
            status: firstPayment.status || "PENDING",
            billingType: data.billingType,
            dueDate: new Date(firstPayment.dueDate),
            invoiceUrl: firstPayment.invoiceUrl,
            pixQrCode,
            pixQrCodeImage,
            description,
          },
        });
      } catch {
        // Ignora caso tabela esteja sincronizando
      }
    }

    if (data.churchSlug) {
      revalidatePath(`/${data.churchSlug}`);
    }

    return {
      success: true,
      pixQrCode,
      pixQrCodeImage,
      invoiceUrl: firstPayment?.invoiceUrl,
      paymentId: firstPayment?.id,
      amount,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro no processamento da assinatura." };
  }
}

/**
 * 6. SuperAdmin: Listar Membros Assinantes do Módulo B2C
 */
export async function getPersonalToolsSubscribers(): Promise<{
  success: boolean;
  subscribers: any[];
  totalActive: number;
  totalMonthlyRevenue: number;
}> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return { success: false, subscribers: [], totalActive: 0, totalMonthlyRevenue: 0 };
    }

    const users = await prisma.user.findMany({
      where: {
        hasToolsSubscription: true,
      } as any,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        toolsSubscriptionStatus: true,
        toolsSubscriptionExpiresAt: true,
        toolsAsaasSubscriptionId: true,
        tenant: {
          select: { name: true, slug: true },
        },
      } as any,
      orderBy: { createdAt: "desc" },
    });

    const activeUsers = users.filter(
      (u: any) => u.toolsSubscriptionStatus === "ACTIVE" || u.toolsSubscriptionStatus === "TRIAL"
    );

    const { config } = await getPersonalToolsConfig();
    const monthlyRevenue = activeUsers.filter((u: any) => u.toolsSubscriptionStatus === "ACTIVE").length * config.monthlyPrice;

    return {
      success: true,
      subscribers: users,
      totalActive: activeUsers.length,
      totalMonthlyRevenue: monthlyRevenue,
    };
  } catch (error) {
    return { success: false, subscribers: [], totalActive: 0, totalMonthlyRevenue: 0 };
  }
}
