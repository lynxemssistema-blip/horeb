"use client";

import React, { useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  GraduationCap,
  BookOpen,
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  Plus,
  Calendar,
  Sparkles,
  TrendingUp,
  MapPin,
  FileText,
  BadgeDollarSign,
  ChevronRight,
  UserPlus,
  BookCheck,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  createSundaySchoolClass,
  recordSundaySchoolAttendance,
  enrollMemberInDiscipleship,
  updateDiscipleshipProgress,
} from "@/app/actions/sunday-school";

interface SundaySchoolManagerProps {
  slug: string;
  initialData: {
    tenant: any;
    classes: any[];
    tracks: any[];
    members: any[];
    metrics: any;
    currentUserRole: string;
  };
}

export function SundaySchoolManager({ slug, initialData }: SundaySchoolManagerProps) {
  const [classes, setClasses] = useState(initialData.classes);
  const [tracks, setTracks] = useState(initialData.tracks);
  const [metrics, setMetrics] = useState(initialData.metrics);
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [isNewClassOpen, setIsNewClassOpen] = useState(false);
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<any | null>(null);
  const [isEnrollDiscipleOpen, setIsEnrollDiscipleOpen] = useState(false);
  const [selectedDiscipleForUpdate, setSelectedDiscipleForUpdate] = useState<any | null>(null);

  // Form states - Nova Turma
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [newClassRoom, setNewClassRoom] = useState("");
  const [newClassAgeRange, setNewClassAgeRange] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState("");

  // Form states - Chamada Domingo
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [membersCount, setMembersCount] = useState(0);
  const [visitorsCount, setVisitorsCount] = useState(0);
  const [biblesCount, setBiblesCount] = useState(0);
  const [magazinesCount, setMagazinesCount] = useState(0);
  const [offeringAmount, setOfferingAmount] = useState(0);
  const [attendanceNotes, setAttendanceNotes] = useState("");

  // Form states - Matrícula Discipulado
  const [selectedUserId, setSelectedUserId] = useState("");
  const [mentorName, setMentorName] = useState("");
  const [enrollNotes, setEnrollNotes] = useState("");

  // Handler: Criar Turma
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      toast.error("Informe o nome da turma.");
      return;
    }

    startTransition(async () => {
      const res = await createSundaySchoolClass(slug, {
        name: newClassName,
        description: newClassDescription,
        room: newClassRoom,
        ageRange: newClassAgeRange,
        teacherName: newClassTeacher,
      });

      if (res.success && res.class) {
        toast.success(res.message);
        setClasses((prev) => [...prev, { ...res.class, attendances: [] }]);
        setMetrics((prev: any) => ({ ...prev, totalClasses: prev.totalClasses + 1 }));
        setIsNewClassOpen(false);
        setNewClassName("");
        setNewClassDescription("");
        setNewClassRoom("");
        setNewClassAgeRange("");
        setNewClassTeacher("");
      } else {
        toast.error(res.error || "Erro ao criar turma.");
      }
    });
  };

  // Handler: Lançar Chamada
  const handleRecordAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForAttendance) return;

    startTransition(async () => {
      const res = await recordSundaySchoolAttendance(slug, {
        classId: selectedClassForAttendance.id,
        date: attendanceDate,
        lessonTitle,
        totalMembers: membersCount,
        totalVisitors: visitorsCount,
        biblesCount,
        magazinesCount,
        offeringAmount,
        notes: attendanceNotes,
      });

      if (res.success && res.attendance) {
        toast.success(res.message);
        setClasses((prev) =>
          prev.map((c) =>
            c.id === selectedClassForAttendance.id
              ? { ...c, attendances: [res.attendance, ...c.attendances] }
              : c
          )
        );
        setSelectedClassForAttendance(null);
        setLessonTitle("");
        setMembersCount(0);
        setVisitorsCount(0);
        setBiblesCount(0);
        setMagazinesCount(0);
        setOfferingAmount(0);
        setAttendanceNotes("");
      } else {
        toast.error(res.error || "Erro ao registrar presença.");
      }
    });
  };

  // Handler: Matricular no Discipulado
  const handleEnrollDisciple = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("Selecione um membro para discipular.");
      return;
    }

    const primaryTrack = tracks[0];
    if (!primaryTrack) return;

    startTransition(async () => {
      const res = await enrollMemberInDiscipleship(slug, {
        trackId: primaryTrack.id,
        userId: selectedUserId,
        mentorName,
        notes: enrollNotes,
      });

      if (res.success && res.progress) {
        toast.success(res.message);
        const enrolledUser = initialData.members.find((m) => m.id === selectedUserId);
        const enrichedProgress = {
          ...res.progress,
          user: enrolledUser || { name: "Membro", email: "" },
        };

        setTracks((prev) =>
          prev.map((t, i) =>
            i === 0
              ? {
                  ...t,
                  members: [
                    enrichedProgress,
                    ...t.members.filter((m: any) => m.userId !== selectedUserId),
                  ],
                }
              : t
          )
        );
        setMetrics((prev: any) => ({ ...prev, totalDisciples: prev.totalDisciples + 1 }));
        setIsEnrollDiscipleOpen(false);
        setSelectedUserId("");
        setMentorName("");
        setEnrollNotes("");
      } else {
        toast.error(res.error || "Falha na matrícula.");
      }
    });
  };

  // Handler: Atualizar Etapa do Discípulo
  const handleAdvanceStep = (disciple: any, nextStep: number, isFinal: boolean = false) => {
    startTransition(async () => {
      const res = await updateDiscipleshipProgress(slug, disciple.id, {
        currentStep: nextStep,
        status: isFinal ? "COMPLETED" : "IN_PROGRESS",
        mentorName: disciple.mentorName,
        notes: disciple.notes,
      });

      if (res.success) {
        toast.success(res.message);
        setTracks((prev) =>
          prev.map((t) => ({
            ...t,
            members: t.members.map((m: any) =>
              m.id === disciple.id
                ? {
                    ...m,
                    currentStep: nextStep,
                    status: isFinal ? "COMPLETED" : "IN_PROGRESS",
                    completedAt: isFinal ? new Date() : null,
                  }
                : m
            ),
          }))
        );
        setSelectedDiscipleForUpdate(null);
      } else {
        toast.error(res.error || "Erro ao atualizar progresso.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Principal */}
      <div className="relative rounded-3xl bg-gradient-to-br from-card via-card/90 to-muted/40 border border-border p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="text-center sm:text-left space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black tracking-wide">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>Educação Cristã & Liderança</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Escola Bíblica Dominical & Trilhas de Discipulado
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Gerencie turmas dominicais, chamadas de presença, oferta e acompanhe a evolução dos novos convertidos até a maturidade e integração em células e ministérios.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              onClick={() => setIsNewClassOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-10 px-4 rounded-xl gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Turma EBD</span>
            </Button>

            <Button
              onClick={() => setIsEnrollDiscipleOpen(true)}
              variant="outline"
              className="border-white/10 bg-white/[0.04] hover:bg-white/10 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Matricular Discípulo</span>
            </Button>
          </div>
        </div>

        {/* Faixa de Indicadores Rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/[0.08]">
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Turmas Ativas</span>
            <p className="text-xl font-black text-white mt-0.5">{metrics.totalClasses}</p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Alunos (Últ. Domingo)</span>
            <p className="text-xl font-black text-amber-400 mt-0.5">{metrics.totalAttendanceLastSession}</p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Visitantes EBD</span>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{metrics.totalVisitorsLastSession}</p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Bíblias Trazidas</span>
            <p className="text-xl font-black text-sky-400 mt-0.5">{metrics.totalBiblesLastSession}</p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Ofertas EBD</span>
            <p className="text-xl font-black text-white mt-0.5">
              {metrics.totalOfferingsLastSession.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Em Discipulado</span>
            <p className="text-xl font-black text-purple-400 mt-0.5">{metrics.totalDisciples}</p>
          </div>
        </div>
      </div>

      {/* Tabs Principais: Turmas vs Trilhas */}
      <Tabs defaultValue="classes" className="space-y-6">
        <TabsList className="grid grid-cols-2 max-w-md h-11 rounded-2xl bg-muted/80 border border-border p-1 gap-1">
          <TabsTrigger
            value="classes"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Turmas da EBD ({classes.length})</span>
          </TabsTrigger>

          <TabsTrigger
            value="discipleship"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Trilhas de Discipulado ({tracks[0]?.members?.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA 1: TURMAS DA EBD                                                      */}
        {/* ========================================================================= */}
        <TabsContent value="classes" className="space-y-4">
          {classes.length === 0 ? (
            <Card className="rounded-3xl bg-card border-border p-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
              <h3 className="text-base font-bold text-white">Nenhuma turma cadastrada</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                Crie turmas para faixas etárias como Crianças, Jovens, Casais ou Novos Convertidos.
              </p>
              <Button
                onClick={() => setIsNewClassOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl"
              >
                Cadastrar Primeira Turma
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => {
                const latest = cls.attendances[0];
                return (
                  <Card
                    key={cls.id}
                    className="rounded-3xl bg-card border-border hover:border-amber-500/30 transition-all shadow-xl flex flex-col justify-between overflow-hidden"
                  >
                    <CardHeader className="pb-3 border-b border-white/[0.06]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-white truncate">{cls.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-zinc-400">
                            {cls.ageRange && (
                              <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
                                {cls.ageRange}
                              </span>
                            )}
                            {cls.room && (
                              <span className="flex items-center gap-1 text-zinc-400">
                                <MapPin className="w-3 h-3 text-amber-400" />
                                {cls.room}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="py-4 space-y-3 flex-1">
                      {cls.teacherName && (
                        <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                          <span className="text-zinc-500">Professor:</span>
                          <strong className="text-white">{cls.teacherName}</strong>
                        </p>
                      )}

                      {/* Resumo do Último Lançamento */}
                      <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.04] space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500 font-bold uppercase tracking-wider">
                            Última Aula
                          </span>
                          <span className="text-zinc-400 font-mono">
                            {latest
                              ? format(new Date(latest.date), "dd/MM/yyyy", { locale: ptBR })
                              : "Sem lançamentos"}
                          </span>
                        </div>

                        {latest ? (
                          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                            <div className="bg-black/40 p-1.5 rounded-xl">
                              <span className="text-[10px] text-zinc-500 block">Alunos</span>
                              <strong className="text-xs text-white">{latest.totalMembers}</strong>
                            </div>
                            <div className="bg-black/40 p-1.5 rounded-xl">
                              <span className="text-[10px] text-zinc-500 block">Visitantes</span>
                              <strong className="text-xs text-emerald-400">{latest.totalVisitors}</strong>
                            </div>
                            <div className="bg-black/40 p-1.5 rounded-xl">
                              <span className="text-[10px] text-zinc-500 block">Oferta</span>
                              <strong className="text-xs text-amber-400">
                                R$ {latest.offeringAmount.toFixed(0)}
                              </strong>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 italic text-center py-2">
                            Nenhuma presença lançada ainda.
                          </p>
                        )}
                      </div>
                    </CardContent>

                    <div className="p-4 pt-0">
                      <Button
                        onClick={() => {
                          setSelectedClassForAttendance(cls);
                          setAttendanceDate(new Date().toISOString().split("T")[0]);
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs h-9 rounded-xl gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
                      >
                        <BookCheck className="w-4 h-4" />
                        <span>Lançar Chamada do Domingo</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: TRILHAS DE DISCIPULADO                                             */}
        {/* ========================================================================= */}
        <TabsContent value="discipleship" className="space-y-6">
          {tracks.map((track) => (
            <Card key={track.id} className="rounded-3xl bg-card border-border shadow-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/[0.06]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <span>{track.title}</span>
                      </CardTitle>
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        {track.members.length} Discípulos
                      </span>
                    </div>
                    {track.description && (
                      <CardDescription className="text-xs text-zinc-400 mt-1">
                        {track.description}
                      </CardDescription>
                    )}
                  </div>

                  <Button
                    onClick={() => setIsEnrollDiscipleOpen(true)}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Novo Discípulo</span>
                  </Button>
                </div>

                {/* Régua Visual das Etapas */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-4">
                  {track.steps.map((st: any) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-2xl bg-zinc-900/70 border border-white/[0.06] flex items-center gap-2.5"
                    >
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 text-xs font-black flex items-center justify-center shrink-0">
                        {st.order}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{st.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{st.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Membros em Acompanhamento & Mentoria ({track.members.length})
                </h4>

                {track.members.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    Nenhum membro matriculado nesta trilha. Clique em &ldquo;Novo Discípulo&rdquo; para iniciar o acompanhamento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {track.members.map((progress: any) => {
                      const isComplete = progress.status === "COMPLETED";
                      const currentStepInfo = track.steps.find(
                        (s: any) => s.order === progress.currentStep
                      );

                      return (
                        <div
                          key={progress.id}
                          className="p-4 rounded-2xl bg-zinc-900/50 border border-white/[0.06] hover:border-purple-500/30 transition-all flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 ring-2 ring-purple-500/30 bg-black">
                                {progress.user.avatarUrl && (
                                  <AvatarImage src={progress.user.avatarUrl} alt={progress.user.name} />
                                )}
                                <AvatarFallback className="text-xs font-black bg-purple-600 text-white">
                                  {progress.user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>

                              <div className="min-w-0">
                                <h5 className="font-bold text-white text-sm truncate">
                                  {progress.user.name}
                                </h5>
                                <p className="text-xs text-zinc-400">
                                  Mentor: <strong className="text-zinc-300">{progress.mentorName || "Pastor/Líder"}</strong>
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                                isComplete
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              }`}
                            >
                              {isComplete ? "Concluído" : `Etapa ${progress.currentStep} de 4`}
                            </span>
                          </div>

                          {/* Barra de Progresso visual */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] text-zinc-400">
                              <span>Fase: <strong className="text-white">{currentStepInfo?.title || `Passo ${progress.currentStep}`}</strong></span>
                              <span className="font-bold font-mono">
                                {isComplete ? "100%" : `${progress.currentStep * 25}%`}
                              </span>
                            </div>

                            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                  isComplete ? "bg-emerald-500" : "bg-purple-500"
                                }`}
                                style={{
                                  width: isComplete ? "100%" : `${progress.currentStep * 25}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Ações do Discípulo */}
                          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Início: {format(new Date(progress.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </span>

                            {!isComplete ? (
                              <div className="flex gap-1.5">
                                {progress.currentStep < 4 ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAdvanceStep(progress, progress.currentStep + 1, false)}
                                    className="h-7 px-2.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white gap-1 cursor-pointer"
                                  >
                                    <span>Avançar Etapa</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAdvanceStep(progress, 4, true)}
                                    className="h-7 px-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1 cursor-pointer"
                                  >
                                    <Award className="w-3 h-3" />
                                    <span>Concluir Trilha</span>
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Trilha Finalizada</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: NOVA TURMA DA EBD                                                  */}
      {/* ========================================================================= */}
      <Dialog open={isNewClassOpen} onOpenChange={setIsNewClassOpen}>
        <DialogContent className="max-w-lg p-6 bg-card border-border rounded-3xl">
          <DialogHeader className="pb-3 border-b border-white/[0.08]">
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>Cadastrar Nova Turma da EBD</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Configure a classe dominical, sala e professor responsável.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClass} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Nome da Turma</Label>
              <Input
                type="text"
                placeholder="Ex: Jovens Conectados, Casais Restaurados, Crianças"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                required
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Faixa Etária</Label>
                <Input
                  type="text"
                  placeholder="Ex: 18 a 30 anos"
                  value={newClassAgeRange}
                  onChange={(e) => setNewClassAgeRange(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Sala / Espaço</Label>
                <Input
                  type="text"
                  placeholder="Ex: Sala 02 - Anexo"
                  value={newClassRoom}
                  onChange={(e) => setNewClassRoom(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Professor / Líder Responsável</Label>
              <Input
                type="text"
                placeholder="Nome do professor titular"
                value={newClassTeacher}
                onChange={(e) => setNewClassTeacher(e.target.value)}
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Descrição / Ementa (Opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Tema central do semestre..."
                value={newClassDescription}
                onChange={(e) => setNewClassDescription(e.target.value)}
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white resize-none"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-white/[0.08]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNewClassOpen(false)}
                className="text-xs font-bold text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-5 rounded-xl cursor-pointer"
              >
                {isPending ? "Cadastrando..." : "Cadastrar Turma"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: CHAMADA DO DOMINGO (PRESENÇA E OFERTAS EBD)                        */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(selectedClassForAttendance)}
        onOpenChange={(open) => !open && setSelectedClassForAttendance(null)}
      >
        <DialogContent className="max-w-lg p-6 bg-card border-border rounded-3xl">
          <DialogHeader className="pb-3 border-b border-white/[0.08]">
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <BookCheck className="w-5 h-5 text-amber-400" />
              <span>Relatório do Domingo • {selectedClassForAttendance?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Lançamento rápido de frequência, visitantes, bíblias e oferta da aula.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordAttendance} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Data da Aula</Label>
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  required
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Lição Ministrada</Label>
                <Input
                  type="text"
                  placeholder="Ex: Lição 07 - Fruto do Espírito"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-zinc-300">Alunos</Label>
                <Input
                  type="number"
                  min="0"
                  value={membersCount}
                  onChange={(e) => setMembersCount(Number(e.target.value))}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white text-center font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-zinc-300">Visitantes</Label>
                <Input
                  type="number"
                  min="0"
                  value={visitorsCount}
                  onChange={(e) => setVisitorsCount(Number(e.target.value))}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white text-center font-bold text-emerald-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-zinc-300">Bíblias</Label>
                <Input
                  type="number"
                  min="0"
                  value={biblesCount}
                  onChange={(e) => setBiblesCount(Number(e.target.value))}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white text-center font-bold text-sky-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-zinc-300">Revistas</Label>
                <Input
                  type="number"
                  min="0"
                  value={magazinesCount}
                  onChange={(e) => setMagazinesCount(Number(e.target.value))}
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white text-center font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Valor da Oferta EBD (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={offeringAmount}
                onChange={(e) => setOfferingAmount(Number(e.target.value))}
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Observações / Pedidos de Oração</Label>
              <Textarea
                rows={2}
                placeholder="Observações da aula..."
                value={attendanceNotes}
                onChange={(e) => setAttendanceNotes(e.target.value)}
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white resize-none"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-white/[0.08]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedClassForAttendance(null)}
                className="text-xs font-bold text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-5 rounded-xl cursor-pointer"
              >
                {isPending ? "Salvando..." : "Salvar Relatório"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: MATRICULAR DISCÍPULO                                              */}
      {/* ========================================================================= */}
      <Dialog open={isEnrollDiscipleOpen} onOpenChange={setIsEnrollDiscipleOpen}>
        <DialogContent className="max-w-lg p-6 bg-card border-border rounded-3xl">
          <DialogHeader className="pb-3 border-b border-white/[0.08]">
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              <span>Matricular Novo Discípulo na Trilha</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Inicie a jornada de acolhimento e maturidade bíblica para o novo membro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnrollDisciple} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Selecione o Membro / Convertido</Label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white font-medium focus:border-purple-400"
              >
                <option value="">Selecione um membro cadastrado...</option>
                {initialData.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Líder / Mentor Responsável</Label>
              <Input
                type="text"
                placeholder="Ex: Pastor Paulo, Líder Mateus"
                value={mentorName}
                onChange={(e) => setMentorName(e.target.value)}
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Data da Decisão / Observações Iniciais</Label>
              <Textarea
                rows={2}
                placeholder="Decidiu entregar a vida a Cristo no culto de domingo..."
                value={enrollNotes}
                onChange={(e) => setEnrollNotes(e.target.value)}
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white resize-none"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-white/[0.08]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEnrollDiscipleOpen(false)}
                className="text-xs font-bold text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-5 rounded-xl cursor-pointer"
              >
                {isPending ? "Matriculando..." : "Matricular na Trilha"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
