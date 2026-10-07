"use client";

import React, { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Tag,
  PlusCircle,
  RefreshCw,
  ExternalLink,
  CreditCard,
  Building2,
  Trash2,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSaaSFinancialMetrics,
  syncTenantAsaasInvoices,
} from "@/app/actions/subscriptions";
import {
  listDiscountCoupons,
  createOrUpdateDiscountCoupon,
  deleteDiscountCoupon,
  toggleDiscountCoupon,
} from "@/app/actions/coupons";
import { AsaasSubscriptionDialog } from "@/components/asaas-subscription-dialog";

interface SaasBillingManagerProps {
  initialTenants?: any[];
}

export function SaasBillingManager({ initialTenants = [] }: SaasBillingManagerProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "overdue" | "trials" | "active" | "cancelled" | "coupons" | "projections"
  >("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal Asaas
  const [selectedAsaasTenant, setSelectedAsaasTenant] = useState<any | null>(null);
  const [isAsaasModalOpen, setIsAsaasModalOpen] = useState(false);

  // Formulário de Cupom
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDescription, setCouponDescription] = useState("");
  const [couponDiscount, setCouponDiscount] = useState("20");
  const [couponMaxUses, setCouponMaxUses] = useState("");
  const [couponValidUntil, setCouponValidUntil] = useState("");
  const [savingCoupon, setSavingCoupon] = useState(false);

  // Carrega métricas do servidor
  const loadMetrics = async () => {
    setLoading(true);
    const res = await getSaaSFinancialMetrics();
    if (res.success && res) {
      setData(res);
    } else {
      toast.error("Erro ao carregar métricas SaaS");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error("Informe a palavra-chave do cupom.");
      return;
    }

    setSavingCoupon(true);
    const res = await createOrUpdateDiscountCoupon({
      code: couponCode,
      description: couponDescription,
      discountPercent: Number(couponDiscount) || 10,
      maxUses: couponMaxUses ? Number(couponMaxUses) : null,
      validUntil: couponValidUntil || null,
      active: true,
    });

    if (res.success) {
      toast.success(`Palavra-chave '${couponCode.toUpperCase()}' criada com sucesso!`);
      setCouponCode("");
      setCouponDescription("");
      setCouponDiscount("20");
      setCouponMaxUses("");
      setCouponValidUntil("");
      setShowCouponForm(false);
      loadMetrics();
    } else {
      toast.error(res.error || "Erro ao salvar cupom");
    }
    setSavingCoupon(false);
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Deseja excluir a palavra-chave '${code}'?`)) return;

    const res = await deleteDiscountCoupon(id);
    if (res.success) {
      toast.success("Cupom excluído com sucesso!");
      loadMetrics();
    } else {
      toast.error(res.error || "Erro ao excluir");
    }
  };

  const handleToggleCoupon = async (id: string, currentActive: boolean) => {
    const res = await toggleDiscountCoupon(id, !currentActive);
    if (res.success) {
      toast.success(`Cupom ${!currentActive ? "ativado" : "desativado"} com sucesso!`);
      loadMetrics();
    } else {
      toast.error(res.error || "Erro ao atualizar status");
    }
  };

  const handleSyncTenant = async (tenantId: string) => {
    startTransition(async () => {
      const res = await syncTenantAsaasInvoices(tenantId);
      if (res.success) {
        toast.success(`Faturas sincronizadas com o Asaas (${res.count} faturas).`);
        loadMetrics();
      } else {
        toast.error(res.error || "Erro ao sincronizar com Asaas");
      }
    });
  };

  const metrics = data?.metrics || {
    totalTenants: initialTenants.length,
    activeCount: 0,
    trialCount: 0,
    suspendedCount: 0,
    cancelledCount: 0,
    mrr: 0,
    arr: 0,
    averageTicket: 249,
    overdueCount: 0,
    totalOverdueAmount: 0,
  };

  const tenants: any[] = data?.tenants || initialTenants;
  const coupons: any[] = data?.coupons || [];
  const projections: any[] = data?.projections || [];
  const overdueInvoices: any[] = data?.overdueInvoices || [];

  // Filtra congregações pela aba ativa e busca
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.pastorName && t.pastorName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeSubTab === "active") return t.status === "ACTIVE";
    if (activeSubTab === "trials") return t.status === "TRIAL";
    if (activeSubTab === "cancelled") return t.status === "CANCELLED" || t.status === "SUSPENDED";
    if (activeSubTab === "overdue") {
      // Tem fatura atrasada ou está SUSPENDED
      return (
        t.status === "SUSPENDED" ||
        t.invoices?.some((inv: any) => inv.status === "OVERDUE")
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. CARDS DE MÉTRICAS SAAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-md space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>MRR • Receita Mensal</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground">
            R$ {metrics.mrr?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="font-bold text-emerald-400">+{metrics.activeCount}</span> assinaturas ativas pagantes
          </p>
        </div>

        {/* ARR */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-md space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>ARR • Projeção Anual</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground">
            R$ {metrics.arr?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ticket médio: <strong className="text-foreground">R$ {metrics.averageTicket}/mês</strong>
          </p>
        </div>

        {/* INADIMPLÊNCIA / OVERDUE */}
        <div
          onClick={() => setActiveSubTab("overdue")}
          className={`p-5 rounded-2xl border shadow-md space-y-2 relative overflow-hidden cursor-pointer transition-all ${
            metrics.overdueCount > 0
              ? "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15"
              : "bg-card border-border hover:border-border/80"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className={metrics.overdueCount > 0 ? "text-rose-400" : "text-muted-foreground"}>
              Inadimplência (Em Atraso)
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                metrics.overdueCount > 0
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground">
            R$ {metrics.totalOverdueAmount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics.overdueCount} {metrics.overdueCount === 1 ? "fatura vencida" : "faturas vencidas"} sem pagamento
          </p>
        </div>

        {/* DEGUSTAÇÃO 30 DIAS */}
        <div
          onClick={() => setActiveSubTab("trials")}
          className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-md space-y-2 cursor-pointer hover:bg-amber-500/15 transition-all"
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
            <span>30 Dias de Teste (Trial)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-foreground">
            {metrics.trialCount}
          </div>
          <p className="text-[11px] text-amber-300/80">
            Igrejas em degustação gratuita (sem custo hoje)
          </p>
        </div>
      </div>

      {/* 2. BARRA DE NAVEGAÇÃO DE ABAS SAAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={activeSubTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveSubTab("overview")}
            className="text-xs h-8"
          >
            <span>Todas as Assinaturas ({tenants.length})</span>
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === "overdue" ? "destructive" : "outline"}
            onClick={() => setActiveSubTab("overdue")}
            className="text-xs h-8 gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Inadimplentes ({metrics.overdueCount})</span>
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === "trials" ? "default" : "outline"}
            onClick={() => setActiveSubTab("trials")}
            className={`text-xs h-8 gap-1.5 ${
              activeSubTab === "trials" ? "bg-amber-500 text-black font-bold" : ""
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Em Degustação ({metrics.trialCount})</span>
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === "active" ? "default" : "outline"}
            onClick={() => setActiveSubTab("active")}
            className="text-xs h-8"
          >
            <span>Ativas ({metrics.activeCount})</span>
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === "coupons" ? "default" : "outline"}
            onClick={() => setActiveSubTab("coupons")}
            className="text-xs h-8 gap-1.5"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Palavras-Chave de Desconto ({coupons.length})</span>
          </Button>

          <Button
            size="sm"
            variant={activeSubTab === "projections" ? "default" : "outline"}
            onClick={() => setActiveSubTab("projections")}
            className="text-xs h-8 gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Projeção de Faturamento</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por igreja ou pastor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadMetrics}
            disabled={loading}
            className="h-8 text-xs gap-1 border-border"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 3. CONTEÚDO DA ABA SELECIONADA */}

      {/* ABA: PALAVRAS-CHAVE / CUPONS DE DESCONTO */}
      {activeSubTab === "coupons" ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>Gerenciador de Palavras-Chave de Desconto (Exclusivo Super Admin)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crie códigos promocionais para oferecer condições especiais a igrejas parceiras.
              </p>
            </div>

            <Button
              onClick={() => setShowCouponForm(!showCouponForm)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-9 px-4 gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Palavra-Chave</span>
            </Button>
          </div>

          {/* Formulário de Criação de Cupom */}
          {showCouponForm && (
            <form
              onSubmit={handleCreateCoupon}
              className="p-5 rounded-2xl bg-muted/40 border border-border space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-foreground">Criar Nova Palavra-Chave de Desconto</span>
                <button
                  type="button"
                  onClick={() => setShowCouponForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕ Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Palavra-Chave / Código *</label>
                  <Input
                    required
                    placeholder="Ex: PASTOR50, CONVENCAO2026"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="font-mono text-xs uppercase bg-card"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Desconto Permitido (%) *</label>
                  <div className="relative">
                    <Input
                      required
                      type="number"
                      min={1}
                      max={100}
                      value={couponDiscount}
                      onChange={(e) => setCouponDiscount(e.target.value)}
                      className="text-xs bg-card pr-8 font-bold"
                    />
                    <Percent className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Limite Máximo de Usos</label>
                  <Input
                    type="number"
                    placeholder="Ilimitado se vazio"
                    value={couponMaxUses}
                    onChange={(e) => setCouponMaxUses(e.target.value)}
                    className="text-xs bg-card"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Data de Validade (Opcional)</label>
                  <Input
                    type="date"
                    value={couponValidUntil}
                    onChange={(e) => setCouponValidUntil(e.target.value)}
                    className="text-xs bg-card"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Descrição / Destinatário</label>
                  <Input
                    placeholder="Ex: Parceria especial com congregações da região leste"
                    value={couponDescription}
                    onChange={(e) => setCouponDescription(e.target.value)}
                    className="text-xs bg-card"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={savingCoupon}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-9 px-6"
                >
                  {savingCoupon ? "Salvando..." : "Salvar Palavra-Chave"}
                </Button>
              </div>
            </form>
          )}

          {/* Tabela de Cupons */}
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[10px] text-muted-foreground uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Palavra-Chave</th>
                  <th className="py-3 px-4">Desconto</th>
                  <th className="py-3 px-4">Usos Realizados</th>
                  <th className="py-3 px-4">Validade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.length > 0 ? (
                  coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        <span className="bg-muted/60 px-2 py-1 rounded-md border border-border">
                          {c.code}
                        </span>
                        {c.description && (
                          <span className="block text-[11px] font-normal text-muted-foreground mt-0.5 font-sans">
                            {c.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {c.discountPercent}% OFF
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {c.usedCount} {c.maxUses ? `/ ${c.maxUses}` : "usos (ilimitado)"}
                      </td>
                      <td className="py-3 px-4">
                        {c.validUntil
                          ? new Date(c.validUntil).toLocaleDateString("pt-BR")
                          : "Sem expiração"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            c.active
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {c.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleCoupon(c.id, c.active)}
                            className="h-7 text-[10px] px-2"
                          >
                            {c.active ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteCoupon(c.id, c.code)}
                            className="h-7 w-7 p-0"
                            title="Excluir Cupom"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhuma palavra-chave de desconto cadastrada ainda. Clique em "Nova Palavra-Chave".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSubTab === "projections" ? (
        /* ABA: PROJEÇÃO FINANCEIRA */
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/25 space-y-2">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span>Simulador de Metas e Projeção de Escala SaaS</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Projeção calculada com base no ticket médio atual da plataforma (R${" "}
              {metrics.averageTicket}/mês por igreja).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projections.map((p, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3 relative overflow-hidden group hover:border-amber-500/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    {p.goal}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
                    {p.churches} congregações
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground block">MRR Mensal Projetado:</span>
                  <div className="text-2xl font-black text-foreground">
                    R$ {p.mrr?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    <span className="text-xs text-muted-foreground font-normal"> /mês</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Faturamento Anual (ARR):</span>
                  <span className="font-bold text-emerald-400">
                    R$ {p.arr?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* TABELA DE ASSINATURAS E COBRANÇAS */
        <div className="space-y-4">
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[10px] text-muted-foreground uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">Igreja / URL</th>
                    <th className="py-3 px-4">Plano & Ciclo</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Vencimento / Trial</th>
                    <th className="py-3 px-4">Asaas ID</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTenants.length > 0 ? (
                    filteredTenants.map((t) => {
                      const isOverdue = t.invoices?.some((inv: any) => inv.status === "OVERDUE");
                      const latestInvoice = t.invoices?.[0];

                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-muted/20 transition-colors ${
                            isOverdue ? "bg-rose-500/[0.04]" : ""
                          }`}
                        >
                          {/* Igreja */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: t.primaryColor }}
                              />
                              <div>
                                <span className="font-bold text-foreground block text-sm">
                                  {t.name}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  /{t.slug} • {t.pastorName || "Pastor"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Plano & Ciclo */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-foreground uppercase">{t.plan}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  t.billingCycle === "YEARLY"
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                    : "bg-muted text-muted-foreground border border-border"
                                }`}
                              >
                                {t.billingCycle === "YEARLY" ? "ANUAL" : "MENSAL"}
                              </span>
                              {t.couponCode && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded font-mono">
                                  {t.couponCode}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Valor */}
                          <td className="py-3 px-4">
                            <span className="font-black text-foreground">
                              R$ {t.monthlyPrice || 249},00
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {t.billingCycle === "YEARLY" ? "/ano" : "/mês"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isOverdue
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                                  : t.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : t.status === "TRIAL"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {isOverdue
                                ? "Inadimplente"
                                : t.status === "TRIAL"
                                ? "Degustação (30d)"
                                : t.status}
                            </span>
                          </td>

                          {/* Vencimento / Trial */}
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {t.subscriptionExpiresAt ? (
                              <div>
                                <span>{new Date(t.subscriptionExpiresAt).toLocaleDateString("pt-BR")}</span>
                                {t.status === "TRIAL" && (
                                  <span className="block text-[10px] text-amber-400 font-sans">
                                    {Math.max(
                                      0,
                                      Math.ceil(
                                        (new Date(t.subscriptionExpiresAt).getTime() - Date.now()) /
                                          (1000 * 60 * 60 * 24)
                                      )
                                    )}{" "}
                                    dias grátis
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Asaas ID */}
                          <td className="py-3 px-4 font-mono text-[10px]">
                            {t.asaasSubscriptionId ? (
                              <span className="text-emerald-400 font-bold select-all">
                                {t.asaasSubscriptionId}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Não gerado</span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {latestInvoice?.invoiceUrl && (
                                <a
                                  href={latestInvoice.invoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:text-amber-300 font-bold text-[11px] inline-flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"
                                  title="Ver fatura mais recente no Asaas"
                                >
                                  <span>Fatura</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAsaasTenant(t);
                                  setIsAsaasModalOpen(true);
                                }}
                                className="h-8 px-2.5 text-xs font-bold gap-1 border-border bg-card hover:bg-muted"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                                <span>Asaas</span>
                              </Button>

                              {t.asaasSubscriptionId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSyncTenant(t.id)}
                                  disabled={isPending}
                                  className="h-8 w-8 p-0"
                                  title="Sincronizar Faturas com Asaas"
                                >
                                  <RefreshCw
                                    className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`}
                                  />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nenhuma igreja encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestão Asaas */}
      {selectedAsaasTenant && (
        <AsaasSubscriptionDialog
          tenant={selectedAsaasTenant}
          isOpen={isAsaasModalOpen}
          onClose={() => {
            setIsAsaasModalOpen(false);
            setSelectedAsaasTenant(null);
          }}
          onUpdate={() => {
            loadMetrics();
          }}
        />
      )}
    </div>
  );
}
