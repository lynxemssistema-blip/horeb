"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import {
  FinancialKPIs,
  MonthlyChartPoint,
  CategorySummary,
  DetailedTransaction,
  ChurchFilterOption,
  CATEGORY_LABELS,
} from "@/lib/finance-constants";

/**
 * ============================================================================
 * SPRINT 3 - FASE 2: MOTOR DE BACKEND FINANCEIRO & SEGURANÇA RBAC MULTI-TENANT
 * ============================================================================
 */

export type UserRole = "MASTER" | "LOCAL";

export interface TransactionPayload {
  tenantId: string;
  type: "INCOME" | "EXPENSE";
  amount: number | string;
  category?: string;
  description?: string;
  paymentMethod?: string;
  memberId?: string | null;
  createdAt?: string | Date;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * PASSO 2 & 3 & 4: Função Principal de Leitura com Motor de Regras RBAC
 * 
 * - Se userRole === 'LOCAL':
 *   Ignora sumariamente filterTenantId (prevenção contra tampering via DevTools).
 *   Filtra estritamente WHERE tenantId === currentTenantId.
 * - Se userRole === 'MASTER':
 *   Se filterTenantId fornecido: WHERE tenantId === filterTenantId.
 *   Se NÃO houver filtro: Visão Consolidada (tenantId === currentTenantId OU parentId === currentTenantId).
 * 
 * Consultas simultâneas via Promise.all:
 * 1. totalIncome: soma de amount onde type === 'INCOME'
 * 2. totalExpense: soma de amount onde type === 'EXPENSE'
 * 3. balance: totalIncome - totalExpense
 * 4. recentTransactions: 15 transações mais recentes com include de member e tenant
 * 5. chartData: agrupado por mês no formato [{ date: 'Março', income: 5000, expense: 2000 }]
 */
export async function getFinancialDashboardData(
  userRole: "MASTER" | "LOCAL",
  currentTenantId: string,
  filterTenantId?: string
) {
  try {
    // PASSO 3: O Motor de Regras de Negócio (RBAC)
    let whereClause: any;

    if (userRole === "LOCAL") {
      // 🔒 Blindagem: Ignora sumariamente qualquer valor em filterTenantId
      whereClause = {
        tenantId: currentTenantId,
        status: "COMPLETED",
      };
    } else {
      // userRole === "MASTER"
      if (filterTenantId && filterTenantId !== "ALL" && filterTenantId.trim() !== "") {
        whereClause = {
          tenantId: filterTenantId,
          status: "COMPLETED",
        };
      } else {
        // Visão Consolidada: Sede (Matriz) + Todas as suas Filiais (parentId === currentTenantId)
        whereClause = {
          OR: [
            { tenantId: currentTenantId },
            { tenant: { parentId: currentTenantId } },
          ],
          status: "COMPLETED",
        };
      }
    }

    // PASSO 4: Consultas Simultâneas Otimizadas via Promise.all
    const [incomeAggregate, expenseAggregate, recentTransactions, allTransactionsForCharts] =
      await Promise.all([
        // 1. Soma de todas as transações com type === 'INCOME'
        prisma.transaction.aggregate({
          where: {
            ...whereClause,
            type: "INCOME",
          },
          _sum: {
            amount: true,
          },
        }),

        // 2. Soma de todas as transações com type === 'EXPENSE'
        prisma.transaction.aggregate({
          where: {
            ...whereClause,
            type: "EXPENSE",
          },
          _sum: {
            amount: true,
          },
        }),

        // 3. As 15 transações mais recentes (ordem decrescente por data) com join no membro e na igreja
        prisma.transaction.findMany({
          where: whereClause,
          take: 15,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
                cpf: true,
              },
            },
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),

        // 4. Transações para agrupamento mensal (formato Recharts)
        prisma.transaction.findMany({
          where: whereClause,
          select: {
            amount: true,
            type: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
      ]);

    const totalIncome = incomeAggregate._sum.amount || 0;
    const totalExpense = expenseAggregate._sum.amount || 0;
    const balance = totalIncome - totalExpense;

    // 5. Agrupamento mensal para chartData: [{ date: 'Março', income: 5000, expense: 2000 }]
    const monthlyMap: Record<string, { date: string; income: number; expense: number }> = {};

    allTransactionsForCharts.forEach((tx) => {
      const date = new Date(tx.createdAt);
      const monthIndex = date.getMonth();
      const monthName = MONTH_NAMES[monthIndex];
      const year = date.getFullYear();
      const sortKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

      if (!monthlyMap[sortKey]) {
        monthlyMap[sortKey] = {
          date: monthName,
          income: 0,
          expense: 0,
        };
      }

      if (tx.type === "INCOME") {
        monthlyMap[sortKey].income += tx.amount;
      } else {
        monthlyMap[sortKey].expense += tx.amount;
      }
    });

    const chartData = Object.keys(monthlyMap)
      .sort()
      .map((key) => ({
        date: monthlyMap[key].date,
        income: Math.round(monthlyMap[key].income * 100) / 100,
        expense: Math.round(monthlyMap[key].expense * 100) / 100,
      }));

    return {
      success: true,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      recentTransactions,
      chartData,
    };
  } catch (error: any) {
    console.error("Erro no motor getFinancialDashboardData:", error);
    return {
      success: false,
      error: error.message || "Falha ao processar dados financeiros.",
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      recentTransactions: [],
      chartData: [],
    };
  }
}

/**
 * PASSO 5: Função de Lançamento Manual (Receitas / Despesas)
 * Valida o payload básico, persiste no banco e simula delay de 1s para teste de loading na UI.
 */
export async function createManualTransaction(data: any) {
  try {
    // 1. Validação básica de payload
    if (!data || typeof data !== "object") {
      throw new Error("Payload de transação inválido.");
    }

    const tenantId = data.tenantId;
    const amount = Number(data.amount);
    const type = data.type;

    if (!tenantId) {
      throw new Error("Identificador da congregação (tenantId) é obrigatório.");
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error("O valor da movimentação deve ser um número maior que zero.");
    }

    if (type !== "INCOME" && type !== "EXPENSE") {
      throw new Error("O tipo da movimentação deve ser estritamente 'INCOME' ou 'EXPENSE'.");
    }

    // Verificar se o tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      throw new Error("Congregação não encontrada no banco de dados.");
    }

    // 2. Persistência no banco via Prisma
    const transaction = await prisma.transaction.create({
      data: {
        tenantId,
        type,
        amount,
        category: data.category || (type === "INCOME" ? "OFERTA" : "OUTROS"),
        description: data.description ? String(data.description).trim() : null,
        paymentMethod: data.paymentMethod || "PIX",
        status: "COMPLETED",
        memberId: type === "INCOME" && data.category === "DIZIMO" && data.memberId ? data.memberId : null,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // 3. Delay simulado de 1 segundo (conforme requisito para teste do loading state na UI)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Revalidação de cache das rotas
    try {
      revalidatePath(`/${tenant.slug}/admin/finance`);
      revalidatePath(`/${tenant.slug}`);
    } catch {}

    return {
      success: true,
      transaction,
      message: `${type === "INCOME" ? "Entrada" : "Saída"} registrada com sucesso!`,
    };
  } catch (error: any) {
    console.error("Erro ao criar transação manual:", error);
    return {
      success: false,
      error: error.message || "Erro ao processar lançamento financeiro.",
    };
  }
}

/**
 * ============================================================================
 * MÉTODOS DE APOIO AO PAINEL ERP E TESTES
 * ============================================================================
 */

/**
 * Motor completo com hierarquia de igrejas, KPIs nominais IRPF e distribuição
 */
export async function getFinancialDashboard(
  userRole: string,
  currentTenantId: string,
  filterTenantId?: string
) {
  try {
    const currentChurch = await prisma.tenant.findUnique({
      where: { id: currentTenantId },
      include: {
        parent: {
          include: { branches: true },
        },
        branches: true,
      },
    });

    if (!currentChurch) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const isMatriz = !currentChurch.parentId;
    const isMasterRole = userRole === "MASTER" || userRole === "ADMIN" || userRole === "SUPERADMIN";

    const networkChurches: ChurchFilterOption[] = [
      {
        id: currentChurch.id,
        name: currentChurch.name,
        slug: currentChurch.slug,
        isMatriz,
      },
    ];

    if (isMatriz) {
      currentChurch.branches.forEach((b) => {
        networkChurches.push({
          id: b.id,
          name: b.name,
          slug: b.slug,
          isMatriz: false,
        });
      });
    } else if (currentChurch.parent) {
      networkChurches.unshift({
        id: currentChurch.parent.id,
        name: currentChurch.parent.name,
        slug: currentChurch.parent.slug,
        isMatriz: true,
      });
      currentChurch.parent.branches.forEach((sister) => {
        if (sister.id !== currentChurch.id) {
          networkChurches.push({
            id: sister.id,
            name: sister.name,
            slug: sister.slug,
            isMatriz: false,
          });
        }
      });
    }

    // Delegar ao motor RBAC
    const roleForEngine: UserRole = isMasterRole ? "MASTER" : "LOCAL";
    const data = await getFinancialDashboardData(roleForEngine, currentTenantId, filterTenantId);

    // Buscar todas as movimentações completas para enriquecer visualização e IRPF
    let whereClause: any;
    if (roleForEngine === "LOCAL") {
      whereClause = { tenantId: currentTenantId, status: "COMPLETED" };
    } else if (filterTenantId && filterTenantId !== "ALL") {
      whereClause = { tenantId: filterTenantId, status: "COMPLETED" };
    } else {
      whereClause = {
        OR: [
          { tenantId: currentTenantId },
          { tenant: { parentId: currentTenantId } },
        ],
        status: "COMPLETED",
      };
    }

    const rawTransactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let nominalTithesTotal = 0;
    let nominalTithesCount = 0;
    let anonymousOfferingsTotal = 0;
    let anonymousOfferingsCount = 0;
    const categoryMap: Record<string, { amount: number; type: "INCOME" | "EXPENSE" }> = {};

    rawTransactions.forEach((tx) => {
      const isIncome = tx.type === "INCOME";
      if (isIncome) {
        if (tx.category === "DIZIMO" && tx.memberId) {
          nominalTithesTotal += tx.amount;
          nominalTithesCount += 1;
        } else {
          anonymousOfferingsTotal += tx.amount;
          anonymousOfferingsCount += 1;
        }
      }

      const cat = tx.category || "OUTROS";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { amount: 0, type: isIncome ? "INCOME" : "EXPENSE" };
      }
      categoryMap[cat].amount += tx.amount;
    });

    const categoryDistribution: CategorySummary[] = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat]?.label || cat,
      amount: Math.round(categoryMap[cat].amount * 100) / 100,
      type: categoryMap[cat].type,
      color: CATEGORY_LABELS[cat]?.color || "#71717a",
    }));

    const formattedTransactions: DetailedTransaction[] = rawTransactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      description: tx.description,
      status: tx.status,
      paymentMethod: tx.paymentMethod,
      createdAt: tx.createdAt.toISOString(),
      tenantId: tx.tenantId,
      tenantName: tx.tenant.name,
      tenantSlug: tx.tenant.slug,
      isNominal: Boolean(tx.memberId && tx.member),
      member: tx.member,
    }));

    const chartData: MonthlyChartPoint[] = data.chartData.map((cd, index) => ({
      month: cd.date,
      monthKey: String(index),
      income: cd.income,
      expense: cd.expense,
      balance: Math.round((cd.income - cd.expense) * 100) / 100,
    }));

    return {
      success: true,
      currentChurch: {
        id: currentChurch.id,
        name: currentChurch.name,
        slug: currentChurch.slug,
        isMatriz,
      },
      kpis: {
        totalIncome: data.totalIncome,
        totalExpense: data.totalExpense,
        balance: data.balance,
        nominalTithesTotal: Math.round(nominalTithesTotal * 100) / 100,
        nominalTithesCount,
        anonymousOfferingsTotal: Math.round(anonymousOfferingsTotal * 100) / 100,
        anonymousOfferingsCount,
      },
      chartData,
      categoryDistribution,
      transactions: formattedTransactions,
      networkChurches,
      isMasterRole,
    };
  } catch (error: any) {
    console.error("Erro no getFinancialDashboard:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Buscar membros com CPF para vinculação nominal em dízimos
 */
export async function getMembersForTithes(tenantId: string) {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { tenantId },
          { churchAccesses: { some: { tenantId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, users };
  } catch (error: any) {
    return { success: false, users: [] };
  }
}

/**
 * Gerador de dados de demonstração (Matriz + Filiais)
 */
export async function seedFinancialDemoData(churchSlug: string) {
  try {
    const mainChurch = await prisma.tenant.findUnique({
      where: { slug: churchSlug },
      include: { branches: true },
    });

    if (!mainChurch) {
      return { success: false, error: "Igreja não encontrada para seed." };
    }

    let branchChurch = mainChurch.branches[0];
    if (!branchChurch) {
      branchChurch = await prisma.tenant.create({
        data: {
          name: `${mainChurch.name} • Filial Zona Sul`,
          slug: `${mainChurch.slug}-filial`,
          primaryColor: "#2563eb",
          parentId: mainChurch.id,
          plan: mainChurch.plan,
          status: "ACTIVE",
        },
      });
    }

    const adminEmail = "lynxemssistema@gmail.com";
    let adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("10207597Rdv*", 10);
      adminUser = await prisma.user.create({
        data: {
          name: "Lynx EMS Sistemas (Master)",
          email: adminEmail,
          password: hashedPassword,
          role: "SUPERADMIN",
          isEmailVerified: true,
          tenantId: mainChurch.id,
          churchAccesses: {
            create: {
              tenantId: mainChurch.id,
              role: "SUPERADMIN",
            },
          },
        },
      });
    }

    const mockMembersData = [
      { name: "Carlos Eduardo Silva", email: "carlos.silva@membro.com", cpf: "123.456.789-00" },
      { name: "Mariana Albuquerque Souza", email: "mariana.souza@membro.com", cpf: "234.567.890-11" },
      { name: "Roberto Mendonça Lima", email: "roberto.lima@membro.com", cpf: "345.678.901-22" },
      { name: "Ana Beatriz Costa", email: "ana.costa@membro.com", cpf: "456.789.012-33" },
    ];

    const createdMembers = [];
    for (const m of mockMembersData) {
      let member = await prisma.user.findUnique({ where: { email: m.email } });
      if (!member) {
        member = await prisma.user.create({
          data: {
            name: m.name,
            email: m.email,
            cpf: m.cpf,
            role: "MEMBER",
            isEmailVerified: true,
            tenantId: mainChurch.id,
          },
        });
      } else if (!member.cpf) {
        member = await prisma.user.update({
          where: { id: member.id },
          data: { cpf: m.cpf },
        });
      }
      createdMembers.push(member);
    }

    await prisma.transaction.deleteMany({
      where: {
        tenantId: { in: [mainChurch.id, branchChurch.id] },
      },
    });

    const now = new Date();
    const daysAgo = (days: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d;
    };

    const mockTransactions = [
      { amount: 1500, type: "INCOME", category: "DIZIMO", desc: "Dízimo Nominal - Salmo 23", member: createdMembers[0], church: mainChurch, days: 2, method: "PIX" },
      { amount: 850, type: "INCOME", category: "DIZIMO", desc: "Dízimo Nominal - Família Albuquerque", member: createdMembers[1], church: mainChurch, days: 5, method: "PIX" },
      { amount: 430, type: "INCOME", category: "OFERTA", desc: "Ofertas Voluntárias - Culto de Celebração", member: null, church: mainChurch, days: 3, method: "DINHEIRO" },
      { amount: 620, type: "INCOME", category: "MISSOES", desc: "Campanha Sertão Nordestino", member: null, church: mainChurch, days: 7, method: "PIX" },
      { amount: 2500, type: "EXPENSE", category: "ALUGUEL", desc: "Aluguel Templo Matriz - Mês Vigente", member: null, church: mainChurch, days: 10, method: "TRANSFERENCIA" },
      { amount: 680, type: "EXPENSE", category: "LUZ", desc: "Conta de Energia Elétrica - Enel", member: null, church: mainChurch, days: 12, method: "BOLETO" },
      { amount: 1800, type: "EXPENSE", category: "SALARIO", desc: "Prebenda Pastoral Mensal", member: null, church: mainChurch, days: 6, method: "TRANSFERENCIA" },

      { amount: 950, type: "INCOME", category: "DIZIMO", desc: "Dízimo Nominal Filial - Roberto", member: createdMembers[2], church: branchChurch, days: 4, method: "PIX" },
      { amount: 320, type: "INCOME", category: "OFERTA", desc: "Oferta de Domingo - Filial Zona Sul", member: null, church: branchChurch, days: 8, method: "DINHEIRO" },
      { amount: 1200, type: "EXPENSE", category: "ALUGUEL", desc: "Locação Salão da Filial", member: null, church: branchChurch, days: 11, method: "BOLETO" },
      { amount: 240, type: "EXPENSE", category: "LUZ", desc: "Conta de Água e Luz - Filial", member: null, church: branchChurch, days: 15, method: "PIX" },

      { amount: 1500, type: "INCOME", category: "DIZIMO", desc: "Dízimo Nominal - Carlos Silva", member: createdMembers[0], church: mainChurch, days: 35, method: "PIX" },
      { amount: 1200, type: "INCOME", category: "DIZIMO", desc: "Dízimo Nominal - Ana Beatriz", member: createdMembers[3], church: mainChurch, days: 38, method: "PIX" },
      { amount: 780, type: "INCOME", category: "OFERTA", desc: "Ofertas Culto Santa Ceia", member: null, church: mainChurch, days: 40, method: "DINHEIRO" },
      { amount: 950, type: "INCOME", category: "MISSOES", desc: "Oferta Especial Projeto África", member: null, church: mainChurch, days: 42, method: "PIX" },
      { amount: 2500, type: "EXPENSE", category: "ALUGUEL", desc: "Aluguel Templo Matriz - Mês Anterior", member: null, church: mainChurch, days: 45, method: "TRANSFERENCIA" },
      { amount: 590, type: "EXPENSE", category: "LUZ", desc: "Energia Elétrica Templo Central", member: null, church: mainChurch, days: 47, method: "BOLETO" },
      { amount: 1250, type: "EXPENSE", category: "SOM", desc: "Microfones sem fio e cabos XLR", member: null, church: mainChurch, days: 49, method: "CARTAO" },

      { amount: 800, type: "INCOME", category: "DIZIMO", desc: "Dízimo Nominal - Roberto Lima", member: createdMembers[2], church: branchChurch, days: 36, method: "PIX" },
      { amount: 410, type: "INCOME", category: "OFERTA", desc: "Ofertas de Terça-feira - Filial", member: null, church: branchChurch, days: 43, method: "DINHEIRO" },
      { amount: 1200, type: "EXPENSE", category: "ALUGUEL", desc: "Aluguel Salão Filial - Mês Anterior", member: null, church: branchChurch, days: 46, method: "BOLETO" },
      { amount: 450, type: "EXPENSE", category: "REFORMA", desc: "Pintura fachada da filial", member: null, church: branchChurch, days: 52, method: "PIX" },
    ];

    for (const item of mockTransactions) {
      await prisma.transaction.create({
        data: {
          tenantId: item.church.id,
          amount: item.amount,
          type: item.type,
          category: item.category,
          description: item.desc,
          paymentMethod: item.method,
          status: "COMPLETED",
          memberId: item.member ? item.member.id : null,
          createdAt: daysAgo(item.days),
        },
      });
    }

    try {
      revalidatePath(`/${mainChurch.slug}/admin/finance`);
    } catch {}

    return {
      success: true,
      message: `22 movimentações geradas com sucesso para ${mainChurch.name} e ${branchChurch.name}!`,
    };
  } catch (error: any) {
    console.error("Erro no seed financeiro:", error);
    return { success: false, error: error.message };
  }
}
