export type PlanSlug = "ESSENCIAL" | "GESTAO" | "PREMIUM";

export type FeatureKey =
  | "MEMBERS"
  | "PWA"
  | "MURAL"
  | "CALENDAR"
  | "PRAYER"
  | "DEVOTIONALS"
  | "PIX_DONATIONS"
  | "NOTIFICATIONS"
  | "ADMIN_PANEL"
  | "WHATSAPP_SUPPORT"
  | "MINISTRIES"
  | "CELLS"
  | "SCHEDULES"
  | "ATTENDANCE"
  | "EVENTS"
  | "FINANCE_COMPLETE"
  | "SEGMENTATION"
  | "BRANCHES"
  | "ADVANCED_LEADERSHIP"
  | "EBD"
  | "KIDS_CHECKIN"
  | "ANALYTICS_AUDIT"
  | "GRANULAR_PERMISSIONS"
  | "CUSTOM_BRANDING"
  | "API_INTEGRATION"
  | "VIP_SUPPORT";

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  monthlyPrice: number;
  setupPrice: number;
  badge?: string;
  description: string;
  featuresList: string[];
  allowedFeatures: Record<FeatureKey, boolean>;
}

export const PLANS_CONFIG: Record<PlanSlug, PlanDefinition> = {
  ESSENCIAL: {
    slug: "ESSENCIAL",
    name: "Essencial",
    monthlyPrice: 149,
    setupPrice: 490,
    description: "Para igrejas pequenas e comunidades em formação",
    featuresList: [
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
    ],
    allowedFeatures: {
      MEMBERS: true,
      PWA: true,
      MURAL: true,
      CALENDAR: true,
      PRAYER: true,
      DEVOTIONALS: true,
      PIX_DONATIONS: true,
      NOTIFICATIONS: true,
      ADMIN_PANEL: true,
      WHATSAPP_SUPPORT: true,
      // Recursos exclusivos do Plano Gestão
      MINISTRIES: false,
      CELLS: false,
      SCHEDULES: false,
      ATTENDANCE: false,
      EVENTS: false,
      FINANCE_COMPLETE: false,
      SEGMENTATION: false,
      // Recursos exclusivos do Plano Premium
      BRANCHES: false,
      ADVANCED_LEADERSHIP: false,
      EBD: false,
      KIDS_CHECKIN: false,
      ANALYTICS_AUDIT: false,
      GRANULAR_PERMISSIONS: false,
      CUSTOM_BRANDING: false,
      API_INTEGRATION: false,
      VIP_SUPPORT: false,
    },
  },
  GESTAO: {
    slug: "GESTAO",
    name: "Gestão",
    monthlyPrice: 249,
    setupPrice: 790,
    badge: "MAIS ESCOLHIDO",
    description: "O plano principal para igrejas médias em franco crescimento",
    featuresList: [
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
    ],
    allowedFeatures: {
      MEMBERS: true,
      PWA: true,
      MURAL: true,
      CALENDAR: true,
      PRAYER: true,
      DEVOTIONALS: true,
      PIX_DONATIONS: true,
      NOTIFICATIONS: true,
      ADMIN_PANEL: true,
      WHATSAPP_SUPPORT: true,
      MINISTRIES: true,
      CELLS: true,
      SCHEDULES: true,
      ATTENDANCE: true,
      EVENTS: true,
      FINANCE_COMPLETE: true,
      SEGMENTATION: true,
      // Recursos exclusivos do Plano Premium
      BRANCHES: false,
      ADVANCED_LEADERSHIP: false,
      EBD: false,
      KIDS_CHECKIN: false,
      ANALYTICS_AUDIT: false,
      GRANULAR_PERMISSIONS: false,
      CUSTOM_BRANDING: false,
      API_INTEGRATION: false,
      VIP_SUPPORT: false,
    },
  },
  PREMIUM: {
    slug: "PREMIUM",
    name: "Premium",
    monthlyPrice: 399,
    setupPrice: 1290,
    badge: "MULTISSEDE VIP",
    description: "Para igrejas maiores, catedrais e redes com congregações",
    featuresList: [
      "TUDO do Plano Gestão, mais:",
      "Múltiplas congregações (Matriz e Filiais integradas)",
      "Gestão avançada de pastores e liderança geral",
      "EBD (Escola Bíblica Dominical) e cursos",
      "Check-in Kids com etiquetas e código de segurança",
      "Relatórios analíticos e auditoria avançada",
      "Múltiplos administradores com permissões granulares",
      "Personalizações exclusivas de marca e cores",
      "Integrações via API e automações",
      "Suporte VIP dedicado com gerente de conta",
    ],
    allowedFeatures: {
      MEMBERS: true,
      PWA: true,
      MURAL: true,
      CALENDAR: true,
      PRAYER: true,
      DEVOTIONALS: true,
      PIX_DONATIONS: true,
      NOTIFICATIONS: true,
      ADMIN_PANEL: true,
      WHATSAPP_SUPPORT: true,
      MINISTRIES: true,
      CELLS: true,
      SCHEDULES: true,
      ATTENDANCE: true,
      EVENTS: true,
      FINANCE_COMPLETE: true,
      SEGMENTATION: true,
      BRANCHES: true,
      ADVANCED_LEADERSHIP: true,
      EBD: true,
      KIDS_CHECKIN: true,
      ANALYTICS_AUDIT: true,
      GRANULAR_PERMISSIONS: true,
      CUSTOM_BRANDING: true,
      API_INTEGRATION: true,
      VIP_SUPPORT: true,
    },
  },
};

export function normalizePlanSlug(rawPlan?: string | null): PlanSlug {
  if (!rawPlan) return "GESTAO";
  const upper = rawPlan.toUpperCase().trim();
  if (upper.includes("PREMIUM") || upper.includes("VIP")) return "PREMIUM";
  if (upper.includes("ESSENCIAL")) return "ESSENCIAL";
  return "GESTAO";
}

export function isFeatureAllowedForPlan(rawPlan: string | null | undefined, feature: FeatureKey): boolean {
  const planSlug = normalizePlanSlug(rawPlan);
  const planDef = PLANS_CONFIG[planSlug];
  return !!planDef?.allowedFeatures[feature];
}

export function getRequiredPlanForFeature(feature: FeatureKey): {
  planSlug: PlanSlug;
  planName: string;
  monthlyPrice: number;
} {
  if (PLANS_CONFIG.ESSENCIAL.allowedFeatures[feature]) {
    return {
      planSlug: "ESSENCIAL",
      planName: "Essencial",
      monthlyPrice: PLANS_CONFIG.ESSENCIAL.monthlyPrice,
    };
  }
  if (PLANS_CONFIG.GESTAO.allowedFeatures[feature]) {
    return {
      planSlug: "GESTAO",
      planName: "Gestão",
      monthlyPrice: PLANS_CONFIG.GESTAO.monthlyPrice,
    };
  }
  return {
    planSlug: "PREMIUM",
    planName: "Premium",
    monthlyPrice: PLANS_CONFIG.PREMIUM.monthlyPrice,
  };
}
