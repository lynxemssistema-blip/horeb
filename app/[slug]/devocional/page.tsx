"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Smile,
  BatteryLow,
  CloudRain,
  Frown,
  Sparkles,
  BookOpen,
  Lock,
  ArrowLeft,
  Loader2,
  Heart,
  RefreshCw,
  Send,
  CheckCircle2,
  ShieldAlert,
  Feather,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getDailyDevotional,
  savePrayerRequest,
  type DevotionalResponse,
} from "@/app/actions/devotional";
import { VoiceChat } from "@/components/voice-chat";
import { OrchestratorChat } from "@/components/orchestrator-chat";

type Step = "checkin" | "loading" | "result";

interface MoodOption {
  key: "FELIZ" | "CANSADO" | "ANSIOSO" | "TRISTE";
  label: string;
  emoji: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  bgGlow: string;
  borderColor: string;
}

const MOODS: MoodOption[] = [
  {
    key: "FELIZ",
    label: "Feliz",
    emoji: "😃",
    sublabel: "Agradecido & em paz",
    icon: Smile,
    accentColor: "text-amber-400",
    bgGlow: "from-amber-500/10 to-yellow-500/5",
    borderColor: "hover:border-amber-400/50 border-amber-500/20",
  },
  {
    key: "CANSADO",
    label: "Cansado",
    emoji: "😮‍💨",
    sublabel: "Corpo ou mente exaustos",
    icon: BatteryLow,
    accentColor: "text-orange-400",
    bgGlow: "from-orange-500/10 to-amber-500/5",
    borderColor: "hover:border-orange-400/50 border-orange-500/20",
  },
  {
    key: "ANSIOSO",
    label: "Ansioso",
    emoji: "😰",
    sublabel: "Preocupado com o amanhã",
    icon: CloudRain,
    accentColor: "text-sky-400",
    bgGlow: "from-sky-500/10 to-blue-500/5",
    borderColor: "hover:border-sky-400/50 border-sky-500/20",
  },
  {
    key: "TRISTE",
    label: "Triste",
    emoji: "😔",
    sublabel: "O coração está pesado",
    icon: Frown,
    accentColor: "text-indigo-400",
    bgGlow: "from-indigo-500/10 to-purple-500/5",
    borderColor: "hover:border-indigo-400/50 border-indigo-500/20",
  },
];

export default function SoulCheckInPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "matriz";

  const [step, setStep] = useState<Step>("checkin");
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [devotional, setDevotional] = useState<DevotionalResponse | null>(null);
  const [prayerContent, setPrayerContent] = useState("");
  const [isSavingPrayer, setIsSavingPrayer] = useState(false);
  const [isRedAlert, setIsRedAlert] = useState(false);
  const [prayerSaved, setPrayerSaved] = useState(false);

  // Ação ao clicar no card de sentimento: vai direto para o Orquestrador com o contexto
  const handleSelectMood = (mood: MoodOption) => {
    setSelectedMood(mood);
    setStep("result");
  };

  // Salvar oração no diário privado
  const handleSavePrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerContent.trim()) {
      toast.warning("Escreva seu desabafo ou pedido de oração.");
      return;
    }

    setIsSavingPrayer(true);
    try {
      const res = await savePrayerRequest(prayerContent, slug);

      if (res.success) {
        toast.success(res.message || "Oração guardada! Deus está cuidando de tudo.");
        setPrayerContent("");
        setPrayerSaved(true);
        if (res.isRedAlert) {
          setIsRedAlert(true);
        }
      } else {
        toast.error(res.error || "Erro ao salvar no diário.");
      }
    } catch {
      toast.error("Não foi possível salvar sua oração.");
    } finally {
      setIsSavingPrayer(false);
    }
  };

  const handleResetCheckin = () => {
    setDevotional(null);
    setSelectedMood(null);
    setPrayerContent("");
    setPrayerSaved(false);
    setIsRedAlert(false);
    setStep("checkin");
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-card/40 to-background text-foreground flex flex-col justify-between selection:bg-primary/20 pb-16">
      {/* Barra Superior / Voltar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border/40 px-4 py-3.5 flex items-center justify-between">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao App</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3 h-3" />
            <span>Check-in de Alma</span>
          </span>
        </div>
      </header>

      {/* Conteúdo Centralizado Mobile-First */}
      <main className="w-full max-w-md mx-auto px-4 py-6 sm:py-8 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* =========================================================================
              PASSO 1: O Termômetro Emocional (Check-in 2x2)
             ========================================================================= */}
          {step === "checkin" && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-6 text-center"
            >
              {/* Header Acolhedor */}
              <div className="space-y-2 pt-2">
                <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/80 flex items-center justify-center gap-1.5">
                  <Feather className="w-3.5 h-3.5 text-primary" />
                  <span>Momento de Conexão</span>
                </span>
                <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground">
                  Bom dia, <span className="font-semibold text-primary">João</span>.
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Como está o seu coração hoje? Respire fundo e escolha como você se sente:
                </p>
              </div>

              {/* Grid 2x2 de Sentimentos */}
              <div className="grid grid-cols-2 gap-3.5 pt-2">
                {MOODS.map((mood) => {
                  const Icon = mood.icon;
                  return (
                    <motion.div
                      key={mood.key}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectMood(mood)}
                        className={`w-full text-left p-4 sm:p-5 rounded-3xl bg-gradient-to-br ${mood.bgGlow} border ${mood.borderColor} bg-card/70 hover:bg-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-36 sm:h-40 cursor-pointer group relative overflow-hidden`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-3xl filter drop-shadow-sm select-none">
                            {mood.emoji}
                          </span>
                          <div
                            className={`w-8 h-8 rounded-xl bg-background/60 border border-border/50 flex items-center justify-center ${mood.accentColor} group-hover:scale-110 transition-transform`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>

                        <div>
                          <p className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                            {mood.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
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
                  className="w-full text-xs font-semibold gap-2 h-10 rounded-2xl border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/5 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Conversar direto com o Agente Orquestrador &rarr;</span>
                </Button>
              </div>

              {/* Rodapé Tranquilizador */}
              <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70">
                <Lock className="w-3.5 h-3.5" />
                <span>Espaço 100% privado e acolhedor</span>
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              PASSO 2: Loading Suave da IA ("Pensando...")
             ========================================================================= */}
          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="py-16 text-center space-y-6 flex flex-col items-center justify-center"
            >
              <div className="relative">
                {/* Aura suave pulsante */}
                <motion.div
                  animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -inset-4 rounded-full bg-primary/20 blur-xl"
                />

                <div className="w-20 h-20 rounded-full bg-card border border-primary/30 flex items-center justify-center shadow-xl relative z-10">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Sparkles className="w-9 h-9 text-primary animate-pulse" />
                  </motion.div>
                </div>
              </div>

              <div className="space-y-2 max-w-xs">
                <p className="text-xs uppercase tracking-widest font-semibold text-primary">
                  Cuidado Pastoral com IA
                </p>
                <h3 className="text-xl font-light text-foreground">
                  Separando uma palavra para você...
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Buscando nas Escrituras uma mensagem especial para o seu momento de{" "}
                  <span className="font-semibold text-foreground lowercase">
                    {selectedMood?.label || "hoje"}
                  </span>
                  .
                </p>
              </div>

              <div className="flex items-center gap-1 pt-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
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
                initialMood={selectedMood}
                onResetMood={handleResetCheckin}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
