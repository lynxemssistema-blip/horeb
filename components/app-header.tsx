"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Church, Bell, ArrowLeftRight, UserPlus } from "lucide-react";
import { MemberSignupDialog } from "@/components/member-signup-dialog";

interface AppHeaderProps {
  slug: string;
  name: string;
  primaryColor?: string;
  logoUrl?: string | null;
  isMatriz: boolean;
  parent?: { id: string; name: string; slug: string } | null;
  branches?: { id: string; name: string; slug: string; primaryColor: string }[];
}

export function AppHeader({
  slug,
  name,
  primaryColor = "#dc2626",
  logoUrl,
  isMatriz,
  parent,
  branches = [],
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
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left: Church Info */}
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 ring-2 ring-primary/20 shrink-0">
            {logoUrl ? (
              <AvatarImage src={logoUrl} alt={name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              <Church className="w-4 h-4 text-primary" />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                {name}
              </h1>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full ${
                  isMatriz
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {isMatriz ? "Sede" : "Filial"}
              </span>
            </div>
            {parent && !isMatriz && (
              <span className="text-[10px] text-muted-foreground truncate">
                Vinculada à {parent.name}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Botão de Auto-Cadastro de Membro nesta Igreja */}
          <MemberSignupDialog
            churchName={name}
            churchSlug={slug}
            primaryColor={primaryColor}
          />

          {/* Quick Demo Switcher */}
          <Link
            href={`/${switchTargetSlug}`}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border"
            title={`Alternar para ${switchTargetSlug}`}
          >
            <ArrowLeftRight className="w-3 h-3 text-primary" />
            <span className="hidden sm:inline">{switchTargetLabel}</span>
            <span className="sm:hidden text-[11px] font-semibold">
              {isMatriz ? "FILIAL" : "SEDE"}
            </span>
          </Link>

          <Link
            href="/"
            className="text-[11px] font-bold text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20"
            title="Ir para o Portal Horeb"
          >
            HOREB
          </Link>

          <button
            type="button"
            aria-label="Notificações"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          </button>
        </div>
      </div>
    </header>
  );
}
