"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Scan,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ArrowLeft,
  Loader2,
  X,
  History,
  AlertTriangle,
  QrCode,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateDoorTicket } from "@/app/actions/tickets";

interface CheckinHistoryItem {
  id: string;
  code: string;
  status: "SUCCESS" | "DENIED";
  message: string;
  guestName?: string;
  eventTitle?: string;
  timestamp: Date;
}

interface DoorScannerViewProps {
  slug: string;
  churchName: string;
  primaryColor: string;
  validatorName: string;
}

export function DoorScannerView({
  slug,
  churchName,
  primaryColor,
  validatorName,
}: DoorScannerViewProps) {
  const [ticketCode, setTicketCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Estados de Feedback Extremo de Segurança
  const [successState, setSuccessState] = useState<{
    visible: boolean;
    guestName?: string;
    eventTitle?: string;
    message: string;
  } | null>(null);

  const [errorState, setErrorState] = useState<{
    visible: boolean;
    guestName?: string;
    eventTitle?: string;
    message: string;
  } | null>(null);

  const [history, setHistory] = useState<CheckinHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Mantém o input focado para leitura contínua com leitor ótico
  useEffect(() => {
    inputRef.current?.focus();
  }, [successState, errorState]);

  // Limpa o sucesso automaticamente após 3 segundos
  useEffect(() => {
    if (successState?.visible) {
      const timer = setTimeout(() => {
        setSuccessState(null);
        setTicketCode("");
        inputRef.current?.focus();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successState]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = ticketCode.trim();
    if (!code) return;

    try {
      setIsValidating(true);
      const res = await validateDoorTicket(code);

      if (res.success) {
        // FEEDBACK EXTREMO DE SUCESSO (Verde)
        setSuccessState({
          visible: true,
          guestName: res.guestName,
          eventTitle: res.eventTitle,
          message: res.message || "Acesso Liberado",
        });
        setErrorState(null);

        setHistory((prev) => [
          {
            id: Math.random().toString(),
            code,
            status: "SUCCESS",
            message: res.message || "Acesso Liberado",
            guestName: res.guestName,
            eventTitle: res.eventTitle,
            timestamp: new Date(),
          },
          ...prev.slice(0, 19),
        ]);
      } else {
        // FEEDBACK EXTREMO DE BLOQUEIO / FRAUDE (Vermelho)
        setErrorState({
          visible: true,
          guestName: res.guestName,
          eventTitle: res.eventTitle,
          message: res.message || "Acesso Negado",
        });
        setSuccessState(null);

        setHistory((prev) => [
          {
            id: Math.random().toString(),
            code,
            status: "DENIED",
            message: res.message || "Acesso Negado",
            guestName: res.guestName,
            eventTitle: res.eventTitle,
            timestamp: new Date(),
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (err: any) {
      setErrorState({
        visible: true,
        message: "Erro de conexão: " + (err.message || "Erro no servidor"),
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex flex-col justify-between max-w-2xl mx-auto space-y-8 pb-16">
      {/* 1. OVERLAY DE TELA CHEIA - SUCESSO (VERDE VIBRANTE) */}
      {successState?.visible && (
        <div className="fixed inset-0 z-50 bg-emerald-500 text-black flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
          <div className="w-28 h-28 rounded-full bg-black/15 flex items-center justify-center mb-6 shadow-2xl animate-bounce">
            <CheckCircle2 className="w-20 h-20 text-black" strokeWidth={2.5} />
          </div>

          <span className="text-sm font-black uppercase tracking-widest bg-black text-white px-4 py-1 rounded-full mb-3 shadow-lg">
            Portaria Autorizada
          </span>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-black mb-2">
            ACESSO LIBERADO!
          </h1>

          <div className="mt-4 p-5 rounded-3xl bg-black/10 border border-black/15 max-w-md w-full backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-black/70 mb-1">
              Participante
            </p>
            <p className="text-2xl font-black text-black break-words">
              {successState.guestName || "Convidado Confirmado"}
            </p>
            {successState.eventTitle && (
              <p className="text-xs font-semibold text-black/80 mt-2 border-t border-black/10 pt-2">
                Evento: {successState.eventTitle}
              </p>
            )}
          </div>

          <p className="text-xs font-bold text-black/75 mt-8">
            Ingresso validado e baixado no sistema. Retornando ao scanner em 3 segundos...
          </p>
        </div>
      )}

      {/* 2. OVERLAY DE TELA CHEIA - ERRO / FRAUDE (VERMELHO VIBRANTE) */}
      {errorState?.visible && (
        <div className="fixed inset-0 z-50 bg-red-600 text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
          <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-6 shadow-2xl animate-pulse">
            <ShieldAlert className="w-20 h-20 text-white" strokeWidth={2.5} />
          </div>

          <span className="text-sm font-black uppercase tracking-widest bg-black text-red-400 px-4 py-1 rounded-full mb-3 shadow-lg">
            Alerta de Segurança
          </span>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
            ACESSO NEGADO!
          </h1>

          <div className="mt-4 p-5 rounded-3xl bg-black/30 border border-white/20 max-w-md w-full backdrop-blur-md space-y-2">
            <p className="text-sm sm:text-base font-black text-red-200">
              {errorState.message}
            </p>
            {errorState.guestName && (
              <p className="text-xs text-white/90">
                Nome no Ingresso: <span className="font-bold underline">{errorState.guestName}</span>
              </p>
            )}
            {errorState.eventTitle && (
              <p className="text-xs text-white/70">
                Evento: {errorState.eventTitle}
              </p>
            )}
          </div>

          {/* Botão de Fechar Obrigatório */}
          <Button
            type="button"
            size="lg"
            onClick={() => {
              setErrorState(null);
              setTicketCode("");
              inputRef.current?.focus();
            }}
            className="mt-8 bg-black hover:bg-black/80 text-white font-black text-sm h-14 px-8 rounded-2xl shadow-2xl cursor-pointer gap-2"
          >
            <X className="w-5 h-5" />
            <span>Fechar e Continuar Trabalhando</span>
          </Button>
        </div>
      )}

      {/* Top Header */}
      <div className="space-y-2 pt-1">
        <Link
          href={`/${slug}/agenda`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Agenda</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Scan className="w-7 h-7 text-primary" />
              <span>Scanner da Portaria (Catraca)</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Validação ótica antifraude e controle de entrada em tempo real.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
              Operador
            </span>
            <span className="text-xs font-bold text-foreground">{validatorName}</span>
          </div>
        </div>
      </div>

      {/* Formulário Centralizado com Input Gigante */}
      <form onSubmit={handleValidate} className="space-y-4">
        <div className="bg-card border-2 border-primary/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <QrCode className="w-32 h-32 text-primary" />
          </div>

          <label className="block text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            <span>Leitor Ótico / Código UUID do Ingresso</span>
          </label>

          {/* Input Gigante Centralizado */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Cole o Código UUID do Ingresso aqui..."
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value)}
              disabled={isValidating}
              autoFocus
              className="h-16 text-base sm:text-lg font-mono text-center rounded-2xl bg-background border-2 border-border focus-visible:border-primary shadow-inner px-4 tracking-wider"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="submit"
              disabled={isValidating || !ticketCode.trim()}
              className="flex-1 h-14 rounded-2xl font-black text-base shadow-xl shadow-primary/25 gap-2 bg-primary text-primary-foreground hover:opacity-95 cursor-pointer"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validando Ingresso na Catraca...</span>
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5" />
                  <span>Validar Entrada</span>
                </>
              )}
            </Button>

            {ticketCode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTicketCode("");
                  inputRef.current?.focus();
                }}
                className="h-14 px-4 rounded-2xl text-xs font-bold"
              >
                Limpar
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Compatível com leitores óticos de código de barras e pistola USB/Bluetooth.</span>
          </p>
        </div>
      </form>

      {/* Histórico das Últimas Validações nesta Sessão */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-primary" />
          <span>Últimas Leituras da Sessão ({history.length})</span>
        </h3>

        {history.length === 0 ? (
          <div className="p-5 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
            Nenhum ingresso escaneado ainda nesta sessão da portaria.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                  item.status === "SUCCESS"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.status === "SUCCESS" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold truncate text-foreground">
                      {item.guestName ? `${item.guestName} • ` : ""}
                      {item.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {item.code}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{format(item.timestamp, "HH:mm:ss")}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
