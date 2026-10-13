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
  Plus,
  Palette,
  Award,
  FileText,
  Music,
  Smartphone,
  Bot,
  Video,
  Wand2,
  Trash2,
  Edit3,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getAllPersonalTools,
  createOrUpdatePersonalTool,
  deletePersonalTool,
  getPersonalToolsSubscribers,
  grantPersonalToolsAccess,
  revokePersonalToolsAccess,
  PersonalToolsConfigData,
} from "@/app/actions/personal-tools";

const ICON_OPTIONS = [
  { id: "Camera", label: "Câmera / Foto", icon: Camera },
  { id: "Sparkles", label: "IA / Mágica", icon: Sparkles },
  { id: "Palette", label: "Design / Artes", icon: Palette },
  { id: "Award", label: "Certificado / Selo", icon: Award },
  { id: "FileText", label: "Texto / Sermões", icon: FileText },
  { id: "Music", label: "Louvor / Cifras", icon: Music },
  { id: "Bot", label: "Robô / Chatbot", icon: Bot },
  { id: "Video", label: "Vídeo / Transmissão", icon: Video },
  { id: "Smartphone", label: "App Celular", icon: Smartphone },
];

function getToolIcon(iconName: string) {
  const found = ICON_OPTIONS.find((i) => i.id === iconName);
  return found ? found.icon : Sparkles;
}

export function SuperAdminPersonalToolsManager() {
  const [activeView, setActiveView] = useState<"tools" | "subscribers">("tools");
  const [tools, setTools] = useState<PersonalToolsConfigData[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalActive: 0,
    totalTrial: 0,
    totalOverdue: 0,
    totalMonthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Filtros de busca e status para membros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "TRIAL" | "OVERDUE">("ALL");

  // Modal de Criação / Edição de Ferramenta
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [toolSlug, setToolSlug] = useState("");
  const [toolTitle, setToolTitle] = useState("");
  const [toolBadge, setToolBadge] = useState("");
  const [toolIcon, setToolIcon] = useState("Sparkles");
  const [toolCategory, setToolCategory] = useState("MÍDIA & SOCIAL");
  const [toolDescription, setToolDescription] = useState("");
  const [toolMonthlyPrice, setToolMonthlyPrice] = useState("19.90");
  const [toolAnnualPrice, setToolAnnualPrice] = useState("199.00");
  const [toolTrialDays, setToolTrialDays] = useState("30");
  const [toolActive, setToolActive] = useState(true);
  const [toolActionType, setToolActionType] = useState<"MODAL_INSTAGRAM" | "COMING_SOON" | "ROUTE" | "EXTERNAL">("COMING_SOON");
  const [toolFeaturesText, setToolFeaturesText] = useState("");
  const [isSavingTool, setIsSavingTool] = useState(false);

  const loadData = async () => {
    try {
      const [toolsRes, subsRes] = await Promise.all([
        getAllPersonalTools(),
        getPersonalToolsSubscribers(),
      ]);

      if (toolsRes.success && toolsRes.tools) {
        setTools(toolsRes.tools);
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
      console.error("Erro ao carregar ferramentas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Abrir Modal para Criar Nova Ferramenta
  const handleOpenNewToolModal = () => {
    setEditingToolId(null);
    setToolSlug("");
    setToolTitle("");
    setToolBadge("NOVO");
    setToolIcon("Sparkles");
    setToolCategory("MÍDIA & SOCIAL");
    setToolDescription("");
    setToolMonthlyPrice("19.90");
    setToolAnnualPrice("199.00");
    setToolTrialDays("30");
    setToolActive(true);
    setToolActionType("COMING_SOON");
    setToolFeaturesText("Recurso Exclusivo em Alta Definição\nIntegração com Celular e PWA\nSem Limites de Uso Diário");
    setIsToolModalOpen(true);
  };

  // Abrir Modal para Editar Ferramenta Existente
  const handleOpenEditToolModal = (t: PersonalToolsConfigData) => {
    setEditingToolId(t.id);
    setToolSlug(t.slug);
    setToolTitle(t.title);
    setToolBadge(t.badge || "");
    setToolIcon(t.icon || "Sparkles");
    setToolCategory(t.category || "GERAL");
    setToolDescription(t.description || "");
    setToolMonthlyPrice(t.monthlyPrice.toString());
    setToolAnnualPrice(t.annualPrice.toString());
    setToolTrialDays(t.trialDays.toString());
    setToolActive(t.active);
    setToolActionType(t.actionType || "COMING_SOON");
    setToolFeaturesText((t.features || []).join("\n"));
    setIsToolModalOpen(true);
  };

  // Salvar Ferramenta (Criar ou Editar)
  const handleSaveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolTitle.trim()) {
      toast.error("Informe o título da ferramenta.");
      return;
    }

    const slug = toolSlug.trim() || toolTitle.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    const features = toolFeaturesText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    setIsSavingTool(true);
    try {
      const res = await createOrUpdatePersonalTool({
        id: editingToolId || undefined,
        slug,
        title: toolTitle,
        badge: toolBadge,
        icon: toolIcon,
        category: toolCategory,
        description: toolDescription,
        monthlyPrice: parseFloat(toolMonthlyPrice) || 19.9,
        annualPrice: parseFloat(toolAnnualPrice) || 199.0,
        trialDays: parseInt(toolTrialDays) || 30,
        active: toolActive,
        actionType: toolActionType,
        features,
      });

      if (res.success) {
        toast.success(editingToolId ? "Ferramenta atualizada com sucesso!" : "Nova ferramenta criada com sucesso!");
        setIsToolModalOpen(false);
        await loadData();
      } else {
        toast.error(res.error || "Erro ao salvar ferramenta.");
      }
    } catch {
      toast.error("Erro interno ao salvar.");
    } finally {
      setIsSavingTool(false);
    }
  };

  // Excluir Ferramenta
  const handleDeleteTool = async (toolId: string, toolTitle: string) => {
    if (!confirm(`Tem certeza que deseja excluir a ferramenta "${toolTitle}"?`)) {
      return;
    }

    try {
      const res = await deletePersonalTool(toolId);
      if (res.success) {
        toast.success(`Ferramenta "${toolTitle}" excluída.`);
        await loadData();
      } else {
        toast.error(res.error || "Erro ao excluir.");
      }
    } catch {
      toast.error("Erro ao processar exclusão.");
    }
  };

  // Ação de Membro: Conceder Cortesia (+30d ou +90d)
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

  // Ação de Membro: Revogar Acesso
  const handleRevokeAccess = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja bloquear o acesso de ${userName}?`)) {
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
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.tenant?.name && sub.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

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
        <span>Carregando gestão do módulo de ferramentas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do Módulo com Seletor de Visão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent border border-pink-500/25">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 text-xs font-black uppercase">
            <Wand2 className="w-3.5 h-3.5" />
            <span>Ecossistema B2C • Catálogo Extensível de Ferramentas</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Gestão do Módulo: Minhas Ferramentas
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Crie e gerencie múltiplas ferramentas para os membros (Instagram Studio, Devocionais com IA, Gerador de Banners, etc.), definindo preços, degustações e cortesias.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Alternador de Abas */}
          <div className="bg-zinc-900 p-1 rounded-2xl border border-white/10 flex items-center gap-1">
            <button
              onClick={() => setActiveView("tools")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === "tools"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ferramentas ({tools.length})</span>
            </button>

            <button
              onClick={() => setActiveView("subscribers")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === "subscribers"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Membros ({subscribers.length})</span>
            </button>
          </div>

          {activeView === "tools" && (
            <Button
              onClick={handleOpenNewToolModal}
              className="h-10 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs hover:brightness-110 shadow-lg cursor-pointer gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Criar Nova Ferramenta</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={actionInProgress !== null}
            className="h-10 rounded-2xl border-white/10 bg-zinc-900 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Cards de Métricas B2C */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase">
            <span>Ferramentas no Catálogo</span>
            <Layers className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-white">{tools.length}</div>
          <p className="text-[11px] text-zinc-400">{tools.filter((t) => t.active).length} ativas para contratação.</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase">
            <span>Assinantes Pagantes</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.totalActive}</div>
          <p className="text-[11px] text-zinc-400">Membros com assinatura ativa.</p>
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
            <span>Receita Mensal B2C</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            R$ {metrics.totalMonthlyRevenue.toFixed(2).replace(".", ",")}
          </div>
          <p className="text-[11px] text-zinc-400">MRR recorrente dos membros via Asaas.</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISÃO 1: CATÁLOGO DE FERRAMENTAS (CRIAR E GERENCIAR)                     */}
      {/* ========================================================================= */}
      {activeView === "tools" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-pink-400" />
              <span>Catálogo Oficial de Ferramentas Horeb</span>
            </h3>
            <span className="text-xs font-bold text-zinc-400">
              Total cadastradas: {tools.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {tools.map((t) => {
              const IconComponent = getToolIcon(t.icon);
              return (
                <div
                  key={t.id}
                  className="p-5 rounded-3xl bg-zinc-900/80 border border-white/10 hover:border-pink-500/30 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white group-hover:text-pink-300 transition-colors">
                              {t.title}
                            </h4>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                            {t.category} • /{t.slug}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {t.badge && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {t.badge}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            t.active
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                              : "bg-zinc-800 border-white/10 text-zinc-500"
                          }`}
                        >
                          {t.active ? "Ativo" : "Pausado"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>

                    {/* Preços e Ação */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-white/5 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Assinatura</span>
                        <span className="text-sm font-black text-white">
                          R$ {t.monthlyPrice.toFixed(2).replace(".", ",")}
                          <span className="text-[10px] text-zinc-400 font-normal"> /mês</span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Degustação</span>
                        <span className="text-xs font-bold text-amber-400">
                          {t.trialDays} Dias Grátis
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações da Ferramenta */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <span className="text-[10px] font-mono text-zinc-500">
                      Ação: {t.actionType === "MODAL_INSTAGRAM" ? "Câmera Celular" : "Em Breve"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditToolModal(t)}
                        className="h-8 px-2.5 rounded-xl border-white/10 bg-zinc-800 text-zinc-200 hover:text-white text-xs font-bold gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Editar</span>
                      </Button>

                      {t.slug !== "instagram-studio" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTool(t.id, t.title)}
                          className="h-8 px-2 rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                          title="Excluir ferramenta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISÃO 2: LISTAGEM E CONTROLE DE MEMBROS ASSINANTES                       */}
      {/* ========================================================================= */}
      {activeView === "subscribers" && (
        <div className="p-6 rounded-3xl bg-zinc-900/70 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Gestão de Membros & Assinantes B2C</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Acompanhe o status de cada membro, conceda cortesias manuais (+30d/+90d) ou bloqueie acessos.
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

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                      {isBusy ? (
                        <div className="flex items-center gap-1 text-xs text-pink-400 py-1.5 px-3">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Atualizando...</span>
                        </div>
                      ) : (
                        <>
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
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA CRIAR OU EDITAR FERRAMENTA                                     */}
      {/* ========================================================================= */}
      {isToolModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/15 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-pink-400" />
                <h3 className="text-base font-black text-white">
                  {editingToolId ? "Editar Ferramenta" : "Criar Nova Ferramenta no Catálogo"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsToolModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTool} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Nome / Título da Ferramenta</Label>
                  <Input
                    placeholder="Ex: Criador de Devocionais com IA"
                    value={toolTitle}
                    onChange={(e) => setToolTitle(e.target.value)}
                    required
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Identificador (Slug único)</Label>
                  <Input
                    placeholder="Ex: ia-devocional"
                    value={toolSlug}
                    onChange={(e) => setToolSlug(e.target.value)}
                    required
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Categoria</Label>
                  <Input
                    placeholder="Ex: IA & MINISTÉRIO"
                    value={toolCategory}
                    onChange={(e) => setToolCategory(e.target.value)}
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Selo (Badge)</Label>
                  <Input
                    placeholder="Ex: NOVO, IA, POPULAR"
                    value={toolBadge}
                    onChange={(e) => setToolBadge(e.target.value)}
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Ícone</Label>
                  <select
                    value={toolIcon}
                    onChange={(e) => setToolIcon(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/15 text-white h-10 px-2 rounded-xl text-xs focus:outline-hidden"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Preço Mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={toolMonthlyPrice}
                    onChange={(e) => setToolMonthlyPrice(e.target.value)}
                    required
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Preço Anual (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={toolAnnualPrice}
                    onChange={(e) => setToolAnnualPrice(e.target.value)}
                    required
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Degustação (Dias)</Label>
                  <Input
                    type="number"
                    value={toolTrialDays}
                    onChange={(e) => setToolTrialDays(e.target.value)}
                    required
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Tipo de Ação ao Clicar</Label>
                  <select
                    value={toolActionType}
                    onChange={(e) => setToolActionType(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-white/15 text-white h-10 px-2 rounded-xl text-xs focus:outline-hidden"
                  >
                    <option value="MODAL_INSTAGRAM">Abrir Câmera do Instagram Studio</option>
                    <option value="COMING_SOON">Em Breve / Lançamento VIP</option>
                    <option value="ROUTE">Link Interno do App</option>
                    <option value="EXTERNAL">Link Externo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Disponibilidade</Label>
                  <button
                    type="button"
                    onClick={() => setToolActive(!toolActive)}
                    className={`w-full h-10 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      toolActive
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-400 border-white/10"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{toolActive ? "Ferramenta Ativa no App" : "Pausada"}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Descrição / Pitch de Vendas</Label>
                <textarea
                  value={toolDescription}
                  onChange={(e) => setToolDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-white/15 text-white p-2.5 rounded-xl text-xs resize-none focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">
                  Benefícios / Features (1 por linha)
                </Label>
                <textarea
                  value={toolFeaturesText}
                  onChange={(e) => setToolFeaturesText(e.target.value)}
                  rows={3}
                  placeholder="Ex:&#10;Modelos prontos em alta definição&#10;Inserção automática do brasão da igreja&#10;Exportação direta em 1 toque"
                  className="w-full bg-zinc-950 border border-white/15 text-white p-2.5 rounded-xl text-xs resize-none focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsToolModalOpen(false)}
                  className="h-10 rounded-xl border-white/10 bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={isSavingTool}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs hover:brightness-110 shadow-lg cursor-pointer gap-2"
                >
                  {isSavingTool ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Save className="w-4 h-4 text-white" />
                  )}
                  <span>{editingToolId ? "Salvar Alterações" : "Criar Ferramenta"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
