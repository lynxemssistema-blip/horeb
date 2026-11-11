"use client";

import React, { useState, useEffect, useRef } from "react";
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
  requestPasswordReset,
  resetPasswordWithCode,
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
  ArrowLeft,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Trash2,
  Phone,
  MapPin,
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
  autoOpen?: boolean;
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
  autoOpen = false,
}: CreateChurchDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      setActiveTab(defaultTab);
    }
  }, [autoOpen, defaultTab]);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: string }>;
      setOpen(true);
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };
    window.addEventListener("horeb:open-create-church", handleOpen);
    return () => window.removeEventListener("horeb:open-create-church", handleOpen);
  }, []);

  // Tab 1: Master
  const [masterName, setMasterName] = useState("");
  const [masterEmail, setMasterEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [churchName, setChurchName] = useState("");
  const [churchSlug, setChurchSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#dc2626");
  const [churchLogo, setChurchLogo] = useState<string | null>(null);
  const [churchPhone, setChurchPhone] = useState("");
  const [churchAddress, setChurchAddress] = useState("");
  const masterLogoInputRef = useRef<HTMLInputElement>(null);

  // Validação de Código de Ativação
  const [activationOpen, setActivationOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Tab 2: Filial
  const [selectedParentId, setSelectedParentId] = useState(
    parentTenantId || existingTenants[0]?.id || ""
  );
  const [branchName, setBranchName] = useState("");
  const [branchSlug, setBranchSlug] = useState("");
  const [branchColor, setBranchColor] = useState("#2563eb");
  const [branchLogo, setBranchLogo] = useState<string | null>(null);
  const [branchPhone, setBranchPhone] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const branchLogoInputRef = useRef<HTMLInputElement>(null);

  // Tab 3: Login & Recuperação de Senha
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState<"none" | "request" | "verify">("none");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetTargetEmail, setResetTargetEmail] = useState("");
  const [resetMaskedEmail, setResetMaskedEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const emailIsValid = masterEmail.length === 0 || isValidEmail(masterEmail);

  // Upload Logo Base64
  const handleLogoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
      toast.success("Logo carregado para o banco de dados!");
    };
    reader.readAsDataURL(file);
  };

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
        logoUrl: churchLogo || undefined,
        pastorName: masterName,
        phone: churchPhone || undefined,
        address: churchAddress || undefined,
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
          toast.success(`Igreja "${res.tenant?.name}" cadastrada com sucesso!`, {
            description:
              "Atenção: Acesse Configurações da Igreja para informar a Chave PIX oficial e ativar as doações.",
            duration: 8000,
          });
          setOpen(false);
          window.location.href = res.redirectUrl;
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIdentifier = loginEmail?.trim();
    if (!cleanIdentifier) {
      toast.error("Informe seu e-mail ou nome cadastrado.");
      return;
    }

    if (!loginPassword) {
      toast.error("Informe sua senha de acesso.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginUser(cleanIdentifier, loginPassword.trim());
      if (res.success && res.redirectUrl) {
        toast.success(`Bem-vindo de volta, ${res.user?.name}!`, {
          description: "Login efetuado com sucesso.",
        });
        setOpen(false);
        window.location.href = res.redirectUrl;
      } else if ((res as any).requiresActivation) {
        toast.warning(res.error || "Sua conta precisa de ativação.");
        setPendingEmail(cleanIdentifier);
        setOpen(false);
        setActivationOpen(true);
      } else {
        toast.error(res.error || "E-mail/usuário ou senha incorretos.");
      }
    } catch {
      toast.error("Erro ao autenticar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = resetIdentifier?.trim();
    if (!cleanId) {
      toast.error("Informe seu e-mail ou nome de usuário cadastrado.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestPasswordReset(cleanId);
      if (res.success && res.email) {
        setResetTargetEmail(res.email);
        setResetMaskedEmail(res.maskedEmail || res.email);
        setForgotMode("verify");
        toast.success("Código de recuperação enviado!", {
          description: res.message,
        });
      } else {
        toast.error(res.error || "Conta não localizada.");
      }
    } catch {
      toast.error("Erro ao solicitar código de recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || resetCode.trim().length !== 6) {
      toast.error("Informe o código de 6 dígitos enviado para seu e-mail.");
      return;
    }

    if (!resetNewPassword || resetNewPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPasswordWithCode({
        email: resetTargetEmail,
        code: resetCode.trim(),
        newPassword: resetNewPassword,
      });

      if (res.success && res.redirectUrl) {
        toast.success("Senha redefinida com sucesso!", {
          description: `Bem-vindo de volta, ${res.user?.name}!`,
        });
        setOpen(false);
        setForgotMode("none");
        window.location.href = res.redirectUrl;
      } else {
        toast.error(res.error || "Código inválido ou expirado.");
      }
    } catch {
      toast.error("Erro ao redefinir a senha.");
    } finally {
      setIsLoading(false);
    }
  };

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
        logoUrl: branchLogo || undefined,
        phone: branchPhone || undefined,
        address: branchAddress || undefined,
      });

      if (res.success && res.redirectUrl) {
        toast.success(`Filial "${res.branch?.name}" vinculada com sucesso!`, {
          description:
            "Lembre-se de acessar Configurações da Igreja para cadastrar a Chave PIX e ativar as doações.",
          duration: 8000,
        });
        setOpen(false);
        window.location.href = res.redirectUrl;
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

        {/* Modal rigorosamente centralizado no meio da tela com viewport responsivo e scroll interno */}
        <DialogContent className="w-[94vw] max-w-lg max-h-[88dvh] flex flex-col p-0 overflow-hidden bg-card border border-border rounded-3xl shadow-2xl text-card-foreground">
          {/* Glow de Iluminação */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/15 blur-3xl rounded-full" />

          {/* Cabeçalho Fixo */}
          <div className="p-5 sm:p-6 pb-2 shrink-0 border-b border-border relative z-10 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[10px] font-bold tracking-wider uppercase w-fit">
              <ShieldCheck className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Portal Multi-Tenant • Lynx EMS Sistemas</span>
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Portal da Liderança
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Cadastre sua congregação sede, vincule filiais ou acesse seu painel.
              </DialogDescription>
            </div>
          </div>

          {/* Abas e Conteúdo com Scroll Interno Garantido */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0 relative z-10"
          >
            {/* Seletor Segmentado de Abas Fixo */}
            <div className="px-5 sm:px-6 pt-3 shrink-0">
              <TabsList className="grid grid-cols-3 w-full h-10 bg-muted/80 border border-border p-1 rounded-xl gap-1">
                <TabsTrigger
                  value="master"
                  className="text-xs font-bold text-muted-foreground hover:text-foreground data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-md rounded-lg transition-all py-1"
                >
                  <Church className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  <span>1. Matriz</span>
                </TabsTrigger>
                <TabsTrigger
                  value="branch"
                  className="text-xs font-bold text-muted-foreground hover:text-foreground data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-md rounded-lg transition-all py-1"
                >
                  <GitBranch className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  <span>2. Filial</span>
                </TabsTrigger>
                <TabsTrigger
                  value="login"
                  className="text-xs font-bold text-muted-foreground hover:text-foreground data-active:!bg-gradient-to-r data-active:!from-amber-500 data-active:!to-yellow-500 data-active:!text-black data-active:!shadow-md rounded-lg transition-all py-1"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                  <span>Entrar</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: MATRIZ */}
            <TabsContent
              value="master"
              className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 touch-pan-y overscroll-contain"
            >
              {/* Banner de 30 Dias Grátis com Plano Gestão Automático */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-amber-500/10 to-emerald-500/5 border border-emerald-500/30 text-foreground space-y-1 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    ⭐ 30 Dias 100% Gratuitos
                  </span>
                  <span className="text-[11px] font-bold text-amber-400">
                    Plano Horeb Prime Incluso
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
                  Cadastre sua congregação sem precisar escolher plano ou informar dados de cobrança. Você terá acesso completo imediato a todos os recursos do <strong>Plano Horeb Prime</strong> (Multisede, Gestão Completa, EBD, Kids Check-in, Financeiro e Suporte VIP) sem custo nos primeiros 30 dias.
                </p>
              </div>

              <form onSubmit={handleRegisterMaster} className="space-y-4">
                {/* 1. Credenciais Master */}
                <div className="rounded-2xl bg-muted/30 border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-500">
                    <User className="w-3.5 h-3.5" />
                    <span>1. Credenciais do Pr. Presidente</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Nome do Pr. Presidente / Líder *
                      </label>
                      <Input
                        required
                        value={masterName}
                        onChange={(e) => setMasterName(e.target.value)}
                        placeholder="Ex: Pr. Carlos Eduardo"
                        className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-amber-500" />
                          <span>E-mail Oficial (Login Master) *</span>
                        </label>
                        {masterEmail && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              isValidEmail(masterEmail)
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            }`}
                          >
                            {isValidEmail(masterEmail) ? "✓ Válido" : "✗ Incorreto"}
                          </span>
                        )}
                      </div>
                      <Input
                        required
                        type="email"
                        value={masterEmail}
                        onChange={(e) => setMasterEmail(e.target.value)}
                        placeholder="pastor@igreja.org"
                        className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>Senha de Acesso (mínimo 6 dígitos) *</span>
                      </label>
                      <div className="relative">
                        <Input
                          required
                          type={showPassword ? "text" : "password"}
                          value={masterPassword}
                          onChange={(e) => setMasterPassword(e.target.value)}
                          placeholder="••••••••"
                          minLength={6}
                          className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl pr-10 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Dados da Igreja Sede */}
                <div className="rounded-2xl bg-muted/30 border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-500">
                    <Church className="w-3.5 h-3.5" />
                    <span>2. Identidade & Logo da Igreja Sede</span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Upload do Logo em Base64 - Sem Links Externos */}
                    <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-2">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ImageIcon className="w-3 h-3 text-amber-500" />
                          Logo da Igreja (Salvo no Banco de Dados)
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">Max 2MB</span>
                      </label>

                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
                          {churchLogo ? (
                            <img src={churchLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                          ) : (
                            <Church className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          <input
                            ref={masterLogoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLogoUpload(e, setChurchLogo)}
                            className="hidden"
                            id="master-logo-file"
                          />
                          <label
                            htmlFor="master-logo-file"
                            className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border cursor-pointer flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3 text-amber-500" />
                            <span>{churchLogo ? "Alterar Logo" : "Upload Logo"}</span>
                          </label>

                          {churchLogo && (
                            <button
                              type="button"
                              onClick={() => {
                                setChurchLogo(null);
                                if (masterLogoInputRef.current) masterLogoInputRef.current.value = "";
                              }}
                              className="px-2 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs hover:bg-red-500/20 cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remover</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Nome Oficial da Igreja Sede *
                      </label>
                      <Input
                        required
                        value={churchName}
                        onChange={(e) => handleNameChange(e.target.value, false)}
                        placeholder="Ex: Igreja Videira Central"
                        className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Endereço Web Exclusivo (Slug)
                      </label>
                      <div className="flex items-center bg-muted/70 border border-border rounded-xl overflow-hidden px-2.5 h-9">
                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">horeb.lynxems.com.br/</span>
                        <input
                          required
                          value={churchSlug}
                          onChange={(e) => setChurchSlug(e.target.value.toLowerCase())}
                          placeholder="videira-central"
                          className="bg-transparent border-0 text-foreground font-mono text-xs px-1 outline-none flex-1 min-w-0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3 text-amber-500" />
                          <span>WhatsApp</span>
                        </label>
                        <Input
                          value={churchPhone}
                          onChange={(e) => setChurchPhone(e.target.value)}
                          placeholder="(11) 98765-4321"
                          className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-500" />
                          <span>Endereço</span>
                        </label>
                        <Input
                          value={churchAddress}
                          onChange={(e) => setChurchAddress(e.target.value)}
                          placeholder="Bairro / Cidade"
                          className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl font-medium"
                        />
                      </div>
                    </div>

                    {/* Cores */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span>Cor Primária White-Label</span>
                        <span className="font-mono text-[10px] text-muted-foreground font-semibold">{primaryColor}</span>
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {colorPresets.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setPrimaryColor(c.hex)}
                            className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-all cursor-pointer ${
                              primaryColor.toLowerCase() === c.hex.toLowerCase()
                                ? "ring-2 ring-primary scale-110 shadow-md"
                                : "opacity-80 hover:opacity-100"
                            }`}
                          >
                            {primaryColor.toLowerCase() === c.hex.toLowerCase() && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aviso Obrigatório sobre Ativação do PIX da Igreja (Não passa pelo Asaas) */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/35 text-xs space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-400 font-black uppercase tracking-wider text-[11px]">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Importante: Doações via PIX nascem Desativadas</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Para segurança da congregação, o recebimento de <strong>Dízimos e Ofertas via PIX</strong> inicia <strong>desativado</strong>. Assim que concluir o cadastro, acesse <strong>Configurações da Igreja</strong> como Usuário Master para informar a <strong>Chave PIX oficial da igreja</strong> e ativar as doações.
                  </p>
                  <p className="text-[10.5px] font-bold text-emerald-400">
                    ✓ As doações via PIX dos membros caem 100% direto na conta bancária da igreja (não passam pelo Asaas e não possuem taxas).
                  </p>
                </div>

                {/* Botão de Conclusão */}
                <Button
                  type="submit"
                  disabled={isLoading || !emailIsValid}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg gap-2 cursor-pointer sticky bottom-0 z-20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ativando 30 Dias Grátis...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Ativar 30 Dias Grátis no Plano Gestão</span>
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* TAB 2: FILIAL */}
            <TabsContent
              value="branch"
              className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 touch-pan-y overscroll-contain"
            >
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-foreground font-medium">
                <span className="font-bold text-amber-500 block mb-0.5">Estrutura Completa de Filial</span>
                Cada congregação filial tem sua própria URL, células nos lares, dízimos via PIX, espaço kids e ministérios independentes vinculados à Sede Matriz.
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-4">
                <div className="rounded-2xl bg-muted/30 border border-border p-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      Igreja Sede Responsável (Matriz) *
                    </label>
                    <select
                      value={selectedParentId}
                      onChange={(e) => setSelectedParentId(e.target.value)}
                      className="w-full h-9 rounded-xl bg-muted/70 border border-border text-xs px-3 text-foreground font-medium outline-none focus:border-primary"
                    >
                      {existingTenants.map((t) => (
                        <option key={t.id} value={t.id} className="bg-card text-foreground">
                          {t.name} (/{t.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Upload do Logo da Filial */}
                  <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-2">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3 text-amber-500" />
                        Logo da Filial (Opcional - usa o da Matriz por padrão)
                      </span>
                    </label>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
                        {branchLogo ? (
                          <img src={branchLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                          <GitBranch className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      <input
                        ref={branchLogoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, setBranchLogo)}
                        className="hidden"
                        id="branch-logo-file"
                      />
                      <label
                        htmlFor="branch-logo-file"
                        className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3 text-amber-500" />
                        <span>Upload Logo Filial</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      Nome da Congregação Filial / Campus *
                    </label>
                    <Input
                      required
                      value={branchName}
                      onChange={(e) => handleNameChange(e.target.value, true)}
                      placeholder="Ex: Videira - Campus Sul"
                      className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      Slug da URL da Filial *
                    </label>
                    <div className="flex items-center bg-muted/70 border border-border rounded-xl overflow-hidden px-2.5 h-9">
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">horeb.lynxems.com.br/</span>
                      <input
                        required
                        value={branchSlug}
                        onChange={(e) => setBranchSlug(e.target.value.toLowerCase())}
                        placeholder="videira-sul"
                        className="bg-transparent border-0 text-foreground font-mono text-xs px-1 outline-none flex-1 min-w-0"
                      />
                    </div>
                  </div>

                  {/* Cores da Filial */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Cor Primária da Filial</span>
                      <span className="font-mono text-[10px] text-muted-foreground font-semibold">{branchColor}</span>
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {colorPresets.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setBranchColor(c.hex)}
                          className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-all cursor-pointer ${
                            branchColor.toLowerCase() === c.hex.toLowerCase()
                              ? "ring-2 ring-primary scale-110 shadow-md"
                              : "opacity-80 hover:opacity-100"
                          }`}
                        >
                          {branchColor.toLowerCase() === c.hex.toLowerCase() && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Aviso Obrigatório sobre Ativação do PIX da Filial */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/35 text-xs space-y-1 shadow-sm">
                  <div className="flex items-center gap-1.5 text-amber-400 font-black uppercase tracking-wider text-[10.5px]">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Atenção: PIX da Filial inicia Desativado</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Após criar a filial, acesse <strong>Configurações da Igreja</strong> para cadastrar a <strong>Chave PIX oficial</strong> e liberar os Dízimos e Ofertas (recebimento 100% direto no banco da igreja, sem passar pelo Asaas).
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || existingTenants.length === 0}
                  className="w-full h-11 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg gap-2 cursor-pointer sticky bottom-0 z-20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Criando Filial...</span>
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

            {/* TAB 3: LOGIN & RECUPERAÇÃO DE SENHA */}
            <TabsContent
              value="login"
              className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 touch-pan-y overscroll-contain"
            >
              {forgotMode === "none" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="rounded-2xl bg-muted/30 border border-border p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Acesso à Sua Conta</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">
                          E-mail ou Nome de Usuário Cadastrado
                        </label>
                        <Input
                          required
                          type="text"
                          autoComplete="username"
                          autoCapitalize="none"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="pastor@igreja.org ou Pr. Luan Demattos"
                          className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-foreground">
                            Senha de Acesso
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setResetIdentifier(loginEmail);
                              setForgotMode("request");
                            }}
                            className="text-[11px] font-bold text-amber-500 hover:text-amber-400 underline underline-offset-2 cursor-pointer transition-colors"
                          >
                            Esqueceu a senha?
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            required
                            type={showLoginPassword ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl pr-10 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg gap-2 cursor-pointer sticky bottom-0 z-20"
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
              )}

              {forgotMode === "request" && (
                <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                  <div className="rounded-2xl bg-muted/30 border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Recuperar Senha de Acesso</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForgotMode("none")}
                        className="text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span>Voltar ao login</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Informe seu <strong>e-mail</strong> ou <strong>nome cadastrado</strong>. Enviaremos um código de segurança de 6 dígitos para o seu e-mail para criar uma nova senha.
                    </p>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        E-mail ou Nome de Usuário Cadastrado *
                      </label>
                      <Input
                        required
                        type="text"
                        autoFocus
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        placeholder="pastor@igreja.org ou Pr. Marcos"
                        className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando Código...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Enviar Código de Recuperação</span>
                      </>
                    )}
                  </Button>
                </form>
              )}

              {forgotMode === "verify" && (
                <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
                  <div className="rounded-2xl bg-muted/30 border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Definir Nova Senha</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForgotMode("request")}
                        className="text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span>Trocar e-mail</span>
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-muted-foreground">
                      Código enviado para <strong className="text-amber-400 font-mono">{resetMaskedEmail}</strong>
                    </div>

                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">
                          Código de 6 Dígitos Recebido no E-mail *
                        </label>
                        <Input
                          required
                          type="text"
                          maxLength={6}
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="000000"
                          className="bg-muted/70 border border-amber-500/40 text-amber-400 text-center font-mono text-lg font-black tracking-[8px] h-10 rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">
                          Nova Senha (mínimo 6 caracteres) *
                        </label>
                        <div className="relative">
                          <Input
                            required
                            minLength={6}
                            type={showResetPassword ? "text" : "password"}
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl pr-10 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPassword(!showResetPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">
                          Confirmar Nova Senha *
                        </label>
                        <Input
                          required
                          minLength={6}
                          type={showResetPassword ? "text" : "password"}
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-muted/70 border border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary text-xs h-9 rounded-xl font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="submit"
                      disabled={isLoading || resetCode.length !== 6}
                      className="w-full h-11 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Salvando Nova Senha...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Confirmar Nova Senha e Entrar</span>
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleRequestPasswordReset}
                      className="text-[11px] font-bold text-amber-500 hover:text-amber-400 flex items-center justify-center gap-1 py-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reenviar código por e-mail</span>
                    </button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
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
