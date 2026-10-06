"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Mail,
  Send,
  Copy,
  Check,
  Share2,
  Trash2,
  Shield,
  Church,
  Crown,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  KeyRound,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createChurchUser,
  sendDirectInviteEmail,
  updateUserRoleAndTenant,
  deleteChurchUser,
} from "@/app/actions/members";
import { ROLE_LABELS } from "@/lib/constants";

interface ChurchOption {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  isMatriz: boolean;
}

interface MemberUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  roleLabel: string;
  isEmailVerified: boolean;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
  };
}

interface ChurchMembersManagerProps {
  currentChurch: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
    plan: string;
  };
  isMatriz: boolean;
  allNetworkChurches: ChurchOption[];
  initialUsers: MemberUser[];
  allowedActions: string[];
}

export function ChurchMembersManager({
  currentChurch,
  isMatriz,
  allNetworkChurches,
  initialUsers,
  allowedActions = [],
}: ChurchMembersManagerProps) {
  const [users, setUsers] = useState<MemberUser[]>(initialUsers);
  const [selectedFilterChurch, setSelectedFilterChurch] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // Modal 1: Criar Usuário Direto
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("MEMBER");
  const [newTenantId, setNewTenantId] = useState(currentChurch.id);
  const [sendInviteMail, setSendInviteMail] = useState(true);
  const [creating, setCreating] = useState(false);

  // Modal 2: Gerar Convite / Link de Membresia
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteTenantId, setInviteTenantId] = useState(currentChurch.id);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filtragem de Usuários por Congregação
  const filteredUsers = users.filter((u) => {
    if (selectedFilterChurch === "ALL") return true;
    return u.tenant.id === selectedFilterChurch;
  });

  // Métricas
  const totalCount = filteredUsers.length;
  const verifiedCount = filteredUsers.filter((u) => u.isEmailVerified).length;
  const leaderCount = filteredUsers.filter(
    (u) => u.role === "LEADER" || u.role === "ADMIN" || u.role === "PASTOR"
  ).length;

  const [origin, setOrigin] = useState("https://horeb.lynxems.com.br");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const targetChurch =
    allNetworkChurches.find((c) => c.id === inviteTenantId) || currentChurch;
  const generatedInviteUrl = `${origin}/${targetChurch.slug}/cadastro?role=${inviteRole}&email=${encodeURIComponent(
    inviteEmail
  )}&name=${encodeURIComponent(inviteName)}`;

  // Handler: Criar Usuário
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) {
      toast.error("Preencha o nome e o e-mail.");
      return;
    }

    setCreating(true);
    try {
      const res = await createChurchUser({
        name: newName,
        email: newEmail,
        role: newRole,
        tenantId: newTenantId,
        password: newPassword || undefined,
        sendInviteEmail: sendInviteMail,
      });

      if (res.success && res.user) {
        toast.success(`Usuário ${res.user.name} cadastrado com sucesso!`, {
          description: sendInviteMail
            ? "Convite e código de ativação enviados para o e-mail."
            : `Senha gerada: ${res.user.tempPassword}`,
        });

        const targetTenant = allNetworkChurches.find((c) => c.id === newTenantId)!;
        const newUserObj: MemberUser = {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          roleLabel: ROLE_LABELS[res.user.role] || res.user.role,
          isEmailVerified: false,
          createdAt: new Date().toISOString(),
          tenant: {
            id: targetTenant.id,
            name: targetTenant.name,
            slug: targetTenant.slug,
            primaryColor: targetTenant.primaryColor,
          },
        };

        setUsers((prev) => [newUserObj, ...prev]);
        setShowCreateModal(false);
        setNewName("");
        setNewEmail("");
        setNewPassword("");
      } else {
        toast.error(res.error || "Falha ao cadastrar usuário.");
      }
    } finally {
      setCreating(false);
    }
  };

  // Handler: Enviar Convite por E-mail
  const handleSendInvite = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!inviteEmail || !inviteEmail.trim()) {
      toast.error("Informe o e-mail do destinatário no campo acima.");
      const input = document.getElementById("invite-email-input");
      if (input) input.focus();
      return;
    }

    setSendingInvite(true);
    try {
      const res = await sendDirectInviteEmail({
        recipientEmail: inviteEmail,
        recipientName: inviteName,
        role: inviteRole,
        tenantId: inviteTenantId,
      });

      if (res.success) {
        toast.success(`Convite oficial enviado para ${inviteEmail}!`, {
          description: "O membro receberá um e-mail com link direto para ativação.",
        });
        setInviteEmail("");
        setInviteName("");
        setShowInviteModal(false);
      } else {
        toast.error(res.error || "Falha ao enviar e-mail de convite.");
      }
    } finally {
      setSendingInvite(false);
    }
  };

  // Handler: Copiar Link de Convite
  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(generatedInviteUrl);
    setCopiedLink(true);
    toast.success("Link de convite copiado para a área de transferência!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handler: Compartilhar no WhatsApp
  const handleShareWhatsApp = () => {
    const text = `A paz do Senhor! Você foi convidado para a ${targetChurch.name} no aplicativo Horeb. Complete seu cadastro através do link: ${generatedInviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Handler: Alterar Perfil / Congregação
  const handleUpdateRole = async (userId: string, role: string, tenantId?: string) => {
    startTransition(async () => {
      const res = await updateUserRoleAndTenant({ userId, role, tenantId });
      if (res.success) {
        toast.success("Perfil de acesso atualizado com sucesso!");
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  role,
                  roleLabel: ROLE_LABELS[role] || role,
                  ...(tenantId
                    ? {
                        tenant: allNetworkChurches.find((c) => c.id === tenantId) || u.tenant,
                      }
                    : {}),
                }
              : u
          )
        );
      } else {
        toast.error(res.error || "Falha ao atualizar perfil.");
      }
    });
  };

  // Handler: Excluir Usuário
  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Deseja realmente remover o usuário "${name}" desta congregação?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteChurchUser(userId);
      if (res.success) {
        toast.success(`Usuário "${name}" removido.`);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        toast.error(res.error || "Falha ao remover usuário.");
      }
    });
  };

  // Badge de Cores para Perfil
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "ADMIN":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "PASTOR":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "LEADER":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "FINANCIAL":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "KIDS":
        return "bg-sky-500/20 text-sky-300 border-sky-500/40";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Apresentação */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-card via-card/95 to-muted/40 border border-border shadow-2xl relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: currentChurch.primaryColor }}
        />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                {isMatriz ? "Gestão Master • Rede de Igrejas" : "Gestão Local • Filial"}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {allNetworkChurches.length} congregações conectadas
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
              <span>Membros, Líderes & Convites</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Cadastre novos usuários, defina níveis de acesso personalizados (Pastores, Líderes de Célula, Ministério Infantil, Tesouraria) e envie links diretos de convite para a Matriz ou filiais.
            </p>
          </div>

          {/* Botões de Ação Master */}
          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            {(allowedActions.includes("create_member") || allowedActions.includes("ALL")) && (
              <>
                <Button
                  onClick={() => setShowInviteModal(true)}
                  className="flex-1 md:flex-initial h-11 bg-muted/80 hover:bg-muted text-foreground border border-border font-bold text-xs rounded-xl shadow-lg gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>Gerar Convite / Enviar E-mail</span>
                </Button>

                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 md:flex-initial h-11 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Novo Usuário / Membro</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/[0.08]">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[11px] text-zinc-400 font-medium block">Total de Membros</span>
            <span className="text-2xl font-black text-white">{totalCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[11px] text-emerald-400 font-medium block">Contas Verificadas</span>
            <span className="text-2xl font-black text-emerald-400">{verifiedCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[11px] text-amber-400 font-medium block">Pastores & Líderes</span>
            <span className="text-2xl font-black text-amber-400">{leaderCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <span className="text-[11px] text-sky-400 font-medium block">Filiais Conectadas</span>
            <span className="text-2xl font-black text-sky-400">{allNetworkChurches.length}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtro por Congregação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Filtrar por Congregação:</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <button
            onClick={() => setSelectedFilterChurch("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilterChurch === "ALL"
                ? "bg-primary text-primary-foreground shadow-md font-black"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border"
            }`}
          >
            Todas as Congregações ({users.length})
          </button>

          {allNetworkChurches.map((c) => {
            const isSelected = selectedFilterChurch === c.id;
            const count = users.filter((u) => u.tenant.id === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedFilterChurch(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-foreground text-background shadow-md font-black"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: c.primaryColor }}
                />
                <span>{c.name}</span>
                <span className="text-[10px] opacity-70 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela de Membros */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
        {/* Dica de Scroll no Celular */}
        <div className="sm:hidden px-4 py-2 bg-muted/50 border-b border-border text-[11px] text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-primary font-medium">
            <span>👉 Deslize para o lado para ver perfis e ações</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">⟷ Scroll</span>
        </div>

        <div className="overflow-x-auto scroll-touch">
          <table className="w-full min-w-[680px] text-left text-xs text-foreground">
            <thead className="bg-muted/60 border-b border-border text-muted-foreground uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Membro / Usuário</th>
                <th className="px-4 py-3.5">Nível de Acesso (Perfil)</th>
                <th className="px-4 py-3.5">Congregação Vinculada</th>
                <th className="px-4 py-3.5">Status de Ativação</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 italic">
                    Nenhum membro encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 rounded-full border border-white/15 ring-1 ring-white/10 shrink-0">
                          {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
                          <AvatarFallback className="bg-white/[0.08] font-bold text-white text-xs">
                            {u.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{u.name}</p>
                          <p className="text-[11px] text-zinc-400 font-mono truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        disabled={isPending || u.role === "SUPERADMIN"}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer ${getRoleBadge(
                          u.role
                        )} bg-transparent focus:outline-none`}
                      >
                        <option value="ADMIN" className="bg-zinc-900 text-zinc-100">
                          Administrador / Pastor Local
                        </option>
                        <option value="PASTOR" className="bg-zinc-900 text-zinc-100">
                          Pastor Auxiliar
                        </option>
                        <option value="LEADER" className="bg-zinc-900 text-zinc-100">
                          Líder de Célula / Grupo
                        </option>
                        <option value="FINANCIAL" className="bg-zinc-900 text-zinc-100">
                          Tesouraria & Finanças
                        </option>
                        <option value="KIDS" className="bg-zinc-900 text-zinc-100">
                          Líder Ministério Infantil
                        </option>
                        <option value="MEMBER" className="bg-zinc-900 text-zinc-100">
                          Membro da Igreja
                        </option>
                      </select>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: u.tenant.primaryColor }}
                        />
                        <span className="font-medium text-zinc-200">{u.tenant.name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {u.isEmailVerified ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ativo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          <span>Pendente Código</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {u.role !== "SUPERADMIN" && (allowedActions.includes("create_member") || allowedActions.includes("ALL")) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          disabled={isPending}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                          title="Remover Usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CADASTRAR NOVO USUÁRIO COM NÍVEL DE ACESSO                       */}
      {/* ========================================================================= */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md w-full p-6 bg-card border border-border rounded-3xl shadow-2xl text-card-foreground">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              <span>Cadastrar Novo Usuário</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crie uma conta para liderança ou membro na Matriz ou em qualquer filial da rede.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Nome Completo *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: João da Silva"
                required
                className="bg-muted/50 border-border text-foreground rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">E-mail de Acesso *</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="joao@gmail.com"
                required
                className="bg-black/50 border-white/10 text-white rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Congregação de Destino</label>
              <select
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-white rounded-xl h-11 px-3 text-xs font-medium focus:outline-none"
              >
                {allNetworkChurches.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                    {c.name} {c.isMatriz ? "(Sede Matriz)" : "(Filial)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Nível de Acesso (Perfil) *</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-white rounded-xl h-11 px-3 text-xs font-medium focus:outline-none"
              >
                <option value="ADMIN" className="bg-zinc-900 text-white">
                  Administrador / Pastor Local (Gestão completa)
                </option>
                <option value="PASTOR" className="bg-zinc-900 text-white">
                  Pastor Auxiliar
                </option>
                <option value="LEADER" className="bg-zinc-900 text-white">
                  Líder de Célula / Grupo
                </option>
                <option value="FINANCIAL" className="bg-zinc-900 text-white">
                  Tesouraria & Finanças (Acesso aos relatórios PIX)
                </option>
                <option value="KIDS" className="bg-zinc-900 text-white">
                  Líder Ministério Infantil (Check-in Kids)
                </option>
                <option value="MEMBER" className="bg-zinc-900 text-white">
                  Membro da Igreja (Acesso padrão)
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Senha Inicial (Opcional)</label>
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Deixe em branco para gerar aleatória"
                className="bg-black/50 border-white/10 text-white rounded-xl h-11 font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="sendInviteMailCheck"
                checked={sendInviteMail}
                onChange={(e) => setSendInviteMail(e.target.checked)}
                className="rounded border-white/20 bg-black/50 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="sendInviteMailCheck" className="text-xs text-zinc-300 cursor-pointer">
                Enviar e-mail de convite e ativação com código de 6 dígitos
              </label>
            </div>

            <Button
              type="submit"
              disabled={creating}
              className="w-full h-12 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all mt-4 cursor-pointer"
            >
              {creating ? "Cadastrando no Banco..." : "Confirmar Cadastro do Usuário"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: GERAR CONVITE / ENVIAR E-MAIL COM LINK DIRETO                    */}
      {/* ========================================================================= */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-lg w-full p-6 bg-card border border-border rounded-3xl shadow-2xl text-card-foreground">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-500" />
              <span>Gerar Convite de Membresia</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Envie convites por e-mail ou gere links diretos para novos membros se cadastrarem com o perfil já definido.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvite} className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Congregação de Destino</label>
                <select
                  value={inviteTenantId}
                  onChange={(e) => setInviteTenantId(e.target.value)}
                  className="w-full bg-muted/50 border border-border text-foreground rounded-xl h-11 px-3 text-xs font-medium focus:outline-none"
                >
                  {allNetworkChurches.map((c) => (
                    <option key={c.id} value={c.id} className="bg-card text-foreground">
                      {c.name} {c.isMatriz ? "(Sede Matriz)" : "(Filial)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Perfil Atribuído</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-muted/50 border border-border text-foreground rounded-xl h-11 px-3 text-xs font-medium focus:outline-none"
                >
                  <option value="MEMBER" className="bg-card text-foreground">Membro da Igreja</option>
                  <option value="LEADER" className="bg-zinc-900 text-white">Líder de Célula</option>
                  <option value="KIDS" className="bg-zinc-900 text-white">Ministério Kids</option>
                  <option value="FINANCIAL" className="bg-zinc-900 text-white">Tesouraria / Finanças</option>
                  <option value="ADMIN" className="bg-zinc-900 text-white">Administrador Local</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Nome do Convidado (Opcional)</label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Ex: Maria Oliveira"
                className="bg-black/50 border-white/10 text-white rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">E-mail do Destinatário *</label>
              <Input
                id="invite-email-input"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="maria@exemplo.com"
                required
                className="bg-black/50 border-white/10 text-white rounded-xl h-11"
              />
            </div>

            {/* Prévia do Link Gerado */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                Link de Cadastro Direto:
              </span>
              <p className="font-mono text-[11px] text-zinc-300 break-all select-all">
                {generatedInviteUrl}
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Button
                  type="button"
                  onClick={handleCopyInviteLink}
                  size="sm"
                  className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-lg gap-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Copiado!" : "Copiar Link"}</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleShareWhatsApp}
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleSendInvite}
                  disabled={sendingInvite}
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg gap-1.5 cursor-pointer font-bold transition-all shadow-sm"
                  title="Disparar convite por e-mail"
                >
                  {sendingInvite ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  <span>{sendingInvite ? "Enviando..." : "Enviar por E-mail"}</span>
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={sendingInvite}
              className="w-full h-12 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all gap-2 cursor-pointer mt-2"
            >
              {sendingInvite ? (
                <span>Disparando via Hostinger SMTP...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Disparar E-mail Oficial de Convite</span>
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
