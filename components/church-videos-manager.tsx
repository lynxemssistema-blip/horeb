"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Play,
  PlusCircle,
  Video,
  Trash2,
  Calendar,
  User,
  ExternalLink,
  Sparkles,
  Loader2,
  X,
  Tv,
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
import { createChurchVideo, deleteChurchVideo } from "@/app/actions/videos";
import { extractYouTubeId } from "@/lib/utils";

interface VideoItem {
  id: string;
  title: string;
  youtubeUrl: string;
  videoId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  description?: string | null;
  preacher?: string | null;
  date?: string | null;
  category: string;
  createdAt: Date | string;
}

interface ChurchVideosManagerProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
  };
  initialVideos: VideoItem[];
  allowedActions: string[];
}

const CATEGORIES = [
  "Todos",
  "Culto de Celebração",
  "Mensagem Pastoral",
  "Louvor & Adoração",
  "Estudo Bíblico",
  "Especial",
];

export function ChurchVideosManager({ tenant, initialVideos, allowedActions = [] }: ChurchVideosManagerProps) {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [activePlayingId, setActivePlayingId] = useState<string | null>(
    initialVideos[0]?.id || null
  );

  // Modal de Adicionar Vídeo
  const [openModal, setOpenModal] = useState(false);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [preacher, setPreacher] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Culto de Celebração");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const previewId = extractYouTubeId(youtubeUrl);

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !youtubeUrl.trim()) {
      toast.error("Preencha o título e a URL do vídeo.");
      return;
    }

    if (!previewId) {
      toast.error("URL do YouTube inválida.");
      return;
    }

    setLoading(true);
    try {
      const res = await createChurchVideo({
        tenantSlug: tenant.slug,
        title,
        youtubeUrl,
        preacher,
        date: date || new Date().toLocaleDateString("pt-BR"),
        category,
        description,
      });

      if (res.success && res.video) {
        toast.success("Vídeo adicionado com sucesso!");
        setTitle("");
        setYoutubeUrl("");
        setPreacher("");
        setDate("");
        setDescription("");
        setOpenModal(false);
        router.refresh();
      } else {
        toast.error(res.error || "Falha ao cadastrar vídeo.");
      }
    } catch {
      toast.error("Erro inesperado no servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja realmente remover este vídeo?")) return;

    try {
      const res = await deleteChurchVideo(id, tenant.slug);
      if (res.success) {
        toast.success("Vídeo removido.");
        setVideos((prev) => prev.filter((v) => v.id !== id));
        if (activePlayingId === id) {
          const remaining = videos.filter((v) => v.id !== id);
          setActivePlayingId(remaining[0]?.id || null);
        }
      } else {
        toast.error(res.error || "Falha ao remover.");
      }
    } catch {
      toast.error("Erro ao remover vídeo.");
    }
  };

  const filteredVideos =
    selectedCategory === "Todos"
      ? videos
      : videos.filter((v) => v.category === selectedCategory);

  const activeVideo = videos.find((v) => v.id === activePlayingId) || videos[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1.5 transition-all"
          style={{ backgroundColor: tenant.primaryColor }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/10 flex items-center gap-1.5 w-fit">
              <Tv className="w-3 h-3 text-red-500" />
              <span>Transmissões & Mensagens</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cultos Online & Mensagens
            </h1>
            <p className="text-xs text-zinc-400">
              Assista aos cultos de celebração, pregações da liderança e louvores gravados da {tenant.name}.
            </p>
          </div>

          <Dialog open={openModal} onOpenChange={setOpenModal}>
            {(allowedActions.includes("create_video") || allowedActions.includes("ALL")) && (
              <DialogTrigger
                render={
                  <Button className="h-11 text-xs font-black bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:brightness-110 text-white rounded-xl shadow-lg shadow-red-500/20 gap-2 cursor-pointer shrink-0">
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Adicionar Vídeo YouTube</span>
                  </Button>
                }
              />
            )}

            <DialogContent className="max-w-lg w-[94vw] bg-zinc-950 border border-white/10 rounded-3xl p-0 overflow-hidden shadow-2xl">
              <div className="p-5 sm:p-6 border-b border-white/10">
                <DialogHeader className="text-left space-y-1">
                  <DialogTitle className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <Video className="w-5 h-5 text-red-500" />
                    <span>Cadastrar Vídeo / Culto</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-400">
                    Insira o link do YouTube para disponibilizar na plataforma da igreja.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form onSubmit={handleAddVideo} className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Link do YouTube *</label>
                  <Input
                    required
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="bg-black/50 border-white/10 text-white rounded-xl h-10 text-xs font-mono"
                  />
                  <span className="text-[10px] text-zinc-500">
                    Aceita links normais do YouTube, links curtos (youtu.be) ou transmissões ao vivo.
                  </span>
                </div>

                {previewId && (
                  <div className="rounded-xl overflow-hidden border border-red-500/30 bg-black/40 p-2 space-y-1.5">
                    <div className="aspect-video w-full rounded-lg overflow-hidden relative bg-black">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${previewId}`}
                        title="Pré-visualização"
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold block text-center">
                      ✓ Vídeo identificado com sucesso!
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Título do Culto / Mensagem *</label>
                  <Input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Culto da Família - O Poder da Esperança"
                    className="bg-black/50 border-white/10 text-white rounded-xl h-10 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Pregador / Ministro</label>
                    <Input
                      value={preacher}
                      onChange={(e) => setPreacher(e.target.value)}
                      placeholder="Ex: Pr. Carlos Eduardo"
                      className="bg-black/50 border-white/10 text-white rounded-xl h-10 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Data do Culto</label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-black/50 border-white/10 text-white rounded-xl h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 rounded-xl bg-black/50 border border-white/10 text-xs px-3 text-zinc-200 outline-none"
                  >
                    <option value="Culto de Celebração">Culto de Celebração</option>
                    <option value="Mensagem Pastoral">Mensagem Pastoral</option>
                    <option value="Louvor & Adoração">Louvor & Adoração</option>
                    <option value="Estudo Bíblico">Estudo Bíblico</option>
                    <option value="Especial">Especial</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Descrição / Versículos (Opcional)</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Versículos citados, notas da mensagem..."
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white outline-none resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !previewId}
                  className="w-full h-11 bg-gradient-to-r from-red-600 to-amber-500 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando Vídeo...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Publicar no App</span>
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Destaque Principal: Vídeo Ativo */}
      {activeVideo ? (
        <div className="rounded-3xl bg-zinc-950/90 border border-white/10 shadow-2xl overflow-hidden">
          <div className="aspect-video w-full bg-black relative">
            {activeVideo.embedUrl ? (
              <iframe
                src={`${activeVideo.embedUrl}?autoplay=0&rel=0`}
                title={activeVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                Vídeo indisponível
              </div>
            )}
          </div>

          <div className="p-5 sm:p-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                {activeVideo.category}
              </span>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                {activeVideo.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {activeVideo.date}
                  </span>
                )}
                {activeVideo.preacher && (
                  <span className="flex items-center gap-1 font-semibold text-zinc-300">
                    <User className="w-3.5 h-3.5" />
                    {activeVideo.preacher}
                  </span>
                )}
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeVideo.title}
            </h2>

            {activeVideo.description && (
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-3xl">
                {activeVideo.description}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-zinc-950/60 border border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
            <Tv className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhum culto cadastrado ainda</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Adicione vídeos e cultos do canal do YouTube da sua igreja para que os membros possam assistir a qualquer momento.
          </p>
        </div>
      )}

      {/* Categorias Pills */}
      {videos.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-white text-black shadow-md"
                  : "bg-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grade de Vídeos */}
      {filteredVideos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => {
            const isPlaying = video.id === activeVideo?.id;
            return (
              <div
                key={video.id}
                onClick={() => setActivePlayingId(video.id)}
                className={`rounded-2xl overflow-hidden bg-zinc-950 border transition-all cursor-pointer group hover:scale-[1.01] ${
                  isPlaying
                    ? "border-red-500/80 shadow-lg shadow-red-500/15 ring-2 ring-red-500/30"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="aspect-video relative bg-black overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                      <Tv className="w-8 h-8" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 ml-0.5 fill-current" />
                    </div>
                  </div>

                  <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/80 text-white backdrop-blur-sm">
                    {video.category}
                  </span>

                  {(allowedActions.includes("delete_video") || allowedActions.includes("ALL")) && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteVideo(video.id, e)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-red-600 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Excluir vídeo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight">
                    {video.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                    <span className="truncate">{video.preacher || "Ministração"}</span>
                    <span>{video.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
