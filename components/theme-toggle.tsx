"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sun,
  Moon,
  Laptop,
  Palette,
  Check,
  Sparkles,
  MoonStar,
  Coffee,
  Waves,
  Crown,
  Leaf,
  Zap,
  Shield,
  Flame,
} from "lucide-react";
import { useTheme, THEME_PRESETS } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle({
  showLabel = false,
  className = "",
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { mode, palette, activePresetId, applyPreset, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Ícone dinâmico do tema ativo
  const getThemeIcon = () => {
    if (palette === "prime") {
      return <Crown className="w-4 h-4 text-amber-400" />;
    }
    if (palette === "vida") {
      return <Leaf className="w-4 h-4 text-emerald-400" />;
    }
    if (palette === "next") {
      return <Zap className="w-4 h-4 text-indigo-400" />;
    }
    if (palette === "catedral") {
      return <Shield className="w-4 h-4 text-amber-500" />;
    }
    if (palette === "avivamento") {
      return <Flame className="w-4 h-4 text-orange-500" />;
    }
    if (palette === "graca") {
      return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
    if (mode === "system") {
      return <Laptop className="w-4 h-4 text-primary" />;
    }
    if (mode === "light") {
      return <Sun className="w-4 h-4 text-amber-500" />;
    }
    if (palette === "oled") {
      return <MoonStar className="w-4 h-4 text-zinc-300" />;
    }
    if (palette === "navy") {
      return <Waves className="w-4 h-4 text-sky-400" />;
    }
    if (palette === "sepia") {
      return <Coffee className="w-4 h-4 text-amber-400" />;
    }
    return <Moon className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 px-2 sm:px-2.5 rounded-full text-xs font-semibold gap-1.5 border border-border/70 bg-card/60 hover:bg-muted text-foreground transition-all cursor-pointer ${className}`}
        title="Alternar seu tema individual de cores"
        aria-label="Alternar tema"
      >
        {getThemeIcon()}
        {showLabel && (
          <span className="hidden sm:inline text-xs font-medium">
            {mode === "system" ? "Sistema" : resolvedTheme === "dark" ? "Escuro" : "Claro"}
          </span>
        )}
      </Button>

      {/* Dropdown Menu Flutuante */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 max-h-[80vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl p-2.5 z-50 animate-in fade-in-0 zoom-in-95 backdrop-blur-xl">
          <div className="px-2 py-1.5 border-b border-border/60 mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-primary" />
              <span>Tema do Usuário (Individual)</span>
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {resolvedTheme === "dark" ? "Modo Escuro" : "Modo Claro"}
            </span>
          </div>

          <div className="space-y-1">
            {THEME_PRESETS.map((preset) => {
              const isActive = activePresetId === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    applyPreset(preset.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold border border-primary/25"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Bolinha com prévia da cor de fundo */}
                    <div
                      className="w-4 h-4 rounded-full border border-border shadow-inner shrink-0"
                      style={{ background: preset.bgPreview }}
                    />
                    <div className="flex flex-col">
                      <span className="leading-tight">{preset.name}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {preset.badge}
                      </span>
                    </div>
                  </div>

                  {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
