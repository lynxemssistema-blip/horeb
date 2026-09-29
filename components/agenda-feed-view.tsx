"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Flame,
  Lock,
  Clock,
  CalendarPlus,
  ArrowRight,
  Sparkles,
  PlusCircle,
  Building2,
  Pencil,
  Trash2,
  Upload,
  Link2,
  Loader2,
  CheckCircle2,
  X,
  ShieldCheck,
  Image as ImageIcon,
  AlertTriangle,
  Ticket,
  Scan,
  Power,
  Eye,
  EyeOff,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { format, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { updateEvent, deleteEvent, toggleEventActive } from "@/app/actions/events";

export interface EventItem {
  id: string;
  title: string;
  slogan: string | null;
  description: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string | null;
  isPublic: boolean;
  isGlobalFeature: boolean;
  isActive?: boolean;
  isPaid?: boolean;
  price?: number | null;
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
  };
}

interface AgendaFeedViewProps {
  slug: string;
  churchName: string;
  primaryColor: string;
  initialEvents: EventItem[];
  isUserLoggedIn: boolean;
  canEditEvents?: boolean;
  userRole?: string;
  userEmail?: string;
}

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

export function AgendaFeedView({
  slug,
  churchName,
  primaryColor,
  initialEvents,
  isUserLoggedIn,
  canEditEvents = false,
  userRole = "GUEST",
  userEmail = "",
}: AgendaFeedViewProps) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [filter, setFilter] = useState<"ALL" | "WEEK" | "MONTH">("ALL");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Estados de edição de evento
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlogan, setEditSlogan] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editIsGlobalFeature, setEditIsGlobalFeature] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIsPaid, setEditIsPaid] = useState(false);
  const [editPrice, setEditPrice] = useState<string>("0");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // Filtragem dos eventos no cliente
  const filteredEvents = events.filter((ev) => {
    try {
      const eventDate = parseISO(ev.startDate);
      if (filter === "WEEK") {
        return isThisWeek(eventDate, { weekStartsOn: 0 });
      }
      if (filter === "MONTH") {
        return isThisMonth(eventDate);
      }
      return true;
    } catch {
      return true;
    }
  });

  const formatDateDay = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      return format(d, "dd", { locale: ptBR });
    } catch {
      return "--";
    }
  };

  const formatDateMonth = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      return format(d, "MMM", { locale: ptBR }).toUpperCase();
    } catch {
      return "---";
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      return format(d, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const handleAddToCalendar = (event: EventItem) => {
    const start = new Date(event.startDate).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = event.endDate
      ? new Date(event.endDate).toISOString().replace(/-|:|\.\d\d\d/g, "")
      : new Date(new Date(event.startDate).getTime() + 2 * 60 * 60 * 1000)
          .toISOString()
          .replace(/-|:|\.\d\d\d/g, "");

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      event.title
    )}&dates=${start}/${end}&details=${encodeURIComponent(
      event.slogan || event.description || ""
    )}&location=${encodeURIComponent(event.tenant?.name || churchName)}`;

    window.open(url, "_blank");
  };

  // Abre o modal de edição e preenche os campos
  const handleStartEdit = (event: EventItem) => {
    setEditingEvent(event);
    setEditTitle(event.title || "");
    setEditSlogan(event.slogan || "");
    setEditDescription(event.description || "");
    setEditImageUrl(event.imageUrl || "");
    setEditStartDate(toDatetimeLocal(event.startDate));
    setEditEndDate(toDatetimeLocal(event.endDate));
    setEditIsPublic(event.isPublic !== undefined ? event.isPublic : true);
    setEditIsGlobalFeature(Boolean(event.isGlobalFeature));
    setEditIsActive(event.isActive !== false);
    setEditIsPaid(Boolean(event.isPaid));
    setEditPrice(event.price ? String(event.price) : "0");
    setConfirmDelete(false);
  };

  // Upload de imagem do dispositivo para Base64
  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setEditImageUrl(base64);
      toast.success("Foto carregada com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  // Ativação / Desativação rápida de evento pelo Master ou Pastor
  const handleToggleActive = async (eventId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setTogglingId(eventId);
      const res = await toggleEventActive(eventId, userRole);
      if (res.success) {
        setEvents((prev) =>
          prev.map((ev) => (ev.id === eventId ? { ...ev, isActive: res.isActive } : ev))
        );
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent((prev) => (prev ? { ...prev, isActive: res.isActive } : null));
        }
        toast.success(res.message || "Status do evento atualizado!");
      } else {
        toast.error(res.error || "Erro ao alterar status do evento.");
      }
    } catch {
      toast.error("Falha ao atualizar status do evento.");
    } finally {
      setTogglingId(null);
    }
  };

  // Submissão da edição
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    if (!editTitle.trim() || !editStartDate) {
      toast.error("Por favor, informe pelo menos o título e a data de início.");
      return;
    }

    try {
      setIsSaving(true);
      const numericPrice = editIsPaid ? parseFloat(editPrice) || 0 : null;

      const res = await updateEvent(
        {
          id: editingEvent.id,
          title: editTitle.trim(),
          slogan: editSlogan.trim() || null,
          description: editDescription.trim() || null,
          imageUrl: editImageUrl.trim() || null,
          startDate: new Date(editStartDate).toISOString(),
          endDate: editEndDate ? new Date(editEndDate).toISOString() : null,
          isPublic: editIsPublic,
          isGlobalFeature: editIsGlobalFeature,
          isActive: editIsActive,
          isPaid: editIsPaid,
          price: numericPrice,
        },
        userRole,
        slug
      );

      if (res.success && res.event) {
        toast.success("Evento atualizado com sucesso!");
        setEvents((prev) =>
          prev.map((ev) => (ev.id === res.event!.id ? { ...ev, ...res.event } : ev))
        );
        if (selectedEvent && selectedEvent.id === res.event.id) {
          setSelectedEvent({ ...selectedEvent, ...res.event });
        }
        setEditingEvent(null);
      } else {
        toast.error(res.error || "Erro ao atualizar evento.");
      }
    } catch (err: any) {
      toast.error("Falha ao salvar evento: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  // Exclusão de evento
  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setIsDeleting(true);
      const res = await deleteEvent(editingEvent.id);
      if (res.success) {
        toast.success("Evento excluído com sucesso!");
        setEvents((prev) => prev.filter((ev) => ev.id !== editingEvent.id));
        if (selectedEvent && selectedEvent.id === editingEvent.id) {
          setSelectedEvent(null);
        }
        setEditingEvent(null);
      } else {
        toast.error(res.error || "Erro ao excluir evento.");
      }
    } catch (err: any) {
      toast.error("Falha ao excluir evento: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      {/* Top Banner & Header Mobile-First */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {churchName}
            </span>
            {canEditEvents && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>Gestão Master / Pastor</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <span>Agenda & Eventos</span>
          </h1>
        </div>

        {/* Botões de Ação no Topo: Meus Ingressos, Catraca e Criar Evento */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Link para Minha Carteira de Ingressos */}
          <Link href={`/${slug}/meus-ingressos`}>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-bold gap-1.5 rounded-xl h-9 px-3 border-border hover:border-primary cursor-pointer shadow-sm"
              title="Acessar meus ingressos com QR Code"
            >
              <Ticket className="w-3.5 h-3.5 text-primary" />
              <span>Meus Ingressos</span>
            </Button>
          </Link>

          {/* Link para Scanner da Catraca (apenas Master / Pastor) */}
          {canEditEvents && (
            <Link href={`/${slug}/admin/checkin`}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold gap-1.5 rounded-xl h-9 px-3 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shadow-sm"
                title="Abrir Scanner da Portaria"
              >
                <Scan className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Catraca</span>
              </Button>
            </Link>
          )}

          {/* Link para Criar Novo Evento (Master / Pastor) */}
          {canEditEvents && (
            <Link href={`/${slug}/admin/eventos`}>
              <Button
                size="sm"
                className="text-xs font-bold gap-1.5 rounded-xl h-9 px-3 shadow-md shadow-primary/20 cursor-pointer bg-primary text-primary-foreground hover:opacity-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Criar Evento</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 1. FILTROS SUPERIORES: Menu de Botões Rolável Horizontalmente (Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            filter === "ALL"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Todos ({events.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("WEEK")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            filter === "WEEK"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Esta Semana
        </button>
        <button
          type="button"
          onClick={() => setFilter("MONTH")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            filter === "MONTH"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Este Mês
        </button>
      </div>

      {/* 2. CARDS DE EVENTO: Visual Premium e Mobile-First */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-border rounded-3xl bg-card/40 space-y-3">
          <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <h3 className="text-base font-bold text-foreground">Nenhum evento neste período</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Novos eventos, cultos temáticos e congressos serão adicionados em breve à nossa agenda.
          </p>
          {canEditEvents && (
            <Link href={`/${slug}/admin/eventos`} className="inline-block pt-2">
              <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5 rounded-xl">
                <PlusCircle className="w-3.5 h-3.5 text-primary" />
                <span>Adicionar Primeiro Evento</span>
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const isInactive = event.isActive === false;

            return (
              <article
                key={event.id}
                className={`bg-card border rounded-3xl overflow-hidden transition-all duration-300 shadow-md group flex flex-col relative ${
                  isInactive
                    ? "border-red-500/40 opacity-80 bg-red-950/10"
                    : "border-border/80 hover:border-primary/50"
                }`}
              >
                {/* Imagem no topo ocupando 100% da largura */}
                <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-muted/60">
                  <img
                    src={
                      event.imageUrl ||
                      "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80"
                    }
                    alt={event.title}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${
                      isInactive ? "filter grayscale" : ""
                    }`}
                  />

                  {/* Overlay gradiente escurecendo a base da foto para contraste */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badges no Topo Esquerdo */}
                  <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
                    {/* Badge Destaque Geral */}
                    {event.isGlobalFeature && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-gradient-to-r from-amber-500 to-red-500 text-black shadow-lg shadow-amber-500/40">
                        <Flame className="w-3 h-3 fill-black" />
                        <span>Destaque Geral</span>
                      </span>
                    )}

                    {/* Badge de Ativo / Desativado (Master / Pastor) */}
                    {canEditEvents && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide backdrop-blur-md shadow-md ${
                          isInactive
                            ? "bg-red-600/90 text-white border border-red-400/40"
                            : "bg-emerald-600/90 text-white border border-emerald-400/40"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isInactive ? "bg-white" : "bg-emerald-300"
                          }`}
                        />
                        <span>{isInactive ? "Desativado" : "Ativo"}</span>
                      </span>
                    )}
                  </div>

                  {/* Ações Rápidas no Topo Direito (Master / Pastor) */}
                  {canEditEvents && (
                    <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                      {/* Botão Rápido de Ativar/Desativar */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleActive(event.id, e)}
                        disabled={togglingId === event.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95 border ${
                          isInactive
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40"
                            : "bg-black/80 hover:bg-red-500 hover:text-white text-zinc-300 border-white/20"
                        }`}
                        title={isInactive ? "Clique para Ativar evento" : "Clique para Desativar evento"}
                      >
                        {togglingId === event.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isInactive ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        <span>{isInactive ? "Ativar" : "Desativar"}</span>
                      </button>

                      {/* Botão Rápido de Editar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(event);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-black/80 hover:bg-amber-500 hover:text-black text-amber-400 border border-amber-500/40 backdrop-blur-md shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
                        title="Editar este evento"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                    </div>
                  )}

                  {/* Badge da Igreja Promotora (se for filial de rede) */}
                  {event.tenant && event.tenant.slug !== slug && (
                    <div className={`absolute ${canEditEvents ? "top-11" : "top-3"} right-3 z-10`}>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-white border border-white/20 backdrop-blur-md">
                        <Building2 className="w-3 h-3 text-primary" />
                        <span>{event.tenant.name}</span>
                      </span>
                    </div>
                  )}

                  {/* Data em Bloco Flutuante na Base da Imagem */}
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-background/90 border border-border/60 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-lg">
                      <span className="text-sm font-black leading-none text-foreground">
                        {formatDateDay(event.startDate)}
                      </span>
                      <span className="text-[10px] font-bold leading-none text-primary uppercase mt-0.5">
                        {formatDateMonth(event.startDate)}
                      </span>
                    </div>

                    <div className="text-white drop-shadow-md">
                      <p className="text-xs font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>{format(parseISO(event.startDate), "HH:mm")}h</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                        {event.title}
                      </h2>
                    </div>

                    {event.slogan && (
                      <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                        {event.slogan}
                      </p>
                    )}
                  </div>

                  {/* Rodapé do Card com Badges, Bilheteria e Botão Ver Detalhes */}
                  <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
                    {/* Badges de Visibilidade e Preço */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {event.isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Ticket className="w-3 h-3" />
                          <span>R$ {event.price ? event.price.toFixed(2) : "0,00"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Ticket className="w-3 h-3" />
                          <span>Gratuito / RSVP</span>
                        </span>
                      )}

                      {!event.isPublic && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                          <Lock className="w-3 h-3" />
                          <span>Membros</span>
                        </span>
                      )}
                    </div>

                    {/* Botões de Ação: Ingressos e Ver Detalhes */}
                    <div className="flex items-center gap-2">
                      {/* Botão de Compra de Ingressos / Inscrição RSVP */}
                      <Link href={`/${slug}/agenda/${event.id}/comprar`}>
                        <Button
                          size="sm"
                          className="text-xs font-bold gap-1.5 h-8 px-3 rounded-xl shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:opacity-95 cursor-pointer"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>{event.isPaid ? "Comprar Ingressos" : "Garantir Vaga"}</span>
                        </Button>
                      </Link>

                      {/* Botão Ver Detalhes */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEvent(event)}
                        className="text-xs font-bold gap-1 h-8 px-3 rounded-xl hover:border-primary hover:text-primary transition-all cursor-pointer"
                      >
                        <span>Detalhes</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes do Evento */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground p-0 overflow-hidden rounded-3xl">
          {selectedEvent && (
            <div>
              {/* Banner no Modal */}
              <div className="relative w-full h-44 bg-muted">
                <img
                  src={
                    selectedEvent.imageUrl ||
                    "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80"
                  }
                  alt={selectedEvent.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {selectedEvent.isGlobalFeature && (
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-black shadow-md">
                    🔥 Destaque Geral
                  </span>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-xl font-black text-foreground leading-snug">
                    {selectedEvent.title}
                  </h3>
                  {selectedEvent.slogan && (
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {selectedEvent.slogan}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-muted/50 border border-border/60 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    <span>{formatFullDate(selectedEvent.startDate)}</span>
                  </div>

                  {selectedEvent.tenant && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span>{selectedEvent.tenant.name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-border/40 font-bold">
                    <Ticket className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      {selectedEvent.isPaid
                        ? `Valor do Ingresso: R$ ${selectedEvent.price?.toFixed(2)}`
                        : "Entrada Franca / Inscrição Gratuita"}
                    </span>
                  </div>
                </div>

                {selectedEvent.description && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Sobre o Evento
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/${slug}/agenda/${selectedEvent.id}/comprar`}
                    className="flex-1"
                    onClick={() => setSelectedEvent(null)}
                  >
                    <Button
                      size="sm"
                      className="w-full text-xs font-bold gap-1.5 rounded-xl shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:opacity-95"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>{selectedEvent.isPaid ? "Comprar Ingressos" : "Garantir Vaga"}</span>
                    </Button>
                  </Link>

                  {canEditEvents && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const ev = selectedEvent;
                        setSelectedEvent(null);
                        handleStartEdit(ev);
                      }}
                      className="text-xs font-bold gap-1.5 rounded-xl border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToCalendar(selectedEvent)}
                    className="text-xs font-bold gap-1.5 rounded-xl"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Google</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de EDIÇÃO DE EVENTO (Acesso Pastor / Master) */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && !isSaving && setEditingEvent(null)}>
        <DialogContent className="max-w-lg bg-card border border-border text-foreground p-0 overflow-hidden rounded-3xl max-h-[92vh] overflow-y-auto">
          {editingEvent && (
            <div>
              {/* Top Decorator Bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-primary to-amber-500" />

              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-amber-400" />
                      <span>Editar Evento</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Modifique dados, ingressos, imagem e visibilidade do evento.
                    </DialogDescription>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Pastor / Master
                  </span>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
                  {/* Título */}
                  <div>
                    <label className="text-xs font-bold block mb-1">Título do Evento *</label>
                    <Input
                      placeholder="Ex: Culto Especial de Domingo"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
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
                      placeholder="Ex: Traga sua Família"
                      value={editSlogan}
                      onChange={(e) => setEditSlogan(e.target.value)}
                      className="h-10 text-sm rounded-xl bg-background"
                    />
                  </div>

                  {/* Imagem / Banner do Evento */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold block flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-primary" />
                        <span>Foto / Banner do Evento</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Upload direto ou URL
                      </span>
                    </label>

                    {editImageUrl ? (
                      <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-border/80 bg-muted/50 group">
                        <img
                          src={editImageUrl}
                          alt="Pré-visualização"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setEditImageUrl("");
                              if (editFileInputRef.current) editFileInputRef.current.value = "";
                            }}
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
                          onClick={() => editFileInputRef.current?.click()}
                          className="border-2 border-dashed border-border/80 hover:border-amber-500/60 bg-muted/20 hover:bg-amber-500/5 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
                        >
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                            <Upload className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-bold text-foreground">
                            Carregar foto do dispositivo
                          </p>
                          <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP até 3MB</p>
                        </div>

                        <input
                          ref={editFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleEditFileUpload}
                          className="hidden"
                        />

                        <div className="relative">
                          <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Ou cole a URL da imagem..."
                            value={editImageUrl}
                            onChange={(e) => setEditImageUrl(e.target.value)}
                            className="h-9 text-xs pl-8 rounded-xl bg-background"
                          />
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
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        required
                        className="h-10 text-xs rounded-xl bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Término (Opcional)</label>
                      <Input
                        type="datetime-local"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="h-10 text-xs rounded-xl bg-background"
                      />
                    </div>
                  </div>

                  {/* Descrição Detalhada */}
                  <div>
                    <label className="text-xs font-bold block mb-1">Descrição & Detalhes</label>
                    <Textarea
                      placeholder="Informações adicionais sobre o culto ou preletores..."
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="text-xs rounded-xl bg-background"
                    />
                  </div>

                  {/* Bilheteria / Ingressos */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 pr-2">
                        <span className="text-xs font-bold block text-foreground flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-primary" />
                          <span>Evento Pago com Venda de Ingressos?</span>
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Se ativado, membros compram ingressos com QR Code nominal.
                        </p>
                      </div>
                      <Switch checked={editIsPaid} onCheckedChange={setEditIsPaid} />
                    </div>

                    {editIsPaid && (
                      <div className="pt-2 border-t border-border/40 animate-fadeIn">
                        <label className="text-xs font-bold block mb-1">
                          Valor por Ingresso (R$) *
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 150.00"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="h-10 text-sm rounded-xl bg-background"
                        />
                      </div>
                    )}
                  </div>

                  {/* Toggles de Ativação e Visibilidade */}
                  <div className="pt-2 border-t border-border/60 space-y-2.5">
                    {/* Toggle: Ativo / Desativado */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
                      <div className="space-y-0.5 pr-2">
                        <span className="text-xs font-bold block text-foreground flex items-center gap-1.5">
                          <Power className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Evento Ativo na Agenda?</span>
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Se desativado, o evento fica oculto para a membresia e visível apenas para a
                          liderança.
                        </p>
                      </div>
                      <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
                    </div>

                    {/* Toggle: Aberto ao Público */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
                      <div className="space-y-0.5 pr-2">
                        <span className="text-xs font-bold block text-foreground">
                          Aberto ao Público Geral?
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Se desativado, o evento só será visível para membros logados.
                        </p>
                      </div>
                      <Switch checked={editIsPublic} onCheckedChange={setEditIsPublic} />
                    </div>

                    {/* Toggle: Destaque Global */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                      <div className="space-y-0.5 pr-2">
                        <span className="text-xs font-bold block text-amber-400">
                          🔥 Destaque Geral em TODAS as Igrejas?
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Exibe no topo da tela principal de todas as congregações da rede.
                        </p>
                      </div>
                      <Switch checked={editIsGlobalFeature} onCheckedChange={setEditIsGlobalFeature} />
                    </div>
                  </div>

                  {/* Ações do Rodapé: Excluir e Salvar */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                    {/* Botão de Excluir */}
                    <div>
                      {confirmDelete ? (
                        <div className="flex items-center gap-1.5 animate-fadeIn">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isDeleting}
                            onClick={handleDeleteEvent}
                            className="text-xs font-bold h-9 px-3 rounded-xl gap-1"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5" />
                            )}
                            <span>Confirmar Exclusão</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(false)}
                            className="text-xs h-9 px-2 text-muted-foreground"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(true)}
                          className="text-xs font-medium text-destructive hover:bg-destructive/10 h-9 px-3 rounded-xl gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSaving}
                        onClick={() => setEditingEvent(null)}
                        className="text-xs font-bold h-9 px-4 rounded-xl"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSaving}
                        className="text-xs font-bold h-9 px-5 rounded-xl shadow-md shadow-primary/20 gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:opacity-90"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Salvar Alterações</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
