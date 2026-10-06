"use client";

import React, { useState, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Scale,
  Vote,
  Users,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Play,
  Square,
  FileText,
  Printer,
  Calendar,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  createAssembly,
  updateAssemblyStatus,
  updateAgendaItemStatus,
  submitAssemblyVote,
  generateAssemblyMinutes,
} from "@/app/actions/assembly";

interface AssemblyManagerProps {
  slug: string;
  initialData: {
    tenant: any;
    assemblies: any[];
    totalEligibleMembers: number;
    currentUser: {
      id: string;
      name: string;
      role: string;
    };
  };
}

export function AssemblyManager({ slug, initialData }: AssemblyManagerProps) {
  const [assemblies, setAssemblies] = useState(initialData.assemblies);
  const [selectedAssembly, setSelectedAssembly] = useState<any | null>(
    initialData.assemblies[0] || null
  );
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [isNewAssemblyOpen, setIsNewAssemblyOpen] = useState(false);
  const [viewingMinutesText, setViewingMinutesText] = useState<string | null>(null);

  // Form states - Nova Assembleia
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<"ORDINARY" | "EXTRAORDINARY">("ORDINARY");
  const [quorumPercent, setQuorumPercent] = useState(50);
  const [description, setDescription] = useState("");
  const [agendaList, setAgendaList] = useState<
    Array<{ title: string; description: string; voteType: "OPEN" | "SECRET" }>
  >([
    {
      title: "Aprovação do Relatório Financeiro e Contas da Diretoria",
      description: "Apresentação dos balancetes, receitas e investimentos do exercício.",
      voteType: "OPEN",
    },
  ]);

  const isLeader = ["ADMIN", "PASTOR", "SUPERADMIN"].includes(
    initialData.currentUser.role
  );

  // Adicionar Pauta
  const addAgendaItemField = () => {
    setAgendaList((prev) => [
      ...prev,
      { title: "", description: "", voteType: "OPEN" },
    ]);
  };

  // Remover Pauta
  const removeAgendaItemField = (idx: number) => {
    setAgendaList((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handler: Criar Assembleia
  const handleCreateAssembly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título da assembleia.");
      return;
    }

    startTransition(async () => {
      const res = await createAssembly(slug, {
        title,
        date,
        type,
        requiredQuorumPercent: quorumPercent,
        description,
        agendaItems: agendaList.filter((a) => a.title.trim()),
      });

      if (res.success && res.assembly) {
        toast.success(res.message);
        setIsNewAssemblyOpen(false);
        window.location.reload();
      } else {
        toast.error(res.error || "Erro ao convocar assembleia.");
      }
    });
  };

  // Handler: Mudar Status da Assembleia
  const handleUpdateStatus = (assemblyId: string, newStatus: "SCHEDULED" | "IN_PROGRESS" | "CLOSED") => {
    startTransition(async () => {
      const res = await updateAssemblyStatus(slug, assemblyId, newStatus);
      if (res.success) {
        toast.success(res.message);
        setAssemblies((prev) =>
          prev.map((a) => (a.id === assemblyId ? { ...a, status: newStatus } : a))
        );
        if (selectedAssembly?.id === assemblyId) {
          setSelectedAssembly((prev: any) => ({ ...prev, status: newStatus }));
        }
      } else {
        toast.error(res.error || "Erro ao atualizar status.");
      }
    });
  };

  // Handler: Mudar Status da Pauta (Abrir/Fechar Votação)
  const handleUpdateAgendaItem = (itemId: string, itemStatus: "PENDING" | "VOTING" | "CLOSED") => {
    startTransition(async () => {
      const res = await updateAgendaItemStatus(slug, itemId, itemStatus);
      if (res.success) {
        toast.success(res.message);
        // Atualizar localmente
        const updateItems = (items: any[]) =>
          items.map((it) => (it.id === itemId ? { ...it, status: itemStatus } : it));

        setAssemblies((prev) =>
          prev.map((a) => ({ ...a, agendaItems: updateItems(a.agendaItems) }))
        );
        if (selectedAssembly) {
          setSelectedAssembly((prev: any) => ({
            ...prev,
            agendaItems: updateItems(prev.agendaItems),
          }));
        }
      } else {
        toast.error(res.error || "Falha ao atualizar pauta.");
      }
    });
  };

  // Handler: Membro Votar na Pauta
  const handleVote = (itemId: string, choice: "YES" | "NO" | "ABSTAIN") => {
    startTransition(async () => {
      const res = await submitAssemblyVote(slug, itemId, choice);
      if (res.success) {
        toast.success(res.message);
        // Atualizar contagem e estado local
        const updateVoteInList = (items: any[]) =>
          items.map((it) => {
            if (it.id === itemId) {
              const previousChoice = it.userVoteChoice;
              let yesDelta = choice === "YES" ? 1 : previousChoice === "YES" ? -1 : 0;
              let noDelta = choice === "NO" ? 1 : previousChoice === "NO" ? -1 : 0;
              let abstainDelta = choice === "ABSTAIN" ? 1 : previousChoice === "ABSTAIN" ? -1 : 0;

              return {
                ...it,
                userHasVoted: true,
                userVoteChoice: choice,
                yesCount: it.yesCount + yesDelta,
                noCount: it.noCount + noDelta,
                abstainCount: it.abstainCount + abstainDelta,
                totalVotes: it.totalVotes + (it.userHasVoted ? 0 : 1),
              };
            }
            return it;
          });

        setAssemblies((prev) =>
          prev.map((a) => ({ ...a, agendaItems: updateVoteInList(a.agendaItems) }))
        );
        if (selectedAssembly) {
          setSelectedAssembly((prev: any) => ({
            ...prev,
            agendaItems: updateVoteInList(prev.agendaItems),
          }));
        }
      } else {
        toast.error(res.error || "Erro ao registrar voto.");
      }
    });
  };

  // Handler: Ver / Gerar Ata
  const handleViewMinutes = async (assemblyId: string) => {
    startTransition(async () => {
      const res = await generateAssemblyMinutes(slug, assemblyId);
      if (res.success && res.minutes) {
        setViewingMinutesText(res.minutes);
      } else {
        toast.error(res.error || "Falha ao gerar ata.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Principal */}
      <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-white/[0.08] p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="text-center sm:text-left space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-black tracking-wide">
              <Scale className="w-4 h-4 text-blue-400" />
              <span>Governança & Estatuto Eclesial</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Assembleias Estatutárias & Votação com Quórum
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Convoque assembleias gerais (AGO / AGE), permita votação secreta ou aberta dos membros pelo celular, compute o quórum em tempo real e emita a ata oficial pronta para cartório.
            </p>
          </div>

          {isLeader && (
            <Button
              onClick={() => setIsNewAssemblyOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs h-10 px-4 rounded-xl gap-2 shadow-lg shadow-blue-500/20 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Convocar Assembleia</span>
            </Button>
          )}
        </div>
      </div>

      {assemblies.length === 0 ? (
        <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] p-12 text-center">
          <Scale className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">Nenhuma assembleia registrada</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
            Convoque uma assembleia geral ordinária ou extraordinária para deliberar e votar pautas com os membros.
          </p>
          {isLeader && (
            <Button
              onClick={() => setIsNewAssemblyOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl"
            >
              Convocar Primeira Assembleia
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da Esquerda: Lista de Assembleias */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
              Assembleias ({assemblies.length})
            </h3>

            <div className="space-y-2.5">
              {assemblies.map((asm) => {
                const isSelected = selectedAssembly?.id === asm.id;
                const isLive = asm.status === "IN_PROGRESS";
                const isClosed = asm.status === "CLOSED";

                return (
                  <div
                    key={asm.id}
                    onClick={() => setSelectedAssembly(asm)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2.5 ${
                      isSelected
                        ? "bg-blue-600/10 border-blue-500/60 shadow-lg shadow-blue-500/10"
                        : "bg-zinc-950 border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isLive
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"
                            : isClosed
                            ? "bg-zinc-800 text-zinc-400 border border-white/10"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        }`}
                      >
                        {isLive ? "● Em Andamento" : isClosed ? "Encerrada" : "Agendada"}
                      </span>

                      <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-400" />
                        {format(new Date(asm.date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm leading-snug line-clamp-2">
                      {asm.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/[0.06]">
                      <span>{asm.type === "ORDINARY" ? "A.G.O." : "A.G.E."}</span>
                      <span>{asm.agendaItems.length} Pautas</span>
                      <span className="font-bold text-white">{asm.quorumPercentAchieved}% Quórum</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna da Direita: Detalhes da Assembleia Selecionada */}
          <div className="lg:col-span-2 space-y-6">
            {selectedAssembly && (
              <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] shadow-2xl overflow-hidden">
                <CardHeader className="pb-4 border-b border-white/[0.08] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          {selectedAssembly.type === "ORDINARY"
                            ? "Assembleia Geral Ordinária"
                            : "Assembleia Geral Extraordinária"}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          {format(new Date(selectedAssembly.date), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>

                      <CardTitle className="text-xl font-black text-white mt-1">
                        {selectedAssembly.title}
                      </CardTitle>
                    </div>

                    {/* Botões de Ação do Pastor / Líder */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {isLeader && selectedAssembly.status === "SCHEDULED" && (
                        <Button
                          onClick={() => handleUpdateStatus(selectedAssembly.id, "IN_PROGRESS")}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 rounded-xl gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Iniciar Assembleia</span>
                        </Button>
                      )}

                      {isLeader && selectedAssembly.status === "IN_PROGRESS" && (
                        <Button
                          onClick={() => handleUpdateStatus(selectedAssembly.id, "CLOSED")}
                          variant="destructive"
                          className="font-bold text-xs h-9 rounded-xl gap-1.5 cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Encerrar & Lavrar Ata</span>
                        </Button>
                      )}

                      <Button
                        onClick={() => handleViewMinutes(selectedAssembly.id)}
                        variant="outline"
                        className="border-white/10 bg-white/[0.04] hover:bg-white/10 text-white font-bold text-xs h-9 rounded-xl gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Ver Minuta da Ata</span>
                      </Button>
                    </div>
                  </div>

                  {/* Painel do Quórum Estatutário */}
                  <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-zinc-300">
                          Quórum Estatutário de Membros
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Presentes Votantes: <strong className="text-white">{selectedAssembly.currentVotersCount}</strong> de{" "}
                        <strong className="text-white">{selectedAssembly.totalEligibleMembers}</strong> aptos. Exigido:{" "}
                        <strong>{selectedAssembly.requiredQuorumPercent}%</strong>.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-2xl font-black text-white">
                          {selectedAssembly.quorumPercentAchieved}%
                        </span>
                        <span className="text-[10px] block text-zinc-400 font-bold uppercase">
                          Atingido
                        </span>
                      </div>

                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          selectedAssembly.isQuorumReached
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        }`}
                      >
                        {selectedAssembly.isQuorumReached ? (
                          <ShieldCheck className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Ordem do Dia / Pautas para Votação ({selectedAssembly.agendaItems.length})
                  </h4>

                  <div className="space-y-4">
                    {selectedAssembly.agendaItems.map((item: any) => {
                      const isVotingOpen = item.status === "VOTING";
                      const isClosed = item.status === "CLOSED";

                      const yesPct =
                        item.totalVotes > 0
                          ? Math.round((item.yesCount / item.totalVotes) * 100)
                          : 0;
                      const noPct =
                        item.totalVotes > 0
                          ? Math.round((item.noCount / item.totalVotes) * 100)
                          : 0;
                      const abstainPct =
                        item.totalVotes > 0
                          ? Math.round((item.abstainCount / item.totalVotes) * 100)
                          : 0;

                      return (
                        <div
                          key={item.id}
                          className="p-5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
                                  {item.order}
                                </span>
                                <h5 className="font-bold text-white text-base leading-snug">
                                  {item.title}
                                </h5>
                              </div>
                              {item.description && (
                                <p className="text-xs text-zinc-400 pl-8">{item.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pl-8 sm:pl-0 shrink-0">
                              <span
                                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                  isVotingOpen
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"
                                    : isClosed
                                    ? "bg-zinc-800 text-zinc-400 border border-white/10"
                                    : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {isVotingOpen ? "● Votação Aberta" : isClosed ? "Votação Encerrada" : "Pendente"}
                              </span>

                              {isLeader && (
                                <div className="flex gap-1">
                                  {!isVotingOpen && !isClosed && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateAgendaItem(item.id, "VOTING")}
                                      className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer"
                                    >
                                      Abrir Votação
                                    </Button>
                                  )}
                                  {isVotingOpen && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateAgendaItem(item.id, "CLOSED")}
                                      className="h-7 px-2.5 text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer"
                                    >
                                      Fechar Votação
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Barras de Votação em Tempo Real */}
                          <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-zinc-400">Total de Votos Apurados: <strong className="text-white">{item.totalVotes}</strong></span>
                              <span className="text-[11px] text-zinc-500">
                                {item.voteType === "SECRET" ? "Voto Secreto" : "Voto Aberto"}
                              </span>
                            </div>

                            {/* Barra Tripla */}
                            <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden flex">
                              <div
                                style={{ width: `${yesPct}%` }}
                                className="bg-emerald-500 h-full transition-all duration-500"
                                title={`SIM: ${item.yesCount} (${yesPct}%)`}
                              />
                              <div
                                style={{ width: `${noPct}%` }}
                                className="bg-rose-500 h-full transition-all duration-500"
                                title={`NÃO: ${item.noCount} (${noPct}%)`}
                              />
                              <div
                                style={{ width: `${abstainPct}%` }}
                                className="bg-zinc-600 h-full transition-all duration-500"
                                title={`ABSTENÇÃO: ${item.abstainCount} (${abstainPct}%)`}
                              />
                            </div>

                            {/* Legenda de Resultados */}
                            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl">
                                <span className="text-[10px] text-emerald-400 block font-bold uppercase">SIM</span>
                                <strong className="text-white text-sm">{item.yesCount}</strong>
                                <span className="text-[10px] text-zinc-400 block font-mono">({yesPct}%)</span>
                              </div>

                              <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
                                <span className="text-[10px] text-rose-400 block font-bold uppercase">NÃO</span>
                                <strong className="text-white text-sm">{item.noCount}</strong>
                                <span className="text-[10px] text-zinc-400 block font-mono">({noPct}%)</span>
                              </div>

                              <div className="bg-zinc-800/60 border border-white/10 p-2 rounded-xl">
                                <span className="text-[10px] text-zinc-400 block font-bold uppercase">ABSTENÇÃO</span>
                                <strong className="text-white text-sm">{item.abstainCount}</strong>
                                <span className="text-[10px] text-zinc-400 block font-mono">({abstainPct}%)</span>
                              </div>
                            </div>
                          </div>

                          {/* Botões de Voto do Membro via Celular */}
                          {isVotingOpen && (
                            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                                  <Vote className="w-4 h-4 text-blue-400" />
                                  <span>Seu Voto nesta Pauta:</span>
                                </span>
                                {item.userHasVoted && (
                                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Voto registrado ({item.userVoteChoice})</span>
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleVote(item.id, "YES")}
                                  className={`h-9 font-black text-xs rounded-xl cursor-pointer ${
                                    item.userVoteChoice === "YES"
                                      ? "bg-emerald-500 text-black ring-2 ring-white"
                                      : "bg-emerald-600/80 hover:bg-emerald-600 text-white"
                                  }`}
                                >
                                  SIM (Aprovar)
                                </Button>

                                <Button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleVote(item.id, "NO")}
                                  className={`h-9 font-black text-xs rounded-xl cursor-pointer ${
                                    item.userVoteChoice === "NO"
                                      ? "bg-rose-500 text-white ring-2 ring-white"
                                      : "bg-rose-600/80 hover:bg-rose-600 text-white"
                                  }`}
                                >
                                  NÃO (Rejeitar)
                                </Button>

                                <Button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleVote(item.id, "ABSTAIN")}
                                  className={`h-9 font-bold text-xs rounded-xl cursor-pointer ${
                                    item.userVoteChoice === "ABSTAIN"
                                      ? "bg-zinc-600 text-white ring-2 ring-white"
                                      : "bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
                                  }`}
                                >
                                  ABSTENÇÃO
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONVOCAR NOVA ASSEMBLEIA                                          */}
      {/* ========================================================================= */}
      <Dialog open={isNewAssemblyOpen} onOpenChange={setIsNewAssemblyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-zinc-950/95 border-white/10 rounded-3xl">
          <DialogHeader className="pb-3 border-b border-white/[0.08]">
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-400" />
              <span>Convocação de Assembleia Geral</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Cadastre a data, pautas da ordem do dia e o quórum estatutário exigido.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAssembly} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Título da Assembleia</Label>
              <Input
                type="text"
                placeholder="Ex: Assembleia Geral Ordinária de Prestação de Contas 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Data de Realização</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Tipo de Assembleia</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white"
                >
                  <option value="ORDINARY">Ordinária (A.G.O.)</option>
                  <option value="EXTRAORDINARY">Extraordinária (A.G.E.)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Quórum Exigido (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={quorumPercent}
                  onChange={(e) => setQuorumPercent(Number(e.target.value))}
                  required
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Descrição / Convocação Formal</Label>
              <Textarea
                rows={2}
                placeholder="Convocam-se todos os membros em comunhão..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white resize-none"
              />
            </div>

            {/* Lista de Pautas */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Pautas da Ordem do Dia ({agendaList.length})
                </Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={addAgendaItemField}
                  className="h-7 px-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar Pauta</span>
                </Button>
              </div>

              <div className="space-y-3">
                {agendaList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400">Pauta {idx + 1}</span>
                      {agendaList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAgendaItemField(idx)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <Input
                      type="text"
                      placeholder="Título da pauta (Ex: Eleição da Comissão Fiscal)"
                      value={item.title}
                      onChange={(e) => {
                        const updated = [...agendaList];
                        updated[idx].title = e.target.value;
                        setAgendaList(updated);
                      }}
                      required
                      className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        type="text"
                        placeholder="Detalhes ou justificativa..."
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...agendaList];
                          updated[idx].description = e.target.value;
                          setAgendaList(updated);
                        }}
                        className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                      />

                      <select
                        value={item.voteType}
                        onChange={(e) => {
                          const updated = [...agendaList];
                          updated[idx].voteType = e.target.value as any;
                          setAgendaList(updated);
                        }}
                        className="h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white"
                      >
                        <option value="OPEN">Votação Aberta</option>
                        <option value="SECRET">Votação Secreta</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-white/[0.08]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNewAssemblyOpen(false)}
                className="text-xs font-bold text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-5 rounded-xl cursor-pointer"
              >
                {isPending ? "Convocando..." : "Publicar Convocação"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: MINUTA DA ATA OFICIAL (CARTÓRIO)                                    */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(viewingMinutesText)}
        onOpenChange={(open) => !open && setViewingMinutesText(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 bg-zinc-950 border-white/10 rounded-3xl">
          <DialogHeader className="pb-3 border-b border-white/[0.08] flex flex-row items-center justify-between print:hidden">
            <div>
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>Minuta Oficial da Ata da Assembleia</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Texto formatado conforme exigências do Cartório de Registro Civil de Pessoas Jurídicas.
              </DialogDescription>
            </div>

            <Button
              onClick={() => window.print()}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 rounded-xl cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Ata</span>
            </Button>
          </DialogHeader>

          <div className="bg-white text-zinc-950 p-6 sm:p-8 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed border border-zinc-300 my-2 print:border-none print:p-0">
            {viewingMinutesText}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
