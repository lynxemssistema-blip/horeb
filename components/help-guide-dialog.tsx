"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  BookOpen,
  Sparkles,
  Church,
  GitBranch,
  Users,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Baby,
  QrCode,
  HeartHandshake,
  Layers,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Smartphone,
  Tv,
  Crown,
  KeyRound,
  Mail,
  Zap,
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  Check,
  RotateCcw,
  Compass,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ==========================================
// TIPO DOS PASSOS DO GUIA INTERATIVO
// ==========================================
interface GuideStep {
  stepNumber: number;
  badge: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  summary: string;
  details: string;
  goldenTip: string;
  actionText: string;
  actionType: "open-register" | "open-login" | "scroll-pricing" | "next-step";
}

const GUIDE_STEPS: GuideStep[] = [
  {
    stepNumber: 1,
    badge: "1. Fundação da Igreja",
    title: "Cadastro da Igreja Sede (Matriz) & Usuário Master",
    shortTitle: "1. Cadastro da Igreja Sede",
    icon: Church,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    summary: "Cadastre o Pastor Presidente, e-mail oficial e a identidade visual da igreja.",
    details:
      "Na página inicial, clique em 'Cadastrar Minha Igreja'. Informe o nome do Pastor Presidente, e-mail oficial de login, senha segura, o nome da congregação e selecione a cor primária da sua marca (White-Label). O Horeb já inicia no plano com 30 dias de degustação gratuita.",
    goldenTip:
      "💡 Dica de Ouro: Você pode preencher os campos do formulário na tela agora mesmo enquanto mantém este guia visível!",
    actionText: "Abrir Formulário de Cadastro",
    actionType: "open-register",
  },
  {
    stepNumber: 2,
    badge: "2. Segurança SMTP",
    title: "Ativação com Código de 6 Dígitos por E-mail",
    shortTitle: "2. Ativação por E-mail (6 Dígitos)",
    icon: KeyRound,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/25",
    summary: "Validação instantânea por e-mail com servidor seguro Hostinger SMTP.",
    details:
      "Por segurança contra acessos indevidos, nosso servidor Hostinger dispara um código numérico de 6 dígitos para o e-mail do pastor master. Digite o código no modal para ativar sua conta instantaneamente sem fricção.",
    goldenTip:
      "💡 Dica: O código chega em menos de 10 segundos. Se demorar, confira a pasta de Spam ou Lixeira.",
    actionText: "Já Tenho Conta • Fazer Login",
    actionType: "open-login",
  },
  {
    stepNumber: 3,
    badge: "3. White-Label & Logo",
    title: "Identidade Visual e Upload do Logo no Banco de Dados",
    shortTitle: "3. Upload do Logo e Dados",
    icon: ShieldCheck,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    summary: "Personalize o app com o brasão oficial e as cores da congregação.",
    details:
      "No menu 'Configurações da Igreja', envie a imagem do logo. O arquivo é convertido em Base64 e gravado diretamente no banco de dados com máxima velocidade, sem depender de links externos. Complete endereço, telefone e redes sociais.",
    goldenTip:
      "💡 Dica: A logo salva se adapta perfeitamente aos temas Claro e Escuro dos membros.",
    actionText: "Avançar para o Passo 4",
    actionType: "next-step",
  },
  {
    stepNumber: 4,
    badge: "4. Finanças & PIX",
    title: "Configurar a Chave PIX e Valores Sugeridos",
    shortTitle: "4. Chave PIX e Ofertas",
    icon: QrCode,
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",
    summary: "Receba dízimos e ofertas com QR Code dinâmico em 10 segundos.",
    details:
      "Informe a chave PIX oficial da igreja (CNPJ, celular, e-mail) e defina os valores rápidos sugeridos (ex: R$ 30, R$ 50, R$ 100, R$ 200, R$ 500). Os membros poderão contribuir com QR Code ou Copia e Cola em 10 segundos no celular.",
    goldenTip:
      "💡 Dica: 100% das ofertas caem direto na conta bancária da sua igreja sem taxa de intermediação.",
    actionText: "Avançar para o Passo 5",
    actionType: "next-step",
  },
  {
    stepNumber: 5,
    badge: "5. Liderança Departamental",
    title: "Convidar Líderes de Ministérios e Células",
    shortTitle: "5. Convidar Líderes e Células",
    icon: Users,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/25",
    summary: "Distribua permissões para louvor, diaconia, células e ministério kids.",
    details:
      "No menu 'Membros & Convites', cadastre os pastores auxiliares, líderes de louvor, diaconia e células, ou gere um link de convite direto para que eles completem o cadastro com seus próprios acessos protegidos.",
    goldenTip:
      "💡 Dica: Cada líder só enxerga os dados do seu departamento, garantindo privacidade e organização.",
    actionText: "Avançar para o Passo 6",
    actionType: "next-step",
  },
  {
    stepNumber: 6,
    badge: "6. Membros & PWA",
    title: "Como os Membros Acessam (PWA Nativo no Celular)",
    shortTitle: "6. App no Celular (PWA)",
    icon: Smartphone,
    color: "text-pink-400 bg-pink-500/10 border-pink-500/25",
    summary: "Instalação direta na tela inicial sem precisar de App Store.",
    details:
      "Os membros acessam a URL da sua igreja (ex: horeb.lynxems.com.br/sua-igreja). Clicam no botão 'Quero me Cadastrar' no topo, recebem a confirmação por e-mail e passam a ter acesso às células, devocionais, cultos online e dízimos.",
    goldenTip:
      "💡 Dica de Ouro: Sem custo de publicação na Apple Store ou Google Play, com atualizações automáticas em tempo real!",
    actionText: "Ver Comparativo de Planos",
    actionType: "scroll-pricing",
  },
];

// ==========================================
// STORE GLOBAL DO COPILOTO (SINGLETON EM MEMÓRIA)
// ==========================================
type CopilotMode = "mini" | "compact" | "full";

interface CopilotState {
  isOpen: boolean;
  mode: CopilotMode;
  activeStep: number;
  activeTab: "passo-a-passo" | "matriz-filial" | "pessoas-acesso" | "planos-recursos";
}

let copilotState: CopilotState = {
  isOpen: false,
  mode: "compact",
  activeStep: 0,
  activeTab: "passo-a-passo",
};

const copilotListeners = new Set<() => void>();

function notifyCopilotListeners() {
  copilotListeners.forEach((listener) => listener());
}

export function openCopilot(options?: {
  mode?: CopilotMode;
  step?: number;
  tab?: CopilotState["activeTab"];
}) {
  copilotState = {
    ...copilotState,
    isOpen: true,
    mode: options?.mode ?? (copilotState.mode === "mini" ? "compact" : copilotState.mode),
    activeStep: options?.step !== undefined ? options.step : copilotState.activeStep,
    activeTab: options?.tab ?? copilotState.activeTab,
  };
  notifyCopilotListeners();
}

export function closeCopilot() {
  copilotState = {
    ...copilotState,
    isOpen: false,
  };
  notifyCopilotListeners();
}

export function setCopilotMode(mode: CopilotMode) {
  copilotState = {
    ...copilotState,
    mode,
  };
  notifyCopilotListeners();
}

export function setCopilotStep(step: number) {
  const safeStep = Math.max(0, Math.min(GUIDE_STEPS.length - 1, step));
  copilotState = {
    ...copilotState,
    activeStep: safeStep,
  };
  notifyCopilotListeners();
}

export function setCopilotTab(tab: CopilotState["activeTab"]) {
  copilotState = {
    ...copilotState,
    activeTab: tab,
  };
  notifyCopilotListeners();
}

function useCopilotStore() {
  return useSyncExternalStore(
    (callback) => {
      copilotListeners.add(callback);
      return () => copilotListeners.delete(callback);
    },
    () => copilotState,
    () => copilotState
  );
}

// Efeito Sonoro de Sucesso Sintetizado (Zero Dependências)
function playDingSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Silencia qualquer política de autoplay
  }
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
let primaryPortalId: string | null = null;

interface HelpGuideDialogProps {
  triggerButton?: React.ReactNode;
  hideWhenOpen?: boolean;
}

export function HelpGuideDialog({ triggerButton, hideWhenOpen = false }: HelpGuideDialogProps) {
  const store = useCopilotStore();
  const [mounted, setMounted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const instanceId = React.useId();
  const [isPrimaryPortal, setIsPrimaryPortal] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!primaryPortalId) {
      primaryPortalId = instanceId;
      setIsPrimaryPortal(true);
    }

    // Carregar progresso salvo no localStorage
    try {
      const saved = localStorage.getItem("horeb_copilot_completed_steps");
      if (saved) {
        setCompletedSteps(JSON.parse(saved));
      }
    } catch {
      // Ignora erro de JSON
    }

    // Ouvir evento customizado global de abertura
    const handleCustomOpen = (
      e: Event
    ) => {
      const customEvent = e as CustomEvent<{ mode?: CopilotMode; step?: number; tab?: CopilotState["activeTab"] }>;
      openCopilot(customEvent.detail);
    };

    window.addEventListener("horeb:open-copilot", handleCustomOpen);

    return () => {
      if (primaryPortalId === instanceId) {
        primaryPortalId = null;
      }
      window.removeEventListener("horeb:open-copilot", handleCustomOpen);
    };
  }, [instanceId]);

  const toggleStepCompleted = useCallback(
    (stepIndex: number) => {
      setCompletedSteps((prev) => {
        let updated: number[];
        if (prev.includes(stepIndex)) {
          updated = prev.filter((s) => s !== stepIndex);
        } else {
          updated = [...prev, stepIndex];
          playDingSound();
        }
        try {
          localStorage.setItem("horeb_copilot_completed_steps", JSON.stringify(updated));
        } catch {
          // Ignora
        }
        return updated;
      });
    },
    []
  );

  const handleStepAction = (actionType: GuideStep["actionType"]) => {
    switch (actionType) {
      case "open-register":
        window.dispatchEvent(
          new CustomEvent("horeb:open-create-church", { detail: { tab: "master" } })
        );
        break;
      case "open-login":
        window.dispatchEvent(
          new CustomEvent("horeb:open-create-church", { detail: { tab: "login" } })
        );
        break;
      case "scroll-pricing": {
        const el = document.getElementById("pricing");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else {
          setCopilotTab("planos-recursos");
          setCopilotMode("full");
        }
        break;
      }
      case "next-step":
        if (store.activeStep < GUIDE_STEPS.length - 1) {
          setCopilotStep(store.activeStep + 1);
        }
        break;
    }
  };

  const currentStep = GUIDE_STEPS[store.activeStep] || GUIDE_STEPS[0];
  const StepIcon = currentStep.icon;
  const isCurrentStepDone = completedSteps.includes(store.activeStep);
  const completionPercentage = Math.round((completedSteps.length / GUIDE_STEPS.length) * 100);

  return (
    <>
      {/* 1. Trigger clicável fornecido pelo pai */}
      {!(hideWhenOpen && store.isOpen) && (
        triggerButton ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              openCopilot({ mode: "compact" });
            }}
            className="inline-flex cursor-pointer"
          >
            {triggerButton}
          </span>
        ) : (
          <Button
            onClick={() => openCopilot({ mode: "compact" })}
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl border-amber-500/30 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Copiloto de Ajuda • Guia Interativo</span>
          </Button>
        )
      )}

      {/* 2. COPILOTO FLUTUANTE NÃO-BLOQUEANTE (Portal Singleton) */}
      {mounted &&
        isPrimaryPortal &&
        createPortal(
          <AnimatePresence>
            {store.isOpen && (
              <div
                id="horeb-copilot-root"
                className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex flex-col items-center justify-end px-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
              >
                {/* ========================================================
                    MODO 1: MINI (PÍLULA COMPACTA DE RODAPÉ ~52px)
                    Permite 95% da tela visível para o pastor testar
                   ======================================================== */}
                {store.mode === "mini" && (
                  <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className="pointer-events-auto w-full max-w-md bg-zinc-950/95 border border-amber-500/50 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl px-3.5 py-2 flex items-center justify-between gap-2.5"
                  >
                    <div
                      onClick={() => setCopilotMode("compact")}
                      className="flex items-center gap-2 min-w-0 cursor-pointer flex-1 group"
                    >
                      <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 shrink-0 group-hover:scale-105 transition-transform">
                        <Compass className="w-4 h-4 text-amber-400 animate-[spin_10s_linear_infinite]" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                            Copiloto Horeb
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                            {store.activeStep + 1}/{GUIDE_STEPS.length}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                          {currentStep.shortTitle}
                        </p>
                      </div>
                    </div>

                    {/* Mini Controles */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCopilotStep(store.activeStep - 1)}
                        disabled={store.activeStep === 0}
                        aria-label="Passo Anterior"
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCopilotStep(store.activeStep + 1)}
                        disabled={store.activeStep === GUIDE_STEPS.length - 1}
                        aria-label="Próximo Passo"
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCopilotMode("compact")}
                        aria-label="Expandir Dica"
                        className="h-7 px-2.5 rounded-full bg-amber-500 text-black font-black text-[11px] flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-sm"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span className="hidden xs:inline">Dica</span>
                      </button>
                      <button
                        type="button"
                        onClick={closeCopilot}
                        aria-label="Fechar Copiloto"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ========================================================
                    MODO 2: COMPACT (BOTTOM-SHEET INTERATIVO ~38-42vh)
                    A tela fica 60% visível para o pastor navegar e testar!
                   ======================================================== */}
                {store.mode === "compact" && (
                  <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 350 }}
                    className="pointer-events-auto w-full max-w-xl bg-zinc-950/98 border border-amber-500/35 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-4 sm:p-5 flex flex-col gap-3 relative overflow-hidden"
                  >
                    {/* Glow Sutil de Topo */}
                    <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-24 bg-amber-500/15 blur-2xl rounded-full" />

                    {/* Barra Central de Ajuste / Snap Handle */}
                    <div
                      onClick={() => setCopilotMode("full")}
                      title="Toque para ver o manual completo"
                      className="w-full flex justify-center pb-1 -mt-1 cursor-pointer group"
                    >
                      <div className="w-12 h-1.5 rounded-full bg-zinc-700 group-hover:bg-amber-400 group-hover:w-16 transition-all" />
                    </div>

                    {/* Header do Copiloto */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <Compass className="w-4 h-4 text-amber-400 animate-[spin_12s_linear_infinite]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                              Copiloto Horeb
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.07] text-zinc-300">
                              Passo {store.activeStep + 1} de {GUIDE_STEPS.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação do Header */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCopilotMode("mini")}
                          title="Minimizar para rodapé slim"
                          className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors"
                        >
                          <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCopilotMode("full")}
                          title="Expandir para Guia Completo com Abas"
                          className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={closeCopilot}
                          title="Fechar Copiloto"
                          className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.06] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Barra de Progresso com Pílulas Clicáveis 1 a 6 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Progresso do Roteiro:</span>
                        <span className="font-bold text-amber-400">
                          {completedSteps.length} de {GUIDE_STEPS.length} concluídos ({completionPercentage}%)
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {GUIDE_STEPS.map((step, idx) => {
                          const isDone = completedSteps.includes(idx);
                          const isCurrent = store.activeStep === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCopilotStep(idx)}
                              title={`Ir para ${step.shortTitle}`}
                              className={`h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border ${
                                isCurrent
                                  ? "bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                                  : isDone
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                                  : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
                              }`}
                            >
                              {isDone ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400 font-black stroke-[3]" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card do Conteúdo do Passo Atual */}
                    <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-white/[0.08] space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-xl border ${currentStep.color}`}>
                            <StepIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                              {currentStep.badge}
                            </span>
                            <h3 className="text-sm font-bold text-white leading-snug">
                              {currentStep.title}
                            </h3>
                          </div>
                        </div>

                        {/* Botão de Concluir Passo */}
                        <button
                          type="button"
                          onClick={() => toggleStepCompleted(store.activeStep)}
                          className={`shrink-0 px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            isCurrentStepDone
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                              : "bg-white/[0.05] border-white/[0.1] text-zinc-300 hover:bg-white/[0.1] hover:text-white"
                          }`}
                        >
                          <Check
                            className={`w-3.5 h-3.5 ${
                              isCurrentStepDone ? "text-emerald-400 stroke-[3]" : "text-zinc-400"
                            }`}
                          />
                          <span>{isCurrentStepDone ? "Concluído!" : "Marcar Feito"}</span>
                        </button>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {currentStep.details}
                      </p>

                      {/* Dica de Ouro */}
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{currentStep.goldenTip}</span>
                      </div>
                    </div>

                    {/* Linha de Navegação & Ação Direta no App */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCopilotStep(store.activeStep - 1)}
                          disabled={store.activeStep === 0}
                          className="h-8 px-2.5 text-xs font-bold border-white/[0.1] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                          <span>Anterior</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCopilotStep(store.activeStep + 1)}
                          disabled={store.activeStep === GUIDE_STEPS.length - 1}
                          className="h-8 px-2.5 text-xs font-bold border-white/[0.1] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                        >
                          <span>Próximo</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>

                      {/* Ação Direta no App (Abre formulário, login ou planos) */}
                      <Button
                        size="sm"
                        onClick={() => handleStepAction(currentStep.actionType)}
                        className="h-8 px-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl shadow-md gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-300"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-black" />
                        <span>{currentStep.actionText}</span>
                      </Button>
                    </div>

                    {/* Link para o Manual Completo com Abas */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[11px] text-zinc-400">
                      <span>Deseja ler sobre Filiais, Perfis ou Planos?</span>
                      <button
                        type="button"
                        onClick={() => setCopilotMode("full")}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>Abrir Manual Completo</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ========================================================
                    MODO 3: FULL (MANUAL EXPANDIDO COM TODAS AS ABAS ~85vh)
                    Contém todo o manual de 4 abas do Horeb
                   ======================================================== */}
                {store.mode === "full" && (
                  <motion.div
                    initial={{ y: 120, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 120, opacity: 0 }}
                    transition={{ type: "spring", damping: 28, stiffness: 350 }}
                    className="pointer-events-auto w-full max-w-3xl max-h-[86dvh] flex flex-col overflow-hidden bg-zinc-950/98 border border-amber-500/40 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.98)] backdrop-blur-2xl text-card-foreground"
                  >
                    {/* Header Fixo com Botão de Minimizar */}
                    <div className="p-4 sm:p-5 pb-3 shrink-0 border-b border-white/[0.08] relative z-10 space-y-1.5 bg-zinc-950/80">
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[10px] font-bold tracking-wider uppercase w-fit">
                          <BookOpen className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>Central de Ajuda & Guia Operacional • Horeb</span>
                        </div>

                        {/* Controles de Janela */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCopilotMode("compact")}
                            className="h-7 px-2.5 rounded-xl border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-bold gap-1"
                          >
                            <Minimize2 className="w-3 h-3" />
                            <span>Modo Flutuante</span>
                          </Button>
                          <button
                            type="button"
                            onClick={closeCopilot}
                            title="Fechar"
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                          <span>Manual do Horeb: Como Funciona o Ecossistema</span>
                        </h2>
                        <p className="text-xs text-zinc-400">
                          Guia de implantação, estrutura Matriz & Filiais, permissões de usuários e tabela de recursos por plano.
                        </p>
                      </div>

                      {/* Seletor Segmentado de Abas */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 pt-2">
                        {[
                          { id: "passo-a-passo", label: "1. Primeiro Acesso", icon: Zap },
                          { id: "matriz-filial", label: "2. Matriz & Filiais", icon: GitBranch },
                          { id: "pessoas-acesso", label: "3. Pessoas & Perfis", icon: Users },
                          { id: "planos-recursos", label: "4. Planos & Recursos", icon: Crown },
                        ].map((tab) => {
                          const TabIcon = tab.icon;
                          const isActive = store.activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setCopilotTab(tab.id as CopilotState["activeTab"])}
                              className={`h-8 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                                isActive
                                  ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black border-amber-300 shadow-sm"
                                  : "bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                              }`}
                            >
                              <TabIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{tab.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* CONTEÚDO SCROLLÁVEL DAS ABAS */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 touch-pan-y overscroll-contain">
                      {/* ABA 1: PASSO A PASSO */}
                      {store.activeTab === "passo-a-passo" && (
                        <div className="space-y-4">
                          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                              Roteiro guiado para implantar o sistema na igreja em menos de 5 minutos. Você pode marcar os passos como concluídos conforme avança!
                            </p>
                          </div>

                          <div className="space-y-3">
                            {GUIDE_STEPS.map((item, index) => {
                              const Icon = item.icon;
                              const isDone = completedSteps.includes(index);
                              return (
                                <div
                                  key={index}
                                  className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] hover:border-amber-500/30 transition-all space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                                        Passo {item.stepNumber}
                                      </span>
                                      <span className="text-xs text-zinc-400 font-semibold">{item.badge}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleStepCompleted(index)}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-all ${
                                        isDone
                                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                          : "bg-white/[0.05] text-zinc-400 border-white/[0.08] hover:text-white"
                                      }`}
                                    >
                                      <Check className={`w-3 h-3 ${isDone ? "text-emerald-400" : ""}`} />
                                      <span>{isDone ? "Concluído" : "Pendente"}</span>
                                    </button>
                                  </div>
                                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span>{item.title}</span>
                                  </h3>
                                  <p className="text-xs text-zinc-300 leading-relaxed">{item.details}</p>
                                  <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-300">
                                    {item.goldenTip}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ABA 2: MATRIZ VS FILIAIS */}
                      {store.activeTab === "matriz-filial" && (
                        <div className="space-y-4">
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-amber-500/10 border border-white/10 space-y-2">
                            <h3 className="text-sm font-black text-white flex items-center gap-2">
                              <GitBranch className="w-4 h-4 text-purple-400" />
                              <span>Hierarquia Multi-Tenant: Matriz e Filiais Integradas</span>
                            </h3>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              O Horeb foi desenhado para permitir que uma igreja sede (Matriz) expanda o ministério com quantas filiais, congregações de bairro ou campus regionais desejar, tudo integrado em uma mesma denominação.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Card Matriz */}
                            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2.5">
                              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                                <Church className="w-4 h-4" />
                                <span>Igreja Sede (Matriz)</span>
                              </div>
                              <ul className="text-xs text-zinc-300 space-y-1.5">
                                <li className="flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>Possui autoridade para cadastrar novas filiais vinculadas.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>Visão unificada de membros e finanças de toda a rede.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>Gerencia a assinatura e upgrades da denominação.</span>
                                </li>
                              </ul>
                            </div>

                            {/* Card Filial */}
                            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2.5">
                              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-400">
                                <GitBranch className="w-4 h-4" />
                                <span>Congregação Filial (Campus)</span>
                              </div>
                              <ul className="text-xs text-zinc-300 space-y-1.5">
                                <li className="flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>Possui URL e slug próprio (ex: /videira-sul).</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>Células nos bairros e horários de cultos locais.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>Chave PIX independente para dízimos daquela congregação.</span>
                                </li>
                              </ul>
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2">
                            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                              Regra Rigorosa de Isolamento & Segurança:
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              Por política rigorosa de isolamento multi-tenant, <strong>usuários não logados não acessam nenhuma página interna</strong>. Usuários logados <strong>só têm acesso às congregações às quais pertencem</strong> ou para as quais o Pastor Master concedeu autorização formal no painel de membros.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ABA 3: PESSOAS & PERFIS */}
                      {store.activeTab === "pessoas-acesso" && (
                        <div className="space-y-3">
                          {[
                            {
                              role: "Super Admin (SaaS Manager)",
                              user: "Edson Manoel (edsonmanoel2012@gmail.com) • Lynx EMS Sistemas",
                              desc: "Acesso irrestrito ao painel geral do Horeb (/admin). Gerencia todos os planos comerciais, assinaturas das igrejas, métricas financeiras MRR, cupons de desconto anual e servidor de e-mails Hostinger.",
                              color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
                              badge: "Acesso Total",
                            },
                            {
                              role: "Pastor Presidente / Master da Igreja",
                              user: "O titular que realizou o cadastro inicial da congregação",
                              desc: "Administra todos os dados da Matriz e de suas filiais. Define a cor da marca, chave PIX, cadastra e remove usuários, cria ministérios ilimitados e altera níveis de acesso para qualquer pessoa da igreja.",
                              color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
                              badge: "Gestor Master",
                            },
                            {
                              role: "Pastores Auxiliares & Líderes de Ministérios",
                              user: "Líderes de Louvor, Diaconia, Família, Jovens, Missões",
                              desc: "Acessam os painéis de seus ministérios, organizam escalas de serviço nos cultos, gerenciam voluntários e comunicados oficiais aos membros do grupo.",
                              color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
                              badge: "Liderança",
                            },
                            {
                              role: "Líderes de Célula (Pequenos Grupos)",
                              user: "Líderes e anfitriões das reuniões nos lares",
                              desc: "Acessam a lista de membros da sua célula, registram novos participantes, controlam presença e se comunicam diretamente com os membros via WhatsApp.",
                              color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                              badge: "Células",
                            },
                            {
                              role: "Equipe do Ministério Kids",
                              user: "Professores e voluntários do espaço infantil",
                              desc: "Operam o Check-in Kids com geração de código de 4 dígitos e etiqueta de identificação, garantindo segurança na entrega das crianças aos pais após o culto.",
                              color: "text-pink-400 border-pink-500/30 bg-pink-500/10",
                              badge: "Kids",
                            },
                            {
                              role: "Membros & Visitantes",
                              user: "Qualquer pessoa que frequenta a igreja",
                              desc: "Utilizam o app no celular como PWA. Ofertam via PIX em segundos, enviam pedidos de oração sigilosos, encontram células próximas e assistem aos cultos online no YouTube.",
                              color: "text-zinc-300 border-white/10 bg-white/5",
                              badge: "Membro",
                            },
                          ].map((p, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-white">{p.role}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.color}`}>
                                  {p.badge}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-zinc-400">{p.user}</p>
                              <p className="text-xs text-zinc-300 leading-relaxed">{p.desc}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ABA 4: PLANOS & RECURSOS (COM TAXA R$ 0 E 30 DIAS GRÁTIS) */}
                      {store.activeTab === "planos-recursos" && (
                        <div className="space-y-4">
                          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between flex-wrap gap-2">
                            <span>⭐ Todos os planos contam com <strong>30 dias de degustação 100% gratuita</strong>, <strong>Taxa de Implantação Zero (R$ 0)</strong> e opção de pagamento anual com desconto.</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Essencial */}
                            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-black text-white">Essencial</span>
                                  <span className="text-xs font-bold text-amber-400">R$ 149/mês</span>
                                </div>
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                  Taxa de Implantação: Gratuita (R$ 0)
                                </div>
                                <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-zinc-300">
                                  <p className="font-bold text-zinc-200">Recursos Inclusos:</p>
                                  <p>✓ Cadastro de membros e visitantes</p>
                                  <p>✓ Área do membro PWA no celular</p>
                                  <p>✓ Mural e comunicados oficiais</p>
                                  <p>✓ Agenda de cultos semanais</p>
                                  <p>✓ Pedidos de oração interativos</p>
                                  <p>✓ Devocionais diários</p>
                                  <p>✓ Dízimos & Ofertas via PIX Instantâneo</p>
                                  <p>✓ Painel administrativo de liderança</p>
                                  <p>✓ Suporte via WhatsApp</p>
                                </div>
                              </div>
                            </div>

                            {/* Gestão */}
                            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/40 shadow-lg space-y-3 flex flex-col justify-between relative overflow-hidden">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-black text-white">Gestão</span>
                                  <span className="text-xs font-black text-amber-400">R$ 249/mês</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                                    Mais Escolhido
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    Taxa: R$ 0
                                  </span>
                                </div>
                                <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-zinc-300">
                                  <p className="font-bold text-amber-400">Tudo do Essencial, mais:</p>
                                  <p>★ Gestão completa de Ministérios e Líderes</p>
                                  <p>★ Células e Pequenos Grupos nos lares</p>
                                  <p>★ Escalas de louvor, equipes e diaconia</p>
                                  <p>★ Controle de presença nos cultos</p>
                                  <p>★ Gestão de eventos e inscrições</p>
                                  <p>★ Gestão Financeira com relatórios</p>
                                  <p>★ Notificações segmentadas por grupos</p>
                                  <p>★ Suporte prioritário ágil</p>
                                </div>
                              </div>
                            </div>

                            {/* Premium */}
                            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-purple-500/40 space-y-3 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-black text-white">Premium</span>
                                  <span className="text-xs font-bold text-purple-400">R$ 399/mês</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/25">
                                    Multissede VIP
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    Taxa: R$ 0
                                  </span>
                                </div>
                                <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-zinc-300">
                                  <p className="font-bold text-purple-400">Tudo do Gestão, mais:</p>
                                  <p>👑 Múltiplas congregações (Matriz e Filiais)</p>
                                  <p>👑 Gestão avançada de pastores e rede</p>
                                  <p>👑 EBD (Escola Bíblica) e cursos</p>
                                  <p>👑 Check-in Kids seguro com etiquetas</p>
                                  <p>👑 Relatórios analíticos e auditoria</p>
                                  <p>👑 Personalizações exclusivas de cores</p>
                                  <p>👑 Suporte VIP com gerente dedicado</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
