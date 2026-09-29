"use server";

import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { getSession } from "@/lib/session";

// Inicializa o SDK do Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper para extrair primeiro nome carinhoso ou título ministerial
function formatFirstName(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return "";
  const clean = fullName.trim();
  const parts = clean.split(/\s+/);
  const firstLower = parts[0].toLowerCase();
  if (
    firstLower.startsWith("pastor") ||
    firstLower.startsWith("pra") ||
    firstLower.startsWith("pr.") ||
    firstLower.startsWith("bispo") ||
    firstLower.startsWith("rev")
  ) {
    return parts.slice(0, 2).join(" ");
  }
  if (parts.length > 1 && parts[0].length <= 3) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}

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
    let userName = session?.name || null;

    if (!userId) {
      // Se não logado por sessão, busca o primeiro membro ou admin de fallback para vincular
      const fallbackUser = await prisma.user.findFirst({
        where: { tenantId: tenant.id },
        select: { id: true, name: true },
      });
      if (fallbackUser) {
        userId = fallbackUser.id;
        if (!userName) userName = fallbackUser.name;
      }
    } else if (!userName) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      if (dbUser?.name) userName = dbUser.name;
    }

    if (!userId) {
      return { success: true, conversationId: null, messages: [], userName: null, firstName: "" };
    }

    const firstName = formatFirstName(userName);

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
      userName,
      firstName,
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

    // Buscar informações do usuário para personalização humana e afetuosa
    const session = await getSession();
    let userName = session?.name;
    if (!userName && currentConvId) {
      const conv = await prisma.conversation.findUnique({
        where: { id: currentConvId },
        include: { user: { select: { name: true } } },
      });
      if (conv?.user?.name) userName = conv.user.name;
    }
    const firstName = formatFirstName(userName);

    const systemInstruction = `${selectedAgent.systemPrompt}

DIRETRIZES FUNDAMENTAIS DE CUIDADO PASTORAL E ACOLHIMENTO:
1. TRATAMENTO PESSOAL PELO PRIMEIRO NOME: Você está falando diretamente com ${firstName ? `"${firstName}"` : "um irmão(ã)"}, membro querido(a) da congregação '${tenant?.name || "Igreja"}'. SEMPRE se dirija a ${firstName ? `"${firstName}"` : "ele(a)"} pelo primeiro nome de forma calorosa, afetuosa, respeitosa e natural ao longo do diálogo.
2. HUMANIZAÇÃO PROFUNDA: Escreva com o coração de um pastor ou conselheiro espiritual sábio, amoroso, empático e presente. Use uma linguagem viva, calorosa, acolhedora e próxima, como um amigo e guia espiritual sentado ao lado dele ouvindo com carinho. NUNCA pareça um assistente virtual robótico ou uma IA técnica distante.
3. ESCUTA ATIVA & EMPATIA: Acolha suas dores, incertezas, cansaço ou alegrias compartilhadas com sensibilidade genuína e compaixão cristã sincera.
4. PALAVRA VIVA: Traga versículos bíblicos de alívio e esperança de maneira suave e reconfortante, aplicando à realidade de ${firstName || "sua vida"}.
5. ORAÇÃO FINAL: Conclua sempre com uma oração carinhosa, pastoral e pessoal, intercedendo diretamente pela vida, paz e fortalecimento de ${firstName ? firstName : "ele(a)"}.
6. CONTINUIDADE: Considere o histórico das mensagens trocadas para manter a conversa fluida e coerente.`;

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

    // Buscar informações do usuário
    const session = await getSession();
    let userName = session?.name;
    if (!userName && conversationId) {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { user: { select: { name: true } } },
      });
      if (conv?.user?.name) userName = conv.user.name;
    }
    const firstName = formatFirstName(userName);

    const systemInstruction = `${selectedAgent.systemPrompt}

DIRETRIZES DE ATENDIMENTO PASTORAL E ACOLHIMENTO HUMANO (RESPOSTA A ÁUDIO):
1. TRATAMENTO PESSOAL PELO PRIMEIRO NOME: Você ouviu o áudio enviado por ${firstName ? `"${firstName}"` : "um irmão(ã)"}, membro querido(a) da igreja '${tenant.name}'. Chame ${firstName ? `"${firstName}"` : "ele(a)"} pelo primeiro nome com profundo carinho e sensibilidade pastoral ao longo de toda a resposta.
2. HUMANIZAÇÃO E LEITURA AFETIVA: O usuário gravou sua própria voz e abriu o coração. Sua resposta precisa soar viva, profundamente humana, empática e acolhedora, como um pastor ou conselheiro sábio ao lado dele(a). NUNCA seja frio ou robótico.
3. CONFORTO E PALAVRA: Valide o que foi falado no áudio com amor cristão, ministre paz e traga uma palavra bíblica consoladora.
4. ORAÇÃO NOMINAL: Termine sempre orando diretamente por ${firstName ? firstName : "ele(a)"}, pedindo graça, forças e paz de Deus sobre a vida dele(a).`;
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
