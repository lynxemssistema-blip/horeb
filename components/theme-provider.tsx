"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { updateUserTheme } from "@/app/actions/profile";

export type ThemeMode = "system" | "light" | "dark";
export type ThemePalette = "default" | "oled" | "navy" | "sepia" | "cream";

export interface ThemePreset {
  id: string;
  name: string;
  category: "system" | "light" | "dark";
  mode: ThemeMode;
  palette: ThemePalette;
  description: string;
  bgPreview: string;
  cardPreview: string;
  borderPreview: string;
  textPreview: string;
  badge?: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "system",
    name: "Automático (Sistema)",
    category: "system",
    mode: "system",
    palette: "default",
    description: "Acompanha automaticamente o tema do seu celular ou computador.",
    bgPreview: "linear-gradient(135deg, #f8fafc 50%, #070709 50%)",
    cardPreview: "#18181b",
    borderPreview: "rgba(255,255,255,0.2)",
    textPreview: "#38bdf8",
    badge: "Auto",
  },
  {
    id: "light-default",
    name: "Claro Neve",
    category: "light",
    mode: "light",
    palette: "default",
    description: "Visual clean e moderno com fundo branco e contraste suave.",
    bgPreview: "#f8fafc",
    cardPreview: "#ffffff",
    borderPreview: "#e2e8f0",
    textPreview: "#0f172a",
    badge: "Dia",
  },
  {
    id: "light-cream",
    name: "Claro Creme",
    category: "light",
    mode: "light",
    palette: "cream",
    description: "Tons de marfim e papel suave para uma leitura diurna aconchegante.",
    bgPreview: "#faf8f5",
    cardPreview: "#ffffff",
    borderPreview: "#e7dfd5",
    textPreview: "#292524",
    badge: "Leitura",
  },
  {
    id: "dark-default",
    name: "Grafite Horeb",
    category: "dark",
    mode: "dark",
    palette: "default",
    description: "Tema escuro padrão com preto suave e acabamento grafite.",
    bgPreview: "#070709",
    cardPreview: "#101014",
    borderPreview: "rgba(255,255,255,0.1)",
    textPreview: "#f4f4f5",
    badge: "Padrão",
  },
  {
    id: "dark-oled",
    name: "Preto Puro OLED",
    category: "dark",
    mode: "dark",
    palette: "oled",
    description: "Preto 100% puro para máxima economia de bateria em telas AMOLED.",
    bgPreview: "#000000",
    cardPreview: "#0a0a0a",
    borderPreview: "rgba(255,255,255,0.15)",
    textPreview: "#ffffff",
    badge: "Econômico",
  },
  {
    id: "dark-navy",
    name: "Midnight Navy",
    category: "dark",
    mode: "dark",
    palette: "navy",
    description: "Azul noite profundo e elegante, muito confortável para a visão.",
    bgPreview: "#070b14",
    cardPreview: "#0d1527",
    borderPreview: "rgba(56,189,248,0.2)",
    textPreview: "#38bdf8",
    badge: "Noite",
  },
  {
    id: "dark-sepia",
    name: "Sépia Noturno",
    category: "dark",
    mode: "dark",
    palette: "sepia",
    description: "Tons quentes e terrosos para leitura bíblica noturna prolongada.",
    bgPreview: "#12100e",
    cardPreview: "#1c1815",
    borderPreview: "rgba(245,158,11,0.2)",
    textPreview: "#fbbf24",
    badge: "Conforto",
  },
];

interface ThemeContextType {
  mode: ThemeMode;
  palette: ThemePalette;
  resolvedTheme: "light" | "dark";
  activePresetId: string;
  setTheme: (mode: ThemeMode, palette?: ThemePalette) => void;
  applyPreset: (presetId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  initialMode = "system",
  initialPalette = "default",
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
  initialPalette?: ThemePalette;
}) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [palette, setPalette] = useState<ThemePalette>(initialPalette);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  // 1. Sincronizar ao montar com o localStorage ou preferência inicial
  useEffect(() => {
    try {
      const savedMode = (localStorage.getItem("horeb-theme-mode") as ThemeMode) || initialMode;
      const savedPalette = (localStorage.getItem("horeb-theme-palette") as ThemePalette) || initialPalette;
      setMode(savedMode);
      setPalette(savedPalette);
    } catch {}
    setMounted(true);
  }, [initialMode, initialPalette]);

  // 2. Aplicar classes e data attributes no documento
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateDOM = () => {
      const isDark = mode === "dark" || (mode === "system" && mediaQuery.matches);
      const activeResolved = isDark ? "dark" : "light";
      setResolvedTheme(activeResolved);

      const root = document.documentElement;

      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }

      if (palette && palette !== "default") {
        root.setAttribute("data-theme-palette", palette);
      } else {
        root.removeAttribute("data-theme-palette");
      }

      // Atualizar meta theme-color para navegadores móveis (Safari, Chrome Mobile)
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        if (isDark) {
          if (palette === "oled") metaThemeColor.setAttribute("content", "#000000");
          else if (palette === "navy") metaThemeColor.setAttribute("content", "#070b14");
          else if (palette === "sepia") metaThemeColor.setAttribute("content", "#12100e");
          else metaThemeColor.setAttribute("content", "#070709");
        } else {
          if (palette === "cream") metaThemeColor.setAttribute("content", "#faf8f5");
          else metaThemeColor.setAttribute("content", "#f8fafc");
        }
      }
    };

    updateDOM();

    if (mode === "system") {
      mediaQuery.addEventListener("change", updateDOM);
      return () => mediaQuery.removeEventListener("change", updateDOM);
    }
  }, [mode, palette]);

  // 3. Função para trocar tema
  const setTheme = (newMode: ThemeMode, newPalette: ThemePalette = "default") => {
    setMode(newMode);
    setPalette(newPalette);

    try {
      localStorage.setItem("horeb-theme-mode", newMode);
      localStorage.setItem("horeb-theme-palette", newPalette);
    } catch {}

    // Sincronizar silenciosamente com o perfil no banco de dados
    startTransition(async () => {
      try {
        await updateUserTheme(newMode, newPalette);
      } catch {}
    });
  };

  const applyPreset = (presetId: string) => {
    const found = THEME_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setTheme(found.mode, found.palette);
    }
  };

  // Calcular preset ativo
  let activePresetId = "system";
  if (mode === "system") {
    activePresetId = "system";
  } else if (mode === "light") {
    activePresetId = palette === "cream" ? "light-cream" : "light-default";
  } else if (mode === "dark") {
    if (palette === "oled") activePresetId = "dark-oled";
    else if (palette === "navy") activePresetId = "dark-navy";
    else if (palette === "sepia") activePresetId = "dark-sepia";
    else activePresetId = "dark-default";
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        palette,
        resolvedTheme,
        activePresetId,
        setTheme,
        applyPreset,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  }
  return context;
}

// Script anti-flash para ser injetado no <head>
export function ThemeScript() {
  const scriptContent = `
    (function() {
      try {
        var mode = localStorage.getItem('horeb-theme-mode') || 'system';
        var palette = localStorage.getItem('horeb-theme-palette') || 'default';
        var isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        var root = document.documentElement;
        if (isDark) {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.remove('dark');
          root.classList.add('light');
        }
        if (palette && palette !== 'default') {
          root.setAttribute('data-theme-palette', palette);
        } else {
          root.removeAttribute('data-theme-palette');
        }
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: scriptContent }} />;
}
