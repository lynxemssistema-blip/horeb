"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  PlusCircle,
  Users,
  Clock,
  Trash2,
  Edit2,
  Heart,
  Music,
  Flame,
  BookOpen,
  Shield,
  HandHeart,
  Loader2,
  Calendar,
  UserCheck,
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
import { createMinistry, deleteMinistry } from "@/app/actions/ministries";

interface MinistryItem {
  id: string;
  name: string;
  description?: string | null;
  schedule?: string | null;
  color: string;
  icon: string;
  leader?: { id: string; name: string; email: string } | null;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
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
}: ChurchMinistriesManagerProps) {
  const router = useRouter();
  const [ministries, setMinistries] = useState<MinistryItem[]>(initialMinistries);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const [icon, setIcon] = useState("Sparkles");

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
        schedule,
        leaderId: leaderId || undefined,
        color,
        icon,
      });

      if (res.success && res.ministry) {
        toast.success(`Ministério "${res.ministry.name}" criado com sucesso!`);
        setName("");
        setDescription("");
        setSchedule("");
        setLeaderId("");
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
      <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1.5 transition-all"
          style={{ backgroundColor: tenant.primaryColor }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/10 flex items-center gap-1.5 w-fit">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Corpo de Cristo • Liderança</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Ministérios da Igreja
            </h1>
            <p className="text-xs text-zinc-400">
              Cadastre e gerencie quantos ministérios a sua congregação desejar (Louvor, Diaconia, Família, Missões e mais).
            </p>
          </div>

          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger
              render={
                <Button className="h-11 text-xs font-black bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 hover:brightness-110 text-white rounded-xl shadow-lg shadow-purple-500/20 gap-2 cursor-pointer shrink-0">
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Criar Novo Ministério</span>
                </Button>
              }
            />

            <DialogContent className="max-w-lg w-[94vw] bg-zinc-950 border border-white/10 rounded-3xl p-0 overflow-hidden shadow-2xl">
              <div className="p-5 sm:p-6 border-b border-white/10">
                <DialogHeader className="text-left space-y-1">
                  <DialogTitle className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span>Cadastrar Novo Ministério</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-400">
                    Defina o propósito, dias de encontro, líder e identidade visual do ministério.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Nome do Ministério *</label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Ministério de Louvor & Adoração"
                    className="bg-black/50 border-white/10 text-white rounded-xl h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Líder do Ministério</label>
                  <select
                    value={leaderId}
                    onChange={(e) => setLeaderId(e.target.value)}
                    className="w-full h-10 rounded-xl bg-black/50 border border-white/10 text-xs px-3 text-zinc-200 outline-none"
                  >
                    <option value="">Selecione um líder (opcional)</option>
                    {potentialLeaders.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Dias e Horários de Encontro</label>
                  <Input
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="Ex: Terças às 19h30 e Domingos às 17h"
                    className="bg-black/50 border-white/10 text-white rounded-xl h-10 text-xs"
                  />
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
                  <label className="text-xs font-bold text-zinc-300">Ícone Representativo</label>
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
                              ? "bg-purple-600 text-white ring-2 ring-purple-400 shadow-md scale-110"
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
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-amber-500 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando Ministério...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
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
                className="p-5 rounded-2xl bg-zinc-950 border border-white/10 hover:border-white/20 transition-all space-y-4 shadow-xl relative overflow-hidden group"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: ministry.color }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                      style={{ backgroundColor: ministry.color }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                        {ministry.name}
                      </h3>
                      {ministry.leader ? (
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <UserCheck className="w-3 h-3 text-emerald-400" />
                          <span>Líder: {ministry.leader.name}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-500 italic mt-0.5">
                          Sem líder designado
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(ministry.id, ministry.name)}
                    className="w-7 h-7 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
                    title="Excluir ministério"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {ministry.description && (
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {ministry.description}
                  </p>
                )}

                {ministry.schedule && (
                  <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{ministry.schedule}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-zinc-950/60 border border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhum ministério cadastrado ainda</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            A igreja pode cadastrar quantos ministérios desejar: Louvor, Jovens, Casais, Intercessão, Diaconia e Missões.
          </p>
        </div>
      )}
    </div>
  );
}
