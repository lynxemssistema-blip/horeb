"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  BookOpen,
  Palette,
  Award,
  Copy,
  Printer,
  Download,
  Loader2,
  Check,
  Wand2,
  Languages,
  Quote,
  Calendar,
  Clock,
  MapPin,
  User,
  CreditCard,
  FileText,
  Layers,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateSermonOutlineAction,
  GeneratedSermonOutline,
} from "@/app/actions/personal-tools";
import { MemberDigitalCard } from "@/components/member-digital-card";
import { OfficialDocumentViewer } from "@/components/official-document-viewer";

// ============================================================================
// 1. ESTÚDIO COPILOTO IA PARA SERMÕES & ESBOÇOS (/ia-sermoes)
// ============================================================================
interface SermonAiCopilotModalProps {
  churchName?: string;
  preacherDefaultName?: string;
  triggerButton?: React.ReactNode;
}

export function SermonAiCopilotModal({
  churchName = "Igreja Sede Horeb",
  preacherDefaultName = "Pr. Luan Demattos",
  triggerButton,
}: SermonAiCopilotModalProps) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("Libertação Espiritual e Autoridade em Cristo");
  const [bibleText, setBibleText] = useState("Efésios 6:10-18");
  const [sermonType, setSermonType] = useState<"EXPOSITIVO" | "TEMATICO" | "TEXTUAL" | "DEVOCIONAL">("EXPOSITIVO");
  const [preacherName, setPreacherName] = useState(preacherDefaultName);
  const [isGenerating, setIsGenerating] = useState(false);
  const [outline, setOutline] = useState<GeneratedSermonOutline | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!topic.trim()) {
      toast.error("Informe o tema ou título da mensagem.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateSermonOutlineAction({
        topic,
        bibleText,
        sermonType,
        preacherName,
      });

      if (res.success && res.outline) {
        setOutline(res.outline);
        toast.success("Esboço teológico gerado com sucesso!");
      } else {
        toast.error(res.error || "Não foi possível gerar o esboço.");
      }
    } catch {
      toast.error("Erro ao consultar o Copiloto Teológico.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyOutline = () => {
    if (!outline) return;
    const text = [
      `📖 ESBOÇO DE MENSAGEM — ${outline.title.toUpperCase()}`,
      `Ministro: ${outline.preacherName} | Texto Base: ${outline.baseScripture} | Estilo: ${outline.sermonType}`,
      ``,
      `1. INTRODUÇÃO:`,
      outline.introduction,
      ``,
      `2. CHAVES EXEGÉTICAS (HEBRAICO / GREGO):`,
      ...outline.originalTerms.map(
        (t) => `- ${t.term} (${t.language} - ${t.transliteration}): ${t.meaning}`
      ),
      ``,
      `3. DESENVOLVIMENTO DOS TÓPICOS:`,
      ...outline.points.map(
        (p) =>
          `${p.number}. ${p.heading}\n${p.explanation}\nReferências: ${p.crossReferences.join(", ")}\nAplicação: ${p.practicalApplication}\n`
      ),
      `4. ILUSTRAÇÃO PASTORAL:`,
      outline.illustration,
      ``,
      `5. CONCLUSÃO E APELO:`,
      outline.conclusionAndAppeal,
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Esboço completo copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (triggerButton as React.ReactElement) || (
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs h-10 px-4 rounded-xl gap-2 cursor-pointer">
              <Sparkles className="w-4 h-4" />
              <span>Abrir Copiloto de Sermões</span>
            </Button>
          )
        }
      />

      <DialogContent className="w-[95vw] max-w-4xl max-h-[92dvh] overflow-y-auto p-0 rounded-3xl bg-zinc-950 border border-amber-500/40 text-white shadow-2xl">
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Copiloto Teológico IA • Pr. & Líderes</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Copiloto IA para Sermões & Esboços
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Estruturação homilética com exegese em Hebraico/Grego, referências cruzadas e aplicação prática para o púlpito.
            </DialogDescription>
          </div>

          <div className="text-xs font-bold text-zinc-400 bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-white/10 self-start sm:self-auto">
            Congregação: <strong className="text-amber-400">{churchName}</strong>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Formulário Gerador */}
          <form onSubmit={handleGenerate} className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Tema ou Assunto da Mensagem</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Os Seis Instintos da Alma, Batalha Invisível..."
                  className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Texto Bíblico Base</Label>
                <Input
                  value={bibleText}
                  onChange={(e) => setBibleText(e.target.value)}
                  placeholder="Ex: Efésios 6:10-18"
                  className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Preletor / Ministro</Label>
                <Input
                  value={preacherName}
                  onChange={(e) => setPreacherName(e.target.value)}
                  placeholder="Ex: Pr. Luan Demattos"
                  className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-zinc-400 mr-1">Estilo Homilético:</span>
                {(["EXPOSITIVO", "TEMATICO", "TEXTUAL", "DEVOCIONAL"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSermonType(type)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
                      sermonType === type
                        ? "bg-amber-500 text-black border-amber-400 shadow-md"
                        : "bg-zinc-950 text-zinc-400 border-white/10 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <Button
                type="submit"
                disabled={isGenerating}
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-black font-black text-xs hover:brightness-110 shadow-lg cursor-pointer gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Estruturando Esboço...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Gerar Esboço Completo com IA</span>
                  </>
                )}
              </Button>
            </div>

            {/* Sugestões Rápidas do Pr. Luan Demattos */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/5 text-[11px]">
              <span className="text-zinc-500 font-bold">Temas sugeridos:</span>
              {[
                { t: "Libertação Espiritual e Ordem na Alma", b: "2 Coríntios 10:4-5" },
                { t: "Os Seis Instintos da Alma e Santidade", b: "1 Tessalonicenses 5:23" },
                { t: "Batalha Invisível nas Regiões Celestiais", b: "Efésios 6:12" },
                { t: "Avivamento e Altar Restaurado", b: "1 Reis 18:30-39" },
              ].map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setTopic(sug.t);
                    setBibleText(sug.b);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-amber-500/15 text-zinc-300 hover:text-amber-300 border border-white/10 transition-colors cursor-pointer"
                >
                  {sug.t}
                </button>
              ))}
            </div>
          </form>

          {/* Resultado do Esboço */}
          {outline && (
            <div className="space-y-5 p-5 sm:p-6 rounded-3xl bg-zinc-900/90 border border-amber-500/30 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {outline.sermonType}
                    </span>
                    <span className="text-xs font-bold text-zinc-400">
                      Texto Base: <strong className="text-white">{outline.baseScripture}</strong>
                    </span>
                    <span className="text-xs font-bold text-zinc-400">
                      • Ministro: <strong className="text-amber-400">{outline.preacherName}</strong>
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                    {outline.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyOutline}
                    className="h-9 px-3 rounded-xl border-white/15 bg-zinc-950 text-xs font-bold text-zinc-200 hover:text-white gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copiado!" : "Copiar Esboço"}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => window.print()}
                    className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Púlpito</span>
                  </Button>
                </div>
              </div>

              {/* Introdução */}
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/10 space-y-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Introdução & Contexto Bíblico</span>
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {outline.introduction}
                </p>
              </div>

              {/* Dicionário Exegético Hebraico / Grego */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5" />
                  <span>Chaves Exegéticas no Original (Hebraico & Grego)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {outline.originalTerms.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-zinc-950 border border-pink-500/25 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white">
                          {item.term}{" "}
                          <span className="text-xs font-mono text-pink-400">
                            ({item.transliteration})
                          </span>
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300">
                          {item.language}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{item.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tópicos Principais */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  Desenvolvimento Homilético dos Tópicos
                </span>
                {outline.points.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-zinc-950/90 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-white">
                        <span className="text-amber-400 mr-1.5">{pt.number}.</span>
                        {pt.heading}
                      </h4>
                      <div className="flex items-center gap-1 flex-wrap">
                        {pt.crossReferences.map((ref, rIdx) => (
                          <span
                            key={rIdx}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.06] text-amber-300 border border-white/10"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{pt.explanation}</p>
                    <div className="pt-1 text-[11px] text-emerald-300 font-semibold">
                      ✓ Aplicação Prática: <span className="text-zinc-300 font-normal">{pt.practicalApplication}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ilustração e Apelo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                    <Quote className="w-3.5 h-3.5" />
                    <span>Ilustração para o Púlpito</span>
                  </span>
                  <p className="text-xs text-zinc-200 leading-relaxed italic">
                    &ldquo;{outline.illustration}&rdquo;
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    Conclusão & Chamada ao Altar
                  </span>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    {outline.conclusionAndAppeal}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. ESTÚDIO DESIGNER DE BANNERS & CULTOS (/banner-designer)
// ============================================================================
interface BannerDesignerStudioModalProps {
  churchName?: string;
  preacherDefaultName?: string;
  triggerButton?: React.ReactNode;
}

const BANNER_THEMES = [
  {
    id: "fire-gold",
    name: "Noite de Poder & Glória",
    bgGradient: "linear-gradient(135deg, #1a0b05 0%, #431407 45%, #7c2d12 100%)",
    canvasColors: ["#090504", "#431407", "#9a3412"],
    accentColor: "#f59e0b",
    badgeText: "CULTO ESPECIAL",
  },
  {
    id: "royal-blue",
    name: "Culto da Família & Aliança",
    bgGradient: "linear-gradient(135deg, #020617 0%, #1e1b4b 50%, #1d4ed8 100%)",
    canvasColors: ["#020617", "#1e1b4b", "#1d4ed8"],
    accentColor: "#38bdf8",
    badgeText: "DOMINGO DA FAMÍLIA",
  },
  {
    id: "crimson-communion",
    name: "Santa Ceia do Senhor",
    bgGradient: "linear-gradient(135deg, #180409 0%, #4c0519 50%, #881337 100%)",
    canvasColors: ["#180409", "#4c0519", "#881337"],
    accentColor: "#fb7185",
    badgeText: "SANTA CEIA MEMORIAL",
  },
  {
    id: "emerald-revival",
    name: "Conferência de Avivamento",
    bgGradient: "linear-gradient(135deg, #02140d 0%, #064e3b 50%, #047857 100%)",
    canvasColors: ["#02140d", "#064e3b", "#047857"],
    accentColor: "#34d399",
    badgeText: "CONFERÊNCIA PROFÉTICA",
  },
  {
    id: "purple-teaching",
    name: "Quinta do Ensino & Palavra",
    bgGradient: "linear-gradient(135deg, #0f051d 0%, #3b0764 50%, #6b21a8 100%)",
    canvasColors: ["#0f051d", "#3b0764", "#6b21a8"],
    accentColor: "#c084fc",
    badgeText: "ESTUDO BÍBLICO",
  },
];

export function BannerDesignerStudioModal({
  churchName = "Igreja Sede Horeb",
  preacherDefaultName = "Pr. Luan Demattos",
  triggerButton,
}: BannerDesignerStudioModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(BANNER_THEMES[0]);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "9:16">("4:5");
  const [badge, setBadge] = useState("CULTO DE LIBERTAÇÃO & PODER");
  const [title, setTitle] = useState("NOITE DE RESTAURAÇÃO E VITÓRIA");
  const [subtitle, setSubtitle] = useState("Traga sua família para um tempo poderoso na presença de Deus");
  const [preacher, setPreacher] = useState(preacherDefaultName);
  const [dateTime, setDateTime] = useState("Domingo às 19h00");
  const [location, setLocation] = useState(churchName);
  const [isExporting, setIsExporting] = useState(false);

  // Exportar arte em alta resolução via HTML5 Canvas
  const handleDownloadBanner = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement("canvas");
      const width = 1080;
      const height = aspectRatio === "1:1" ? 1080 : aspectRatio === "4:5" ? 1350 : 1920;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas não suportado");

      // Fundo Gradiente Cinematográfico
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, selectedTheme.canvasColors[0]);
      grad.addColorStop(0.5, selectedTheme.canvasColors[1]);
      grad.addColorStop(1, selectedTheme.canvasColors[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Glow central de iluminação
      const radial = ctx.createRadialGradient(
        width / 2,
        height * 0.35,
        40,
        width / 2,
        height * 0.35,
        width * 0.7
      );
      radial.addColorStop(0, `${selectedTheme.accentColor}44`);
      radial.addColorStop(1, "transparent");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);

      // Moldura fina elegante
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, width - 96, height - 96);

      ctx.textAlign = "center";

      // Nome da Igreja no topo
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 30px sans-serif";
      ctx.fillText(location.toUpperCase(), width / 2, 130);

      // Badge Superior
      ctx.fillStyle = selectedTheme.accentColor;
      ctx.font = "900 28px sans-serif";
      ctx.fillText(`★ ${badge.toUpperCase()} ★`, width / 2, height * 0.25);

      // Título Principal (com quebra de linhas automática)
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 76px sans-serif";
      const words = title.toUpperCase().split(" ");
      let line = "";
      const lines: string[] = [];
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > width - 180) {
          lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);

      let yTitle = height * 0.36;
      for (const l of lines.slice(0, 4)) {
        ctx.fillText(l, width / 2, yTitle);
        yTitle += 88;
      }

      // Subtítulo
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "500 34px sans-serif";
      ctx.fillText(subtitle.slice(0, 65), width / 2, yTitle + 25);

      // Bloco do Preletor
      const boxY = height * 0.68;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(width * 0.15, boxY, width * 0.7, 150);
      ctx.strokeStyle = selectedTheme.accentColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(width * 0.15, boxY, width * 0.7, 150);

      ctx.fillStyle = selectedTheme.accentColor;
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("MINISTRAÇÃO DA PALAVRA", width / 2, boxY + 50);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 46px sans-serif";
      ctx.fillText(preacher, width / 2, boxY + 112);

      // Data, Horário e Rodapé
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px sans-serif";
      ctx.fillText(`📅 ${dateTime}`, width / 2, height - 150);

      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "26px sans-serif";
      ctx.fillText(`📍 ${location}`, width / 2, height - 95);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `banner-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Banner exportado em Alta Definição (PNG)!");
    } catch (err) {
      toast.error("Erro ao exportar imagem do banner.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (triggerButton as React.ReactElement) || (
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-xs h-10 px-4 rounded-xl gap-2 cursor-pointer">
              <Palette className="w-4 h-4" />
              <span>Abrir Designer de Banners</span>
            </Button>
          )
        }
      />

      <DialogContent className="w-[95vw] max-w-5xl max-h-[92dvh] overflow-y-auto p-0 rounded-3xl bg-zinc-950 border border-pink-500/40 text-white shadow-2xl">
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-transparent flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-black uppercase">
              <Palette className="w-3 h-3" />
              <span>Estúdio Gráfico Eclesial • Alta Resolução</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Designer de Banners & Cultos
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Crie cartazes de cultos, conferências e agendas semanais prontos para Instagram e WhatsApp.
            </DialogDescription>
          </div>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Painel de Edição (Esquerda) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">1. Escolha o Tema Visual</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BANNER_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setSelectedTheme(theme);
                      setBadge(theme.badgeText);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      selectedTheme.id === theme.id
                        ? "border-pink-500 bg-pink-500/15 text-white"
                        : "border-white/10 bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-lg shrink-0 border border-white/20"
                      style={{ background: theme.bgGradient }}
                    />
                    <span className="text-xs font-bold truncate">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">2. Formato da Arte</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "1:1", label: "1:1 Feed Quadrado" },
                  { id: "4:5", label: "4:5 Retrato Insta" },
                  { id: "9:16", label: "9:16 Stories / Status" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setAspectRatio(fmt.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      aspectRatio === fmt.id
                        ? "bg-pink-500 text-white border-pink-400"
                        : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white"
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Selo Superior</Label>
                <Input
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="bg-zinc-900 border-white/15 text-white h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Preletor / Ministro</Label>
                <Input
                  value={preacher}
                  onChange={(e) => setPreacher(e.target.value)}
                  className="bg-zinc-900 border-white/15 text-white h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-300">Título Principal do Culto / Evento</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-zinc-900 border-white/15 text-white h-10 rounded-xl text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-300">Subtítulo / Chamada</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="bg-zinc-900 border-white/15 text-white h-9 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Data e Horário</Label>
                <Input
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="bg-zinc-900 border-white/15 text-white h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-300">Igreja / Local</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-zinc-900 border-white/15 text-white h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleDownloadBanner}
              disabled={isExporting}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-black text-xs sm:text-sm shadow-xl gap-2 cursor-pointer"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Baixar Arte em Alta Resolução (PNG {aspectRatio})</span>
            </Button>
          </div>

          {/* Preview em Tempo Real (Direita) */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            <div
              className="w-full max-w-[360px] rounded-3xl p-6 flex flex-col justify-between text-center relative overflow-hidden shadow-2xl border border-white/20 transition-all"
              style={{
                background: selectedTheme.bgGradient,
                aspectRatio:
                  aspectRatio === "1:1" ? "1 / 1" : aspectRatio === "4:5" ? "4 / 5" : "9 / 16",
              }}
            >
              <div className="text-[10px] font-black uppercase tracking-widest text-white/80">
                {location}
              </div>

              <div className="my-auto space-y-3 py-4">
                <span
                  className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                  style={{
                    color: selectedTheme.accentColor,
                    borderColor: `${selectedTheme.accentColor}60`,
                    backgroundColor: "rgba(0,0,0,0.35)",
                  }}
                >
                  ★ {badge} ★
                </span>

                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-none drop-shadow-md">
                  {title}
                </h2>

                <p className="text-xs text-white/80 max-w-xs mx-auto leading-relaxed">
                  {subtitle}
                </p>

                <div
                  className="p-3 rounded-2xl bg-black/45 border mx-auto max-w-[260px]"
                  style={{ borderColor: `${selectedTheme.accentColor}60` }}
                >
                  <span
                    className="text-[9px] font-black uppercase tracking-widest block"
                    style={{ color: selectedTheme.accentColor }}
                  >
                    Ministração
                  </span>
                  <span className="text-sm font-black text-white">{preacher}</span>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-white/15 text-xs">
                <div className="font-black text-white">{dateTime}</div>
                <div className="text-[10px] text-white/70">{location}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 3. ESTÚDIO CERTIFICADOS & CARTEIRINHAS DIGITAIS (/certificados-digitais)
// ============================================================================
interface CertificatesAndCardsStudioModalProps {
  churchName?: string;
  churchSlug?: string;
  pastorDefaultName?: string;
  userName?: string;
  userEmail?: string;
  triggerButton?: React.ReactNode;
}

export function CertificatesAndCardsStudioModal({
  churchName = "Igreja Sede Horeb",
  churchSlug = "sede",
  pastorDefaultName = "Pr. Luan Demattos",
  userName = "Pr. Luan Demattos",
  userEmail = "contato@horeb.lynxems.com.br",
  triggerButton,
}: CertificatesAndCardsStudioModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"certificate" | "card">("certificate");

  // Estados do Certificado
  const [docType, setDocType] = useState<"BAPTISM_CERTIFICATE" | "CHILD_PRESENTATION" | "RECOMMENDATION_LETTER">("BAPTISM_CERTIFICATE");
  const [recipientName, setRecipientName] = useState("João Pedro da Silva");
  const [recipientCpf, setRecipientCpf] = useState("123.456.789-00");
  const [pastorName, setPastorName] = useState(pastorDefaultName);
  const [customChurchName, setCustomChurchName] = useState(churchName);

  // Estados da Carteirinha 3D
  const [cardHolderName, setCardHolderName] = useState(userName);
  const [cardRoleTitle, setCardRoleTitle] = useState("Pr. Presidente");
  const [cardCode, setCardCode] = useState("HRB-2026-0001");

  const docTitles: Record<string, string> = {
    BAPTISM_CERTIFICATE: "Certificado Oficial de Batismo nas Águas",
    CHILD_PRESENTATION: "Certificado de Apresentação de Criança ao Senhor",
    RECOMMENDATION_LETTER: "Carta Oficial de Recomendação Eclesiástica",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (triggerButton as React.ReactElement) || (
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-black text-xs h-10 px-4 rounded-xl gap-2 cursor-pointer">
              <Award className="w-4 h-4" />
              <span>Abrir Certificados & Carteirinha</span>
            </Button>
          )
        }
      />

      <DialogContent className="w-[95vw] max-w-5xl max-h-[92dvh] overflow-y-auto p-0 rounded-3xl bg-zinc-950 border border-emerald-500/40 text-white shadow-2xl">
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase">
              <Award className="w-3 h-3" />
              <span>Secretaria Eclesiástica VIP • QR Code Oficial</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-white mt-0.5">
              Certificados & Carteirinhas Digitais 3D
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Emita certificados prontos para impressão e credenciais digitais com QR Code de validação.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("certificate")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "certificate"
                  ? "bg-emerald-500 text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              📜 Certificados Oficiais
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("card")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "card"
                  ? "bg-emerald-500 text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              🪪 Carteirinha 3D QR Code
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {activeTab === "certificate" ? (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Modelo de Documento</Label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-white/15 text-white h-10 px-2.5 rounded-xl text-xs"
                  >
                    <option value="BAPTISM_CERTIFICATE">Certificado de Batismo</option>
                    <option value="CHILD_PRESENTATION">Apresentação de Criança</option>
                    <option value="RECOMMENDATION_LETTER">Carta de Recomendação</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Nome do Membro / Batizando</Label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Pr. Presidente / Ministro</Label>
                  <Input
                    value={pastorName}
                    onChange={(e) => setPastorName(e.target.value)}
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Nome da Congregação</Label>
                  <Input
                    value={customChurchName}
                    onChange={(e) => setCustomChurchName(e.target.value)}
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              <OfficialDocumentViewer
                document={{
                  id: "preview-cert",
                  documentNumber: "CERT-2026-001",
                  type: docType,
                  title: docTitles[docType],
                  recipientName,
                  recipientCpf,
                  issuedAt: new Date(),
                  details: JSON.stringify({
                    officiantPastor: pastorName,
                  }),
                }}
                church={{
                  name: customChurchName,
                  slug: churchSlug,
                  pastorName,
                  city: "Brasil",
                  state: "BR",
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-zinc-900/80 border border-white/10">
                <h4 className="text-sm font-black text-white">
                  Personalizar Credencial Digital 3D
                </h4>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Nome Completo na Credencial</Label>
                  <Input
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Cargo / Título Ministerial</Label>
                  <Input
                    value={cardRoleTitle}
                    onChange={(e) => setCardRoleTitle(e.target.value)}
                    placeholder="Ex: Pr. Presidente, Obreiro, Diácono..."
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Nome da Congregação</Label>
                  <Input
                    value={customChurchName}
                    onChange={(e) => setCustomChurchName(e.target.value)}
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Pr. Responsável (Verso da Carteirinha)</Label>
                  <Input
                    value={pastorName}
                    onChange={(e) => setPastorName(e.target.value)}
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-300">Código de Registro</Label>
                  <Input
                    value={cardCode}
                    onChange={(e) => setCardCode(e.target.value)}
                    className="bg-zinc-950 border-white/15 text-white h-10 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="lg:col-span-7 flex justify-center">
                <MemberDigitalCard
                  user={{
                    id: "card-preview",
                    name: cardHolderName,
                    email: userEmail,
                    role: "PASTOR",
                    pastoralTitle: cardRoleTitle,
                    cpf: recipientCpf,
                    createdAt: new Date(),
                    tenant: {
                      name: customChurchName,
                      slug: churchSlug,
                      primaryColor: "#10b981",
                      pastorName,
                    },
                  }}
                  credentialCode={cardCode}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

