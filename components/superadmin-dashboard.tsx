"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  updateTenantSubscription,
  createOrUpdatePlan,
  deletePlan,
  manuallyVerifyUser,
  sendDirectEmail,
  testEmailDiagnostics,
} from "@/app/actions/superadmin";
import { resendActivationCode } from "@/app/actions/activation";
import {
  Crown,
  ShieldCheck,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Mail,
  Send,
  Inbox,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Lock,
  Sparkles,
  Server,
  Zap,
  Trash2,
  Edit,
  Clock,
  LogOut,
  ChevronRight,
  Layers,
} from "lucide-react";

interface SuperAdminDashboardProps {
  metrics: any;
  initialTenants: any[];
  initialPlans: any[];
  initialUsers: any[];
  initialEmailLogs: any[];
  initialInbox: any[];
  inboxTotal: number;
  imapConnected: boolean;
}

export function SuperAdminDashboard({
  metrics: initialMetrics,
  initialTenants,
  initialPlans,
  initialUsers,
  initialEmailLogs,
  initialInbox,
  inboxTotal,
  imapConnected,
}: SuperAdminDashboardProps) {
  const [tenants, setTenants] = useState(initialTenants);
  const [plans, setPlans] = useState(initialPlans);
  const [users, setUsers] = useState(initialUsers);
  const [emailLogs, setEmailLogs] = useState(initialEmailLogs);
  const [inbox, setInbox] = useState(initialInbox);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isPending, startTransition] = useTransition();

  // Estados de formulários
  const [activeTab, setActiveTab] = useState("overview");

  // Estado do Modal de Criar/Editar Plano
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planName, setPlanName] = useState("");
  const [planSlug, setPlanSlug] = useState("");
  const [planSubtitle, setPlanSubtitle] = useState("");
  const [planBadge, setPlanBadge] = useState("");
  const [planSetupPrice, setPlanSetupPrice] = useState("790");
  const [planMonthlyPrice, setPlanMonthlyPrice] = useState("249");
  const [planFeatures, setPlanFeatures] = useState("");
  const [planHighlight, setPlanHighlight] = useState(false);

  // Estado do Envio Direto de E-mail
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [sendingMail, setSendingMail] = useState(false);

  // Diagnóstico de Conexão
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  // Ação: Alterar Status ou Plano da Igreja
  const handleUpdateTenant = async (
    tenantId: string,
    newPlan: string,
    newStatus: string,
    monthly: number,
    setup: number
  ) => {
    startTransition(async () => {
      const res = await updateTenantSubscription({
        tenantId,
        plan: newPlan,
        status: newStatus,
        monthlyPrice: monthly,
        setupPrice: setup,
      });

      if (res.success && res.tenant) {
        toast.success(`Assinatura da igreja atualizada com sucesso!`);
        setTenants((prev) =>
          prev.map((t) => (t.id === tenantId ? { ...t, ...res.tenant } : t))
        );
      } else {
        toast.error("Falha ao atualizar assinatura.");
      }
    });
  };

  // Ação: Abrir modal de edição/criação de plano
  const handleOpenPlanModal = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanName(plan.name);
      setPlanSlug(plan.slug);
      setPlanSubtitle(plan.subtitle || "");
      setPlanBadge(plan.badge || "");
      setPlanSetupPrice(plan.setupPrice.toString());
      setPlanMonthlyPrice(plan.monthlyPrice.toString());
      try {
        const feats = JSON.parse(plan.features || "[]");
        setPlanFeatures(feats.join("\n"));
      } catch {
        setPlanFeatures(plan.features || "");
      }
      setPlanHighlight(plan.highlight);
    } else {
      setEditingPlan(null);
      setPlanName("");
      setPlanSlug("");
      setPlanSubtitle("");
      setPlanBadge("");
      setPlanSetupPrice("790");
      setPlanMonthlyPrice("249");
      setPlanFeatures("Cadastro de membros\nÁrea do membro\nMural de avisos\nPIX instantâneo");
      setPlanHighlight(false);
    }
    setShowPlanModal(true);
  };

  // Salvar Plano Comercial
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const featuresArray = planFeatures
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    startTransition(async () => {
      const res = await createOrUpdatePlan({
        id: editingPlan?.id,
        slug: planSlug.toLowerCase().trim(),
        name: planName.trim(),
        subtitle: planSubtitle.trim(),
        badge: planBadge.trim() || undefined,
        setupPrice: parseFloat(planSetupPrice) || 0,
        monthlyPrice: parseFloat(planMonthlyPrice) || 0,
        features: featuresArray,
        highlight: planHighlight,
      });

      if (res.success && res.plan) {
        toast.success(
          editingPlan ? "Plano atualizado com sucesso!" : "Novo plano criado com sucesso!"
        );
        setShowPlanModal(false);
        if (editingPlan) {
          setPlans((prev) => prev.map((p) => (p.id === res.plan.id ? res.plan : p)));
        } else {
          setPlans((prev) => [...prev, res.plan]);
        }
      } else {
        toast.error(res.error || "Erro ao salvar plano.");
      }
    });
  };

  // Excluir Plano
  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;
    startTransition(async () => {
      const res = await deletePlan(planId);
      if (res.success) {
        toast.success("Plano excluído com sucesso.");
        setPlans((prev) => prev.filter((p) => p.id !== planId));
      } else {
        toast.error("Falha ao excluir plano.");
      }
    });
  };

  // Ativar Usuário Manualmente
  const handleVerifyUser = async (userId: string) => {
    startTransition(async () => {
      const res = await manuallyVerifyUser(userId);
      if (res.success) {
        toast.success(`Usuário ${res.user?.name || ""} ativado com sucesso!`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isEmailVerified: true } : u))
        );
      } else {
        toast.error("Falha ao ativar usuário.");
      }
    });
  };

  // Reenviar Código de Ativação
  const handleResendCode = async (email: string) => {
    toast.info("Enviando novo código de 6 dígitos via Hostinger SMTP...");
    const res = await resendActivationCode(email);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.error);
    }
  };

  // Enviar E-mail Direto da Central
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingMail(true);
    try {
      const res = await sendDirectEmail({
        to: mailTo,
        subject: mailSubject,
        htmlContent: mailBody,
      });

      if (res.success) {
        toast.success("E-mail enviado com sucesso via Hostinger SMTP!");
        setMailTo("");
        setMailSubject("");
        setMailBody("");
      } else {
        toast.error(res.error || "Falha ao enviar e-mail.");
      }
    } finally {
      setSendingMail(false);
    }
  };

  // Testar Conexões SMTP e IMAP
  const handleRunDiagnostics = async () => {
    setDiagRunning(true);
    setDiagResult(null);
    try {
      const res = await testEmailDiagnostics();
      setDiagResult(res);
      if (res.smtp.success && res.imap.success) {
        toast.success("SMTP e IMAP Hostinger 100% Operacionais!");
      } else {
        toast.warning("Atenção aos diagnósticos de e-mail.");
      }
    } finally {
      setDiagRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header do Super Admin */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-black/80 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-white text-base tracking-tight flex items-center gap-2">
                  Horeb SaaS
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SUPER ADMIN
                  </span>
                </span>
                <span className="text-[11px] text-zinc-400 block -mt-0.5">
                  Painel Executivo de Gestão Geral
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Logado como: <strong>Edson Manoel</strong> (edsonmanoel2012@gmail.com)
              </span>
            </div>

            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-xl border-white/[0.12] bg-white/[0.04] text-xs font-bold text-zinc-200 hover:text-white"
              >
                <span>Ver App</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-8 flex-1">
        {/* Navegação por Abas do Super Admin */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto bg-zinc-900/80 border border-white/[0.08] p-1.5 rounded-2xl gap-1.5">
            <TabsTrigger
              value="overview"
              className="text-xs font-black py-2.5 rounded-xl gap-2 data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-lg transition-all"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>1. Visão Geral (MRR)</span>
            </TabsTrigger>

            <TabsTrigger
              value="tenants"
              className="text-xs font-black py-2.5 rounded-xl gap-2 data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-lg transition-all"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>2. Assinaturas & Igrejas</span>
            </TabsTrigger>

            <TabsTrigger
              value="plans"
              className="text-xs font-black py-2.5 rounded-xl gap-2 data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-lg transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Planos Comerciais</span>
            </TabsTrigger>

            <TabsTrigger
              value="users"
              className="text-xs font-black py-2.5 rounded-xl gap-2 data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-lg transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              <span>4. Usuários & Ativação</span>
            </TabsTrigger>

            <TabsTrigger
              value="emails"
              className="text-xs font-black py-2.5 rounded-xl gap-2 data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-lg transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>5. Central de E-mails</span>
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* TAB 1: VISÃO GERAL & MRR                                                  */}
          {/* ========================================================================= */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card MRR */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/15 via-zinc-900/90 to-zinc-950 border border-amber-500/30 shadow-xl space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <span>Receita Recorrente (MRR)</span>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  R$ {metrics?.mrr?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  <span className="text-xs text-zinc-400 font-normal"> /mês</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Faturamento mensal somado das igrejas ativas no SaaS.
                </p>
              </div>

              {/* Card Igrejas Ativas */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/[0.08] shadow-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Total de Congregações</span>
                  <Building2 className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {metrics?.totalTenants || 0}
                  <span className="text-xs text-emerald-400 font-bold ml-2">
                    ({metrics?.activeTenants || 0} ativas)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {metrics?.suspendedTenants || 0} suspensas • {metrics?.trialTenants || 0} em teste
                </p>
              </div>

              {/* Card Usuários Cadastrados */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/[0.08] shadow-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Total de Usuários</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {metrics?.totalUsers || 0}
                  <span className="text-xs text-emerald-400 font-bold ml-2">
                    ({metrics?.verifiedUsers || 0} verificados)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Pastores, líderes e membros com login no app.
                </p>
              </div>

              {/* Card Dízimos Transacionados */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/[0.08] shadow-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Volume Dízimos PIX</span>
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  R${" "}
                  {metrics?.totalDonationsAmount?.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-[11px] text-zinc-400">
                  {metrics?.totalDonationsCount || 0} ofertas processadas no módulo PIX.
                </p>
              </div>
            </div>

            {/* Acesso Rápido Master para Edson Manoel */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/25 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Modo Super Admin • Acesso Irrestrito
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Você possui autoridade master para impersonar qualquer igreja, gerenciar
                    assinaturas, criar planos e inspecionar mensagens SMTP/IMAP.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={() => setActiveTab("tenants")}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-10 px-4 rounded-xl"
                >
                  <span>Gerenciar Assinaturas das Igrejas</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>

                <Button
                  onClick={() => handleOpenPlanModal()}
                  variant="outline"
                  className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10 font-bold text-xs h-10 px-4 rounded-xl"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Criar Novo Plano Comercial</span>
                </Button>

                <Button
                  onClick={() => setActiveTab("emails")}
                  variant="outline"
                  className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10 font-bold text-xs h-10 px-4 rounded-xl"
                >
                  <Mail className="w-3.5 h-3.5 mr-1" />
                  <span>Acessar Central de E-mails</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 2: GESTÃO DE ASSINATURAS & IGREJAS (TENANTS)                          */}
          {/* ========================================================================= */}
          <TabsContent value="tenants" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <span>Igrejas & Assinaturas Ativas</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Gerencie o plano, mensalidade e status de funcionamento de cada congregação.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-white/[0.03] border-b border-white/[0.08] text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Igreja / URL</th>
                      <th className="py-3 px-4">Plano</th>
                      <th className="py-3 px-4">Mensalidade</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Membros</th>
                      <th className="py-3 px-4 text-right">Ações Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {tenants.map((t) => {
                      const isMatriz = !t.parentId;
                      return (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: t.primaryColor }}
                              />
                              <div>
                                <span className="font-bold text-white block text-sm">
                                  {t.name}
                                </span>
                                <span className="font-mono text-[11px] text-amber-400/90">
                                  /{t.slug}
                                  {isMatriz ? " (Matriz)" : " (Filial)"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Seletor de Plano */}
                          <td className="py-3 px-4">
                            <select
                              value={t.plan}
                              onChange={(e) =>
                                handleUpdateTenant(
                                  t.id,
                                  e.target.value,
                                  t.status,
                                  e.target.value === "PREMIUM"
                                    ? 399
                                    : e.target.value === "GESTAO"
                                    ? 249
                                    : 149,
                                  t.setupPrice
                                )
                              }
                              className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-bold outline-none focus:ring-1 focus:ring-amber-400"
                            >
                              <option value="ESSENCIAL">Essencial (R$ 149)</option>
                              <option value="GESTAO">Gestão (R$ 249)</option>
                              <option value="PREMIUM">Premium (R$ 399)</option>
                            </select>
                          </td>

                          {/* Mensalidade */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-white">
                              R$ {t.monthlyPrice || 249}
                            </span>
                            <span className="text-[10px] text-zinc-500 block">/mês</span>
                          </td>

                          {/* Status da Assinatura */}
                          <td className="py-3 px-4">
                            <select
                              value={t.status}
                              onChange={(e) =>
                                handleUpdateTenant(
                                  t.id,
                                  t.plan,
                                  e.target.value,
                                  t.monthlyPrice,
                                  t.setupPrice
                                )
                              }
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-black border uppercase tracking-wider outline-none cursor-pointer ${
                                t.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : t.status === "TRIAL"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              }`}
                            >
                              <option value="ACTIVE" className="bg-zinc-900 text-emerald-400">
                                Ativa
                              </option>
                              <option value="TRIAL" className="bg-zinc-900 text-amber-400">
                                Teste (Trial)
                              </option>
                              <option value="SUSPENDED" className="bg-zinc-900 text-rose-400">
                                Suspensa
                              </option>
                              <option value="CANCELLED" className="bg-zinc-900 text-zinc-400">
                                Cancelada
                              </option>
                            </select>
                          </td>

                          {/* Membros */}
                          <td className="py-3 px-4 font-mono">
                            {t._count?.users || t.users?.length || 0} membros
                          </td>

                          {/* Ações Impersonate */}
                          <td className="py-3 px-4 text-right">
                            <Link href={`/${t.slug}`} target="_blank">
                              <Button
                                size="sm"
                                className="h-8 px-3 rounded-lg text-xs font-bold bg-white/[0.08] hover:bg-white/[0.15] text-zinc-100 gap-1.5"
                              >
                                <span>Acessar App</span>
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 3: GERENCIAMENTO DE PLANOS COMERCIAIS                                 */}
          {/* ========================================================================= */}
          <TabsContent value="plans" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>Planos Comerciais do Horeb</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Crie, edite preços ou configure novos pacotes de recursos para o seu modelo de
                  negócio.
                </p>
              </div>

              <Button
                onClick={() => handleOpenPlanModal()}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs h-10 px-4 rounded-xl gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Criar Novo Plano</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => {
                let feats: string[] = [];
                try {
                  feats = JSON.parse(p.features || "[]");
                } catch {
                  feats = [p.features];
                }

                return (
                  <Card
                    key={p.id}
                    className={`bg-zinc-950 border ${
                      p.highlight ? "border-amber-500/50 shadow-amber-500/10" : "border-white/[0.08]"
                    } rounded-2xl relative flex flex-col justify-between`}
                  >
                    {p.badge && (
                      <span className="absolute -top-3 left-4 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500 text-black shadow">
                        {p.badge}
                      </span>
                    )}

                    <CardHeader className="pb-3 pt-5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black text-white">{p.name}</CardTitle>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenPlanModal(p)}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                            title="Editar Plano"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(p.id)}
                            className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center text-rose-400"
                            title="Excluir Plano"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <CardDescription className="text-xs text-zinc-400">
                        {p.subtitle || "Plano Horeb"}
                      </CardDescription>

                      <div className="mt-4 pb-3 border-b border-white/[0.06]">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-zinc-400 font-semibold">R$</span>
                          <span className="text-3xl font-black text-white">{p.monthlyPrice}</span>
                          <span className="text-xs text-zinc-400 font-semibold">/mês</span>
                        </div>
                        <div className="text-[11px] text-amber-400 mt-1">
                          Implantação: R$ {p.setupPrice} (taxa única)
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-2 text-xs text-zinc-300">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                        Recursos inclusos:
                      </span>
                      <ul className="space-y-1.5">
                        {feats.slice(0, 6).map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 text-xs">•</span>
                            <span className="leading-snug">{f}</span>
                          </li>
                        ))}
                        {feats.length > 6 && (
                          <li className="text-[10px] text-zinc-500 italic">
                            + {feats.length - 6} outros recursos
                          </li>
                        )}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-2 pb-4">
                      <Button
                        onClick={() => handleOpenPlanModal(p)}
                        variant="outline"
                        className="w-full h-9 rounded-xl border-white/10 text-xs font-bold text-zinc-200 hover:text-white"
                      >
                        Editar Preços & Recursos
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 4: USUÁRIOS & ATIVAÇÃO DE E-MAILS                                      */}
          {/* ========================================================================= */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>Gestão Global de Usuários & Contas</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Visualize quem se cadastrou, o status da validação por e-mail e ative
                  manualmente contas se necessário.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-white/[0.03] border-b border-white/[0.08] text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Congregação</th>
                      <th className="py-3 px-4">Papel (Role)</th>
                      <th className="py-3 px-4">Validação E-mail</th>
                      <th className="py-3 px-4 text-right">Ação Master</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{u.name}</td>
                        <td className="py-3 px-4 font-mono text-zinc-300">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className="text-zinc-200 font-semibold">{u.tenant?.name}</span>
                          <span className="text-[10px] text-zinc-500 block">/{u.tenant?.slug}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              u.role === "SUPERADMIN"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : u.role === "PASTOR"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                : u.role === "ADMIN"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.isEmailVerified ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verificado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px]">
                              <Clock className="w-3.5 h-3.5" />
                              Pendente Ativação
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {!u.isEmailVerified && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleVerifyUser(u.id)}
                                className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg"
                                title="Ativar conta imediatamente sem exigir código"
                              >
                                Ativar Manualmente
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResendCode(u.email)}
                                className="h-7 px-2.5 border-white/10 text-zinc-300 hover:text-white font-bold text-[11px] rounded-lg"
                                title="Reenviar código de 6 dígitos para o e-mail"
                              >
                                Reenviar Código
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 5: CENTRAL DE E-MAILS (ENTRADA & SAÍDA / HOSTINGER)                   */}
          {/* ========================================================================= */}
          <TabsContent value="emails" className="space-y-6">
            {/* Header com Diagnóstico Live */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/80 border border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Servidores Hostinger • suporte@lynxems.com.br
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Saída SMTP (porta 465 SSL) • Entrada IMAP (porta 993 SSL)
                  </p>
                </div>
              </div>

              <Button
                onClick={handleRunDiagnostics}
                disabled={diagRunning}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-10 px-4 rounded-xl gap-2"
              >
                {diagRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>Testar Conexões SMTP & IMAP</span>
              </Button>
            </div>

            {/* Resultado do Diagnóstico */}
            {diagResult && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-300">
                    Status SMTP (smtp.hostinger.com:465):
                  </span>
                  <span
                    className={
                      diagResult.smtp.success ? "text-emerald-400 font-bold" : "text-rose-400"
                    }
                  >
                    {diagResult.smtp.success ? "✅ Operacional (Pronto para envios)" : diagResult.smtp.error}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-300">
                    Status IMAP (imap.hostinger.com:993):
                  </span>
                  <span
                    className={
                      diagResult.imap.success ? "text-emerald-400 font-bold" : "text-rose-400"
                    }
                  >
                    {diagResult.imap.success ? "✅ Operacional (Pronto para leitura)" : diagResult.imap.error}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Caixa de Entrada (IMAP Hostinger - E-mails Recebidos) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-amber-400" />
                    <span>Caixa de Entrada (INBOX - {inboxTotal} mensagens)</span>
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    suporte@lynxems.com.br
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {inbox.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-zinc-950 border border-white/[0.08] text-center text-xs text-zinc-500">
                      Nenhuma mensagem encontrada na caixa de entrada.
                    </div>
                  ) : (
                    inbox.map((msg: any) => (
                      <div
                        key={msg.id}
                        className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] hover:border-amber-500/30 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white truncate max-w-[200px]">
                            {msg.from}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(msg.date).toLocaleDateString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-amber-300 truncate">
                          {msg.subject}
                        </p>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {msg.snippet || "Sem prévia de texto."}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* E-mails Enviados (Logs de Saída SMTP) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>E-mails Enviados (Códigos & Notificações)</span>
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {emailLogs.length} registros
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {emailLogs.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-zinc-950 border border-white/[0.08] text-center text-xs text-zinc-500">
                      Nenhum e-mail registrado ainda.
                    </div>
                  ) : (
                    emailLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-4 rounded-xl bg-zinc-950 border border-white/[0.08] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white font-mono">{log.to}</span>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            {log.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-300">{log.subject}</p>
                        {log.code && (
                          <div className="inline-block px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-mono font-bold text-[10px]">
                            Código Gerado: {log.code}
                          </div>
                        )}
                        <p className="text-[10px] text-zinc-500">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Enviar E-mail Direto da Plataforma */}
            <div className="p-6 rounded-2xl bg-zinc-950 border border-white/[0.08] space-y-4">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                <span>Disparo Avulso de E-mail via Hostinger SMTP</span>
              </h4>

              <form onSubmit={handleSendEmail} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    required
                    type="email"
                    placeholder="Destinatário (ex: pastor@igreja.org)"
                    value={mailTo}
                    onChange={(e) => setMailTo(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs rounded-xl"
                  />
                  <Input
                    required
                    placeholder="Assunto da Mensagem"
                    value={mailSubject}
                    onChange={(e) => setMailSubject(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs rounded-xl"
                  />
                </div>

                <textarea
                  required
                  rows={3}
                  placeholder="Mensagem (aceita HTML ou texto simples)..."
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:ring-1 focus:ring-amber-500"
                />

                <Button
                  type="submit"
                  disabled={sendingMail}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-10 px-5 rounded-xl gap-2 cursor-pointer"
                >
                  {sendingMail ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Enviar E-mail Oficial</span>
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal Criar / Editar Plano */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-lg font-black text-white">
                {editingPlan ? "Editar Plano Comercial" : "Criar Novo Plano Comercial"}
              </h3>
              <button
                onClick={() => setShowPlanModal(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Nome do Plano</label>
                  <Input
                    required
                    placeholder="Ex: Crescimento"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Slug (Identificador)</label>
                  <Input
                    required
                    placeholder="ex: crescimento"
                    value={planSlug}
                    onChange={(e) => setPlanSlug(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Taxa de Implantação (R$)</label>
                  <Input
                    required
                    type="number"
                    value={planSetupPrice}
                    onChange={(e) => setPlanSetupPrice(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold">Mensalidade (R$ /mês)</label>
                  <Input
                    required
                    type="number"
                    value={planMonthlyPrice}
                    onChange={(e) => setPlanMonthlyPrice(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-semibold">Subtítulo / Perfil</label>
                <Input
                  placeholder="Ex: Para congregações em expansão"
                  value={planSubtitle}
                  onChange={(e) => setPlanSubtitle(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-semibold">Badge de Destaque (Opcional)</label>
                <Input
                  placeholder="Ex: RECOMENDADO"
                  value={planBadge}
                  onChange={(e) => setPlanBadge(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-semibold">
                  Recursos Inclusos (um por linha)
                </label>
                <textarea
                  rows={4}
                  value={planFeatures}
                  onChange={(e) => setPlanFeatures(e.target.value)}
                  placeholder="Cadastro de membros&#10;Área do membro PWA&#10;PIX instantâneo&#10;Células"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="highlight"
                  checked={planHighlight}
                  onChange={(e) => setPlanHighlight(e.target.checked)}
                  className="rounded bg-zinc-900 border-white/20 text-amber-500"
                />
                <label htmlFor="highlight" className="text-xs text-zinc-300 cursor-pointer">
                  Destacar este plano na landing page pública
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-10 rounded-xl"
                >
                  Salvar Plano
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPlanModal(false)}
                  className="border-white/10 text-xs h-10 rounded-xl"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
