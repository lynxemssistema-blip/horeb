"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Church, Bell, ArrowLeftRight, UserPlus, HelpCircle, LogOut, Crown, ShieldCheck, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberSignupDialog } from "@/components/member-signup-dialog";
import { HelpGuideDialog } from "@/components/help-guide-dialog";
import { PastoralCabinetModal } from "@/components/pastoral-cabinet-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { logoutUser } from "@/app/actions/tenant";

interface AppHeaderProps {
  slug: string;
  name: string;
  primaryColor?: string;
  logoUrl?: string | null;
  isMatriz: boolean;
  parent?: { id: string; name: string; slug: string } | null;
  branches?: { id: string; name: string; slug: string; primaryColor: string }[];
  currentUser?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
  } | null;
  userRole?: string;
  userName?: string;
  userAvatar?: string | null;
}

export function AppHeader({
  slug,
  name,
  primaryColor = "#dc2626",
  logoUrl,
  isMatriz,
  parent,
  branches = [],
  currentUser,
  userRole,
  userName,
  userAvatar,
}: AppHeaderProps) {
  const [isCabinetOpen, setIsCabinetOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Formata o nome para exibição elegante (ex: "Pastor Luan" ao invés de apenas "Pastor")
  const getDisplayUserName = (fullName?: string) => {
    if (!fullName) return "Usuário";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (
      parts[0].toLowerCase().startsWith("pastor") ||
      parts[0].toLowerCase().startsWith("pr") ||
      parts[0].toLowerCase().startsWith("pra")
    ) {
      return `${parts[0]} ${parts[1]}`;
    }
    return `${parts[0]} ${parts[1]}`;
  };

  // Alvo de alternância dinâmico
  const targetBranch = branches[0];
  const switchTargetSlug = isMatriz
    ? (targetBranch ? targetBranch.slug : "filial")
    : (parent ? parent.slug : "matriz");
  const switchTargetLabel = isMatriz
    ? (targetBranch ? `Ver Filial (${targetBranch.name})` : "Ver Filial")
    : (parent ? `Ver Sede (${parent.name})` : "Ver Matriz");

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/60 transition-colors pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Church Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0 bg-black/40">
            <AvatarImage src={logoUrl || `/api/icon/${slug}`} alt={name} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">
                {name}
              </h1>
              <span
                className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${
                  isMatriz
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {isMatriz ? "Sede" : "Filial"}
              </span>
            </div>
            {parent && !isMatriz && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[140px] sm:max-w-none">
                Vinculada à {parent.name}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Badge & Atalho de Acesso do Usuário com Foto de Perfil */}
          {userName && (
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-muted/80 hover:bg-muted border border-border shadow-xs transition-colors cursor-pointer"
              title="Clique para ver detalhes do seu usuário conectado"
            >
              <div className="relative shrink-0">
                <Avatar className="h-6 w-6 ring-1 ring-primary/40">
                  {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                  <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-background rounded-full" />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>{getDisplayUserName(userName)}</span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/20">
                  {userRole === "ADMIN" || userRole === "SUPERADMIN" ? "Master" : userRole === "PASTOR" ? "Pastor" : "Membro"}
                </span>
              </div>
            </button>
          )}

          {/* Acesso Rápido ao Gabinete Pastoral para Pastores e Administradores */}
          {(userRole === "PASTOR" || userRole === "ADMIN" || userRole === "SUPERADMIN") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCabinetOpen(true)}
              className="h-8 px-2 sm:px-2.5 rounded-full text-xs font-bold gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 cursor-pointer"
              title="Abrir Gabinete Pastoral (Status Ao Vivo, Fila e Agenda)"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Gabinete Pastoral</span>
            </Button>
          )}

          {/* Botão de Auto-Cadastro de Membro nesta Igreja */}
          <MemberSignupDialog
            churchName={name}
            churchSlug={slug}
            primaryColor={primaryColor}
          />

          {/* Quick Demo Switcher */}
          <Link
            href={`/${switchTargetSlug}`}
            className="flex items-center gap-1 text-xs font-medium px-2 sm:px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border min-h-[32px]"
            title={`Alternar para ${switchTargetSlug}`}
          >
            <ArrowLeftRight className="w-3 h-3 text-primary shrink-0" />
            <span className="hidden sm:inline">{switchTargetLabel}</span>
            <span className="sm:hidden text-[10px] font-semibold">
              {isMatriz ? "FILIAL" : "SEDE"}
            </span>
          </Link>

          {/* Guia & Manual */}
          <HelpGuideDialog
            triggerButton={
              <button
                type="button"
                aria-label="Manual e Ajuda"
                title="Manual e Central de Ajuda"
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            }
          />

          {/* Sair / Logout */}
          <button
            type="button"
            onClick={async () => {
              await logoutUser();
              window.location.href = "/";
            }}
            aria-label="Encerrar Sessão"
            title="Encerrar Sessão (Sair)"
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Modal do Gabinete Pastoral */}
      <PastoralCabinetModal
        isOpen={isCabinetOpen}
        onClose={() => setIsCabinetOpen(false)}
        slug={slug}
      />

      {/* Modal de Detalhes do Usuário Conectado */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-card border-border shadow-2xl">
          <DialogHeader className="text-center pb-2">
            <div className="relative mx-auto mb-2">
              <Avatar className="h-16 w-16 ring-4 ring-primary/20 mx-auto">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                <AvatarFallback className="text-lg font-bold bg-primary text-primary-foreground">
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-1/2 translate-x-6 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full" title="Conectado" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {userName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {currentUser?.email || (userName ? `${userName.toLowerCase().replace(/\s+/g, ".")}@horeb.app` : "")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status da Conta:</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Conectado ao Vivo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nível de Acesso:</span>
                <span className="font-bold text-foreground uppercase">
                  {userRole === "ADMIN" || userRole === "SUPERADMIN" ? "Administrador Master" : userRole}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Igreja Atual:</span>
                <span className="font-semibold text-foreground">
                  {name} ({isMatriz ? "Sede" : "Filial"})
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {(userRole === "ADMIN" || userRole === "SUPERADMIN") && (
                <Link
                  href={`/${slug}/membros`}
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full h-10 rounded-xl font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center gap-2 transition-colors"
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Gerenciar Membros & Níveis de Acesso</span>
                </Link>
              )}

              <Button
                variant="destructive"
                onClick={async () => {
                  await logoutUser();
                  window.location.href = "/";
                }}
                className="w-full h-10 rounded-xl font-bold gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta (Logout)</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
