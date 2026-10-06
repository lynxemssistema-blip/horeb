"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export interface MonthlyContribution {
  month: number;
  monthName: string;
  totalTithe: number;
  totalOffering: number;
  total: number;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export async function getMemberAnnualTaxStatement(
  slug: string,
  year = new Date().getFullYear(),
  targetUserId?: string
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const userId = targetUserId || session.userId;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        address: true,
        city: true,
        state: true,
        pixKey: true,
        pastorName: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const member = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        createdAt: true,
      },
    });

    if (!member) {
      return { success: false, error: "Membro não encontrado." };
    }

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // Buscar transações de entrada associadas ao membro no ano
    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId: tenant.id,
        memberId: member.id,
        type: "INCOME",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Agrupar mês a mês
    const months: MonthlyContribution[] = MONTH_NAMES.map((name, idx) => ({
      month: idx + 1,
      monthName: name,
      totalTithe: 0,
      totalOffering: 0,
      total: 0,
    }));

    let grandTotalTithe = 0;
    let grandTotalOffering = 0;
    let grandTotal = 0;

    for (const t of transactions) {
      const monthIdx = new Date(t.createdAt).getMonth();
      const cat = (t.category || "").toLowerCase();
      const amount = t.amount;

      if (cat.includes("dizimo") || cat.includes("tithe")) {
        months[monthIdx].totalTithe += amount;
        grandTotalTithe += amount;
      } else {
        months[monthIdx].totalOffering += amount;
        grandTotalOffering += amount;
      }

      months[monthIdx].total += amount;
      grandTotal += amount;
    }

    // Código de autenticidade fiscal
    const verificationHash = `IRPF-${year}-${member.id.substring(0, 6).toUpperCase()}-${Math.round(grandTotal)}`;

    return {
      success: true,
      year,
      church: {
        name: tenant.name,
        cnpj: tenant.pixKey || "00.000.000/0001-00",
        address: tenant.address || "Sede da Igreja",
        cityState: [tenant.city, tenant.state].filter(Boolean).join(" - ") || "Brasil",
        pastorName: tenant.pastorName || "Pastor Presidente",
        logoUrl: tenant.logoUrl,
      },
      member: {
        name: member.name,
        cpf: member.cpf || "Não informado no cadastro",
        email: member.email,
      },
      months,
      totals: {
        tithe: grandTotalTithe,
        offering: grandTotalOffering,
        total: grandTotal,
      },
      transactionsCount: transactions.length,
      verificationHash,
      issuedAt: new Date(),
    };
  } catch (error: any) {
    console.error("Erro ao gerar informe de rendimentos para IRPF:", error);
    return { success: false, error: error.message };
  }
}
