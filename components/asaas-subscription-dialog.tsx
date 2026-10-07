"use client";

import React, { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  QrCode,
  FileText,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  X,
  ShieldCheck,
  Zap,
  Tag,
  Percent,
} from "lucide-react";
import {
  createTenantSubscription,
  getTenantSubscriptionDetails,
  cancelTenantSubscriptionAction,
  syncTenantAsaasInvoices,
  getAsaasIntegrationStatus,
} from "@/app/actions/subscriptions";
import { validateDiscountCoupon } from "@/app/actions/coupons";

interface AsaasSubscriptionDialogProps {
  tenant: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedTenant: any) => void;
}

export function AsaasSubscriptionDialog({
  tenant,
  isOpen,
  onClose,
  onUpdate,
}: AsaasSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [integrationStatus, setIntegrationStatus] = useState<{
    isConfigured: boolean;
    environment: string;
  }>({ isConfigured: false, environment: "sandbox" });

  // Formulário para gerar assinatura
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billingType, setBillingType] = useState<"UNDEFINED" | "PIX" | "BOLETO" | "CREDIT_CARD">(
    "UNDEFINED"
  );
  const [selectedPlan, setSelectedPlan] = useState<string>("GESTAO");
  const [selectedPrice, setSelectedPrice] = useState<number>(249);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent: number;
    description?: string | null;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [isSubmitting, startTransition] = useTransition();
  const [pixCopied, setPixCopied] = useState(false);

  // Carrega status ao abrir
  useEffect(() => {
    if (!isOpen || !tenant) return;

    setCpfCnpj(tenant.pixKeyType === "CNPJ" || tenant.pixKeyType === "CPF" ? tenant.pixKey || "" : "");
    setCustomerEmail(tenant.pastorEmail || "");
    setCustomerPhone(tenant.phone || "");
    setSelectedPlan(tenant.plan || "GESTAO");
    setBillingCycle((tenant.billingCycle as "MONTHLY" | "YEARLY") || "MONTHLY");
    setSelectedPrice(
      tenant.monthlyPrice ||
        (tenant.plan === "PREMIUM" ? 399 : tenant.plan === "ESSENCIAL" ? 149 : 249)
    );

    if (tenant.couponCode && tenant.discountPercent) {
      setAppliedCoupon({
        code: tenant.couponCode,
        discountPercent: tenant.discountPercent,
      });
      setCouponCode(tenant.couponCode);
    }

    async function loadData() {
      setLoading(true);
      const [statusRes, detailsRes] = await Promise.all([
        getAsaasIntegrationStatus(),
        getTenantSubscriptionDetails(tenant.id),
      ]);

      setIntegrationStatus(statusRes);
      if (detailsRes.success && detailsRes.data) {
        setDetails(detailsRes.data);
      }
      setLoading(false);
    }

    loadData();
  }, [isOpen, tenant]);

  if (!isOpen || !tenant) return null;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Digite o código do cupom");
      return;
    }
    setValidatingCoupon(true);
    try {
      const res = await validateDiscountCoupon(couponCode);
      if (res.valid && res.code) {
        setAppliedCoupon({
          code: res.code,
          discountPercent: res.discountPercent || 0,
          description: res.description || null,
        });
        toast.success(`Palavra-chave ${res.code} ativada: ${res.discountPercent}% de desconto!`);
      } else {
        toast.error(res.error || "Cupom inválido ou expirado");
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao validar cupom");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.info("Cupom removido");
  };

  const handleCreateSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpfCnpj.trim()) {
      toast.error("Informe o CNPJ da igreja ou CPF do pastor responsável.");
      return;
    }
    if (!customerEmail.trim()) {
      toast.error("Informe o e-mail para envio das faturas do Asaas.");
      return;
    }

    startTransition(async () => {
      const res = await createTenantSubscription({
        tenantId: tenant.id,
        cpfCnpj,
        customerEmail,
        customerPhone,
        billingType,
        planSlug: selectedPlan,
        monthlyPrice: selectedPrice,
        billingCycle,
        couponCode: appliedCoupon?.code,
      });

      if (res.success) {
        toast.success("Assinatura criada com sucesso no Asaas!");
        // Recarrega detalhes
        const detailsRes = await getTenantSubscriptionDetails(tenant.id);
        if (detailsRes.success && detailsRes.data) {
          setDetails(detailsRes.data);
          onUpdate?.(detailsRes.data);
        }
      } else {
        toast.error(res.error || "Erro ao gerar assinatura no Asaas.");
      }
    });
  };

  const handleSyncInvoices = async () => {
    startTransition(async () => {
      const res = await syncTenantAsaasInvoices(tenant.id);
      if (res.success) {
        toast.success(`Faturas sincronizadas com sucesso (${res.count} faturas encontradas).`);
        const detailsRes = await getTenantSubscriptionDetails(tenant.id);
        if (detailsRes.success && detailsRes.data) {
          setDetails(detailsRes.data);
        }
      } else {
        toast.error(res.error || "Erro ao sincronizar com Asaas.");
      }
    });
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Deseja realmente cancelar a assinatura desta igreja no Asaas? O cancelamento é imediato.")) {
      return;
    }

    startTransition(async () => {
      const res = await cancelTenantSubscriptionAction(tenant.id);
      if (res.success) {
        toast.success("Assinatura cancelada no Asaas com sucesso.");
        const detailsRes = await getTenantSubscriptionDetails(tenant.id);
        if (detailsRes.success && detailsRes.data) {
          setDetails(detailsRes.data);
          onUpdate?.(detailsRes.data);
        }
      } else {
        toast.error(res.error || "Erro ao cancelar assinatura.");
      }
    });
  };

  const handleCopyPix = (code: string) => {
    navigator.clipboard.writeText(code);
    setPixCopied(true);
    toast.success("Código PIX Copia-e-Cola copiado para a área de transferência!");
    setTimeout(() => setPixCopied(false), 3000);
  };

  const hasAsaasSubscription = Boolean(details?.asaasSubscriptionId || tenant.asaasSubscriptionId);
  const latestInvoice = details?.invoices?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-border bg-card/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center font-black">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground flex items-center gap-2">
                <span>Cobrança Recorrente Asaas</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {integrationStatus.environment.toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Igreja: <strong className="text-foreground">{tenant.name}</strong> • Plano:{" "}
                <span className="text-amber-400 font-bold">{tenant.plan}</span> (R${" "}
                {tenant.monthlyPrice || 249}/mês)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Alerta se Asaas não estiver configurado no .env */}
          {!integrationStatus.isConfigured && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Chave de API do Asaas não configurada</span>
                <p className="text-amber-300/80">
                  Para gerar assinaturas reais no Asaas, defina a variável{" "}
                  <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-[11px]">
                    ASAAS_API_KEY
                  </code>{" "}
                  no arquivo <code className="font-mono">.env</code> do servidor.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">Carregando dados da assinatura Asaas...</span>
            </div>
          ) : hasAsaasSubscription ? (
            /* ========================================================== */
            /* ASSINATURA JÁ ATIVA NO ASAAS                              */
            /* ========================================================== */
            <div className="space-y-6">
              {/* Card Resumo da Assinatura */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    ID do Cliente Asaas
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground select-all">
                    {details?.asaasCustomerId || tenant.asaasCustomerId || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    ID da Assinatura
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-400 select-all">
                    {details?.asaasSubscriptionId || tenant.asaasSubscriptionId || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Status no Sistema
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mt-1 ${
                      tenant.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{tenant.status}</span>
                  </span>
                </div>
              </div>

              {/* Última Fatura / Pagamento Ativo */}
              {latestInvoice && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-background to-background border border-amber-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-foreground">
                        Fatura Mais Recente (R$ {latestInvoice.amount?.toFixed(2)})
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                        latestInvoice.status === "RECEIVED" || latestInvoice.status === "CONFIRMED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : latestInvoice.status === "OVERDUE"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}
                    >
                      {latestInvoice.status === "RECEIVED" ? "PAGA" : latestInvoice.status}
                    </span>
                  </div>

                  {/* PIX Copia e Cola */}
                  {latestInvoice.pixQrCode && (
                    <div className="space-y-2 pt-1">
                      <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-amber-400" />
                        <span>PIX Copia e Cola para Pagamento Imediato:</span>
                      </label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={latestInvoice.pixQrCode}
                          className="font-mono text-[11px] bg-background text-muted-foreground select-all"
                        />
                        <Button
                          type="button"
                          onClick={() => handleCopyPix(latestInvoice.pixQrCode)}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs gap-1.5 shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{pixCopied ? "Copiado!" : "Copiar"}</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Links da Fatura e Boleto */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {latestInvoice.invoiceUrl && (
                      <a
                        href={latestInvoice.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Link da Fatura no Asaas</span>
                      </a>
                    )}
                    {latestInvoice.bankSlipUrl && (
                      <a
                        href={latestInvoice.bankSlipUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-muted/60 hover:bg-muted px-3 py-1.5 rounded-lg border border-border transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Baixar Boleto PDF</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Tabela de Histórico de Faturas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Histórico de Cobranças Recorrentes
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncInvoices}
                    disabled={isSubmitting}
                    className="h-7 text-[11px] gap-1.5 border-border bg-card hover:bg-muted"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSubmitting ? "animate-spin" : ""}`} />
                    <span>Sincronizar com Asaas</span>
                  </Button>
                </div>

                <div className="rounded-xl border border-border overflow-hidden bg-card/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/30 border-b border-border text-[10px] text-muted-foreground uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Vencimento</th>
                        <th className="py-2.5 px-3">Valor</th>
                        <th className="py-2.5 px-3">Forma</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {details?.invoices && details.invoices.length > 0 ? (
                        details.invoices.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-mono">
                              {new Date(inv.dueDate).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-foreground">
                              R$ {inv.amount?.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 uppercase text-[10px] text-muted-foreground">
                              {inv.billingType || "UNDEFINED"}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  inv.status === "RECEIVED" || inv.status === "CONFIRMED"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : inv.status === "OVERDUE"
                                    ? "bg-rose-500/20 text-rose-400"
                                    : "bg-amber-500/20 text-amber-400"
                                }`}
                              >
                                {inv.status === "RECEIVED" ? "PAGO" : inv.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {inv.invoiceUrl ? (
                                <a
                                  href={inv.invoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1"
                                >
                                  <span>Fatura</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-muted-foreground">
                            Nenhuma fatura registrada ainda. Clique em "Sincronizar com Asaas".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botão de Cancelamento */}
              <div className="pt-2 flex justify-between items-center border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  A cobrança é gerada todo mês automaticamente pelo Asaas.
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleCancelSubscription}
                  disabled={isSubmitting}
                  className="text-xs font-bold h-8"
                >
                  Cancelar Assinatura no Asaas
                </Button>
              </div>
            </div>
          ) : (
            /* ========================================================== */
            /* FORMULÁRIO DE NOVA ASSINATURA NO ASAAS                     */
            /* ========================================================== */
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Configurar Assinatura Mensal Automatizada</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ao gerar a assinatura, o Asaas criará o cliente, gerará a primeira cobrança com PIX
                  instantâneo e boleto, e enviará as faturas mensais por e-mail automaticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    CNPJ da Igreja ou CPF do Pastor *
                  </label>
                  <Input
                    required
                    placeholder="00.000.000/0001-00 ou CPF"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    className="bg-card text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Obrigatório para emissão fiscal no Asaas.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    E-mail para Faturamento / Faturas *
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="financeiro@igreja.com.br"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="bg-card text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    O Asaas enviará as faturas e comprovantes para este e-mail.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Telefone / WhatsApp (Opcional)
                  </label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="bg-card text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Para avisos de vencimento por SMS/WhatsApp via Asaas.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Ciclo de Pagamento *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBillingCycle("MONTHLY")}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all text-left flex items-center justify-between ${
                        billingCycle === "MONTHLY"
                          ? "border-amber-500 bg-amber-500/10 text-amber-400"
                          : "border-border bg-card/60 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <div>
                        <span className="block font-black">Mensal</span>
                        <span className="text-[10px] opacity-75">Por mês</span>
                      </div>
                      {billingCycle === "MONTHLY" && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle("YEARLY")}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all text-left flex items-center justify-between ${
                        billingCycle === "YEARLY"
                          ? "border-amber-500 bg-amber-500/10 text-amber-400"
                          : "border-border bg-card/60 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <div>
                        <span className="block font-black flex items-center gap-1">
                          <span>Anual</span>
                          <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                            2 Meses OFF
                          </span>
                        </span>
                        <span className="text-[10px] opacity-75">10x o valor</span>
                      </div>
                      {billingCycle === "YEARLY" && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Plano do Horeb *
                  </label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => {
                      const p = e.target.value;
                      setSelectedPlan(p);
                      if (p === "ESSENCIAL") setSelectedPrice(149);
                      else if (p === "GESTAO") setSelectedPrice(249);
                      else if (p === "PREMIUM") setSelectedPrice(399);
                    }}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground font-bold outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ESSENCIAL">Plano Essencial — R$ 149 /mês</option>
                    <option value="GESTAO">Plano Gestão — R$ 249 /mês (Mais Escolhido)</option>
                    <option value="PREMIUM">Plano Premium — R$ 399 /mês (Completo)</option>
                  </select>
                  <span className="text-[10px] text-muted-foreground">
                    Define quais módulos do sistema estarão liberados para a congregação.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Forma de Pagamento Preferencial
                  </label>
                  <select
                    value={billingType}
                    onChange={(e: any) => setBillingType(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground font-semibold outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="UNDEFINED">Qualquer Forma (PIX, Boleto ou Cartão)</option>
                    <option value="PIX">Somente PIX Instantâneo</option>
                    <option value="BOLETO">Somente Boleto Bancário</option>
                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                  </select>
                  <span className="text-[10px] text-muted-foreground">
                    O pastor poderá escolher a forma desejada na fatura do Asaas.
                  </span>
                </div>
              </div>

              {/* Campo para Palavra-chave / Cupom de Desconto */}
              <div className="p-3.5 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Palavra-chave / Cupom de Desconto</span>
                  </label>
                  {appliedCoupon && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {appliedCoupon.discountPercent}% DE DESCONTO APLICADO
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: HOREB20, PASTORVIP"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={Boolean(appliedCoupon) || validatingCoupon}
                    className="bg-background text-xs font-mono uppercase font-bold"
                  />
                  {appliedCoupon ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      className="text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 shrink-0 font-bold"
                    >
                      Remover
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-black shrink-0 px-4"
                    >
                      {validatingCoupon ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Validar Cupom"}
                    </Button>
                  )}
                </div>
                {appliedCoupon?.description && (
                  <p className="text-[11px] text-emerald-400/90 font-medium">
                    {appliedCoupon.description}
                  </p>
                )}
              </div>

              {/* Resumo Financeiro & 30 Dias Gratuitos */}
              {(() => {
                const baseAmount = billingCycle === "YEARLY" ? selectedPrice * 10 : selectedPrice;
                const discountAmount = appliedCoupon
                  ? Math.round(baseAmount * (appliedCoupon.discountPercent / 100))
                  : 0;
                const finalAmount = baseAmount - discountAmount;

                return (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          ⭐ 30 Dias de Degustação Gratuita
                        </span>
                        {billingCycle === "YEARLY" && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            Ciclo Anual
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="text-xl font-black text-amber-400">
                          R$ {finalAmount},00
                        </span>
                        {discountAmount > 0 && (
                          <span className="text-xs line-through text-muted-foreground">
                            R$ {baseAmount},00
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground font-normal">
                          {billingCycle === "YEARLY" ? "/ano (12 meses)" : "/mês"}
                        </span>
                      </div>
                      {discountAmount > 0 && (
                        <span className="text-[11px] font-bold text-emerald-400 block mt-0.5">
                          Economia de R$ {discountAmount},00 com o cupom {appliedCoupon?.code}
                        </span>
                      )}
                    </div>
                    <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                      <span className="text-muted-foreground block text-[11px]">Primeiro Vencimento no Asaas:</span>
                      <span className="font-bold text-emerald-400 block text-xs">
                        R$ 0,00 hoje (1ª fatura em 30 dias)
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="text-xs border-border"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-6 gap-2 shadow-lg shadow-amber-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Conectando ao Asaas...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Gerar Assinatura no Asaas</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
