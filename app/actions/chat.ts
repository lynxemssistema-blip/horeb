"use server";

import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

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

export async function processTextMessage({
  message,
  tenantSlug,
  moodContext,
}: {
  message: string;
  tenantSlug: string;
  moodContext?: string;
}) {
  try {
    if (!message.trim()) {
      return { success: false, error: "Mensagem vazia." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

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
    const systemInstruction = `${selectedAgent.systemPrompt}\n\nContexto: Você está conversando com um membro da congregação '${tenant?.name || "Igreja"}'. Se o usuário expressar tristeza, ansiedade, cansaço ou alegria, responda com empatia profunda, trazendo versículos relevantes e uma oração carinhosa. Seja direto, acolhedor e consolador.`;

    const modelName =
      selectedAgent.model === "gemini-1.5-flash"
        ? "gemini-3.6-flash"
        : selectedAgent.model || "gemini-3.6-flash";

    // =========================================================================
    // PASSO 2: O ESPECIALISTA RESPONDE
    // =========================================================================
    const finalRes = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction,
        temperature: selectedAgent.temperature || 0.7,
      },
    });

    return {
      success: true,
      textResponse: finalRes.text,
      agentName: selectedAgent.name,
      agentType: selectedAgent.type,
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
    const tenantId = formData.get("tenantId") as string;
    let conversationId = formData.get("conversationId") as string | null;

    if (!audioBase64 || !tenantId) {
      return { success: false, error: "Áudio ou identificação não fornecidos." };
    }

    // 1. Buscar ou semear agentes
    const agents = await getOrSeedAgents(tenantId);

    const agentOptions = agents.map(a => ({
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
            { text: orchestratorPrompt }
          ]
        }
      ],
      config: { temperature: 0.1 } // Baixa temperatura para JSON estruturado
    });

    let orchestratorData;
    try {
      const textVal = orchestratorRes.text || "{}";
      const rawText = textVal.replace(/```json/g, '').replace(/```/g, '').trim();
      orchestratorData = JSON.parse(rawText);
    } catch (e) {
      console.error("Falha ao fazer parse do orquestrador:", orchestratorRes.text);
      // Fallback
      orchestratorData = {
        transcription: "Não consegui transcrever perfeitamente.",
        selectedAgentId: agents[0].id
      };
    }

    // Identificar qual agente foi escolhido
    const selectedAgent = agents.find(a => a.id === orchestratorData.selectedAgentId) || agents[0];
    const systemInstruction = selectedAgent.systemPrompt;
    const modelName = selectedAgent.model === "gemini-1.5-flash" ? "gemini-3.6-flash" : (selectedAgent.model || "gemini-3.6-flash");

    // =========================================================================
    // PASSO 2: O ESPECIALISTA RESPONDE (Usando a transcrição, é mais rápido)
    // =========================================================================
    const finalRes = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [{ text: orchestratorData.transcription }]
        }
      ],
      config: {
        systemInstruction,
        temperature: selectedAgent.temperature || 0.7,
      }
    });

    const textResponse = finalRes.text;

    return { 
      success: true, 
      textResponse,
      agentName: selectedAgent.name,
      userTranscription: orchestratorData.transcription,
      conversationId: "mock-id-for-now" 
    };
  } catch (error: any) {
    console.error("Erro ao processar voz no Gemini:", error);
    return { success: false, error: "Não foi possível processar o seu áudio agora. Tente novamente mais tarde." };
  }
}
