"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  generatePixTransaction,
  getChurchPixConfig,
  type GeneratePixResponse,
} from "@/app/actions/finance";
import {
  HeartHandshake,
  QrCode,
  Copy,
  Check,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  Sparkles,
  RefreshCw,
  Building2,
  Lock,
  Key,
} from "lucide-react";

export default function DoarPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "matriz";

  const [amount, setAmount] = useState<string>("100");
  const [category, setCategory] = useState<string>("DIZIMO");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [checkoutData, setCheckoutData] = useState<GeneratePixResponse | null>(null);

  const [quickAmounts, setQuickAmounts] = useState<string[]>(["30", "50", "100", "200", "500"]);
  const [churchName, setChurchName] = useState<string>(
    slug === "matriz" ? "Igreja Matriz Sede" : "Igreja Filial Central"
  );
  const [pixKeyInfo, setPixKeyInfo] = useState<{ key: string; type: string } | null>(null);

  React.useEffect(() => {
    async function loadPixConfig() {
      try {
        const res = await getChurchPixConfig(slug);
        if (res.success && res.tenant) {
          setChurchName(res.tenant.name);
          if (res.tenant.pixPresetValues) {
            const parsed = res.tenant.pixPresetValues
              .split(",")
              .map((v: string) => v.trim())
              .filter(Boolean);
            if (parsed.length > 0) {
              setQuickAmounts(parsed);
              setAmount(parsed[0]);
            }
          }
          if (res.tenant.pixKey) {
            setPixKeyInfo({
              key: res.tenant.pixKey,
              type: res.tenant.pixKeyType || "CNPJ",
            });
          }
        }
      } catch (e) {
        console.error("Falha ao carregar presets de PIX:", e);
      }
    }
    loadPixConfig();
  }, [slug]);

  // Ação de Gerar PIX via Server Action
  const handleGeneratePix = async () => {
    const numAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Por favor, digite um valor válido maior que zero.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await generatePixTransaction({
        slug,
        amount: numAmount,
        category,
      });

      if (response.success) {
        setCheckoutData(response);
        toast.info("PIX gerado com sucesso!", {
          description: "Escaneie o QR Code ou use o código Copia e Cola.",
        });
      } else {
        toast.error(response.error || "Erro ao gerar PIX. Tente novamente.");
      }
    } catch (err: any) {
      toast.error("Erro inesperado na conexão com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // Copiar código PIX para a área de transferência
  const handleCopyPix = async () => {
    if (!checkoutData?.pixCopiaECola) return;

    try {
      await navigator.clipboard.writeText(checkoutData.pixCopiaECola);
      setCopied(true);
      toast.success("Código copiado! Abra o app do seu banco.", {
        description: "Cole o código na opção 'PIX Copia e Cola' do seu banco.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  };

  return (
    <div className="max-w-xl sm:max-w-2xl mx-auto space-y-4 pb-12 pt-2 px-1">
      {/* Top Header com Botão Voltar */}
      <div className="flex items-center justify-between px-1">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Início</span>
        </Link>
        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Pagamento 100% Seguro
        </span>
      </div>

      {!checkoutData ? (
        /* ========================================================================= */
        /* FASE 3: TELA DE ENTRADA DE VALOR (MOBILE-FIRST)                           */
        /* ========================================================================= */
        <Card className="border-border/80 shadow-xl overflow-hidden bg-card/95 backdrop-blur-sm">
          {/* Faixa superior com a cor primária dinâmica da igreja */}
          <div className="h-1.5 w-full bg-primary" />

          <CardHeader className="text-center pb-3 pt-6 px-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-inner">
              <HeartHandshake className="w-6 h-6 text-primary" />
            </div>

            {/* Header limpo conforme especificação */}
            <CardTitle className="text-2xl font-extrabold tracking-tight text-foreground">
              Qual valor você deseja ofertar?
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Contribua de forma rápida e segura para a obra da congregação.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pt-2">
            {/* 1. Seleção de Destino com Tabs */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block text-center">
                Destino da Contribuição
              </label>
              <Tabs
                value={category}
                onValueChange={(val) => setCategory(val as string)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 w-full h-10 bg-muted/70 p-1 rounded-xl">
                  <TabsTrigger
                    value="DIZIMO"
                    className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg transition-all"
                  >
                    Dízimo
                  </TabsTrigger>
                  <TabsTrigger
                    value="OFERTA"
                    className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg transition-all"
                  >
                    Oferta
                  </TabsTrigger>
                  <TabsTrigger
                    value="MISSOES"
                    className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg transition-all"
                  >
                    Missões
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* 2. Input Principal Centralizado e Formatado com "R$" */}
            <div className="space-y-2 text-center py-2">
              <div className="relative flex items-center justify-center max-w-[280px] mx-auto">
                <span className="text-2xl sm:text-3xl font-bold text-muted-foreground mr-1 select-none">
                  R$
                </span>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="h-16 text-4xl sm:text-5xl font-black text-center border-0 border-b-2 border-primary/40 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary text-foreground tracking-tight p-0"
                />
              </div>
            </div>

            {/* 3. Botões Rápidos (Quick Add): Flex / Grid responsivo com valores do banco */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block text-center">
                Valores Sugeridos
              </label>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {quickAmounts.map((val) => {
                  const isSelected = amount === val;
                  return (
                    <Button
                      key={val}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => setAmount(val)}
                      className={`h-11 px-4 min-w-[72px] text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      R$ {val}
                    </Button>
                  );
                })}
              </div>

              {/* Informação da Chave PIX cadastrada pela igreja */}
              {pixKeyInfo && (
                <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-center space-y-0.5 mt-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Chave PIX ({pixKeyInfo.type}):
                  </span>
                  <p className="text-xs font-mono font-bold text-foreground select-all">
                    {pixKeyInfo.key}
                  </p>
                </div>
              )}
            </div>

            {/* 4. Botão Gigante: Gerar PIX Copia e Cola */}
            <div className="pt-2">
              <Button
                type="button"
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                onClick={handleGeneratePix}
                className="w-full h-14 text-base font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] gap-2.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gerando PIX bancário...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5" />
                    <span>Gerar PIX Copia e Cola</span>
                  </>
                )}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Sem taxas adicionais • Processamento imediato
              </p>
            </div>
          </CardContent>

          <CardFooter className="py-3 px-6 bg-muted/20 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{churchName}</span>
            </span>
            <span className="text-[10px] font-semibold uppercase text-primary">
              PIX Instantâneo
            </span>
          </CardFooter>
        </Card>
      ) : (
        /* ========================================================================= */
        /* FASE 4: TELA DE CHECKOUT (O QR CODE PIX)                                 */
        /* ========================================================================= */
        <Card className="border-border/80 shadow-2xl overflow-hidden bg-card/95 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
          <div className="h-1.5 w-full bg-primary" />

          <CardHeader className="text-center pb-2 pt-6 px-6">
            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">
              Dízimos & Ofertas • {category}
            </span>

            {/* Valor em Destaque no topo conforme especificação */}
            <div className="py-1">
              <span className="text-xs text-muted-foreground block font-medium">
                Valor a ser transferido
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mt-0.5">
                R$ {Number(checkoutData.amount).toFixed(2).replace(".", ",")}
              </div>
            </div>

            <CardDescription className="text-xs text-muted-foreground mt-1">
              Destinatário:{" "}
              <strong className="text-foreground font-semibold">
                {checkoutData.churchName || churchName}
              </strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pt-2">
            {/* QR Code Renderizado com qrcode.react */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-primary/20 shadow-md max-w-[260px] mx-auto">
              <QRCodeSVG
                value={checkoutData.pixCopiaECola}
                size={210}
                level="M"
                includeMargin={true}
                className="w-full h-auto aspect-square"
              />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-2">
                Aponte a câmera do seu banco
              </span>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold max-w-xs mx-auto">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Aguardando pagamento no banco...</span>
            </div>

            {/* Botão Largo "Copiar Código PIX" com Toast Sonner */}
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleCopyPix}
                className="w-full h-13 text-sm sm:text-base font-bold rounded-xl shadow-md gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-300" />
                    <span>Código PIX Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copiar Código PIX</span>
                  </>
                )}
              </Button>

              <div className="p-2.5 rounded-lg bg-muted/60 border border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate font-mono text-[11px] pr-2">
                  {checkoutData.pixCopiaECola.slice(0, 32)}...
                </span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="text-primary font-bold text-xs shrink-0 hover:underline"
                >
                  Copiar
                </button>
              </div>
            </div>
          </CardContent>

          {/* Rodapé com botão link: Cancelar e voltar */}
          <CardFooter className="py-4 px-6 bg-muted/20 border-t border-border/50 flex flex-col items-center gap-2 text-center">
            <button
              type="button"
              onClick={() => setCheckoutData(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              ← Cancelar e voltar para escolher outro valor
            </button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
