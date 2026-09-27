"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  FileText,
  PlusCircle,
  Filter,
  Search,
  Download,
  ShieldCheck,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  CreditCard,
  Receipt,
  UserCheck,
  ChevronRight,
  HelpCircle,
  X,
  PieChart as PieIcon,
  BarChart3,
  Check,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createManualTransaction,
  seedFinancialDemoData,
  getMembersForTithes,
} from "@/app/actions/finance-admin";
import {
  DetailedTransaction,
  FinancialKPIs,
  MonthlyChartPoint,
  CategorySummary,
  ChurchFilterOption,
  CATEGORY_LABELS,
} from "@/lib/finance-constants";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface FinanceDashboardViewProps {
  initialKPIs: FinancialKPIs;
  initialChartData: MonthlyChartPoint[];
  initialCategoryDistribution: CategorySummary[];
  initialTransactions: DetailedTransaction[];
  networkChurches: ChurchFilterOption[];
  currentChurch: {
    id: string;
    name: string;
    slug: string;
    isMatriz: boolean;
  };
  isMasterRole: boolean;
  userRole: string;
}

export function FinanceDashboardView({
  initialKPIs,
  initialChartData,
  initialCategoryDistribution,
  initialTransactions,
  networkChurches,
  currentChurch,
  isMasterRole,
  userRole,
}: FinanceDashboardViewProps) {
  const [kpis, setKpis] = useState<FinancialKPIs>(initialKPIs);
  const [chartData, setChartData] = useState<MonthlyChartPoint[]>(initialChartData);
  const [categoryDistribution, setCategoryDistribution] = useState<CategorySummary[]>(initialCategoryDistribution);
  const [transactions, setTransactions] = useState<DetailedTransaction[]>(initialTransactions);
  const [selectedChurchId, setSelectedChurchId] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // Filtros da Tabela
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [nominalFilter, setNominalFilter] = useState<"ALL" | "NOMINAL" | "ANONYMOUS">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal: Nova Transação
  const [showNewModal, setShowNewModal] = useState(false);
  const [newType, setNewType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [newCategory, setNewCategory] = useState("DIZIMO");
  const [newAmount, setNewAmount] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("PIX");
  const [newTenantId, setNewTenantId] = useState(currentChurch.id);
  const [newMemberId, setNewMemberId] = useState("");
  const [availableMembers, setAvailableMembers] = useState<{ id: string; name: string; email: string; cpf: string | null }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);

  // Modal: Relatório IRPF
  const [showReportModal, setShowReportModal] = useState(false);

  // Recharts hydration fix
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Carregar membros para o modal quando aberto
  useEffect(() => {
    if (showNewModal) {
      setLoadingMembers(true);
      getMembersForTithes(newTenantId).then((res) => {
        if (res.success) {
          setAvailableMembers(res.users);
        }
        setLoadingMembers(false);
      });
    }
  }, [showNewModal, newTenantId]);

  // Filtragem no cliente para as movimentações
  const filteredTransactions = transactions.filter((tx) => {
    // Filtro por Igreja selecionada
    if (selectedChurchId !== "ALL" && tx.tenantId !== selectedChurchId) {
      return false;
    }
    // Filtro por Tipo
    if (typeFilter !== "ALL" && tx.type !== typeFilter) {
      return false;
    }
    // Filtro por Categoria
    if (categoryFilter !== "ALL" && tx.category !== categoryFilter) {
      return false;
    }
    // Filtro por Origem (Nominal vs Anônimo)
    if (nominalFilter === "NOMINAL" && !tx.isNominal) {
      return false;
    }
    if (nominalFilter === "ANONYMOUS" && tx.isNominal) {
      return false;
    }
    // Busca textual
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(term);
      const matchMember = tx.member?.name.toLowerCase().includes(term);
      const matchCpf = tx.member?.cpf?.toLowerCase().includes(term);
      const matchCat = tx.category.toLowerCase().includes(term);
      const matchChurch = tx.tenantName.toLowerCase().includes(term);
      if (!matchDesc && !matchMember && !matchCpf && !matchCat && !matchChurch) {
        return false;
      }
    }
    return true;
  });

  // Handler: Submeter Nova Transação
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newAmount.replace(",", "."));
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor numérico válido.");
      return;
    }

    setSavingTransaction(true);
    try {
      const res = await createManualTransaction({
        tenantId: newTenantId,
        type: newType,
        category: newCategory,
        amount: val,
        description: newDescription,
        paymentMethod: newPaymentMethod,
        memberId: newType === "INCOME" && newCategory === "DIZIMO" ? (newMemberId || undefined) : undefined,
      });

      if (res.success && res.transaction) {
        toast.success(res.message);
        setShowNewModal(false);
        setNewAmount("");
        setNewDescription("");
        setNewMemberId("");

        // Atualizar lista local
        const targetChurch = networkChurches.find((c) => c.id === newTenantId) || currentChurch;
        const selectedMember = availableMembers.find((m) => m.id === newMemberId);

        const newTxObj: DetailedTransaction = {
          id: res.transaction.id,
          amount: res.transaction.amount,
          type: res.transaction.type,
          category: res.transaction.category,
          description: res.transaction.description,
          status: res.transaction.status,
          paymentMethod: res.transaction.paymentMethod,
          createdAt: new Date().toISOString(),
          tenantId: newTenantId,
          tenantName: targetChurch.name,
          tenantSlug: targetChurch.slug,
          isNominal: Boolean(selectedMember),
          member: selectedMember || null,
        };

        setTransactions((prev) => [newTxObj, ...prev]);

        // Atualizar KPIs localmente
        if (newType === "INCOME") {
          setKpis((prev) => ({
            ...prev,
            totalIncome: prev.totalIncome + val,
            balance: prev.balance + val,
            nominalTithesTotal: newCategory === "DIZIMO" && selectedMember ? prev.nominalTithesTotal + val : prev.nominalTithesTotal,
            nominalTithesCount: newCategory === "DIZIMO" && selectedMember ? prev.nominalTithesCount + 1 : prev.nominalTithesCount,
            anonymousOfferingsTotal: !(newCategory === "DIZIMO" && selectedMember) ? prev.anonymousOfferingsTotal + val : prev.anonymousOfferingsTotal,
            anonymousOfferingsCount: !(newCategory === "DIZIMO" && selectedMember) ? prev.anonymousOfferingsCount + 1 : prev.anonymousOfferingsCount,
          }));
        } else {
          setKpis((prev) => ({
            ...prev,
            totalExpense: prev.totalExpense + val,
            balance: prev.balance - val,
          }));
        }
      } else {
        toast.error(res.error || "Erro ao salvar lançamento.");
      }
    } finally {
      setSavingTransaction(false);
    }
  };

  // Handler: Rodar Seed Mock
  const handleRunSeed = async () => {
    startTransition(async () => {
      const res = await seedFinancialDemoData(currentChurch.slug);
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else {
        toast.error(res.error || "Falha ao rodar seed.");
      }
    });
  };

  // Agrupamento para Relatório IRPF de Membros
  const memberReportMap: Record<string, { name: string; cpf: string; total: number; count: number }> = {};
  transactions
    .filter((tx) => tx.type === "INCOME" && tx.category === "DIZIMO" && tx.member)
    .forEach((tx) => {
      const m = tx.member!;
      if (!memberReportMap[m.id]) {
        memberReportMap[m.id] = {
          name: m.name,
          cpf: m.cpf || "Não Informado",
          total: 0,
          count: 0,
        };
      }
      memberReportMap[m.id].total += tx.amount;
      memberReportMap[m.id].count += 1;
    });

  const memberReportList = Object.values(memberReportMap).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Administrativo Executivo (Desktop-First) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900/90 via-zinc-950/95 to-black border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Glow de Iluminação */}
        <div className="pointer-events-none absolute -top-24 left-1/3 w-96 h-36 bg-amber-500/10 blur-3xl rounded-full" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isMasterRole ? "Controle Consolidado • Master" : "Gestão Local • Filial"}</span>
              </span>
              <span className="text-xs text-zinc-400">
                {currentChurch.name} {currentChurch.isMatriz ? "(Sede Matriz)" : "(Filial)"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Gestão Financeira & Tesouraria</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Painel ERP de fluxo de caixa em tempo real, controle de entradas com rastreamento nominal para Imposto de Renda (IRPF), saídas operacionais e visão integrada Sede & Filiais.
            </p>
          </div>

          {/* Ações do Header */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={handleRunSeed}
              disabled={isPending}
              variant="outline"
              size="sm"
              className="h-10 text-xs font-bold gap-1.5 border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 cursor-pointer"
              title="Injetar 22 movimentações reais para demonstração dos gráficos"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isPending ? "animate-spin" : ""}`} />
              <span>Gerar Dados Demo</span>
            </Button>

            <Button
              onClick={() => setShowReportModal(true)}
              variant="outline"
              size="sm"
              className="h-10 text-xs font-bold gap-1.5 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatório IRPF</span>
            </Button>

            <Button
              onClick={() => setShowNewModal(true)}
              size="sm"
              className="h-10 px-4 text-xs font-black gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black shadow-lg shadow-amber-500/20 rounded-xl cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Novo Lançamento</span>
            </Button>
          </div>
        </div>

        {/* 🔒 Seletor Multi-Tenant / Filtro Global para o Usuário Master */}
        {isMasterRole && networkChurches.length > 1 && (
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold">Filtro de Visão (RBAC):</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedChurchId("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedChurchId === "ALL"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                    : "bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-white/10"
                }`}
              >
                🌐 Rede Consolidada ({networkChurches.length} Igrejas)
              </button>

              {networkChurches.map((church) => (
                <button
                  key={church.id}
                  type="button"
                  onClick={() => setSelectedChurchId(church.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedChurchId === church.id
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                      : "bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-white/10"
                  }`}
                >
                  {church.isMatriz ? "🏛️ Sede: " : "📍 Filial: "}
                  {church.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Top 4 KPIs Executivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Saldo Líquido em Caixa */}
        <Card className="bg-zinc-950/80 border-white/10 shadow-lg relative overflow-hidden">
          <div
            className={`absolute top-0 left-0 right-0 h-1 ${
              kpis.balance >= 0 ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Saldo Líquido em Caixa
              </span>
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <CardTitle
              className={`text-2xl font-black tracking-tight ${
                kpis.balance >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              R$ {kpis.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              {kpis.balance >= 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-semibold">Superávit operacional positivo</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="text-rose-300 font-semibold">Déficit no período</span>
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Entradas / Arrecadação */}
        <Card className="bg-zinc-950/80 border-white/10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Total de Entradas
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-white">
              R$ {kpis.totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/5 pt-2 mt-1">
              <span>Nominais: R$ {kpis.nominalTithesTotal.toLocaleString("pt-BR")}</span>
              <span>Anônimas: R$ {kpis.anonymousOfferingsTotal.toLocaleString("pt-BR")}</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Saídas / Despesas */}
        <Card className="bg-zinc-950/80 border-white/10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Saídas / Despesas
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-white">
              R$ {kpis.totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <p className="text-[11px] text-zinc-400">
              Aluguel, contas de consumo, missões e manutenção
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Rastreabilidade Fiscal (IRPF) */}
        <Card className="bg-zinc-950/80 border-white/10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Dízimos Rastreáveis (IRPF)
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-amber-400">
              R$ {kpis.nominalTithesTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <p className="text-[11px] text-zinc-400">
              <strong>{kpis.nominalTithesCount}</strong> dízimos nominais vinculados a CPFs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Gráficos Analíticos com Recharts (Desktop-First) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Fluxo de Caixa Mensal (BarChart Entradas vs Saídas) */}
        <Card className="lg:col-span-2 bg-zinc-950/90 border-white/10 shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>Fluxo de Caixa Mensal (Entradas vs Saídas)</span>
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Comparativo de arrecadação e despesas nos últimos meses
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] text-zinc-300 border-white/10">
                Consolidado
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full">
              {mounted && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#09090b",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                      formatter={(value: any) => [`R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="income" name="Entradas (R$)" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Saídas (R$)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                  <p>Nenhuma movimentação registrada para gerar o gráfico.</p>
                  <Button onClick={handleRunSeed} variant="link" size="sm" className="text-amber-400 text-xs mt-1">
                    Clique aqui para gerar dados de demonstração
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 2: Distribuição por Categoria (PieChart) */}
        <Card className="bg-zinc-950/90 border-white/10 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-amber-400" />
              <span>Distribuição por Categoria</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Dízimos, ofertas e maiores despesas
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[210px] w-full">
              {mounted && categoryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      dataKey="amount"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#09090b",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                      formatter={(val: any) => [`R$ ${Number(val).toLocaleString("pt-BR")}`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                  Sem dados para exibição.
                </div>
              )}
            </div>

            {/* Legenda compacta de categorias */}
            <div className="space-y-1.5 mt-2 max-h-24 overflow-y-auto pr-1">
              {categoryDistribution.slice(0, 5).map((item) => (
                <div key={item.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-zinc-300 truncate">{item.label}</span>
                  </div>
                  <span className="font-mono text-zinc-400 text-[11px]">
                    R$ {item.amount.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Tabela de Lançamentos com Filtros Avançados */}
      <Card className="bg-zinc-950/90 border-white/10 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-white/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>Extrato Detalhado de Movimentações</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Mostrando {filteredTransactions.length} de {transactions.length} registros cadastrados
              </CardDescription>
            </div>

            {/* Barra de Busca Rápida */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por membro, descrição..."
                className="pl-9 h-9 text-xs bg-zinc-900 border-white/10 text-white rounded-xl"
              />
            </div>
          </div>

          {/* Filtros de Segmentação */}
          <div className="flex items-center gap-2 pt-3 flex-wrap text-xs">
            <span className="text-zinc-400 font-semibold flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" /> Filtros:
            </span>

            {/* Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-zinc-900 border border-white/10 text-zinc-300 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="INCOME">🟢 Apenas Entradas</option>
              <option value="EXPENSE">🔴 Apenas Saídas</option>
            </select>

            {/* Origem */}
            <select
              value={nominalFilter}
              onChange={(e) => setNominalFilter(e.target.value as any)}
              className="bg-zinc-900 border border-white/10 text-zinc-300 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="ALL">Todas as Origens</option>
              <option value="NOMINAL">👤 Dízimos Nominais (IRPF)</option>
              <option value="ANONYMOUS">🪙 Ofertas Anônimas / Despesas</option>
            </select>

            {/* Categoria */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-zinc-300 rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="ALL">Todas as Categorias</option>
              {Object.keys(CATEGORY_LABELS).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat].label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-900/60">
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-zinc-400 font-bold">Data</TableHead>
                <TableHead className="text-zinc-400 font-bold">Tipo & Categoria</TableHead>
                <TableHead className="text-zinc-400 font-bold">Descrição</TableHead>
                <TableHead className="text-zinc-400 font-bold">Origem / Membro (IRPF)</TableHead>
                <TableHead className="text-zinc-400 font-bold">Congregação</TableHead>
                <TableHead className="text-zinc-400 font-bold">Forma</TableHead>
                <TableHead className="text-zinc-400 font-bold text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-zinc-500 text-xs">
                    Nenhuma movimentação encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIncome = tx.type === "INCOME";
                  const dateFormatted = new Date(tx.createdAt).toLocaleDateString("pt-BR");
                  const catInfo = CATEGORY_LABELS[tx.category] || { label: tx.category, color: "#71717a" };

                  return (
                    <TableRow key={tx.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <TableCell className="text-xs text-zinc-400 font-mono">
                        {dateFormatted}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              isIncome
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {isIncome ? "Entrada" : "Saída"}
                          </Badge>
                          <span className="text-xs font-semibold text-zinc-200">
                            {catInfo.label}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-zinc-300 max-w-xs truncate">
                        {tx.description || "—"}
                      </TableCell>

                      <TableCell>
                        {tx.isNominal && tx.member ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-amber-400 shrink-0" />
                              {tx.member.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              CPF: {tx.member.cpf || "Pendente"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            {isIncome ? "🪙 Oferta Anônima" : "🏢 Despesa Operacional"}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-zinc-400">
                        {tx.tenantName}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[10px] text-zinc-400 border-white/10 uppercase">
                          {tx.paymentMethod}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isIncome ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isIncome ? "+" : "-"} R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5. Modal: Nova Movimentação Financeira */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-md w-full bg-zinc-950 border border-white/10 rounded-3xl p-6 text-zinc-100 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-amber-400" />
              <span>Lançar Movimentação Financeira</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Registre dízimos nominais com CPF para IRPF, ofertas avulsas ou pagamentos de despesas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTransaction} className="space-y-4 pt-3">
            {/* Seletor Tipo: Entrada ou Saída */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setNewType("INCOME");
                  setNewCategory("DIZIMO");
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  newType === "INCOME"
                    ? "bg-emerald-500 text-black shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Entrada (Receita)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewType("EXPENSE");
                  setNewCategory("ALUGUEL");
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  newType === "EXPENSE"
                    ? "bg-rose-500 text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Saída (Despesa)</span>
              </button>
            </div>

            {/* Congregação Destino */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Congregação *</label>
              <select
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
                className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white outline-none"
              >
                {networkChurches.map((church) => (
                  <option key={church.id} value={church.id}>
                    {church.isMatriz ? "Sede: " : "Filial: "} {church.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Categoria *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white outline-none"
              >
                {newType === "INCOME" ? (
                  <>
                    <option value="DIZIMO">Dízimo (Nominal / Rastreável IRPF)</option>
                    <option value="OFERTA">Oferta Voluntária (Cultos)</option>
                    <option value="MISSOES">Ofertas para Missões</option>
                    <option value="OUTROS">Outras Receitas</option>
                  </>
                ) : (
                  <>
                    <option value="ALUGUEL">Aluguel do Templo</option>
                    <option value="LUZ">Energia Elétrica / Água</option>
                    <option value="SALARIO">Prebenda Pastoral / Salários</option>
                    <option value="SOM">Equipamentos de Som & Mídia</option>
                    <option value="REFORMA">Manutenção & Obras</option>
                    <option value="OUTROS">Outras Despesas</option>
                  </>
                )}
              </select>
            </div>

            {/* Se for Dízimo: Seleção Nominal do Membro para IRPF */}
            {newType === "INCOME" && newCategory === "DIZIMO" && (
              <div className="space-y-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Vincular ao Membro (Rastreamento IRPF)</span>
                </label>
                <select
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  className="w-full h-10 px-3 bg-zinc-950 border border-amber-500/30 rounded-xl text-xs text-amber-200 outline-none"
                >
                  <option value="">-- Dízimo Avulso (Sem Membro Vinculado) --</option>
                  {availableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.cpf ? `(CPF: ${m.cpf})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400">
                  Dízimos nominais geram relatórios formais para a declaração de Imposto de Renda do membro.
                </p>
              </div>
            )}

            {/* Valor & Forma de Pagamento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Valor (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0,00"
                  required
                  className="bg-zinc-900 border-white/10 text-white rounded-xl h-10 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Forma de Pagamento</label>
                <select
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white outline-none"
                >
                  <option value="PIX">PIX</option>
                  <option value="DINHEIRO">Dinheiro Espécie</option>
                  <option value="TRANSFERENCIA">Transferência / TED</option>
                  <option value="CARTAO">Cartão</option>
                  <option value="BOLETO">Boleto</option>
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Descrição / Observações</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ex: Conta de Luz Março, Dízimo Culto de Celebração..."
                className="bg-zinc-900 border-white/10 text-white rounded-xl h-10 text-xs"
              />
            </div>

            {/* Botão de Gravar */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingTransaction}
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-10 px-4 rounded-xl cursor-pointer"
              >
                {savingTransaction ? "Gravando..." : "Confirmar Lançamento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Modal: Relatório IRPF Nominal para Declaração */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-2xl w-full bg-zinc-950 border border-white/10 rounded-3xl p-6 text-zinc-100 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black uppercase tracking-wider w-fit">
              <FileText className="w-3 h-3" />
              <span>Comprovante de Contribuições & Dízimos Nominais</span>
            </div>
            <DialogTitle className="text-xl font-black text-white">
              Relatório Fiscal para Imposto de Renda (IRPF)
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Valores acumulados por membro da congregação {currentChurch.name} para emissão de informes de rendimentos eclesiásticos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Total Nominal Acumulado:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  R$ {memberReportList.reduce((acc, curr) => acc + curr.total, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Membros Contribuintes Rastreáveis:</span>
                <span className="font-bold text-white">{memberReportList.length} membros</span>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10">
              <Table>
                <TableHeader className="bg-zinc-900">
                  <TableRow className="border-b border-white/10">
                    <TableHead className="text-xs font-bold text-zinc-400">Membro Titular</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-400">CPF</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-400 text-center">Doações</TableHead>
                    <TableHead className="text-xs font-bold text-zinc-400 text-right">Total Declarado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberReportList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-zinc-500 text-xs">
                        Nenhum dízimo nominal registrado ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    memberReportList.map((item, idx) => (
                      <TableRow key={idx} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="text-xs font-bold text-zinc-200">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-zinc-400">
                          {item.cpf}
                        </TableCell>
                        <TableCell className="text-xs text-center text-zinc-400 font-mono">
                          {item.count} dízimos
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold text-right text-emerald-400">
                          R$ {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.print();
                }}
                className="text-xs font-bold gap-1.5 border-white/15 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Imprimir / Salvar PDF</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setShowReportModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
