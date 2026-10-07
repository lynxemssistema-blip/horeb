"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Grid,
  Sparkles,
  Sliders,
  Download,
  Share2,
  X,
  Check,
  RotateCcw,
  Palette,
  Image as ImageIcon,
  Sun,
  Contrast,
  Droplets,
  Flame,
  CircleDot,
  Type,
  Maximize2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ==========================================
// PRESETS DE FILTROS INSTAGRAM
// ==========================================
interface FilterPreset {
  id: string;
  name: string;
  subtitle: string;
  cssFilter: string;
  previewBg: string;
  adjustments: {
    brightness: number;
    contrast: number;
    saturation: number;
    warmth: number;
    vignette: number;
  };
}

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "normal",
    name: "Normal",
    subtitle: "Sem filtro",
    cssFilter: "none",
    previewBg: "from-zinc-700 to-zinc-900",
    adjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0, vignette: 0 },
  },
  {
    id: "clarendon",
    name: "Clarendon",
    subtitle: "Vibrante & Contraste",
    cssFilter: "contrast(1.2) saturate(1.25) brightness(1.05)",
    previewBg: "from-sky-500 to-indigo-700",
    adjustments: { brightness: 5, contrast: 20, saturation: 25, warmth: -5, vignette: 15 },
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    subtitle: "Pôr do Sol Dourado",
    cssFilter: "sepia(0.25) contrast(1.15) saturate(1.3) brightness(1.08)",
    previewBg: "from-amber-400 to-orange-600",
    adjustments: { brightness: 8, contrast: 15, saturation: 30, warmth: 35, vignette: 20 },
  },
  {
    id: "cinematic",
    name: "Cinematic",
    subtitle: "Estilo Filme",
    cssFilter: "contrast(1.25) saturate(0.9) brightness(0.98)",
    previewBg: "from-teal-600 to-slate-900",
    adjustments: { brightness: -2, contrast: 25, saturation: -10, warmth: -10, vignette: 30 },
  },
  {
    id: "louvor-vivo",
    name: "Louvor Vivo",
    subtitle: "Cores de Palco",
    cssFilter: "contrast(1.3) saturate(1.4) brightness(1.04)",
    previewBg: "from-purple-600 to-pink-600",
    adjustments: { brightness: 4, contrast: 30, saturation: 40, warmth: 10, vignette: 25 },
  },
  {
    id: "vintage-90s",
    name: "Vintage 90s",
    subtitle: "Nostalgia Retrô",
    cssFilter: "sepia(0.35) contrast(0.95) saturate(0.85) brightness(1.02)",
    previewBg: "from-yellow-700 to-stone-800",
    adjustments: { brightness: 2, contrast: -5, saturation: -15, warmth: 25, vignette: 35 },
  },
  {
    id: "noir-bw",
    name: "Noir B&W",
    subtitle: "Preto & Branco Pro",
    cssFilter: "grayscale(1) contrast(1.35) brightness(0.95)",
    previewBg: "from-zinc-400 to-zinc-950",
    adjustments: { brightness: -5, contrast: 35, saturation: -100, warmth: 0, vignette: 40 },
  },
  {
    id: "suave-paz",
    name: "Paz & Suave",
    subtitle: "Luz Macia",
    cssFilter: "contrast(0.9) saturate(1.1) brightness(1.12)",
    previewBg: "from-rose-300 to-teal-200",
    adjustments: { brightness: 12, contrast: -10, saturation: 10, warmth: 10, vignette: 5 },
  },
];

// Selos / Stamps opcionais para a foto
const FAITH_STAMPS = [
  { id: "none", label: "Sem Selo" },
  { id: "church", label: "Brasão da Igreja" },
  { id: "culto", label: "Celebração & Louvor" },
  { id: "gratidao", label: "Coração Grato" },
  { id: "fe", label: "Vivendo pela Fé" },
];

interface InstagramCameraStudioProps {
  churchName?: string;
  churchLogo?: string | null;
  userName?: string;
  triggerButton?: React.ReactNode;
}

export function InstagramCameraStudio({
  churchName = "Horeb Church",
  churchLogo,
  userName,
  triggerButton,
}: InstagramCameraStudioProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "9:16">("4:5");
  const [showGrid, setShowGrid] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Estados de Imagem Capturada
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("normal");
  const [activeTab, setActiveTab] = useState<"filters" | "adjust" | "stamps">("filters");

  // Ajustes Finos
  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    vignette: 0,
  });

  const [selectedStamp, setSelectedStamp] = useState<string>("none");
  const [isExporting, setIsExporting] = useState(false);

  // Refs de Câmera e Canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Iniciar Stream de Câmera
  const startCamera = useCallback(async (facing: "environment" | "user") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

      // Checar suporte à lanterna (Torch)
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities?.() as any) || {};
      setHasTorch(Boolean(capabilities.torch));
    } catch (err: any) {
      console.warn("Câmera nativa inacessível ou negada:", err);
      setCameraActive(false);
    }
  }, []);

  // Parar Stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Abrir / Fechar Estúdio
  useEffect(() => {
    if (isOpen) {
      if (!capturedImage) {
        startCamera(facingMode);
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage, facingMode, startCamera, stopCamera]);

  // Alternar Câmera Frontal / Traseira
  const toggleFacingMode = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    if (!capturedImage) {
      startCamera(nextFacing);
    }
  };

  // Alternar Lanterna
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch {
      toast.error("Lanterna não suportada nesta câmera");
    }
  };

  // Tirar Foto (Capturar Frame do Vídeo)
  const capturePhoto = () => {
    if (!videoRef.current) return;

    try {
      if (typeof window !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    } catch {
      // Ignora erro de vibração
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Se estiver na câmera frontal, espelhar para selfie natural
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

    stopCamera();
    setCapturedImage(dataUrl);
    toast.success("Foto capturada! Ajuste os filtros e compartilhe no Instagram.");
  };

  // Carregar Foto do Celular (Fallback de Arquivo)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        stopCamera();
        setCapturedImage(result);
        toast.success("Foto carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Descartar e Tirar Outra Foto
  const retakePhoto = () => {
    setCapturedImage(null);
    setActiveFilter("normal");
    setAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      warmth: 0,
      vignette: 0,
    });
    setSelectedStamp("none");
    startCamera(facingMode);
  };

  // Aplicar Preset de Filtro
  const selectFilterPreset = (preset: FilterPreset) => {
    setActiveFilter(preset.id);
    setAdjustments({ ...preset.adjustments });
  };

  // Gerar Imagem Final Renderizada no Canvas
  const renderFinalCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (!capturedImage) return null;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = capturedImage;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Dimensões alvo de acordo com o Aspect Ratio do Instagram
    let targetWidth = 1080;
    let targetHeight = 1080;

    if (aspectRatio === "1:1") {
      targetWidth = 1080;
      targetHeight = 1080;
    } else if (aspectRatio === "4:5") {
      targetWidth = 1080;
      targetHeight = 1350;
    } else if (aspectRatio === "9:16") {
      targetWidth = 1080;
      targetHeight = 1920;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Calcular Crop Centralizado
    const targetRatio = targetWidth / targetHeight;
    const sourceRatio = img.width / img.height;

    let srcX = 0;
    let srcY = 0;
    let srcW = img.width;
    let srcH = img.height;

    if (sourceRatio > targetRatio) {
      srcW = img.height * targetRatio;
      srcX = (img.width - srcW) / 2;
    } else {
      srcH = img.width / targetRatio;
      srcY = (img.height - srcH) / 2;
    }

    // Aplicar Filtros no Contexto 2D
    const b = 1 + adjustments.brightness / 100;
    const c = 1 + adjustments.contrast / 100;
    const s = 1 + adjustments.saturation / 100;
    const sepiaVal = adjustments.warmth > 0 ? adjustments.warmth / 100 : 0;
    const hueVal = adjustments.warmth < 0 ? adjustments.warmth * 0.5 : 0;

    let filterStr = `brightness(${b}) contrast(${c}) saturate(${s})`;
    if (sepiaVal > 0) filterStr += ` sepia(${sepiaVal * 0.4})`;
    if (hueVal !== 0) filterStr += ` hue-rotate(${hueVal}deg)`;
    if (activeFilter === "noir-bw") filterStr += " grayscale(1)";

    ctx.filter = filterStr;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetWidth, targetHeight);
    ctx.filter = "none"; // Reset filter

    // Aplicar Efeito de Vinheta (Sombra nas Bordas)
    if (adjustments.vignette > 0) {
      const gradient = ctx.createRadialGradient(
        targetWidth / 2,
        targetHeight / 2,
        targetWidth * 0.35,
        targetWidth / 2,
        targetHeight / 2,
        targetWidth * 0.75
      );
      const alpha = (adjustments.vignette / 100) * 0.7;
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${alpha})`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    // Desenhar Selo Opcional
    if (selectedStamp !== "none") {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      const badgeX = 50;
      const badgeY = targetHeight - 120;

      if (selectedStamp === "church") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, 380, 70, 35);
        ctx.fill();

        ctx.font = "bold 28px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(churchName, badgeX + 30, badgeY + 44);
      } else if (selectedStamp === "culto") {
        ctx.fillStyle = "rgba(245, 158, 11, 0.9)";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, 390, 68, 34);
        ctx.fill();

        ctx.font = "900 26px sans-serif";
        ctx.fillStyle = "#000000";
        ctx.fillText("✨ CULTO DE CELEBRAÇÃO", badgeX + 28, badgeY + 44);
      } else if (selectedStamp === "gratidao") {
        ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, 320, 68, 34);
        ctx.fill();

        ctx.font = "900 26px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("❤️ CORAÇÃO GRATO", badgeX + 28, badgeY + 44);
      } else if (selectedStamp === "fe") {
        ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, 330, 68, 34);
        ctx.fill();

        ctx.font = "900 26px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("✝️ VIVENDO PELA FÉ", badgeX + 28, badgeY + 44);
      }
      ctx.restore();
    }

    return canvas;
  }, [capturedImage, aspectRatio, adjustments, activeFilter, selectedStamp, churchName]);

  // Baixar Foto HD
  const downloadPhoto = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderFinalCanvas();
      if (!canvas) throw new Error("Erro ao renderizar imagem");

      const link = document.createElement("a");
      link.download = `instagram-horeb-${aspectRatio}-${Date.now()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();

      toast.success("Foto salva em alta resolução no seu dispositivo!");
    } catch {
      toast.error("Erro ao salvar a foto.");
    } finally {
      setIsExporting(false);
    }
  };

  // Compartilhar Direto no Instagram / Redes Sociais
  const shareToInstagram = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderFinalCanvas();
      if (!canvas) throw new Error("Erro ao renderizar imagem");

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            toast.error("Erro ao preparar arquivo de imagem.");
            setIsExporting(false);
            return;
          }

          const file = new File([blob], `horeb-insta-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });

          // Se o dispositivo suportar Web Share API com arquivos (iOS Safari e Android Chrome)
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: "Post Horeb",
                text: `Foto registrada com o Horeb na ${churchName}! ✨`,
              });
              toast.success("Foto compartilhada com sucesso!");
            } catch (err: any) {
              if (err.name !== "AbortError") {
                downloadPhoto();
              }
            }
          } else {
            // Fallback: Baixa a foto e avisa o usuário
            downloadPhoto();
            toast.info("Foto baixada! Agora abra o Instagram e selecione-a da sua galeria.");
          }
          setIsExporting(false);
        },
        "image/jpeg",
        0.95
      );
    } catch {
      setIsExporting(false);
      toast.error("Erro ao compartilhar a foto.");
    }
  };

  return (
    <>
      {/* Gatilho Clicável */}
      {triggerButton ? (
        <span onClick={() => setIsOpen(true)} className="inline-flex cursor-pointer">
          {triggerButton}
        </span>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-11 px-4 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-lg gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-white" />
          <span>Tirar Fotos para o Instagram</span>
        </Button>
      )}

      {/* MODAL FULL-SCREEN NATIVO MOBILE DO ESTÚDIO DE FOTOS */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none touch-manipulation">
            {/* Top Bar: Ações de Câmera, Flash, Grid e Fechar */}
            <div className="shrink-0 p-3 sm:p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsOpen(false);
                }}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
                title="Fechar Estúdio"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                <span className="text-xs font-bold tracking-wide">Instagram Studio</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Lanterna (apenas se tiver suporte e em modo câmera) */}
                {!capturedImage && hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                      torchOn
                        ? "bg-amber-400 text-black border-amber-300"
                        : "bg-white/10 text-white border-white/20"
                    }`}
                    title="Alternar Flash/Lanterna"
                  >
                    {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                  </button>
                )}

                {/* Grade de Enquadramento */}
                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                    showGrid
                      ? "bg-white/25 text-amber-400 border-amber-400/40"
                      : "bg-white/10 text-white border-white/20"
                  }`}
                  title="Grade dos Terços"
                >
                  <Grid className="w-4 h-4" />
                </button>

                {/* Alternar Câmera Frontal / Traseira */}
                {!capturedImage && (
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
                    title="Virar Câmera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* SELETOR DE FORMATO (1:1 FEED, 4:5 RETRATO, 9:16 STORIES) */}
            <div className="shrink-0 flex items-center justify-center gap-2 pb-2 z-10">
              {[
                { id: "1:1", label: "1:1 Quadrado" },
                { id: "4:5", label: "4:5 Retrato Post" },
                { id: "9:16", label: "9:16 Stories" },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setAspectRatio(fmt.id as any)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                    aspectRatio === fmt.id
                      ? "bg-white text-black border-white shadow-md scale-105"
                      : "bg-black/40 text-zinc-400 border-white/15 hover:text-white"
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            {/* ÁREA CENTRAL DO VIEWFINDER / CÂMERA & PREVIEW */}
            <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0 relative overflow-hidden">
              <div
                className={`relative rounded-2xl overflow-hidden bg-zinc-950 border border-white/20 shadow-2xl flex items-center justify-center transition-all ${
                  aspectRatio === "1:1"
                    ? "aspect-square w-full max-w-[420px]"
                    : aspectRatio === "4:5"
                    ? "aspect-[4/5] w-full max-w-[390px]"
                    : "aspect-[9/16] w-full max-w-[360px]"
                }`}
              >
                {/* 1. Modo Vídeo / Câmera Ativa */}
                {!capturedImage ? (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className={`w-full h-full object-cover ${
                        facingMode === "user" ? "scale-x-[-1]" : ""
                      }`}
                    />

                    {/* Fallback se câmera não abrir */}
                    {!cameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900/90 gap-3">
                        <Camera className="w-12 h-12 text-zinc-500 animate-pulse" />
                        <div>
                          <p className="text-sm font-bold text-white">Câmera não iniciada</p>
                          <p className="text-xs text-zinc-400 mt-1">
                            Você pode permitir o acesso à câmera ou escolher uma foto da galeria do celular.
                          </p>
                        </div>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          size="sm"
                          className="bg-pink-600 hover:bg-pink-500 text-white font-bold gap-1.5"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Carregar Foto da Galeria</span>
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  /* 2. Modo Preview da Foto Capturada com Filtros Aplicados */
                  <div className="relative w-full h-full overflow-hidden">
                    <img
                      src={capturedImage}
                      alt="Captura"
                      style={{
                        filter: `brightness(${1 + adjustments.brightness / 100}) contrast(${
                          1 + adjustments.contrast / 100
                        }) saturate(${1 + adjustments.saturation / 100}) ${
                          adjustments.warmth > 0
                            ? `sepia(${adjustments.warmth * 0.004})`
                            : `hue-rotate(${adjustments.warmth * 0.5}deg)`
                        } ${activeFilter === "noir-bw" ? "grayscale(1)" : ""}`,
                      }}
                      className="w-full h-full object-cover transition-all"
                    />

                    {/* Efeito Vinheta em tempo real no preview */}
                    {adjustments.vignette > 0 && (
                      <div
                        style={{
                          background: `radial-gradient(circle, transparent 35%, rgba(0,0,0,${
                            (adjustments.vignette / 100) * 0.75
                          }) 100%)`,
                        }}
                        className="absolute inset-0 pointer-events-none"
                      />
                    )}

                    {/* Selo em tempo real no preview */}
                    {selectedStamp !== "none" && (
                      <div className="absolute bottom-4 left-4 pointer-events-none drop-shadow-md">
                        {selectedStamp === "church" && (
                          <div className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold text-xs flex items-center gap-2">
                            <span>⛪</span>
                            <span>{churchName}</span>
                          </div>
                        )}
                        {selectedStamp === "culto" && (
                          <div className="px-3.5 py-1.5 rounded-full bg-amber-500 text-black font-black text-xs shadow-lg">
                            ✨ CULTO DE CELEBRAÇÃO
                          </div>
                        )}
                        {selectedStamp === "gratidao" && (
                          <div className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-white font-black text-xs shadow-lg">
                            ❤️ CORAÇÃO GRATO
                          </div>
                        )}
                        {selectedStamp === "fe" && (
                          <div className="px-3.5 py-1.5 rounded-full bg-blue-500 text-white font-black text-xs shadow-lg">
                            ✝️ VIVENDO PELA FÉ
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Grade de Guia de Composição (Regra dos Terços) */}
                {showGrid && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/10">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-white/20" />
                    <div className="border-r border-white/20" />
                    <div />
                  </div>
                )}
              </div>
            </div>

            {/* Input escondido para upload de arquivo fallback */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* PAINEL INFERIOR: DISPARADOR OU ESTÚDIO DE EDIÇÃO */}
            <div className="shrink-0 p-3 sm:p-4 bg-zinc-950/95 border-t border-white/10 z-20 backdrop-blur-xl">
              {!capturedImage ? (
                /* Controles do Modo Câmera */
                <div className="flex items-center justify-around max-w-md mx-auto py-2">
                  {/* Botão de Galeria */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex flex-col items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-all"
                    title="Galeria do Celular"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  {/* Disparador Central de Foto (Shutter) */}
                  <button
                    type="button"
                    onClick={capturePhoto}
                    aria-label="Tirar Foto"
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 group active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  >
                    <div className="w-full h-full rounded-full bg-white group-hover:bg-amber-400 transition-colors" />
                  </button>

                  {/* Botão de Inversão de Câmera */}
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex flex-col items-center justify-center text-zinc-300 hover:text-white active:scale-90 transition-all"
                    title="Virar Câmera"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                /* Controles do Modo Pós-Captura (Filtros & Ajustes Instagram) */
                <div className="space-y-3 max-w-lg mx-auto">
                  {/* Navegação entre Filtros, Ajustes e Selos */}
                  <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-white/[0.06] border border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveTab("filters")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "filters"
                          ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Filtros</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("adjust")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "adjust"
                          ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Ajustes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("stamps")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        activeTab === "stamps"
                          ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Selos</span>
                    </button>
                  </div>

                  {/* ABA 1: CARROSSEL DE FILTROS INSTAGRAM */}
                  {activeTab === "filters" && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1 no-scrollbar touch-pan-x">
                      {FILTER_PRESETS.map((p) => {
                        const isSelected = activeFilter === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => selectFilterPreset(p)}
                            className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-hidden"
                          >
                            <div
                              className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all p-0.5 ${
                                isSelected
                                  ? "border-pink-500 scale-105 shadow-md shadow-pink-500/30"
                                  : "border-white/20 group-hover:border-white/50"
                              }`}
                            >
                              <div
                                className={`w-full h-full rounded-lg bg-gradient-to-tr ${p.previewBg} flex items-center justify-center text-[10px] font-black uppercase text-white drop-shadow-sm`}
                              >
                                {p.name.slice(0, 3)}
                              </div>
                            </div>
                            <span
                              className={`text-[11px] font-bold truncate max-w-[70px] ${
                                isSelected ? "text-pink-400 font-black" : "text-zinc-400"
                              }`}
                            >
                              {p.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ABA 2: SLIDERS DE AJUSTES FINOS */}
                  {activeTab === "adjust" && (
                    <div className="space-y-2 py-1 max-h-36 overflow-y-auto pr-1">
                      {/* Brilho */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-zinc-400 flex items-center gap-1.5 w-24">
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>Brilho</span>
                        </span>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          value={adjustments.brightness}
                          onChange={(e) =>
                            setAdjustments({ ...adjustments, brightness: Number(e.target.value) })
                          }
                          className="flex-1 accent-pink-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">
                          {adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}
                        </span>
                      </div>

                      {/* Contraste */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-zinc-400 flex items-center gap-1.5 w-24">
                          <Contrast className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Contraste</span>
                        </span>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          value={adjustments.contrast}
                          onChange={(e) =>
                            setAdjustments({ ...adjustments, contrast: Number(e.target.value) })
                          }
                          className="flex-1 accent-pink-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">
                          {adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}
                        </span>
                      </div>

                      {/* Saturação */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-zinc-400 flex items-center gap-1.5 w-24">
                          <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Saturação</span>
                        </span>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          value={adjustments.saturation}
                          onChange={(e) =>
                            setAdjustments({ ...adjustments, saturation: Number(e.target.value) })
                          }
                          className="flex-1 accent-pink-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">
                          {adjustments.saturation > 0 ? `+${adjustments.saturation}` : adjustments.saturation}
                        </span>
                      </div>

                      {/* Calor / Temperatura */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-zinc-400 flex items-center gap-1.5 w-24">
                          <Flame className="w-3.5 h-3.5 text-orange-400" />
                          <span>Calor</span>
                        </span>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          value={adjustments.warmth}
                          onChange={(e) =>
                            setAdjustments({ ...adjustments, warmth: Number(e.target.value) })
                          }
                          className="flex-1 accent-pink-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">
                          {adjustments.warmth > 0 ? `+${adjustments.warmth}` : adjustments.warmth}
                        </span>
                      </div>

                      {/* Vinheta */}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-zinc-400 flex items-center gap-1.5 w-24">
                          <CircleDot className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Vinheta</span>
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={adjustments.vignette}
                          onChange={(e) =>
                            setAdjustments({ ...adjustments, vignette: Number(e.target.value) })
                          }
                          className="flex-1 accent-pink-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-zinc-400 w-8 text-right">
                          {adjustments.vignette}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ABA 3: SELOS DE FÉ & IGREJA */}
                  {activeTab === "stamps" && (
                    <div className="flex flex-wrap items-center gap-2 py-1">
                      {FAITH_STAMPS.map((stamp) => (
                        <button
                          key={stamp.id}
                          type="button"
                          onClick={() => setSelectedStamp(stamp.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            selectedStamp === stamp.id
                              ? "bg-amber-500 text-black border-amber-300 shadow-md scale-105"
                              : "bg-white/[0.05] border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.1]"
                          }`}
                        >
                          {stamp.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* LINHA DE AÇÕES FINAIS (DESPERDÍCIO ZERO) */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={retakePhoto}
                      disabled={isExporting}
                      className="h-10 px-3 text-xs font-bold border-white/20 bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Tirar Outra</span>
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadPhoto}
                        disabled={isExporting}
                        className="h-10 px-3 text-xs font-bold border-white/20 bg-white/[0.05] text-zinc-200 hover:bg-white/[0.1] gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Baixar HD</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={shareToInstagram}
                        disabled={isExporting}
                        className="h-10 px-4 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg shadow-pink-500/30 gap-1.5 active:scale-95 transition-all cursor-pointer border border-pink-400/40"
                      >
                        <Share2 className="w-4 h-4 text-white" />
                        <span>Postar no Instagram</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
