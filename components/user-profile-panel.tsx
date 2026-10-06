"use client";

import React, { useState, useTransition, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Building2,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Sparkles,
  ArrowRight,
  LogOut,
  Crown,
  Heart,
  Calendar,
  Layers,
  FileText,
  Palette,
  Sun,
  Moon,
  Laptop,
  MoonStar,
  Coffee,
  Waves,
  CreditCard,
  FileSpreadsheet,
} from "lucide-react";
import { useTheme, THEME_PRESETS } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MemberDigitalCard } from "@/components/member-digital-card";
import { AnnualTaxStatementModal } from "@/components/annual-tax-statement-modal";
import {
  updateUserProfile,
  updateUserPassword,
  updateUserAvatar,
} from "@/app/actions/profile";
import { logoutUser } from "@/app/actions/tenant";
import { cn } from "@/lib/utils";

interface UserProfilePanelProps {
  slug: string;
  initialUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
    cpf?: string | null;
    phone?: string | null;
    title?: string | null;
    bio?: string | null;
    isEmailVerified?: boolean;
    createdAt?: Date | string;
    tenant?: {
      id: string;
      name: string;
      slug: string;
      primaryColor?: string;
      logoUrl?: string | null;
      parentId?: string | null;
    } | null;
    churchAccesses?: Array<{
      tenant: {
        id: string;
        name: string;
        slug: string;
        primaryColor?: string;
      };
      role: string;
    }>;
    counts?: {
      ledCells?: number;
      ledMinistries?: number;
      transactions?: number;
      prayerRequests?: number;
    };
  };
}

// Avatares predefinidos com temas elegantes e cristãos
const PRESET_AVATARS = [
  { id: "pr1", name: "Pastor", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face" },
  { id: "pr2", name: "Líder", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" },
  { id: "pr3", name: "Serva", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face" },
  { id: "pr4", name: "Jovem", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face" },
  { id: "pr5", name: "Família", url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=face" },
];

export function UserProfilePanel({ slug, initialUser }: UserProfilePanelProps) {
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState("data");
  const [isPending, startTransition] = useTransition();
  const { mode, palette, activePresetId, applyPreset, setTheme, resolvedTheme } = useTheme();

  // Estados dos Dados Pessoais
  const [name, setName] = useState(initialUser?.name || "");
  const [email, setEmail] = useState(initialUser?.email || "");
  const [phone, setPhone] = useState(initialUser?.phone || "");
  const [cpf, setCpf] = useState(initialUser?.cpf || "");
  const [title, setTitle] = useState(initialUser?.title || "");
  const [bio, setBio] = useState(initialUser?.bio || "");

  // Estados de Senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Estados de Foto de Perfil
  const [avatarUrl, setAvatarUrl] = useState(initialUser?.avatarUrl || "");
  const [customUrlInput, setCustomUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Carteirinha e IRPF
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

  // Manipular upload local e compressão em Canvas (compatível com Safari e Mobile)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("A imagem selecionada é muito pesada (máximo 8MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Redimensionar e comprimir para 400x400 max em JPEG 85%
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          handleSaveAvatar(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Salvar foto de perfil
  const handleSaveAvatar = (newUrl: string | null) => {
    startTransition(async () => {
      const res = await updateUserAvatar(newUrl);
      if (res.success) {
        setAvatarUrl(res.avatarUrl || "");
        setUser((prev) => ({ ...prev, avatarUrl: res.avatarUrl }));
        toast.success(res.message);
      } else {
        toast.error(res.error);
      }
    });
  };

  // Salvar Dados Pessoais
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateUserProfile({
        name,
        email,
        phone,
        cpf,
        title,
        bio,
      });

      if (res.success) {
        setUser((prev) => ({
          ...prev,
          name: res.user?.name || name,
          email: res.user?.email || email,
          phone: res.user?.phone,
          cpf: res.user?.cpf,
          title: res.user?.title,
          bio: res.user?.bio,
        }));
        toast.success(res.message);
      } else {
        toast.error(res.error);
      }
    });
  };

  // Salvar Nova Senha
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("A confirmação da nova senha não confere.");
      return;
    }

    startTransition(async () => {
      const res = await updateUserPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        toast.success(res.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header do Perfil com Avatar e Identificação */}
      <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/80 to-zinc-950 border border-white/[0.08] p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Ambient halo glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          {/* Avatar com ação de troca rápida */}
          <div className="relative group shrink-0">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-amber-500/30 shadow-xl bg-black/40">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} className="object-cover" />}
              <AvatarFallback className="text-2xl font-black bg-gradient-to-br from-amber-500 to-yellow-500 text-black">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <button
              type="button"
              onClick={() => {
                setActiveTab("avatar");
                fileInputRef.current?.click();
              }}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center shadow-lg border-2 border-zinc-900 transition-transform group-hover:scale-110 cursor-pointer"
              title="Trocar Foto de Perfil"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {user.name}
              </h1>

              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {user.role === "SUPERADMIN"
                  ? "SUPER ADMIN"
                  : user.role === "ADMIN"
                  ? "ADMINISTRADOR MASTER"
                  : user.role === "PASTOR"
                  ? "PASTOR"
                  : user.role === "LEADER"
                  ? "LÍDER"
                  : "MEMBRO"}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-400 flex items-center justify-center sm:justify-start gap-2">
              <Mail className="w-3.5 h-3.5 text-zinc-500" />
              <span>{user.email}</span>
            </p>

            {user.tenant && (
              <p className="text-xs text-zinc-400 flex items-center justify-center sm:justify-start gap-2 font-mono">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {user.tenant.name} (/{user.tenant.slug})
                </span>
              </p>
            )}

            {user.bio && (
              <p className="text-xs text-zinc-300 italic pt-1 max-w-xl line-clamp-2">
                &ldquo;{user.bio}&rdquo;
              </p>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="shrink-0 pt-2 sm:pt-0 flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCardOpen(true)}
              className="h-9 px-3.5 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-300 gap-1.5 cursor-pointer shadow-sm"
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Carteirinha Digital</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTaxModalOpen(true)}
              className="h-9 px-3.5 rounded-xl border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-300 gap-1.5 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Informe IRPF</span>
            </Button>

            <Link href={`/${slug}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/10 text-xs font-bold text-zinc-200 gap-1.5 cursor-pointer"
              >
                <span>Voltar ao App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>

            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                await logoutUser();
                window.location.href = "/";
              }}
              className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 cursor-pointer bg-rose-600/80 hover:bg-rose-600 text-white"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da Conta (Logout)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs de Configuração do Painel do Usuário */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto sm:h-12 rounded-2xl bg-zinc-900/90 border border-white/[0.08] p-1 gap-1">
          <TabsTrigger
            value="data"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all gap-1.5 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" />
            <span>Meus Dados</span>
          </TabsTrigger>

          <TabsTrigger
            value="password"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Trocar Senha</span>
          </TabsTrigger>

          <TabsTrigger
            value="avatar"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all gap-1.5 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Foto de Perfil</span>
          </TabsTrigger>

          <TabsTrigger
            value="theme"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all gap-1.5 cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Aparência</span>
          </TabsTrigger>

          <TabsTrigger
            value="churches"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all gap-1.5 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Congregações</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA 1: MEUS DADOS PESSOAIS & MINISTERIAIS                                  */}
        {/* ========================================================================= */}
        <TabsContent value="data">
          <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <User className="w-5 h-5 text-amber-400" />
                <span>Informações Pessoais & Contato</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Mantenha suas informações cadastrais atualizadas para comunicação e secretaria da igreja.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-300">Nome Completo</Label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo"
                      required
                      className="bg-zinc-900/90 border-white/10 rounded-xl text-xs text-white focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-300">E-mail de Login</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      required
                      className="bg-zinc-900/90 border-white/10 rounded-xl text-xs text-white focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-300">Telefone / WhatsApp</Label>
                    <Input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="bg-zinc-900/90 border-white/10 rounded-xl text-xs text-white focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-300">CPF (Opcional - Relatórios)</Label>
                    <Input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="bg-zinc-900/90 border-white/10 rounded-xl text-xs text-white focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold text-zinc-300">Cargo / Função Ministerial</Label>
                    <Input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Pastor Titular, Líder de Jovens, Diácono, Membro"
                      className="bg-zinc-900/90 border-white/10 rounded-xl text-xs text-white focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold text-zinc-300">Biografia / Testemunho Breve</Label>
                    <Textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Conte um pouco sobre sua trajetória ministerial ou versículo favorito..."
                      className="bg-zinc-900/90 border-white/10 rounded-xl text-xs text-white focus:border-amber-400 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="h-10 px-6 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-black gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isPending ? "Salvando..." : "Salvar Alterações"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: SEGURANÇA & ALTERAÇÃO DE SENHA                                     */}
        {/* ========================================================================= */}
        <TabsContent value="password">
          <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <span>Alteração de Senha de Acesso</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Escolha uma senha forte com no mínimo 6 dígitos para proteger sua conta e ministério.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSavePassword} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-300">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                      className="bg-zinc-900/90 border-white/10 rounded-xl text-xs text-white pr-10 focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-300">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      required
                      className="bg-zinc-900/90 border-white/10 rounded-xl text-xs text-white pr-10 focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-300">Confirmar Nova Senha</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    className="bg-zinc-900/90 border-white/10 rounded-xl text-xs text-white focus:border-amber-400"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="h-10 px-6 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-black gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isPending ? "Atualizando Senha..." : "Atualizar Senha"}</span>
                  </Button>
                </div>

                {/* Zona de Segurança: Logoff Imediato */}
                <div className="mt-6 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Encerrar Sessão (Logoff)</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Encerra seu acesso ativo com segurança neste dispositivo a qualquer momento.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      await logoutUser();
                      window.location.href = "/";
                    }}
                    className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 cursor-pointer bg-rose-600/80 hover:bg-rose-600 text-white shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair Agora</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: FOTO DE PERFIL & AVATARES                                          */}
        {/* ========================================================================= */}
        <TabsContent value="avatar">
          <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <span>Foto de Perfil & Identificação Visual</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Envie uma foto do seu dispositivo, use uma imagem da web ou selecione um avatar predefinido.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Seletor de Foto do Dispositivo */}
              <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex flex-col sm:flex-row items-center gap-6">
                <div className="relative shrink-0">
                  <Avatar className="h-24 w-24 ring-4 ring-amber-500/40 shadow-xl bg-black">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name} className="object-cover" />}
                    <AvatarFallback className="text-2xl font-black bg-amber-500 text-black">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="space-y-3 text-center sm:text-left flex-1">
                  <div>
                    <h4 className="text-sm font-bold text-white">Carregar Foto do Aparelho</h4>
                    <p className="text-xs text-zinc-400">
                      Formatos aceitos: JPG, PNG ou WebP. A foto é ajustada automaticamente.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-black gap-2 shadow-sm cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Escolher Foto do Celular / PC</span>
                    </Button>

                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => handleSaveAvatar(null)}
                        className="h-9 px-3 rounded-xl font-bold text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover Foto</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Inserir URL Direta */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-300">Ou informe a URL de uma Imagem</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    className="bg-zinc-900/90 border-white/10 rounded-xl text-xs text-white focus:border-amber-400"
                  />
                  <Button
                    type="button"
                    disabled={isPending || !customUrlInput.trim()}
                    onClick={() => {
                      handleSaveAvatar(customUrlInput.trim());
                      setCustomUrlInput("");
                    }}
                    className="h-10 px-4 rounded-xl font-bold text-xs bg-white/[0.08] hover:bg-white/[0.15] text-white shrink-0 cursor-pointer"
                  >
                    <span>Salvar URL</span>
                  </Button>
                </div>
              </div>

              {/* Avatares Pré-definidos */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-bold text-zinc-300">Avatares Sugeridos</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSaveAvatar(preset.url)}
                        className={cn(
                          "p-3 rounded-2xl border transition-all text-center flex flex-col items-center gap-2 group cursor-pointer",
                          isSelected
                            ? "bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/20"
                            : "bg-zinc-900/50 border-white/[0.08] hover:border-amber-500/40 hover:bg-zinc-800/80"
                        )}
                      >
                        <Avatar className="h-14 w-14 ring-2 ring-white/10 group-hover:ring-amber-400 transition-all">
                          <AvatarImage src={preset.url} alt={preset.name} className="object-cover" />
                          <AvatarFallback>{preset.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] font-bold text-zinc-300 group-hover:text-amber-400 transition-colors">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 4: CONGREGAÇÕES VINCULADAS AO USUÁRIO                                 */}
        {/* ========================================================================= */}
        <TabsContent value="churches">
          <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>Congregações Vinculadas & Acessos</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Você pode alternar sua congregação ativa a qualquer momento com sua mesma conta e senha.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Congregação Base Principal */}
              {user.tenant && (
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-amber-500/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: user.tenant.primaryColor || "#f59e0b" }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm truncate">
                          {user.tenant.name}
                        </h4>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Sua Igreja Principal
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">/{user.tenant.slug}</p>
                    </div>
                  </div>

                  <Link href={`/${user.tenant.slug}`}>
                    <Button
                      size="sm"
                      className="h-8 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black gap-1.5 cursor-pointer shadow-sm shrink-0"
                    >
                      <span>Acessar</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              )}

              {/* Outros Acessos Multi-Igreja */}
              {user.churchAccesses && user.churchAccesses.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Outras Congregações com Acesso Autorizado ({user.churchAccesses.length})
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {user.churchAccesses.map((acc) => (
                      <div
                        key={acc.tenant.id}
                        className="p-3.5 rounded-2xl bg-zinc-900/50 border border-white/[0.08] hover:border-amber-500/30 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate">
                            {acc.tenant.name}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-mono">
                            /{acc.tenant.slug} • Perfil: {acc.role}
                          </p>
                        </div>

                        <Link href={`/${acc.tenant.slug}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 rounded-lg text-xs font-bold border-white/10 hover:bg-white/10 text-zinc-200 gap-1 cursor-pointer shrink-0"
                          >
                            <span>Entrar</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão de Ir para o Seletor Geral */}
              <div className="pt-2 text-center">
                <Link href="/select-church">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 gap-1.5"
                  >
                    <span>Ver Painel Completo de Congregações</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 5: APARÊNCIA & TEMA DO APLICATIVO                                     */}
        {/* ========================================================================= */}
        <TabsContent value="theme" className="space-y-6">
          <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                    <Palette className="w-5 h-5 text-amber-400" />
                    <span>Aparência & Tema de Cores</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    Personalize o modo e a cor de fundo do aplicativo de acordo com a sua preferência. A configuração é salva na sua conta e aplicada em qualquer dispositivo.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-bold text-zinc-300 w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Ativo:{" "}
                    <strong className="text-white">
                      {THEME_PRESETS.find((p) => p.id === activePresetId)?.name || "Padrão"}
                    </strong>
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 1. SELEÇÃO DE MODO RÁPIDO */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  Modo de Iluminação Principal
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTheme("system", "default");
                      toast.success("Modo Sistema ativado! Seguirá o padrão do seu aparelho.");
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      mode === "system"
                        ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10"
                        : "bg-zinc-900/40 border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                        <Laptop className="w-5 h-5" />
                      </div>
                      {mode === "system" && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                          Ativo
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Automático (Sistema)</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Altera entre Claro e Escuro conforme a configuração do seu sistema.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTheme("light", palette === "cream" ? "cream" : "default");
                      toast.success("Modo Claro ativado!");
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      mode === "light"
                        ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10"
                        : "bg-zinc-900/40 border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <Sun className="w-5 h-5" />
                      </div>
                      {mode === "light" && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                          Ativo
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Modo Claro</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Fundo claro iluminado com textos escuros para leitura durante o dia.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTheme("dark", palette === "cream" ? "default" : palette);
                      toast.success("Modo Escuro ativado!");
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      mode === "dark"
                        ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10"
                        : "bg-zinc-900/40 border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <Moon className="w-5 h-5" />
                      </div>
                      {mode === "dark" && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                          Ativo
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Modo Escuro</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Tons escuros elegantes que descansam a visão e economizam bateria.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. PALETAS PRÉ-DEFINIDAS DE COR DE FUNDO */}
              <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                <div>
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                    Paletas Pré-definidas de Superfície & Fundo
                  </label>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Selecione uma tonalidade de fundo com harmonia calibrada para o aplicativo:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {THEME_PRESETS.map((preset) => {
                    const isCurrent = activePresetId === preset.id;

                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          applyPreset(preset.id);
                          toast.success(`Tema "${preset.name}" ativado com sucesso!`);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between gap-3 ${
                          isCurrent
                            ? "border-amber-500 bg-amber-500/[0.06] shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/30"
                            : "bg-zinc-900/30 border-white/[0.08] hover:border-white/25 hover:bg-zinc-900/60"
                        }`}
                      >
                        {/* Header do Card com Prévia de Cores */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* Prévia da paleta */}
                            <div
                              className="w-7 h-7 rounded-xl border border-white/20 shadow-md flex items-center justify-center shrink-0"
                              style={{ background: preset.bgPreview }}
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: preset.textPreview }}
                              />
                            </div>
                            <span className="font-bold text-sm text-white">{preset.name}</span>
                          </div>

                          {preset.badge && (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/10">
                              {preset.badge}
                            </span>
                          )}
                        </div>

                        {/* Descrição */}
                        <p className="text-xs text-zinc-400 leading-relaxed min-h-[32px]">
                          {preset.description}
                        </p>

                        {/* Botão de Status / Ação */}
                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-zinc-500">
                            {preset.category === "system" ? "Adaptativo" : preset.category === "light" ? "Modo Claro" : "Modo Escuro"}
                          </span>

                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-amber-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Em Uso</span>
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors">
                              Usar Este &rarr;
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Modal da Carteirinha Digital */}
      <Dialog open={isCardOpen} onOpenChange={setIsCardOpen}>
        <DialogContent className="max-w-md p-6 bg-zinc-950/95 border-white/10 rounded-3xl backdrop-blur-xl">
          <DialogHeader className="pb-2 text-center sm:text-left">
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <span>Carteirinha Digital Oficial</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Sua credencial eclesiástica oficial com QR Code de verificação em tempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <MemberDigitalCard
              user={{
                id: user.id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                role: user.role,
                cpf: user.cpf,
                pastoralTitle: user.title,
                createdAt: user.createdAt || new Date(),
                tenant: {
                  name: user.tenant?.name || "Horeb Igreja",
                  slug: user.tenant?.slug || slug,
                  logoUrl: user.tenant?.logoUrl,
                  primaryColor: user.tenant?.primaryColor || "#f59e0b",
                  pastorName: "Liderança Eclesial",
                },
              }}
              credentialCode={`MEM-${user.id.slice(-6).toUpperCase()}`}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal do Informe de Rendimentos / Dízimos para IRPF */}
      <AnnualTaxStatementModal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        slug={slug}
        memberId={user.id}
        memberName={user.name}
      />
    </div>
  );
}
