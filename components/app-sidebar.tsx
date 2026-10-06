"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  HeartHandshake,
  Baby,
  Building2,
  ExternalLink,
  ShieldCheck,
  Palette,
  UserPlus,
  Settings,
  PlusCircle,
  Sparkles,
  Tv,
  HelpCircle,
  LogOut,
  Wallet,
  Receipt,
  Bot,
  Calendar,
  Crown,
  User,
  FileText,
  GraduationCap,
  Scale,
  Package,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateChurchDialog } from "@/components/create-church-dialog";
import { HelpGuideDialog } from "@/components/help-guide-dialog";
import { logoutUser } from "@/app/actions/tenant";

interface Branch {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
}

interface AppSidebarProps {
  slug: string;
  name: string;
  tenantId?: string;
  logoUrl?: string | null;
  primaryColor: string;
  isMatriz: boolean;
  parent?: { name: string; slug: string } | null;
  branches?: Branch[];
  accessRules?: { allowedMenus: string[], allowedActions: string[] } | null;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
  } | null;
}

export function AppSidebar({
  slug,
  name,
  tenantId,
  logoUrl,
  primaryColor,
  isMatriz,
  parent,
  branches = [],
  accessRules,
  currentUser,
}: AppSidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Início",
      href: `/${slug}`,
      icon: Home,
      exact: true,
    },
    {
      name: "Check-in de Alma (Devocional)",
      href: `/${slug}/devocional`,
      icon: Sparkles,
      highlightBadge: "IA",
    },
    {
      name: "Gestão Financeira (ERP)",
      href: `/${slug}/admin/finance`,
      icon: Wallet,
      highlightBadge: "Novo",
    },
    {
      name: "Células & Grupos",
      href: `/${slug}/celulas`,
      icon: Users,
    },
    {
      name: "Dízimos & Doações",
      href: `/${slug}/doar`,
      icon: HeartHandshake,
    },
    {
      name: "Cultos Online & Vídeos",
      href: `/${slug}/videos`,
      icon: Tv,
    },
    {
      name: "Agenda & Eventos",
      href: `/${slug}/agenda`,
      icon: Calendar,
    },
    {
      name: "Ministérios da Igreja",
      href: `/${slug}/ministerios`,
      icon: Sparkles,
    },
    {
      name: "Ministério Kids",
      href: `/${slug}/kids`,
      icon: Baby,
    },
    {
      name: "Membros & Convites",
      href: `/${slug}/membros`,
      icon: UserPlus,
    },
    {
      name: "Meu Perfil",
      href: `/${slug}/perfil`,
      icon: User,
    },
    {
      name: "Configurações da Igreja",
      href: `/${slug}/configuracoes`,
      icon: Settings,
    },
  ];

  let filteredNavigation = navigation;

  // Filter based on access rules if not ALL
  if (accessRules && !accessRules.allowedMenus.includes("ALL")) {
    filteredNavigation = navigation.filter((item) => {
      // Check if item.href ends with one of the allowed menus
      // e.g., allowed: "/celulas", href: "/igreja-a/celulas"
      return accessRules.allowedMenus.some((allowed) => item.href.endsWith(allowed)) || item.exact; 
      // Keep exact path (Início / Dashboard) always available
    });
  }

  // Adiciona 'Agentes de IA' apenas se for Matriz
  if (isMatriz) {
    const agentsHref = `/${slug}/admin/agentes`;
    if (accessRules?.allowedMenus.includes("ALL") || accessRules?.allowedMenus.some(allowed => agentsHref.endsWith(allowed))) {
      filteredNavigation.push({
        name: "Configurar IA (Agentes)",
        href: agentsHref,
        icon: Bot,
        highlightBadge: "SUPER",
      } as any);
    }
  }

  // Atalho exclusivo para Super Admin
  if (currentUser?.role === "SUPERADMIN") {
    filteredNavigation.unshift({
      name: "Painel Super Admin",
      href: "/admin",
      icon: Crown,
      highlightBadge: "MASTER",
    } as any);
  }

  // Painel de Pedidos de Oração para ADMIN, PASTOR e SUPERADMIN em qualquer congregação
  const isLeadership =
    currentUser?.role === "SUPERADMIN" ||
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "PASTOR";

  if (isLeadership) {
    const leadershipItems = [
      {
        name: "Pedidos de Oração",
        href: `/${slug}/admin/oracoes`,
        icon: HeartHandshake,
        highlightBadge: "Pastoral",
      },
      {
        name: "Secretaria & Documentos",
        href: `/${slug}/admin/secretaria`,
        icon: FileText,
        highlightBadge: "Oficial",
      },
      {
        name: "EBD & Discipulado",
        href: `/${slug}/admin/ebd`,
        icon: GraduationCap,
        highlightBadge: "EBD",
      },
      {
        name: "Assembleias & Votação",
        href: `/${slug}/admin/assembleias`,
        icon: Scale,
        highlightBadge: "Voto",
      },
      {
        name: "Patrimônio & Inventário",
        href: `/${slug}/admin/patrimonio`,
        icon: Package,
        highlightBadge: "Bens",
      },
    ];

    leadershipItems.forEach((leadItem, index) => {
      if (
        !filteredNavigation.some((item) => item.href === leadItem.href) &&
        (!accessRules || accessRules.allowedMenus.includes("ALL") || accessRules.allowedMenus.some((allowed) => leadItem.href.endsWith(allowed)))
      ) {
        filteredNavigation.splice(2 + index, 0, leadItem as any);
      }
    });
  }

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-border bg-card/60 backdrop-blur-md min-h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 ring-2 ring-primary/25 shrink-0 shadow-sm bg-black/40">
            <AvatarImage src={logoUrl || `/api/icon/${slug}`} alt={name} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-foreground truncate">{name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full inline-block",
                  isMatriz
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {isMatriz ? "Matriz Sede" : "Congregação"}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block shrink-0"
                  style={{ backgroundColor: primaryColor }}
                />
                {primaryColor}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
          Menu Principal
        </div>
        {filteredNavigation.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-transform group-hover:scale-110",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )}
              />
              <span className="flex-1 truncate">{item.name}</span>
              {"highlightBadge" in item && (
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.highlightBadge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Multi-Tenant Hierarchy Section */}
        <div className="pt-6 border-t border-border/40 mt-4">
          <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center justify-between">
            <span>Rede de Igrejas</span>
            <Building2 className="w-3.5 h-3.5" />
          </div>

          {/* Atalho Master para Superadmin alternar entre todas as congregações */}
          {currentUser?.role === "SUPERADMIN" && (
            <div className="px-2 mb-3">
              <Link href="/select-church">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-black gap-1.5 h-9 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 transition-all cursor-pointer shadow-xs"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ver Todas as Igrejas</span>
                </Button>
              </Link>
            </div>
          )}

          {/* If Mother Church, show branches and Add Branch Button */}
          {isMatriz && (
            <div className="space-y-2">
              <span className="px-3 text-[11px] text-muted-foreground block mb-1">
                Filiais Vinculadas ({branches.length}):
              </span>

              {branches.length > 0 ? (
                <div className="space-y-1">
                  {branches.map((b) => (
                    <Link
                      key={b.id}
                      href={`/${b.slug}`}
                      className="flex items-center justify-between px-3 py-2 text-xs rounded-md text-foreground hover:bg-muted/80 transition-colors border border-transparent hover:border-border group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: b.primaryColor }}
                        />
                        <span className="truncate font-medium">{b.name}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="px-3 text-[11px] text-muted-foreground italic">
                  Nenhuma filial cadastrada ainda.
                </p>
              )}

              {/* Botão para a Matriz Cadastrar Nova Filial */}
              {(!accessRules || accessRules.allowedActions?.includes("ALL") || accessRules.allowedActions?.includes("create_church")) && (
                <div className="px-2 pt-2">
                  <CreateChurchDialog
                    defaultTab="branch"
                    parentTenantId={tenantId}
                    existingTenants={
                      tenantId
                        ? [{ id: tenantId, name, slug, primaryColor }]
                        : []
                    }
                    triggerButton={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-bold gap-1.5 h-9 border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/10 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ Cadastrar Nova Filial</span>
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* If Branch Church, show parent church link */}
          {!isMatriz && parent && (
            <div className="space-y-2">
              <span className="px-3 text-[11px] text-muted-foreground block mb-1">
                Igreja Sede (Matriz):
              </span>
              <Link
                href={`/${parent.slug}`}
                className="flex items-center justify-between px-3 py-2 text-xs rounded-md text-foreground hover:bg-muted/80 transition-colors border border-border bg-background/50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                  <span className="font-medium truncate">{parent.name}</span>
                </div>
                <span className="text-[10px] text-primary font-semibold">Ver Sede</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Card & Footer */}
      <div className="p-3 border-t border-border/80 bg-muted/20 space-y-2">
        {currentUser ? (
          <div className="p-2.5 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                  {currentUser.avatarUrl && <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />}
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" title="Conectado" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate" title={currentUser.name}>
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate" title={currentUser.email}>
                  {currentUser.email}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/20">
                    {currentUser.role === "ADMIN" || currentUser.role === "SUPERADMIN"
                      ? "Master / Admin"
                      : currentUser.role === "PASTOR"
                      ? "Pastor"
                      : currentUser.role === "LEADER"
                      ? "Líder"
                      : "Membro"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Link href={`/${slug}/perfil`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                  title="Meu Perfil (Dados, Senha e Foto)"
                >
                  <User className="w-4 h-4" />
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await logoutUser();
                  window.location.href = "/";
                }}
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">Portal da Igreja</p>
              <p className="text-[10px] text-muted-foreground truncate">Lynx EMS Sistemas • Horeb</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-muted-foreground">
          <HelpGuideDialog
            triggerButton={
              <button
                type="button"
                className="flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Manual & Guia</span>
              </button>
            }
          />
          <span className="text-[10px]">Horeb • Lynx EMS</span>
        </div>
      </div>
    </aside>
  );
}
