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
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  getPastoralCabinetData,
  togglePastorLiveAvailability,
  updatePastorScheduleConfig,
  updatePastoralAppointmentStatus,
  type PastorScheduleConfig,
} from "@/app/actions/pastoral";
import { PastoralLiveChatModal } from "@/components/pastoral-live-chat-modal";
import {
  PhoneCall,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Settings,
  ShieldCheck,
  User,
  HeartHandshake,
  Loader2,
  CalendarDays,
  Bell,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface PastoralCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
}

export function PastoralCabinetModal({
  isOpen,
  onClose,
  slug,
}: PastoralCabinetModalProps) {
  const [activeTab, setActiveTab] = useState<string>("live-queue");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [isTogglingLive, setIsTogglingLive] = useState<boolean>(false);

  // Edição de Configuração de Agenda
  const [pastoralTitle, setPastoralTitle] = useState("");
  const [pastoralBio, setPastoralBio] = useState("");
  const [pastoralPhone, setPastoralPhone] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Chat Ao Vivo Ativo pelo Pastor
  const [activeChatAppointmentId, setActiveChatAppointmentId] = useState<string | null>(null);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);

  const loadData = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await getPastoralCabinetData(slug);
      if (res.success) {
        setData(res);
        if (res.pastor) {
          setPastoralTitle(res.pastor.pastoralTitle || "Pastor Titular");
          setPastoralBio(res.pastor.pastoralBio || "");
          setPastoralPhone(res.pastor.pastoralPhone || "");
        }
      }
    } catch (e) {
      console.error("Erro ao carregar gabinete pastoral:", e);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    loadData(true);
    // Polling a cada 4s para verificar se chegou nova chamada ao vivo
    const interval = setInterval(() => loadData(false), 4000);
    return () => clearInterval(interval);
  }, [isOpen, slug]);

  // Alternar Disponibilidade Ao Vivo (Online/Offline)
  const handleToggleLive = async (checked: boolean) => {
    setIsTogglingLive(true);
    try {
      const res = await togglePastorLiveAvailability(slug, checked);
      if (res.success) {
        toast.success(res.message);
        loadData(false);
      } else {
        toast.error(res.error || "Não foi possível alterar a disponibilidade.");
      }
    } catch {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsTogglingLive(false);
    }
  };

  // Atender chamada ao vivo
  const handleAnswerCall = async (appointmentId: string) => {
    try {
      await updatePastoralAppointmentStatus(appointmentId, "IN_PROGRESS");
      setActiveChatAppointmentId(appointmentId);
      setIsLiveChatOpen(true);
      loadData(false);
    } catch {
      toast.error("Erro ao iniciar atendimento.");
    }
  };

  // Salvar configurações de agenda
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.pastor) return;

    setIsSavingConfig(true);
    try {
      let currentSchedule: PastorScheduleConfig = data.pastor.pastoralScheduleConfig
        ? (typeof data.pastor.pastoralScheduleConfig === "string"
            ? JSON.parse(data.pastor.pastoralScheduleConfig)
            : data.pastor.pastoralScheduleConfig)
        : {
            activeDays: ["TERCA", "QUINTA", "SEXTA"],
            days: [
              { day: "TERCA", label: "Terça-feira", start: "14:00", end: "18:00", slots: ["14:00", "14:40", "15:20", "16:00", "16:40", "17:20"] },
              { day: "QUINTA", label: "Quinta-feira", start: "09:00", end: "12:00", slots: ["09:00", "09:40", "10:20", "11:00", "11:40"] },
              { day: "SEXTA", label: "Sexta-feira", start: "14:00", end: "17:00", slots: ["14:00", "14:40", "15:20", "16:00", "16:40"] },
            ],
            slotDurationMinutes: 40,
            modalities: ["ONLINE_CHAT", "PRESENCIAL"],
            location: "Gabinete Pastoral - Templo Central",
          };

      const res = await updatePastorScheduleConfig({
        slug,
        pastorId: data.pastor.id,
        pastoralTitle,
        pastoralBio,
        pastoralPhone,
        scheduleConfig: currentSchedule,
      });

      if (res.success) {
        toast.success(res.message);
        loadData(false);
      } else {
        toast.error(res.error || "Erro ao salvar perfil.");
      }
    } catch {
      toast.error("Erro ao atualizar dados.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const isLive = !!data?.pastor?.isLiveAvailable;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/80 shadow-2xl">
          {/* Header do Gabinete Pastoral */}
          <div className="px-6 py-4 bg-muted/40 border-b border-border/60 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
                  <HeartHandshake className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    Gabinete Pastoral Digital
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Gestão de atendimentos ao vivo, fila de espera e agenda
                  </DialogDescription>
                </div>
              </div>

              {/* Toggle de Disponibilidade Ao Vivo */}
              <div className="flex items-center gap-2.5 bg-background/80 border border-border px-3.5 py-1.5 rounded-full shadow-xs">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isLive ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"
                  }`}
                />
                <span className="text-xs font-bold text-foreground">
                  {isLive ? "Atendendo Ao Vivo (Online)" : "Indisponível (Offline)"}
                </span>
                <Switch
                  checked={isLive}
                  onCheckedChange={handleToggleLive}
                  disabled={isTogglingLive}
                  className="data-checked:bg-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Abas */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-6 pt-3 shrink-0">
              <TabsList className="grid grid-cols-3 w-full h-10 bg-muted/80 p-1 rounded-xl">
                <TabsTrigger
                  value="live-queue"
                  className="text-xs font-semibold data-active:bg-background data-active:text-foreground rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Chamadas Ao Vivo</span>
                  {(data?.stats?.waitingCount || 0) > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500 text-white font-black animate-bounce">
                      {data.stats.waitingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="scheduled"
                  className="text-xs font-semibold data-active:bg-background data-active:text-foreground rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Agendamentos</span>
                  {(data?.stats?.scheduledCount || 0) > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-black font-black">
                      {data.stats.scheduledCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="text-xs font-semibold data-active:bg-background data-active:text-foreground rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Minha Agenda & Perfil</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs">Carregando gabinete pastoral...</p>
                </div>
              ) : (
                <>
                  {/* ========================================================================= */}
                  {/* ABA 1: FILA DE CHAMADAS AO VIVO                                           */}
                  {/* ========================================================================= */}
                  <TabsContent value="live-queue" className="space-y-4 m-0 outline-none">
                    {/* Alerta de status */}
                    {!isLive && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between text-xs text-amber-400">
                        <span>Você está atualmente OFFLINE para chamadas ao vivo. Ative o botão acima para os membros poderem chamá-lo agora.</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleLive(true)}
                          className="h-7 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 shrink-0"
                        >
                          Ficar Online
                        </Button>
                      </div>
                    )}

                    {/* Chamadas em Espera */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-emerald-500" />
                        Membros Aguardando Atendimento ({data?.waitingLive?.length || 0})
                      </h4>

                      {data?.waitingLive && data.waitingLive.length > 0 ? (
                        data.waitingLive.map((item: any) => (
                          <div
                            key={item.id}
                            className="border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 ring-2 ring-emerald-500/40 shrink-0">
                                <AvatarFallback className="bg-emerald-500/20 text-emerald-400 font-bold">
                                  {item.userName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-bold text-foreground truncate">
                                    {item.userName}
                                  </h5>
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                    Ao Vivo
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.subject || "Conversa Pastoral"}
                                </p>
                                <span className="text-[10px] text-muted-foreground">
                                  Chamando às {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => handleAnswerCall(item.id)}
                              className="h-9 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 shrink-0 cursor-pointer flex items-center gap-1.5"
                            >
                              <PhoneCall className="w-4 h-4" />
                              <span>Atender Agora</span>
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 border border-border/40 rounded-xl">
                          Nenhum membro aguardando na fila ao vivo no momento.
                        </div>
                      )}
                    </div>

                    {/* Atendimentos em Andamento */}
                    {data?.activeLive && data.activeLive.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Em Andamento ({data.activeLive.length})
                        </h4>
                        {data.activeLive.map((item: any) => (
                          <div
                            key={item.id}
                            className="border border-border bg-card rounded-2xl p-4 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-foreground truncate">
                                {item.userName}
                              </h5>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {item.subject}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveChatAppointmentId(item.id);
                                setIsLiveChatOpen(true);
                              }}
                              className="h-8 text-xs rounded-xl"
                            >
                              Abrir Chat
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* ========================================================================= */}
                  {/* ABA 2: AGENDAMENTOS                                                       */}
                  {/* ========================================================================= */}
                  <TabsContent value="scheduled" className="space-y-3 m-0 outline-none">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Consultas & Aconselhamentos Agendados ({data?.scheduled?.length || 0})
                    </h4>

                    {data?.scheduled && data.scheduled.length > 0 ? (
                      <div className="space-y-2.5">
                        {data.scheduled.map((item: any) => (
                          <div
                            key={item.id}
                            className="border border-border bg-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                <CalendarDays className="w-5 h-5 text-amber-500" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-sm font-bold text-foreground truncate">
                                  {item.userName}
                                </h5>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                  <span className="font-semibold text-foreground">
                                    {item.scheduledDate} às {item.scheduledTime}
                                  </span>
                                  {item.userPhone && <span>• {item.userPhone}</span>}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                  Motivo: {item.subject || "Sem detalhes adicionais"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveChatAppointmentId(item.id);
                                  setIsLiveChatOpen(true);
                                }}
                                className="h-8 text-xs rounded-xl gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Mensagens</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  updatePastoralAppointmentStatus(item.id, "COMPLETED");
                                  toast.success("Atendimento concluído.");
                                  loadData(false);
                                }}
                                className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                              >
                                Concluir
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 border border-border/40 rounded-xl">
                        Nenhum atendimento agendado para os próximos dias.
                      </div>
                    )}
                  </TabsContent>

                  {/* ========================================================================= */}
                  {/* ABA 3: MINHA AGENDA & PERFIL PASTORAL                                     */}
                  {/* ========================================================================= */}
                  <TabsContent value="settings" className="space-y-4 m-0 outline-none">
                    <form onSubmit={handleSaveConfig} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground block">
                            Título / Cargo Pastoral:
                          </label>
                          <Input
                            value={pastoralTitle}
                            onChange={(e) => setPastoralTitle(e.target.value)}
                            placeholder="Ex: Pastor Titular, Pastora de Casais"
                            className="h-10 text-xs rounded-xl"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground block">
                            Telefone / WhatsApp de Contato:
                          </label>
                          <Input
                            value={pastoralPhone}
                            onChange={(e) => setPastoralPhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="h-10 text-xs rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground block">
                          Breve Biografia / Especialidade no Acolhimento:
                        </label>
                        <Textarea
                          value={pastoralBio}
                          onChange={(e) => setPastoralBio(e.target.value)}
                          placeholder="Ex: Formado em teologia, disponível para oração, cura da alma e fortalecimento da família..."
                          className="text-xs rounded-xl resize-none h-20"
                        />
                      </div>

                      {/* Visualização da Grade Semanal Padrão */}
                      <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-primary" />
                            Dias & Horários de Gabinete Ativos
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Terças, Quintas e Sextas (Slots de 40 min)
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Seus horários estão sincronizados para permitir agendamentos automáticos pelos membros da igreja na aba de agenda.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSavingConfig}
                        className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
                      >
                        {isSavingConfig ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>Salvar Perfil e Agenda Pastoral</span>
                      </Button>
                    </form>
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal de Chat Ao Vivo pelo Pastor */}
      <PastoralLiveChatModal
        isOpen={isLiveChatOpen}
        onClose={() => setIsLiveChatOpen(false)}
        appointmentId={activeChatAppointmentId}
        isPastorUser={true}
      />
    </>
  );
}
