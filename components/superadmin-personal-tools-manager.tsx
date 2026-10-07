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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getPersonalToolsConfig,
  updatePersonalToolsConfig,
  getPersonalToolsSubscribers,
  PersonalToolsConfigData,
} from "@/app/actions/personal-tools";

export function SuperAdminPersonalToolsManager() {
  const [config, setConfig] = useState<PersonalToolsConfigData | null>(null);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ totalActive: 0, totalMonthlyRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Estados do Formulário de Edição
  const [title, setTitle] = useState("");
  const [badge, setBadge] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("19.90");
  const [annualPrice, setAnnualPrice] = useState("199.00");
  const [trialDays, setTrialDays] = useState("30");
  const [active, setActive] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
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
            totalMonthlyRevenue: subsRes.totalMonthlyRevenue,
          });
        }
      } catch (err) {
        console.error("Erro ao carregar dados do módulo pessoal:", err);
      } finally {
        setLoading(false);
      }
    }

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
        trialDays: parseInt(trialDays) || 7,
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
            Configure o valor mensal e anual contratado individualmente pelos membros, dias de degustação gratuita e acompanhe os pagamentos processados via Asaas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-2xl bg-zinc-900 border border-white/10 text-right">
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">Status do Módulo</span>
            <span className={`text-xs font-black ${active ? "text-emerald-400" : "text-amber-400"}`}>
              {active ? "● Ativo no App" : "● Pausado"}
            </span>
          </div>
        </div>
      </div>

      {/* Cards de Métricas B2C */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase">
            <span>Membros Assinantes</span>
            <Users className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.totalActive}</div>
          <p className="text-[11px] text-zinc-400">
            {subscribers.length} cadastros totais vinculados ao módulo.
          </p>
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

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase">
            <span>Ticket Médio</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            R$ {parseFloat(monthlyPrice).toFixed(2).replace(".", ",")} /mês
          </div>
          <p className="text-[11px] text-zinc-400">Preço público praticado dentro do app.</p>
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
                  className={`w-full h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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

        {/* LISTAGEM DE MEMBROS ASSINANTES */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/70 border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Membros Assinantes do Módulo</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Usuários com contratação ativa ou período de degustação.
              </p>
            </div>
            <span className="text-xs font-bold text-zinc-400 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/10">
              Total: {subscribers.length}
            </span>
          </div>

          {subscribers.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 space-y-2">
              <Camera className="w-10 h-10 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold">Nenhum membro assinou este módulo ainda.</p>
              <p className="text-xs text-zinc-500">
                Assim que os membros contratarem na tela da igreja, eles aparecerão aqui com status Asaas.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {subscribers.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{sub.name}</span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          sub.toolsSubscriptionStatus === "ACTIVE"
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                            : sub.toolsSubscriptionStatus === "TRIAL"
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                            : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                        }`}
                      >
                        {sub.toolsSubscriptionStatus === "ACTIVE"
                          ? "Assinante Ativo"
                          : sub.toolsSubscriptionStatus === "TRIAL"
                          ? "Degustação Grátis"
                          : "Inativo/Expirado"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                      <span>{sub.email}</span>
                      <span>•</span>
                      <span>Igreja: {sub.tenant?.name || "Geral"}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-xs">
                    {sub.toolsSubscriptionExpiresAt ? (
                      <div className="text-[11px] text-zinc-400">
                        Vence: {new Date(sub.toolsSubscriptionExpiresAt).toLocaleDateString("pt-BR")}
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-500">Sem expiração</span>
                    )}
                    {sub.toolsAsaasSubscriptionId && (
                      <span className="text-[10px] font-mono text-pink-400 block">
                        Asaas: {sub.toolsAsaasSubscriptionId}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
