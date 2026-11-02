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
  X,
  RefreshCw,
  Crown,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  purchaseEbookAction,
  checkEbookOrderStatusAction,
  getPublicEbooks,
} from "@/app/actions/ebooks";

interface EbooksStoreSectionProps {
  ebooks: any[];
  isSuperAdmin?: boolean;
}

export function EbooksStoreSection({
  ebooks: initialEbooks = [],
  isSuperAdmin = false,
}: EbooksStoreSectionProps) {
  const [ebooks, setEbooks] = useState<any[]>(initialEbooks);
  const [selectedEbook, setSelectedEbook] = useState<any | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerCpf, setBuyerCpf] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [billingType, setBillingType] = useState<"UNDEFINED" | "CREDIT_CARD" | "PIX">("UNDEFINED");

  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [unlockedPdfUrl, setUnlockedPdfUrl] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEbooks(initialEbooks);
  }, [initialEbooks]);

  // Busca sempre os valores mais recentes direto do banco ao montar / voltar para a aba
  useEffect(() => {
    let mounted = true;
    const syncLatestEbooks = () => {
      getPublicEbooks()
        .then((res) => {
          if (mounted && res.success && Array.isArray(res.ebooks)) {
            setEbooks(res.ebooks);
          }
        })
        .catch(() => {});
    };

    syncLatestEbooks();
    window.addEventListener("focus", syncLatestEbooks);
    return () => {
      mounted = false;
      window.removeEventListener("focus", syncLatestEbooks);
    };
  }, []);

  // Polling automático a cada 6 segundos enquanto o modal de PIX estiver aguardando pagamento
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

  if (ebooks.length === 0 && !isSuperAdmin) {
    return null;
  }

  const handleOpenCheckout = (ebook: any) => {
    setSelectedEbook(ebook);
    setActiveOrder(null);
    setIsPaid(false);
    setUnlockedPdfUrl(null);
    setCopiedPix(false);
  };

  const handleCloseCheckout = () => {
    setSelectedEbook(null);
    setActiveOrder(null);
    setIsPaid(false);
    setUnlockedPdfUrl(null);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEbook) return;

    startTransition(async () => {
      const res = await purchaseEbookAction({
        ebookId: selectedEbook.id,
        buyerName,
        buyerEmail,
        buyerCpf,
        buyerPhone,
        billingType,
      });

      if (res.success && res.order) {
        setActiveOrder(res.order);
        toast.success(
          "Cobrança gerada no Asaas! Assim que o pagamento for confirmado, o Asaas libera o PDF automaticamente."
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

  return (
    <section id="ebooks" className="space-y-8 pt-6">
      {/* Cabeçalho da Seção */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Biblioteca Digital & E-books Oficiais Horeb</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          Capacitação Ministerial &{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
            E-books Exclusivos
          </span>
        </h2>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          Adquira nossos materiais digitais com pagamento seguro via <strong>Asaas</strong> (PIX ou Cartão).{" "}
          Assim que o pagamento é confirmado, <strong>o próprio Asaas libera e entrega o arquivo PDF automaticamente</strong> para você!
        </p>

        {isSuperAdmin && (
          <div className="pt-1">
            <Link href="/admin?tab=ebooks">
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-4 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs gap-2 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Gerenciar / Cadastrar Meus E-books no Super Admin</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Estado Vazio visível apenas para o SuperAdmin */}
      {ebooks.length === 0 && isSuperAdmin ? (
        <div className="p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-zinc-900/80 to-zinc-950 border border-dashed border-amber-500/40 text-center space-y-3 max-w-2xl mx-auto">
          <BookOpen className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-base font-black text-white">
            Vitrine de E-books Pronta para Suas Publicações
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Como Super Admin, acesse a aba <strong>&ldquo;Meus E-books (Asaas)&rdquo;</strong> no painel{" "}
            <code>/admin</code> para cadastrar seus E-books em PDF com preço e capa. Eles aparecerão automaticamente aqui na página inicial para venda com entrega do PDF pelo Asaas!
          </p>
          <Link href="/admin?tab=ebooks" className="inline-block pt-1">
            <Button className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl gap-2 cursor-pointer">
              <Crown className="w-4 h-4" />
              <span>Cadastrar Meu Primeiro E-book Agora</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ebooks.map((ebook) => (
            <div
              key={ebook.id}
              className="group rounded-3xl bg-zinc-900/70 border border-white/[0.08] hover:border-amber-500/50 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xl hover:shadow-amber-500/10"
            >
              <div>
                {/* Capa */}
                <Link
                  href={`/ebooks/${ebook.id}`}
                  className="relative h-72 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center overflow-hidden border-b border-white/[0.06] block"
                >
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
                        className="relative z-10 max-h-full max-w-full object-contain py-3 px-4 drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-amber-400/70">
                      <BookOpen className="w-14 h-14" />
                      <span className="text-xs font-black uppercase tracking-wider">
                        E-book Oficial (PDF)
                      </span>
                    </div>
                  )}

                  {ebook.badge && (
                    <span className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider shadow-lg">
                      {ebook.badge}
                    </span>
                  )}

                  <span className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-emerald-300 font-bold text-[10px] flex items-center gap-1 shadow-lg">
                    <FileText className="w-3 h-3" />
                    PDF Digital • Entrega Asaas
                  </span>
                </Link>

                {/* Conteúdo */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                    <span>{ebook.category}</span>
                    {ebook.pagesCount && <span>{ebook.pagesCount} páginas</span>}
                  </div>

                  <Link href={`/ebooks/${ebook.id}`}>
                    <h3 className="text-lg font-black text-white leading-snug group-hover:text-amber-400 transition-colors">
                      {ebook.title}
                    </h3>
                  </Link>

                  {ebook.subtitle && (
                    <p className="text-xs text-zinc-300 font-medium">{ebook.subtitle}</p>
                  )}

                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                    {ebook.description}
                  </p>

                  <div className="text-[11px] text-zinc-500 pt-1">
                    Autor: <strong className="text-zinc-300">{ebook.author}</strong>
                  </div>
                </div>
              </div>

              {/* Rodapé de Preço e Botão Comprar */}
              <div className="p-6 pt-0">
                <div className="pt-4 border-t border-white/[0.06] space-y-3.5">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      {ebook.originalPrice && ebook.originalPrice > ebook.price && (
                        <span className="text-xs text-zinc-500 line-through block">
                          De R${" "}
                          {Number(ebook.originalPrice).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400 block">Por apenas</span>
                      <span className="text-2xl font-black text-amber-400 leading-none">
                        R${" "}
                        {Number(ebook.price).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      PIX • Cartão • Boleto
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-2.5">
                    <Link href={`/ebooks/${ebook.id}`} className="col-span-5">
                      <Button
                        variant="outline"
                        className="w-full h-11 px-3 rounded-2xl border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 font-bold text-xs gap-1.5 justify-center cursor-pointer"
                        title="Abrir Página Exclusiva do Produto"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Ver Página</span>
                      </Button>
                    </Link>

                    <Button
                      onClick={() => handleOpenCheckout(ebook)}
                      className="col-span-7 w-full h-11 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs gap-1.5 justify-center shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 shrink-0" />
                      <span>Comprar E-book</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Checkout Asaas + Entrega Automática do PDF */}
      {selectedEbook && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Checkout Oficial Asaas • Entrega Automática de PDF
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {selectedEbook.title}
                </h3>
                <p className="text-xs text-amber-400 font-bold">
                  Valor Único: R${" "}
                  {Number(selectedEbook.price).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCheckout}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
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
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Seu Melhor E-mail (Para receber a confirmação e o PDF do Asaas) *
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs"
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
                      className="bg-zinc-900 border-white/10 text-xs"
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
                      className="bg-zinc-900 border-white/10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Forma de Pagamento no Asaas
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
                  📄 <strong>Entrega Automática pelo Asaas:</strong> O arquivo PDF deste E-book já vai anexado na sua fatura do Asaas e é liberado para download imediatamente após a confirmação do pagamento!
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs sm:text-sm gap-2 shadow-xl cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isPending
                      ? "Gerando Cobrança e Anexando PDF no Asaas..."
                      : `Gerar Pagamento (R$ ${Number(selectedEbook.price).toLocaleString(
                          "pt-BR",
                          { minimumFractionDigits: 2 }
                        )})`}
                  </span>
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                {isPaid ? (
                  <div className="p-5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 text-center space-y-4">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-white">
                        Pagamento Confirmado com Sucesso!
                      </h4>
                      <p className="text-xs text-zinc-300">
                        O Asaas confirmou seu pagamento e liberou o PDF do seu E-book!
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
                          download={selectedEbook.pdfFileName || "ebook-horeb.pdf"}
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

                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                      <p className="leading-relaxed">
                        📄 <strong>Como receber seu PDF no Asaas:</strong> O arquivo PDF já está anexado na sua cobrança do Asaas. Assim que você concluir o pagamento, o botão de download do PDF será desbloqueado na própria Fatura Asaas e aqui na tela!
                      </p>
                      {activeOrder.invoiceUrl && (
                        <a
                          href={activeOrder.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-amber-400 hover:underline font-black"
                        >
                          <span>Abrir Fatura Completa no Asaas (PIX / Cartão / PDF)</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
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
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

