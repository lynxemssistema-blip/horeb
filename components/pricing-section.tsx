"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateChurchDialog } from "@/components/create-church-dialog";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Building2,
  ShieldCheck,
  Gift,
  ArrowRight,
  HelpCircle,
  Clock,
  Laptop,
  HeartHandshake,
} from "lucide-react";

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
}

interface PromoConfigOption {
  id?: string;
  active?: boolean;
  badge?: string;
  title?: string;
  description?: string;
  discountPercent?: number;
  currentCount?: number;
  targetCount?: number;
  validityText?: string;
  ctaText?: string;
}

interface PricingSectionProps {
  existingTenants: TenantOption[];
  promoConfig?: PromoConfigOption;
}

export function PricingSection({ existingTenants, promoConfig }: PricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  // Configurações com fallback caso não venha do banco
  const promo = promoConfig || {
    active: true,
    badge: "CONDIÇÃO EXCLUSIVA DE LANÇAMENTO",
    title: "Programa Especial: Primeiras 100 Igrejas de Outubro/2026",
    description:
      "Para as primeiras 100 igrejas parceiras do mês de outubro/2026, oferecemos implantação 100% gratuita, acompanhamento presencial na secretaria e treinamento VIP de liderança. Em troca, construiremos juntos seu case de sucesso ministerial.",
    discountPercent: 50,
    currentCount: 63,
    targetCount: 100,
    validityText: "Válido até 31 de Outubro de 2026",
    ctaText: "Garantir Minha Vaga (Implantação Grátis)",
  };

  const currentCount = promo.currentCount ?? 63;
  const targetCount = promo.targetCount ?? 100;
  const percentage = Math.min(100, Math.round((currentCount / (targetCount || 1)) * 100));

  const plans = [
    {
      id: "essencial",
      name: "Essencial",
      subtitle: "Para igrejas pequenas e comunidades em formação",
      badge: "30 DIAS GRÁTIS",
      priceMonthly: 149,
      priceAnnual: 1490, // 10x mensalidade (2 meses grátis)
      targetAudience: "Até ~150 membros",
      description:
        "Tudo o que sua congregação precisa para organizar o cadastro, fortalecer a comunicação e agilizar ofertas com PIX.",
      features: [
        "Cadastro e gestão de membros e visitantes",
        "Área do membro personalizada (PWA no celular)",
        "Mural de comunicados e avisos oficiais",
        "Agenda de cultos e eventos semanais",
        "Pedidos de oração interativos",
        "Conteúdos e devocionais diários",
        "Módulo Dízimos e Ofertas via PIX Instantâneo",
        "Notificações para membros",
        "Painel administrativo para liderança",
        "Suporte técnico via WhatsApp",
      ],
      highlight: false,
      ctaText: "Começar com Essencial",
      cardBorder: "border-white/[0.08]",
      cardBg: "bg-white/[0.02]",
      badgeColor: "bg-zinc-800 text-zinc-300",
    },
    {
      id: "gestao",
      name: "Gestão",
      subtitle: "O plano principal para igrejas médias em franco crescimento",
      badge: "PADRÃO DO TESTE DE 30 DIAS",
      priceMonthly: 249,
      priceAnnual: 2490, // 10x mensalidade (2 meses grátis)
      targetAudience: "Igrejas de 150 a 600 membros",
      description:
        "A estrutura ideal para organizar ministérios, células nos lares, escalas de louvor/diaconia e a saúde financeira.",
      features: [
        "TUDO do Plano Essencial, mais:",
        "Gestão completa de Ministérios e Líderes",
        "Células e Pequenos Grupos nos lares",
        "Escalas de equipes, louvor e diaconia",
        "Controle de presença em cultos e células",
        "Gestão de eventos e inscrições",
        "Gestão Financeira completa (entradas, saídas e relatórios)",
        "Segmentação inteligente de membros",
        "Notificações segmentadas por grupos/ministérios",
        "Suporte prioritário ágil",
      ],
      highlight: true,
      ctaText: "Escolher Plano Gestão",
      cardBorder: "border-amber-500/50 shadow-2xl shadow-amber-500/10",
      cardBg: "bg-gradient-to-b from-amber-500/[0.08] via-zinc-900/90 to-zinc-900/95",
      badgeColor: "bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black",
    },
    {
      id: "premium",
      name: "Premium",
      subtitle: "Para igrejas maiores, catedrais e redes com congregações",
      badge: "MULTISSEDE VIP • 30 DIAS GRÁTIS",
      priceMonthly: 399,
      priceAnnual: 3990, // 10x mensalidade (2 meses grátis)
      targetAudience: "Acima de 600 membros ou multissede",
      description:
        "Ecossistema completo com gestão de matriz e congregações integradas, Check-in Kids seguro e EBD avançada.",
      features: [
        "TUDO do Plano Gestão, mais:",
        "Múltiplas congregações (Matriz e Filiais integradas)",
        "Gestão avançada de pastores e liderança geral",
        "EBD (Escola Bíblica Dominical) e cursos",
        "Check-in Kids com etiquetas e código de segurança",
        "Relatórios analíticos e auditoria avançada",
        "Múltiplos administradores com permissões granulares",
        "Personalizações exclusivas de marca e cores",
        "Integrações via API e automações",
        "Suporte VIP dedicado com gerente de conta",
      ],
      highlight: false,
      ctaText: "Contratar Premium",
      cardBorder: "border-purple-500/30",
      cardBg: "bg-gradient-to-b from-purple-500/[0.04] via-zinc-900/80 to-zinc-900/90",
      badgeColor: "bg-purple-500/20 text-purple-300 border border-purple-500/40",
    },
  ];

  return (
    <section className="space-y-12 pt-10" id="planos">
      {/* Cabeçalho da Seção */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-black tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>⭐ 30 Dias Grátis • Entre Direto no Plano Gestão</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold tracking-widest uppercase">
            <Zap className="w-3.5 h-3.5" />
            <span>Sem Cartão de Crédito</span>
          </div>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
          Planos sob medida para o{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
            crescimento do seu ministério
          </span>
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
          Sem taxa de implantação (R$ 0,00) e com 30 dias de degustação gratuita em todos os planos. Escolha entre mensalidade sem fidelidade ou anuidade com desconto especial. Desenvolvido pela <strong>Lynx EMS Sistemas</strong>.
        </p>

        {/* Seletor Segmentado Mensal vs Anual */}
        <div className="flex items-center justify-center pt-2">
          <div className="p-1 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center gap-1 shadow-xl">
            <button
              type="button"
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === "MONTHLY"
                  ? "bg-amber-500 text-black shadow-md font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Cobrança Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("YEARLY")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                billingCycle === "YEARLY"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Plano Anual</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                  billingCycle === "YEARLY"
                    ? "bg-black/25 text-black"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                }`}
              >
                2 Meses Grátis
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid com os 3 Planos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${plan.cardBg} border ${plan.cardBorder} backdrop-blur-xl group hover:border-amber-400/60`}
          >
            {/* Badge de Destaque */}
            {plan.badge && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span
                  className={`text-[11px] font-black tracking-wider uppercase px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 ${plan.badgeColor}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {plan.badge}
                </span>
              </div>
            )}

            <div>
              {/* Header do Card */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white group-hover:text-amber-300 transition-colors">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">{plan.subtitle}</p>
                </div>
                {plan.id === "essencial" && (
                  <Building2 className="w-6 h-6 text-zinc-500 shrink-0" />
                )}
                {plan.id === "gestao" && (
                  <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
                )}
                {plan.id === "premium" && (
                  <Crown className="w-6 h-6 text-purple-400 shrink-0" />
                )}
              </div>

              {/* Preço Dinâmico (Mensal ou Anual com Desconto) */}
              <div className="mt-6 pb-6 border-b border-white/[0.08]">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-semibold text-zinc-400">R$</span>
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {billingCycle === "YEARLY"
                      ? Math.round(plan.priceAnnual / 12)
                      : plan.priceMonthly}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">/mês</span>
                </div>

                {billingCycle === "YEARLY" ? (
                  <div className="mt-2 text-xs font-bold text-emerald-400">
                    R$ {plan.priceAnnual},00 /ano • <span className="underline">2 meses grátis</span> (economia de R$ {plan.priceMonthly * 2},00)
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-amber-400/90 font-semibold">
                    Cobrança mensal regular sem fidelidade
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between text-xs bg-emerald-500/10 rounded-xl px-3 py-2 border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Taxa de Implantação:</span>
                  </span>
                  <span className="font-black text-emerald-400 uppercase text-[11px] tracking-wider">
                    Zero • Gratuita (R$ 0,00)
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs bg-amber-500/10 rounded-xl px-3 py-1.5 border border-amber-500/30">
                  <span className="text-amber-300 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Período de Degustação:</span>
                  </span>
                  <span className="font-bold text-amber-300 text-[11px]">
                    30 Dias Grátis
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
                  {plan.description}
                </p>
              </div>

              {/* Lista de Recursos */}
              <div className="pt-6 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  O que está incluso:
                </span>
                <ul className="space-y-2.5 text-xs text-zinc-300">
                  {plan.features.map((feature, fIdx) => {
                    const isGroupHeader = feature.startsWith("TUDO");
                    return (
                      <li
                        key={fIdx}
                        className={`flex items-start gap-2.5 ${
                          isGroupHeader
                            ? "font-bold text-amber-300 pt-1 border-t border-white/[0.05]"
                            : ""
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-snug">{feature}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* CTA do Plano */}
            <div className="pt-8 mt-auto">
              <CreateChurchDialog
                existingTenants={existingTenants}
                defaultTab="master"
                triggerButton={
                  <Button
                    className={`w-full h-12 rounded-xl font-black text-sm gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg ${
                      plan.highlight
                        ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black hover:brightness-110 shadow-amber-500/20"
                        : "bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12]"
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                }
              />
              <p className="text-[10px] text-center text-zinc-500 mt-2">
                Instalação assistida • Sem contrato de fidelidade
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Banner de Condição Especial: Controlado Dinamicamente pelo Super Admin */}
      {promo.active !== false && (
        <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border-2 border-amber-500/40 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in-0 duration-500">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3.5 max-w-2xl text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                <Gift className="w-3.5 h-3.5" />
                <span>{promo.badge || "CONDIÇÃO EXCLUSIVA DE LANÇAMENTO"}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {promo.title || "Programa Especial: Primeiras 100 Igrejas de Outubro/2026"}
              </h3>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {promo.description ||
                  "Para as primeiras 100 igrejas parceiras do mês de outubro/2026, oferecemos 50% de desconto na taxa de implantação, acompanhamento presencial na secretaria e treinamento VIP de liderança. Em troca, construiremos juntos seu case de sucesso ministerial."}
              </p>

              {/* Contador Dinâmico de Escassez (ex: 63/100) */}
              <div className="space-y-1.5 pt-1 max-w-md mx-auto md:mx-0">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Vagas Preenchidas em Outubro:
                  </span>
                  <span className="font-mono text-white bg-black/60 px-2.5 py-0.5 rounded-lg border border-white/10">
                    <strong className="text-amber-400 font-black">{currentCount}</strong> / {targetCount} vagas ({percentage}%)
                  </span>
                </div>

                <div className="w-full h-3.5 bg-black/60 rounded-full border border-white/15 overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.6)] transition-all duration-700"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {promo.validityText || "Válido até 31 de Outubro de 2026"}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {Math.max(0, targetCount - currentCount)} vagas restantes
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1 text-xs text-zinc-400 justify-center md:justify-start">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Implantação 100% Gratuita (Taxa Zero)
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Treinamento Presencial da Equipe
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Suporte VIP Direto no WhatsApp
                </span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-2">
              <CreateChurchDialog
                existingTenants={existingTenants}
                defaultTab="master"
                triggerButton={
                  <Button className="h-13 px-8 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:brightness-110 text-black font-black text-sm rounded-2xl shadow-xl shadow-amber-500/30 gap-2 cursor-pointer transition-transform hover:scale-105">
                    <Sparkles className="w-4 h-4" />
                    <span>{promo.ctaText || "Cadastrar Minha Igreja (30 Dias Grátis)"}</span>
                  </Button>
                }
              />
              <span className="text-[11px] text-amber-300/80 font-medium">
                {promo.validityText || "Válido até 31 de Outubro de 2026"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Entenda o Modelo: Degustação Gratuita & Assinatura Recorrente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-white">
            Como Funcionam os 30 Dias Grátis?
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Sua congregação experimenta toda a tecnologia do Horeb sem nenhum risco, compromisso ou pegadinha:
          </p>
          <ul className="space-y-1.5 text-xs text-zinc-300 pt-1">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong>Taxa de Implantação Zero:</strong> Sem nenhum custo inicial de configuração ou taxa de setup.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong>Sem cartão de crédito no cadastro:</strong> Você só insere dados de pagamento se desejar continuar após o teste.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong>Plano Gestão automático:</strong> Acesso completo imediato a membros, células nos lares, finanças e escalas.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong>Opção de Plano Anual:</strong> Opção de contratação anual com até 2 meses grátis de economia.
              </span>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-base font-bold text-white">
            O que cobre a Assinatura Recorrente?
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            A assinatura garante a tranquilidade da liderança e a evolução contínua da sua
            plataforma:
          </p>
          <ul className="space-y-1.5 text-xs text-zinc-300 pt-1">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">•</span>
              <span>
                Uso contínuo do aplicativo próprio pelos membros e liderança sem limite de acessos.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">•</span>
              <span>
                Infraestrutura em nuvem VPS blindada, criptografada e com backups diários automáticos.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">•</span>
              <span>
                Suporte técnico atencioso da <strong>Lynx EMS Sistemas</strong> para orientar a equipe.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">•</span>
              <span>
                Atualizações constantes e novos recursos lançados sem custo adicional de versão.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
