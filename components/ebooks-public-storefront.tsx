"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
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
  CreditCard,
  Search,
  Share2,
  MessageCircle,
  Church,
  Zap,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  purchaseEbookAction,
  checkEbookOrderStatusAction,
  getPublicEbooks,
} from "@/app/actions/ebooks";
import { capturePurchaseLeadAction } from "@/app/actions/leads";

interface EbooksPublicStorefrontProps {
  initialEbooks: any[];
  isSuperAdmin?: boolean;
}

export function EbooksPublicStorefront({
  initialEbooks = [],
  isSuperAdmin = false,
}: EbooksPublicStorefrontProps) {
  const [ebooks, setEbooks] = useState<any[]>(initialEbooks);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedStore, setCopiedStore] = useState(false);

  // Estado do Modal de Checkout Direto
  const [selectedEbook, setSelectedEbook] = useState<any | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerCpf, setBuyerCpf] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [billingType, setBillingType] = useState<"PIX" | "CREDIT_CARD">("PIX");

  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [unlockedPdfUrl, setUnlockedPdfUrl] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEbooks(initialEbooks);
  }, [initialEbooks]);

  useEffect(() => {
    let mounted = true;
    const syncLatest = () => {
      getPublicEbooks()
        .then((res) => {
          if (mounted && res.success && Array.isArray(res.ebooks)) {
            setEbooks(res.ebooks);
          }
        })
        .catch(() => {});
    };
    window.addEventListener("focus", syncLatest);
    return () => {
      mounted = false;
      window.removeEventListener("focus", syncLatest);
    };
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(ebooks.map((e) => (e.category || "LITERATURA CRISTÃ").trim()))
    );
    return ["TODOS", ...unique];
  }, [ebooks]);

  const filteredEbooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ebooks.filter((e) => {
      const matchesCat =
        selectedCategory === "TODOS" ||
        (e.category || "LITERATURA CRISTÃ").trim() === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        (e.title || "").toLowerCase().includes(q) ||
        (e.subtitle || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.author || "").toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q)
      );
    });
  }, [ebooks, selectedCategory, searchQuery]);

  // Polling automático do PIX a cada 6s
  useEffect(() => {
    if (!activeOrder?.id || isPaid) return;
    const timer = setInterval(async () => {
      try {
        const res = await checkEbookOrderStatusAction(activeOrder.id);
        if (res.success && res.isPaid) {
          setIsPaid(true);
          if (res.pdfUrl) setUnlockedPdfUrl(res.pdfUrl);
          toast.success(
            "Pagamento confirmado! Seu E-book em PDF já está liberado para download e enviado ao seu e-mail!"
          );
          clearInterval(timer);
        }
      } catch {}
    }, 6000);
    return () => clearInterval(timer);
  }, [activeOrder?.id, isPaid]);

  // Captura automática de Lead ("Página de Compras")
  useEffect(() => {
    if (!selectedEbook) return;
    const hasEmailOrPhone =
      (buyerEmail && buyerEmail.includes("@") && buyerEmail.includes(".")) ||
      buyerPhone.replace(/\D/g, "").length >= 10 ||
      buyerCpf.replace(/\D/g, "").length >= 11;
    if (!buyerName.trim() && !hasEmailOrPhone) return;

    const timer = setTimeout(() => {
      capturePurchaseLeadAction({
        leadName: buyerName,
        leadEmail: buyerEmail,
        leadCpfCnpj: buyerCpf,
        leadPhone: buyerPhone,
        productType: "EBOOK",
        productId: selectedEbook.id,
        productName: selectedEbook.title,
        amount: Number(selectedEbook.price || 9.9),
        billingType,
        billingCycle: "SINGLE",
        status: "CAPTURED",
        sourceUrl: "/links",
      }).catch(() => {});
    }, 900);

    return () => clearTimeout(timer);
  }, [selectedEbook, buyerName, buyerEmail, buyerCpf, buyerPhone, billingType]);

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
          "Cobrança gerada! Pague via PIX ou Cartão para liberar seu PDF imediatamente."
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
          "Ainda aguardando confirmação no Asaas. Se acabou de pagar via PIX, aguarde alguns segundos."
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

  const handleShareEbook = async (ebook: any) => {
    const url = `${window.location.origin}/ebooks/${ebook.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: ebook.title,
          text: `📘 ${ebook.title} (${ebook.author}) — E-book em PDF com entrega imediata:`,
          url,
        });
        return;
      }
    } catch {}
    await navigator.clipboard.writeText(url);
    setCopiedId(ebook.id);
    toast.success("Link do E-book copiado!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareStore = async () => {
    const url = `${window.location.origin}/links`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Loja Oficial de E-books Cristãos • Horeb",
          text: "Conheça todos os E-books Bíblicos oficiais em PDF da Biblioteca Digital Horeb:",
          url,
        });
        return;
      }
    } catch {}
    await navigator.clipboard.writeText(url);
    setCopiedStore(true);
    toast.success("Link público da Loja copiado!");
    setTimeout(() => setCopiedStore(false), 2500);
  };

  const whatsappUrl =
    "https://wa.me/5531973651924?text=" +
    encodeURIComponent(
      "Paz do Senhor! Estou na Loja Oficial de E-books Horeb e gostaria de tirar uma dúvida."
    );

  return (
    <div className="min-h-[100dvh] bg-[#060608] text-zinc-100 relative overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* Iluminação Ambiente */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[780px] h-[380px] bg-gradient-to-b from-amber-500/18 via-yellow-500/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-48 w-96 h-96 bg-emerald-500/8 blur-[130px] rounded-full" />
      </div>

      {/* Topbar da Loja Pública */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060608]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/links" className="flex items-center gap-3 min-w-0">
            <div className="relative w-28 sm:w-32 h-9 shrink-0">
              <Image
                src="/logo-horeb.png"
                alt="Horeb Loja Oficial"
                fill
                sizes="128px"
                className="object-contain"
                priority
              />
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              <ShoppingBag className="w-3 h-3 text-amber-400" />
              Loja Oficial de E-books
            </span>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            {isSuperAdmin && (
              <Link href="/admin?tab=ebooks">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs gap-1.5 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Gerenciar Loja</span>
                </Button>
              </Link>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleShareStore}
              className="h-9 px-3 rounded-xl border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 font-bold text-xs gap-1.5 cursor-pointer"
            >
              {copiedStore ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{copiedStore ? "Link Copiado!" : "Compartilhar Loja"}</span>
            </Button>

            <Link href="/?home=true" prefetch={false} className="hidden md:block">
              <Button
                size="sm"
                className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs gap-1.5 cursor-pointer"
              >
                <Church className="w-3.5 h-3.5" />
                <span>App para Igrejas</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero da Livraria Digital */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-black uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acesso 100% Público • Entrega Imediata em PDF</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.12]">
            Biblioteca Digital &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
              Loja Oficial de E-books Horeb
            </span>
          </h1>

          <p className="text-xs sm:text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Estudos bíblicos, guias homiléticos e materiais de edificação cristã com pagamento
            seguro via <strong className="text-zinc-200">PIX Instantâneo ou Cartão</strong> e envio
            automático do PDF completo no seu e-mail.
          </p>

          {/* Selos de Confiança da Loja */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 text-[11px] font-bold text-zinc-300">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Checkout Oficial Asaas
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Download Imediato + PDF no E-mail
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              {ebooks.length} {ebooks.length === 1 ? "Obra Disponível" : "Obras Disponíveis"}
            </span>
          </div>
        </section>

        {/* Barra de Busca + Filtro de Categorias */}
        <section className="space-y-4 bg-zinc-900/60 border border-white/10 rounded-3xl p-4 sm:p-5 backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar e-book por título, tema bíblico ou autor..."
                className="pl-10 h-11 rounded-2xl bg-zinc-950/90 border-white/10 text-sm text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border ${
                      active
                        ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-zinc-950/70 text-zinc-400 border-white/10 hover:text-white hover:border-white/25"
                    }`}
                  >
                    {cat === "TODOS" ? `Todos (${ebooks.length})` : cat}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Vitrine Tipo Loja com Todos os E-books */}
        {filteredEbooks.length === 0 ? (
          <div className="p-10 rounded-3xl bg-zinc-900/60 border border-white/10 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="text-sm font-bold text-white">
              Nenhum e-book encontrado para esse filtro.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("TODOS");
              }}
              className="rounded-xl text-xs cursor-pointer"
            >
              Limpar Filtros e Ver Todos
            </Button>
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEbooks.map((ebook) => {
              const hasDiscount =
                ebook.originalPrice && Number(ebook.originalPrice) > Number(ebook.price);
              const discountPct = hasDiscount
                ? Math.round(
                    ((Number(ebook.originalPrice) - Number(ebook.price)) /
                      Number(ebook.originalPrice)) *
                      100
                  )
                : 0;
              const coverSrc = ebook.coverUrl || `/api/ebooks/cover/${ebook.id}.jpg?v=3`;

              return (
                <article
                  key={ebook.id}
                  className="group rounded-3xl bg-zinc-900/80 border border-white/[0.09] hover:border-amber-500/60 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xl hover:shadow-amber-500/15"
                >
                  <div>
                    {/* Capa Vertical da Loja */}
                    <Link
                      href={`/ebooks/${ebook.id}`}
                      prefetch={false}
                      className="relative h-80 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center overflow-hidden border-b border-white/[0.07] block"
                    >
                      <img
                        src={coverSrc}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-35"
                      />
                      <img
                        src={coverSrc}
                        alt={ebook.title}
                        className="relative z-10 max-h-full max-w-full object-contain py-3 px-4 drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
                      />

                      {ebook.badge && (
                        <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider shadow-lg">
                          {ebook.badge}
                        </span>
                      )}

                      {discountPct > 0 && (
                        <span className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-emerald-500 text-black font-black text-[10px] uppercase tracking-wider shadow-lg">
                          -{discountPct}% OFF
                        </span>
                      )}

                      <span className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-emerald-300 font-bold text-[10px] flex items-center gap-1 shadow-lg">
                        <FileText className="w-3 h-3" />
                        PDF Completo
                      </span>
                    </Link>

                    {/* Detalhes do Produto */}
                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] text-amber-400 font-black uppercase tracking-wider">
                        <span className="truncate">{ebook.category}</span>
                        {ebook.pagesCount && (
                          <span className="shrink-0 text-zinc-400">{ebook.pagesCount} págs.</span>
                        )}
                      </div>

                      <Link href={`/ebooks/${ebook.id}`} prefetch={false}>
                        <h2 className="text-base sm:text-lg font-black text-white leading-snug group-hover:text-amber-400 transition-colors line-clamp-2">
                          {ebook.title}
                        </h2>
                      </Link>

                      {ebook.subtitle && (
                        <p className="text-xs text-zinc-300 font-medium line-clamp-2">
                          {ebook.subtitle}
                        </p>
                      )}

                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                        {ebook.description}
                      </p>

                      <div className="text-[11px] text-zinc-400 pt-1">
                        ✍️ Autor:{" "}
                        <strong className="text-zinc-200">
                          {ebook.author || "Pr. Luan Demattos"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Preço e Botões de Compra */}
                  <div className="p-5 pt-0">
                    <div className="pt-3.5 border-t border-white/[0.07] space-y-3">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          {hasDiscount && (
                            <span className="text-xs text-zinc-500 line-through block">
                              De R${" "}
                              {Number(ebook.originalPrice).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-400 block">Por apenas</span>
                          <span className="text-2xl font-black text-emerald-400 leading-none">
                            R${" "}
                            {Number(ebook.price).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleShareEbook(ebook)}
                          className="h-9 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Compartilhar ou copiar link deste E-book"
                        >
                          {copiedId === ebook.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>{copiedId === ebook.id ? "Copiado" : "Link"}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-12 gap-2">
                        <Link
                          href={`/ebooks/${ebook.id}`}
                          prefetch={false}
                          className="col-span-4"
                        >
                          <Button
                            variant="outline"
                            className="w-full h-11 px-2 rounded-2xl border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 font-bold text-xs gap-1 justify-center cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Detalhes</span>
                          </Button>
                        </Link>

                        <Button
                          onClick={() => handleOpenCheckout(ebook)}
                          className="col-span-8 w-full h-11 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-black text-xs gap-1.5 justify-center shadow-lg shadow-amber-500/20 cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4 shrink-0" />
                          <span>Comprar Agora</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* Rodapé Comercial & Suporte */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-white/10">
          <Link
            href="/?home=true"
            prefetch={false}
            className="flex items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-zinc-900/90 to-zinc-900 border border-amber-500/35 hover:border-amber-400 transition-all group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Church className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-black text-white truncate">
                  Conheça também o App Horeb para Igrejas
                </p>
                <p className="text-xs text-zinc-400 line-clamp-2">
                  30 dias grátis • Aplicativo White-Label, Células, EBD, Secretaria e Tesouraria PIX
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-amber-400 shrink-0" />
          </Link>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 p-5 rounded-3xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 transition-all group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-black text-emerald-200 truncate">
                  Atendimento & Suporte no WhatsApp
                </p>
                <p className="text-xs text-zinc-400 line-clamp-2">
                  Precisa de ajuda com seu pedido ou quer levar os materiais para sua igreja? Fale conosco!
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-400 shrink-0" />
          </a>
        </section>

        <footer className="pt-2 pb-6 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} Biblioteca Digital Horeb • Lynx EMS Sistemas • Loja 100% Pública e Segura
        </footer>
      </main>

      {/* Modal de Checkout Rápido Asaas (PIX Instantâneo + Cartão) */}
      {selectedEbook && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Checkout Oficial Asaas • Entrega Imediata em PDF
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {selectedEbook.title}
                </h3>
                <p className="text-xs text-amber-400 font-bold">
                  Valor Promocional: R${" "}
                  {Number(selectedEbook.price).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseCheckout}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!activeOrder ? (
              <form onSubmit={handleCheckoutSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label htmlFor="store-buyer-name" className="text-xs font-bold text-zinc-300">
                    Seu Nome Completo *
                  </label>
                  <Input
                    id="store-buyer-name"
                    name="buyerName"
                    required
                    placeholder="Digite seu nome completo"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="store-buyer-email" className="text-xs font-bold text-zinc-300">
                    Seu Melhor E-mail (Para receber o PDF imediatamente) *
                  </label>
                  <Input
                    id="store-buyer-email"
                    name="buyerEmail"
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
                    <label htmlFor="store-buyer-cpf" className="text-xs font-bold text-zinc-300">
                      CPF ou CNPJ *
                    </label>
                    <Input
                      id="store-buyer-cpf"
                      name="buyerCpf"
                      required
                      placeholder="000.000.000-00"
                      value={buyerCpf}
                      onChange={(e) => setBuyerCpf(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="store-buyer-phone" className="text-xs font-bold text-zinc-300">
                      WhatsApp / Celular
                    </label>
                    <Input
                      id="store-buyer-phone"
                      name="buyerPhone"
                      placeholder="(00) 90000-0000"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-zinc-300 block">
                    Escolha Como Pagar
                  </span>
                  <div className="grid grid-cols-2 gap-2">
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
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-200 leading-relaxed">
                  📄 <strong>Liberação Automática:</strong> Assim que o pagamento é confirmado, você baixa o PDF na hora e também recebe uma cópia completa no seu e-mail!
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-black text-xs sm:text-sm gap-2 shadow-xl cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isPending
                      ? "Gerando Cobrança Segura..."
                      : `Finalizar Compra • R$ ${Number(selectedEbook.price).toLocaleString(
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
                    <div className="space-y-1.5">
                      <h4 className="text-lg font-black text-white">
                        Pagamento Confirmado!
                      </h4>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        Seu E-book em PDF já foi enviado para{" "}
                        {buyerEmail ? (
                          <strong className="text-amber-300 font-mono">({buyerEmail})</strong>
                        ) : (
                          "seu e-mail"
                        )}{" "}
                        e está pronto para download abaixo:
                      </p>
                    </div>

                    {unlockedPdfUrl && (
                      <a
                        href={unlockedPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs gap-2 cursor-pointer">
                          <Download className="w-4 h-4" />
                          <span>Baixar Meu PDF Agora</span>
                        </Button>
                      </a>
                    )}
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
                        <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-black text-xs gap-2 shadow-xl cursor-pointer">
                          <CreditCard className="w-4 h-4" />
                          <span>Pagar com PIX Instantâneo ou Cartão no Asaas</span>
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
    </div>
  );
}
