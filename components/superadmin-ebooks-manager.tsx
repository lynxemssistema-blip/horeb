"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  Sparkles,
  Check,
  X,
  ShoppingBag,
  ShieldCheck,
  Send,
  Copy,
  MessageCircle,
  Mail,
  QrCode,
  CreditCard,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveEbookProduct,
  deleteEbookProduct,
  dispatchEbookOfferByAdminAction,
  getAdminEbooksData,
  resendPaidEbookEmailAction,
} from "@/app/actions/ebooks";

interface SuperAdminEbooksManagerProps {
  initialEbooks: any[];
  initialOrders: any[];
  onEbooksChange?: (ebooks: any[]) => void;
  onOrdersChange?: (orders: any[]) => void;
}

export function SuperAdminEbooksManager({
  initialEbooks = [],
  initialOrders = [],
  onEbooksChange,
  onOrdersChange,
}: SuperAdminEbooksManagerProps) {
  const router = useRouter();
  const [ebooks, setEbooks] = useState<any[]>(initialEbooks);
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEbooks(initialEbooks);
  }, [initialEbooks]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Busca sempre os dados mais recentes do banco ao abrir a aba
  useEffect(() => {
    let activeMount = true;
    getAdminEbooksData()
      .then((res) => {
        if (!activeMount || !res.success) return;
        setEbooks(res.ebooks);
        setOrders(res.orders);
        onEbooksChange?.(res.ebooks);
        onOrdersChange?.(res.orders);
      })
      .catch(() => {});
    return () => {
      activeMount = false;
    };
  }, []);

  // Modal de criar/editar E-book
  const [showModal, setShowModal] = useState(false);
  const [editingEbook, setEditingEbook] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState("Edson Manoel");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("29.90");
  const [originalPrice, setOriginalPrice] = useState("49.90");
  const [badge, setBadge] = useState("LANÇAMENTO");
  const [category, setCategory] = useState("LIDERANÇA & GESTÃO");
  const [pagesCount, setPagesCount] = useState("85");
  const [coverUrl, setCoverUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(true);

  // Modal de Disparo Direto (WhatsApp / E-mail + Link de Pagamento Asaas)
  const [dispatchEbook, setDispatchEbook] = useState<any | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientCpf, setRecipientCpf] = useState("");
  const [generateAsaasPayment, setGenerateAsaasPayment] = useState(true);
  const [dispatchBillingType, setDispatchBillingType] = useState<"PIX" | "UNDEFINED">("UNDEFINED");
  const [sendEmailFlag, setSendEmailFlag] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getProductPageUrl = (ebookId: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/ebooks/${ebookId}`;
    }
    return `https://horeb.lynxems.com.br/ebooks/${ebookId}`;
  };

  const handleCopyProductLink = (ebook: any) => {
    const url = getProductPageUrl(ebook.id);
    navigator.clipboard.writeText(url);
    setCopiedId(ebook.id);
    toast.success(`Link exclusivo de venda copiado: ${url}`);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleOpenDispatchModal = (ebook: any) => {
    setDispatchEbook(ebook);
    setRecipientName("");
    setRecipientPhone("");
    setRecipientEmail("");
    setRecipientCpf("");
    setGenerateAsaasPayment(true);
    setDispatchBillingType("UNDEFINED");
    setSendEmailFlag(true);
    setCustomMessage("");
    setDispatchResult(null);
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchEbook) return;

    startTransition(async () => {
      const res = await dispatchEbookOfferByAdminAction({
        ebookId: dispatchEbook.id,
        recipientName,
        recipientEmail,
        recipientPhone,
        recipientCpf,
        generateAsaasPayment,
        billingType: dispatchBillingType,
        sendEmail: sendEmailFlag,
        customMessage,
      });

      if (res.success) {
        setDispatchResult(res);
        if (res.order) {
          setOrders((prev) => [
            {
              ...res.order,
              buyerName: recipientName || "Cliente",
              buyerEmail: recipientEmail || "-",
              buyerCpf: recipientCpf || "-",
              asaasDocumentId: res.order.asaasDocumentAttached ? "ATTACHED" : null,
              ebook: {
                id: dispatchEbook.id,
                title: dispatchEbook.title,
                pdfFileName: dispatchEbook.pdfFileName,
              },
            },
            ...prev,
          ]);
        }

        if (res.emailSent) {
          toast.success(
            "Link de pagamento Asaas gerado e enviado por E-mail com sucesso! Clique abaixo para disparar também no WhatsApp."
          );
        } else if (res.asaasInvoiceUrl) {
          toast.success(
            "Link de Pagamento Asaas gerado com o PDF anexado! Agora clique para enviar no WhatsApp."
          );
        } else {
          toast.success("Link exclusivo preparado para envio!");
        }
      } else {
        toast.error(res.error || "Não foi possível preparar o disparo.");
      }
    });
  };

  const handleQuickWhatsAppPageShare = (ebook: any) => {
    const pageUrl = getProductPageUrl(ebook.id);
    const priceStr = Number(ebook.price || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    });
    const origStr =
      ebook.originalPrice && ebook.originalPrice > ebook.price
        ? Number(ebook.originalPrice).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })
        : null;
    const discountPct =
      ebook.originalPrice && ebook.originalPrice > ebook.price
        ? Math.round(((ebook.originalPrice - ebook.price) / ebook.originalPrice) * 100)
        : 0;

    const text = [
      `🔥 *OFERTA ESPECIAL — E-BOOK OFICIAL HOREB*`,
      ``,
      `📘 *${ebook.title}*`,
      ebook.subtitle ? `_${ebook.subtitle}_` : null,
      `✍️ Autor: *${ebook.author || "Pr. Luan Demattos"}*`,
      ``,
      origStr
        ? `💰 De ~R$ ${origStr}~ por apenas *R$ ${priceStr}* (${discountPct}% OFF Hoje!)`
        : `💰 Valor único: *R$ ${priceStr}* (PIX ou Cartão)`,
      `📥 *Entrega Imediata:* Receba o arquivo PDF completo diretamente no seu E-mail + Download Imediato após a confirmação do pagamento!`,
      ``,
      `👉 *Acesse a página oficial e garanta o seu agora:*`,
      `${pageUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleOpenModal = (ebook?: any) => {
    if (ebook) {
      setEditingEbook(ebook);
      setTitle(ebook.title || "");
      setSubtitle(ebook.subtitle || "");
      setAuthor(ebook.author || "Edson Manoel");
      setDescription(ebook.description || "");
      setPrice(String(ebook.price || "29.90"));
      setOriginalPrice(ebook.originalPrice ? String(ebook.originalPrice) : "");
      setBadge(ebook.badge || "");
      setCategory(ebook.category || "LIDERANÇA & GESTÃO");
      setPagesCount(ebook.pagesCount ? String(ebook.pagesCount) : "");
      setCoverUrl(ebook.coverUrl || "");
      setPdfUrl(""); // Mantém vazio a menos que envie um novo PDF
      setPdfFileName(ebook.pdfFileName || "ebook.pdf");
      setActive(ebook.active !== false);
      setFeatured(Boolean(ebook.featured));
    } else {
      setEditingEbook(null);
      setTitle("");
      setSubtitle("");
      setAuthor("Edson Manoel");
      setDescription("");
      setPrice("29.90");
      setOriginalPrice("59.90");
      setBadge("LANÇAMENTO");
      setCategory("LIDERANÇA & GESTÃO");
      setPagesCount("");
      setCoverUrl("");
      setPdfUrl("");
      setPdfFileName("");
      setActive(true);
      setFeatured(true);
    }
    setShowModal(true);
  };

  // Upload de Capa (apaga a imagem anterior antes e converte a nova imagem para Data URI otimizada via Canvas)
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(
        `A imagem selecionada tem ${sizeMb} MB. O tamanho máximo permitido é de 10 MB.`
      );
      e.target.value = "";
      return;
    }

    // 1. Apaga imediatamente a imagem anterior antes de carregar a nova
    setCoverUrl("");

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const rawDataUrl = reader.result;

      // 2. Otimiza e redimensiona a imagem no cliente (máx 900x1200 JPEG 88%) para evitar erro 404/413 na Server Action
      const img = new window.Image();
      img.onload = () => {
        try {
          const maxW = 900;
          const maxH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxW || height > maxH) {
            const ratio = Math.min(maxW / width, maxH / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#09090b";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
            setCoverUrl(compressedDataUrl);
            toast.success("Capa anterior removida e nova capa carregada com sucesso!");
          } else {
            setCoverUrl(rawDataUrl);
            toast.success("Capa anterior removida e nova capa carregada!");
          }
        } catch {
          setCoverUrl(rawDataUrl);
          toast.success("Capa anterior removida e nova capa carregada!");
        }
      };
      img.onerror = () => {
        setCoverUrl(rawDataUrl);
        toast.success("Capa anterior removida e nova capa carregada!");
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePreviousCover = () => {
    setCoverUrl("");
    toast.info("Imagem de capa anterior apagada. Agora selecione ou cole a nova capa.");
  };

  const handleResendOrderEmail = (orderId: string, email: string) => {
    startTransition(async () => {
      const res = await resendPaidEbookEmailAction(orderId);
      if (res.success) {
        toast.success(`E-mail com PDF em anexo + Link de Uso Único enviado para ${email}!`);
        const refreshed = await getAdminEbooksData();
        if (refreshed.success) {
          setOrders(refreshed.orders);
          onOrdersChange?.(refreshed.orders);
        }
      } else {
        toast.error(res.error || "Não foi possível reenviar o e-mail.");
      }
    });
  };

  // Upload do Arquivo PDF do E-book (será enviado automaticamente ao Asaas em cada cobrança com availableAfterPayment=true)
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Selecione apenas arquivos no formato PDF (.pdf).");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(
        `O arquivo PDF selecionado tem ${sizeMb} MB. O limite máximo permitido é de 5 MB.`
      );
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPdfUrl(reader.result);
        setPdfFileName(file.name);
        toast.success(`PDF "${file.name}" carregado e pronto para entrega via Asaas!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = parseFloat(String(price).replace(",", ".")) || 0;
    const parsedOriginalPrice = originalPrice
      ? parseFloat(String(originalPrice).replace(",", "."))
      : null;

    startTransition(async () => {
      try {
        const res = await saveEbookProduct({
          id: editingEbook?.id,
          title,
          subtitle,
          author,
          description,
          price: parsedPrice,
          originalPrice: parsedOriginalPrice,
          coverUrl: coverUrl || null,
          pdfUrl: pdfUrl || undefined,
          pdfFileName: pdfFileName || "ebook-horeb.pdf",
          badge: badge || null,
          pagesCount: pagesCount ? parseInt(pagesCount, 10) : null,
          category,
          active,
          featured,
        });

        if (res.success && res.ebook) {
          toast.success(
            editingEbook
              ? "E-book atualizado com sucesso!"
              : "E-book cadastrado e publicado na página inicial!"
          );
          setShowModal(false);
          const nextEbooks = editingEbook
            ? ebooks.map((b) => (b.id === res.ebook.id ? res.ebook : b))
            : [res.ebook, ...ebooks];
          setEbooks(nextEbooks);
          onEbooksChange?.(nextEbooks);
          router.refresh();
        } else {
          toast.error(res.error || "Erro ao salvar E-book.");
        }
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (
          msg.toLowerCase().includes("body exceeded") ||
          msg.toLowerCase().includes("limit") ||
          msg.includes("413") ||
          msg.includes("500")
        ) {
          toast.error(
            "Arquivo muito grande! O tamanho máximo permitido para o PDF e a capa é de 5 MB."
          );
        } else {
          toast.error(
            "Não foi possível enviar o arquivo. Verifique se o tamanho não ultrapassa o limite de 5 MB."
          );
        }
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o E-book "${name}"?`)) return;
    startTransition(async () => {
      const res = await deleteEbookProduct(id);
      if (res.success) {
        toast.success("E-book removido.");
        const nextEbooks = ebooks.filter((b) => b.id !== id);
        setEbooks(nextEbooks);
        onEbooksChange?.(nextEbooks);
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao excluir.");
      }
    });
  };

  const totalRevenue = orders
    .filter((o) => o.status === "RECEIVED" || o.status === "CONFIRMED")
    .reduce((acc, o) => acc + (o.amount || 0), 0);

  const paidOrdersCount = orders.filter(
    (o) => o.status === "RECEIVED" || o.status === "CONFIRMED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Banner Explicativo da Integração Nativa de Documentos Asaas + Páginas Exclusivas */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-emerald-500/10 border border-amber-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Página Exclusiva por E-book + Disparo WhatsApp & E-mail com Link Asaas</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Loja Oficial de E-books & Disparo Direto de Vendas
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Cada E-book possui uma <strong>Página Exclusiva de Venda</strong> (<code className="px-1.5 py-0.5 rounded bg-black/50 text-amber-300 font-mono text-[11px]">/ebooks/[id]</code>) e você pode{" "}
            <strong>gerar o Link de Pagamento do Asaas e disparar direto no WhatsApp ou por E-mail</strong>! O PDF já vai anexado na cobrança do Asaas com{" "}
            <code className="px-1.5 py-0.5 rounded bg-black/50 text-emerald-300 font-mono text-[11px]">
              availableAfterPayment = true
            </code>{" "}
            para entrega automática após o pagamento.
          </p>
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs sm:text-sm gap-2 shadow-xl shadow-amber-500/20 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Cadastrar Novo E-book</span>
        </Button>
      </div>

      {/* KPIs de Vendas de E-books */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/[0.08] space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase">
            <span>E-books Publicados</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {ebooks.length}{" "}
            <span className="text-xs text-emerald-400 font-bold">
              ({ebooks.filter((e) => e.active).length} ativos na Home)
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/[0.08] space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase">
            <span>Vendas Confirmadas (Asaas)</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {paidOrdersCount}{" "}
            <span className="text-xs text-zinc-400 font-normal">
              de {orders.length} pedidos gerados
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold uppercase">
            <span>Receita Total de E-books</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Lista de E-books Cadastrados */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>Meus E-books Cadastrados ({ebooks.length})</span>
        </h3>

        {ebooks.length === 0 ? (
          <div className="p-10 rounded-3xl bg-zinc-900/40 border border-dashed border-white/15 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-amber-400/60 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                Você ainda não cadastrou nenhum E-book para venda
              </p>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Clique em &ldquo;Cadastrar Novo E-book&rdquo; para enviar a capa e o arquivo PDF. Ele aparecerá automaticamente na página inicial do Horeb e terá sua página exclusiva de venda.
              </p>
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Meu Primeiro E-book</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ebooks.map((ebook) => (
              <div
                key={ebook.id}
                className="rounded-2xl bg-zinc-900/80 border border-white/[0.08] overflow-hidden flex flex-col justify-between shadow-lg hover:border-amber-500/40 transition-all"
              >
                <div>
                  <div className="relative h-60 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center overflow-hidden border-b border-white/[0.06]">
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
                          className="relative z-10 max-h-full max-w-full object-contain py-3 px-4 drop-shadow-2xl"
                        />
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-amber-400/60">
                        <BookOpen className="w-12 h-12" />
                        <span className="text-[11px] font-bold uppercase">E-book Digital</span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          ebook.active
                            ? "bg-emerald-500 text-black"
                            : "bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {ebook.active ? "Ativo na Home" : "Oculto"}
                      </span>
                      {ebook.badge && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500 text-black">
                          {ebook.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      {ebook.category} • Por {ebook.author}
                    </div>
                    <h4 className="text-base font-black text-white leading-snug">
                      {ebook.title}
                    </h4>
                    {ebook.subtitle && (
                      <p className="text-xs text-zinc-400 font-medium">{ebook.subtitle}</p>
                    )}
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {ebook.description}
                    </p>

                    {/* Box do Link Exclusivo de Venda do Produto */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.08] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase">
                        <span>Página Exclusiva de Venda:</span>
                        <Link
                          href={`/ebooks/${ebook.id}`}
                          target="_blank"
                          className="text-amber-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Abrir Página</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <code className="flex-1 text-[11px] font-mono text-amber-300 bg-zinc-900/90 px-2 py-1 rounded border border-white/10 truncate">
                          /ebooks/{ebook.id}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyProductLink(ebook)}
                          className="h-7 px-2.5 rounded-lg border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold gap-1 cursor-pointer shrink-0"
                        >
                          {copiedId === ebook.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === ebook.id ? "Copiado" : "Copiar Link"}</span>
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                      <div>
                        {ebook.originalPrice && ebook.originalPrice > ebook.price && (
                          <span className="text-xs text-zinc-500 line-through block">
                            R${" "}
                            {Number(ebook.originalPrice).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        )}
                        <span className="text-xl font-black text-amber-400">
                          R${" "}
                          {Number(ebook.price).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="text-right text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <FileText className="w-3.5 h-3.5" />
                          {ebook.pdfFileName || "PDF Anexado"}
                        </span>
                        <span>{ebook.salesCount || 0} vendas confirmadas</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação e Disparo Direto */}
                <div className="p-4 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenDispatchModal(ebook)}
                      className="h-9 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-black text-[11px] gap-1.5 shadow-lg shadow-emerald-500/15 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gerar Link Asaas & Disparar</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickWhatsAppPageShare(ebook)}
                      className="h-9 rounded-xl border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-[11px] gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Rápido</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenModal(ebook)}
                      className="flex-1 h-8 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-[11px] font-bold gap-1.5 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-400" />
                      <span>Editar E-book / PDF</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(ebook.id, ebook.title)}
                      disabled={isPending}
                      className="h-8 px-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de Pedidos de E-books no Asaas */}
      {orders.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Últimos Pedidos & Cobranças Geradas no Asaas ({orders.length})</span>
          </h3>

          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-zinc-400 uppercase text-[10px]">
                  <th className="py-3 px-4">Cliente (Grupo Horeb)</th>
                  <th className="py-3 px-4">E-book</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status Asaas</th>
                  <th className="py-3 px-4">Entrega PDF Asaas</th>
                  <th className="py-3 px-4 text-right">Links de Venda & Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {orders.map((order) => {
                  const isPaid =
                    order.status === "RECEIVED" || order.status === "CONFIRMED";
                  const cleanPhone = (order.buyerPhone || "").replace(/\D/g, "");
                  const waPhone = cleanPhone
                    ? cleanPhone.startsWith("55")
                      ? cleanPhone
                      : `55${cleanPhone}`
                    : "";
                  const waText = [
                    `Olá, *${order.buyerName}*! A paz do Senhor! 🙏`,
                    `Aqui está o link oficial da sua cobrança no Asaas para o E-book *${order.ebook?.title || "Horeb"}*:`,
                    order.invoiceUrl || getProductPageUrl(order.ebookId),
                    ``,
                    `Assim que o pagamento for confirmado, o próprio Asaas libera o download do PDF automaticamente para você!`,
                  ].join("\n");

                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{order.buyerName}</div>
                        <div className="text-[11px] text-zinc-400">
                          {order.buyerEmail} • CPF: {order.buyerCpf}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-amber-300">
                        {order.ebook?.title || "E-book"}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        R${" "}
                        {Number(order.amount || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            PAGO & CONFIRMADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                            <Clock className="w-3 h-3" />
                            AGUARDANDO PAGAMENTO
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {order.asaasDocumentId ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            PDF anexado no Asaas ({isPaid ? "Liberado" : "Bloqueado até pagar"})
                          </span>
                        ) : (
                          <span className="text-zinc-400">Entrega direta</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isPaid && (
                            <button
                              type="button"
                              onClick={() =>
                                handleResendOrderEmail(order.id, order.buyerEmail)
                              }
                              disabled={isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 font-bold text-[11px] cursor-pointer"
                              title="Enviar E-mail com PDF em Anexo + Link de Uso Único"
                            >
                              <Mail className="w-3 h-3" />
                              <span>
                                {order.deliveryEmailSent
                                  ? "Reenviar PDF + Link"
                                  : "Enviar PDF + Link"}
                              </span>
                            </button>
                          )}

                          <a
                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 font-bold text-[11px]"
                            title="Enviar cobrança Asaas no WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>

                          {order.invoiceUrl && (
                            <a
                              href={order.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-amber-400 hover:underline font-bold"
                            >
                              <span>Fatura Asaas</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Disparo Direto (WhatsApp e/ou E-mail com Link de Pagamento do Asaas) */}
      {dispatchEbook && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-emerald-500/40 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  Disparo Direto Super Admin • WhatsApp & E-mail + Link Asaas
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {dispatchEbook.title}
                </h3>
                <p className="text-xs text-amber-400 font-bold">
                  Valor: R${" "}
                  {Number(dispatchEbook.price).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  • Página Exclusiva: <code>/ebooks/{dispatchEbook.id}</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDispatchEbook(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!dispatchResult ? (
              <form onSubmit={handleDispatchSubmit} className="space-y-4">
                {/* Modo de Disparo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGenerateAsaasPayment(true)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      generateAsaasPayment
                        ? "bg-emerald-500/15 border-emerald-500 text-white"
                        : "bg-zinc-900 border-white/10 text-zinc-400"
                    }`}
                  >
                    <div className="text-xs font-black flex items-center gap-1.5 text-emerald-400">
                      <CreditCard className="w-4 h-4" />
                      <span>Com Cobrança Asaas Pronta</span>
                    </div>
                    <p className="text-[10px] text-zinc-300 mt-1 leading-snug">
                      Gera a fatura no Asaas (Grupo Horeb) com o PDF anexado e envia o link direto de pagamento.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenerateAsaasPayment(false)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      !generateAsaasPayment
                        ? "bg-amber-500/15 border-amber-500 text-white"
                        : "bg-zinc-900 border-white/10 text-zinc-400"
                    }`}
                  >
                    <div className="text-xs font-black flex items-center gap-1.5 text-amber-400">
                      <Share2 className="w-4 h-4" />
                      <span>Apenas Link da Página Exclusiva</span>
                    </div>
                    <p className="text-[10px] text-zinc-300 mt-1 leading-snug">
                      Envia o link da página <code>/ebooks/{dispatchEbook.id}</code> para o cliente preencher os dados e pagar lá.
                    </p>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">
                      Nome do Cliente {generateAsaasPayment ? "*" : "(Opcional)"}
                    </label>
                    <Input
                      required={generateAsaasPayment}
                      placeholder="Ex: João da Silva"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-xs"
                    />
                  </div>

                  {generateAsaasPayment && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-400">
                        CPF ou CNPJ do Cliente (Para o Asaas) *
                      </label>
                      <Input
                        required={generateAsaasPayment}
                        placeholder="000.000.000-00"
                        value={recipientCpf}
                        onChange={(e) => setRecipientCpf(e.target.value)}
                        className="bg-zinc-900 border-amber-500/40 text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp do Cliente (com DDD)</span>
                    </label>
                    <Input
                      placeholder="Ex: 11999999999"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>E-mail do Cliente</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="cliente@email.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="bg-zinc-900 border-white/10 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Mensagem Personalizada (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Paz do Senhor! Segue o link especial do nosso E-book com entrega imediata do PDF após o pagamento..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmailFlag}
                    onChange={(e) => setSendEmailFlag(e.target.checked)}
                    className="rounded border-white/20 text-emerald-500"
                  />
                  <span>
                    Disparar automaticamente também por <strong>E-mail (Hostinger SMTP)</strong> se o e-mail estiver preenchido
                  </span>
                </label>

                <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-black text-xs gap-2 shadow-lg cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isPending
                        ? "Gerando Link Asaas e Disparando..."
                        : generateAsaasPayment
                        ? "Gerar Link de Pagamento Asaas & Preparar Envio"
                        : "Preparar Envio do Link Exclusivo"}
                    </span>
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Links Prontos para Disparo!</span>
                  </div>
                  {dispatchResult.emailSent && (
                    <p className="text-xs text-emerald-300">
                      ✅ E-mail enviado com sucesso para <strong>{recipientEmail}</strong> contendo o Link de Pagamento do Asaas e a Página Exclusiva!
                    </p>
                  )}
                  {dispatchResult.emailError && (
                    <p className="text-xs text-rose-400">
                      ⚠️ Aviso E-mail: {dispatchResult.emailError}
                    </p>
                  )}
                </div>

                {dispatchResult.asaasInvoiceUrl && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-amber-400">
                      💳 Link Direto de Pagamento no Asaas (com PDF anexado):
                    </label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={dispatchResult.asaasInvoiceUrl}
                        className="bg-zinc-900 border-amber-500/40 text-xs font-mono text-amber-300"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(dispatchResult.asaasInvoiceUrl);
                          toast.success("Link de pagamento do Asaas copiado!");
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-zinc-300">
                    🔗 Link da Página Exclusiva do Produto:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={dispatchResult.productPageUrl}
                      className="bg-zinc-900 border-white/10 text-xs font-mono text-zinc-200"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(dispatchResult.productPageUrl);
                        toast.success("Link da página exclusiva copiado!");
                      }}
                      className="border-white/15 text-xs font-bold shrink-0 gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </Button>
                  </div>
                </div>

                {/* Botão Principal de Disparo no WhatsApp */}
                <div className="pt-2 space-y-2.5">
                  <a
                    href={dispatchResult.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 hover:brightness-110 text-black font-black text-xs sm:text-sm gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer">
                      <MessageCircle className="w-5 h-5" />
                      <span>
                        Disparar Agora no WhatsApp{" "}
                        {recipientPhone ? `(${recipientPhone})` : ""}
                      </span>
                    </Button>
                  </a>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDispatchResult(null)}
                      className="flex-1 h-10 rounded-xl border-white/10 text-xs font-bold cursor-pointer"
                    >
                      Novo Disparo para Outro Cliente
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDispatchEbook(null)}
                      className="h-10 px-4 rounded-xl text-xs text-zinc-400 cursor-pointer"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição de E-book */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span>
                    {editingEbook ? "Editar E-book" : "Cadastrar Novo E-book para Venda"}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  O PDF enviado será anexado nas cobranças do Asaas e liberado automaticamente após a confirmação do pagamento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-zinc-300">
                    Título do E-book *
                  </label>
                  <Input
                    required
                    placeholder="Ex: Manual Prático de Liderança Eclesiástica e Gestão de Igrejas"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Subtítulo (Opcional)
                  </label>
                  <Input
                    placeholder="Ex: Como estruturar ministérios e células que crescem"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Autor *</label>
                  <Input
                    required
                    placeholder="Nome do Autor"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-400">
                    Preço de Venda (R$) *
                  </label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="5"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="bg-zinc-900 border-amber-500/40 text-xs font-bold text-amber-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400">
                    Preço De / Cortado (R$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="Ex: 59.90"
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Selo / Badge
                  </label>
                  <Input
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="MAIS VENDIDO"
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">
                    Nº de Páginas
                  </label>
                  <Input
                    type="number"
                    value={pagesCount}
                    onChange={(e) => setPagesCount(e.target.value)}
                    placeholder="Ex: 120"
                    className="bg-zinc-900 border-white/10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">
                  Descrição Comercial do E-book *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que o leitor vai aprender neste E-book, os capítulos e os benefícios práticos..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Upload do Arquivo PDF e da Capa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Bloco 1: Arquivo PDF do E-book */}
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      Arquivo PDF do E-book *
                    </span>
                    {pdfFileName && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono truncate max-w-[140px]">
                        {pdfFileName}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Este PDF será anexado na cobrança do Asaas e entregue automaticamente ao comprador após o pagamento.{" "}
                    <strong className="text-emerald-300">(Tamanho máximo: 5 MB)</strong>
                  </p>

                  <label className="flex items-center justify-center gap-2 w-full h-10 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>
                      {pdfUrl
                        ? "Trocar Arquivo PDF Carregado"
                        : editingEbook
                        ? "Enviar Novo PDF (Opcional)"
                        : "Selecionar Arquivo PDF (.pdf)"}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Bloco 2: Imagem de Capa do E-book */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      Capa do E-book
                    </span>
                    {coverUrl ? (
                      <button
                        type="button"
                        onClick={handleRemovePreviousCover}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Apagar Imagem Anterior</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-bold">
                        Sem capa definida
                      </span>
                    )}
                  </div>

                  {coverUrl && (
                    <div className="relative h-28 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden p-1.5">
                      <img
                        src={coverUrl}
                        alt="Prévia da Capa"
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Ao enviar uma nova capa, a imagem anterior é apagada automaticamente antes de salvar.
                  </p>

                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{coverUrl ? "Trocar Capa (Apaga Anterior)" : "Enviar Nova Capa"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <Input
                    value={coverUrl.startsWith("data:") ? "" : coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="Ou cole a URL da imagem de capa..."
                    className="bg-zinc-900 border-white/10 text-[11px] h-8"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded border-white/20 text-amber-500"
                  />
                  <span>Exibir na Página Inicial do Horeb para Venda</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="rounded border-white/20 text-amber-500"
                  />
                  <span>Destacar como E-book Principal</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 h-11 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isPending
                      ? "Salvando E-book..."
                      : editingEbook
                      ? "Salvar Alterações do E-book"
                      : "Publicar E-book na Página Inicial"}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="h-11 px-5 rounded-xl border-white/10 text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
