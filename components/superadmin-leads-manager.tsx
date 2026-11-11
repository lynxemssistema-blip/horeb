"use client";

import React, { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  Users,
  ShoppingBag,
  QrCode,
  CreditCard,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
  MessageCircle,
  Mail,
  ExternalLink,
  Search,
  Filter,
  Download,
  DollarSign,
  Tag,
  Sparkles,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSuperAdminPurchaseLeads,
  updatePurchaseLeadStatusAction,
  deletePurchaseLeadAction,
} from "@/app/actions/leads";

interface SuperAdminLeadsManagerProps {
  initialLeads?: any[];
  initialMetrics?: {
    totalLeads: number;
    totalCapturedOnly: number;
    totalCheckoutStarted: number;
    totalPaid: number;
    totalPotentialAmount: number;
    totalConvertedAmount: number;
  };
}

export function SuperAdminLeadsManager({
  initialLeads = [],
  initialMetrics,
}: SuperAdminLeadsManagerProps) {
  const [leads, setLeads] = useState<any[]>(initialLeads);
  const [metrics, setMetrics] = useState(
    initialMetrics || {
      totalLeads: initialLeads.length,
      totalCapturedOnly: 0,
      totalCheckoutStarted: 0,
      totalPaid: 0,
      totalPotentialAmount: 0,
      totalConvertedAmount: 0,
    }
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [productFilter, setProductFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getSuperAdminPurchaseLeads();
      if (res.success) {
        setLeads(res.leads);
        setMetrics(res.metrics);
        toast.success(`Lista de Leads ("Página de Compras") sincronizada (${res.leads.length} registros).`);
      } else {
        toast.error(res.error || "Não foi possível carregar os leads.");
      }
    });
  };

  useEffect(() => {
    let mounted = true;
    getSuperAdminPurchaseLeads()
      .then((res) => {
        if (mounted && res.success) {
          setLeads(res.leads);
          setMetrics(res.metrics);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdateStatus = (leadId: string, newStatus: string) => {
    startTransition(async () => {
      const res = await updatePurchaseLeadStatusAction({
        leadId,
        status: newStatus,
      });
      if (res.success && res.lead) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? res.lead : l)));
        toast.success("Status do Lead atualizado!");
      } else {
        toast.error(res.error || "Falha ao atualizar status do lead.");
      }
    });
  };

  const handleDeleteLead = (leadId: string, leadName: string) => {
    if (!confirm(`Deseja realmente remover o lead "${leadName}" da lista?`)) return;
    startTransition(async () => {
      const res = await deletePurchaseLeadAction(leadId);
      if (res.success) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        toast.success("Lead removido da lista.");
      } else {
        toast.error(res.error || "Não foi possível remover o lead.");
      }
    });
  };

  const filteredLeads = leads.filter((l) => {
    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    const matchesProduct =
      productFilter === "ALL" || l.productType === productFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (l.leadName || "").toLowerCase().includes(q) ||
      (l.leadEmail || "").toLowerCase().includes(q) ||
      (l.leadCpfCnpj || "").toLowerCase().includes(q) ||
      (l.leadPhone || "").toLowerCase().includes(q) ||
      (l.productName || "").toLowerCase().includes(q);
    return matchesStatus && matchesProduct && matchesSearch;
  });

  const handleExportCsv = () => {
    if (filteredLeads.length === 0) {
      toast.info("Nenhum lead para exportar.");
      return;
    }

    const headers = [
      "Classificacao",
      "Data_Hora",
      "Nome",
      "Email",
      "CPF_CNPJ",
      "WhatsApp_Telefone",
      "Tipo_Produto",
      "Produto",
      "Valor_BRL",
      "Forma_Pagamento",
      "Ciclo",
      "Status",
      "Origem",
      "Link_Fatura_Asaas",
    ];

    const rows = filteredLeads.map((l) => [
      `"${(l.classification || "Página de Compras").replace(/"/g, '""')}"`,
      `"${new Date(l.createdAt).toLocaleString("pt-BR")}"`,
      `"${(l.leadName || "").replace(/"/g, '""')}"`,
      `"${(l.leadEmail || "").replace(/"/g, '""')}"`,
      `"${(l.leadCpfCnpj || "").replace(/"/g, '""')}"`,
      `"${(l.leadPhone || "").replace(/"/g, '""')}"`,
      `"${l.productType || "EBOOK"}"`,
      `"${(l.productName || "").replace(/"/g, '""')}"`,
      `"${Number(l.amount || 0).toFixed(2)}"`,
      `"${l.billingType || "PIX"}"`,
      `"${l.billingCycle || "SINGLE"}"`,
      `"${l.status || "CAPTURED"}"`,
      `"${l.sourceUrl || ""}"`,
      `"${l.invoiceUrl || ""}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-pagina-de-compras-horeb-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Planilha CSV de Leads exportada com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-amber-500/10 to-zinc-950 border border-emerald-500/30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5" />
            <span>Classificação Oficial: Página de Compras • Exclusivo Super Admin</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>Central de Leads & Intenções de Compra</span>
          </h2>
          <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed">
            Todo visitante ou membro que informar seus dados pessoais nas páginas de compra (E-books, Ferramentas B2C ou Planos SaaS B2B) fica salvo automaticamente aqui com <strong>Nome, E-mail, CPF/CNPJ, WhatsApp, Produto, Valor e Forma de Pagamento (PIX Instantâneo ou Cartão)</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-10 px-4 rounded-xl border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV / Excel</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
            <span>Atualizar Leads</span>
          </Button>
        </div>
      </div>

      {/* Cards de Métricas dos Leads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/[0.08] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase">
            <span>Total Leads (Página de Compras)</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">{metrics.totalLeads}</div>
          <p className="text-[11px] text-zinc-400">
            {metrics.totalCapturedOnly} preenchendo • {metrics.totalCheckoutStarted} geraram fatura
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/[0.08] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase">
            <span>Aguardando Pagamento / Follow-up</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">
            {metrics.totalCapturedOnly + metrics.totalCheckoutStarted}
          </div>
          <p className="text-[11px] text-zinc-400">
            Prontos para recuperação em 1 clique via WhatsApp.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/[0.08] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 uppercase">
            <span>Leads Convertidos (Pagos)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{metrics.totalPaid}</div>
          <p className="text-[11px] text-zinc-400">
            R${" "}
            {Number(metrics.totalConvertedAmount || 0).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}{" "}
            confirmados no Asaas.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/[0.08] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase">
            <span>Volume Total em Negociação</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">
            R${" "}
            {Number(metrics.totalPotentialAmount || 0).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-[11px] text-zinc-400">
            Soma de todos os produtos selecionados pelos leads.
          </p>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar lead por nome, e-mail, CPF/CNPJ, WhatsApp ou nome do produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-950 border-white/10 text-xs h-10 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-semibold outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="CAPTURED">Dados Informados (Carrinho/Lead)</option>
            <option value="CHECKOUT_STARTED">Cobrança Gerada (Aguardando PIX/Cartão)</option>
            <option value="PAID">Pago & Convertido</option>
          </select>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="bg-zinc-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-semibold outline-none"
          >
            <option value="ALL">Todos os Produtos</option>
            <option value="EBOOK">E-books Digitais</option>
            <option value="B2C_TOOL">Ferramentas Pessoais (B2C)</option>
            <option value="B2B_PLAN">Planos Congregação (B2B)</option>
          </select>
        </div>
      </div>

      {/* Tabela Completa de Leads ("Página de Compras") */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 overflow-x-auto shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.08] bg-zinc-950/60 text-zinc-400 uppercase text-[10px]">
              <th className="py-3.5 px-4">Data / Classificação</th>
              <th className="py-3.5 px-4">Dados Pessoais do Lead</th>
              <th className="py-3.5 px-4">CPF / CNPJ & Contato</th>
              <th className="py-3.5 px-4">Produto & Origem</th>
              <th className="py-3.5 px-4">Valor & Forma de Pagamento</th>
              <th className="py-3.5 px-4">Status do Lead</th>
              <th className="py-3.5 px-4 text-right">Ações & Recuperação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-400 space-y-2">
                  <ShoppingBag className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
                  <div className="font-bold text-white text-sm">
                    Nenhum Lead encontrado com os filtros selecionados
                  </div>
                  <p className="text-xs text-zinc-500">
                    Assim que um visitante preencher os dados na página de compras, o registro completo aparecerá automaticamente aqui.
                  </p>
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const isPaid = lead.status === "PAID";
                const isCheckout = lead.status === "CHECKOUT_STARTED";
                const cleanPhone = (lead.leadPhone || "").replace(/\D/g, "");
                const waPhone = cleanPhone
                  ? cleanPhone.startsWith("55")
                    ? cleanPhone
                    : `55${cleanPhone}`
                  : "";

                const priceStr = Number(lead.amount || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                });

                const waMessage = [
                  `Olá, *${lead.leadName || "Cliente"}*! A paz do Senhor! 🙏`,
                  `Vi que você iniciou o pedido de *${lead.productName}* (R$ ${priceStr}) na nossa Página de Compras Horeb.`,
                  lead.invoiceUrl
                    ? `Aqui está o link direto da sua fatura Asaas (${lead.billingType === "CREDIT_CARD" ? "Cartão de Crédito" : "PIX Instantâneo"}):\n${lead.invoiceUrl}`
                    : `Posso te ajudar a concluir sua liberação imediata via ${lead.billingType === "CREDIT_CARD" ? "Cartão" : "PIX Instantâneo"}?`,
                ].join("\n\n");

                return (
                  <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Data e Classificação */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-[10px] uppercase">
                        <Tag className="w-2.5 h-2.5" />
                        {lead.classification || "Página de Compras"}
                      </span>
                      <div className="text-[11px] text-zinc-400 font-mono mt-1">
                        {new Date(lead.createdAt).toLocaleDateString("pt-BR")}{" "}
                        {new Date(lead.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Nome e E-mail */}
                    <td className="py-3.5 px-4">
                      <div className="font-black text-white text-xs sm:text-sm">
                        {lead.leadName || "Visitante"}
                      </div>
                      <div className="text-[11px] text-amber-300/90 font-mono select-all">
                        {lead.leadEmail}
                      </div>
                    </td>

                    {/* CPF/CNPJ e WhatsApp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-zinc-200">
                        CPF/CNPJ:{" "}
                        <strong className="text-white select-all">
                          {lead.leadCpfCnpj || "Não informado"}
                        </strong>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono mt-0.5 select-all">
                        WhatsApp: {lead.leadPhone || "Não informado"}
                      </div>
                    </td>

                    {/* Produto e Origem */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 font-bold text-white">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{lead.productName}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold mt-0.5">
                        Tipo:{" "}
                        <span className="text-zinc-200">
                          {lead.productType === "EBOOK"
                            ? "E-book Digital (PDF)"
                            : lead.productType === "B2C_TOOL"
                            ? "Ferramenta Pessoal B2C"
                            : "Assinatura SaaS B2B"}
                        </span>
                        {lead.sourceUrl ? ` • ${lead.sourceUrl}` : ""}
                      </div>
                    </td>

                    {/* Valor e Forma de Pagamento */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-sm font-black text-amber-400">
                        R$ {priceStr}
                        {lead.billingCycle && lead.billingCycle !== "SINGLE" && (
                          <span className="text-[10px] text-zinc-400 font-normal ml-1">
                            /{lead.billingCycle === "YEARLY" ? "ano" : "mês"}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        {lead.billingType === "CREDIT_CARD" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            <CreditCard className="w-3 h-3" />
                            Cartão de Crédito
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                            <QrCode className="w-3 h-3" />
                            PIX Instantâneo
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={lead.status || "CAPTURED"}
                        onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                        disabled={isPending}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border outline-none cursor-pointer ${
                          isPaid
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : isCheckout
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                        }`}
                      >
                        <option value="CAPTURED" className="bg-zinc-950 text-blue-300">
                          DADOS CAPTURADOS
                        </option>
                        <option value="CHECKOUT_STARTED" className="bg-zinc-950 text-amber-300">
                          FATURA GERADA (AGUARDANDO)
                        </option>
                        <option value="PAID" className="bg-zinc-950 text-emerald-300">
                          PAGO & CONVERTIDO
                        </option>
                      </select>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={
                            waPhone
                              ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`
                              : `https://wa.me/?text=${encodeURIComponent(waMessage)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]"
                          title="Chamar Lead no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>

                        {lead.invoiceUrl && (
                          <a
                            href={lead.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-[11px]"
                            title="Abrir Fatura Asaas do Lead"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Fatura</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id, lead.leadName)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 cursor-pointer"
                          title="Excluir Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

