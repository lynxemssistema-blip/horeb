"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Loader2,
  Volume2,
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
}

interface OrchestratorChatProps {
  tenantSlug: string;
  initialMood?: {
    key: string;
    label: string;
    emoji: string;
    sublabel: string;
  } | null;
  onResetMood?: () => void;
}

export function OrchestratorChat({
  tenantSlug,
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

          if (res.messages && res.messages.length > 0) {
            setMessages(
              res.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                agentName: m.agentName || res.agentName || "Pastor Conselheiro",
                timestamp: new Date(m.timestamp),
              }))
            );
          } else {
            // Conversa sem histórico anterior: exibe mensagem inicial calorosa
            let initialGreeting =
              "Graça e Paz! Sou o Agente Conselheiro da sua igreja. Como posso ajudar ou orar por você hoje?";

            if (initialMood) {
              if (initialMood.key === "FELIZ") {
                initialGreeting = `Graça e Paz! Que bênção saber que você está ${initialMood.label.toLowerCase()} hoje! ${initialMood.emoji} Quer compartilhar seu testemunho ou celebrar algo que Deus fez?`;
              } else if (initialMood.key === "CANSADO") {
                initialGreeting = `Graça e Paz. Sinto que você está com o corpo ou a mente exausta hoje. ${initialMood.emoji} Jesus disse: 'Vinde a mim todos os cansados e eu vos aliviarei'. Conte-me o que está pesando no seu coração.`;
              } else if (initialMood.key === "ANSIOSO") {
                initialGreeting = `Graça e Paz. Respire fundo, você está em um lugar seguro. ${initialMood.emoji} O que tem deixado seu coração aflito ou preocupado com o amanhã? Deixe-me orar com você.`;
              } else if (initialMood.key === "TRISTE") {
                initialGreeting = `Graça e Paz, meu irmão(ã). Deus conhece cada lágrima silenciosa. ${initialMood.emoji} Estou aqui para te ouvir com todo carinho e interceder por sua vida. Desabafe comigo.`;
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
  }, [tenantSlug, initialMood]);

  // Reiniciar diálogo / Começar novo assunto arquivando o anterior
  const handleResetConversation = async () => {
    try {
      setIsProcessing(true);
      const res = await resetUserConversation(tenantSlug);
      if (res.success && res.conversationId) {
        setConversationId(res.conversationId);
        setMessages([
          {
            id: Date.now().toString(),
            role: "assistant",
            content: "Graça e Paz! Iniciamos um novo momento de oração e conversa. Como posso acolher o seu coração agora?",
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

  // Scroll automático
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
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
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
          if (res.userTranscription) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: "user",
                content: `🎤 "${res.userTranscription}"`,
                timestamp: new Date(),
              },
            ]);
          }

          if (res.agentName) setActiveAgent(res.agentName);

          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: res.textResponse!,
              agentName: res.agentName || "Pastor Conselheiro",
              timestamp: new Date(),
            },
          ]);

          // Tentar falar em áudio pelo navegador se disponível
          if (typeof window !== "undefined" && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(res.textResponse);
            utterance.lang = "pt-BR";
            window.speechSynthesis.speak(utterance);
          }
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
    <div className="flex flex-col h-[75vh] sm:h-[80vh] bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
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
                IA Ativa
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>Orquestrador Multi-Especialista</span>
              {initialMood && (
                <>
                  <span>•</span>
                  <span>Sentindo-se {initialMood.label} {initialMood.emoji}</span>
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

      {/* Área de Mensagens (Chat Scroll) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
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
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-md"
                    : "bg-muted/70 text-foreground border border-border/60 rounded-tl-none"
                }`}
              >
                {!isUser && msg.agentName && (
                  <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">
                    {msg.agentName}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
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
              <span>Ouvindo seu coração e consultando a Palavra...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Barra de Apoio Pastoral Rápida */}
      <div className="px-4 py-2 bg-muted/20 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <HeartHandshake className="w-3.5 h-3.5 text-primary" />
          <span>Deseja conversar diretamente com um pastor?</span>
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
              placeholder={isRecording ? "Gravando seu áudio..." : "Escreva seu desabafo ou dúvida..."}
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
