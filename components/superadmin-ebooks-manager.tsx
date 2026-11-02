"use client";

import React, { useState, useTransition } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveEbookProduct,
  deleteEbookProduct,
} from "@/app/actions/ebooks";

interface SuperAdminEbooksManagerProps {
  initialEbooks: any[];
  initialOrders: any[];
}

export function SuperAdminEbooksManager({
  initialEbooks = [],
  initialOrders = [],
}: SuperAdminEbooksManagerProps) {
  const [ebooks, setEbooks] = useState<any[]>(initialEbooks);
  const [orders] = useState<any[]>(initialOrders);
  const [isPending, startTransition] = useTransition();

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

  // Upload de Capa (converte imagem para Data URI otimizada)
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("A imagem de capa deve ter no máximo 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCoverUrl(reader.result);
        toast.success("Capa carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload do Arquivo PDF do E-book (será enviado automaticamente ao Asaas em cada cobrança com availableAfterPayment=true)
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Selecione um arquivo no formato PDF (.pdf).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("O arquivo PDF deve ter no máximo 15 MB para envio direto ao Asaas.");
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

    startTransition(async () => {
      const res = await saveEbookProduct({
        id: editingEbook?.id,
        title,
        subtitle,
        author,
        description,
        price: parseFloat(price) || 0,
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
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
        if (editingEbook) {
          setEbooks((prev) => prev.map((b) => (b.id === res.ebook.id ? res.ebook : b)));
        } else {
          setEbooks((prev) => [res.ebook, ...prev]);
        }
      } else {
        toast.error(res.error || "Erro ao salvar E-book.");
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o E-book "${name}"?`)) return;
    startTransition(async () => {
      const res = await deleteEbookProduct(id);
      if (res.success) {
        toast.success("E-book removido.");
        setEbooks((prev) => prev.filter((b) => b.id !== id));
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
      {/* Banner Explicativo da Integração Nativa de Documentos Asaas */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-emerald-500/10 border border-amber-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Integração Asaas • Entrega Automática de PDF Pós-Pagamento</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Loja Oficial de E-books & Materiais na Página Inicial
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Cadastre seus E-books em PDF abaixo. Quando um cliente compra na página inicial do Horeb, o sistema cadastra o comprador no grupo{" "}
            <strong className="text-amber-400">Horeb</strong> no Asaas, gera a cobrança (PIX, Cartão ou Boleto) e anexa o arquivo PDF diretamente na cobrança do Asaas com{" "}
            <code className="px-1.5 py-0.5 rounded bg-black/50 text-emerald-300 font-mono text-[11px]">
              availableAfterPayment = true
            </code>
            . Assim que o pagamento é confirmado, <strong>o próprio Asaas libera e entrega o PDF para o cliente</strong>!
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
                Clique em &ldquo;Cadastrar Novo E-book&rdquo; para enviar a capa e o arquivo PDF. Ele aparecerá automaticamente na página inicial do Horeb pronto para venda via Asaas.
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ebooks.map((ebook) => (
              <div
                key={ebook.id}
                className="rounded-2xl bg-zinc-900/80 border border-white/[0.08] overflow-hidden flex flex-col justify-between shadow-lg hover:border-amber-500/40 transition-all"
              >
                <div>
                  <div className="relative h-48 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black flex items-center justify-center overflow-hidden border-b border-white/[0.06]">
                    {ebook.coverUrl ? (
                      <img
                        src={ebook.coverUrl}
                        alt={ebook.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-amber-400/60">
                        <BookOpen className="w-12 h-12" />
                        <span className="text-[11px] font-bold uppercase">E-book Digital</span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
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

                <div className="p-4 pt-0 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(ebook)}
                    className="flex-1 h-9 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-400" />
                    <span>Editar E-book / PDF</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(ebook.id, ebook.title)}
                    disabled={isPending}
                    className="h-9 px-3 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
            <span>Últimos Pedidos & Entregas pelo Asaas ({orders.length})</span>
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
                  <th className="py-3 px-4 text-right">Fatura Asaas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {orders.map((order) => {
                  const isPaid =
                    order.status === "RECEIVED" || order.status === "CONFIRMED";
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
                        {order.invoiceUrl && (
                          <a
                            href={order.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-400 hover:underline font-bold"
                          >
                            <span>Abrir Fatura</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                    Este PDF será anexado na cobrança do Asaas e entregue automaticamente ao comprador assim que o pagamento for confirmado.
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
                    {coverUrl && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        ✓ Capa definida
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Envie uma imagem de capa do seu computador ou cole uma URL de imagem abaixo.
                  </p>

                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Enviar Capa</span>
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
