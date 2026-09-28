"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Flame,
  Lock,
  Clock,
  MapPin,
  Share2,
  CalendarPlus,
  ArrowRight,
  Sparkles,
  PlusCircle,
  Building2,
  Info,
} from "lucide-react";
import Link from "next/link";
import { format, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface EventItem {
  id: string;
  title: string;
  slogan: string | null;
  description: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string | null;
  isPublic: boolean;
  isGlobalFeature: boolean;
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
}

export function AgendaFeedView({
  slug,
  churchName,
  primaryColor,
  initialEvents,
  isUserLoggedIn,
}: AgendaFeedViewProps) {
  const [filter, setFilter] = useState<"ALL" | "WEEK" | "MONTH">("ALL");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Filtragem dos eventos do lado do cliente para transição instantânea
  const filteredEvents = initialEvents.filter((ev) => {
    const eventDate = parseISO(ev.startDate);
    if (filter === "WEEK") {
      return isThisWeek(eventDate, { weekStartsOn: 0 });
    }
    if (filter === "MONTH") {
      return isThisMonth(eventDate);
    }
    return true;
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

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16">
      {/* Top Banner & Header Mobile-First */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {churchName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            <span>Agenda & Eventos</span>
          </h1>
        </div>

        {/* Link para Administrador criar evento */}
        <Link href={`/${slug}/admin/eventos`}>
          <Button
            size="sm"
            className="text-xs font-bold gap-1.5 rounded-xl h-9 px-3 shadow-md shadow-primary/20 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Criar Evento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </Link>
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
          Todos ({initialEvents.length})
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
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <article
              key={event.id}
              className="bg-card border border-border/80 rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-300 shadow-md group flex flex-col"
            >
              {/* Imagem no topo ocupando 100% da largura, sem bordas internas */}
              <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-muted/60">
                <img
                  src={
                    event.imageUrl ||
                    "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80"
                  }
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                {/* Overlay gradiente escurecendo a base da foto para contraste */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Badge Flutuante no Topo: isGlobalFeature (Destaque Geral Vibrante) */}
                {event.isGlobalFeature && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide uppercase bg-gradient-to-r from-amber-500 to-red-500 text-black shadow-lg shadow-amber-500/40 animate-pulse">
                      <Flame className="w-3.5 h-3.5 fill-black" />
                      <span>Destaque Geral</span>
                    </span>
                  </div>
                )}

                {/* Badge da Igreja Promotora (se for evento global de outra filial) */}
                {event.tenant && event.tenant.slug !== slug && (
                  <div className="absolute top-3 right-3 z-10">
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
                  <h2 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {event.title}
                  </h2>

                  {event.slogan && (
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                      {event.slogan}
                    </p>
                  )}
                </div>

                {/* Rodapé do Card com Badges e Botão Ver Detalhes */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-3">
                  {/* Badge de Visibilidade */}
                  <div>
                    {!event.isPublic && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                        <Lock className="w-3 h-3" />
                        <span>Exclusivo Membros</span>
                      </span>
                    )}
                  </div>

                  {/* Botão de Ação: Ver Detalhes */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvent(event)}
                    className="text-xs font-bold gap-1.5 h-8 px-3.5 rounded-xl hover:border-primary hover:text-primary transition-all cursor-pointer"
                  >
                    <span>Ver Detalhes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de Detalhes do Evento */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground p-0 overflow-hidden rounded-3xl">
          {selectedEvent && (
            <div>
              {/* Banner no Modal */}
              <div className="relative w-full h-40 bg-muted">
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
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-black">
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

                <div className="pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 text-xs"
                  >
                    Fechar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCalendar(selectedEvent)}
                    className="flex-1 text-xs font-bold gap-1.5 shadow-md shadow-primary/20"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Google Agenda</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
