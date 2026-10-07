"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  HeartHandshake,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Mail,
  Phone,
  Send,
  Trash2,
  User,
  ArrowLeft,
  MessageSquare,
  Shield,
  Loader2,
  Filter,
  Check,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  respondToPrayerRequest,
  updatePrayerStatus,
  deletePrayerRequest,
} from "@/app/actions/prayer";

interface PrayerRequestItem {
  id: string;
  content: string;
  authorName: string | null;
  authorEmail: string | null;
  authorPhone: string | null;
  isAnonymous: boolean;
  isRedAlert: boolean;
  status: string;
  responseMessage: string | null;
  respondedBy: string | null;
  respondedAt: Date | string | null;
  createdAt: Date | string;
}

interface PrayerRequestsManagerProps {
  slug: string;
  churchName: string;
  primaryColor: string;
  initialRequests: PrayerRequestItem[];
  currentUserRole: string;
  currentUserName: string;
}

export function PrayerRequestsManager({
  slug,
  churchName,
  primaryColor,
  initialRequests,
  currentUserRole,
  currentUserName,
}: PrayerRequestsManagerProps) {
  const [requests, setRequests] = useState<PrayerRequestItem[]>(initialRequests);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PRAYING" | "ANSWERED">("ALL");
  const [isPending, startTransition] = useTransition();

  // Modal de Resposta Pastoral
  const [selectedRequest, setSelectedRequest] = useState<PrayerRequestItem | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isResponding, setIsResponding] = useState(false);

  // Filtros
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      (r.content || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.authorName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.authorEmail || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "PENDING") return r.status === "PENDING" || r.status === "ACTIVE";
    if (statusFilter === "PRAYING") return r.status === "PRAYING";
    if (statusFilter === "ANSWERED") return r.status === "ANSWERED";
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING" || r.status === "ACTIVE").length;
  const prayingCount = requests.filter((r) => r.status === "PRAYING").length;
  const answeredCount = requests.filter((r) => r.status === "ANSWERED").length;

  const handleOpenResponse = (req: PrayerRequestItem) => {
    setSelectedRequest(req);
    setResponseMessage(
      req.responseMessage ||
        `Irmão(ã), recebi o seu pedido em oração no dia de hoje. Apresentei sua causa ao Senhor Jesus com fé, clamando por vitória, paz e consolo sobre a sua vida e de toda a sua família. Conte com as orações do ministério pastoral!`
    );
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!responseMessage.trim()) {
      toast.error("Escreva uma mensagem ou oração pastoral.");
      return;
    }

    setIsResponding(true);
    try {
      const res = await respondToPrayerRequest({
        requestId: selectedRequest.id,
        responseMessage: responseMessage.trim(),
        slug,
      });

      if (res.success && res.request) {
        toast.success("Resposta Pastoral Enviada!", {
          description: res.message,
        });

        setRequests((prev) =>
          prev.map((item) =>
            item.id === selectedRequest.id
              ? {
                  ...item,
                  status: "ANSWERED",
                  responseMessage: res.request.responseMessage,
                  respondedBy: res.request.respondedBy,
                  respondedAt: res.request.respondedAt,
                }
              : item
          )
        );

        setSelectedRequest(null);
      } else {
        toast.error(res.error || "Não foi possível registrar a resposta.");
      }
    } catch {
      toast.error("Erro ao enviar resposta pastoral.");
    } finally {
      setIsResponding(false);
    }
  };

  const handleUpdateStatus = (requestId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        const res = await updatePrayerStatus(requestId, newStatus, slug);
        if (res.success) {
          toast.success("Status atualizado com sucesso!");
          setRequests((prev) =>
            prev.map((item) => (item.id === requestId ? { ...item, status: newStatus } : item))
          );
        } else {
          toast.error(res.error || "Falha ao atualizar status.");
        }
      } catch {
        toast.error("Erro ao atualizar status.");
      }
    });
  };

  const handleDelete = (requestId: string) => {
    if (!confirm("Deseja realmente excluir este pedido de oração do sistema?")) return;

    startTransition(async () => {
      try {
        const res = await deletePrayerRequest(requestId, slug);
        if (res.success) {
          toast.success("Pedido de oração removido.");
          setRequests((prev) => prev.filter((item) => item.id !== requestId));
        } else {
          toast.error(res.error || "Não foi possível excluir o pedido.");
        }
      } catch {
        toast.error("Erro ao excluir pedido.");
      }
    });
  };

  return (
    <div className="max-w-[1760px] 2xl:max-w-[1920px] w-full mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Retorno */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Início da Congregação</span>
        </Link>
        <span className="text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Gabinete de Intercessão Pastoral
        </span>
      </div>

      {/* Header com Título & Indicadores */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-card to-muted/40 p-6 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-500 tracking-wider mb-1">
            <HeartHandshake className="w-4 h-4" />
            <span>Controle Pastoral de Clamores</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Central de Pedidos de Oração
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gerencie os clamores da membresia da <strong className="text-foreground">{churchName}</strong>, ore pela congregação e envie respostas pastorais nominais.
          </p>
        </div>

        {/* Mini KPIs */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center min-w-[80px]">
            <div className="text-lg font-black text-amber-500">{pendingCount}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Pendentes</div>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center min-w-[80px]">
            <div className="text-lg font-black text-blue-500">{prayingCount}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Em Oração</div>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-[80px]">
            <div className="text-lg font-black text-emerald-500">{answeredCount}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Atendidos</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por motivo, nome do membro ou e-mail..."
            className="pl-9 h-10 text-xs bg-muted/50 border-none rounded-xl"
          />
        </div>

        {/* Botões de Filtro de Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            size="sm"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            onClick={() => setStatusFilter("ALL")}
            className="h-9 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer"
          >
            <span>Todos</span>
            <span className="text-[10px] opacity-70">({requests.length})</span>
          </Button>

          <Button
            size="sm"
            variant={statusFilter === "PENDING" ? "default" : "outline"}
            onClick={() => setStatusFilter("PENDING")}
            className="h-9 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer text-amber-500"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pendentes</span>
            <span className="text-[10px] opacity-70">({pendingCount})</span>
          </Button>

          <Button
            size="sm"
            variant={statusFilter === "PRAYING" ? "default" : "outline"}
            onClick={() => setStatusFilter("PRAYING")}
            className="h-9 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer text-blue-500"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Em Oração</span>
            <span className="text-[10px] opacity-70">({prayingCount})</span>
          </Button>

          <Button
            size="sm"
            variant={statusFilter === "ANSWERED" ? "default" : "outline"}
            onClick={() => setStatusFilter("ANSWERED")}
            className="h-9 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer text-emerald-500"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Respondidos</span>
            <span className="text-[10px] opacity-70">({answeredCount})</span>
          </Button>
        </div>
      </div>

      {/* Lista de Pedidos de Oração */}
      {filteredRequests.length === 0 ? (
        <Card className="p-12 text-center border-dashed rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Nenhum pedido de oração encontrado</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchTerm
              ? "Tente buscar por outro termo ou limpe os filtros."
              : "Assim que os membros enviarem novos motivos de oração, eles aparecerão aqui para o cuidado pastoral."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => {
            const isAnswered = req.status === "ANSWERED";
            const isPraying = req.status === "PRAYING";
            const isPendingStatus = req.status === "PENDING" || req.status === "ACTIVE";

            return (
              <Card
                key={req.id}
                className={`rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                  isAnswered
                    ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                    : isPraying
                    ? "border-blue-500/30 bg-blue-500/[0.02]"
                    : "border-border hover:border-amber-500/40 bg-card"
                }`}
              >
                <CardHeader className="pb-3 space-y-3">
                  {/* Topo do Card: Autor e Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9 ring-1 ring-border">
                        <AvatarFallback className="text-xs font-bold bg-muted text-foreground">
                          {req.isAnonymous ? "?" : (req.authorName ? req.authorName.charAt(0).toUpperCase() : "M")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-foreground">
                            {req.isAnonymous ? "Membro Anônimo" : (req.authorName || "Membro da Igreja")}
                          </span>
                          {req.isAnonymous && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 uppercase">
                              Sigiloso
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(req.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {/* Badge de Status */}
                    <div>
                      {isAnswered && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Atendido
                        </span>
                      )}
                      {isPraying && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Em Oração
                        </span>
                      )}
                      {isPendingStatus && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Aguardando
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações de Contato (se informadas) */}
                  {(req.authorEmail || req.authorPhone) && !req.isAnonymous && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      {req.authorEmail && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                          <Mail className="w-3 h-3 text-amber-500" />
                          {req.authorEmail}
                        </span>
                      )}
                      {req.authorPhone && (
                        <a
                          href={`https://api.whatsapp.com/send?phone=55${req.authorPhone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-mono transition-colors"
                          title="Abrir WhatsApp para orar com o membro"
                        >
                          <Phone className="w-3 h-3 text-emerald-500" />
                          {req.authorPhone}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Motivo do Clamor */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans">
                    &ldquo;{req.content.replace(/^\[.*?\]\s*/, "")}&rdquo;
                  </div>

                  {/* Exibição da Resposta Pastoral Já Enviada */}
                  {req.responseMessage && (
                    <div className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Resposta de {req.respondedBy || "Pastor"}
                        </span>
                        {req.respondedAt && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {format(new Date(req.respondedAt), "dd/MM/yyyy HH:mm")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 italic leading-relaxed whitespace-pre-wrap">
                        {req.responseMessage}
                      </p>
                    </div>
                  )}
                </CardHeader>

                {/* Rodapé de Ações Pastorais */}
                <CardContent className="pt-2 pb-3.5 border-t border-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {/* Botão de Alternar para Em Oração */}
                    {!isPraying && !isAnswered && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(req.id, "PRAYING")}
                        disabled={isPending}
                        className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                        title="Marcar que o ministério está intercedendo por este pedido agora"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Orar</span>
                      </Button>
                    )}

                    {/* Botão de Excluir */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(req.id)}
                      disabled={isPending}
                      className="h-8 px-2 rounded-lg text-xs text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      title="Excluir pedido"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Botão Principal: Responder ao Pedido */}
                  <Button
                    size="sm"
                    onClick={() => handleOpenResponse(req)}
                    className="h-8 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>{req.responseMessage ? "Editar Resposta" : "Responder ao Membro"}</span>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Diálogo de Resposta Pastoral & Oração */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-lg w-[95vw] bg-card text-foreground border-border shadow-2xl p-6">
          <DialogHeader className="text-left space-y-1 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 uppercase tracking-wider">
              <HeartHandshake className="w-4 h-4" />
              <span>Resposta Pastoral & Oração de Bênção</span>
            </div>
            <DialogTitle className="text-xl font-bold">
              Responder a {selectedRequest?.isAnonymous ? "Membro Anônimo" : selectedRequest?.authorName || "Membro"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedRequest?.authorEmail && !selectedRequest?.isAnonymous
                ? `Esta mensagem será enviada por e-mail para ${selectedRequest.authorEmail} e ficará registrada no mural da igreja.`
                : "A resposta pastoral ficará registrada no sistema para acompanhamento do ministério de intercessão."}
            </DialogDescription>
          </DialogHeader>

          {/* Pedido do Membro em Destaque */}
          {selectedRequest && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground italic">
              <strong>Motivo do Clamor:</strong> &ldquo;{selectedRequest.content.replace(/^\[.*?\]\s*/, "")}&rdquo;
            </div>
          )}

          <form onSubmit={handleSendResponse} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Mensagem Pastoral / Palavra de Bênção *</span>
                <span className="text-[10px] text-muted-foreground font-normal">Assinado por {currentUserName}</span>
              </label>
              <Textarea
                required
                rows={5}
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Escreva uma oração calorosa, versículo bíblico e palavras de encorajamento para fortalecer o membro..."
                className="rounded-xl border-border bg-background text-xs sm:text-sm resize-none"
              />
            </div>

            {selectedRequest?.authorEmail && !selectedRequest.isAnonymous && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                <Mail className="w-4 h-4 shrink-0" />
                <span>
                  Um e-mail oficial com o selo da congregação será entregue na caixa de entrada de <strong>{selectedRequest.authorEmail}</strong> via Hostinger SMTP.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedRequest(null)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isResponding || !responseMessage.trim()}
                className="h-10 px-5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black gap-2 shadow-md cursor-pointer"
              >
                {isResponding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando Oração...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Resposta Pastoral</span>
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
