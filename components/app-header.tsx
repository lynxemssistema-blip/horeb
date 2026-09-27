"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Church, Bell, ArrowLeftRight, UserPlus, HelpCircle, LogOut, Crown, ShieldCheck } from "lucide-react";
import { MemberSignupDialog } from "@/components/member-signup-dialog";
import { HelpGuideDialog } from "@/components/help-guide-dialog";
import { logoutUser } from "@/app/actions/tenant";

interface AppHeaderProps {
  slug: string;
  name: string;
  primaryColor?: string;
  logoUrl?: string | null;
  isMatriz: boolean;
  parent?: { id: string; name: string; slug: string } | null;
  branches?: { id: string; name: string; slug: string; primaryColor: string }[];
  userRole?: string;
  userName?: string;
}

export function AppHeader({
  slug,
  name,
  primaryColor = "#dc2626",
  logoUrl,
  isMatriz,
  parent,
  branches = [],
  userRole,
  userName,
}: AppHeaderProps) {
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
          <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0">
            {logoUrl ? (
              <AvatarImage src={logoUrl} alt={name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              <Church className="w-4 h-4 text-primary" />
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
          {/* Badge & Atalho de Acesso do Usuário Master */}
          {(userRole === "ADMIN" || userRole === "SUPERADMIN") && (
            <Link
              href={`/${slug}/membros`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold transition-all shadow-sm"
              title="Você é o Usuário Master desta igreja. Clique para gerenciar membros e níveis de acesso."
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Master ({userName ? userName.split(" ")[0] : "Admin"})</span>
              <span className="sm:hidden text-[10px]">Acessos</span>
            </Link>
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
    </header>
  );
}
