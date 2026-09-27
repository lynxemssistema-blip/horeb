"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Download,
  Share2,
  Smartphone,
  Sparkles,
  X,
  Check,
  HeartHandshake,
  MessageCircle,
  Copy,
  PlusSquare,
  Compass,
} from "lucide-react";

interface NativeMobileToolsProps {
  churchName?: string;
  churchSlug?: string;
}

export function NativeMobileTools({
  churchName = "Horeb Igrejas",
  churchSlug,
}: NativeMobileToolsProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  useEffect(() => {
    // 1. Detectar se já está rodando em modo aplicativo nativo (PWA Standalone)
    const checkStandalone = () => {
      const isPWA =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isPWA);
    };

    checkStandalone();

    // 2. Detectar se é dispositivo iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 3. Capturar evento de instalação nativa do navegador (Android / Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  // Ação 1: Instalar App Nativo
  const handleInstallClick = async () => {
    // Vibração tátil nativa
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([30, 40, 30]);
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        toast.success("Aplicativo instalado com sucesso na sua tela inicial!");
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  // Ação 2: Compartilhamento Nativo via Web Share API (WhatsApp / Redes)
  const handleNativeShare = async () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(40);
    }

    const shareUrl = window.location.href;
    const shareTitle = `${churchName} • Aplicativo Oficial`;
    const shareText = `Conecte-se com a ${churchName}! Acesse cultos, pedidos de oração, células e dízimos pelo aplicativo:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Compartilhado com sucesso!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado para a área de transferência!");
  };

  // Se já estiver rodando como PWA nativo e banner dispensado, não precisa mostrar o banner
  return (
    <>
      {/* 1. Banner Flutuante de Instalação Nativa (Mobile Only) */}
      {!isStandalone && !dismissedBanner && (
        <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top,0px))] inset-x-3 z-50 md:hidden animate-in fade-in-0 slide-in-from-top-4 duration-300">
          <div className="p-3 bg-gradient-to-r from-amber-500/95 via-yellow-500/95 to-amber-600/95 text-black rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center justify-between gap-3 border border-amber-300/40 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-black/15 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black leading-tight truncate">
                  Instalar App da Igreja
                </p>
                <p className="text-[10px] font-semibold text-black/80 leading-tight">
                  Acesso rápido sem ocupar memória
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="h-8 px-3 bg-black hover:bg-zinc-900 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-transform active:scale-95 gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar</span>
              </Button>
              <button
                type="button"
                onClick={() => setDismissedBanner(true)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-black/60 hover:text-black hover:bg-black/10 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Nativo com Instruções de Instalação (para iPhone ou navegadores sem prompt automático) */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] animate-in fade-in-0">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">
                Como Instalar no seu Celular
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Adicione o aplicativo diretamente à tela inicial do seu celular para abrir como um app
                nativo:
              </p>
            </div>

            {isIOS ? (
              <div className="space-y-3 bg-zinc-900/80 p-4 rounded-2xl border border-white/[0.08] text-xs text-zinc-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    No Safari, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima ⎋ na barra inferior).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Role a lista para baixo e toque em <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong> (ícone ⊞).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Toque em <strong>&ldquo;Adicionar&rdquo;</strong> no canto superior direito. Pronto!
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-zinc-900/80 p-4 rounded-2xl border border-white/[0.08] text-xs text-zinc-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Toque no menu do Chrome/navegador (os <strong>3 pontinhos</strong> no canto superior).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Toque em <strong>&ldquo;Instalar Aplicativo&rdquo;</strong> ou <strong>&ldquo;Adicionar à tela inicial&rdquo;</strong>.
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={() => setShowInstallModal(false)}
              className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs"
            >
              Entendido!
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
