"use server";

import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { getSession } from "@/lib/session";

// Inicializa o SDK do Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Garante que existam agentes padrões caso o banco esteja vazio
async function getOrSeedAgents(tenantId?: string | null) {
  let agents = await prisma.agentProfile.findMany({
    where: tenantId
      ? { OR: [{ tenantId }, { tenantId: null }], isActive: true }
      : { isActive: true },
  });

  if (agents.length === 0) {
    // Seed automático de especialistas essenciais
    const defaultAgents = [
      {
        name: "Pastor Conselheiro",
        type: "EXPERT",
        systemPrompt:
          "Você é um amoroso e sábio pastor conselheiro cristão. Fale de forma acolhedora, bíblica, empática e esperançosa. Ouça com o coração, dê palavras de encorajamento, consolo, sabedoria e faça uma breve oração pelo usuário no final.",
        model: "gemini-3.6-flash",
        temperature: 0.7,
        isActive: true,
      },
      {
        name: "Intercessão & Oração",
        type: "EXPERT",
        systemPrompt:
          "Você é o líder do ministério de intercessão da igreja. Você acolhe os pedidos de oração, clama a Deus junto com o usuário e ministra paz, fé e cura sobre a vida dele.",
        model: "gemini-3.6-flash",
        temperature: 0.6,
        isActive: true,
      },
      {
        name: "Discipulado & Fé Prática",
        type: "EXPERT",
        systemPrompt:
          "Você é um mentor de discipulado bíblico. Ajude o usuário a compreender as Escrituras, tirar dúvidas práticas de fé, perdão, oração e caminhada diária com Deus.",
        model: "gemini-3.6-flash",
        temperature: 0.5,
        isActive: true,
      },
    ];

    for (const d of defaultAgents) {
      await prisma.agentProfile.create({ data: d });
    }

    agents = await prisma.agentProfile.findMany({ where: { isActive: true } });
  }

  return agents;
}

/**
 * Carrega a conversa anterior do usuário com o agente pastoral ou inicializa uma nova.
 * Garante que a conversa continue exatamente de onde parou.
 */
export async function getUserConversation(tenantSlug: string) {
  try {
    const session = await getSession();
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada.", messages: [] };
    }

    // Busca usuário ativo no banco
    let userId = session?.userId;
    if (!userId) {
      // Se não logado por sessão, busca o primeiro membro ou admin de fallback para vincular
      const fallbackUser = await prisma.user.findFirst({
        where: { tenantId: tenant.id },
        select: { id: true },
      });
      if (fallbackUser) userId = fallbackUser.id;
    }

    if (!userId) {
      return { success: true, conversationId: null, messages: [] };
    }

    // Busca a conversa mais recente desse usuário nesta igreja
    let conversation = await prisma.conversation.findFirst({
      where: {
        userId,
        tenantId: tenant.id,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        agentProfile: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Se não existir, cria a conversa inicial
    if (!conversation) {
      const agents = await getOrSeedAgents(tenant.id);
      conversation = await prisma.conversation.create({
        data: {
          userId,
          tenantId: tenant.id,
          title: "Acompanhamento Pastoral Contínuo",
          agentProfileId: agents[0]?.id || null,
        },
        include: {
          agentProfile: true,
          messages: true,
        },
      });
    }

    const formattedMessages = conversation.messages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase() === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
      agentName: conversation?.agentProfile?.name || "Pastor Conselheiro",
      timestamp: m.createdAt,
    }));

    return {
      success: true,
      conversationId: conversation.id,
      agentName: conversation.agentProfile?.name || "Pastor Conselheiro",
      messages: formattedMessages,
      hasHistory: formattedMessages.length > 0,
    };
  } catch (error: any) {
    console.error("Erro ao carregar histórico de conversa pastoral:", error);
    return { success: false, error: error.message, messages: [] };
  }
}

/**
 * Cria uma nova conversa em branco para reiniciar o histórico se o usuário desejar.
 */
export async function resetUserConversation(tenantSlug: string) {
  try {
    const session = await getSession();
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });

    if (!tenant) return { success: false, error: "Igreja não encontrada." };

    let userId = session?.userId;
    if (!userId) {
      const fallbackUser = await prisma.user.findFirst({
        where: { tenantId: tenant.id },
        select: { id: true },
      });
      if (fallbackUser) userId = fallbackUser.id;
    }

    if (!userId) return { success: false, error: "Usuário não autenticado." };

    const agents = await getOrSeedAgents(tenant.id);
    const newConv = await prisma.conversation.create({
      data: {
        userId,
        tenantId: tenant.id,
        title: `Check-in de Alma (${new Date().toLocaleDateString("pt-BR")})`,
        agentProfileId: agents[0]?.id || null,
      },
    });

    return { success: true, conversationId: newConv.id };
  } catch (error: any) {
    console.error("Erro ao reiniciar conversa:", error);
    return { success: false, error: error.message };
  }
}

export async function processTextMessage({
  message,
  tenantSlug,
  moodContext,
  conversationId,
}: {
  message: string;
  tenantSlug: string;
  moodContext?: string;
  conversationId?: string | null;
}) {
  try {
    if (!message.trim()) {
      return { success: false, error: "Mensagem vazia." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) return { success: false, error: "Igreja não encontrada." };

    // 1. Garante ou recupera a conversa persistente
    let currentConvId = conversationId;
    if (!currentConvId) {
      const convRes = await getUserConversation(tenantSlug);
      if (convRes.success && convRes.conversationId) {
        currentConvId = convRes.conversationId;
      }
    }

    const agents = await getOrSeedAgents(tenant?.id);
    const agentOptions = agents.map((a) => ({ id: a.id, name: a.name }));

    // =========================================================================
    // PASSO 1: O ORQUESTRADOR ESCOLHE O MELHOR ESPECIALISTA
    // =========================================================================
    const orchestratorPrompt = `Você é um sistema orquestrador de IA pastoral.
Analise a mensagem do usuário (e o estado emocional atual se houver) e escolha o MELHOR especialista para responder, baseado exclusivamente na lista abaixo.

Estado emocional inicial informado: ${moodContext || "Não informado"}
Mensagem do usuário: "${message}"

Especialistas disponíveis:
${JSON.stringify(agentOptions, null, 2)}

REGRA ESTRITA: Retorne APENAS um JSON válido no formato exato:
{
  "selectedAgentId": "id-do-especialista-escolhido",
  "reason": "motivo da escolha"
}`;

    const orchestratorRes = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: orchestratorPrompt }] }],
      config: { temperature: 0.1 },
    });

    let selectedAgentId = agents[0].id;
    try {
      const rawText = (orchestratorRes.text || "{}")
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(rawText);
      if (parsed.selectedAgentId) selectedAgentId = parsed.selectedAgentId;
    } catch {
      selectedAgentId = agents[0].id;
    }

    const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
    const systemInstruction = `${selectedAgent.systemPrompt}\n\nContexto: Você está conversando com um membro da congregação '${tenant?.name || "Igreja"}'. Se o usuário expressar tristeza, ansiedade, cansaço ou alegria, responda com empatia profunda, trazendo versículos relevantes e uma oração carinhosa. Mantenha a continuidade da conversa com base nas mensagens anteriores trocadas. Seja acolhedor e consolador.`;

    const modelName =
      selectedAgent.model === "gemini-1.5-flash"
        ? "gemini-3.6-flash"
        : selectedAgent.model || "gemini-3.6-flash";

    // 2. Busca histórico recente de mensagens da conversa (últimas 12 mensagens) para dar memória ao Gemini
    let conversationHistory: any[] = [];
    if (currentConvId) {
      const pastMessages = await prisma.message.findMany({
        where: { conversationId: currentConvId },
        orderBy: { createdAt: "asc" },
        take: 12,
      });

      conversationHistory = pastMessages.map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.content }],
      }));
    }

    // Adiciona a nova mensagem do usuário no contexto enviado para a IA
    conversationHistory.push({
      role: "user" as const,
      parts: [{ text: message }],
    });

    // =========================================================================
    // PASSO 2: O ESPECIALISTA RESPONDE COM BASE NO HISTÓRICO COMPLETO
    // =========================================================================
    const finalRes = await ai.models.generateContent({
      model: modelName,
      contents: conversationHistory,
      config: {
        systemInstruction,
        temperature: selectedAgent.temperature || 0.7,
      },
    });

    const textResponse = finalRes.text || "Estou com você em oração neste momento. Que a paz de Deus reine em seu coração.";

    // =========================================================================
    // PASSO 3: PERSISTE AMBAS AS MENSAGENS NO BANCO DE DADOS
    // =========================================================================
    if (currentConvId) {
      await prisma.$transaction([
        prisma.message.create({
          data: {
            conversationId: currentConvId,
            role: "USER",
            content: message.trim(),
          },
        }),
        prisma.message.create({
          data: {
            conversationId: currentConvId,
            role: "MODEL",
            content: textResponse,
          },
        }),
        prisma.conversation.update({
          where: { id: currentConvId },
          data: {
            updatedAt: new Date(),
            agentProfileId: selectedAgent.id,
          },
        }),
      ]);
    }

    return {
      success: true,
      textResponse,
      agentName: selectedAgent.name,
      agentType: selectedAgent.type,
      conversationId: currentConvId,
    };
  } catch (error: any) {
    console.error("Erro ao processar mensagem com Gemini:", error);
    return {
      success: false,
      error: "Não foi possível conectar ao conselheiro agora. Tente novamente em instantes.",
    };
  }
}

export async function processVoiceMessage(formData: FormData) {
  try {
    const audioBase64 = formData.get("audio") as string;
    const tenantSlug = formData.get("tenantSlug") as string || formData.get("tenantId") as string;
    let conversationId = formData.get("conversationId") as string | null;

    if (!audioBase64 || !tenantSlug) {
      return { success: false, error: "Áudio ou identificação não fornecidos." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) return { success: false, error: "Igreja não encontrada." };

    if (!conversationId) {
      const convRes = await getUserConversation(tenantSlug);
      if (convRes.success && convRes.conversationId) {
        conversationId = convRes.conversationId;
      }
    }

    // 1. Buscar agentes
    const agents = await getOrSeedAgents(tenant.id);
    const agentOptions = agents.map((a) => ({
      id: a.id,
      name: a.name,
    }));

    // =========================================================================
    // PASSO 1: O ORQUESTRADOR (Transcreve e Escolhe o Especialista)
    // =========================================================================
    const orchestratorPrompt = `Você é um sistema orquestrador de IA. 
Ouça o áudio anexo do usuário e faça DUAS coisas:
1. Transcreva exatamente o que o usuário disse (mesmo que seja curto).
2. Analise o contexto, a dor ou a dúvida, e escolha o MELHOR especialista para responder, baseado exclusivamente na lista abaixo.

Agentes disponíveis:
${JSON.stringify(agentOptions, null, 2)}

REGRA ESTRITA: Retorne APENAS um objeto JSON válido. Não inclua blocos de código markdown (como \`\`\`json). O formato deve ser exato:
{
  "transcription": "texto do que o usuario falou",
  "selectedAgentId": "id-escolhido"
}`;

    const orchestratorRes = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: audioBase64, mimeType: "audio/webm" } },
            { text: orchestratorPrompt },
          ],
        },
      ],
      config: { temperature: 0.1 },
    });

    let orchestratorData;
    try {
      const textVal = orchestratorRes.text || "{}";
      const rawText = textVal.replace(/```json/g, "").replace(/```/g, "").trim();
      orchestratorData = JSON.parse(rawText);
    } catch (e) {
      console.error("Falha ao fazer parse do orquestrador:", orchestratorRes.text);
      orchestratorData = {
        transcription: "Gostaria de uma palavra pastoral de conforto e oração.",
        selectedAgentId: agents[0].id,
      };
    }

    const selectedAgent = agents.find((a) => a.id === orchestratorData.selectedAgentId) || agents[0];
    const systemInstruction = `${selectedAgent.systemPrompt}\n\nContexto: Membro da igreja '${tenant.name}'. Mantenha a conversa acolhedora, pastoral e contextualizada com as mensagens anteriores.`;
    const modelName = selectedAgent.model === "gemini-1.5-flash" ? "gemini-3.6-flash" : (selectedAgent.model || "gemini-3.6-flash");

    // Histórico prévio
    let conversationHistory: any[] = [];
    if (conversationId) {
      const pastMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        take: 12,
      });

      conversationHistory = pastMessages.map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.content }],
      }));
    }

    conversationHistory.push({
      role: "user" as const,
      parts: [{ text: orchestratorData.transcription }],
    });

    // =========================================================================
    // PASSO 2: O ESPECIALISTA RESPONDE COM BASE NO HISTÓRICO
    // =========================================================================
    const finalRes = await ai.models.generateContent({
      model: modelName,
      contents: conversationHistory,
      config: {
        systemInstruction,
        temperature: selectedAgent.temperature || 0.7,
      },
    });

    const textResponse = finalRes.text || "Recebo o seu desabafo em meu coração e uno minha fé à sua.";

    // =========================================================================
    // PASSO 3: PERSISTE AS MENSAGENS NO BANCO
    // =========================================================================
    if (conversationId) {
      await prisma.$transaction([
        prisma.message.create({
          data: {
            conversationId,
            role: "USER",
            content: `🎤 "${orchestratorData.transcription}"`,
          },
        }),
        prisma.message.create({
          data: {
            conversationId,
            role: "MODEL",
            content: textResponse,
          },
        }),
        prisma.conversation.update({
          where: { id: conversationId },
          data: {
            updatedAt: new Date(),
            agentProfileId: selectedAgent.id,
          },
        }),
      ]);
    }

    return {
      success: true,
      textResponse,
      agentName: selectedAgent.name,
      userTranscription: orchestratorData.transcription,
      conversationId,
    };
  } catch (error: any) {
    console.error("Erro ao processar voz no Gemini:", error);
    return { success: false, error: "Não foi possível processar o seu áudio agora. Tente novamente mais tarde." };
  }
}
