"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck, Save, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateRolePermission, createRolePermission } from "@/app/actions/permissions";

interface RolePermission {
  id: string;
  role: string;
  menuItems: string;
  actions: string;
  description: string | null;
}

interface RolePermissionsManagerProps {
  initialPermissions: RolePermission[];
}

const ALL_MENUS = [
  { value: "/devocional", label: "Devocional (IA)" },
  { value: "/admin/finance", label: "Financeiro (ERP)" },
  { value: "/celulas", label: "Células & Grupos" },
  { value: "/doar", label: "Dízimos & Doações" },
  { value: "/videos", label: "Vídeos & Cultos" },
  { value: "/agenda", label: "Agenda & Eventos" },
  { value: "/ministerios", label: "Ministérios" },
  { value: "/kids", label: "Kids" },
  { value: "/membros", label: "Membros" },
  { value: "/configuracoes", label: "Configurações" },
  { value: "/admin/agentes", label: "Agentes de IA" },
];

const ALL_ACTIONS = [
  { value: "create_cell", label: "Criar Célula/Grupo" },
  { value: "delete_cell", label: "Excluir Célula/Grupo" },
  { value: "create_video", label: "Adicionar Vídeo/Culto" },
  { value: "delete_video", label: "Excluir Vídeo/Culto" },
  { value: "create_event", label: "Criar Evento na Agenda" },
  { value: "delete_event", label: "Excluir Evento da Agenda" },
  { value: "create_member", label: "Aprovar/Cadastrar Membros" },
  { value: "create_ministry", label: "Criar Ministério" },
  { value: "delete_ministry", label: "Excluir Ministério" },
  { value: "create_church", label: "Cadastrar Nova Filial / Igreja" },
  { value: "manage_finance", label: "Gerenciar Financeiro Total" },
];

export function RolePermissionsManager({ initialPermissions }: RolePermissionsManagerProps) {
  const [permissions, setPermissions] = useState<RolePermission[]>(initialPermissions);
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  
  // Modal de Novo Perfil
  const [openModal, setOpenModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    
    setIsCreating(true);
    const roleId = newRoleName.trim().toUpperCase().replace(/\s+/g, '_');
    
    const res = await createRolePermission(roleId, newRoleDesc);
    setIsCreating(false);
    
    if (res.success && res.newRole) {
      toast.success(`Perfil ${roleId} criado com sucesso!`);
      setPermissions(prev => [...prev, res.newRole as RolePermission]);
      setOpenModal(false);
      setNewRoleName("");
      setNewRoleDesc("");
    } else {
      toast.error(res.error || "Erro ao criar perfil. Verifique se o nome já existe.");
    }
  };

  const handleMenuToggle = (roleId: string, menuValue: string) => {
    setPermissions(prev => prev.map(p => {
      if (p.id !== roleId) return p;
      let currentMenus = [];
      try { currentMenus = JSON.parse(p.menuItems); } catch { }
      
      if (currentMenus.includes("ALL")) {
        currentMenus = ALL_MENUS.map(m => m.value);
      }
      
      if (currentMenus.includes(menuValue)) {
        currentMenus = currentMenus.filter((m: string) => m !== menuValue);
      } else {
        currentMenus.push(menuValue);
      }
      return { ...p, menuItems: JSON.stringify(currentMenus) };
    }));
  };

  const handleActionToggle = (roleId: string, actionValue: string) => {
    setPermissions(prev => prev.map(p => {
      if (p.id !== roleId) return p;
      let currentActions = [];
      try { currentActions = JSON.parse(p.actions || "[]"); } catch { }
      
      if (currentActions.includes("ALL")) {
        currentActions = ALL_ACTIONS.map(a => a.value);
      }
      
      if (currentActions.includes(actionValue)) {
        currentActions = currentActions.filter((a: string) => a !== actionValue);
      } else {
        currentActions.push(actionValue);
      }
      return { ...p, actions: JSON.stringify(currentActions) };
    }));
  };

  const handleSave = (role: RolePermission) => {
    startTransition(async () => {
      let parsedMenus = [];
      let parsedActions = [];
      try { parsedMenus = JSON.parse(role.menuItems); } catch { }
      try { parsedActions = JSON.parse(role.actions || "[]"); } catch { }

      const res = await updateRolePermission(role.id, parsedMenus, parsedActions);
      if (res.success) {
        toast.success(`Permissões para ${role.role} atualizadas!`);
      } else {
        toast.error(`Falha: ${res.error}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>Controle de Acessos (RBAC)</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure quais menus cada perfil pode visualizar e quais ações específicas podem realizar.
          </p>
        </div>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger render={
            <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs h-10 px-4 rounded-xl gap-1.5 shadow-lg shadow-amber-500/20">
              <PlusCircle className="w-4 h-4" />
              <span>+ Criar Novo Perfil</span>
            </Button>
          } />
          <DialogContent className="max-w-md bg-card border border-border text-card-foreground rounded-3xl p-6">
            <DialogHeader className="text-left space-y-2">
              <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                Criar Novo Perfil de Acesso
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                O ID do perfil será gerado automaticamente em maiúsculas (ex: LIDER_JOVENS).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateRole} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Nome do Perfil *</label>
                <Input
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ex: Líder de Jovens"
                  className="bg-black/50 border-white/10 text-white rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Descrição (Opcional)</label>
                <Input
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Ex: Acesso apenas para gerenciar a rede de jovens"
                  className="bg-black/50 border-white/10 text-white rounded-xl h-10 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={isCreating}
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-lg mt-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando Perfil...
                  </>
                ) : (
                  "Criar Perfil"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {permissions.map((rolePerm) => {
          let selectedMenus: string[] = [];
          let selectedActions: string[] = [];
          try { selectedMenus = JSON.parse(rolePerm.menuItems); } catch { }
          try { selectedActions = JSON.parse(rolePerm.actions || "[]"); } catch { }

          return (
            <div key={rolePerm.id} className="p-5 rounded-2xl bg-zinc-900 border border-white/10 space-y-5 shadow-lg">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div>
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    {rolePerm.role}
                  </h4>
                  <p className="text-[10px] text-zinc-400">{rolePerm.description}</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleSave(rolePerm)}
                  disabled={isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-8 text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Salvar
                </Button>
              </div>
              
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-300">Menus Permitidos (Visibilidade):</span>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_MENUS.map((menu) => {
                    const isSelected = selectedMenus.includes(menu.value) || selectedMenus.includes("ALL");
                    return (
                      <label 
                        key={menu.value} 
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                          isSelected ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/20 border-white/5 hover:bg-black/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleMenuToggle(rolePerm.id, menu.value)}
                          className="accent-amber-500 rounded bg-zinc-900 border-white/20"
                        />
                        <span className={`text-[11px] ${isSelected ? 'text-amber-400 font-medium' : 'text-zinc-500'}`}>
                          {menu.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-xs font-semibold text-zinc-300">Ações Permitidas (Criação/Edição):</span>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ACTIONS.map((action) => {
                    const isSelected = selectedActions.includes(action.value) || selectedActions.includes("ALL");
                    return (
                      <label 
                        key={action.value} 
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                          isSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/20 border-white/5 hover:bg-black/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleActionToggle(rolePerm.id, action.value)}
                          className="accent-emerald-500 rounded bg-zinc-900 border-white/20"
                        />
                        <span className={`text-[11px] ${isSelected ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                          {action.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
