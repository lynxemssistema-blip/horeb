"use client";

import React, { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Save,
  PlusCircle,
  Loader2,
  Trash2,
  RotateCcw,
  Search,
  CheckCheck,
  XCircle,
  Users,
  FileText,
  Calendar,
  Baby,
  Wallet,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  updateRolePermission,
  createRolePermission,
  deleteRolePermission,
  resetRolePermissionsToDefaults,
} from "@/app/actions/permissions";
import { SYSTEM_PROTECTED_ROLES } from "@/lib/roles";

export interface RolePermission {
  id: string;
  role: string;
  menuItems: string;
  actions: string;
  description: string | null;
}

interface RolePermissionsManagerProps {
  initialPermissions: RolePermission[];
}

export const MENU_CATEGORIES = [
  {
    name: "Membresia & Pastoral",
    icon: Users,
    items: [
      {
        value: "/devocional",
        label: "Devocional (Check-in de Alma IA)",
        desc: "Aconselhamento espiritual e devocional diário",
      },
      {
        value: "/celulas",
        label: "Células & Pequenos Grupos",
        desc: "Gestão de reuniões nos lares e discipulado",
      },
      {
        value: "/membros",
        label: "Membros & Convites",
        desc: "Listagem de fiéis, aprovação e convites diretos",
      },
      {
        value: "/ministerios",
        label: "Ministérios da Igreja",
        desc: "Departamentos e equipes de serviço eclesial",
      },
      {
        value: "/admin/oracoes",
        label: "Pedidos de Oração (Pastoral)",
        desc: "Mural de intercessão e resposta a pedidos de fiéis",
      },
      {
        value: "/perfil",
        label: "Meu Perfil & Configurações",
        desc: "Dados cadastrais, senha, tema e carteirinha",
      },
    ],
  },
  {
    name: "Secretaria, Atas & Patrimônio",
    icon: FileText,
    items: [
      {
        value: "/admin/secretaria",
        label: "Secretaria Eclesiástica",
        desc: "Emissão de certidões, cartas e registros oficiais",
      },
      {
        value: "/admin/assembleias",
        label: "Assembleias & Votação de Atas",
        desc: "Convocação estatutária e votação de membros",
      },
      {
        value: "/admin/patrimonio",
        label: "Patrimônio & Inventário",
        desc: "Controle de bens móveis, imóveis e equipamentos",
      },
      {
        value: "/admin/ebd",
        label: "EBD & Discipulado",
        desc: "Escola Bíblica Dominical, turmas e frequências",
      },
    ],
  },
  {
    name: "Cultos, Eventos & Portaria",
    icon: Calendar,
    items: [
      {
        value: "/agenda",
        label: "Agenda Geral de Eventos",
        desc: "Calendário público de cultos e conferências",
      },
      {
        value: "/admin/eventos",
        label: "Gestão de Eventos & Lotes",
        desc: "Criação de ingressos, inscrições e relatórios",
      },
      {
        value: "/meus-ingressos",
        label: "Meus Ingressos & Inscrições",
        desc: "Visualização e QR Code de ingressos do usuário",
      },
      {
        value: "/videos",
        label: "Cultos Online & Transmissões",
        desc: "Mural de vídeos do YouTube e lives da igreja",
      },
      {
        value: "/admin/porteiro",
        label: "Porteiro Digital (Recepção)",
        desc: "Leitor de QR Code para crachás e ingressos",
      },
    ],
  },
  {
    name: "Kids & Segurança Infantil",
    icon: Baby,
    items: [
      {
        value: "/kids",
        label: "Ministério Infantil (Kids)",
        desc: "Aulas, histórico de recados e turmas infantis",
      },
      {
        value: "/admin/checkin",
        label: "Check-in Kids & Segurança",
        desc: "Etiquetas, check-in e check-out seguro na portaria",
      },
    ],
  },
  {
    name: "Finanças, IA & Governança",
    icon: Wallet,
    items: [
      {
        value: "/admin/finance",
        label: "Gestão Financeira (ERP)",
        desc: "Livro caixa, entradas, saídas e conciliação",
      },
      {
        value: "/doar",
        label: "Dízimos & Doações PIX",
        desc: "Página de contribuição da congregação com QR Code",
      },
      {
        value: "/configuracoes",
        label: "Configurações da Congregação",
        desc: "Dados da igreja, logotipo e chaves PIX",
      },
      {
        value: "/admin/agentes",
        label: "Agentes de IA Eclesiásticos",
        desc: "Assistentes virtuais e atendentes automatizados",
      },
    ],
  },
];

export const ACTION_CATEGORIES = [
  {
    name: "Membresia & Pequenos Grupos",
    items: [
      {
        value: "create_member",
        label: "Cadastrar / Aprovar Membros",
        desc: "Autorizar novos fiéis e emitir convites",
      },
      {
        value: "create_cell",
        label: "Criar Célula ou Grupo",
        desc: "Cadastrar novos pequenos grupos na congregação",
      },
      {
        value: "delete_cell",
        label: "Excluir Célula ou Grupo",
        desc: "Remover registros de grupos e células",
      },
      {
        value: "create_ministry",
        label: "Criar Ministério",
        desc: "Cadastrar novos departamentos de trabalho",
      },
      {
        value: "delete_ministry",
        label: "Excluir Ministério",
        desc: "Remover departamentos existentes",
      },
    ],
  },
  {
    name: "Secretaria, Pastoral & Ensino",
    items: [
      {
        value: "issue_documents",
        label: "Emitir Documentos & Certidões",
        desc: "Gerar certificados oficiais e cartas eclesiásticas",
      },
      {
        value: "manage_prayers",
        label: "Gerenciar Pedidos de Oração",
        desc: "Responder e orar pelos pedidos pastorais",
      },
      {
        value: "create_assembly",
        label: "Convocar Assembleias & Pautas",
        desc: "Criar votações e atas oficiais estatutárias",
      },
      {
        value: "manage_ebd",
        label: "Gerenciar Turmas e Aulas EBD",
        desc: "Cadastrar lições e registrar frequências",
      },
      {
        value: "manage_patrimony",
        label: "Gerenciar Bens e Patrimônio",
        desc: "Adicionar, tombar e dar baixa em equipamentos",
      },
    ],
  },
  {
    name: "Eventos, Recepção & Mídia",
    items: [
      {
        value: "create_event",
        label: "Criar Eventos na Agenda",
        desc: "Agendar novos cultos e conferências",
      },
      {
        value: "delete_event",
        label: "Excluir Eventos da Agenda",
        desc: "Cancelar e remover eventos do calendário",
      },
      {
        value: "manage_tickets",
        label: "Gerenciar Lotes de Ingressos",
        desc: "Configurar ingressos pagos ou gratuitos",
      },
      {
        value: "scan_badge",
        label: "Operar Scanner da Portaria",
        desc: "Validar crachás digitais e ingressos na portaria",
      },
      {
        value: "create_video",
        label: "Publicar Vídeos de Cultos",
        desc: "Adicionar transmissões ao mural da igreja",
      },
      {
        value: "delete_video",
        label: "Excluir Vídeos de Cultos",
        desc: "Remover vídeos do histórico de cultos",
      },
    ],
  },
  {
    name: "Kids & Finanças",
    items: [
      {
        value: "kids_checkin",
        label: "Operar Check-in Infantil",
        desc: "Registrar entrada e saída de crianças no culto",
      },
      {
        value: "manage_finance",
        label: "Gerenciar Finanças Plenas",
        desc: "Lançar receitas, despesas e aprovar contas",
      },
      {
        value: "export_tax_statement",
        label: "Emitir Informe de Dízimos IRPF",
        desc: "Gerar extratos anuais para declaração fiscal",
      },
      {
        value: "create_church",
        label: "Cadastrar Nova Filial / Igreja",
        desc: "Criar novas congregações no ecossistema",
      },
    ],
  },
];

// Listas planas para cálculos
const ALL_MENU_VALUES = MENU_CATEGORIES.flatMap((c) => c.items.map((i) => i.value));
const ALL_ACTION_VALUES = ACTION_CATEGORIES.flatMap((c) => c.items.map((i) => i.value));

export function RolePermissionsManager({ initialPermissions }: RolePermissionsManagerProps) {
  const [permissions, setPermissions] = useState<RolePermission[]>(initialPermissions);
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTabByRole, setActiveTabByRole] = useState<Record<string, "menus" | "actions">>({});

  // Modal de Criação de Perfil
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  // Modal de Exclusão de Perfil
  const [roleToDelete, setRoleToDelete] = useState<RolePermission | null>(null);

  // Modal de Confirmação de Restauração de Padrões
  const [openResetModal, setOpenResetModal] = useState(false);

  // Filtro de Perfis
  const filteredPermissions = useMemo(() => {
    if (!searchQuery.trim()) return permissions;
    const q = searchQuery.toLowerCase();
    return permissions.filter(
      (p) =>
        p.role.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [permissions, searchQuery]);

  // Manipular alternância de aba (Menus vs Ações) por card
  const getActiveTab = (roleId: string): "menus" | "actions" => {
    return activeTabByRole[roleId] || "menus";
  };

  const setActiveTab = (roleId: string, tab: "menus" | "actions") => {
    setActiveTabByRole((prev) => ({ ...prev, [roleId]: tab }));
  };

  // Criar Novo Perfil
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setIsCreating(true);
    const roleId = newRoleName.trim().toUpperCase().replace(/\s+/g, "_");

    const res = await createRolePermission(roleId, newRoleDesc);
    setIsCreating(false);

    if (res.success && res.newRole) {
      toast.success(`Perfil ${roleId} criado com sucesso!`);
      setPermissions((prev) => [...prev, res.newRole as RolePermission]);
      setOpenCreateModal(false);
      setNewRoleName("");
      setNewRoleDesc("");
    } else {
      toast.error(res.error || "Erro ao criar perfil. Verifique se o nome já existe.");
    }
  };

  // Excluir Perfil
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    startTransition(async () => {
      const res = await deleteRolePermission(roleToDelete.id);
      if (res.success) {
        toast.success(`Perfil "${roleToDelete.role}" excluído com sucesso!`);
        setPermissions((prev) => prev.filter((p) => p.id !== roleToDelete.id));
        setRoleToDelete(null);
      } else {
        toast.error(res.error || "Falha ao excluir perfil.");
      }
    });
  };

  // Restaurar Padrões Recomendados
  const handleResetDefaults = async () => {
    setIsResetting(true);
    const res = await resetRolePermissionsToDefaults();
    setIsResetting(false);

    if (res.success && res.permissions) {
      toast.success("Padrões recomendados do Horeb restaurados com sucesso!");
      setPermissions(res.permissions as RolePermission[]);
      setOpenResetModal(false);
    } else {
      toast.error(res.error || "Falha ao restaurar padrões.");
    }
  };

  // Toggle de Menu Individual
  const handleMenuToggle = (roleId: string, menuValue: string) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id !== roleId) return p;
        let currentMenus: string[] = [];
        try {
          currentMenus = JSON.parse(p.menuItems);
        } catch {}

        if (currentMenus.includes("ALL")) {
          currentMenus = [...ALL_MENU_VALUES];
        }

        if (currentMenus.includes(menuValue)) {
          currentMenus = currentMenus.filter((m) => m !== menuValue);
        } else {
          currentMenus.push(menuValue);
        }
        return { ...p, menuItems: JSON.stringify(currentMenus) };
      })
    );
  };

  // Toggle de Ação Individual
  const handleActionToggle = (roleId: string, actionValue: string) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id !== roleId) return p;
        let currentActions: string[] = [];
        try {
          currentActions = JSON.parse(p.actions || "[]");
        } catch {}

        if (currentActions.includes("ALL")) {
          currentActions = [...ALL_ACTION_VALUES];
        }

        if (currentActions.includes(actionValue)) {
          currentActions = currentActions.filter((a) => a !== actionValue);
        } else {
          currentActions.push(actionValue);
        }
        return { ...p, actions: JSON.stringify(currentActions) };
      })
    );
  };

  // Selecionar / Desmarcar Todos os Menus
  const handleSelectAllMenus = (roleId: string, selectAll: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id !== roleId) return p;
        return {
          ...p,
          menuItems: JSON.stringify(selectAll ? ALL_MENU_VALUES : []),
        };
      })
    );
  };

  // Selecionar / Desmarcar Todas as Ações
  const handleSelectAllActions = (roleId: string, selectAll: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id !== roleId) return p;
        return {
          ...p,
          actions: JSON.stringify(selectAll ? ALL_ACTION_VALUES : []),
        };
      })
    );
  };

  // Salvar Permissões de um Perfil
  const handleSave = (role: RolePermission) => {
    startTransition(async () => {
      let parsedMenus: string[] = [];
      let parsedActions: string[] = [];
      try {
        parsedMenus = JSON.parse(role.menuItems);
      } catch {}
      try {
        parsedActions = JSON.parse(role.actions || "[]");
      } catch {}

      const res = await updateRolePermission(role.id, parsedMenus, parsedActions);
      if (res.success) {
        toast.success(`Permissões do perfil "${role.role}" atualizadas com sucesso!`);
      } else {
        toast.error(`Falha ao salvar: ${res.error}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* CABEÇALHO EXECUTIVO RBAC                                                  */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-card via-card/90 to-muted/40 border border-border shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                <span>Controle de Acessos & Permissões (RBAC)</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  {permissions.length} Perfis
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Governança de granularidade eclesiástica: defina quais menus e ações cada nível hierárquico pode acessar.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação Global */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpenResetModal(true)}
            className="h-10 px-3.5 rounded-xl border-border bg-card/80 hover:bg-muted text-xs font-bold gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 text-amber-500" />
            <span>Restaurar Padrões</span>
          </Button>

          <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
            <DialogTrigger render={
              <Button className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer">
                <PlusCircle className="w-4 h-4" />
                <span>+ Criar Novo Perfil</span>
              </Button>
            } />
            <DialogContent className="max-w-md bg-card border border-border text-card-foreground rounded-3xl p-6 shadow-2xl">
              <DialogHeader className="text-left space-y-2">
                <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  Criar Novo Perfil de Acesso
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  O identificador do perfil será formatado automaticamente em maiúsculas (ex: DIACONO, COORDENADOR_MIDIA).
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateRole} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Nome do Perfil *</label>
                  <Input
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Ex: Secretário Eclesiástico"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl h-10 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Descrição Operacional (Opcional)</label>
                  <Input
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    placeholder="Ex: Responsável por atas de assembleias e emissão de documentos"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl h-10 text-xs font-medium"
                  />
                </div>

                <DialogFooter className="pt-2 sm:justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpenCreateModal(false)}
                    className="rounded-xl text-xs font-bold text-muted-foreground"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="h-10 px-5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg cursor-pointer"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Perfil"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE PESQUISA & RESUMO DE RECURSOS                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por nome de perfil (ex: PASTOR, SECRETARIA, KIDS)..."
            className="pl-10 h-10 bg-card border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Badge variant="outline" className="rounded-lg text-[11px] font-bold border-border bg-card">
            {ALL_MENU_VALUES.length} Módulos Disponíveis
          </Badge>
          <Badge variant="outline" className="rounded-lg text-[11px] font-bold border-border bg-card">
            {ALL_ACTION_VALUES.length} Ações Operacionais
          </Badge>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LISTAGEM DOS CARDS DE PERFIS                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredPermissions.map((rolePerm) => {
          let selectedMenus: string[] = [];
          let selectedActions: string[] = [];
          try {
            selectedMenus = JSON.parse(rolePerm.menuItems);
          } catch {}
          try {
            selectedActions = JSON.parse(rolePerm.actions || "[]");
          } catch {}

          const isProtected = SYSTEM_PROTECTED_ROLES.includes(rolePerm.role);
          const activeTab = getActiveTab(rolePerm.id);

          // Contagens ativas
          const menusCount = selectedMenus.includes("ALL")
            ? ALL_MENU_VALUES.length
            : selectedMenus.length;
          const actionsCount = selectedActions.includes("ALL")
            ? ALL_ACTION_VALUES.length
            : selectedActions.length;

          return (
            <div
              key={rolePerm.id}
              className="rounded-3xl bg-card border border-border shadow-xl overflow-hidden flex flex-col justify-between transition-all"
            >
              {/* Header do Card */}
              <div className="p-5 border-b border-border/80 bg-muted/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-black text-foreground tracking-tight truncate">
                        {rolePerm.role}
                      </h4>

                      {isProtected ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Nativo</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                          Personalizado
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {rolePerm.description || "Perfil sem descrição cadastrada."}
                    </p>
                  </div>

                  {/* Botões do Card: Salvar e Excluir */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isProtected && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setRoleToDelete(rolePerm)}
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Excluir Perfil Personalizado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={() => handleSave(rolePerm)}
                      disabled={isPending}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-bold h-8 px-3 rounded-xl text-xs gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isPending ? "Salvando..." : "Salvar"}</span>
                    </Button>
                  </div>
                </div>

                {/* Seletor de Aba do Card & Ações Rápidas */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Abas: Menus vs Ações */}
                  <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border">
                    <button
                      type="button"
                      onClick={() => setActiveTab(rolePerm.id, "menus")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "menus"
                          ? "bg-amber-500 text-black shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>Menus ({menusCount}/{ALL_MENU_VALUES.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab(rolePerm.id, "actions")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "actions"
                          ? "bg-amber-500 text-black shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>Ações ({actionsCount}/{ALL_ACTION_VALUES.length})</span>
                    </button>
                  </div>

                  {/* Ações Rápidas de Marcar/Desmarcar Todos */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {activeTab === "menus" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSelectAllMenus(rolePerm.id, true)}
                          className="px-2 py-1 rounded-lg font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          Marcar Todos
                        </button>
                        <span className="text-muted-foreground/40">•</span>
                        <button
                          type="button"
                          onClick={() => handleSelectAllMenus(rolePerm.id, false)}
                          className="px-2 py-1 rounded-lg font-bold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          Limpar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSelectAllActions(rolePerm.id, true)}
                          className="px-2 py-1 rounded-lg font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          Marcar Todas
                        </button>
                        <span className="text-muted-foreground/40">•</span>
                        <button
                          type="button"
                          onClick={() => handleSelectAllActions(rolePerm.id, false)}
                          className="px-2 py-1 rounded-lg font-bold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          Limpar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Conteúdo da Aba Ativa */}
              <div className="p-5 space-y-5 max-h-[500px] overflow-y-auto">
                {activeTab === "menus" ? (
                  /* ========================================================= */
                  /* LISTAGEM DE MENUS / ROTAS AGRUPADOS POR CATEGORIA          */
                  /* ========================================================= */
                  <div className="space-y-4">
                    {MENU_CATEGORIES.map((category) => {
                      const CategoryIcon = category.icon;
                      return (
                        <div key={category.name} className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                            <CategoryIcon className="w-3.5 h-3.5 text-amber-500" />
                            <span>{category.name}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {category.items.map((item) => {
                              const isSelected =
                                selectedMenus.includes(item.value) ||
                                selectedMenus.includes("ALL");

                              return (
                                <label
                                  key={item.value}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-all ${
                                    isSelected
                                      ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
                                      : "bg-muted/30 border-border/70 hover:border-border hover:bg-muted/60"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleMenuToggle(rolePerm.id, item.value)}
                                    className="accent-amber-500 rounded mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`text-xs font-bold leading-tight ${
                                        isSelected ? "text-amber-500 font-extrabold" : "text-foreground"
                                      }`}
                                    >
                                      {item.label}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                      {item.desc}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ========================================================= */
                  /* LISTAGEM DE AÇÕES OPERACIONAIS AGRUPADAS POR CATEGORIA     */
                  /* ========================================================= */
                  <div className="space-y-4">
                    {ACTION_CATEGORIES.map((category) => (
                      <div key={category.name} className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{category.name}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {category.items.map((item) => {
                            const isSelected =
                              selectedActions.includes(item.value) ||
                              selectedActions.includes("ALL");

                            return (
                              <label
                                key={item.value}
                                className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-all ${
                                  isSelected
                                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                                    : "bg-muted/30 border-border/70 hover:border-border hover:bg-muted/60"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleActionToggle(rolePerm.id, item.value)}
                                  className="accent-emerald-500 rounded mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                                />
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-xs font-bold leading-tight ${
                                      isSelected ? "text-emerald-500 font-extrabold" : "text-foreground"
                                    }`}
                                  >
                                    {item.label}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                    {item.desc}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rodapé do Card */}
              <div className="p-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Rota interna do perfil: <code className="font-mono text-amber-500">{rolePerm.role}</code>
                </span>
                <span className="font-bold">
                  {menusCount} menus • {actionsCount} ações
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE PERFIL                                */}
      {/* ========================================================================= */}
      <Dialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <DialogContent className="max-w-md bg-card border border-border text-card-foreground rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-lg font-black text-rose-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              <span>Excluir Perfil "{roleToDelete?.role}"?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta ação removerá permanentemente as regras deste perfil do sistema. Usuários vinculados a este perfil perderão o acesso às rotas configuradas até que um novo papel lhes seja atribuído.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRoleToDelete(null)}
              className="rounded-xl text-xs font-bold text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={isPending}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700"
            >
              {isPending ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE RESTAURAÇÃO DE PADRÕES                            */}
      {/* ========================================================================= */}
      <Dialog open={openResetModal} onOpenChange={setOpenResetModal}>
        <DialogContent className="max-w-md bg-card border border-border text-card-foreground rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              <span>Restaurar Padrões Recomendados?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Isso atualizará os perfis nativos (ADMIN, PASTOR, SECRETARIA, LEADER, FINANCIAL, KIDS, PORTEIRO, MEMBER) com todas as 21 rotas e 20 ações recém-criadas na plataforma, garantindo compatibilidade total com os novos módulos.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 flex items-start gap-2.5 my-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Perfis customizados não serão excluídos, apenas os padrões oficiais do sistema serão sincronizados com as novas permissões.
            </p>
          </div>

          <DialogFooter className="pt-2 sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpenResetModal(false)}
              className="rounded-xl text-xs font-bold text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleResetDefaults}
              disabled={isResetting}
              className="h-10 px-5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg cursor-pointer"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                "Sim, Restaurar Padrões"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
