"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  getChurchPastors,
  createPastoralAppointment,
  getMemberActivePastoralSessions,
  type PastorInfo,
} from "@/app/actions/pastoral";
import { PastoralLiveChatModal } from "@/components/pastoral-live-chat-modal";
import {
  PhoneCall,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  User,
  HeartHandshake,
  AlertCircle,
  Loader2,
  CalendarDays,
  MapPin,
  ChevronRight,
} from "lucide-react";

interface PastoralCounselingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  initialTopic?: string;
  triggerButton?: React.ReactNode;
}

export function PastoralCounselingDialog({
  isOpen,
  onClose,
  slug,
  initialTopic,
}: PastoralCounselingDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("live");
  const [pastors, setPastors] = useState<PastorInfo[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Seleção para Chamada Ao Vivo
  const [selectedPastorForLive, setSelectedPastorForLive] = useState<PastorInfo | null>(null);
  const [liveSubject, setLiveSubject] = useState<string>(initialTopic || "");
  const [liveUserName, setLiveUserName] = useState<string>("");
  const [isCallingLive, setIsCallingLive] = useState<boolean>(false);

  // Seleção para Agendamento
  const [selectedPastorForSchedule, setSelectedPastorForSchedule] = useState<PastorInfo | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [scheduleUserName, setScheduleUserName] = useState<string>("");
  const [schedulePhone, setSchedulePhone] = useState<string>("");
  const [scheduleSubject, setScheduleSubject] = useState<string>("");
  const [isBookingSchedule, setIsBookingSchedule] = useState<boolean>(false);
  const [scheduleSuccessInfo, setScheduleSuccessInfo] = useState<any>(null);

  // Sessões ativas do usuário
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Modal de Chat Ao Vivo Ativo
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState<boolean>(false);

  // Carrega pastores e sessões ao abrir
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setIsLoading(true);
      try {
        const [pastorsRes, sessionsRes] = await Promise.all([
          getChurchPastors(slug),
          getMemberActivePastoralSessions(slug),
        ]);

        if (pastorsRes.success && pastorsRes.pastors) {
          setPastors(pastorsRes.pastors);
          setOnlineCount(pastorsRes.onlineCount || 0);

          // Pré-seleciona primeiro pastor online ou o primeiro da lista
          const onlinePastor = pastorsRes.pastors.find((p) => p.isLiveAvailable);
          if (onlinePastor) {
            setSelectedPastorForLive(onlinePastor);
          } else if (pastorsRes.pastors.length > 0) {
            setSelectedPastorForLive(pastorsRes.pastors[0]);
          }

          if (pastorsRes.pastors.length > 0) {
            setSelectedPastorForSchedule(pastorsRes.pastors[0]);
          }
        }

        if (sessionsRes.success && sessionsRes.sessions) {
          setActiveSessions(sessionsRes.sessions);
        }
      } catch (err) {
        console.error("Erro ao carregar dados pastorais:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isOpen, slug]);

  // Ação de Chamar Pastor Ao Vivo
  const handleCallLive = async (pastor: PastorInfo) => {
    setIsCallingLive(true);
    try {
      const res = await createPastoralAppointment({
        slug,
        pastorId: pastor.id,
        type: "LIVE",
        userName: liveUserName || "Membro",
        subject: liveSubject || "Conversa Pastoral Ao Vivo",
        initialMessage: liveSubject ? `Olá Pastor ${pastor.name}, gostaria de conversar: ${liveSubject}` : undefined,
      });

      if (res.success && res.appointment) {
        toast.success(`Chamando ${pastor.name}...`, {
          description: "Conexão aberta! Aguardando o pastor entrar na sala.",
        });
        setActiveAppointmentId(res.appointment.id);
        setIsLiveChatOpen(true);
        onClose();
      } else {
        toast.error(res.error || "Não foi possível iniciar a chamada com o pastor.");
      }
    } catch {
      toast.error("Erro ao conectar ao atendimento pastoral.");
    } finally {
      setIsCallingLive(false);
    }
  };

  // Ação de Confirmar Agendamento Pastoral
  const handleBookSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPastorForSchedule) {
      toast.warning("Selecione um pastor para o agendamento.");
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      toast.warning("Por favor, selecione uma data e um horário disponível.");
      return;
    }
    if (!scheduleUserName.trim()) {
      toast.warning("Por favor, informe seu nome.");
      return;
    }

    setIsBookingSchedule(true);
    try {
      const res = await createPastoralAppointment({
        slug,
        pastorId: selectedPastorForSchedule.id,
        type: "SCHEDULED",
        userName: scheduleUserName,
        userPhone: schedulePhone,
        scheduledDate: scheduleDate,
        scheduledTime: scheduleTime,
        subject: scheduleSubject || "Aconselhamento Pastoral",
        initialMessage: scheduleSubject ? `Agendamento marcado com o assunto: ${scheduleSubject}` : undefined,
      });

      if (res.success && res.appointment) {
        toast.success("Atendimento agendado com sucesso!");
        setScheduleSuccessInfo({
          pastorName: selectedPastorForSchedule.name,
          date: scheduleDate,
          time: scheduleTime,
          userName: scheduleUserName,
        });
      } else {
        toast.error(res.error || "Erro ao agendar horário.");
      }
    } catch {
      toast.error("Erro ao processar agendamento.");
    } finally {
      setIsBookingSchedule(false);
    }
  };

  const onlinePastors = pastors.filter((p) => p.isLiveAvailable);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/80 shadow-2xl">
          {/* Header */}
          <div className="px-6 py-4 bg-muted/40 border-b border-border/60 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <HeartHandshake className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    Atendimento Pastoral Direto
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Cuidado, oração e aconselhamento bíblico sigiloso
                  </DialogDescription>
                </div>
              </div>

              {onlineCount > 0 ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {onlineCount} {onlineCount === 1 ? "Pastor Ao Vivo" : "Pastores Ao Vivo"}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  Atendimento via Agenda
                </span>
              )}
            </div>
          </div>

          {/* Abas: Ao Vivo / Agenda / Meus Atendimentos */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-6 pt-3 shrink-0">
              <TabsList className="grid grid-cols-3 w-full h-10 bg-muted/80 p-1 rounded-xl">
                <TabsTrigger
                  value="live"
                  className="text-xs font-semibold data-active:bg-background data-active:text-foreground rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Ao Vivo</span>
                  {onlineCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="schedule"
                  className="text-xs font-semibold data-active:bg-background data-active:text-foreground rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Agenda</span>
                </TabsTrigger>
                <TabsTrigger
                  value="my-sessions"
                  className="text-xs font-semibold data-active:bg-background data-active:text-foreground rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Em Andamento</span>
                  {activeSessions.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-primary text-primary-foreground font-black">
                      {activeSessions.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Conteúdo com Scroll Interno */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs">Consultando disponibilidade dos pastores...</p>
                </div>
              ) : (
                <>
                  {/* ========================================================================= */}
                  {/* ABA 1: ATENDIMENTO AO VIVO                                                */}
                  {/* ========================================================================= */}
                  <TabsContent value="live" className="space-y-4 m-0 outline-none">
                    {onlinePastors.length > 0 ? (
                      <div className="space-y-3">
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3.5 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-foreground">
                              Pastores disponíveis para atendimento agora
                            </h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Selecione um pastor abaixo para chamar e abrir um diálogo em tempo real com sigilo e acolhimento.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {onlinePastors.map((pastor) => (
                            <div
                              key={pastor.id}
                              className="border border-border/80 bg-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition-all shadow-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative shrink-0">
                                  <Avatar className="h-12 w-12 ring-2 ring-emerald-500/40">
                                    {pastor.avatarUrl && (
                                      <AvatarImage src={pastor.avatarUrl} alt={pastor.name} />
                                    )}
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                      {pastor.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full animate-pulse" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-foreground truncate">
                                      {pastor.name}
                                    </h4>
                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                                      Online Agora
                                    </span>
                                  </div>
                                  <p className="text-xs text-primary font-medium">
                                    {pastor.pastoralTitle}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                    {pastor.pastoralBio}
                                  </p>
                                </div>
                              </div>

                              <Button
                                size="sm"
                                disabled={isCallingLive}
                                onClick={() => handleCallLive(pastor)}
                                className="h-9 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 shrink-0 cursor-pointer flex items-center gap-2"
                              >
                                {isCallingLive ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <PhoneCall className="w-3.5 h-3.5" />
                                )}
                                <span>Chamar para Conversar</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 px-4 space-y-4 bg-muted/30 border border-border/60 rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-foreground">
                            Nenhum pastor está com atendimento ao vivo no momento
                          </h4>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                            Nossos pastores têm dias e horários fixos de atendimento no gabinete pastoral. Você pode agendar um horário na aba de Agenda ou continuar conversando com o Mentor de IA.
                          </p>
                        </div>
                        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setActiveTab("schedule")}
                            className="rounded-xl text-xs font-bold gap-1.5"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Ver Agenda de Atendimento</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="rounded-xl text-xs"
                          >
                            Continuar com IA
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Nota de Sigilo */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Todo atendimento pastoral é estritamente confidencial e bíblico.</span>
                    </div>
                  </TabsContent>

                  {/* ========================================================================= */}
                  {/* ABA 2: AGENDA DE ATENDIMENTO PASTORAL                                     */}
                  {/* ========================================================================= */}
                  <TabsContent value="schedule" className="space-y-4 m-0 outline-none">
                    {scheduleSuccessInfo ? (
                      <div className="text-center py-8 px-4 space-y-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-foreground">
                            Atendimento Agendado com Sucesso!
                          </h4>
                          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Seu horário com o <strong className="text-foreground">{scheduleSuccessInfo.pastorName}</strong> foi reservado para o dia{" "}
                            <strong className="text-foreground">{scheduleSuccessInfo.date}</strong> às{" "}
                            <strong className="text-foreground">{scheduleSuccessInfo.time}</strong>.
                          </p>
                        </div>
                        <div className="pt-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setScheduleSuccessInfo(null);
                              setActiveTab("my-sessions");
                            }}
                            className="rounded-xl text-xs font-bold"
                          >
                            Ver Meus Atendimentos
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleBookSchedule} className="space-y-4">
                        {/* Seletor do Pastor */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground block">
                            Selecione o Pastor:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {pastors.map((p) => {
                              const isSelected = selectedPastorForSchedule?.id === p.id;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPastorForSchedule(p);
                                    setScheduleTime("");
                                  }}
                                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                                    isSelected
                                      ? "border-primary bg-primary/10 shadow-xs"
                                      : "border-border bg-card hover:border-primary/40"
                                  }`}
                                >
                                  <Avatar className="h-9 w-9 ring-1 ring-primary/20 shrink-0">
                                    {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.name} />}
                                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                      {p.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-foreground truncate">
                                      {p.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {p.pastoralTitle}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Grade de Dias e Horários da Agenda do Pastor Selecionado */}
                        {selectedPastorForSchedule && (
                          <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="w-4 h-4 text-primary" />
                                Horários de Atendimento da Semana
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {selectedPastorForSchedule.pastoralScheduleConfig?.location || "Gabinete Pastoral"}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {selectedPastorForSchedule.pastoralScheduleConfig?.days.map((d) => (
                                <div
                                  key={d.day}
                                  className="text-xs border border-border/60 rounded-xl p-2.5 bg-background/80"
                                >
                                  <div className="flex items-center justify-between font-bold text-foreground mb-1.5">
                                    <span>{d.label}</span>
                                    <span className="text-[10px] font-normal text-muted-foreground">
                                      {d.start} às {d.end}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {d.slots.map((slot) => {
                                      const isSlotSelected = scheduleTime === slot;
                                      return (
                                        <button
                                          key={slot}
                                          type="button"
                                          onClick={() => setScheduleTime(slot)}
                                          className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                                            isSlotSelected
                                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                              : "bg-muted hover:bg-primary/20 text-foreground border border-border/60"
                                          }`}
                                        >
                                          {slot}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dados do Solicitante */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground block">
                              Data Desejada:
                            </label>
                            <Input
                              type="date"
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              className="h-10 text-xs rounded-xl"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground block">
                              Horário Selecionado:
                            </label>
                            <Input
                              type="text"
                              value={scheduleTime}
                              readOnly
                              placeholder="Clique em um horário acima"
                              className="h-10 text-xs rounded-xl bg-muted/60"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground block">
                              Seu Nome Completo:
                            </label>
                            <Input
                              type="text"
                              value={scheduleUserName}
                              onChange={(e) => setScheduleUserName(e.target.value)}
                              placeholder="Ex: Carlos Silva"
                              className="h-10 text-xs rounded-xl"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-foreground block">
                              WhatsApp / Telefone para contato:
                            </label>
                            <Input
                              type="text"
                              value={schedulePhone}
                              onChange={(e) => setSchedulePhone(e.target.value)}
                              placeholder="(00) 00000-0000"
                              className="h-10 text-xs rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground block">
                            Assunto / Motivo (Sigiloso):
                          </label>
                          <Textarea
                            value={scheduleSubject}
                            onChange={(e) => setScheduleSubject(e.target.value)}
                            placeholder="Descreva brevemente o motivo do aconselhamento..."
                            className="text-xs rounded-xl resize-none h-18"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={isBookingSchedule || !scheduleDate || !scheduleTime || !scheduleUserName}
                          className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-md"
                        >
                          {isBookingSchedule ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span>Confirmar Agendamento Pastoral</span>
                        </Button>
                      </form>
                    )}
                  </TabsContent>

                  {/* ========================================================================= */}
                  {/* ABA 3: MEUS ATENDIMENTOS                                                  */}
                  {/* ========================================================================= */}
                  <TabsContent value="my-sessions" className="space-y-3 m-0 outline-none">
                    {activeSessions.length > 0 ? (
                      <div className="space-y-2.5">
                        {activeSessions.map((s) => (
                          <div
                            key={s.id}
                            className="border border-border rounded-2xl p-4 bg-card flex items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 ring-1 ring-primary/20 shrink-0">
                                {s.pastor?.avatarUrl && (
                                  <AvatarImage src={s.pastor.avatarUrl} alt={s.pastor.name} />
                                )}
                                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                  {s.pastor?.name ? s.pastor.name.charAt(0) : "P"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-foreground truncate">
                                  {s.pastor?.name}
                                </h4>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {s.type === "LIVE" ? "Conversa Ao Vivo" : `Agendado para ${s.scheduledDate || "Data a confirmar"}`}
                                </p>
                                <span className="inline-block mt-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                  {s.status === "WAITING" ? "Aguardando Pastor" : "Em Andamento"}
                                </span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => {
                                setActiveAppointmentId(s.id);
                                setIsLiveChatOpen(true);
                                onClose();
                              }}
                              className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-1"
                            >
                              <span>Entrar no Chat</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        Você não possui atendimentos pastorais pendentes no momento.
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal de Chat Ao Vivo quando ativado */}
      <PastoralLiveChatModal
        isOpen={isLiveChatOpen}
        onClose={() => setIsLiveChatOpen(false)}
        appointmentId={activeAppointmentId}
      />
    </>
  );
}
