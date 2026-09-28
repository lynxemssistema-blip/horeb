"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  Calendar,
  CheckSquare,
  Sparkles,
  FileText,
  Clock,
  Plus,
  AlertCircle,
  FileEdit,
  Shield,
  Loader2,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  toggleTaskStatus,
  saveMeetingMinute,
  createTask,
  deleteTask,
  createMeeting,
  deleteMeeting,
  addMinistryMember,
  removeMinistryMember,
  updateMinistryMemberFunction,
} from "@/app/actions/ministry";

interface MinistryWorkspaceViewProps {
  slug: string;
  initialMinistry: {
    id: string;
    name: string;
    description: string | null;
    schedule: string | null;
    color: string;
    icon: string;
    logoUrl?: string | null;
    tenant: {
      id: string;
      name: string;
      slug: string;
      primaryColor: string;
    };
    potentialMembers?: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      avatarUrl: string | null;
    }>;
    members: Array<{
      id: string;
      role: string;
      customFunction?: string | null;
      user: {
        id: string;
        name: string;
        email: string;
        role: string;
        avatarUrl: string | null;
      };
    }>;
    meetings: Array<{
      id: string;
      title: string;
      date: string;
      type: string;
      minute: {
        id: string;
        content: string;
      } | null;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      dueDate: string;
      status: string;
      assignee: {
        id: string;
        name: string;
        avatarUrl: string | null;
      } | null;
    }>;
  };
}

export function MinistryWorkspaceView({
  slug,
  initialMinistry,
}: MinistryWorkspaceViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"members" | "meetings" | "tasks">("members");
  const [tasks, setTasks] = useState(initialMinistry.tasks);
  const [meetings, setMeetings] = useState(initialMinistry.meetings);
  const [members, setMembers] = useState(initialMinistry.members);
  const [isPending, startTransition] = useTransition();

  // Dialogs de criação
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState("");
  const [newMeetingType, setNewMeetingType] = useState("REUNIAO");
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  const [openMemberDialog, setOpenMemberDialog] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("VOLUNTEER");
  const [newMemberFunction, setNewMemberFunction] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Modal para editar função de membro existente
  const [editingMember, setEditingMember] = useState<{
    id: string;
    name: string;
    role: string;
    customFunction: string;
  } | null>(null);
  const [isUpdatingMemberFunction, setIsUpdatingMemberFunction] = useState(false);

  // Modal para redigir ata
  const [selectedMeetingForMinute, setSelectedMeetingForMinute] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  const [minuteText, setMinuteText] = useState("");
  const [isSavingMinute, setIsSavingMinute] = useState(false);

  // Criar Tarefa
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      toast.error("Informe o título da tarefa.");
      return;
    }
    if (!newTaskDueDate) {
      toast.error("Informe o prazo da tarefa.");
      return;
    }

    try {
      setIsCreatingTask(true);
      const res = await createTask({
        ministryId: initialMinistry.id,
        title: newTaskTitle,
        dueDate: newTaskDueDate,
        assigneeId: newTaskAssigneeId || undefined,
        slug,
      });

      if (res.success && res.task) {
        toast.success("Tarefa criada com sucesso!");
        setTasks((prev) => [...prev, res.task as any]);
        setNewTaskTitle("");
        setNewTaskDueDate("");
        setNewTaskAssigneeId("");
        setOpenTaskDialog(false);
      } else {
        toast.error(res.error || "Erro ao criar tarefa.");
      }
    } catch {
      toast.error("Erro inesperado ao criar tarefa.");
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Excluir Tarefa
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Deseja realmente remover esta atividade?")) return;
    try {
      const res = await deleteTask(taskId, slug);
      if (res.success) {
        toast.success("Tarefa removida.");
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else {
        toast.error("Erro ao excluir tarefa.");
      }
    } catch {
      toast.error("Erro no servidor.");
    }
  };

  // Criar Reunião
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) {
      toast.error("Informe a pauta / título da reunião.");
      return;
    }
    if (!newMeetingDate) {
      toast.error("Informe a data e horário.");
      return;
    }

    try {
      setIsCreatingMeeting(true);
      const res = await createMeeting({
        ministryId: initialMinistry.id,
        title: newMeetingTitle,
        date: newMeetingDate,
        type: newMeetingType,
        slug,
      });

      if (res.success && res.meeting) {
        toast.success("Reunião agendada com sucesso!");
        setMeetings((prev) => [res.meeting as any, ...prev]);
        setNewMeetingTitle("");
        setNewMeetingDate("");
        setNewMeetingType("REUNIAO");
        setOpenMeetingDialog(false);
      } else {
        toast.error(res.error || "Erro ao agendar reunião.");
      }
    } catch {
      toast.error("Erro inesperado ao agendar reunião.");
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  // Excluir Reunião
  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm("Deseja realmente excluir esta reunião da agenda?")) return;
    try {
      const res = await deleteMeeting(meetingId, slug);
      if (res.success) {
        toast.success("Reunião removida.");
        setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      } else {
        toast.error("Erro ao excluir reunião.");
      }
    } catch {
      toast.error("Erro no servidor.");
    }
  };

  // Adicionar Integrante
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUserId) {
      toast.error("Selecione um usuário para adicionar.");
      return;
    }

    try {
      setIsAddingMember(true);
      const res = await addMinistryMember({
        ministryId: initialMinistry.id,
        userId: newMemberUserId,
        role: newMemberRole,
        customFunction: newMemberFunction,
        slug,
      });

      if (res.success && res.member) {
        toast.success("Integrante vinculado com sucesso!");
        setMembers((prev) => {
          const exists = prev.some((m) => m.user.id === res.member.user.id);
          if (exists) {
            return prev.map((m) => (m.user.id === res.member.user.id ? (res.member as any) : m));
          }
          return [...prev, res.member as any];
        });
        setNewMemberUserId("");
        setNewMemberRole("VOLUNTEER");
        setNewMemberFunction("");
        setOpenMemberDialog(false);
      } else {
        toast.error(res.error || "Erro ao vincular membro.");
      }
    } catch {
      toast.error("Erro inesperado ao adicionar membro.");
    } finally {
      setIsAddingMember(false);
    }
  };

  // Atualizar Função/Papel do Integrante
  const handleUpdateMemberFunction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setIsUpdatingMemberFunction(true);
      const res = await updateMinistryMemberFunction({
        memberId: editingMember.id,
        role: editingMember.role,
        customFunction: editingMember.customFunction,
        slug,
      });

      if (res.success && res.member) {
        toast.success(`Função de ${editingMember.name} atualizada com sucesso!`);
        setMembers((prev) =>
          prev.map((m) =>
            m.id === editingMember.id
              ? {
                  ...m,
                  role: res.member.role,
                  customFunction: res.member.customFunction,
                }
              : m
          )
        );
        setEditingMember(null);
      } else {
        toast.error(res.error || "Erro ao atualizar função.");
      }
    } catch {
      toast.error("Erro ao salvar função.");
    } finally {
      setIsUpdatingMemberFunction(false);
    }
  };

  // Remover Integrante
  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Remover "${name}" deste ministério?`)) return;
    try {
      const res = await removeMinistryMember(memberId, slug);
      if (res.success) {
        toast.success("Integrante desvinculado.");
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        toast.error("Erro ao remover integrante.");
      }
    } catch {
      toast.error("Erro no servidor.");
    }
  };

  // Toggle Task Status com feedback visual instantâneo
  const handleToggleTask = (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";

    // Otimista
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );

    startTransition(async () => {
      const res = await toggleTaskStatus(taskId, currentStatus);
      if (res.success) {
        toast.success(
          nextStatus === "COMPLETED"
            ? "Tarefa concluída! Parabéns."
            : "Tarefa reaberta para pendente."
        );
      } else {
        toast.error("Erro ao atualizar status da tarefa.");
        // Reverte se falhar
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
        );
      }
    });
  };

  // Salvar ata
  const handleSaveMinute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingForMinute) return;

    try {
      setIsSavingMinute(true);
      const res = await saveMeetingMinute(selectedMeetingForMinute.id, minuteText);
      if (res.success && res.minute) {
        toast.success("Ata oficial registrada com sucesso!");
        const savedMinute = res.minute;
        setMeetings((prev) =>
          prev.map((m) =>
            m.id === selectedMeetingForMinute.id
              ? { ...m, minute: { id: savedMinute.id, content: minuteText } }
              : m
          )
        );
        setSelectedMeetingForMinute(null);
        setMinuteText("");
      } else {
        toast.error(res.error || "Erro ao salvar ata.");
      }
    } catch {
      toast.error("Erro ao registrar ata.");
    } finally {
      setIsSavingMinute(false);
    }
  };

  const openMinuteDialog = (meeting: (typeof meetings)[0]) => {
    setSelectedMeetingForMinute({
      id: meeting.id,
      title: meeting.title,
      content: meeting.minute?.content || "",
    });
    setMinuteText(meeting.minute?.content || "");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Botão Voltar */}
      <Link
        href={`/${slug}/ministerios`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1 rounded-lg"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar aos Ministérios</span>
      </Link>

      {/* 1. Header do Workspace */}
      <div className="bg-card border border-border/80 p-5 sm:p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: initialMinistry.color || "#8b5cf6" }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            {initialMinistry.logoUrl && (
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-border/80 bg-background/50 p-1 shrink-0 shadow-sm flex items-center justify-center">
                <img
                  src={initialMinistry.logoUrl}
                  alt={initialMinistry.name}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: initialMinistry.color }}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Workspace Departamental
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {initialMinistry.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {initialMinistry.description || "Gestão interna de membros, atas e tarefas da equipe."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {members.length} Integrantes
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tabs de Navegação: Mobile-First [ Membros ] | [ Agenda & Atas ] | [ Tarefas ] */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-muted/60 border border-border/60 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "tasks"
              ? "bg-card text-foreground shadow-sm shadow-black/10 border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckSquare className="w-4 h-4 text-primary" />
          <span>Tarefas</span>
          <span className="text-[10px] font-mono opacity-70">({tasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("meetings")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "meetings"
              ? "bg-card text-foreground shadow-sm shadow-black/10 border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4 text-primary" />
          <span>Agenda & Atas</span>
          <span className="text-[10px] font-mono opacity-70">({meetings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "members"
              ? "bg-card text-foreground shadow-sm shadow-black/10 border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4 text-primary" />
          <span>Membros</span>
          <span className="text-[10px] font-mono opacity-70">({members.length})</span>
        </button>
      </div>

      {/* =========================================================================
          ABA 1: TAREFAS (COM BOTÃO DE CRIAR TAREFA E EXCLUIR)
         ========================================================================= */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                <span>Backlog de Atividades & Prazos</span>
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {tasks.filter((t) => t.status === "COMPLETED").length} de {tasks.length} concluídas
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setOpenTaskDialog(true)}
              className="text-xs font-bold gap-1.5 h-8 px-3 rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Tarefa</span>
            </Button>
          </div>

          <div className="space-y-2.5">
            {tasks.length > 0 ? (
              tasks.map((task) => {
                const isCompleted = task.status === "COMPLETED";
                const taskDate = parseISO(task.dueDate);
                const isOverdue = !isCompleted && isPast(taskDate);

                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 group ${
                      isCompleted
                        ? "bg-card/40 border-border/40 opacity-60"
                        : "bg-card border-border/80 shadow-sm hover:border-primary/40"
                    }`}
                  >
                    {/* Esquerda: Checkbox + Título */}
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => handleToggleTask(task.id, task.status)}
                      />
                      <span
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    {/* Direita: Avatar do Responsável + Badge de Data + Botão Excluir */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500 text-white shadow-md shadow-red-500/40 animate-pulse">
                          <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                          <span>Atrasada: {format(taskDate, "dd/MM")}</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? "bg-muted text-muted-foreground"
                              : "bg-muted/80 text-foreground border border-border"
                          }`}
                        >
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>{format(taskDate, "dd/MM")}</span>
                        </span>
                      )}

                      {task.assignee && (
                        <Avatar
                          className="h-7 w-7 ring-1 ring-border shrink-0"
                          title={`Responsável: ${task.assignee.name}`}
                        >
                          {task.assignee.avatarUrl && (
                            <AvatarImage src={task.assignee.avatarUrl} alt={task.assignee.name} />
                          )}
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {task.assignee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-400 cursor-pointer"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground">
                Nenhuma tarefa cadastrada para este ministério. Clique em "Nova Tarefa" para começar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 2: AGENDA & ATAS OFICIAIS
         ========================================================================= */}
      {activeTab === "meetings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Histórico de Reuniões & Atas Oficiais</span>
            </h2>
            <Button
              size="sm"
              onClick={() => setOpenMeetingDialog(true)}
              className="text-xs font-bold gap-1.5 h-8 px-3 rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agendar Reunião</span>
            </Button>
          </div>

          <div className="space-y-4">
            {meetings.length > 0 ? (
              meetings.map((meeting) => (
                <Card
                  key={meeting.id}
                  className="border-border/80 bg-card rounded-2xl overflow-hidden shadow-sm"
                >
                  <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {meeting.type}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {format(parseISO(meeting.date), "dd 'de' MMMM 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                          {meeting.title}
                        </CardTitle>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {!meeting.minute && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMinuteDialog(meeting)}
                            className="text-xs font-bold gap-1.5 h-8 rounded-xl hover:border-primary hover:text-primary cursor-pointer"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                            <span>Redigir Ata</span>
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-400 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          title="Excluir reunião"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-4 sm:px-5 pb-4 pt-0">
                    {meeting.minute ? (
                      <div className="p-3.5 sm:p-4 rounded-xl bg-muted/60 border border-border/60 text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans relative">
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 text-primary">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ata Registrada</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => openMinuteDialog(meeting)}
                            className="hover:underline text-[10px] text-muted-foreground cursor-pointer"
                          >
                            Editar Ata
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap">{meeting.minute.content}</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground italic">
                        Nenhuma ata formal registrada para este encontro.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground">
                Nenhuma reunião registrada. Clique em "Agendar Reunião" para marcar o próximo alinhamento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 3: MEMBROS DO MINISTÉRIO
         ========================================================================= */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Corpo de Voluntários & Liderança</span>
            </h2>
            <Button
              size="sm"
              onClick={() => setOpenMemberDialog(true)}
              className="text-xs font-bold gap-1.5 h-8 px-3 rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Membro</span>
            </Button>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl divide-y divide-border/60 overflow-hidden shadow-sm">
            {members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 ring-1 ring-border">
                      {member.user.avatarUrl && (
                        <AvatarImage src={member.user.avatarUrl} alt={member.user.name} />
                      )}
                      <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                        {member.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="text-xs sm:text-sm font-bold text-foreground">
                        {member.user.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {member.user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.customFunction && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {member.customFunction}
                      </span>
                    )}

                    <Badge
                      variant={member.role === "LEADER" ? "default" : "secondary"}
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      {member.role === "LEADER" ? "Líder" : "Voluntário"}
                    </Badge>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingMember({
                          id: member.id,
                          name: member.user.name,
                          role: member.role,
                          customFunction: member.customFunction || "",
                        })
                      }
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-amber-400 cursor-pointer"
                      title="Editar função do membro"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id, member.user.name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-400 cursor-pointer"
                      title="Remover integrante"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhum voluntário vinculado ainda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Criar Tarefa */}
      <Dialog open={openTaskDialog} onOpenChange={setOpenTaskDialog}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span>Nova Tarefa do Ministério</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Delegue atividades com prazo para os voluntários da sua equipe.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold block mb-1">Título da Atividade *</label>
              <Input
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ex: Imprimir repertório e cifras do domingo"
                className="text-xs h-10 rounded-xl bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Prazo de Entrega *</label>
              <Input
                required
                type="datetime-local"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="text-xs h-10 rounded-xl bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Responsável (Opcional)</label>
              <select
                value={newTaskAssigneeId}
                onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                className="w-full h-10 rounded-xl bg-background border border-border text-xs px-3 text-foreground outline-none"
              >
                <option value="">Sem responsável definido</option>
                {initialMinistry.potentialMembers?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) - {u.email}
                  </option>
                )) ||
                  members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name} ({m.role})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenTaskDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingTask}
                className="font-bold gap-1.5"
              >
                {isCreatingTask ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar Tarefa</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Agendar Reunião */}
      <Dialog open={openMeetingDialog} onOpenChange={setOpenMeetingDialog}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Agendar Encontro / Reunião</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Planeje ensaios, reuniões de alinhamento e vigílias do departamento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMeeting} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold block mb-1">Pauta / Título *</label>
              <Input
                required
                value={newMeetingTitle}
                onChange={(e) => setNewMeetingTitle(e.target.value)}
                placeholder="Ex: Alinhamento de Repertório & Escala"
                className="text-xs h-10 rounded-xl bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Data e Horário *</label>
              <Input
                required
                type="datetime-local"
                value={newMeetingDate}
                onChange={(e) => setNewMeetingDate(e.target.value)}
                className="text-xs h-10 rounded-xl bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Tipo de Encontro</label>
              <select
                value={newMeetingType}
                onChange={(e) => setNewMeetingType(e.target.value)}
                className="w-full h-10 rounded-xl bg-background border border-border text-xs px-3 text-foreground outline-none"
              >
                <option value="REUNIAO">Reunião de Alinhamento</option>
                <option value="ENSAIO">Ensaio Litúrgico</option>
                <option value="ORACAO">Vigília & Oração</option>
                <option value="TREINAMENTO">Treinamento / Capacitação</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenMeetingDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingMeeting}
                className="font-bold gap-1.5"
              >
                {isCreatingMeeting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Agendando...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Salvar Encontro</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Adicionar Membro */}
      <Dialog open={openMemberDialog} onOpenChange={setOpenMemberDialog}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Users className="w-5 h-5 text-primary" />
              <span>Adicionar Integrante</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Vincule membros cadastrados da igreja e defina sua função específica no ministério.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddMember} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold block mb-1">Selecione o Membro *</label>
              <select
                required
                value={newMemberUserId}
                onChange={(e) => setNewMemberUserId(e.target.value)}
                className="w-full h-10 rounded-xl bg-background border border-border text-xs px-3 text-foreground outline-none"
              >
                <option value="">Selecione uma pessoa da congregação...</option>
                {initialMinistry.potentialMembers?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) - {u.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Papel / Nível</label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="w-full h-10 rounded-xl bg-background border border-border text-xs px-3 text-foreground outline-none"
              >
                <option value="VOLUNTEER">Voluntário / Membro Ativo</option>
                <option value="LEADER">Líder / Coordenador</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Função / Instrumento / Cargo (Opcional)</label>
              <Input
                value={newMemberFunction}
                onChange={(e) => setNewMemberFunction(e.target.value)}
                placeholder="Ex: Vocalista Soprano, Baterista, Sonoplasta, Professor..."
                className="text-xs h-10 rounded-xl bg-background"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenMemberDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isAddingMember}
                className="font-bold gap-1.5"
              >
                {isAddingMember ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Adicionando...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <span>Vincular ao Ministério</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Editar Função de Membro */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileEdit className="w-5 h-5 text-primary" />
              <span>Editar Função de {editingMember?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Altere o cargo ou a função operacional deste voluntário no ministério.
            </DialogDescription>
          </DialogHeader>

          {editingMember && (
            <form onSubmit={handleUpdateMemberFunction} className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-bold block mb-1">Papel / Nível</label>
                <select
                  value={editingMember.role}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, role: e.target.value })
                  }
                  className="w-full h-10 rounded-xl bg-background border border-border text-xs px-3 text-foreground outline-none"
                >
                  <option value="VOLUNTEER">Voluntário / Membro Ativo</option>
                  <option value="LEADER">Líder / Coordenador</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Função / Instrumento / Cargo</label>
                <Input
                  value={editingMember.customFunction}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, customFunction: e.target.value })
                  }
                  placeholder="Ex: Tecladista, Ministro de Louvor, Recepção, Berçário..."
                  className="text-xs h-10 rounded-xl bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMember(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdatingMemberFunction}
                  className="font-bold gap-1.5"
                >
                  {isUpdatingMemberFunction ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Salvar Função</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 4: Dialog para Redigir/Editar Ata */}
      <Dialog
        open={!!selectedMeetingForMinute}
        onOpenChange={(open) => !open && setSelectedMeetingForMinute(null)}
      >
        <DialogContent className="max-w-md bg-card border border-border text-foreground p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileText className="w-5 h-5 text-primary" />
              <span>Registrar Ata da Reunião</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedMeetingForMinute?.title}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMinute} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold block mb-1">Conteúdo Oficial da Ata</label>
              <Textarea
                rows={6}
                value={minuteText}
                onChange={(e) => setMinuteText(e.target.value)}
                placeholder="Descreva as decisões tomadas, deliberações, escalação de equipes e combinados..."
                required
                className="text-xs sm:text-sm rounded-2xl bg-background resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedMeetingForMinute(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingMinute}
                className="font-bold gap-1.5"
              >
                {isSavingMinute ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvar Ata Oficial</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
