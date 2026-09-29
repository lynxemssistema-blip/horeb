"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Ticket,
  Copy,
  Check,
  Calendar,
  Clock,
  Building2,
  User,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  QrCode,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserTickets } from "@/app/actions/tickets";

export interface TicketItem {
  id: string;
  eventId: string;
  buyerEmail: string;
  guestName: string;
  status: string; // VALID, USED, CANCELLED
  createdAt: string;
  event: {
    id: string;
    title: string;
    slogan: string | null;
    imageUrl: string | null;
    startDate: string;
    endDate: string | null;
    isPaid: boolean;
    price: number | null;
    tenant?: {
      name: string;
      slug: string;
      primaryColor: string;
    };
  };
}

interface UserTicketsWalletViewProps {
  slug: string;
  churchName: string;
  primaryColor: string;
  userEmail: string;
  userName: string;
  initialTickets: TicketItem[];
}

export function UserTicketsWalletView({
  slug,
  churchName,
  primaryColor,
  userEmail,
  userName,
  initialTickets,
}: UserTicketsWalletViewProps) {
  const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);
  const [filter, setFilter] = useState<"ALL" | "VALID" | "USED">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopyCode = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Código UUID copiado para teste na Catraca!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await getUserTickets(userEmail);
      if (res.success && res.tickets) {
        setTickets(res.tickets as TicketItem[]);
        toast.success("Carteira atualizada!");
      }
    } catch {
      toast.error("Erro ao atualizar ingressos.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (filter === "VALID") return t.status === "VALID";
    if (filter === "USED") return t.status === "USED";
    return true;
  });

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* Header com Navegação */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <Link
            href={`/${slug}/agenda`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Agenda</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            <span>Minha Carteira de Ingressos</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Apresente o QR Code na portaria da igreja para liberação do acesso.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-xl h-9 px-3 gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
          title="Atualizar Ingressos"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      {/* Filtros em Pills */}
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
          Todos ({tickets.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("VALID")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            filter === "VALID"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Disponíveis ({tickets.filter((t) => t.status === "VALID").length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("USED")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            filter === "USED"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
              : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Já Utilizados ({tickets.filter((t) => t.status === "USED").length})
        </button>
      </div>

      {/* Lista de Ingressos Estilo "Bilhete Aéreo / Passagem" */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-border rounded-3xl bg-card/40 space-y-3">
          <Ticket className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <h3 className="text-base font-bold text-foreground">Nenhum ingresso encontrado</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Quando você garantir ingressos para os eventos da igreja, seus bilhetes com QR Code
            aparecerão aqui.
          </p>
          <Link href={`/${slug}/agenda`} className="inline-block pt-2">
            <Button size="sm" className="text-xs font-bold rounded-xl shadow-md">
              Explorar Agenda de Eventos
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredTickets.map((ticket) => {
            const isUsed = ticket.status === "USED";
            const isValid = ticket.status === "VALID";

            return (
              <div
                key={ticket.id}
                className="relative bg-card border border-border/80 rounded-3xl overflow-hidden shadow-2xl transition-all group"
              >
                {/* Linha decorativa no topo */}
                <div
                  className={`h-2 w-full ${
                    isValid
                      ? "bg-gradient-to-r from-emerald-500 via-primary to-emerald-500"
                      : "bg-gradient-to-r from-zinc-600 via-zinc-700 to-zinc-600"
                  }`}
                />

                {/* Seção Superior do Bilhete: Detalhes do Evento */}
                <div className="p-5 sm:p-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                        {ticket.event.tenant?.name || churchName}
                      </span>
                      <h2 className="text-lg sm:text-xl font-black text-foreground leading-snug">
                        {ticket.event.title}
                      </h2>
                      {ticket.event.slogan && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium line-clamp-1">
                          {ticket.event.slogan}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isValid ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Válido p/ Entrada</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide bg-red-500/15 text-red-400 border border-red-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span>Já Utilizado</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações do Convidado e Data */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Participante
                      </span>
                      <span className="font-black text-foreground text-sm flex items-center gap-1.5 mt-0.5 truncate">
                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{ticket.guestName}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Data & Horário
                      </span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5 truncate">
                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">
                          {(() => {
                            try {
                              return format(
                                parseISO(ticket.event.startDate),
                                "dd/MM/yyyy 'às' HH:mm",
                                { locale: ptBR }
                              );
                            } catch {
                              return ticket.event.startDate;
                            }
                          })()}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linha Picotada com Entalhes Laterais (Efeito Ticket Passagem) */}
                <div className="relative flex items-center justify-between px-3 py-1">
                  {/* Entalhe circular esquerdo */}
                  <div className="w-5 h-5 -ml-6 rounded-full bg-background border-r border-border/80" />
                  {/* Linha tracejada pontilhada */}
                  <div className="flex-1 border-b-2 border-dashed border-border/80 mx-2" />
                  {/* Entalhe circular direito */}
                  <div className="w-5 h-5 -mr-6 rounded-full bg-background border-l border-border/80" />
                </div>

                {/* Seção Inferior do Bilhete: QR Code e Código UUID */}
                <div className="p-5 sm:p-6 flex flex-col items-center justify-center text-center space-y-3 bg-muted/20">
                  {/* QR Code Container */}
                  <div className="relative p-3.5 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                    <QRCodeSVG
                      value={ticket.id}
                      size={180}
                      level="H"
                      includeMargin={false}
                      className={`transition-opacity duration-300 ${
                        isUsed ? "opacity-30 filter grayscale" : "opacity-100"
                      }`}
                    />

                    {/* Overlay de Bloqueio se o Ingresso já foi Utilizado */}
                    {isUsed && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl p-2 backdrop-blur-[2px]">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-red-600 text-white shadow-lg shadow-red-600/40">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Já Utilizado</span>
                        </span>
                        <p className="text-[10px] text-zinc-300 mt-1 font-semibold">
                          Acesso Validado
                        </p>
                      </div>
                    )}
                  </div>

                  {/* UUID em Texto com Botão de Copiar */}
                  <div className="w-full max-w-sm space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                      Código UUID do Ingresso
                    </span>
                    <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-background border border-border/70 text-xs font-mono">
                      <span className="truncate text-foreground font-semibold">{ticket.id}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(ticket.id)}
                        className="h-7 px-2 text-xs font-bold gap-1 text-primary hover:bg-primary/10 rounded-lg cursor-pointer shrink-0"
                        title="Copiar código para validar na Catraca"
                      >
                        {copiedId === ticket.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Validação única por portaria. O ingresso perde a validade após o uso.</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
