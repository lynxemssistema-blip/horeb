"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  registerMasterAndChurch,
  createBranchChurch,
  loginUser,
} from "@/app/actions/tenant";
import { isValidEmail } from "@/lib/validators";
import {
  Church,
  PlusCircle,
  GitBranch,
  Check,
  Loader2,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  Globe,
  Palette,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { ActivationDialog } from "@/components/activation-dialog";

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
}

interface CreateChurchDialogProps {
  existingTenants?: TenantOption[];
  triggerButton?: React.ReactNode;
  defaultTab?: "master" | "branch" | "login";
  parentTenantId?: string;
}

const colorPresets = [
  { label: "Vermelho Imperial", hex: "#dc2626", bg: "bg-red-600" },
  { label: "Azul Real", hex: "#2563eb", bg: "bg-blue-600" },
  { label: "Ouro Horeb", hex: "#f59e0b", bg: "bg-amber-500" },
  { label: "Esmeralda", hex: "#10b981", bg: "bg-emerald-500" },
  { label: "Roxo Real", hex: "#8b5cf6", bg: "bg-violet-500" },
  { label: "Índigo Profundo", hex: "#4f46e5", bg: "bg-indigo-600" },
  { label: "Rosa Vibrante", hex: "#ec4899", bg: "bg-pink-500" },
  { label: "Grafite Obsidian", hex: "#27272a", bg: "bg-zinc-800" },
];

export function CreateChurchDialog({
  existingTenants = [],
  triggerButton,
  defaultTab = "master",
  parentTenantId,
}: CreateChurchDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isLoading, setIsLoading] = useState(false);

  const [masterName, setMasterName] = useState("");
  const [masterEmail, setMasterEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [churchName, setChurchName] = useState("");
  const [churchSlug, setChurchSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#dc2626");

  // Estado da Validação de Código de Ativação
  const [activationOpen, setActivationOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Formulário 2: Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Formulário 3: Filial
  const [selectedParentId, setSelectedParentId] = useState(
    parentTenantId || existingTenants[0]?.id || ""
  );
  const [branchName, setBranchName] = useState("");
  const [branchSlug, setBranchSlug] = useState("");
  const [branchColor, setBranchColor] = useState("#2563eb");

  const emailIsValid = masterEmail.length === 0 || isValidEmail(masterEmail);

  // Auto-gerar slug a partir do nome
  const handleNameChange = (name: string, isBranch = false) => {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (isBranch) {
      setBranchName(name);
      setBranchSlug(slug);
    } else {
      setChurchName(name);
      setChurchSlug(slug);
    }
  };

  // Submissão do Master com Validação de E-mail e Senha
  const handleRegisterMaster = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(masterEmail)) {
      toast.error("Informe um e-mail válido (ex: pastor@igreja.com.br).");
      return;
    }

    if (masterPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (!masterName || !churchName) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerMasterAndChurch({
        masterName,
        masterEmail,
        masterPassword,
        churchName,
        churchSlug,
        primaryColor,
      });

      if (res.success) {
        if (res.requiresActivation) {
          toast.info("Código de ativação enviado para o seu e-mail!", {
            description: `Enviamos um código de 6 dígitos para ${masterEmail}.`,
          });
          setPendingEmail(masterEmail);
          setOpen(false);
          setActivationOpen(true);
        } else if (res.redirectUrl) {
          toast.success(`Igreja "${res.tenant?.name}" criada com sucesso!`);
          setOpen(false);
          router.push(res.redirectUrl);
        }
      } else {
        toast.error(res.error || "Falha ao criar igreja.");
      }
    } catch {
      toast.error("Erro inesperado no servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // Login de Usuário
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(loginEmail)) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginUser(loginEmail, loginPassword);
      if (res.success && res.redirectUrl) {
        toast.success(`Bem-vindo de volta, ${res.user?.name}!`, {
          description: "Login efetuado com sucesso.",
        });
        setOpen(false);
        router.push(res.redirectUrl);
      } else if (res.requiresActivation) {
        toast.warning(res.error || "Sua conta precisa de ativação.");
        setPendingEmail(loginEmail);
        setOpen(false);
        setActivationOpen(true);
      } else {
        toast.error(res.error || "E-mail ou senha incorretos.");
      }
    } catch {
      toast.error("Erro ao autenticar.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submissão de Filial
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId || !branchName) {
      toast.error("Selecione a igreja sede e informe o nome da filial.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await createBranchChurch({
        parentTenantId: selectedParentId,
        branchName,
        branchSlug,
        primaryColor: branchColor,
      });

      if (res.success && res.redirectUrl) {
        toast.success(`Filial "${res.branch?.name}" vinculada com sucesso!`, {
          description: `Redirecionando para: ${res.redirectUrl}`,
        });
        setOpen(false);
        router.push(res.redirectUrl);
      } else {
        toast.error(res.error || "Falha ao criar filial.");
      }
    } catch {
      toast.error("Erro inesperado no servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedParentChurch = existingTenants.find((t) => t.id === selectedParentId);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            (triggerButton as React.ReactElement) || (
              <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-extrabold shadow-lg shadow-amber-500/20 gap-2">
                <PlusCircle className="w-4 h-4" />
                <span>Cadastrar Minha Igreja</span>
              </Button>
            )
          }
        />

        <DialogContent className="max-w-lg w-full max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto overflow-x-hidden p-0 bg-zinc-950 border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(245,158,11,0.06)] relative text-zinc-100 touch-pan-y overscroll-contain">
          {/* Glow de Iluminação Superior */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 bg-amber-500/15 blur-3xl rounded-full" />

          <div className="p-4 sm:p-7 space-y-4 sm:space-y-5 relative z-10">
          {/* Cabeçalho */}
          <DialogHeader className="text-left space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px] font-bold tracking-wider uppercase w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Portal Multi-Tenant • Horeb</span>
            </div>
            <div>
              <DialogTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Portal da Liderança
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                Cadastre sua congregação sede, vincule filiais ou acesse seu painel.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Seletor Segmentado de Abas */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-11 bg-zinc-900/90 border border-white/[0.08] p-1 rounded-xl gap-1">
              <TabsTrigger
                value="master"
                className="text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.06] data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-md data-selected:!bg-gradient-to-r data-selected:!from-amber-500 data-selected:!to-yellow-500 data-selected:!text-black rounded-lg transition-all py-1.5"
              >
                <Church className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span>1. Matriz</span>
              </TabsTrigger>
              <TabsTrigger
                value="branch"
                className="text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.06] data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-md data-selected:!bg-gradient-to-r data-selected:!from-amber-500 data-selected:!to-yellow-500 data-selected:!text-black rounded-lg transition-all py-1.5"
              >
                <GitBranch className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span>2. Filial</span>
              </TabsTrigger>
              <TabsTrigger
                value="login"
                className="text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/[0.06] data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-md data-selected:!bg-gradient-to-r data-selected:!from-amber-500 data-selected:!to-yellow-500 data-selected:!text-black rounded-lg transition-all py-1.5"
              >
                <LogIn className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span>Entrar</span>
              </TabsTrigger>
            </TabsList>

            {/* ========================================================================= */}
            {/* TAB 1: CADASTRO DO MASTER COM LOGIN, E-MAIL VÁLIDO E SENHA               */}
            {/* ========================================================================= */}
            <TabsContent value="master" className="pt-4 space-y-4">
              <form onSubmit={handleRegisterMaster} className="space-y-4">
                {/* 1. Credenciais Master */}
                <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.07] p-4 sm:p-5 space-y-3.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                    <div className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <User className="w-3 h-3" />
                    </div>
                    <span>1. Credenciais do Usuário Master</span>
                  </div>

                  <div className="space-y-3">
                    {/* Nome Completo */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">
                        Nome do Pastor Presidente / Líder
                      </label>
                      <Input
                        required
                        value={masterName}
                        onChange={(e) => setMasterName(e.target.value)}
                        placeholder="Ex: Pr. Carlos Eduardo"
                        className="bg-zinc-950/80 border-white/[0.08] text-xs sm:text-sm h-10 rounded-xl focus-visible:ring-amber-500/40"
                      />
                    </div>

                    {/* E-mail Válido Obrigatório */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          <span>E-mail Oficial (Login Master)</span>
                        </label>
                        {masterEmail && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isValidEmail(masterEmail)
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {isValidEmail(masterEmail) ? "✓ Válido" : "✗ Formato incorreto"}
                          </span>
                        )}
                      </div>
                      <Input
                        required
                        type="email"
                        value={masterEmail}
                        onChange={(e) => setMasterEmail(e.target.value)}
                        placeholder="pastor@igreja.org"
                        className={`bg-zinc-950/80 text-xs sm:text-sm h-10 rounded-xl ${
                          masterEmail && !isValidEmail(masterEmail)
                            ? "border-rose-500 focus-visible:ring-rose-500/40"
                            : "border-white/[0.08] focus-visible:ring-amber-500/40"
                        }`}
                      />
                    </div>

                    {/* Senha de Acesso */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Senha de Acesso (mínimo 6 dígitos)</span>
                      </label>
                      <div className="relative">
                        <Input
                          required
                          type={showPassword ? "text" : "password"}
                          value={masterPassword}
                          onChange={(e) => setMasterPassword(e.target.value)}
                          placeholder="••••••••"
                          minLength={6}
                          className="bg-zinc-950/80 border-white/[0.08] text-xs sm:text-sm h-10 rounded-xl pr-10 tracking-widest focus-visible:ring-amber-500/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Dados da Igreja Sede */}
                <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.07] p-4 sm:p-5 space-y-3.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                    <div className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Church className="w-3 h-3" />
                    </div>
                    <span>2. Identidade da Igreja Sede (Matriz)</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">
                        Nome Oficial da Igreja
                      </label>
                      <Input
                        required
                        value={churchName}
                        onChange={(e) => handleNameChange(e.target.value, false)}
                        placeholder="Ex: Igreja Videira Central"
                        className="bg-zinc-950/80 border-white/[0.08] text-xs sm:text-sm h-10 rounded-xl focus-visible:ring-amber-500/40"
                      />
                    </div>

                    {/* Campo de Slug Responsivo - Sem Overflow */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                        <span>Endereço Web Exclusivo (Slug)</span>
                        <span className="text-[10px] text-zinc-400">Link personalizado</span>
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-zinc-950/80 border border-white/[0.08] focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20 rounded-xl overflow-hidden transition-all">
                        <div className="px-3 py-2 sm:py-2.5 bg-white/[0.03] border-b sm:border-b-0 sm:border-r border-white/[0.06] text-xs font-mono text-zinc-400 shrink-0 select-none flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-amber-400/80" />
                          <span>horeb.lynxems.com.br/</span>
                        </div>
                        <input
                          required
                          value={churchSlug}
                          onChange={(e) => setChurchSlug(e.target.value.toLowerCase())}
                          placeholder="videira-central"
                          className="bg-transparent border-0 text-white font-bold font-mono text-xs sm:text-sm px-3 py-2 sm:py-2.5 outline-none flex-1 min-w-0"
                        />
                      </div>
                    </div>

                    {/* Seletor de Cores */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-300">
                          Cor Primária da Marca (White-Label)
                        </label>
                        <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                            style={{ backgroundColor: primaryColor }}
                          />
                          {primaryColor}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {colorPresets.map((c) => {
                          const isSelected = primaryColor.toLowerCase() === c.hex.toLowerCase();
                          return (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setPrimaryColor(c.hex)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${c.bg} flex items-center justify-center transition-all hover:scale-110 relative cursor-pointer ${
                                isSelected
                                  ? "ring-2 ring-white scale-110 shadow-lg shadow-white/20"
                                  : "opacity-80 hover:opacity-100 ring-1 ring-white/10"
                              }`}
                              title={c.label}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                            </button>
                          );
                        })}

                        {/* Botão Personalizado de Cor */}
                        <label
                          className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/20 bg-zinc-800 hover:bg-zinc-700 cursor-pointer overflow-hidden transition-all hover:scale-110"
                          title="Personalizar Cor HEX"
                        >
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <Palette className="w-3.5 h-3.5 text-zinc-300" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] shadow-lg relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                    <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-amber-400">
                      <Sparkles className="w-3 h-3" /> Preview em Tempo Real
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      /{churchSlug || "sua-igreja"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md transition-colors"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Church className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {churchName || "Nome da Igreja Sede"}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          Pr. {masterName || "Líder Presidente"}
                        </p>
                      </div>
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow transition-all shrink-0 flex items-center gap-1"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span>Entrar</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                {/* Botão de Finalização */}
                <Button
                  type="submit"
                  disabled={isLoading || !emailIsValid}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando Master e Igreja...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Concluir Cadastro & Acessar</span>
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* ========================================================================= */}
            {/* TAB 2: CRIAR UMA FILIAL VINCULADA À MATRIZ                                */}
            {/* ========================================================================= */}
            <TabsContent value="branch" className="pt-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Estrutura Completa para Cada Filial</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  A matriz pode cadastrar quantas filiais desejar. Cada filial terá toda a estrutura completa do app Horeb: URL própria, células nos lares, dízimos via PIX, espaço kids com check-in seguro, pedidos de oração e paleta de cores exclusiva vinculada à Matriz.
                </p>
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-4">
                {/* Seleção de Sede */}
                <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.07] p-4 sm:p-5 space-y-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <Church className="w-3.5 h-3.5" />
                    <span>Hierarquia: Selecione a Igreja Sede (Matriz)</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Igreja Sede Responsável
                    </label>
                    <select
                      value={selectedParentId}
                      onChange={(e) => setSelectedParentId(e.target.value)}
                      className="w-full h-10 rounded-xl bg-zinc-950/80 border border-white/[0.08] text-xs sm:text-sm px-3 text-zinc-200 outline-none focus:ring-2 focus:ring-amber-500/40"
                    >
                      {existingTenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (/{t.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dados da Filial */}
                <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.07] p-4 sm:p-5 space-y-3.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Dados da Nova Congregação Filial</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">
                        Nome da Filial / Campus
                      </label>
                      <Input
                        required
                        value={branchName}
                        onChange={(e) => handleNameChange(e.target.value, true)}
                        placeholder="Ex: Videira - Campus Bairro Sul"
                        className="bg-zinc-950/80 border-white/[0.08] text-xs sm:text-sm h-10 rounded-xl focus-visible:ring-amber-500/40"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                        <span>Slug da URL da Filial</span>
                        <span className="text-[10px] text-zinc-400">Acesso direto</span>
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-zinc-950/80 border border-white/[0.08] focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20 rounded-xl overflow-hidden transition-all">
                        <div className="px-3 py-2 sm:py-2.5 bg-white/[0.03] border-b sm:border-b-0 sm:border-r border-white/[0.06] text-xs font-mono text-zinc-400 shrink-0 select-none flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-amber-400/80" />
                          <span>horeb.lynxems.com.br/</span>
                        </div>
                        <input
                          required
                          value={branchSlug}
                          onChange={(e) => setBranchSlug(e.target.value.toLowerCase())}
                          placeholder="videira-sul"
                          className="bg-transparent border-0 text-white font-bold font-mono text-xs sm:text-sm px-3 py-2 sm:py-2.5 outline-none flex-1 min-w-0"
                        />
                      </div>
                    </div>

                    {/* Seletor de Cores da Filial */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-300">
                          Cor Primária da Filial
                        </label>
                        <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                            style={{ backgroundColor: branchColor }}
                          />
                          {branchColor}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {colorPresets.map((c) => {
                          const isSelected = branchColor.toLowerCase() === c.hex.toLowerCase();
                          return (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setBranchColor(c.hex)}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${c.bg} flex items-center justify-center transition-all hover:scale-110 relative cursor-pointer ${
                                isSelected
                                  ? "ring-2 ring-white scale-110 shadow-lg shadow-white/20"
                                  : "opacity-80 hover:opacity-100 ring-1 ring-white/10"
                              }`}
                              title={c.label}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                            </button>
                          );
                        })}

                        <label
                          className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/20 bg-zinc-800 hover:bg-zinc-700 cursor-pointer overflow-hidden transition-all hover:scale-110"
                          title="Personalizar Cor HEX"
                        >
                          <input
                            type="color"
                            value={branchColor}
                            onChange={(e) => setBranchColor(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <Palette className="w-3.5 h-3.5 text-zinc-300" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Preview Card da Filial */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] shadow-lg relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
                    style={{ backgroundColor: branchColor }}
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                    <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-amber-400">
                      <Sparkles className="w-3 h-3" /> Filial Vinculada
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      /{branchSlug || "filial"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md transition-colors"
                        style={{ backgroundColor: branchColor }}
                      >
                        <GitBranch className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {branchName || "Nome da Nova Filial"}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          Sede: {selectedParentChurch?.name || "Matriz"}
                        </p>
                      </div>
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow transition-all shrink-0 flex items-center gap-1"
                      style={{ backgroundColor: branchColor }}
                    >
                      <span>Acessar</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || existingTenants.length === 0}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Vinculando Filial...</span>
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-4 h-4" />
                      <span>Criar Filial Vinculada à Sede</span>
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* ========================================================================= */}
            {/* TAB 3: LOGIN DE USUÁRIO JÁ CADASTRADO                                     */}
            {/* ========================================================================= */}
            <TabsContent value="login" className="pt-4 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.07] p-4 sm:p-5 space-y-3.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Acesso à Sua Conta de Liderança</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">
                        E-mail Cadastrado
                      </label>
                      <Input
                        required
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="pastor@igreja.org"
                        className="bg-zinc-950/80 border-white/[0.08] text-xs sm:text-sm h-10 rounded-xl focus-visible:ring-amber-500/40"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-300">
                        Senha de Acesso
                      </label>
                      <div className="relative">
                        <Input
                          required
                          type={showLoginPassword ? "text" : "password"}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-zinc-950/80 border-white/[0.08] text-xs sm:text-sm h-10 rounded-xl pr-10 tracking-widest focus-visible:ring-amber-500/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Entrar no Painel</span>
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de Confirmação do Código de 6 Dígitos */}
    <ActivationDialog
      isOpen={activationOpen}
      email={pendingEmail}
      onClose={() => setActivationOpen(false)}
      onSuccess={(redirectUrl) => {
        setActivationOpen(false);
        router.push(redirectUrl);
      }}
    />
  </>
  );
}
