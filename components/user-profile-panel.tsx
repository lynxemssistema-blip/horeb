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
  Crown,
  Heart,
  Calendar,
  Layers,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  updateUserProfile,
  updateUserPassword,
  updateUserAvatar,
} from "@/app/actions/profile";
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

          {/* Botão de Atalho Rápido para a Igreja */}
          <div className="shrink-0 pt-2 sm:pt-0">
            <Link href={`/${slug}`}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/10 text-xs font-bold text-zinc-200 gap-1.5"
              >
                <span>Voltar ao App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs de Configuração do Painel do Usuário */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-12 rounded-2xl bg-zinc-900/90 border border-white/[0.08] p-1">
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
      </Tabs>
    </div>
  );
}
