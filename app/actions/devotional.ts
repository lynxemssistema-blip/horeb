"use server";

import { prisma } from "@/lib/prisma";

export interface DevotionalResponse {
  mood: string;
  verse: string;
  reference: string;
  message: string;
}

const SENSITIVE_WORDS = [
  "depressão",
  "depressao",
  "desisto",
  "sumir",
  "angústia",
  "angustia",
  "acabou",
  "suicídio",
  "suicidio",
  "morte",
  "desespero",
  "não aguento",
  "nao aguento",
  "tirar minha vida",
  "morrer",
  "acabar com tudo",
];

const DEVOTIONAL_PRESETS: Record<string, { verse: string; reference: string; message: string }> = {
  FELIZ: {
    verse: "Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.",
    reference: "Salmos 118:24",
    message:
      "A alegria que transborda do seu coração hoje é um testemunho vivo da graça de Deus! Celebre cada bênção, contagie quem está ao seu redor e use essa força para glorificar o Pai. Que a paz de Cristo continue sendo o seu escudo e o seu cântico neste dia.",
  },
  CANSADO: {
    verse: "Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.",
    reference: "Mateus 11:28",
    message:
      "Você não precisa carregar o peso do mundo nos seus ombros. Jesus conhece os seus limites e convida você a descansar nos braços Dele. Desacelere sua mente, respire fundo e entregue a Ele as suas fadigas. O Senhor renova as suas forças como as da águia hoje.",
  },
  ANSIOSO: {
    verse:
      "Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas diante de Deus as vossas petições, pela oração e pela súplica, com ações de graças. E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e as vossas mentes em Cristo Jesus.",
    reference: "Filipenses 4:6-7",
    message:
      "O amanhã ainda não chegou, mas o Deus que cuida de você já está lá. Quando a ansiedade tentar roubar o seu fôlego, lembre-se: nenhuma folha cai sem a permissão do Pai. Solte o controle das coisas que você não pode mudar e abrace a paz sobrenatural que só o Senhor pode derramar sobre a sua alma agora.",
  },
  TRISTE: {
    verse: "Perto está o Senhor dos que têm o coração quebrantado e salva os de espírito abatido.",
    reference: "Salmos 34:18",
    message:
      "Suas lágrimas nunca passam despercebidas diante do Criador. Há dias em que o peito aperta e a dor parece silenciosa, mas você jamais esteve sozinho. Permita-se ser acolhido pelo abraço caloroso do Espírito Santo. O choro pode durar uma noite, mas a alegria com certeza vem ao amanhecer.",
  },
};

/**
 * 1. Simulação de Inteligência Artificial para Devocional Diário
 * Latência de 2.5s para simular o tempo de reflexão / geração da IA.
 */
export async function getDailyDevotional(mood: string, tenantId?: string) {
  try {
    const normalizedMood = (mood || "FELIZ").trim().toUpperCase();

    // Simulação da latência da IA (2.5 segundos)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const devotionalData =
      DEVOTIONAL_PRESETS[normalizedMood] || DEVOTIONAL_PRESETS.FELIZ;

    // Persistência silenciosa do histórico emocional do membro (se churchSlugOrId for fornecido)
    if (tenantId) {
      try {
        const tenant = await prisma.tenant.findFirst({
          where: {
            OR: [{ id: tenantId }, { slug: tenantId }],
          },
          select: { id: true },
        });

        if (tenant) {
          await prisma.moodCheckIn.create({
            data: {
              mood: normalizedMood,
              tenantId: tenant.id,
            },
          });
        }
      } catch (err) {
        console.warn("Aviso ao salvar histórico de check-in emocional:", err);
      }
    }

    return {
      success: true,
      devotional: {
        mood: normalizedMood,
        verse: devotionalData.verse,
        reference: devotionalData.reference,
        message: devotionalData.message,
      },
    };
  } catch (error: any) {
    console.error("Erro no getDailyDevotional:", error);
    return {
      success: false,
      error: error.message || "Erro ao consultar palavra devocional.",
      devotional: DEVOTIONAL_PRESETS.FELIZ,
    };
  }
}

/**
 * 2. Diário de Oração Privado com Triagem Sensível (Red Alert)
 */
export async function savePrayerRequest(content: string, churchSlugOrId: string) {
  try {
    if (!content || !content.trim()) {
      return { success: false, error: "Escreva seu pedido ou oração antes de salvar." };
    }

    if (!churchSlugOrId) {
      return { success: false, error: "Identificador da congregação não encontrado." };
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id: churchSlugOrId }, { slug: churchSlugOrId }],
      },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada no sistema." };
    }

    const cleanContent = content.trim();
    const lower = cleanContent.toLowerCase();

    // A Mágica da Triagem: detecção de palavras sensíveis para acolhimento pastoral emergencial
    const isRedAlert = SENSITIVE_WORDS.some((word) => lower.includes(word));

    const prayer = await prisma.prayerRequest.create({
      data: {
        content: cleanContent,
        isRedAlert,
        status: "ACTIVE",
        tenantId: tenant.id,
      },
    });

    return {
      success: true,
      isRedAlert,
      prayerId: prayer.id,
      message: "Oração guardada! Deus está cuidando de tudo.",
    };
  } catch (error: any) {
    console.error("Erro ao salvar diário de oração:", error);
    return {
      success: false,
      error: error.message || "Não foi possível registrar seu pedido de oração.",
      isRedAlert: false,
    };
  }
}
