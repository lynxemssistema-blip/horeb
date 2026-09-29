"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Ticket,
  CreditCard,
  User,
  Mail,
  Calendar,
  Clock,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { purchaseTickets } from "@/app/actions/tickets";

interface EventData {
  id: string;
  title: string;
  slogan: string | null;
  description: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string | null;
  isPaid: boolean;
  price: number;
}

interface TicketCheckoutViewProps {
  slug: string;
  churchName: string;
  primaryColor: string;
  event: EventData;
  initialBuyerEmail: string;
  initialBuyerName: string;
}

export function TicketCheckoutView({
  slug,
  churchName,
  primaryColor,
  event,
  initialBuyerEmail,
  initialBuyerName,
}: TicketCheckoutViewProps) {
  const router = useRouter();

  const [quantity, setQuantity] = useState<number>(1);
  const [buyerEmail, setBuyerEmail] = useState<string>(initialBuyerEmail);
  const [guestNames, setGuestNames] = useState<string[]>([
    initialBuyerName || "",
    "",
    "",
    "",
    "",
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGuestNameChange = (index: number, value: string) => {
    setGuestNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const totalPrice = event.isPaid ? event.price * quantity : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerEmail.trim()) {
      toast.error("Por favor, informe seu e-mail para receber os ingressos.");
      return;
    }

    const currentGuests = guestNames.slice(0, quantity);
    for (let i = 0; i < currentGuests.length; i++) {
      if (!currentGuests[i]?.trim()) {
        toast.error(`Por favor, preencha o nome do participante ${i + 1}.`);
        return;
      }
    }

    try {
      setIsLoading(true);
      const res = await purchaseTickets(
        event.id,
        quantity,
        currentGuests.map((g) => g.trim()),
        buyerEmail.trim()
      );

      if (res.success) {
        toast.success("Ingressos comprados e enviados para seu e-mail!");
        router.push(`/${slug}/meus-ingressos`);
      } else {
        toast.error(res.error || "Falha ao processar compra de ingressos.");
      }
    } catch (err: any) {
      toast.error("Erro no processamento: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-16">
      {/* Botão Voltar */}
      <Link
        href={`/${slug}/agenda`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para a Agenda</span>
      </Link>

      {/* Card do Resumo do Evento */}
      <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-lg">
        {event.imageUrl && (
          <div className="relative w-full h-40 bg-muted">
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground shadow-md inline-block mb-1">
                {event.isPaid ? `R$ ${event.price.toFixed(2)} / ingresso` : "Inscrição Gratuita"}
              </span>
              <h1 className="text-lg font-black text-white leading-tight">{event.title}</h1>
            </div>
          </div>
        )}

        <div className="p-4 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span>
              {(() => {
                try {
                  return format(parseISO(event.startDate), "EEEE, dd 'de' MMMM 'às' HH:mm", {
                    locale: ptBR,
                  });
                } catch {
                  return event.startDate;
                }
              })()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>{churchName}</span>
          </div>
        </div>
      </div>

      {/* Formulário de Bilheteria & Checkout */}
      <form onSubmit={handleSubmit} className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              <span>Emissão de Ingressos</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Credenciais protegidas por QR Code nominal antifraude.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20">
            {event.isPaid ? "Ingresso Pago" : "Gratuito / RSVP"}
          </span>
        </div>

        {/* 1. Quantidade de Ingressos (1 a 5) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground block">
            Quantidade de Ingressos (Máx: 5)
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setQuantity(num)}
                className={`h-11 rounded-2xl font-black text-sm transition-all cursor-pointer ${
                  quantity === num
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.03]"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* 2. E-mail do Comprador */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground block flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-primary" />
            <span>Seu E-mail (Receberá os QR Codes) *</span>
          </label>
          <Input
            type="email"
            placeholder="seuemail@exemplo.com"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            required
            className="h-10 text-sm rounded-xl bg-background"
          />
        </div>

        {/* 3. Formulário Dinâmico de Nomes dos Convidados */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-foreground block flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Nome dos Participantes (Credenciais)</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {quantity} {quantity === 1 ? "credencial" : "credenciais"}
            </span>
          </label>

          <div className="space-y-2.5">
            {Array.from({ length: quantity }).map((_, idx) => (
              <div key={idx} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary w-5 text-center">
                  #{idx + 1}
                </span>
                <Input
                  placeholder={`Nome completo do convidado ${idx + 1}`}
                  value={guestNames[idx] || ""}
                  onChange={(e) => handleGuestNameChange(idx, e.target.value)}
                  required
                  className="h-10 text-sm pl-9 rounded-xl bg-background"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>
              {quantity}x {event.title}
            </span>
            <span>{event.isPaid ? `R$ ${(event.price * quantity).toFixed(2)}` : "Gratuito"}</span>
          </div>
          <div className="flex justify-between font-black text-sm text-foreground pt-1 border-t border-border/40">
            <span>Total a Pagar</span>
            <span className="text-primary font-black text-base">
              {event.isPaid ? `R$ ${totalPrice.toFixed(2)}` : "R$ 0,00"}
            </span>
          </div>
        </div>

        {/* Botão de Finalização */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-2xl font-black text-sm shadow-xl shadow-primary/25 gap-2 cursor-pointer bg-primary text-primary-foreground hover:opacity-95"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processando Bilheteria & Gerando QR Codes...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>
                {event.isPaid
                  ? `Finalizar Compra • R$ ${totalPrice.toFixed(2)}`
                  : "Confirmar Inscrição Gratuita"}
              </span>
            </>
          )}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ingressos emitidos com criptografia e QR Code nominal antifraude.</span>
        </p>
      </form>
    </div>
  );
}
