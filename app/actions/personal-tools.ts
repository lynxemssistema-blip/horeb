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
  slug: string;
  title: string;
  badge: string;
  icon: string;
  category: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  active: boolean;
  features: string[];
  actionType:
    | "MODAL_INSTAGRAM"
    | "MODAL_SERMON_AI"
    | "MODAL_BANNER_DESIGNER"
    | "MODAL_CERTIFICATES"
    | "COMING_SOON"
    | "ROUTE"
    | "EXTERNAL";
  routeUrl?: string | null;
}

const INITIAL_DEFAULT_TOOLS: Array<Omit<PersonalToolsConfigData, "id">> = [
  {
    slug: "instagram-studio",
    title: "Estúdio de Fotos & Instagram Pro",
    badge: "MÓDULO EXCLUSIVO",
    icon: "Camera",
    category: "MÍDIA & SOCIAL",
    description:
      "Câmera do celular em alta definição com 8 filtros de cinema, ajustes finos de luz e enquadramentos de Feed (1:1), Retrato (4:5) e Stories (9:16) prontos para postagem no Instagram.",
    monthlyPrice: 19.9,
    annualPrice: 199.0,
    trialDays: 30,
    active: true,
    actionType: "MODAL_INSTAGRAM",
    features: [
      "Câmera Nativa do Celular & Selfie em Alta Definição",
      "8 Filtros de Cinema Exclusivos (Louvor Vivo, Golden Hour, B&W)",
      "Formatos Oficiais do Instagram: 1:1 Feed, 4:5 Retrato e 9:16 Stories",
      "Ajustes Finos de Iluminação, Contraste, Calor e Vinheta",
      "Selos de Fé e Brasão da Igreja em Alta Resolução",
      "Compartilhamento Direto no Feed ou Stories em 1 Toque",
    ],
  },
  {
    slug: "ia-sermoes",
    title: "Copiloto IA para Sermões & Esboços",
    badge: "PR. & LÍDERES",
    icon: "Sparkles",
    category: "TEOLOGIA & ENSINO",
    description:
      "Inteligência Artificial bíblica para estruturação de esboços temáticos, referências cruzadas em hebraico/grego e ilustrações para mensagens.",
    monthlyPrice: 29.9,
    annualPrice: 299.0,
    trialDays: 30,
    active: true,
    actionType: "MODAL_SERMON_AI",
    features: [
      "Esboços de Mensagens Temáticas e Expositivas",
      "Banco de Ilustrações e Aplicações Práticas",
      "Comentários e Dicionários Bíblicos Integrados (Hebraico/Grego)",
      "Exportação Direta para Impressão e Apresentação",
    ],
  },
  {
    slug: "banner-designer",
    title: "Designer de Banners & Cultos",
    badge: "COMUNICAÇÃO",
    icon: "Palette",
    category: "MÍDIA & REDES",
    description:
      "Crie artes de culto, convites de conferência e escalas de louvor com tipografia evangélica premium e fundos cinematográficos.",
    monthlyPrice: 24.9,
    annualPrice: 249.0,
    trialDays: 30,
    active: true,
    actionType: "MODAL_BANNER_DESIGNER",
    features: [
      "Templates Oficiais de Cultos e Eventos Semanais",
      "Inserção Automática de Tema, Data, Horário e Preletor",
      "Formatos Prontos para WhatsApp Status (9:16), Retrato (4:5) e Feed (1:1)",
      "Download em Alta Resolução sem marca d'água",
    ],
  },
  {
    slug: "certificados-digitais",
    title: "Certificados & Carteirinhas Digitais",
    badge: "SECRETARIA VIP",
    icon: "Award",
    category: "ADMINISTRAÇÃO",
    description:
      "Emissão de carteirinhas de membro com QR Code seguro de autenticação e certificados oficiais de batismo e consagração.",
    monthlyPrice: 19.9,
    annualPrice: 199.0,
    trialDays: 30,
    active: true,
    actionType: "MODAL_CERTIFICATES",
    features: [
      "Carteirinha Digital 3D com QR Code de Autenticidade",
      "Certificados Oficiais de Batismo, Apresentação de Crianças e Casamento",
      "Personalização com Nome da Igreja e Pr. Presidente",
      "Impressão Oficial ou Exportação Instantânea",
    ],
  },
];

/**
 * 1. Obter Catálogo Completo de Ferramentas Pessoais (com auto-seeding se vazio)
 */
export async function getAllPersonalTools(): Promise<{
  success: boolean;
  tools: PersonalToolsConfigData[];
}> {
  try {
    const list = await (prisma as any).personalToolsConfig.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (!list || list.length === 0) {
      // Cria as ferramentas iniciais para o SuperAdmin ter o catálogo rico pronto
      for (const item of INITIAL_DEFAULT_TOOLS) {
        await (prisma as any).personalToolsConfig.create({
          data: {
            slug: item.slug,
            title: item.title,
            badge: item.badge,
            icon: item.icon,
            category: item.category,
            description: item.description,
            monthlyPrice: item.monthlyPrice,
            annualPrice: item.annualPrice,
            trialDays: item.trialDays,
            active: item.active,
            actionType: item.actionType,
            features: JSON.stringify(item.features),
          },
        });
      }

      const refreshed = await (prisma as any).personalToolsConfig.findMany({
        orderBy: { createdAt: "asc" },
      });

      return {
        success: true,
        tools: refreshed.map(formatToolFromDb),
      };
    }

    return {
      success: true,
      tools: list.map(formatToolFromDb),
    };
  } catch (error) {
    console.error("Erro ao carregar catálogo de ferramentas:", error);
    return {
      success: true,
      tools: INITIAL_DEFAULT_TOOLS.map((t, idx) => ({ ...t, id: `init_${idx}` })),
    };
  }
}

function formatToolFromDb(dbTool: any): PersonalToolsConfigData {
  let parsedFeatures: string[] = [];
  try {
    parsedFeatures = JSON.parse(dbTool.features || "[]");
  } catch {
    parsedFeatures = [];
  }

  const slug = dbTool.slug || "instagram-studio";
  let resolvedActionType = dbTool.actionType || "MODAL_INSTAGRAM";
  if (resolvedActionType === "COMING_SOON" || resolvedActionType === "ROUTE") {
    if (slug.includes("sermoes") || slug.includes("ia")) {
      resolvedActionType = "MODAL_SERMON_AI";
    } else if (slug.includes("banner") || slug.includes("designer")) {
      resolvedActionType = "MODAL_BANNER_DESIGNER";
    } else if (slug.includes("certificado") || slug.includes("carteirinha")) {
      resolvedActionType = "MODAL_CERTIFICATES";
    }
  }

  return {
    id: dbTool.id,
    slug,
    title: dbTool.title,
    badge: dbTool.badge || "MÓDULO PESSOAL",
    icon: dbTool.icon || "Camera",
    category: dbTool.category || "MÍDIA & SOCIAL",
    description: dbTool.description,
    monthlyPrice: Number(dbTool.monthlyPrice),
    annualPrice: Number(dbTool.annualPrice),
    trialDays: Number(dbTool.trialDays),
    active: Boolean(dbTool.active),
    features: parsedFeatures,
    actionType: resolvedActionType as any,
    routeUrl: dbTool.routeUrl || null,
  };
}

/**
 * 2. Obter Configuração de Ferramenta Principal (Compatibilidade)
 */
export async function getPersonalToolsConfig(slug = "instagram-studio"): Promise<{
  success: boolean;
  config: PersonalToolsConfigData;
}> {
  try {
    const dbTool = await (prisma as any).personalToolsConfig.findFirst({
      where: { slug },
    });

    if (dbTool) {
      return { success: true, config: formatToolFromDb(dbTool) };
    }

    // Se não encontrou por slug, tenta o primeiro ou usa o default
    const firstTool = await (prisma as any).personalToolsConfig.findFirst();
    if (firstTool) {
      return { success: true, config: formatToolFromDb(firstTool) };
    }
  } catch (error) {
    console.warn("PersonalToolsConfig fallback:", error);
  }

  return { success: true, config: { ...INITIAL_DEFAULT_TOOLS[0], id: "default" } };
}

/**
 * 3. Criar ou Atualizar Ferramenta (SuperAdmin)
 */
export async function createOrUpdatePersonalTool(data: {
  id?: string;
  slug: string;
  title: string;
  badge?: string;
  icon?: string;
  category?: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  active: boolean;
  features?: string[];
  actionType?:
    | "MODAL_INSTAGRAM"
    | "MODAL_SERMON_AI"
    | "MODAL_BANNER_DESIGNER"
    | "MODAL_CERTIFICATES"
    | "COMING_SOON"
    | "ROUTE"
    | "EXTERNAL";
  routeUrl?: string;
}): Promise<{ success: boolean; tool?: PersonalToolsConfigData; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return { success: false, error: "Apenas SuperAdmin pode gerenciar ferramentas." };
    }

    const cleanSlug = data.slug
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    const featuresJson = JSON.stringify(data.features || []);

    if (data.id) {
      const updated = await (prisma as any).personalToolsConfig.update({
        where: { id: data.id },
        data: {
          slug: cleanSlug,
          title: data.title,
          badge: data.badge || "EXCLUSIVO",
          icon: data.icon || "Sparkles",
          category: data.category || "GERAL",
          description: data.description,
          monthlyPrice: data.monthlyPrice,
          annualPrice: data.annualPrice,
          trialDays: data.trialDays,
          active: data.active,
          features: featuresJson,
          actionType: data.actionType || "COMING_SOON",
          routeUrl: data.routeUrl || null,
        },
      });

      revalidatePath("/admin");
      revalidatePath("/");
      return { success: true, tool: formatToolFromDb(updated) };
    } else {
      const created = await (prisma as any).personalToolsConfig.create({
        data: {
          slug: cleanSlug,
          title: data.title,
          badge: data.badge || "NOVO",
          icon: data.icon || "Sparkles",
          category: data.category || "GERAL",
          description: data.description,
          monthlyPrice: data.monthlyPrice,
          annualPrice: data.annualPrice,
          trialDays: data.trialDays,
          active: data.active,
          features: featuresJson,
          actionType: data.actionType || "COMING_SOON",
          routeUrl: data.routeUrl || null,
        },
      });

      revalidatePath("/admin");
      revalidatePath("/");
      return { success: true, tool: formatToolFromDb(created) };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao salvar ferramenta." };
  }
}

/**
 * 4. Excluir Ferramenta (SuperAdmin)
 */
export async function deletePersonalTool(
  toolId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return { success: false, error: "Apenas SuperAdmin pode excluir ferramentas." };
    }

    await (prisma as any).personalToolsConfig.delete({
      where: { id: toolId },
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao excluir ferramenta." };
  }
}

/**
 * Compatibilidade: Atualizar Preços e Configurações (legado)
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
  return createOrUpdatePersonalTool({
    slug: "instagram-studio",
    title: data.title,
    badge: data.badge,
    description: data.description,
    monthlyPrice: data.monthlyPrice,
    annualPrice: data.annualPrice,
    trialDays: data.trialDays,
    active: data.active,
    features: data.features,
    actionType: "MODAL_INSTAGRAM",
  });
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
    const session = await getSession();
    const isSuper = session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";
    const effectiveUserId = isSuper && userId ? userId : session?.userId || "";
    if (!effectiveUserId) {
      return {
        hasActiveSubscription: false,
        status: "INACTIVE",
        expiresAt: null,
        isTrial: false,
        remainingDays: 0,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
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
          where: { id: effectiveUserId },
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
          where: { id: effectiveUserId },
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
    const session = await getSession();
    const isSuper = session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";
    if (!session || (!isSuper && session.userId !== userId)) {
      return { success: false, error: "Sessão expirada ou acesso negado." };
    }

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
  toolSlug?: string;
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
    const session = await getSession();
    const isSuper = session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";
    if (!session) {
      return { success: false, error: "Faça login na sua conta para assinar a ferramenta." };
    }

    const targetUserId = isSuper ? data.userId : session.userId;

    let user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { tenant: true },
    });

    if (!user && isSuper) {
      // Se for teste do SuperAdmin ("superadmin"), busca o primeiro usuário válido ou usa fallback
      user = await prisma.user.findFirst({
        include: { tenant: true },
      });
    }

    const customerName = user?.name || "Pr. Luan Demattos";
    const customerEmail = user?.email || "contato@horeb.lynxems.com.br";
    const customerRefId = user?.id || "SUPERADMIN_TEST";

    const { config } = await getPersonalToolsConfig(data.toolSlug || "instagram-studio");
    const amount = data.cycle === "YEARLY" ? config.annualPrice : config.monthlyPrice;

    // 1. Criar ou Buscar Cliente no Asaas (vinculado ao grupo de clientes 'horeb')
    const customerRes = await getOrCreateAsaasCustomer({
      name: customerName,
      cpfCnpj: data.cpfCnpj,
      email: customerEmail,
      phone: data.phone || undefined,
      groupName: "horeb",
      externalReference: `USER_${customerRefId}`,
    });

    if (!customerRes.success || !customerRes.customer) {
      return { success: false, error: customerRes.error || "Erro ao criar cliente no Asaas." };
    }

    const asaasCustomer = customerRes.customer;

    // 2. Data de Vencimento (Hoje para liberação imediata)
    const today = new Date().toISOString().split("T")[0];

    // 3. Criar Assinatura Recorrente no Asaas
    const description = `Horeb B2C: ${config.title} (${data.cycle === "YEARLY" ? "Anual" : "Mensal"}) - ${customerName}`;

    const subRes = await createAsaasSubscription({
      customerId: asaasCustomer.id,
      value: amount,
      nextDueDate: today,
      description,
      // UNDEFINED habilita Cartão de Crédito, PIX e Boleto na fatura oficial do Asaas!
      billingType: data.billingType === "CREDIT_CARD" ? "CREDIT_CARD" : "UNDEFINED",
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

    if (firstPayment && (data.billingType === "PIX" || firstPayment.billingType === "PIX" || firstPayment.billingType === "UNDEFINED")) {
      const pixRes = await getAsaasPaymentPixQrCode(firstPayment.id);
      if (pixRes.success && pixRes.pix) {
        pixQrCode = pixRes.pix.payload;
        pixQrCodeImage = pixRes.pix.encodedImage;
      }
    }

    // 5. Salvar referência no Banco de Dados (se houver usuário vinculado)
    const expiresAt = new Date();
    if (data.cycle === "YEARLY") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    if (user?.id) {
      const isImmediateConfirmed =
        firstPayment?.status === "CONFIRMED" ||
        firstPayment?.status === "RECEIVED";
      await prisma.user.update({
        where: { id: user.id },
        data: {
          toolsAsaasCustomerId: asaasCustomer.id,
          toolsAsaasSubscriptionId: asaasSub.id,
          ...(isImmediateConfirmed
            ? {
                hasToolsSubscription: true,
                toolsSubscriptionStatus: "ACTIVE",
                toolsSubscriptionExpiresAt: expiresAt,
              }
            : {}),
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
 * 10. Gerar Esboço de Sermão com IA Teológica (Copiloto IA para Sermões & Esboços)
 */
export interface GeneratedSermonOutline {
  title: string;
  theme: string;
  baseScripture: string;
  sermonType: string;
  preacherName: string;
  introduction: string;
  originalTerms: Array<{
    term: string;
    language: "Hebraico" | "Grego";
    transliteration: string;
    meaning: string;
  }>;
  points: Array<{
    number: string;
    heading: string;
    explanation: string;
    crossReferences: string[];
    practicalApplication: string;
  }>;
  illustration: string;
  conclusionAndAppeal: string;
}

export async function generateSermonOutlineAction(input: {
  topic: string;
  bibleText?: string;
  sermonType?: "EXPOSITIVO" | "TEMATICO" | "TEXTUAL" | "DEVOCIONAL";
  preacherName?: string;
}): Promise<{
  success: boolean;
  outline?: GeneratedSermonOutline;
  error?: string;
}> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Autenticação necessária para utilizar o Copiloto IA." };
  }

  const topic = input.topic?.trim() || "Libertação Espiritual e Autoridade em Cristo";
  const bibleText = input.bibleText?.trim() || "Efésios 6:10-18";
  const sermonType = input.sermonType || "EXPOSITIVO";
  const preacherName = input.preacherName?.trim() || "Pr. Luan Demattos";

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é um Copiloto Teológico Pentecostal e Reformado de excelência para obreiros e ministros (${preacherName}).
Crie um esboço completo de sermão (${sermonType}) sobre o tema "${topic}" baseado em "${bibleText}".
Retorne APENAS um JSON válido com a seguinte estrutura exata:
{
  "title": "Título impactante da mensagem",
  "theme": "${topic}",
  "baseScripture": "${bibleText}",
  "sermonType": "${sermonType}",
  "preacherName": "${preacherName}",
  "introduction": "Parágrafo introdutório contextualizando o texto bíblico e despertando a atenção da igreja.",
  "originalTerms": [
    { "term": "Palavra original", "language": "Hebraico ou Grego", "transliteration": "Transliteração", "meaning": "Explicação exegética profunda" },
    { "term": "Segunda palavra", "language": "Hebraico ou Grego", "transliteration": "Transliteração", "meaning": "Explicação exegética profunda" }
  ],
  "points": [
    {
      "number": "I",
      "heading": "Título do Tópico I",
      "explanation": "Desenvolvimento teológico claro e profundo",
      "crossReferences": ["Referência 1", "Referência 2"],
      "practicalApplication": "Como aplicar esta verdade hoje na vida cristã"
    },
    {
      "number": "II",
      "heading": "Título do Tópico II",
      "explanation": "Desenvolvimento teológico claro e profundo",
      "crossReferences": ["Referência 1", "Referência 2"],
      "practicalApplication": "Como aplicar esta verdade hoje na vida cristã"
    },
    {
      "number": "III",
      "heading": "Título do Tópico III",
      "explanation": "Desenvolvimento teológico claro e profundo",
      "crossReferences": ["Referência 1", "Referência 2"],
      "practicalApplication": "Como aplicar esta verdade hoje na vida cristã"
    }
  ],
  "illustration": "Uma ilustração pastoral marcante que conecta o tema à vida real da igreja.",
  "conclusionAndAppeal": "Conclusão edificante e chamada para oração no altar."
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const rawText = response.text || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as GeneratedSermonOutline;
        return { success: true, outline: parsed };
      }
    }
  } catch (err) {
    console.warn("Usando esboço estruturado inteligente (fallback):", err);
  }

  // Fallback estruturado rico e imediato
  const fallbackOutline: GeneratedSermonOutline = {
    title: `${topic}: Vivendo o Propósito e a Autoridade do Reino`,
    theme: topic,
    baseScripture: bibleText,
    sermonType,
    preacherName,
    introduction: `Ao meditarmos em ${bibleText}, percebemos que o propósito de Deus sobre "${topic}" não se resume a um conhecimento superficial, mas convoca a Igreja a um alinhamento genuíno entre espírito, alma e corpo sob o senhorio de Cristo. O contexto histórico revela que a vitória espiritual começa quando conhecemos a nossa posição em Cristo.`,
    originalTerms: [
      {
        term: "Δύναμις / Exousia",
        language: "Grego",
        transliteration: "Dynamis & Exousia",
        meaning: "Poder miraculoso em ação combinado com autoridade legal delegada por Cristo à Sua Igreja.",
      },
      {
        term: "שָׁלוֹם / Shalom",
        language: "Hebraico",
        transliteration: "Shalom",
        meaning: "Integridade plena, restauração da ordem divina, paz interior e equilíbrio espiritual.",
      },
    ],
    points: [
      {
        number: "I",
        heading: "O Fundamento da Revelação na Palavra",
        explanation: `A primeira chave em ${bibleText} é compreender que toda transformação duradoura nasce da verdade revelada. Quando a mente é renovada pelas Escrituras, as fortalezas do engano perdem o seu domínio.`,
        crossReferences: ["Romanos 12:2", "João 8:32", "Salmos 119:105"],
        practicalApplication: "Substitua pensamentos de dúvida pela declaração diária e consciente da Palavra de Deus.",
      },
      {
        number: "II",
        heading: "O Alinhamento do Coração e a Submissão ao Espírito",
        explanation: `Não há autoridade espiritual sem submissão ao Espírito Santo. O texto nos ensina que o discernimento e a constância na oração guardam a alma contra os extremos emocionais e mantêm o cristão firme na rocha.`,
        crossReferences: ["Tiago 4:7", "Gálatas 5:16", "Provérbios 4:23"],
        practicalApplication: "Estabeleça uma rotina diária de comunhão, vigiando as portas da alma e cultivando frutos do Espírito.",
      },
      {
        number: "III",
        heading: "A Manifestação da Vitória e do Testemunho Cristão",
        explanation: `O propósito final de "${topic}" é glorificar o nome de Jesus através de uma vida restaurada, frutífera e cheia de graça, capaz de edificar a família e impactar toda a congregação.`,
        crossReferences: ["2 Coríntios 10:4-5", "1 João 5:4", "Mateus 5:16"],
        practicalApplication: "Permaneça firme na comunhão dos santos, exercendo fé ativa e servindo ao Reino com excelência.",
      },
    ],
    illustration: `Assim como uma bússola sempre aponta para o norte magnético mesmo em meio a uma tempestade no oceano, o coração firmado em ${bibleText} não perde a direção quando as circunstâncias tentam abalar a sua fé.`,
    conclusionAndAppeal: `Hoje o Espírito Santo nos chama a viver "${topic}" em sua plenitude. Coloque-se de pé diante do altar, entregue todo peso ao Senhor Jesus e receba o renovo da graça para uma nova estação de vitória!`,
  };

  return { success: true, outline: fallbackOutline };
}

/**
 * 6. SuperAdmin: Listar Membros com Histórico ou Assinatura do Módulo B2C
 */
export async function getPersonalToolsSubscribers(): Promise<{
  success: boolean;
  subscribers: any[];
  totalActive: number;
  totalTrial: number;
  totalOverdue: number;
  totalMonthlyRevenue: number;
}> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return {
        success: false,
        subscribers: [],
        totalActive: 0,
        totalTrial: 0,
        totalOverdue: 0,
        totalMonthlyRevenue: 0,
      };
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { hasToolsSubscription: true },
          { toolsSubscriptionStatus: { in: ["ACTIVE", "TRIAL", "OVERDUE", "CANCELLED"] } },
          { toolsAsaasSubscriptionId: { not: null } },
        ],
      } as any,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hasToolsSubscription: true,
        toolsSubscriptionStatus: true,
        toolsSubscriptionExpiresAt: true,
        toolsAsaasSubscriptionId: true,
        toolsAsaasCustomerId: true,
        createdAt: true,
        tenant: {
          select: { name: true, slug: true },
        },
      } as any,
      orderBy: { createdAt: "desc" },
    });

    const activeUsers = users.filter((u: any) => u.toolsSubscriptionStatus === "ACTIVE");
    const trialUsers = users.filter((u: any) => u.toolsSubscriptionStatus === "TRIAL");
    const overdueUsers = users.filter(
      (u: any) =>
        u.toolsSubscriptionStatus === "OVERDUE" ||
        u.toolsSubscriptionStatus === "CANCELLED" ||
        (u.toolsSubscriptionExpiresAt && new Date(u.toolsSubscriptionExpiresAt) < new Date())
    );

    const { config } = await getPersonalToolsConfig();
    const monthlyRevenue = activeUsers.length * config.monthlyPrice;

    return {
      success: true,
      subscribers: users,
      totalActive: activeUsers.length,
      totalTrial: trialUsers.length,
      totalOverdue: overdueUsers.length,
      totalMonthlyRevenue: monthlyRevenue,
    };
  } catch (error) {
    return {
      success: false,
      subscribers: [],
      totalActive: 0,
      totalTrial: 0,
      totalOverdue: 0,
      totalMonthlyRevenue: 0,
    };
  }
}

/**
 * 7. SuperAdmin: Conceder Cortesia ou Estender Período do Membro (+30d, +90d, +365d)
 */
export async function grantPersonalToolsAccess(
  userId: string,
  days: number = 30
): Promise<{ success: boolean; newExpiry?: string; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return { success: false, error: "Apenas SuperAdmin pode conceder cortesia." };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, toolsSubscriptionExpiresAt: true, tenant: { select: { slug: true } } } as any,
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    const now = new Date();
    const currentExpiry = (user as any).toolsSubscriptionExpiresAt
      ? new Date((user as any).toolsSubscriptionExpiresAt)
      : null;

    // Se já estiver com data válida no futuro, soma a partir da data atual de expiração
    const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        hasToolsSubscription: true,
        toolsSubscriptionStatus: "ACTIVE",
        toolsSubscriptionExpiresAt: newExpiry,
      } as any,
    });

    revalidatePath("/admin");
    if ((user as any).tenant?.slug) {
      revalidatePath(`/${(user as any).tenant.slug}`);
    }
    revalidatePath("/");

    return { success: true, newExpiry: newExpiry.toISOString() };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao conceder acesso cortesia." };
  }
}

/**
 * 8. SuperAdmin: Revogar ou Bloquear Acesso do Usuário ao Módulo
 */
export async function revokePersonalToolsAccess(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return { success: false, error: "Apenas SuperAdmin pode revogar acesso." };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenant: { select: { slug: true } } } as any,
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        hasToolsSubscription: false,
        toolsSubscriptionStatus: "CANCELLED",
      } as any,
    });

    revalidatePath("/admin");
    if ((user as any).tenant?.slug) {
      revalidatePath(`/${(user as any).tenant.slug}`);
    }
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao revogar acesso." };
  }
}

/**
 * 9. SuperAdmin: Definir Status Manualmente (ACTIVE, TRIAL, OVERDUE, CANCELLED)
 */
export async function setPersonalToolsStatus(
  userId: string,
  status: "ACTIVE" | "TRIAL" | "OVERDUE" | "CANCELLED",
  days: number = 30
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPERADMIN") {
      return { success: false, error: "Apenas SuperAdmin pode alterar status de ferramentas." };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenant: { select: { slug: true } } } as any,
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    const isActive = status === "ACTIVE" || status === "TRIAL";
    const expiresAt = isActive ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        hasToolsSubscription: isActive,
        toolsSubscriptionStatus: status,
        toolsSubscriptionExpiresAt: expiresAt,
      } as any,
    });

    revalidatePath("/admin");
    if ((user as any).tenant?.slug) {
      revalidatePath(`/${(user as any).tenant.slug}`);
    }
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao definir status." };
  }
}
