"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Church,
  Palette,
  Check,
  Building2,
  PlusCircle,
  Sparkles,
  ExternalLink,
  Save,
  Globe,
  Loader2,
  Crown,
  CreditCard,
  ShieldCheck,
  Layers,
  Upload,
  Image as ImageIcon,
  Trash2,
  Phone,
  MapPin,
  User,
  QrCode,
  Coins,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateChurchSettings } from "@/app/actions/members";
import { logoutUser } from "@/app/actions/tenant";
import { CreateChurchDialog } from "@/components/create-church-dialog";

interface ChurchSettingsProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
    logoUrl?: string | null;
    pastorName?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pixKey?: string | null;
    pixKeyType?: string | null;
    pixPresetValues?: string | null;
    plan: string;
    status: string;
    isMatriz: boolean;
    parent?: { id: string; name: string; slug: string } | null;
    branches: { id: string; name: string; slug: string; primaryColor: string }[];
  };
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

export function ChurchSettingsForm({ tenant }: ChurchSettingsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState(tenant.name);
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor);
  const [logoUrl, setLogoUrl] = useState<string | null>(tenant.logoUrl || null);
  const [pastorName, setPastorName] = useState(tenant.pastorName || "");
  const [phone, setPhone] = useState(tenant.phone || "");
  const [address, setAddress] = useState(tenant.address || "");
  const [city, setCity] = useState(tenant.city || "");
  const [state, setState] = useState(tenant.state || "");

  // PIX Settings
  const [pixKey, setPixKey] = useState(tenant.pixKey || "");
  const [pixKeyType, setPixKeyType] = useState(tenant.pixKeyType || "CNPJ");
  const [pixPresetValues, setPixPresetValues] = useState(
    tenant.pixPresetValues || "30,50,100,200,500"
  );

  const [saving, setSaving] = useState(false);

  // Logo file upload -> Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB para otimização rápida.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setLogoUrl(base64);
      toast.success("Logo carregado! Clique em 'Salvar Alterações' para gravar no banco de dados.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Logo removido. Clique em 'Salvar' para confirmar.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome da igreja é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const res = await updateChurchSettings({
        tenantId: tenant.id,
        name,
        primaryColor,
        logoUrl: logoUrl,
        pastorName,
        phone,
        address,
        city,
        state,
        pixKey,
        pixKeyType,
        pixPresetValues,
      });

      if (res.success) {
        toast.success("Dados da igreja e logo salvos com sucesso no banco de dados!");
        router.refresh();
      } else {
        toast.error(res.error || "Falha ao salvar alterações.");
      }
    } catch {
      toast.error("Erro inesperado no servidor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner de Identidade Visual */}
      <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1.5 transition-all"
          style={{ backgroundColor: primaryColor }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/10">
              {tenant.isMatriz ? "Igreja Sede (Matriz)" : "Congregação Filial"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Configurações da Igreja
            </h1>
            <p className="text-xs text-zinc-400">
              Personalize o logo direto no banco, cores da marca, dados pastorais e chaves PIX de doação.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CreateChurchDialog
              defaultTab="branch"
              parentTenantId={tenant.id}
              existingTenants={[
                {
                  id: tenant.id,
                  name: tenant.name,
                  slug: tenant.slug,
                  primaryColor: tenant.primaryColor,
                },
              ]}
              triggerButton={
                <Button className="h-10 text-xs font-bold bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/15 rounded-xl gap-2 cursor-pointer">
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Nova Filial</span>
                </Button>
              }
            />

            <CreateChurchDialog
              defaultTab="master"
              triggerButton={
                <Button className="h-10 text-xs font-black bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black rounded-xl shadow-lg shadow-amber-500/25 gap-2 cursor-pointer">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Nova Igreja Master</span>
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Formulário de Edição */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSave}
            className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-6"
          >
            {/* SEÇÃO 1: IDENTIDADE & LOGO (UPLOAD DIRETO NO BANCO) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <Church className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  1. Identidade & Logo da Igreja
                </h2>
              </div>

              {/* Upload de Logo em Base64 */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    Logo da Igreja (Gravado Direto no Banco de Dados)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">PNG / JPG / WEBP (max 2MB)</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Preview do Logo */}
                  <div className="w-20 h-20 rounded-2xl bg-black border border-white/15 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo da Igreja"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Church className="w-8 h-8 text-zinc-600" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload-input"
                    />

                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                      <label
                        htmlFor="logo-upload-input"
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>{logoUrl ? "Trocar Imagem do Logo" : "Fazer Upload do Logo"}</span>
                      </label>

                      {logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all border border-red-500/20 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover Logo</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      O arquivo é convertido e salvo no banco da sua igreja com segurança e alta velocidade. Não depende de links externos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Nome Oficial da Igreja *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Igreja Matriz Sede"
                    required
                    className="bg-black/50 border-white/10 text-white rounded-xl h-11"
                  />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-bold text-zinc-300">URL / Slug Permanente</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-mono text-zinc-500 shrink-0">horeb.lynxems.com.br/</span>
                    <Input
                      value={tenant.slug}
                      disabled
                      className="bg-black/30 border-white/5 text-zinc-400 rounded-xl h-11 font-mono text-xs select-all cursor-not-allowed min-w-0 flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Seletor de Cores White-Label */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>Cor Primária White-Label</span>
                  </label>
                  <span className="text-xs font-mono font-bold" style={{ color: primaryColor }}>
                    {primaryColor}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {colorPresets.map((c) => {
                    const isSelected = primaryColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setPrimaryColor(c.hex)}
                        className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-white scale-110 shadow-lg shadow-white/20"
                            : "opacity-80 hover:opacity-100 ring-1 ring-white/10"
                        }`}
                        title={c.label}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                      </button>
                    );
                  })}

                  <label
                    className="relative flex items-center justify-center w-8 h-8 rounded-full border border-white/20 bg-zinc-800 hover:bg-zinc-700 cursor-pointer overflow-hidden transition-all hover:scale-110"
                    title="Escolher Cor Personalizada"
                  >
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Palette className="w-4 h-4 text-zinc-300" />
                  </label>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: DADOS PASTORAIS & LOCALIZAÇÃO */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 pb-2">
                <User className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  2. Liderança Pastoral & Contato
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Pastor Titular / Presidente</label>
                  <Input
                    value={pastorName}
                    onChange={(e) => setPastorName(e.target.value)}
                    placeholder="Ex: Pr. Carlos Eduardo"
                    className="bg-black/50 border-white/10 text-white rounded-xl h-11 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Telefone / WhatsApp da Secretaria</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: (11) 98765-4321"
                    className="bg-black/50 border-white/10 text-white rounded-xl h-11 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Endereço da Igreja</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. das Nações, 1500 - Centro"
                  className="bg-black/50 border-white/10 text-white rounded-xl h-11 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Cidade</label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="bg-black/50 border-white/10 text-white rounded-xl h-11 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Estado (UF)</label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="Ex: SP"
                    className="bg-black/50 border-white/10 text-white rounded-xl h-11 text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: CONFIGURAÇÃO DE DÍZIMOS E OFERTAS PIX */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 pb-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  3. Dízimos & Ofertas PIX Personalizados
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Tipo da Chave PIX</label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value)}
                    className="w-full h-11 rounded-xl bg-black/50 border border-white/10 text-xs px-3 text-zinc-200 outline-none"
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="TELEFONE">Telefone</option>
                    <option value="ALEATORIA">Chave Aleatória</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Chave PIX Oficial da Igreja</label>
                  <Input
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Ex: 12.345.678/0001-90 ou financeiro@igreja.com.br"
                    className="bg-black/50 border-white/10 text-white rounded-xl h-11 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Valores Rápidos Sugeridos (Separados por vírgula)</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">Ex: 30,50,100,200,500</span>
                </div>
                <Input
                  value={pixPresetValues}
                  onChange={(e) => setPixPresetValues(e.target.value)}
                  placeholder="30,50,100,200,500"
                  className="bg-black/50 border-white/10 text-white rounded-xl h-11 text-xs font-mono"
                />
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[11px] text-zinc-400">Prévia dos botões de oferta:</span>
                  {pixPresetValues
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .map((val) => (
                      <span
                        key={val}
                        className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold"
                      >
                        R$ {val}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-12 font-black text-sm rounded-xl shadow-lg transition-all text-white cursor-pointer gap-2 mt-4"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando Alterações no Banco...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Todas as Configurações da Igreja</span>
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Coluna 3: Rede de Filiais & Assinatura */}
        <div className="space-y-6">
          {/* Card da Rede de Igrejas */}
          <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Rede & Congregações
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
                {tenant.branches.length} Filiais
              </span>
            </div>

            {tenant.isMatriz ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">
                  Esta congregação é a <strong>Sede Matriz</strong> e gerencia as congregações filiais abaixo:
                </p>

                {tenant.branches.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {tenant.branches.map((b) => (
                      <a
                        key={b.id}
                        href={`/${b.slug}`}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-xs transition-colors border border-white/5 group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: b.primaryColor }}
                          />
                          <span className="font-bold text-white truncate">{b.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic py-2">
                    Nenhuma filial vinculada no momento.
                  </p>
                )}

                <div className="pt-2">
                  <CreateChurchDialog
                    defaultTab="branch"
                    parentTenantId={tenant.id}
                    existingTenants={[
                      {
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                        primaryColor: tenant.primaryColor,
                      },
                    ]}
                    triggerButton={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-bold gap-1.5 border-dashed border-amber-500/40 hover:border-amber-400 text-amber-400 hover:bg-amber-500/10 h-10 rounded-xl cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Cadastrar Mais Uma Filial</span>
                      </Button>
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">
                  Esta congregação é uma filial vinculada à Sede:
                </p>
                {tenant.parent && (
                  <a
                    href={`/${tenant.parent.slug}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <span>{tenant.parent.name}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Card de Assinatura */}
          <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Plano & Licença
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {tenant.status}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400">Plano Ativo:</span>
              <p className="text-base font-black text-white tracking-wide">
                PLANO {tenant.plan || "GESTAO"}
              </p>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Plataforma com motor multi-tenant e segurança em nuvem. Desenvolvido por Lynx EMS Sistemas.
            </p>
          </div>

          {/* Card de Sessão e Desconexão */}
          <div className="p-6 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Sessão & Desconexão
                </h3>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Deseja encerrar sua sessão neste dispositivo? Para voltar a acessar os dados internos da congregação, será necessário fazer login novamente.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await logoutUser();
                window.location.href = "/";
              }}
              className="w-full text-xs font-bold gap-2 border-rose-500/30 hover:border-rose-500 text-rose-400 hover:bg-rose-500/10 h-10 rounded-xl cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Encerrar Sessão (Sair)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
