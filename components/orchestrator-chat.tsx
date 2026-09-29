"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Loader2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  PhoneCall,
  HeartHandshake,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  processVoiceMessage,
  processTextMessage,
  getUserConversation,
  resetUserConversation,
} from "@/app/actions/chat";
import { getChurchPastors } from "@/app/actions/pastoral";
import { PastoralCounselingDialog } from "@/components/pastoral-counseling-dialog";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentName?: string;
  timestamp: Date;
  audioBlobUrl?: string;
  isVoice?: boolean;
}

interface OrchestratorChatProps {
  tenantSlug: string;
  userName?: string | null;
  initialMood?: {
    key: string;
    label: string;
    emoji?: string;
    sublabel: string;
  } | null;
  onResetMood?: () => void;
}

export function OrchestratorChat({
  tenantSlug,
  userName,
  initialMood,
  onResetMood,
}: OrchestratorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string>("Orquestrador Horeb");

  // Atendimento Pastoral Humano Direto
  const [isPastoralDialogOpen, setIsPastoralDialogOpen] = useState(false);
  const [onlinePastorsCount, setOnlinePastorsCount] = useState(0);
  const [pastoralTopic, setPastoralTopic] = useState("");

  // Persistência e Continuidade de Conversa
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  // Sistema Avançado de Áudio (Ouvir a qualquer momento: o que enviou ou o que a AI gerou)
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState<boolean>(false);
  const [audioSourceType, setAudioSourceType] = useState<"speech" | "blob" | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Carregar vozes do navegador para síntese natural em português
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const avail = window.speechSynthesis.getVoices();
      if (avail.length > 0) setVoices(avail);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Limpeza de áudio ao desmontar
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Limpar texto de caracteres especiais/markdown para pronúncia natural
  const cleanTextForSpeech = (raw: string): string => {
    return raw
      .replace(/^🎤\s*"?/, "")
      .replace(/"$/, "")
      .replace(/[*#_~`>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
  };

  // Parar qualquer áudio tocando no momento
  const stopAllAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayingMessageId(null);
    setIsAudioPaused(false);
    setAudioSourceType(null);
  };

  // Reproduzir fala usando SpeechSynthesis com voz natural pt-BR
  const playWithSpeechSynthesis = (id: string, content: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Síntese de voz não suportada neste navegador.");
      return;
    }

    window.speechSynthesis.cancel();
    const text = cleanTextForSpeech(content);
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = playbackRate;
    utterance.pitch = 1.0;

    // Buscar melhor voz em português disponível
    const ptVoices = voices.filter((v) => v.lang.startsWith("pt"));
    const bestVoice =
      ptVoices.find(
        (v) =>
          v.name.includes("Google") ||
          v.name.includes("Luciana") ||
          v.name.includes("Felipe") ||
          v.name.includes("Daniel") ||
          v.name.includes("Maria") ||
          v.name.includes("Natural")
      ) || ptVoices[0];

    if (bestVoice) utterance.voice = bestVoice;

    utterance.onstart = () => {
      setPlayingMessageId(id);
      setIsAudioPaused(false);
      setAudioSourceType("speech");
    };

    utterance.onend = () => {
      setPlayingMessageId(null);
      setIsAudioPaused(false);
      setAudioSourceType(null);
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      setPlayingMessageId(null);
      setIsAudioPaused(false);
      setAudioSourceType(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Alternar Reprodução / Pausa / Troca de Áudio
  const togglePlayMessage = (
    id: string,
    content: string,
    audioBlobUrl?: string
  ) => {
    // Se clicou na mesma mensagem que já está ativa
    if (playingMessageId === id) {
      if (isAudioPaused) {
        // Continuar reprodução
        if (audioSourceType === "blob" && audioElementRef.current) {
          audioElementRef.current.play();
          setIsAudioPaused(false);
        } else if (audioSourceType === "speech" && window.speechSynthesis) {
          window.speechSynthesis.resume();
          setIsAudioPaused(false);
        }
      } else {
        // Pausar
        if (audioSourceType === "blob" && audioElementRef.current) {
          audioElementRef.current.pause();
          setIsAudioPaused(true);
        } else if (audioSourceType === "speech" && window.speechSynthesis) {
          window.speechSynthesis.pause();
          setIsAudioPaused(true);
        }
      }
      return;
    }

    // Parar mensagem anterior antes de iniciar nova
    stopAllAudio();

    // Se possui arquivo de áudio original gravado pelo microfone do usuário
    if (audioBlobUrl) {
      try {
        const audio = new Audio(audioBlobUrl);
        audio.playbackRate = playbackRate;
        audio.onended = () => {
          setPlayingMessageId(null);
          setIsAudioPaused(false);
          setAudioSourceType(null);
        };
        audio.onerror = () => {
          playWithSpeechSynthesis(id, content);
        };
        audioElementRef.current = audio;
        setPlayingMessageId(id);
        setIsAudioPaused(false);
        setAudioSourceType("blob");
        audio.play().catch(() => {
          playWithSpeechSynthesis(id, content);
        });
      } catch {
        playWithSpeechSynthesis(id, content);
      }
      return;
    }

    // Caso contrário, sintetiza o texto em voz pastoral calorosa
    playWithSpeechSynthesis(id, content);
  };

  // Alternar velocidade da voz (1x, 1.25x, 1.5x)
  const cyclePlaybackRate = () => {
    const nextRate = playbackRate === 1.0 ? 1.25 : playbackRate === 1.25 ? 1.5 : 1.0;
    setPlaybackRate(nextRate);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = nextRate;
    }
    toast.info(`Velocidade de leitura: ${nextRate}x`);
  };

  // Monitora disponibilidade de pastores da igreja em tempo real
  useEffect(() => {
    let isMounted = true;
    async function checkPastors() {
      try {
        const res = await getChurchPastors(tenantSlug);
        if (res.success && isMounted) {
          setOnlinePastorsCount(res.onlineCount || 0);
        }
      } catch {}
    }
    checkPastors();
    const interval = setInterval(checkPastors, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tenantSlug]);

  // Carrega e continua a conversa de onde o usuário parou (histórico contínuo)
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const res = await getUserConversation(tenantSlug);
        if (res.success && isMounted) {
          if (res.conversationId) setConversationId(res.conversationId);
          if (res.agentName) setActiveAgent(res.agentName);

          const userFirstName =
            res.firstName ||
            (userName ? userName.trim().split(/\s+/)[0] : "");

          if (res.messages && res.messages.length > 0) {
            setMessages(
              res.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                agentName: m.agentName || res.agentName || "Pastor Conselheiro",
                timestamp: new Date(m.timestamp),
                isVoice: m.content.startsWith("🎤") || m.content.includes("🎤"),
              }))
            );
          } else {
            // Conversa sem histórico anterior: exibe mensagem inicial calorosa e personalizada
            let initialGreeting = userFirstName
              ? `Graça e Paz, ${userFirstName}! Sou o Conselheiro Pastoral da sua igreja. Como posso acolher seu coração e orar por você hoje?`
              : "Graça e Paz! Sou o Conselheiro Pastoral da sua igreja. Como posso acolher seu coração e orar por você hoje?";

            if (initialMood) {
              const namePart = userFirstName ? `, ${userFirstName}` : "";
              if (initialMood.key === "FELIZ") {
                initialGreeting = `Graça e Paz${namePart}! Que bênção saber que você está ${initialMood.label.toLowerCase()} hoje! Quer compartilhar seu testemunho ou celebrar algo especial que Deus fez em sua vida?`;
              } else if (initialMood.key === "CANSADO") {
                initialGreeting = `Graça e Paz${namePart}. Compreendo que seu corpo ou sua mente estão pedindo descanso hoje. Jesus nos convidou: 'Vinde a mim todos os que estais cansados e sobrecarregados, e eu vos aliviarei'. Conte-me o que está pesando no seu coração.`;
              } else if (initialMood.key === "ANSIOSO") {
                initialGreeting = `Graça e Paz${namePart}. Respire fundo com calma, você está em um espaço seguro e acolhedor. O que tem trazido aflição ou incertezas sobre o amanhã ao seu coração? Deixe-me orar com você.`;
              } else if (initialMood.key === "TRISTE") {
                initialGreeting = `Graça e Paz${namePart}. Deus conhece cada lágrima silenciosa e cuida de cada detalhe da sua dor. Estou aqui para te ouvir com todo amor cristão e interceder por você. Desabafe comigo.`;
              }
            }

            setMessages([
              {
                id: "welcome-1",
                role: "assistant",
                content: initialGreeting,
                agentName: "Orquestrador Pastoral",
                timestamp: new Date(),
              },
            ]);
          }
        }
      } catch (e) {
        console.error("Falha ao carregar histórico pastoral:", e);
      } finally {
        if (isMounted) setIsLoadingHistory(false);
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [tenantSlug, initialMood, userName]);

  // Reiniciar diálogo / Começar novo assunto arquivando o anterior
  const handleResetConversation = async () => {
    try {
      stopAllAudio();
      setIsProcessing(true);
      const res = await resetUserConversation(tenantSlug);
      if (res.success && res.conversationId) {
        setConversationId(res.conversationId);
        const userFirstName = userName ? userName.trim().split(/\s+/)[0] : "";
        setMessages([
          {
            id: Date.now().toString(),
            role: "assistant",
            content: userFirstName
              ? `Graça e Paz, ${userFirstName}! Iniciamos um novo momento de oração e conversa. Como posso acolher o seu coração agora?`
              : "Graça e Paz! Iniciamos um novo momento de oração e conversa. Como posso acolher o seu coração agora?",
            agentName: "Orquestrador Pastoral",
            timestamp: new Date(),
          },
        ]);
        toast.info("Novo diálogo iniciado com o pastor.");
      }
    } catch {
      toast.error("Erro ao reiniciar conversa.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Scroll automático ao adicionar mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Envio de Mensagem de Texto
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsProcessing(true);

    try {
      const res = await processTextMessage({
        message: text,
        tenantSlug,
        moodContext: initialMood ? `${initialMood.label} (${initialMood.sublabel})` : undefined,
        conversationId,
      });

      if (res.success && res.textResponse) {
        if (res.conversationId) setConversationId(res.conversationId);
        if (res.agentName) setActiveAgent(res.agentName);
        const assistantMsgId = (Date.now() + 1).toString();
        const assistantMsg: Message = {
          id: assistantMsgId,
          role: "assistant",
          content: res.textResponse,
          agentName: res.agentName || "Pastor Conselheiro",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        toast.error(res.error || "Erro ao responder mensagem.");
      }
    } catch {
      toast.error("Erro de conexão ao conversar com a IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Gravação de Áudio/Voz
  const startRecording = async () => {
    stopAllAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleAudioSend(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Não foi possível acessar seu microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioSend = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const audioBlobUrl = URL.createObjectURL(blob);
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        const formData = new FormData();
        formData.append("audio", base64Data);
        formData.append("tenantSlug", tenantSlug);
        formData.append("tenantId", tenantSlug);
        if (conversationId) formData.append("conversationId", conversationId);

        const res = await processVoiceMessage(formData);
        if (res.success && res.textResponse) {
          if (res.conversationId) setConversationId(res.conversationId);
          const userMsgId = Date.now().toString();
          const assistantMsgId = (Date.now() + 1).toString();

          if (res.userTranscription) {
            setMessages((prev) => [
              ...prev,
              {
                id: userMsgId,
                role: "user",
                content: `🎤 "${res.userTranscription}"`,
                timestamp: new Date(),
                audioBlobUrl,
                isVoice: true,
              },
            ]);
          }

          if (res.agentName) setActiveAgent(res.agentName);

          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: "assistant",
              content: res.textResponse!,
              agentName: res.agentName || "Pastor Conselheiro",
              timestamp: new Date(),
            },
          ]);

          // Iniciar a reprodução do áudio da resposta gerada pela IA automaticamente com controles interativos
          setTimeout(() => {
            playWithSpeechSynthesis(assistantMsgId, res.textResponse!);
          }, 350);
        } else {
          toast.error(res.error || "Erro ao processar áudio.");
        }
        setIsProcessing(false);
      };
    } catch {
      toast.error("Erro ao enviar áudio.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[78vh] sm:h-[82vh] bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Top Bar com Status do Especialista Conectado */}
      <div className="px-4 sm:px-6 py-3.5 bg-muted/40 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {activeAgent}
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                IA Pastoral
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>Acolhimento & Oração</span>
              {initialMood && (
                <>
                  <span>•</span>
                  <span>Sentindo-se {initialMood.label}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botão de Falar com Pastor Direto com Indicador Ao Vivo */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPastoralTopic(inputText || (messages[messages.length - 1]?.content) || "");
              setIsPastoralDialogOpen(true);
            }}
            className={`text-xs font-bold gap-1.5 h-8 px-2.5 sm:px-3 rounded-xl cursor-pointer transition-all shadow-xs ${
              onlinePastorsCount > 0
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 ring-1 ring-emerald-500/30"
                : "border-border text-foreground hover:bg-muted"
            }`}
            title="Conversar diretamente com um pastor da congregação"
          >
            <PhoneCall className={`w-3.5 h-3.5 ${onlinePastorsCount > 0 ? "text-emerald-500 animate-pulse" : "text-primary"}`} />
            <span className="hidden xs:inline">Falar com Pastor</span>
            <span className="xs:hidden">Pastor</span>
            {onlinePastorsCount > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </Button>

          {/* Botão de Novo Diálogo / Reiniciar Histórico */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetConversation}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5 rounded-xl cursor-pointer"
            title="Iniciar novo assunto e arquivar conversa anterior"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Novo Diálogo</span>
          </Button>

          {onResetMood && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetMood}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5 rounded-xl cursor-pointer"
              title="Alterar sentimento"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Check-in</span>
            </Button>
          )}
        </div>
      </div>

      {/* Área de Mensagens (Chat Scroll com Reprodutor de Áudio Integrado) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const isPlayingThis = playingMessageId === msg.id;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-foreground border border-border"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-md"
                    : "bg-muted/70 text-foreground border border-border/60 rounded-tl-none"
                }`}
              >
                {!isUser && msg.agentName && (
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      {msg.agentName}
                    </p>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}

                {/* Conteúdo textual da mensagem */}
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* =========================================================================
                    REPRODUTOR DE ÁUDIO INTERATIVO (OUVIR A QUALQUER MOMENTO)
                   ========================================================================= */}
                {isUser ? (
                  /* Áudio da Mensagem do Usuário (o que ele enviou) */
                  <div className="mt-2.5 pt-2 border-t border-primary-foreground/20 flex items-center justify-between gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => togglePlayMessage(msg.id, msg.content, msg.audioBlobUrl)}
                      className={`h-6 px-2.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPlayingThis
                          ? "bg-white text-primary shadow-xs ring-2 ring-white/50"
                          : "text-primary-foreground/90 bg-white/15 hover:bg-white/25"
                      }`}
                      title="Ouvir mensagem de voz do usuário a qualquer momento"
                    >
                      {isPlayingThis && !isAudioPaused ? (
                        <>
                          <Pause className="w-2.5 h-2.5 fill-current" />
                          <span>Pausar meu áudio</span>
                        </>
                      ) : isPlayingThis && isAudioPaused ? (
                        <>
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Continuar meu áudio</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{msg.audioBlobUrl || msg.isVoice ? "Ouvir meu áudio" : "Ouvir o que enviei"}</span>
                        </>
                      )}
                    </button>

                    {/* Equalizador animado quando tocando */}
                    {isPlayingThis && !isAudioPaused && (
                      <div className="flex items-end gap-0.5 h-3 px-1">
                        <span className="w-1 bg-white rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                        <span className="w-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s] h-3.5" />
                        <span className="w-1 bg-white rounded-full animate-bounce h-2" />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Áudio da Mensagem da IA Pastoral (o que a IA gerou) */
                  <div className="mt-3 pt-2.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => togglePlayMessage(msg.id, msg.content, msg.audioBlobUrl)}
                        className={`h-7 px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isPlayingThis
                            ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/30"
                            : "bg-background/90 hover:bg-primary/10 text-foreground border-border hover:border-primary/50"
                        }`}
                        title="Ouvir a resposta do conselheiro em voz pastoral"
                      >
                        {isPlayingThis && !isAudioPaused ? (
                          <>
                            <Pause className="w-3 h-3 fill-current" />
                            <span>Pausar áudio</span>
                          </>
                        ) : isPlayingThis && isAudioPaused ? (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Continuar áudio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-primary" />
                            <span>Ouvir Reflexão</span>
                          </>
                        )}
                      </Button>

                      {/* Equalizador animado em tempo real */}
                      {isPlayingThis && !isAudioPaused && (
                        <div className="flex items-end gap-0.5 h-3.5 px-1">
                          <span className="w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                          <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s] h-3.5" />
                          <span className="w-1 bg-primary rounded-full animate-bounce h-2" />
                          <span className="w-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.4s] h-3" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Seletor de Velocidade (1.0x, 1.25x, 1.5x) */}
                      <button
                        type="button"
                        onClick={cyclePlaybackRate}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                        title="Ajustar velocidade da voz pastoral"
                      >
                        {playbackRate}x
                      </button>

                      {/* Botão de Parar Áudio */}
                      {isPlayingThis && (
                        <button
                          type="button"
                          onClick={stopAllAudio}
                          className="text-[10px] text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                          title="Parar áudio"
                        >
                          <Square className="w-2.5 h-2.5 fill-current" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 text-xs text-muted-foreground p-2"
          >
            <div className="w-8 h-8 rounded-xl bg-muted text-primary border border-border flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-none p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Ouvindo com carinho e orando com a Palavra...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Barra de Apoio Pastoral Rápida */}
      <div className="px-4 py-2 bg-muted/20 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <HeartHandshake className="w-3.5 h-3.5 text-primary" />
          <span>Deseja conversar diretamente com um pastor da igreja?</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setPastoralTopic(inputText);
            setIsPastoralDialogOpen(true);
          }}
          className="text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
        >
          <span>{onlinePastorsCount > 0 ? "Chamar Pastor Online" : "Ver Agenda de Atendimento"}</span>
          <span className="text-[10px]">→</span>
        </button>
      </div>

      {/* Input de Mensagem (Texto & Voz Integrados) */}
      <div className="p-3 sm:p-4 bg-muted/30 border-t border-border/60">
        <form onSubmit={handleSendText} className="flex items-end gap-2">
          {/* Botão de Gravação de Voz */}
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className={`h-11 w-11 rounded-2xl shrink-0 transition-all cursor-pointer ${
              isRecording
                ? "animate-pulse ring-4 ring-red-500/30"
                : "border-border/80 hover:border-primary hover:text-primary"
            }`}
            title={isRecording ? "Parar Gravação" : "Falar por Voz"}
          >
            {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Campo de Texto */}
          <div className="flex-1 relative">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              placeholder={isRecording ? "Gravando seu áudio pastoral..." : "Escreva seu desabafo, pedido ou dúvida..."}
              disabled={isRecording || isProcessing}
              rows={1}
              className="resize-none min-h-[44px] max-h-32 text-xs sm:text-sm py-3 px-3.5 rounded-2xl bg-card border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          {/* Botão de Enviar Texto */}
          <Button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            size="icon"
            className="h-11 w-11 rounded-2xl shrink-0 font-bold bg-primary text-primary-foreground hover:brightness-110 shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Modal Interativo de Atendimento Pastoral */}
      <PastoralCounselingDialog
        isOpen={isPastoralDialogOpen}
        onClose={() => setIsPastoralDialogOpen(false)}
        slug={tenantSlug}
        initialTopic={pastoralTopic}
      />
    </div>
  );
}
