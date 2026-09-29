"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Sparkles,
  Globe,
  Lock,
  Flame,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Database,
  Upload,
  Trash2,
  Link2,
  Pencil,
  X,
  Clock,
  Building2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  getEventsFeed,
  seedMockEvents,
} from "@/app/actions/events";

function toDatetimeLocal(isoStr?: string | null): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function AdminEventosContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "matriz";
  const editParam = searchParams.get("edit");

  const [isPending, startTransition] = useTransition();
  const [isSeeding, setIsSeeding] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);

  // Edit Mode state
  const [editingId, setEditingId] = useState<string | null>(editParam);

  // Form states
  const [title, setTitle] = useState("");
  const [slogan, setSlogan] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isGlobalFeature, setIsGlobalFeature] = useState(false);

  // Lista de eventos existentes
  const [existingEvents, setExistingEvents] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Carrega lista de eventos
  const loadEventsList = async () => {
    try {
      setLoadingList(true);
      const res = await getEventsFeed(slug, true, "ALL");
      if (res.success && res.events) {
        setExistingEvents(res.events);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadEventsList();
  }, [slug]);

  // Se houver parâmetro `edit`, carrega os dados do evento
  useEffect(() => {
    if (editParam) {
      handleLoadForEdit(editParam);
    }
  }, [editParam]);

  const handleLoadForEdit = async (id: string) => {
    try {
      setLoadingEvent(true);
      const res = await getEventById(id);
      if (res.success && res.event) {
        const ev = res.event;
        setEditingId(ev.id);
        setTitle(ev.title || "");
        setSlogan(ev.slogan || "");
        setDescription(ev.description || "");
        setImageUrl(ev.imageUrl || "");
        setStartDate(toDatetimeLocal(ev.startDate));
        setEndDate(toDatetimeLocal(ev.endDate));
        setIsPublic(ev.isPublic);
        setIsGlobalFeature(ev.isGlobalFeature);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error("Evento não encontrado para edição.");
      }
    } catch {
      toast.error("Erro ao carregar evento.");
    } finally {
      setLoadingEvent(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setSlogan("");
    setDescription("");
    setImageUrl("");
    setStartDate("");
    setEndDate("");
    setIsPublic(true);
    setIsGlobalFeature(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.replace(`/${slug}/admin/eventos`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageUrl(base64);
      toast.success("Foto carregada com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) {
      toast.error("Por favor, preencha pelo menos o título e a data de início.");
      return;
    }

    startTransition(async () => {
      if (editingId) {
        // MODO EDIÇÃO
        const res = await updateEvent(
          {
            id: editingId,
            title: title.trim(),
            slogan: slogan.trim() || null,
            description: description.trim() || null,
            imageUrl: imageUrl.trim() || null,
            startDate: new Date(startDate).toISOString(),
            endDate: endDate ? new Date(endDate).toISOString() : null,
            isPublic,
            isGlobalFeature,
          },
          "MASTER",
          slug
        );

        if (res.success) {
          toast.success("Evento atualizado com sucesso!");
          handleCancelEdit();
          loadEventsList();
          router.push(`/${slug}/agenda`);
        } else {
          toast.error(res.error || "Erro ao atualizar evento.");
        }
      } else {
        // MODO CRIAÇÃO
        const res = await createEvent(
          {
            title: title.trim(),
            slogan: slogan.trim() || undefined,
            description: description.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
            startDate,
            endDate: endDate || undefined,
            isPublic,
            isGlobalFeature,
          },
          "MASTER",
          slug
        );

        if (res.success) {
          toast.success("Evento publicado com sucesso na Agenda!");
          setTitle("");
          setSlogan("");
          setDescription("");
          setImageUrl("");
          setStartDate("");
          setEndDate("");
          setIsPublic(true);
          setIsGlobalFeature(false);
          loadEventsList();
          router.push(`/${slug}/agenda`);
        } else {
          toast.error(res.error || "Erro ao publicar evento.");
        }
      }
    });
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Tem certeza de que deseja excluir este evento?")) return;
    try {
      setDeletingId(id);
      const res = await deleteEvent(id);
      if (res.success) {
        toast.success("Evento excluído com sucesso!");
        if (editingId === id) handleCancelEdit();
        loadEventsList();
      } else {
        toast.error(res.error || "Erro ao excluir evento.");
      }
    } catch {
      toast.error("Falha ao excluir evento.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      const res = await seedMockEvents(slug);
      if (res.success) {
        toast.success(`3 Eventos de demonstração gerados com sucesso!`);
        loadEventsList();
        router.push(`/${slug}/agenda`);
      } else {
        toast.error(res.error || "Erro ao gerar mock de eventos.");
      }
    } catch {
      toast.error("Falha ao semear eventos.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/${slug}/agenda`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Agenda</span>
          </Link>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <span>{editingId ? "Editar Evento" : "Publicar Novo Evento"}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {editingId
              ? "Modifique os detalhes, horários e fotos do evento selecionado."
              : "Crie programações, cultos especiais, vigílias e congressos para sua congregação ou rede."}
          </p>
        </div>

        {/* Botão de Mock Rápido */}
        {!editingId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={isSeeding}
            className="text-xs font-bold gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 cursor-pointer shadow-sm"
          >
            {isSeeding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5" />
            )}
            <span>Popular 3 Eventos Mock</span>
          </Button>
        )}
      </div>

      {/* Formulário Principal em Card Elegante */}
      <Card className="border-border/80 bg-card shadow-xl overflow-hidden rounded-3xl">
        <div
          className={`h-1.5 w-full ${
            editingId
              ? "bg-gradient-to-r from-amber-500 via-primary to-amber-500"
              : "bg-gradient-to-r from-primary via-amber-500 to-primary"
          }`}
        />

        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil className="w-4 h-4 text-amber-400" />
                  <span>Modo Edição de Evento</span>
                </>
              ) : (
                <span>Informações do Evento</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  <span>Cancelar Edição</span>
                </Button>
              )}
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Acesso Master / Pastor
              </span>
            </div>
          </CardTitle>
          <CardDescription className="text-xs">
            {editingId
              ? "As alterações salvas serão aplicadas instantaneamente em toda a plataforma."
              : "Preencha os campos abaixo. O evento aparecerá na timeline mobile com design de alta fidelidade."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loadingEvent ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs font-semibold">Carregando dados do evento...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Título */}
              <div>
                <label className="text-xs font-bold block mb-1">Título do Evento *</label>
                <Input
                  placeholder="Ex: Conferência Global Aviva 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-10 text-sm rounded-xl bg-background"
                />
              </div>

              {/* Slogan */}
              <div>
                <label className="text-xs font-bold block mb-1">
                  Slogan / Subtítulo Curto de Impacto
                </label>
                <Input
                  placeholder="Ex: Três noites de louvor, profecia e derramamento do Espírito Santo"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className="h-10 text-sm rounded-xl bg-background"
                />
              </div>

              {/* Imagem / Banner com Upload Direto ou URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold block flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Foto / Banner do Evento</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Upload do celular/PC ou link externo
                  </span>
                </label>

                {imageUrl ? (
                  <div className="relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden border border-border/80 bg-muted/50 group">
                    <img
                      src={imageUrl}
                      alt="Pré-visualização do Banner"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="text-xs font-bold gap-1.5 h-8 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover Foto</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-primary/5 rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-foreground">
                          Clique aqui para carregar a imagem do seu aparelho
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          PNG, JPG, WEBP até 3MB
                        </p>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Cole uma URL */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Ou cole a URL da imagem (ex: Unsplash)..."
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          className="h-9 text-xs pl-8 rounded-xl bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Datas Início e Fim */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Data & Hora de Início *</label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="h-10 text-xs sm:text-sm rounded-xl bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Data & Hora de Término (Opcional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 text-xs sm:text-sm rounded-xl bg-background"
                  />
                </div>
              </div>

              {/* Descrição Detalhada */}
              <div>
                <label className="text-xs font-bold block mb-1">Descrição & Programação</label>
                <Textarea
                  placeholder="Detalhes sobre preletores, horários, recomendações para famílias e estacionamento..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs sm:text-sm rounded-xl bg-background resize-none"
                />
              </div>

              {/* Seção dos Toggles de Poder (Switches) */}
              <div className="pt-3 border-t border-border/60 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Regras de Visibilidade & Alcance (RBAC)</span>
                </h3>

                {/* Toggle 1: isPublic */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                  <div className="space-y-0.5 pr-4">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-foreground">
                        Evento aberto ao Público Geral?
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Se desativado, o evento fica oculto para visitantes e só é visível para membros
                      logados na congregação.
                    </p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>

                {/* Toggle 2: isGlobalFeature */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-card to-card border border-amber-500/20">
                  <div className="space-y-0.5 pr-4">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-amber-400">
                        Destacar na Tela Principal de TODAS as Igrejas (Global)?
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Fura a bolha local: o evento aparecerá em destaque no feed e na home de todas as
                      filiais da rede.
                    </p>
                  </div>
                  <Switch checked={isGlobalFeature} onCheckedChange={setIsGlobalFeature} />
                </div>
              </div>

              {/* Botão de Envio */}
              <div className="pt-3 flex justify-end gap-2">
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isPending}
                    className="font-bold text-xs h-11 px-5 rounded-xl"
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto font-bold text-xs h-11 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{editingId ? "Salvando Alterações..." : "Publicando Evento..."}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {editingId ? "Salvar Alterações do Evento" : "Publicar Evento na Agenda"}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Seção de Gestão de Eventos Existentes */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <span>Eventos Publicados ({existingEvents.length})</span>
          </h2>
          <Link
            href={`/${slug}/agenda`}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Ver no Feed da Agenda</span>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>

        {loadingList ? (
          <div className="py-8 flex justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : existingEvents.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
            Nenhum evento publicado ainda nesta congregação.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {existingEvents.map((ev) => (
              <div
                key={ev.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  editingId === ev.id
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border/80 bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {ev.imageUrl ? (
                    <img
                      src={ev.imageUrl}
                      alt={ev.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {ev.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        {(() => {
                          try {
                            return format(parseISO(ev.startDate), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            });
                          } catch {
                            return ev.startDate;
                          }
                        })()}
                      </span>
                      {ev.isGlobalFeature && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                          Global
                        </span>
                      )}
                      {!ev.isPublic && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" />
                          Membros
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadForEdit(ev.id)}
                    className="text-xs font-bold h-8 px-2.5 rounded-xl border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    <span>Editar</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === ev.id}
                    onClick={() => handleDeleteItem(ev.id)}
                    className="text-xs h-8 px-2 text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    {deletingId === ev.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminEventosPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 flex justify-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <AdminEventosContent />
    </Suspense>
  );
}
