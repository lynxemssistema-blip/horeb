"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, HeartHandshake, Baby, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  slug: string;
}

export function BottomNav({ slug }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Início",
      href: `/${slug}`,
      icon: Home,
      exact: true,
    },
    {
      label: "Células",
      href: `/${slug}/celulas`,
      icon: Users,
    },
    {
      label: "Doar",
      href: `/${slug}/doar`,
      icon: HeartHandshake,
      highlight: true,
    },
    {
      label: "Kids",
      href: `/${slug}/kids`,
      icon: Baby,
    },
    {
      label: "Ajustes",
      href: `/${slug}/configuracoes`,
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/90 backdrop-blur-lg border-t border-border/80 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-4 py-2">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground shadow-lg transition-transform duration-200 group-hover:scale-105 active:scale-95",
                    "bg-primary ring-4 ring-background"
                  )}
                >
                  <Icon className="w-5 h-5 transition-transform duration-200" />
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold mt-1 transition-colors",
                    isActive ? "text-primary font-bold" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-90",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive && "scale-110"
                  )}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
