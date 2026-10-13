"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Camera,
  Sparkles,
  DollarSign,
  Users,
  ShieldCheck,
  TrendingUp,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
  Calendar,
  Layers,
  Crown,
  Gift,
  Search,
  UserCheck,
  Ban,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getPersonalToolsConfig,
  updatePersonalToolsConfig,
  getPersonalToolsSubscribers,
  grantPersonalToolsAccess,
  revokePersonalToolsAccess,
  setPersonalToolsStatus,
  PersonalToolsConfigData,
} from "@/app/actions/personal-tools";

export function SuperAdminPersonalToolsManager() {
  const [config, setConfig] = useState<PersonalToolsConfigData | null>(null);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalActive: 0,
    totalTrial: 0,
    totalOverdue: 0,
    totalMonthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Filtros de busca e status
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "TRIAL" | "OVERDUE">("ALL");

  // Estados do Formulário de Edição Comercial
  const [title, setTitle] = useState("");
  const [badge, setBadge] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("19.90");
  const [annualPrice, setAnnualPrice] = useState("199.00");
  const [trialDays, setTrialDays] = useState("30");
  const [active, setActive] = useState(true);

  const loadData = async () => {
    try {
      const [configRes, subsRes] = await Promise.all([
        getPersonalToolsConfig(),
        getPersonalToolsSubscribers(),
      ]);

      if (configRes.success && configRes.config) {
        const c = configRes.config;
        setConfig(c);
        setTitle(c.title);
        setBadge(c.badge);
        setDescription(c.description);
        setMonthlyPrice(c.monthlyPrice.toString());
        setAnnualPrice(c.annualPrice.toString());
        setTrialDays(c.trialDays.toString());
        setActive(c.active);
      }

      if (subsRes.success) {
        setSubscribers(subsRes.subscribers);
        setMetrics({
          totalActive: subsRes.totalActive,
          totalTrial: subsRes.totalTrial,
          totalOverdue: subsRes.totalOverdue,
          totalMonthlyRevenue: subsRes.totalMonthlyRevenue,
        });
      }
    } catch (err) {
      console.error("Erro ao carregar dados do módulo pessoal:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePersonalToolsConfig({
        title,
        badge,
        description,
        monthlyPrice: parseFloat(monthlyPrice) || 19.9,
        annualPrice: parseFloat(annualPrice) || 199.0,
        trialDays: parseInt(trialDays) || 30,
        active,
      });

      if (res.success) {
        toast.success("Preços e configurações do módulo salvos com sucesso!");
        if (res.config) {
          setConfig(res.config);
        }
      } else {
        toast.error(res.error || "Erro ao salvar configurações.");
      }
    });
  };

  // Ação 1: Conceder Cortesia (+30d ou +90d)
  const handleGrantCourtesy = async (userId: string, userName: string, days: number) => {
    setActionInProgress(userId);
    try {
      const res = await grantPersonalToolsAccess(userId, days);
      if (res.success) {
        toast.success(`Cortesia de +${days} dias concedida para ${userName}!`);
        await loadData();
      } else {
        toast.error(res.error || "Erro ao conceder cortesia.");
      }
    } catch {
      toast.error("Erro ao processar solicitação.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Ação 2: Revogar/Bloquear Acesso
  const handleRevokeAccess = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja bloquear o acesso de ${userName} ao módulo de ferramentas?`)) {
      return;
    }
    setActionInProgress(userId);
    try {
      const res = await revokePersonalToolsAccess(userId);
      if (res.success) {
        toast.warning(`Acesso de ${userName} foi bloqueado.`);
        await loadData();
      } else {
        toast.error(res.error || "Erro ao revogar acesso.");
      }
    } catch {
      toast.error("Erro ao processar solicitação.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Filtragem dos Membros
  const filteredSubscribers = subscribers.filter((sub) => {
    // Filtro de Texto (Nome ou E-mail)
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.tenant?.name && sub.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filtro de Status
    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE") return sub.toolsSubscriptionStatus === "ACTIVE";
    if (statusFilter === "TRIAL") return sub.toolsSubscriptionStatus === "TRIAL";
    if (statusFilter === "OVERDUE") {
      return (
        sub.toolsSubscriptionStatus === "OVERDUE" ||
        sub.toolsSubscriptionStatus === "CANCELLED" ||
        (sub.toolsSubscriptionExpiresAt && new Date(sub.toolsSubscriptionExpiresAt) < new Date())
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
        <span>Carregando gestão do módulo B2C...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent border border-pink-500/25">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 text-xs font-black uppercase">
            <Camera className="w-3.5 h-3.5" />
            <span>Monetização B2C • Assinatura Individual de Membros</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Gestão do Módulo: Minhas Ferramentas (Instagram Studio)
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Painel exclusivo do SuperAdmin para precificação, concessão de cortesias manuais, bloqueios e auditoria de assinantes gerados no Asaas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={actionInProgress !== null}
            className="h-10 rounded-2xl border-white/10 bg-zinc-900 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar Dados</span>
          </Button>

          <div className="px-3.5 py-1.5 rounded-2xl bg-zinc-900 border border-white/10 text-right">
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">Status do Módulo</span>
            <span className={`text-xs font-black ${active ? "text-emerald-400" : "text-amber-400"}`}>
              {active ? "● Ativo no App" : "● Pausado"}
            </span>
          </div>
        </div>
      </div>

      {/* Cards de Métricas B2C */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase">
            <span>Assinantes Pagantes</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.totalActive}</div>
          <p className="text-[11px] text-zinc-400">Membros com assinatura ativa no Asaas.</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase">
            <span>Em Degustação (30d)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{metrics.totalTrial}</div>
          <p className="text-[11px] text-zinc-400">Usuários no período de trial gratuito.</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase">
            <span>Expirados / Bloqueados</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{metrics.totalOverdue}</div>
          <p className="text-[11px] text-zinc-400">Trial encerrado ou fatura pendente.</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase">
            <span>Receita Mensal B2C</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            R$ {metrics.totalMonthlyRevenue.toFixed(2).replace(".", ",")}
          </div>
          <p className="text-[11px] text-zinc-400">MRR recorrente dos membros via Asaas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORMULÁRIO DE GESTÃO DE PREÇOS (SUPERADMIN) */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-zinc-900/70 border border-white/10 space-y-5">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-pink-400" />
              <span>Configuração Comercial</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Defina os preços cobrados pelo Asaas ao membro.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-300">Título do Módulo</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-300">Selo Promocional (Badge)</Label>
              <Input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Preço Mensal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  required
                  className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Preço Anual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={annualPrice}
                  onChange={(e) => setAnnualPrice(e.target.value)}
                  required
                  className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Degustação Grátis (Dias)</Label>
                <Input
                  type="number"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  required
                  className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Disponibilidade</Label>
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={`w-full h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-400 border-white/10"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{active ? "Módulo Ativo" : "Pausado"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-300">Descrição / Pitch de Vendas</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-white/15 text-white p-2.5 rounded-xl text-xs resize-none focus:outline-hidden"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:brightness-110 text-white font-black text-xs shadow-lg gap-2 cursor-pointer transition-all"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Save className="w-4 h-4 text-white" />
              )}
              <span>Salvar Configurações Comerciais</span>
            </Button>
          </form>
        </div>

        {/* LISTAGEM E CONTROLE DE ASSINATURAS DOS MEMBROS */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/70 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Gestão de Membros & Assinantes B2C</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Acompanhe o status de cada membro, conceda cortesias ou bloqueie acessos manualmente.
              </p>
            </div>
            <span className="text-xs font-bold text-zinc-400 bg-white/[0.05] px-3 py-1 rounded-full border border-white/10 self-start sm:self-auto">
              Total: {filteredSubscribers.length} / {subscribers.length}
            </span>
          </div>

          {/* Barra de Busca e Filtros Rápidos */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por membro, e-mail ou congregação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10 overflow-x-auto">
              {[
                { id: "ALL", label: "Todos" },
                { id: "ACTIVE", label: "Pagantes" },
                { id: "TRIAL", label: "Trial (30d)" },
                { id: "OVERDUE", label: "Expirados" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-pink-500 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredSubscribers.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 space-y-2">
              <Camera className="w-10 h-10 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold">Nenhum membro encontrado com os filtros selecionados.</p>
              <p className="text-xs text-zinc-500">
                Altere os termos de busca ou o filtro de status acima.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredSubscribers.map((sub) => {
                const isOverdue =
                  sub.toolsSubscriptionStatus === "OVERDUE" ||
                  sub.toolsSubscriptionStatus === "CANCELLED" ||
                  (sub.toolsSubscriptionExpiresAt && new Date(sub.toolsSubscriptionExpiresAt) < new Date());

                const isTrial = sub.toolsSubscriptionStatus === "TRIAL" && !isOverdue;
                const isActivePaid = sub.toolsSubscriptionStatus === "ACTIVE" && !isOverdue;
                const isBusy = actionInProgress === sub.id;

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">{sub.name}</span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isActivePaid
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                              : isTrial
                              ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                              : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                          }`}
                        >
                          {isActivePaid
                            ? "Assinante Ativo (Asaas)"
                            : isTrial
                            ? "Degustação Grátis (Trial)"
                            : "Expirado / Bloqueado"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 flex-wrap">
                        <span>{sub.email}</span>
                        <span>•</span>
                        <span>Igreja: {sub.tenant?.name || "Geral"}</span>
                        {sub.toolsSubscriptionExpiresAt && (
                          <>
                            <span>•</span>
                            <span className={isOverdue ? "text-rose-400 font-semibold" : "text-zinc-300"}>
                              Expira: {new Date(sub.toolsSubscriptionExpiresAt).toLocaleDateString("pt-BR")}
                            </span>
                          </>
                        )}
                      </div>

                      {sub.toolsAsaasSubscriptionId && (
                        <div className="text-[10px] font-mono text-pink-400 flex items-center gap-1">
                          <span>Asaas Sub ID: {sub.toolsAsaasSubscriptionId}</span>
                        </div>
                      )}
                    </div>

                    {/* BOTÕES DE CONTROLE DO SUPERADMIN */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                      {isBusy ? (
                        <div className="flex items-center gap-1 text-xs text-pink-400 py-1.5 px-3">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Atualizando...</span>
                        </div>
                      ) : (
                        <>
                          {/* Conceder Cortesia +30d */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGrantCourtesy(sub.id, sub.name, 30)}
                            className="h-8 px-2.5 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-[11px] font-bold cursor-pointer gap-1"
                            title="Conceder +30 dias de acesso gratuito/cortesia"
                          >
                            <Gift className="w-3.5 h-3.5 text-emerald-400" />
                            <span>+30d Cortesia</span>
                          </Button>

                          {/* Conceder Cortesia +90d */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGrantCourtesy(sub.id, sub.name, 90)}
                            className="h-8 px-2.5 rounded-xl border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-[11px] font-bold cursor-pointer gap-1 hidden md:inline-flex"
                            title="Conceder +90 dias de acesso VIP"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <span>+90d VIP</span>
                          </Button>

                          {/* Bloquear / Revogar se estiver ativo */}
                          {(isActivePaid || isTrial) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeAccess(sub.id, sub.name)}
                              className="h-8 px-2.5 rounded-xl border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-[11px] font-bold cursor-pointer gap-1"
                              title="Bloquear acesso imediatamente"
                            >
                              <Ban className="w-3.5 h-3.5 text-rose-400" />
                              <span>Bloquear</span>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
