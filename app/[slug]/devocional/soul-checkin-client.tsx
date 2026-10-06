"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sun,
  Moon,
  Wind,
  HeartHandshake,
  Sparkles,
  Lock,
  ArrowLeft,
  ArrowRight,
  Feather,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrchestratorChat } from "@/components/orchestrator-chat";
import type { SessionData } from "@/lib/session";
import { recordMoodCheckIn } from "@/app/actions/devotional";
import { ThemeToggle } from "@/components/theme-toggle";

type Step = "checkin" | "loading" | "result";

interface MoodOption {
  key: "FELIZ" | "CANSADO" | "ANSIOSO" | "TRISTE";
  label: string;
  tag: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  iconBg: string;
  iconBorder: string;
  iconGlow: string;
  cardBg: string;
  cardBorder: string;
  hoverGlow: string;
}

const MOODS: MoodOption[] = [
  {
    key: "FELIZ",
    label: "Feliz & Grato",
    tag: "Paz",
    sublabel: "Agradecido, em paz e com o coração sereno",
    icon: Sun,
    accentColor: "text-amber-400",
    iconBg: "bg-gradient-to-br from-amber-400/25 to-yellow-500/10",
    iconBorder: "border-amber-400/30",
    iconGlow: "shadow-[0_0_20px_rgba(245,158,11,0.25)]",
    cardBg: "from-amber-500/[0.08] via-zinc-900/90 to-zinc-950",
    cardBorder: "border-amber-500/20 hover:border-amber-400/60",
    hoverGlow: "hover:shadow-[0_8px_30px_rgba(245,158,11,0.18)]",
  },
  {
    key: "CANSADO",
    label: "Cansado",
    tag: "Descanso",
    sublabel: "Corpo ou mente exaustos em busca de alívio",
    icon: Moon,
    accentColor: "text-orange-400",
    iconBg: "bg-gradient-to-br from-orange-400/25 to-amber-500/10",
    iconBorder: "border-orange-400/30",
    iconGlow: "shadow-[0_0_20px_rgba(249,115,22,0.25)]",
    cardBg: "from-orange-500/[0.08] via-zinc-900/90 to-zinc-950",
    cardBorder: "border-orange-500/20 hover:border-orange-400/60",
    hoverGlow: "hover:shadow-[0_8px_30px_rgba(249,115,22,0.18)]",
  },
  {
    key: "ANSIOSO",
    label: "Ansioso",
    tag: "Calmaria",
    sublabel: "Preocupado com o amanhã e buscando calmaria",
    icon: Wind,
    accentColor: "text-sky-400",
    iconBg: "bg-gradient-to-br from-sky-400/25 to-blue-500/10",
    iconBorder: "border-sky-400/30",
    iconGlow: "shadow-[0_0_20px_rgba(14,165,233,0.25)]",
    cardBg: "from-sky-500/[0.08] via-zinc-900/90 to-zinc-950",
    cardBorder: "border-sky-500/20 hover:border-sky-400/60",
    hoverGlow: "hover:shadow-[0_8px_30px_rgba(14,165,233,0.18)]",
  },
  {
    key: "TRISTE",
    label: "Triste",
    tag: "Consolo",
    sublabel: "O coração está pesado e precisa de acolhimento",
    icon: HeartHandshake,
    accentColor: "text-violet-400",
    iconBg: "bg-gradient-to-br from-violet-400/25 to-purple-500/10",
    iconBorder: "border-violet-400/30",
    iconGlow: "shadow-[0_0_20px_rgba(139,92,246,0.25)]",
    cardBg: "from-violet-500/[0.08] via-zinc-900/90 to-zinc-950",
    cardBorder: "border-violet-500/20 hover:border-violet-400/60",
    hoverGlow: "hover:shadow-[0_8px_30px_rgba(139,92,246,0.18)]",
  },
];

// Saudação dinâmica por horário
function getGreetingPhrase(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Formatação acolhedora do nome do usuário
function formatGreetingName(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return "abençoado(a)";
  const clean = fullName.trim();
  const parts = clean.split(/\s+/);

  const firstLower = parts[0].toLowerCase();
  // Se contiver título pastoral ou ministerial (ex: "Pastor Luan de Mattos")
  if (
    firstLower.startsWith("pastor") ||
    firstLower.startsWith("pra") ||
    firstLower.startsWith("pr.") ||
    firstLower.startsWith("bispo") ||
    firstLower.startsWith("rev")
  ) {
    return parts.slice(0, 2).join(" ");
  }

  // Se for nome composto curto (ex: "Ana Paula")
  if (parts.length > 1 && parts[0].length <= 3) {
    return `${parts[0]} ${parts[1]}`;
  }

  // Primeiro nome
  return parts[0];
}

interface SoulCheckInClientProps {
  slug: string;
  initialUser: SessionData | null;
}

export function SoulCheckInClient({ slug, initialUser }: SoulCheckInClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checkin");
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);

  // Saudação dinâmica
  const [greeting, setGreeting] = useState<string>("Bom dia");

  useEffect(() => {
    setGreeting(getGreetingPhrase());
  }, []);

  const displayName = formatGreetingName(initialUser?.name);

  // Ação ao selecionar um sentimento: vai direto para o Orquestrador com o contexto acolhedor
  const handleSelectMood = (mood: MoodOption) => {
    setSelectedMood(mood);
    setStep("result");
    recordMoodCheckIn(mood.key, slug).catch((err) =>
      console.warn("Falha ao registrar checkin devocional:", err)
    );
  };

  const handleResetCheckin = () => {
    setSelectedMood(null);
    setStep("checkin");
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200 pb-16 relative overflow-x-hidden">
      {/* Luz ambiente / ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 blur-[130px] rounded-full" />
      </div>

      {/* Barra Superior / Voltar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-card/80 border-b border-border px-4 py-3.5 flex items-center justify-between">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao App</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Check-in de Alma</span>
          </span>
        </div>
      </header>

      {/* Conteúdo Centralizado */}
      <main className="w-full max-w-lg mx-auto px-4 py-6 sm:py-10 flex-1 flex flex-col justify-center relative z-10">
        <AnimatePresence mode="wait">
          {/* =========================================================================
              PASSO 1: Termômetro Emocional (Cards de Sentimento Elegantes)
             ========================================================================= */}
          {step === "checkin" && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-6 text-center"
            >
              {/* Header Acolhedor com Nome Real do Usuário */}
              <div className="space-y-2 pt-2">
                <span className="text-xs uppercase tracking-widest font-bold text-amber-500 flex items-center justify-center gap-1.5">
                  <Feather className="w-3.5 h-3.5 text-amber-500" />
                  <span>Momento de Conexão</span>
                </span>

                <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground">
                  {greeting},{" "}
                  <span className="font-bold text-primary">{displayName}</span>.
                </h1>

                <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Como está o seu coração hoje? Respire fundo e escolha como você se sente:
                </p>
              </div>

              {/* Grid 2x2 de Sentimentos Modernos e Polidos (Sem Emojis) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {MOODS.map((mood) => {
                  const Icon = mood.icon;
                  return (
                    <motion.div
                      key={mood.key}
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectMood(mood)}
                        className={cn(
                          "w-full text-left p-4 sm:p-5 rounded-3xl bg-gradient-to-br border transition-all duration-300",
                          mood.cardBg,
                          mood.cardBorder,
                          mood.hoverGlow,
                          "flex flex-col justify-between h-36 sm:h-40 cursor-pointer group relative overflow-hidden backdrop-blur-md shadow-lg"
                        )}
                      >
                        {/* Brilho sutil na borda superior */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />

                        {/* Top: Orbe Iluminado e Tag */}
                        <div className="flex items-center justify-between w-full">
                          <div
                            className={cn(
                              "w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                              mood.iconBg,
                              mood.iconBorder,
                              mood.iconGlow,
                              mood.accentColor
                            )}
                          >
                            <Icon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-6" />
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-400 group-hover:text-zinc-200 group-hover:border-white/20 transition-colors">
                            {mood.tag}
                          </span>
                        </div>

                        {/* Bottom: Título e Descrição */}
                        <div className="space-y-0.5">
                          <p className="font-bold text-base text-white group-hover:text-amber-400 transition-colors flex items-center justify-between">
                            <span>{mood.label}</span>
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-amber-400" />
                          </p>
                          <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                            {mood.sublabel}
                          </p>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Botão de Pular Direto para a Conversa Aberta */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("result")}
                  className="w-full text-xs font-bold gap-2 h-11 rounded-2xl border-dashed border-amber-500/40 hover:border-amber-400 text-amber-300 hover:bg-amber-500/10 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Conversar direto com o Agente Orquestrador &rarr;</span>
                </Button>
              </div>

              {/* Rodapé Seguro e Discreto */}
              <div className="pt-1 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
                <Lock className="w-3.5 h-3.5" />
                <span>Espaço 100% privado e acolhedor</span>
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              PASSO 2: BATE-PAPO DIRETO COM O AGENTE ORQUESTRADOR
             ========================================================================= */}
          {step === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="pt-1"
            >
              <OrchestratorChat
                tenantSlug={slug}
                userName={initialUser?.name || null}
                initialMood={
                  selectedMood
                    ? {
                        key: selectedMood.key,
                        label: selectedMood.label,
                        sublabel: selectedMood.sublabel,
                      }
                    : null
                }
                onResetMood={handleResetCheckin}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
