"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BookOpen,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Download,
  FileText,
  ShieldCheck,
  RefreshCw,
  Crown,
  CreditCard,
  ArrowLeft,
  Share2,
  Award,
  User,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  purchaseEbookAction,
  checkEbookOrderStatusAction,
} from "@/app/actions/ebooks";

interface EbookProductLandingProps {
  ebook: any;
  initialOrder?: any | null;
  isSuperAdmin?: boolean;
}

export function EbookProductLanding({
  ebook,
  initialOrder = null,
  isSuperAdmin = false,
}: EbookProductLandingProps) {
  const [buyerName, setBuyerName] = useState(initialOrder?.buyerName || "");
  const [buyerEmail, setBuyerEmail] = useState(initialOrder?.buyerEmail || "");
  const [buyerCpf, setBuyerCpf] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [billingType, setBillingType] = useState<"UNDEFINED" | "CREDIT_CARD" | "PIX">("UNDEFINED");

  const [activeOrder, setActiveOrder] = useState<any | null>(initialOrder);
  const [isPaid, setIsPaid] = useState(
    initialOrder?.status === "RECEIVED" || initialOrder?.status === "CONFIRMED"
  );
  const [unlockedPdfUrl, setUnlockedPdfUrl] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedPageUrl, setCopiedPageUrl] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Polling automático a cada 6 segundos se houver uma cobrança ativa aguardando pagamento
  useEffect(() => {
    if (!activeOrder?.id || isPaid) return;

    const timer = setInterval(async () => {
      try {
        const res = await checkEbookOrderStatusAction(activeOrder.id);
        if (res.success && res.isPaid) {
          setIsPaid(true);
          if (res.pdfUrl) setUnlockedPdfUrl(res.pdfUrl);
          toast.success(
            "Pagamento confirmado! Seu E-book em PDF já está liberado para download e na fatura do Asaas!"
          );
          clearInterval(timer);
        }
      } catch {}
    }, 6000);

    return () => clearInterval(timer);
  }, [activeOrder?.id, isPaid]);

  // Se entrou com orderId já pago, busca o PDF desbloqueado imediatamente
  useEffect(() => {
    if (activeOrder?.id && isPaid && !unlockedPdfUrl) {
      checkEbookOrderStatusAction(activeOrder.id).then((res) => {
        if (res.success && res.pdfUrl) {
          setUnlockedPdfUrl(res.pdfUrl);
        }
      });
    }
  }, [activeOrder?.id, isPaid, unlockedPdfUrl]);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const res = await purchaseEbookAction({
        ebookId: ebook.id,
        buyerName,
        buyerEmail,
        buyerCpf,
        buyerPhone,
        billingType,
      });

      if (res.success && res.order) {
        setActiveOrder(res.order);
        toast.success(
          "Cobrança gerada no Asaas com o PDF anexado! Assim que o pagamento for confirmado, o Asaas libera o PDF automaticamente."
        );
      } else {
        toast.error(res.error || "Não foi possível gerar a cobrança.");
      }
    });
  };

  const handleManualCheckStatus = async () => {
    if (!activeOrder?.id) return;
    setCheckingPayment(true);
    try {
      const res = await checkEbookOrderStatusAction(activeOrder.id);
      if (res.success && res.isPaid) {
        setIsPaid(true);
        if (res.pdfUrl) setUnlockedPdfUrl(res.pdfUrl);
        toast.success("Pagamento confirmado! Seu PDF foi liberado!");
      } else {
        toast.info(
          "Ainda aguardando confirmação bancária no Asaas. Se acabou de pagar via PIX, aguarde alguns segundos."
        );
      }
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleCopyPix = () => {
    if (!activeOrder?.pixQrCode) return;
    navigator.clipboard.writeText(activeOrder.pixQrCode);
    setCopiedPix(true);
    toast.success("Código PIX Copia-e-Cola copiado!");
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleCopyPageLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedPageUrl(true);
    toast.success("Link exclusivo de venda copiado!");
    setTimeout(() => setCopiedPageUrl(false), 3000);
  };

  const discountPercent =
    ebook.originalPrice && ebook.originalPrice > ebook.price
      ? Math.round(((ebook.originalPrice - ebook.price) / ebook.originalPrice) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-black/80 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/#ebooks"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-300 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Voltar para a Vitrine Horeb</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyPageLink}
              className="h-9 px-3.5 rounded-xl border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-zinc-200 gap-1.5 cursor-pointer"
            >
              {copiedPageUrl ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{copiedPageUrl ? "Link Copiado!" : "Copiar Link de Venda"}</span>
            </Button>

            {isSuperAdmin && (
              <Link href="/admin?tab=ebooks">
                <Button
                  size="sm"
                  className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs gap-1.5 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Disparar no Super Admin</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Coluna Esquerda (7 cols): Apresentação do Produto */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-black uppercase tracking-wider">
                {ebook.category || "E-BOOK OFICIAL HOREB"}
              </span>
              {ebook.badge && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  {ebook.badge}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-black uppercase tracking-wider">
                  {discountPercent}% OFF HOJE
                </span>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.1]">
                {ebook.title}
              </h1>
              {ebook.subtitle && (
                <p className="text-base sm:text-xl text-zinc-300 font-medium leading-relaxed">
                  {ebook.subtitle}
                </p>
              )}
            </div>

            {/* Card da Capa + Metadados */}
            <div className="rounded-3xl bg-zinc-900/70 border border-white/[0.08] overflow-hidden shadow-2xl">
              <div className="relative h-80 sm:h-96 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center overflow-hidden border-b border-white/[0.06]">
                {ebook.coverUrl ? (
                  <>
                    <img
                      src={ebook.coverUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-35"
                    />
                    <img
                      src={ebook.coverUrl}
                      alt={ebook.title}
                      className="relative z-10 max-h-full max-w-full object-contain py-4 px-6 drop-shadow-2xl"
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-amber-400/70">
                    <BookOpen className="w-16 h-16" />
                    <span className="text-xs font-black uppercase tracking-widest">
                      E-book Digital Completo em PDF
                    </span>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 text-xs font-bold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Autor: {ebook.author}</span>
                  </span>

                  <span className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      Formato PDF {ebook.pagesCount ? `• ${ebook.pagesCount} páginas` : ""}
                    </span>
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                <div className="space-y-2">
                  <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Sobre Este Material Digital</span>
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed whitespace-pre-line">
                    {ebook.description}
                  </p>
                </div>

                {/* Garantias e Benefícios */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/[0.08]">
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Entrega pelo Asaas</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      O próprio Asaas libera o download do PDF na fatura assim que o pagamento é confirmado.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4" />
                      <span>PIX ou Cartão</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Pague com PIX Copia-e-Cola com liberação em segundos ou use Cartão/Boleto.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                    <div className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      <span>Acesso Vitalício</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Baixe o arquivo PDF completo no celular, tablet ou computador para ler quando quiser.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita (5 cols): Checkout Oficial Asaas Integrado */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="rounded-3xl bg-zinc-950 border-2 border-amber-500/40 p-6 sm:p-7 space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.12)]">
              {/* Cabeçalho de Preço */}
              <div className="pb-4 border-b border-white/10 space-y-2">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Checkout Oficial Asaas • PDF Automático</span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    {ebook.originalPrice && ebook.originalPrice > ebook.price && (
                      <span className="text-xs text-zinc-500 line-through block">
                        De R${" "}
                        {Number(ebook.originalPrice).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    )}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-zinc-400 font-bold">Por</span>
                      <span className="text-3xl sm:text-4xl font-black text-amber-400">
                        R${" "}
                        {Number(ebook.price).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                    Liberação Imediata
                  </span>
                </div>
              </div>

              {!activeOrder ? (
                <form onSubmit={handleCheckoutSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">
                      Seu Nome Completo *
                    </label>
                    <Input
                      required
                      placeholder="Digite seu nome completo"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">
                      Seu Melhor E-mail (Para receber a fatura e o PDF do Asaas) *
                    </label>
                    <Input
                      required
                      type="email"
                      placeholder="seuemail@exemplo.com"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-xs h-10"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300">
                        CPF ou CNPJ *
                      </label>
                      <Input
                        required
                        placeholder="000.000.000-00"
                        value={buyerCpf}
                        onChange={(e) => setBuyerCpf(e.target.value)}
                        className="bg-zinc-900 border-white/10 text-xs h-10"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-300">
                        WhatsApp / Celular
                      </label>
                      <Input
                        placeholder="(00) 90000-0000"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        className="bg-zinc-900 border-white/10 text-xs h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-zinc-300">
                      Escolha Como Pagar no Asaas
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setBillingType("UNDEFINED")}
                        className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                          billingType === "UNDEFINED"
                            ? "bg-amber-500/20 border-amber-500 text-amber-300"
                            : "bg-zinc-900 border-white/10 text-zinc-400"
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>PIX + Cartão + Boleto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBillingType("CREDIT_CARD")}
                        className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                          billingType === "CREDIT_CARD"
                            ? "bg-amber-500/20 border-amber-500 text-amber-300"
                            : "bg-zinc-900 border-white/10 text-zinc-400"
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Cartão de Crédito</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBillingType("PIX")}
                        className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                          billingType === "PIX"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                            : "bg-zinc-900 border-white/10 text-zinc-400"
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        <span>PIX Instantâneo</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-200 leading-relaxed">
                    📄 <strong>Entrega Automática pelo Asaas:</strong> O arquivo PDF deste E-book já vai anexado na sua cobrança do Asaas e é liberado para download imediatamente após a confirmação do pagamento!
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs sm:text-sm gap-2 shadow-xl shadow-amber-500/20 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      {isPending
                        ? "Gerando Link de Pagamento no Asaas..."
                        : `Comprar Agora • R$ ${Number(ebook.price).toLocaleString(
                            "pt-BR",
                            { minimumFractionDigits: 2 }
                          )}`}
                    </span>
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  {isPaid ? (
                    <div className="p-5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 text-center space-y-4">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-white">
                          Pagamento Confirmado!
                        </h3>
                        <p className="text-xs text-zinc-300">
                          O Asaas confirmou seu pagamento e liberou o PDF completo do seu E-book!
                        </p>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {activeOrder.invoiceUrl && (
                          <a
                            href={activeOrder.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full"
                          >
                            <Button className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs gap-2 cursor-pointer">
                              <ExternalLink className="w-4 h-4" />
                              <span>Baixar PDF na Fatura Oficial do Asaas</span>
                            </Button>
                          </a>
                        )}

                        {unlockedPdfUrl && (
                          <a
                            href={unlockedPdfUrl}
                            download={ebook.pdfFileName || "ebook-horeb.pdf"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full"
                          >
                            <Button
                              variant="outline"
                              className="w-full h-11 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs gap-2 cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                              <span>Baixar PDF Diretamente Agora</span>
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeOrder.buyerName && (
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-300">
                          Cobrança gerada para:{" "}
                          <strong className="text-white">{activeOrder.buyerName}</strong>
                        </div>
                      )}

                      {activeOrder.invoiceUrl && (
                        <a
                          href={activeOrder.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs gap-2 shadow-xl cursor-pointer">
                            <CreditCard className="w-4 h-4" />
                            <span>Pagar com Cartão de Crédito / Boleto / PIX no Asaas</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      )}

                      {activeOrder.pixQrCodeImage && (
                        <div className="flex flex-col items-center p-4 rounded-2xl bg-white text-black space-y-2">
                          <img
                            src={`data:image/png;base64,${activeOrder.pixQrCodeImage}`}
                            alt="QR Code PIX Asaas"
                            className="w-48 h-48 object-contain"
                          />
                          <span className="text-[11px] font-bold text-zinc-700">
                            Escaneie o QR Code PIX no app do seu banco
                          </span>
                        </div>
                      )}

                      {activeOrder.pixQrCode && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-zinc-400">
                            Ou copie o código PIX Copia-e-Cola:
                          </label>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={activeOrder.pixQrCode}
                              className="bg-zinc-900 border-white/10 text-[11px] font-mono"
                            />
                            <Button
                              type="button"
                              onClick={handleCopyPix}
                              className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 gap-1.5 cursor-pointer"
                            >
                              {copiedPix ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedPix ? "Copiado" : "Copiar"}</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {activeOrder.invoiceUrl && (
                        <a
                          href={activeOrder.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs gap-2 shadow-lg cursor-pointer">
                            <ExternalLink className="w-4 h-4" />
                            <span>Abrir Link Oficial de Pagamento no Asaas</span>
                          </Button>
                        </a>
                      )}

                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                        📄 <strong>PDF Anexado no Asaas:</strong> Assim que você concluir o pagamento no Asaas, o botão de download do PDF será desbloqueado na própria Fatura do Asaas e aqui nesta página!
                      </div>

                      <Button
                        type="button"
                        onClick={handleManualCheckStatus}
                        disabled={checkingPayment}
                        className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs gap-2 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${checkingPayment ? "animate-spin" : ""}`}
                        />
                        <span>
                          {checkingPayment
                            ? "Verificando no Asaas..."
                            : "Já Paguei • Liberar Meu PDF Agora"}
                        </span>
                      </Button>

                      <button
                        type="button"
                        onClick={() => setActiveOrder(null)}
                        className="w-full text-center text-[11px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer pt-1"
                      >
                        Alterar dados do comprador
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 px-4 sm:px-8 text-center text-xs text-zinc-500">
        Biblioteca Digital Oficial Horeb • Pagamento Seguro e Entrega Automática de PDF via{" "}
        <strong className="text-zinc-300">Asaas</strong> • Lynx EMS Sistemas
      </footer>
    </div>
  );
}

