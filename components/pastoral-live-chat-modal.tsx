"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  getPastoralAppointment,
  sendPastoralMessage,
  updatePastoralAppointmentStatus,
} from "@/app/actions/pastoral";
import {
  Send,
  Loader2,
  PhoneCall,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  User,
  HeartHandshake,
} from "lucide-react";

interface PastoralLiveChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string | null;
  currentUserId?: string;
  isPastorUser?: boolean;
}

export function PastoralLiveChatModal({
  isOpen,
  onClose,
  appointmentId,
  currentUserId,
  isPastorUser = false,
}: PastoralLiveChatModalProps) {
  const [appointment, setAppointment] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega e atualiza o atendimento periodicamente (polling a cada 3.5s)
  useEffect(() => {
    if (!isOpen || !appointmentId) return;

    let isMounted = true;

    async function loadData(showLoading = false) {
      if (showLoading) setIsLoading(true);
      try {
        const res = await getPastoralAppointment(appointmentId!);
        if (res.success && res.appointment && isMounted) {
          setAppointment(res.appointment);
          setMessages(res.appointment.messages || []);
        }
      } catch (e) {
        console.error("Erro ao sincronizar atendimento pastoral:", e);
      } finally {
        if (showLoading && isMounted) setIsLoading(false);
      }
    }

    loadData(true);
    const interval = setInterval(() => loadData(false), 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, appointmentId]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !appointmentId || isSending) return;

    const textToSend = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    try {
      const res = await sendPastoralMessage(appointmentId, textToSend);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
      } else {
        toast.error(res.error || "Erro ao enviar mensagem.");
        setInputMessage(textToSend);
      }
    } catch {
      toast.error("Falha ao comunicar com o servidor.");
      setInputMessage(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleConcludeSession = async () => {
    if (!appointmentId) return;
    try {
      await updatePastoralAppointmentStatus(appointmentId, "COMPLETED");
      toast.success("Atendimento pastoral finalizado com sucesso.");
      onClose();
    } catch {
      toast.error("Erro ao finalizar atendimento.");
    }
  };

  if (!isOpen) return null;

  const pastor = appointment?.pastor;
  const isWaiting = appointment?.status === "WAITING";
  const isCompleted = appointment?.status === "COMPLETED";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] h-[650px] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/80 shadow-2xl">
        {/* Header do Chat Pastoral */}
        <div className="px-5 py-3.5 bg-muted/60 border-b border-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                {pastor?.avatarUrl && <AvatarImage src={pastor.avatarUrl} alt={pastor.name} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {pastor?.name ? pastor.name.charAt(0) : "P"}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full animate-pulse" />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">
                {pastor?.name || "Pastor Responsável"}
              </h3>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                <span className="text-emerald-500 font-semibold">● Ao Vivo</span>
                <span>•</span>
                <span>{pastor?.pastoralTitle || "Atendimento Pastoral"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleConcludeSession}
              className="text-[11px] h-7 px-2.5 rounded-lg border-border hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              Concluir
            </Button>
          </div>
        </div>

        {/* Banner de Status / Sigilo */}
        <div className="bg-primary/5 border-b border-primary/10 px-4 py-1.5 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
          <span className="flex items-center gap-1 text-primary font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Aconselhamento protegido por sigilo pastoral
          </span>
          {isWaiting && (
            <span className="flex items-center gap-1 text-amber-500 font-medium">
              <Clock className="w-3 h-3 animate-spin" />
              Aguardando resposta...
            </span>
          )}
        </div>

        {/* Área de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Conectando ao pastor...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Conexão Pastoral Estabelecida</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Você está em uma sala privada com o {pastor?.name || "Pastor"}. Envie sua mensagem, dúvida ou pedido de oração abaixo para começar.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = isPastorUser
                ? m.senderRole === "PASTOR"
                : m.senderRole === "MEMBER";

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] text-muted-foreground px-1 mb-0.5">
                    {m.senderName} • {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                        : "bg-muted border border-border/80 text-foreground rounded-tl-xs"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-card border-t border-border/60 shrink-0">
          {isCompleted ? (
            <div className="text-center py-2 text-xs text-muted-foreground">
              Este atendimento pastoral foi encerrado.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escreva sua mensagem para o pastor..."
                disabled={isSending}
                className="h-10 text-xs sm:text-sm rounded-xl bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputMessage.trim() || isSending}
                className="h-10 px-4 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer shadow-md"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
