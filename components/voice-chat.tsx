"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Volume2, ShieldCheck, Settings2, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { processVoiceMessage } from "@/app/actions/chat";

export function VoiceChat({ tenantId }: { tenantId: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [userTranscription, setUserTranscription] = useState<string | null>(null);
  
  // Voice Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Carregar vozes do navegador
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      // Filtrar apenas vozes em português para facilitar, ou deixar todas
      const ptVoices = available.filter(v => v.lang.startsWith('pt') || v.lang.startsWith('en')); // Algumas pessoas gostam das vozes em inglês lendo PT com sotaque
      setVoices(ptVoices.length > 0 ? ptVoices : available);
      
      const savedURI = localStorage.getItem("voice_preference_uri");
      if (savedURI && available.some(v => v.voiceURI === savedURI)) {
        setSelectedVoiceURI(savedURI);
      } else {
        const defaultVoice = ptVoices.find(v => v.name.includes("Google") && v.lang.includes("pt")) || ptVoices[0];
        if (defaultVoice) setSelectedVoiceURI(defaultVoice.voiceURI);
      }
      
      const savedRate = localStorage.getItem("voice_preference_rate");
      if (savedRate) setSpeechRate(parseFloat(savedRate));
    };
    
    // O Chrome/Safari carregam as vozes de forma assíncrona
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const saveSettings = (uri: string, rate: number) => {
    setSelectedVoiceURI(uri);
    setSpeechRate(rate);
    localStorage.setItem("voice_preference_uri", uri);
    localStorage.setItem("voice_preference_rate", rate.toString());
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleAudioSubmission(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      toast.error("Permita o acesso ao microfone para usar o chat de voz.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioSubmission = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const formData = new FormData();
        formData.append("audio", base64String);
        formData.append("tenantId", tenantId);

        const res = await processVoiceMessage(formData);
        
        if (res.success && res.textResponse) {
          setAiResponse(res.textResponse);
          setAgentName(res.agentName || "Conselheiro Horeb");
          setUserTranscription(res.userTranscription || "");
          playAiResponse(res.textResponse);
        } else {
          toast.error(res.error || "Erro ao processar o áudio.");
        }
        setIsProcessing(false);
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão com o conselheiro.");
      setIsProcessing(false);
    }
  };

  const playAiResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Para qualquer fala atual
      const utterance = new SpeechSynthesisUtterance(text);
      
      const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = speechRate;
      utterance.pitch = 1.0;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <span>Fale com seu Conselheiro</span>
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Aperte para gravar seu desabafo e ouça a resposta.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="w-4 h-4" />
          </Button>
          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Seguro</span>
          </span>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm mb-4 space-y-4 relative">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Ajustes de Voz</h4>
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setShowSettings(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground">Voz do Conselheiro</label>
                <select 
                  className="w-full text-xs rounded-lg border border-border/50 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                  value={selectedVoiceURI}
                  onChange={(e) => saveSettings(e.target.value, speechRate)}
                >
                  {voices.map(voice => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                  {voices.length === 0 && <option>Carregando vozes do sistema...</option>}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] font-semibold text-muted-foreground">
                  <label>Velocidade da Fala</label>
                  <span>{speechRate.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" max="2" step="0.1" 
                  className="w-full accent-primary"
                  value={speechRate}
                  onChange={(e) => saveSettings(selectedVoiceURI, parseFloat(e.target.value))}
                />
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-8 gap-2"
                onClick={() => playAiResponse("Olá, a paz do Senhor! Como posso ajudar você hoje?")}
              >
                <Play className="w-3 h-3 text-primary" /> Testar Voz
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card border border-border/60 p-4 rounded-2xl flex flex-col items-center justify-center space-y-4">
        
        {/* Botão de Gravação */}
        <div className="relative">
          {isRecording && (
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 rounded-full bg-red-500/30"
            />
          )}
          <Button
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-16 h-16 rounded-full shadow-lg transition-all z-10 relative ${
              isRecording 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isRecording ? (
              <Square className="w-6 h-6 fill-current" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
        </div>
        
        <p className="text-xs font-medium text-muted-foreground">
          {isProcessing ? "O conselheiro está ouvindo e pensando..." : 
           isRecording ? "Gravando... Aperte para parar e enviar." : 
           "Toque para falar"}
        </p>

      </div>

      <AnimatePresence>
        {aiResponse && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* O que o usuário disse */}
            {userTranscription && (
              <div className="flex justify-end">
                <div className="bg-white/[0.04] border border-white/[0.08] p-3 rounded-2xl rounded-tr-sm max-w-[85%]">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Você</span>
                  <p className="text-xs text-zinc-300 italic">"{userTranscription}"</p>
                </div>
              </div>
            )}

            {/* Resposta do Agente */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Volume2 className="w-4 h-4" /> {agentName}
                </span>
                <Button variant="ghost" size="sm" onClick={() => playAiResponse(aiResponse)} className="h-6 text-[10px] px-2 rounded-full bg-white/[0.05] border border-white/[0.1] text-zinc-300 hover:text-white">
                  Ouvir Novamente
                </Button>
              </div>
              <p className="text-sm text-zinc-100 leading-relaxed">
                {aiResponse}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
