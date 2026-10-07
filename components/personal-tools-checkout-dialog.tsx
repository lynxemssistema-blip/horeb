"use client";

import React, { useState } from "react";
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
  Camera,
  CheckCircle2,
  QrCode,
  CreditCard,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  Loader2,
  Check,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  subscribePersonalToolsAsaas,
  startPersonalToolsTrial,
  PersonalToolsConfigData,
} from "@/app/actions/personal-tools";

interface PersonalToolsCheckoutDialogProps {
  config: PersonalToolsConfigData;
  user: {
    id: string;
    name?: string;
    email?: string;
    cpf?: string;
    phone?: string;
  };
  churchSlug: string;
  triggerButton?: React.ReactNode;
  defaultMode?: "trial" | "checkout";
  onSuccess?: () => void;
}

export function PersonalToolsCheckoutDialog({
  config,
  user,
  churchSlug,
  triggerButton,
  defaultMode = "checkout",
  onSuccess,
}: PersonalToolsCheckoutDialogProps) {
  const [open, setOpen] = useState(false);
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [billingType, setBillingType] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [cpfCnpj, setCpfCnpj] = useState(user.cpf || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [isLoading, setIsLoading] = useState(false);

  // Resultado do Checkout Asaas
  const [pixData, setPixData] = useState<{
    pixQrCode?: string;
    pixQrCodeImage?: string;
    invoiceUrl?: string;
    amount?: number;
  } | null>(null);

  const [copiedPix, setCopiedPix] = useState(false);

  const priceToPay = cycle === "YEARLY" ? config.annualPrice : config.monthlyPrice;

  // Iniciar Degustação Gratuita
  const handleStartTrial = async () => {
    setIsLoading(true);
    try {
      const res = await startPersonalToolsTrial(user.id);
      if (res.success) {
        toast.success(`🎉 Degustação de ${config.trialDays} dias ativada com sucesso!`);
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error || "Erro ao ativar degustação.");
      }
    } catch {
      toast.error("Erro de conexão ao ativar teste.");
    } finally {
      setIsLoading(false);
    }
  };

  // Contratar via Asaas
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpfCnpj.trim() || cpfCnpj.replace(/\D/g, "").length < 11) {
      toast.error("Informe um CPF ou CNPJ válido para emissão da cobrança Asaas.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await subscribePersonalToolsAsaas({
        userId: user.id,
        cpfCnpj,
        phone,
        cycle,
        billingType,
        churchSlug,
      });

      if (res.success) {
        if (res.pixQrCode || res.invoiceUrl) {
          setPixData({
            pixQrCode: res.pixQrCode,
            pixQrCodeImage: res.pixQrCodeImage,
            invoiceUrl: res.invoiceUrl,
            amount: res.amount,
          });
          toast.success("Assinatura gerada no Asaas! Efetue o pagamento para confirmação imediata.");
        } else {
          toast.success("Assinatura confirmada com sucesso!");
          setOpen(false);
          onSuccess?.();
        }
      } else {
        toast.error(res.error || "Erro ao processar assinatura no Asaas.");
      }
    } catch {
      toast.error("Erro de conexão com o gateway Asaas.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyPixCode = () => {
    if (!pixData?.pixQrCode) return;
    navigator.clipboard.writeText(pixData.pixQrCode);
    setCopiedPix(true);
    toast.success("Código PIX Copia e Cola copiado!");
    setTimeout(() => setCopiedPix(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (triggerButton as React.ReactElement) || (
            <Button className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-black text-xs h-10 px-4 rounded-xl gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer">
              <Camera className="w-4 h-4" />
              <span>Assinar Módulo (Asaas)</span>
            </Button>
          )
        }
      />

      <DialogContent className="w-[94vw] max-w-lg max-h-[90dvh] overflow-y-auto p-0 rounded-3xl bg-zinc-950 border border-pink-500/40 text-white shadow-[0_25px_80px_rgba(0,0,0,0.95)]">
        {/* Glow de Topo */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-36 bg-pink-500/15 blur-3xl rounded-full" />

        {/* Header */}
        <div className="p-5 sm:p-6 pb-3 border-b border-white/10 relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-pink-400" />
            <span>{config.badge}</span>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{config.title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Contratação individual avulsa para membros e líderes. Pagamento seguro processado pelo Asaas.
          </DialogDescription>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-5 relative z-10">
          {!pixData ? (
            <form onSubmit={handleCheckout} className="space-y-4">
              {/* Card de Recursos Inclusos */}
              <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>O que você terá acesso liberado:</span>
                </span>
                <ul className="text-xs text-zinc-300 space-y-1.5">
                  {config.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Seletor Ciclo Mensal vs Anual */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Escolha o Período:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCycle("MONTHLY")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      cycle === "MONTHLY"
                        ? "bg-pink-500/20 border-pink-500 text-white shadow-md shadow-pink-500/20"
                        : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold text-pink-400 block">Mensal</span>
                    <span className="text-base font-black text-white">
                      R$ {config.monthlyPrice.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">Cobrança mês a mês</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCycle("YEARLY")}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      cycle === "YEARLY"
                        ? "bg-pink-500/20 border-pink-500 text-white shadow-md shadow-pink-500/20"
                        : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <div className="absolute top-2 right-2 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500 text-black">
                      Economize 20%
                    </div>
                    <span className="text-[10px] uppercase font-bold text-pink-400 block">Anual VIP</span>
                    <span className="text-base font-black text-white">
                      R$ {config.annualPrice.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">Acesso por 12 meses</span>
                  </button>
                </div>
              </div>

              {/* Seletor Forma de Pagamento */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">Forma de Pagamento (Asaas):</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingType("PIX")}
                    className={`h-11 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      billingType === "PIX"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10"
                        : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>PIX Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingType("CREDIT_CARD")}
                    className={`h-11 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      billingType === "CREDIT_CARD"
                        ? "bg-pink-500/20 border-pink-500 text-pink-300 shadow-md shadow-pink-500/10"
                        : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-pink-400" />
                    <span>Cartão de Crédito</span>
                  </button>
                </div>
              </div>

              {/* Dados do Pagador Exigidos pelo Asaas */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="cpf" className="text-xs font-semibold text-zinc-300">
                    CPF ou CNPJ do Pagador (Obrigatório Asaas):
                  </Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    required
                    className="bg-zinc-900 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs font-semibold text-zinc-300">
                    WhatsApp para Receber Confirmação (Opcional):
                  </Label>
                  <Input
                    id="phone"
                    placeholder="(00) 90000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-zinc-900 border-white/15 text-white h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Botão de Contratação Asaas */}
              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:brightness-110 text-white font-black text-sm shadow-xl shadow-pink-500/30 gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-white" />
                      <span>
                        Pagar R$ {priceToPay.toFixed(2).replace(".", ",")} via {billingType} (Asaas)
                      </span>
                    </>
                  )}
                </Button>

                {/* Opção de Teste Gratuito de 7 Dias */}
                {config.trialDays > 0 && (
                  <button
                    type="button"
                    onClick={handleStartTrial}
                    disabled={isLoading}
                    className="w-full py-2.5 text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors text-center block cursor-pointer"
                  >
                    Ou clique aqui para começar com {config.trialDays} Dias de Degustação 100% Grátis ➔
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* Tela do PIX Gerado pelo Asaas */
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <QrCode className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">QR Code PIX do Asaas Gerado!</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Valor a pagar:{" "}
                  <strong className="text-emerald-400">
                    R$ {pixData.amount?.toFixed(2).replace(".", ",")}
                  </strong>
                </p>
              </div>

              {/* Imagem do QR Code se disponível */}
              {pixData.pixQrCodeImage && (
                <div className="p-3 bg-white rounded-2xl w-fit mx-auto shadow-xl">
                  <img
                    src={`data:image/png;base64,${pixData.pixQrCodeImage}`}
                    alt="QR Code PIX Asaas"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
              )}

              {/* Botão Copia e Cola */}
              {pixData.pixQrCode && (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-white/10 text-[11px] font-mono text-zinc-300 break-all select-all text-left max-h-20 overflow-y-auto">
                    {pixData.pixQrCode}
                  </div>

                  <Button
                    type="button"
                    onClick={copyPixCode}
                    className={`w-full h-11 rounded-xl text-xs font-bold gap-2 ${
                      copiedPix
                        ? "bg-emerald-600 text-white"
                        : "bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/20"
                    }`}
                  >
                    {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPix ? "Código PIX Copiado!" : "Copiar Código PIX Copia e Cola"}</span>
                  </Button>
                </div>
              )}

              {/* Link Público da Fatura Asaas */}
              {pixData.invoiceUrl && (
                <a
                  href={pixData.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 font-bold pt-1"
                >
                  <span>Abrir fatura completa no Asaas</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPixData(null)}
                  className="text-xs border-white/15 text-zinc-400"
                >
                  Voltar
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onSuccess?.();
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs"
                >
                  Já Paguei • Concluir
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
