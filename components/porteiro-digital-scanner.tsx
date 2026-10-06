"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Camera,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  History,
  AlertTriangle,
  HeartHandshake,
  MessageSquare,
  ArrowRight,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Scan,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  validateAndCheckinMember,
  createWorshipService,
  getMemberAbsenceRadar,
} from "@/app/actions/worship-checkin";

interface PorteiroDigitalScannerProps {
  slug: string;
  initialData: {
    tenant: any;
    services: any[];
    todayAttendances: any[];
    totalToday: number;
    totalEligibleMembers: number;
    todayYMD: string;
    currentUser: {
      id: string;
      name: string;
      role: string;
    };
  };
}

export function PorteiroDigitalScanner({ slug, initialData }: PorteiroDigitalScannerProps) {
  const [services, setServices] = useState(initialData.services);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialData.services[0]?.id || ""
  );
  const [attendances, setAttendances] = useState<any[]>(initialData.todayAttendances);
  const [totalCount, setTotalCount] = useState(initialData.totalToday);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Estados do Scanner e Entrada Manual
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  const [lastCheckinResult, setLastCheckinResult] = useState<{
    member: any;
    alreadyCheckedIn: boolean;
    checkinTime: Date | string;
    totalVisits?: number;
    message: string;
  } | null>(null);

  // Radar de Ausência
  const [absenceList, setAbsenceList] = useState<any[]>([]);
  const [loadingRadar, setLoadingRadar] = useState(false);

  // Dialog Novo Culto
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDayOfWeek, setNewDayOfWeek] = useState("DOMINGO");
  const [newTime, setNewTime] = useState("19:00");
  const [newDescription, setNewDescription] = useState("");

  const scannerRef = useRef<any>(null);
  const isLockedRef = useRef(false);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Tocar Som de Boas-Vindas (Web Audio API nativo sem precisar de MP3 externo)
  const playSound = (type: "SUCCESS" | "WARNING") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "SUCCESS") {
        // Acorde alegre de boas-vindas: C5 (523Hz), E5 (659Hz), G5 (784Hz)
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.15, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.35);
        });
      } else {
        // Tom duplo de alerta suave
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch {
      // AudioContext não permitido antes de interação do usuário
    }
  };

  // Inicializar / Finalizar Scanner de Câmera do Smartphone com proteção contra unmount e Fast Refresh
  useEffect(() => {
    let isCancelled = false;
    let html5QrCode: any = null;

    const safeStop = async (instance: any) => {
      if (!instance) return;
      try {
        const isRunning =
          instance.isScanning === true ||
          (typeof instance.getState === "function" &&
            (instance.getState() === 2 || instance.getState() === 3));

        if (isRunning) {
          await instance.stop().catch(() => {});
        }
      } catch {
        // Ignora erro se o scanner já não estiver rodando
      }

      try {
        await instance.clear().catch(() => {});
      } catch {}
    };

    if (isCameraActive) {
      import("html5-qrcode")
        .then(({ Html5Qrcode }) => {
          if (isCancelled) return;

          // Listar câmeras disponíveis para smartphone
          Html5Qrcode.getCameras()
            .then((cameras) => {
              if (cameras && cameras.length > 0 && !isCancelled) {
                setAvailableCameras(cameras);
              }
            })
            .catch(() => {});

          const container = document.getElementById("reader-container");
          if (!container || isCancelled) return;

          html5QrCode = new Html5Qrcode("reader-container");
          scannerRef.current = html5QrCode;

          // Configuração otimizada para câmera traseira de celulares
          const config = {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              return {
                width: Math.floor(minEdge * 0.75),
                height: Math.floor(minEdge * 0.75),
              };
            },
            aspectRatio: 1.0,
          };

          // Tentar abrir câmera traseira do celular
          html5QrCode
            .start(
              { facingMode: "environment" },
              config,
              (decodedText: string) => {
                if (!isCancelled) {
                  handleProcessQrCode(decodedText);
                }
              },
              () => {}
            )
            .then(() => {
              if (isCancelled) {
                safeStop(html5QrCode);
                return;
              }
              // Checar se o celular suporta lanterna (Torch)
              try {
                const capabilities = html5QrCode.getRunningTrackCapabilities?.();
                if (capabilities && (capabilities as any).torch) {
                  setHasTorchSupport(true);
                }
              } catch {}
            })
            .catch((err: any) => {
              if (isCancelled) return;
              console.warn("Tentando câmera padrão após recusa de environment:", err);
              // Fallback para qualquer câmera disponível
              html5QrCode
                .start(
                  { facingMode: "user" },
                  config,
                  (decodedText: string) => {
                    if (!isCancelled) {
                      handleProcessQrCode(decodedText);
                    }
                  },
                  () => {}
                )
                .then(() => {
                  if (isCancelled) {
                    safeStop(html5QrCode);
                  }
                })
                .catch((e: any) => {
                  if (isCancelled) return;
                  console.error("Erro final ao acessar câmera:", e);
                  toast.error("Permissão de câmera negada ou dispositivo sem suporte.");
                  setIsCameraActive(false);
                });
            });
        })
        .catch(() => {
          if (!isCancelled) {
            toast.error("Não foi possível carregar o leitor de QR Code.");
          }
        });
    }

    return () => {
      isCancelled = true;
      if (scannerRef.current) {
        safeStop(scannerRef.current);
        scannerRef.current = null;
      }
    };
  }, [isCameraActive]);

  // Alternar Lanterna do Celular (Torch)
  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch {
      toast.error("Lanterna não suportada neste celular.");
    }
  };

  // Alternar Entre Câmeras do Celular (ex: traseira 1x, ultra-wide)
  const switchCamera = async () => {
    if (!scannerRef.current || availableCameras.length < 2) {
      toast.info("Apenas uma câmera detectada neste aparelho.");
      return;
    }

    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    setCurrentCameraIndex(nextIndex);

    try {
      await scannerRef.current.stop();
      await scannerRef.current.start(
        nextCamera.id,
        {
          fps: 15,
          qrbox: { width: 240, height: 240 },
        },
        (decodedText: string) => {
          handleProcessQrCode(decodedText);
        },
        () => {}
      );
      toast.success(`Câmera alterada para: ${nextCamera.label || "Câmera Secundária"}`);
    } catch {
      toast.error("Falha ao alternar câmera.");
    }
  };

  // Processar Leitura do QR Code com Trava Anti-Spam
  const handleProcessQrCode = (code: string) => {
    if (isLockedRef.current) return;
    isLockedRef.current = true;

    // Vibração tátil no celular do porteiro
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100]);
    }

    const activeService = services.find((s) => s.id === selectedServiceId);

    startTransition(async () => {
      const res = await validateAndCheckinMember(
        slug,
        code,
        selectedServiceId,
        activeService?.title || "Culto de Celebração"
      );

      if (res.success && res.member) {
        if (res.alreadyCheckedIn) {
          playSound("WARNING");
          toast.info(res.message);
        } else {
          playSound("SUCCESS");
          toast.success(res.message);
          setTotalCount((prev) => prev + 1);
          if (res.attendance) {
            setAttendances((prev) => [
              {
                id: res.attendance.id,
                serviceName: res.attendance.serviceName,
                checkedInAt: res.checkinTime,
                user: res.member,
              },
              ...prev,
            ]);
          }
        }

        setLastCheckinResult({
          member: res.member,
          alreadyCheckedIn: Boolean(res.alreadyCheckedIn),
          checkinTime: res.checkinTime,
          totalVisits: res.totalVisits,
          message: res.message,
        });

        // Liberar o leitor após 3.5 segundos para o próximo membro
        setTimeout(() => {
          setLastCheckinResult(null);
          isLockedRef.current = false;
        }, 3500);
      } else {
        toast.error(res.error || "Código de membro não reconhecido.");
        // Liberar leitor mais rápido em caso de erro
        setTimeout(() => {
          isLockedRef.current = false;
        }, 1500);
      }
    });
  };

  // Carregar Radar de Ausência
  const loadAbsenceRadar = async () => {
    setLoadingRadar(true);
    try {
      const res = await getMemberAbsenceRadar(slug);
      if (res.success && res.absenceList) {
        setAbsenceList(res.absenceList);
      }
    } finally {
      setLoadingRadar(false);
    }
  };

  // Handler: Criar Novo Culto
  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    startTransition(async () => {
      const res = await createWorshipService(slug, {
        title: newTitle,
        dayOfWeek: newDayOfWeek,
        time: newTime,
        description: newDescription,
      });

      if (res.success && res.service) {
        toast.success(res.message);
        setServices((prev) => [...prev, res.service]);
        setSelectedServiceId(res.service.id);
        setIsNewServiceOpen(false);
        setNewTitle("");
      } else {
        toast.error(res.error || "Falha ao criar culto.");
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
      {/* Header da Portaria Digital */}
      <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-white/[0.08] p-5 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="text-center sm:text-left space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black tracking-wide">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Recepção & Portaria Digital</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Porteiro Digital • Recepção de Culto
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Leitura de crachá digital via câmera do smartphone para acolhimento caloroso e controle de frequência em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 border border-white/10 cursor-pointer"
              title={soundEnabled ? "Desativar sinal sonoro" : "Ativar sinal sonoro"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>

            <Button
              onClick={() => setIsNewServiceOpen(true)}
              variant="outline"
              className="border-white/10 bg-white/[0.04] hover:bg-white/10 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Novo Culto</span>
            </Button>
          </div>
        </div>

        {/* Faixa de Indicadores de Hoje */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-5 border-t border-white/[0.08]">
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Presentes Hoje</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">{totalCount}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Cadastrado</span>
            <p className="text-2xl sm:text-3xl font-black text-white mt-0.5">{initialData.totalEligibleMembers}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Taxa de Presença</span>
            <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-0.5">
              {initialData.totalEligibleMembers > 0
                ? Math.round((totalCount / initialData.totalEligibleMembers) * 100)
                : 0}
              %
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Porteiro / Operador</span>
            <p className="text-xs sm:text-sm font-bold text-zinc-200 mt-2 truncate">
              {initialData.currentUser.name}
            </p>
          </div>
        </div>
      </div>

      {/* Painel do Scanner e Recepção */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Câmera / Scanner Mobile (7 Colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] shadow-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-white/[0.06] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base font-black text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <span>Leitor da Câmera do Smartphone</span>
                </CardTitle>

                {/* Seletor do Culto em Andamento */}
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white font-bold max-w-full sm:max-w-xs truncate"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.time || "Culto"})
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Card de Boas-Vindas Imediato (Green Flash) */}
              {lastCheckinResult ? (
                <div
                  className={`p-6 rounded-3xl border text-center transition-all animate-in fade-in zoom-in-95 space-y-3 ${
                    lastCheckinResult.alreadyCheckedIn
                      ? "bg-amber-500/15 border-amber-400 text-amber-300"
                      : "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-2xl shadow-emerald-500/30"
                  }`}
                >
                  <Avatar className="h-24 w-24 mx-auto ring-4 ring-white/20 shadow-xl bg-black">
                    {lastCheckinResult.member.avatarUrl && (
                      <AvatarImage
                        src={lastCheckinResult.member.avatarUrl}
                        alt={lastCheckinResult.member.name}
                      />
                    )}
                    <AvatarFallback className="text-3xl font-black bg-emerald-500 text-black">
                      {lastCheckinResult.member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="text-2xl font-black text-white leading-tight">
                      {lastCheckinResult.member.name}
                    </h3>
                    <p className="text-xs font-bold text-zinc-300 mt-0.5">
                      {lastCheckinResult.member.pastoralTitle || lastCheckinResult.member.role}
                    </p>
                  </div>

                  <div className="pt-2">
                    <span
                      className={`inline-block px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
                        lastCheckinResult.alreadyCheckedIn
                          ? "bg-amber-500 text-black"
                          : "bg-emerald-500 text-black shadow-lg"
                      }`}
                    >
                      {lastCheckinResult.alreadyCheckedIn
                        ? "Presença Já Confirmada"
                        : "✓ Seja Muito Bem-Vindo(a)!"}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400">
                    {lastCheckinResult.totalVisits
                      ? `Esta é a ${lastCheckinResult.totalVisits}ª presença registrada no ano.`
                      : "Presença confirmada no culto."}
                  </p>
                </div>
              ) : (
                /* Janela da Câmera do Celular */
                <div className="space-y-4">
                  {isCameraActive ? (
                    <div className="relative rounded-3xl overflow-hidden bg-black aspect-square max-w-sm mx-auto flex items-center justify-center border-2 border-emerald-500/50 shadow-2xl">
                      <div id="reader-container" className="w-full h-full" />

                      {/* Linha laser de escaneamento animada (HUD) */}
                      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_15px_#34d399] animate-pulse pointer-events-none" />

                      {/* Controles de Câmera Sobrepostos (Lanterna & Troca de Lente) */}
                      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                        {hasTorchSupport && (
                          <button
                            type="button"
                            onClick={toggleTorch}
                            className={`p-2.5 rounded-full border shadow-lg cursor-pointer ${
                              isTorchOn
                                ? "bg-amber-400 text-black border-amber-300"
                                : "bg-black/60 text-white border-white/20 hover:bg-black/80"
                            }`}
                            title="Alternar Lanterna"
                          >
                            {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                          </button>
                        )}

                        {availableCameras.length > 1 && (
                          <button
                            type="button"
                            onClick={switchCamera}
                            className="p-2.5 rounded-full bg-black/60 text-white border border-white/20 hover:bg-black/80 shadow-lg cursor-pointer"
                            title="Alternar Câmera"
                          >
                            <SwitchCamera className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none z-20">
                        <span className="px-3.5 py-1.5 rounded-full bg-black/80 text-[11px] font-mono text-emerald-400 border border-emerald-500/40 shadow-md">
                          Aponte para o QR Code do Crachá
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 sm:p-10 rounded-3xl bg-zinc-900/50 border border-dashed border-white/15 text-center space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                        <Camera className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-bold text-white">
                        Câmera da Portaria Pronta
                      </h4>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                        Toque no botão abaixo para ativar a câmera traseira do celular e escanear os crachás dos membros na portaria.
                      </p>
                      <Button
                        onClick={() => setIsCameraActive(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-11 px-6 rounded-2xl gap-2 cursor-pointer shadow-xl shadow-emerald-600/20"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Ativar Câmera do Celular</span>
                      </Button>
                    </div>
                  )}

                  {isCameraActive && (
                    <Button
                      onClick={() => setIsCameraActive(false)}
                      variant="outline"
                      className="w-full h-10 rounded-xl text-xs font-bold border-white/10 hover:bg-white/10 text-zinc-300 cursor-pointer"
                    >
                      Pausar Leitor de Câmera
                    </Button>
                  )}
                </div>
              )}

              {/* Entrada Manual ou Leitor de Código USB */}
              <div className="pt-3 border-t border-white/[0.06] space-y-2">
                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Ou digite o nome, e-mail ou código do crachá
                </Label>
                <div className="flex gap-2">
                  <Input
                    ref={manualInputRef}
                    type="text"
                    placeholder="Ex: MEM-A1B2C3 ou nome do irmão..."
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && manualCodeInput.trim()) {
                        handleProcessQrCode(manualCodeInput.trim());
                        setManualCodeInput("");
                      }
                    }}
                    className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white h-10"
                  />
                  <Button
                    disabled={isPending || !manualCodeInput.trim()}
                    onClick={() => {
                      handleProcessQrCode(manualCodeInput.trim());
                      setManualCodeInput("");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 rounded-xl cursor-pointer shrink-0 h-10"
                  >
                    <span>Confirmar</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Abas de Lista de Presentes e Radar Pastoral (5 Colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <Tabs defaultValue="today" className="space-y-4">
            <TabsList className="grid grid-cols-2 h-11 rounded-2xl bg-zinc-900/90 border border-white/[0.08] p-1 gap-1">
              <TabsTrigger
                value="today"
                className="rounded-xl text-xs font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Presentes ({attendances.length})</span>
              </TabsTrigger>

              <TabsTrigger
                value="radar"
                onClick={loadAbsenceRadar}
                className="rounded-xl text-xs font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all gap-1.5 cursor-pointer"
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Radar de Ausência</span>
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: PRESENTES HOJE */}
            <TabsContent value="today">
              <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] shadow-2xl overflow-hidden max-h-[560px] flex flex-col">
                <CardHeader className="pb-3 border-b border-white/[0.06]">
                  <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                    <span>Membros Recepcionados Hoje</span>
                    <span className="font-mono text-emerald-400 text-xs">
                      {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-3 overflow-y-auto space-y-2 flex-1">
                  {attendances.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      Nenhum membro registrado ainda neste culto. Ligue a câmera e inicie a recepção.
                    </div>
                  ) : (
                    attendances.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 ring-2 ring-emerald-500/20 bg-black shrink-0">
                            {item.user.avatarUrl && (
                              <AvatarImage src={item.user.avatarUrl} alt={item.user.name} />
                            )}
                            <AvatarFallback className="text-xs font-bold bg-emerald-600 text-white">
                              {item.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <h5 className="font-bold text-white text-xs truncate">
                              {item.user.name}
                            </h5>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {item.user.pastoralTitle || item.user.role}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono font-bold text-emerald-400 shrink-0">
                          {format(new Date(item.checkedInAt), "HH:mm")}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 2: RADAR DE AUSÊNCIA PASTORAL */}
            <TabsContent value="radar">
              <Card className="rounded-3xl bg-zinc-950 border-white/[0.08] shadow-2xl overflow-hidden max-h-[560px] flex flex-col">
                <CardHeader className="pb-3 border-b border-white/[0.06]">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-rose-400" />
                    <span>Cuidado Pastoral • Membros Ausentes</span>
                  </CardTitle>
                  <CardDescription className="text-[11px] text-zinc-400">
                    Ovelhas que não registraram presença nos últimos cultos.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-3 overflow-y-auto space-y-2 flex-1">
                  {loadingRadar ? (
                    <div className="py-12 text-center text-xs text-zinc-400">
                      Calculando frequência dos membros...
                    </div>
                  ) : absenceList.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-500">
                      Clique na aba para atualizar o radar de ausência.
                    </div>
                  ) : (
                    absenceList.slice(0, 30).map((m) => {
                      const isHighAlert = m.daysAbsent >= 21;

                      return (
                        <div
                          key={m.id}
                          className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <h5 className="font-bold text-white text-xs truncate">{m.name}</h5>
                            <p className="text-[10px] text-zinc-400">
                              {m.lastSeenDate
                                ? `Visto por último: ${format(new Date(m.lastSeenDate), "dd/MM/yyyy", { locale: ptBR })}`
                                : "Nenhum check-in recente"}
                            </p>
                          </div>

                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                              isHighAlert
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            {m.daysAbsent >= 999 ? "Sem registro" : `${m.daysAbsent} dias ausente`}
                          </span>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* MODAL: NOVO CULTO */}
      <Dialog open={isNewServiceOpen} onOpenChange={setIsNewServiceOpen}>
        <DialogContent className="max-w-md p-6 bg-zinc-950/95 border-white/10 rounded-3xl">
          <DialogHeader className="pb-3 border-b border-white/[0.08]">
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Cadastrar Horário de Culto</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Configure os cultos semanais para controle de entrada pela portaria.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateService} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">Título do Culto</Label>
              <Input
                type="text"
                placeholder="Ex: Culto da Vitória, Culto de Jovens"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Dia da Semana</Label>
                <select
                  value={newDayOfWeek}
                  onChange={(e) => setNewDayOfWeek(e.target.value)}
                  className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white"
                >
                  <option value="DOMINGO">Domingo</option>
                  <option value="SEGUNDA">Segunda-feira</option>
                  <option value="TERCA">Terça-feira</option>
                  <option value="QUARTA">Quarta-feira</option>
                  <option value="QUINTA">Quinta-feira</option>
                  <option value="SEXTA">Sexta-feira</option>
                  <option value="SABADO">Sábado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Horário</Label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  required
                  className="bg-zinc-900 border-white/10 text-xs rounded-xl text-white"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-white/[0.08]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNewServiceOpen(false)}
                className="text-xs font-bold text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 rounded-xl cursor-pointer"
              >
                {isPending ? "Salvando..." : "Salvar Culto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
