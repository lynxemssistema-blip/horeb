"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Users,
  Trash2,
  Edit2,
  Heart,
  Music,
  Flame,
  BookOpen,
  Shield,
  HandHeart,
  Loader2,
  UserCheck,
  Upload,
  Image as ImageIcon,
  X,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createMinistry, updateMinistry, deleteMinistry } from "@/app/actions/ministries";

interface MinistryItem {
  id: string;
  name: string;
  description?: string | null;
  schedule?: string | null;
  color: string;
  icon: string;
  logoUrl?: string | null;
  leaders?: Array<{ id: string; name: string; email: string; avatarUrl?: string | null }>;
  leader?: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface ChurchMinistriesManagerProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
  };
  initialMinistries: MinistryItem[];
  potentialLeaders: UserOption[];
  allowedActions: string[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  Music,
  Flame,
  Heart,
  BookOpen,
  Users,
  Shield,
  HandHeart,
};

const COLOR_PRESETS = [
  "#8b5cf6",
  "#dc2626",
  "#2563eb",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#4f46e5",
  "#06b6d4",
];

export function ChurchMinistriesManager({
  tenant,
  initialMinistries,
  potentialLeaders,
  allowedActions = [],
}: ChurchMinistriesManagerProps) {
  const router = useRouter();
  const [ministries, setMinistries] = useState<MinistryItem[]>(initialMinistries);
  const [openModal, setOpenModal] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<MinistryItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State (Create)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([]);
  const [color, setColor] = useState("#8b5cf6");
  const [icon, setIcon] = useState("Sparkles");
  const [logoUrl, setLogoUrl] = useState("");

  // Form State (Edit)
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSelectedLeaderIds, setEditSelectedLeaderIds] = useState<string[]>([]);
  const [editColor, setEditColor] = useState("#8b5cf6");
  const [editIcon, setEditIcon] = useState("Sparkles");
  const [editLogoUrl, setEditLogoUrl] = useState("");

  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const toggleLeader = (userId: string, isEdit: boolean) => {
    if (isEdit) {
      setEditSelectedLeaderIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    } else {
      setSelectedLeaderIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isEdit) {
        setEditLogoUrl(base64);
      } else {
        setLogoUrl(base64);
      }
      toast.success("Logotipo carregado com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  const openEditModal = (m: MinistryItem) => {
    setEditingMinistry(m);
    setEditName(m.name);
    setEditDescription(m.description || "");
    const initialLeaders = m.leaders && m.leaders.length > 0
      ? m.leaders.map((l) => l.id)
      : m.leader?.id
      ? [m.leader.id]
      : [];
    setEditSelectedLeaderIds(initialLeaders);
    setEditColor(m.color || "#8b5cf6");
    setEditIcon(m.icon || "Sparkles");
    setEditLogoUrl(m.logoUrl || "");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do ministério.");
      return;
    }

    setLoading(true);
    try {
      const res = await createMinistry({
        tenantSlug: tenant.slug,
        name,
        description,
        leaderIds: selectedLeaderIds,
        color,
        icon,
        logoUrl: logoUrl || undefined,
      });

      if (res.success && res.ministry) {
        toast.success(`Ministério "${res.ministry.name}" criado com sucesso!`);
        setName("");
        setDescription("");
        setSelectedLeaderIds([]);
        setLogoUrl("");
        setOpenModal(false);
        router.refresh();
      } else {
        toast.error(res.error || "Falha ao criar ministério.");
      }
    } catch {
      toast.error("Erro inesperado no servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMinistry) return;
    if (!editName.trim()) {
      toast.error("Informe o nome do ministério.");
      return;
    }

    setLoading(true);
    try {
      const res = await updateMinistry({
        id: editingMinistry.id,
        name: editName,
        description: editDescription,
        leaderIds: editSelectedLeaderIds,
        color: editColor,
        icon: editIcon,
        logoUrl: editLogoUrl,
        churchSlug: tenant.slug,
      });

      if (res.success && res.ministry) {
        toast.success(`Ministério "${res.ministry.name}" atualizado com sucesso!`);
        const updated = res.ministry;
        setMinistries((prev) =>
          prev.map((m) =>
            m.id === updated.id
              ? {
                  ...m,
                  name: updated.name,
                  description: updated.description,
                  color: updated.color,
                  icon: updated.icon,
                  logoUrl: updated.logoUrl,
                  leaders: updated.leaders || [],
                  leader: updated.leader || null,
                }
              : m
          )
        );
        setEditingMinistry(null);
        router.refresh();
      } else {
        toast.error(res.error || "Falha ao atualizar ministério.");
      }
    } catch {
      toast.error("Erro inesperado no servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, ministryName: string) => {
    if (!confirm(`Deseja realmente remover o ministério "${ministryName}"?`)) return;

    try {
      const res = await deleteMinistry(id, tenant.slug);
      if (res.success) {
        toast.success("Ministério removido.");
        setMinistries((prev) => prev.filter((m) => m.id !== id));
      } else {
        toast.error(res.error || "Erro ao remover.");
      }
    } catch {
      toast.error("Erro no servidor.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-2xl relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1.5 transition-all"
          style={{ backgroundColor: tenant.primaryColor }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border flex items-center gap-1.5 w-fit">
              <Sparkles className="w-3 h-3 text-red-500" />
              <span>Corpo de Cristo • Liderança</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Ministérios da Igreja
            </h1>
            <p className="text-xs text-muted-foreground">
              Cadastre e gerencie quantos ministérios a sua congregação desejar (Louvor, Diaconia, Família, Missões e mais).
            </p>
          </div>

          <Dialog open={openModal} onOpenChange={setOpenModal}>
            {(allowedActions.includes("create_ministry") || allowedActions.includes("ALL")) && (
              <DialogTrigger
                render={
                  <Button className="h-10 text-xs font-bold bg-primary text-primary-foreground hover:brightness-110 border border-primary/20 rounded-xl shadow-md gap-2 cursor-pointer shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <Plus className="w-4 h-4" />
                    <span>Novo Ministério</span>
                  </Button>
                }
              />
            )}

            <DialogContent className="max-w-lg w-[94vw] bg-card border border-border text-card-foreground rounded-3xl p-0 overflow-hidden shadow-2xl">
              <div className="p-5 sm:p-6 border-b border-border">
                <DialogHeader className="text-left space-y-1">
                  <DialogTitle className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-500" />
                    <span>Cadastrar Novo Ministério</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Defina o nome, líder, propósito, logotipo e cores do ministério.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Nome do Ministério *</label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Ministério de Louvor & Adoração"
                    className="bg-black/50 border-white/10 text-white rounded-xl h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300">Líderes do Ministério</label>
                    <span className="text-[10px] text-zinc-500">
                      {selectedLeaderIds.length} selecionado(s) • pode ter mais de um
                    </span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-black/50 border border-white/10 max-h-40 overflow-y-auto space-y-1.5">
                    {potentialLeaders.map((u) => {
                      const isSelected = selectedLeaderIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleLeader(u.id, false)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                            isSelected
                              ? "bg-white/15 text-white border border-white/20 font-bold"
                              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                isSelected ? "bg-white border-white text-black" : "border-white/20"
                              }`}
                            >
                              {isSelected && <span className="text-[10px] font-black">✓</span>}
                            </div>
                            <span>{u.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-zinc-400">
                              {u.role}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">{u.email}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Logotipo do Ministério (Upload ou URL) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Logotipo / Emblema do Ministério</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal">Opcional</span>
                  </label>

                  {logoUrl ? (
                    <div className="relative w-full h-28 rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center group">
                      <img
                        src={logoUrl}
                        alt="Prévia do Logotipo"
                        className="max-h-full max-w-full object-contain p-2"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl("")}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 text-white hover:bg-red-600 transition-colors shadow-lg cursor-pointer"
                        title="Remover logotipo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div
                        onClick={() => createFileInputRef.current?.click()}
                        className="border border-dashed border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 text-zinc-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-medium text-zinc-300">
                          Clique para fazer upload da foto/logotipo
                        </p>
                        <p className="text-[10px] text-zinc-500">PNG, JPG, SVG até 4MB</p>
                      </div>

                      <input
                        ref={createFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, false)}
                        className="hidden"
                      />

                      <div className="relative">
                        <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <Input
                          placeholder="Ou cole a URL do logotipo..."
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="pl-8 bg-black/50 border-white/10 text-white rounded-xl h-9 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Descrição / Propósito</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Objetivo ministerial, requisitos para voluntários..."
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white outline-none resize-none"
                  />
                </div>

                {/* Seletor de Ícone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Ícone Representativo (Backup caso sem logo)</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.keys(ICON_MAP).map((iconKey) => {
                      const IconComp = ICON_MAP[iconKey];
                      const isSelected = icon === iconKey;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setIcon(iconKey)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white text-zinc-950 ring-2 ring-white/60 shadow-md scale-105"
                              : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seletor de Cor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Cor de Destaque</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                          color === c ? "ring-2 ring-white scale-110 shadow-md" : "opacity-75 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs rounded-xl shadow-md gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando Ministério...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Criar Ministério</span>
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid de Ministérios */}
      {ministries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ministries.map((ministry) => {
            const IconComp = ICON_MAP[ministry.icon] || Sparkles;
            return (
              <div
                key={ministry.id}
                className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all space-y-4 shadow-xl relative overflow-hidden group"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: ministry.color }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 overflow-hidden"
                      style={{ backgroundColor: ministry.logoUrl ? "transparent" : ministry.color }}
                    >
                      {ministry.logoUrl ? (
                        <img
                          src={ministry.logoUrl}
                          alt={ministry.name}
                          className="w-full h-full object-cover rounded-xl border border-border"
                        />
                      ) : (
                        <IconComp className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {ministry.name}
                      </h3>
                      {ministry.leaders && ministry.leaders.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {ministry.leaders.map((ldr) => (
                            <span
                              key={ldr.id}
                              className="text-[10px] text-foreground font-medium px-2 py-0.5 rounded-md bg-muted border border-border flex items-center gap-1"
                            >
                              <UserCheck className="w-3 h-3 text-emerald-500" />
                              <span>{ldr.name}</span>
                            </span>
                          ))}
                        </div>
                      ) : ministry.leader ? (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <UserCheck className="w-3 h-3 text-emerald-500" />
                          <span>Líder: {ministry.leader.name}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/60 italic mt-0.5">
                          Sem líder designado
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(allowedActions.includes("create_ministry") || allowedActions.includes("ALL")) && (
                      <button
                        type="button"
                        onClick={() => openEditModal(ministry)}
                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
                        title="Editar ministério"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(allowedActions.includes("delete_ministry") || allowedActions.includes("ALL")) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(ministry.id, ministry.name)}
                        className="w-7 h-7 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
                        title="Excluir ministério"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {ministry.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {ministry.description}
                  </p>
                )}

                <div className="pt-2">
                  <Link href={`/${tenant.slug}/ministerios/${ministry.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold gap-1.5 h-9 rounded-xl border-border hover:border-primary hover:bg-muted text-foreground cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Acessar Workspace (Atas & Tarefas) &rarr;</span>
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-card/60 border border-border space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted text-foreground flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Nenhum ministério cadastrado ainda</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            A igreja pode cadastrar quantos ministérios desejar: Louvor, Jovens, Casais, Intercessão, Diaconia e Missões.
          </p>
        </div>
      )}

      {/* Modal de Edição de Ministério */}
      <Dialog open={!!editingMinistry} onOpenChange={(open) => !open && setEditingMinistry(null)}>
        <DialogContent className="max-w-lg w-[94vw] bg-card border border-border text-card-foreground rounded-3xl p-0 overflow-hidden shadow-2xl">
          <div className="p-5 sm:p-6 border-b border-white/10">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <span>Editar Ministério</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Altere o nome, propósito, líder, logotipo e cores do ministério.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleUpdate} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Nome do Ministério *</label>
              <Input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: Ministério de Louvor & Adoração"
                className="bg-black/50 border-white/10 text-white rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">Líderes do Ministério</label>
                <span className="text-[10px] text-zinc-500">
                  {editSelectedLeaderIds.length} selecionado(s) • pode ter mais de um
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/50 border border-white/10 max-h-40 overflow-y-auto space-y-1.5">
                {potentialLeaders.map((u) => {
                  const isSelected = editSelectedLeaderIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleLeader(u.id, true)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-white/15 text-white border border-white/20 font-bold"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected ? "bg-white border-white text-black" : "border-white/20"
                          }`}
                        >
                          {isSelected && <span className="text-[10px] font-black">✓</span>}
                        </div>
                        <span>{u.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-zinc-400">
                          {u.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">{u.email}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Logotipo do Ministério (Upload ou URL no Edit) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Logotipo / Emblema do Ministério</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-normal">Opcional</span>
              </label>

              {editLogoUrl ? (
                <div className="relative w-full h-28 rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center group">
                  <img
                    src={editLogoUrl}
                    alt="Prévia do Logotipo"
                    className="max-h-full max-w-full object-contain p-2"
                  />
                  <button
                    type="button"
                    onClick={() => setEditLogoUrl("")}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 text-white hover:bg-red-600 transition-colors shadow-lg cursor-pointer"
                    title="Remover logotipo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    onClick={() => editFileInputRef.current?.click()}
                    className="border border-dashed border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 text-zinc-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-medium text-zinc-300">
                      Clique para fazer upload da foto/logotipo
                    </p>
                    <p className="text-[10px] text-zinc-500">PNG, JPG, SVG até 4MB</p>
                  </div>

                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                  />

                  <div className="relative">
                    <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <Input
                      placeholder="Ou cole a URL do logotipo..."
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                      className="pl-8 bg-black/50 border-white/10 text-white rounded-xl h-9 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Descrição / Propósito</label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Objetivo ministerial, requisitos para voluntários..."
                className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white outline-none resize-none"
              />
            </div>

            {/* Seletor de Ícone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Ícone Representativo (Backup)</label>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.keys(ICON_MAP).map((iconKey) => {
                  const IconComp = ICON_MAP[iconKey];
                  const isSelected = editIcon === iconKey;
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setEditIcon(iconKey)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white text-zinc-950 ring-2 ring-white/60 shadow-md scale-105"
                          : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seletor de Cor */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Cor de Destaque</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                      editColor === c ? "ring-2 ring-white scale-110 shadow-md" : "opacity-75 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMinistry(null)}
                className="h-10 text-xs border-white/10 text-zinc-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-10 px-5 bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs rounded-xl shadow-md gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
