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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
}

interface AppSidebarProps {
  slug: string;
  name: string;
  logoUrl?: string | null;
  primaryColor: string;
  isMatriz: boolean;
  parent?: { name: string; slug: string } | null;
  branches?: Branch[];
}

export function AppSidebar({
  slug,
  name,
  logoUrl,
  primaryColor,
  isMatriz,
  parent,
  branches = [],
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
      name: "Células & Grupos",
      href: `/${slug}/celulas`,
      icon: Users,
    },
    {
      name: "Dízimos & Ofertas",
      href: `/${slug}/doar`,
      icon: HeartHandshake,
    },
    {
      name: "Ministério Kids",
      href: `/${slug}/kids`,
      icon: Baby,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-border bg-card/60 backdrop-blur-md min-h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 ring-2 ring-primary/25 shrink-0 shadow-sm">
            {logoUrl ? <AvatarImage src={logoUrl} alt={name} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              <Building2 className="w-5 h-5 text-primary" />
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
      <div className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
          Menu Principal
        </div>
        {navigation.map((item) => {
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
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Multi-Tenant Hierarchy Section */}
        <div className="pt-6">
          <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase flex items-center justify-between">
            <span>Rede de Igrejas</span>
            <Building2 className="w-3.5 h-3.5" />
          </div>

          {/* If Mother Church, show branches */}
          {isMatriz && branches.length > 0 && (
            <div className="space-y-1">
              <span className="px-3 text-[11px] text-muted-foreground block mb-1">
                Filiais Vinculadas:
              </span>
              {branches.map((b) => (
                <Link
                  key={b.id}
                  href={`/${b.slug}`}
                  className="flex items-center justify-between px-3 py-2 text-xs rounded-md text-foreground hover:bg-muted/80 transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: b.primaryColor }}
                    />
                    <span className="truncate">{b.name}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}

          {/* If Branch Church, show parent church link */}
          {!isMatriz && parent && (
            <div className="space-y-1">
              <span className="px-3 text-[11px] text-muted-foreground block mb-1">
                Igreja Sede:
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

      {/* Pastoral Footer */}
      <div className="p-4 border-t border-border/60 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">Portal do Membro</p>
            <p className="text-[10px] text-muted-foreground truncate">White-Label Dinâmico Ativo</p>
          </div>
          <span title="White-label engine">
            <Palette
              className="w-4 h-4 text-primary shrink-0 transition-transform hover:rotate-45"
            />
          </span>
        </div>
      </div>
    </aside>
  );
}
