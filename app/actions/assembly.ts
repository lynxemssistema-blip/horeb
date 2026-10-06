"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getChurchAssemblies(slug: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        logoUrl: true,
        pastorName: true,
        address: true,
        city: true,
        state: true,
        pixKey: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    // Buscar total de membros ativos para cálculo do quórum estatutário
    const totalEligibleMembers = await prisma.user.count({
      where: { tenantId: tenant.id },
    });

    const assemblies = await prisma.assembly.findMany({
      where: { tenantId: tenant.id },
      include: {
        agendaItems: {
          include: {
            votes: {
              select: {
                id: true,
                userId: true,
                voteChoice: true,
                votedAt: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { date: "desc" },
    });

    // Enriquecer cada assembleia com cálculos de quórum e votos do usuário logado
    const enrichedAssemblies = assemblies.map((asm) => {
      // Coletar IDs de membros únicos que votaram em qualquer pauta desta assembleia
      const uniqueVotersSet = new Set<string>();
      asm.agendaItems.forEach((item) => {
        item.votes.forEach((v) => uniqueVotersSet.add(v.userId));
      });

      const currentVotersCount = uniqueVotersSet.size;
      const quorumPercentAchieved =
        asm.totalEligibleMembers > 0
          ? Math.round((currentVotersCount / asm.totalEligibleMembers) * 100)
          : 0;

      const enrichedAgendaItems = itemEnrichment(asm.agendaItems, session.userId);

      return {
        ...asm,
        currentVotersCount,
        quorumPercentAchieved,
        isQuorumReached: quorumPercentAchieved >= asm.requiredQuorumPercent,
        agendaItems: enrichedAgendaItems,
      };
    });

    return {
      success: true,
      tenant,
      totalEligibleMembers,
      assemblies: enrichedAssemblies,
      currentUser: {
        id: session.userId,
        name: session.name,
        role: session.role,
      },
    };
  } catch (error: any) {
    console.error("Erro ao carregar assembleias:", error);
    return { success: false, error: "Falha ao carregar assembleias da congregação." };
  }
}

function itemEnrichment(items: any[], currentUserId: string) {
  return items.map((item) => {
    let yesCount = 0;
    let noCount = 0;
    let abstainCount = 0;
    let userVoteChoice: string | null = null;

    item.votes.forEach((v: any) => {
      if (v.voteChoice === "YES") yesCount++;
      else if (v.voteChoice === "NO") noCount++;
      else if (v.voteChoice === "ABSTAIN") abstainCount++;

      if (v.userId === currentUserId) {
        userVoteChoice = v.voteChoice;
      }
    });

    const totalVotes = yesCount + noCount + abstainCount;
    const isApproved = totalVotes > 0 && yesCount > noCount;

    return {
      ...item,
      totalVotes,
      yesCount,
      noCount,
      abstainCount,
      isApproved,
      userHasVoted: Boolean(userVoteChoice),
      userVoteChoice,
    };
  });
}

export async function createAssembly(
  slug: string,
  data: {
    title: string;
    date: string;
    type: "ORDINARY" | "EXTRAORDINARY";
    requiredQuorumPercent: number;
    description?: string;
    agendaItems: Array<{
      title: string;
      description?: string;
      voteType: "OPEN" | "SECRET";
    }>;
  }
) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "PASTOR"].includes(session.role)) {
      return { success: false, error: "Apenas administradores e pastores podem convocar assembleias." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const totalEligibleMembers = await prisma.user.count({
      where: { tenantId: tenant.id },
    });

    const newAssembly = await prisma.assembly.create({
      data: {
        tenantId: tenant.id,
        title: data.title,
        date: new Date(data.date),
        type: data.type,
        status: "SCHEDULED",
        requiredQuorumPercent: Number(data.requiredQuorumPercent) || 50,
        description: data.description || null,
        totalEligibleMembers: totalEligibleMembers || 1,
        agendaItems: {
          create: data.agendaItems.map((item, idx) => ({
            order: idx + 1,
            title: item.title,
            description: item.description || null,
            voteType: item.voteType || "OPEN",
            status: "PENDING",
          })),
        },
      },
    });

    revalidatePath(`/${slug}/admin/assembleias`);
    return {
      success: true,
      message: `Assembleia "${newAssembly.title}" convocada com sucesso!`,
      assembly: newAssembly,
    };
  } catch (error: any) {
    console.error("Erro ao criar assembleia:", error);
    return { success: false, error: "Falha ao convocar assembleia." };
  }
}

export async function updateAssemblyStatus(
  slug: string,
  assemblyId: string,
  status: "SCHEDULED" | "IN_PROGRESS" | "CLOSED"
) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "PASTOR"].includes(session.role)) {
      return { success: false, error: "Permissão insuficiente." };
    }

    // Se estiver fechando, atualizar minuta da ata automaticamente
    let minutesText: string | null = null;
    if (status === "CLOSED") {
      const minutesRes = await buildMinutesText(assemblyId);
      minutesText = minutesRes;
    }

    await prisma.assembly.update({
      where: { id: assemblyId },
      data: {
        status,
        ...(minutesText ? { minutesSummary: minutesText } : {}),
      },
    });

    revalidatePath(`/${slug}/admin/assembleias`);
    return {
      success: true,
      message: `Status da assembleia alterado para ${status === "IN_PROGRESS" ? "EM ANDAMENTO" : status === "CLOSED" ? "ENCERRADA (ATA GERADA)" : "AGENDADA"}.`,
    };
  } catch (error: any) {
    console.error("Erro ao alterar status da assembleia:", error);
    return { success: false, error: "Falha ao alterar status da assembleia." };
  }
}

export async function updateAgendaItemStatus(
  slug: string,
  itemId: string,
  status: "PENDING" | "VOTING" | "CLOSED"
) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "PASTOR"].includes(session.role)) {
      return { success: false, error: "Permissão insuficiente." };
    }

    const updated = await prisma.assemblyAgendaItem.update({
      where: { id: itemId },
      data: { status },
    });

    revalidatePath(`/${slug}/admin/assembleias`);
    return {
      success: true,
      message: `Votação da pauta agora está ${status === "VOTING" ? "ABERTA AOS MEMBROS" : status === "CLOSED" ? "ENCERRADA" : "AGUARDANDO"}.`,
      item: updated,
    };
  } catch (error: any) {
    console.error("Erro ao alterar pauta:", error);
    return { success: false, error: "Falha ao atualizar pauta." };
  }
}

export async function submitAssemblyVote(
  slug: string,
  agendaItemId: string,
  voteChoice: "YES" | "NO" | "ABSTAIN"
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Você precisa estar conectado para votar." };
    }

    const item = await prisma.assemblyAgendaItem.findUnique({
      where: { id: agendaItemId },
      include: { assembly: true },
    });

    if (!item) {
      return { success: false, error: "Pauta não encontrada." };
    }

    if (item.status !== "VOTING") {
      return { success: false, error: "A votação desta pauta não está aberta no momento." };
    }

    if (item.assembly.status !== "IN_PROGRESS") {
      return { success: false, error: "A assembleia precisa estar 'EM ANDAMENTO' para receber votos." };
    }

    await prisma.assemblyVote.upsert({
      where: {
        agendaItemId_userId: {
          agendaItemId,
          userId: session.userId,
        },
      },
      update: {
        voteChoice,
        votedAt: new Date(),
      },
      create: {
        agendaItemId,
        userId: session.userId,
        voteChoice,
      },
    });

    revalidatePath(`/${slug}/admin/assembleias`);
    return {
      success: true,
      message: `Seu voto (${voteChoice === "YES" ? "SIM" : voteChoice === "NO" ? "NÃO" : "ABSTENÇÃO"}) foi computado com sucesso!`,
    };
  } catch (error: any) {
    console.error("Erro ao computar voto:", error);
    return { success: false, error: "Falha ao computar seu voto na assembleia." };
  }
}

export async function generateAssemblyMinutes(slug: string, assemblyId: string) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "PASTOR"].includes(session.role)) {
      return { success: false, error: "Permissão insuficiente." };
    }

    const minutesText = await buildMinutesText(assemblyId);

    await prisma.assembly.update({
      where: { id: assemblyId },
      data: { minutesSummary: minutesText },
    });

    revalidatePath(`/${slug}/admin/assembleias`);
    return {
      success: true,
      minutes: minutesText,
      message: "Minuta da Ata gerada com sucesso e pronta para impressão/registro!",
    };
  } catch (error: any) {
    console.error("Erro ao gerar ata:", error);
    return { success: false, error: "Falha ao gerar ata da assembleia." };
  }
}

async function buildMinutesText(assemblyId: string): Promise<string> {
  const assembly = await prisma.assembly.findUnique({
    where: { id: assemblyId },
    include: {
      tenant: true,
      agendaItems: {
        include: {
          votes: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!assembly) return "";

  const churchName = assembly.tenant.name.toUpperCase();
  const dateFormatted = format(new Date(assembly.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const typeLabel =
    assembly.type === "ORDINARY"
      ? "ASSEMBLEIA GERAL ORDINÁRIA (A.G.O.)"
      : "ASSEMBLEIA GERAL EXTRAORDINÁRIA (A.G.E.)";

  // Calcular membros únicos votantes
  const uniqueVoters = new Set<string>();
  assembly.agendaItems.forEach((item) => {
    item.votes.forEach((v) => uniqueVoters.add(v.userId));
  });

  const presentCount = uniqueVoters.size;
  const quorumPercent =
    assembly.totalEligibleMembers > 0
      ? Math.round((presentCount / assembly.totalEligibleMembers) * 100)
      : 0;

  let minutes = `ATA DA ${typeLabel}\n`;
  minutes += `ENTIDADE RELIGIOSA: ${churchName}\n`;
  minutes += `DATA DE REALIZAÇÃO: ${dateFormatted}\n\n`;

  minutes += `Aos ${dateFormatted}, reuniu-se a membresia da ${churchName} em sua sede, sob a presidência do pastor ${assembly.tenant.pastorName || "Presidente"}, a fim de deliberar sobre a seguinte ordem do dia: "${assembly.title}".\n\n`;

  minutes += `VERIFICAÇÃO DE QUÓRUM ESTATUTÁRIO:\n`;
  minutes += `Constatou-se a presença de ${presentCount} membros ativos dentre o rol de ${assembly.totalEligibleMembers} membros cadastrados, perfazendo um quórum atingido de ${quorumPercent}%, em estrito cumprimento ao quórum estatutário mínimo exigido de ${assembly.requiredQuorumPercent}%.\n\n`;

  minutes += `DELIBERAÇÕES E VOTAÇÕES DA ORDEM DO DIA:\n`;

  assembly.agendaItems.forEach((item) => {
    let yes = 0;
    let no = 0;
    let abstain = 0;

    item.votes.forEach((v) => {
      if (v.voteChoice === "YES") yes++;
      else if (v.voteChoice === "NO") no++;
      else if (v.voteChoice === "ABSTAIN") abstain++;
    });

    const isApproved = yes > no;

    minutes += `Pauta ${item.order}: "${item.title}"\n`;
    if (item.description) minutes += `Descrição: ${item.description}\n`;
    minutes += `Modalidade: ${item.voteType === "SECRET" ? "Voto Secreto" : "Voto Aberto"}\n`;
    minutes += `Resultado da Votação: SIM: ${yes} | NÃO: ${no} | ABSTENÇÕES: ${abstain}\n`;
    minutes += `Decisão Soberana: ${isApproved ? "APROVADA PELA MAIORIA" : "REJEITADA PELA MAIORIA"}\n\n`;
  });

  minutes += `ENCERRAMENTO:\n`;
  minutes += `Nada mais havendo a tratar, o Senhor Presidente declarou encerrada a presente assembleia, da qual lavrou-se esta ata para que surta todos os efeitos estatutários e legais perante o Cartório de Registro Civil das Pessoas Jurídicas competente.\n\n`;

  minutes += `_____________________________________________\n`;
  minutes += `${assembly.tenant.pastorName || "Pastor Presidente"}\n`;
  minutes += `Presidente da Assembleia\n\n`;

  minutes += `_____________________________________________\n`;
  minutes += `Secretaria Geral da Assembleia\n`;

  return minutes;
}
