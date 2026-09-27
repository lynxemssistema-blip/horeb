"use client";

import React from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, ShieldCheck, Crown, Layers, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FeatureKey,
  getRequiredPlanForFeature,
  normalizePlanSlug,
  PLANS_CONFIG,
} from "@/lib/plans";

interface PlanLockCardProps {
  churchSlug: string;
  churchName: string;
  currentPlan: string;
  featureKey: FeatureKey;
  featureName: string;
  featureDescription: string;
}

export function PlanLockCard({
  churchSlug,
  churchName,
  currentPlan,
  featureKey,
  featureName,
  featureDescription,
}: PlanLockCardProps) {
  const currentPlanSlug = normalizePlanSlug(currentPlan);
  const currentPlanDef = PLANS_CONFIG[currentPlanSlug];
  const required = getRequiredPlanForFeature(featureKey);
  const requiredPlanDef = PLANS_CONFIG[required.planSlug];

  const whatsappMessage = encodeURIComponent(
    `Olá Lynx EMS Sistemas! Sou da igreja "${churchName}" (Slug: ${churchSlug}). Estamos no Plano ${currentPlanDef.name} e gostaríamos de fazer o upgrade para o Plano ${required.planName} para liberar o recurso de ${featureName}.`
  );

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black border border-amber-500/30 p-6 sm:p-10 shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Glow de Iluminação */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/15 blur-3xl rounded-full" />

        {/* Badge do Plano Necessário */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Exclusivo do Plano {required.planName}</span>
        </div>

        {/* Ícone de Cadeado em Destaque */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>

        {/* Título & Descrição */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Desbloqueie o Módulo: {featureName}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            {featureDescription}
          </p>
        </div>

        {/* Comparativo de Planos */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
              Plano Atual da Sua Igreja:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-zinc-200">
                Plano {currentPlanDef.name}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                (R$ {currentPlanDef.monthlyPrice}/mês)
              </span>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-amber-400 hidden sm:block shrink-0" />

          <div className="space-y-0.5 text-right sm:text-right">
            <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider">
              Plano Necessário:
            </span>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-sm font-black text-amber-400">
                Plano {required.planName}
              </span>
              <span className="text-xs text-zinc-300 font-mono">
                (R$ {required.monthlyPrice}/mês)
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Recursos Inclusos no Upgrade */}
        <div className="text-left space-y-2.5 pt-2">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
            O que você desbloqueia no Plano {required.planName}:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
            {requiredPlanDef.featuresList.slice(0, 6).map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`https://wa.me/5511999999999?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button className="w-full sm:w-auto h-12 px-6 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 gap-2 cursor-pointer">
              <Crown className="w-4 h-4" />
              <span>Solicitar Upgrade para {required.planName}</span>
            </Button>
          </a>

          <Link href={`/${churchSlug}`} className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-12 px-5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl text-xs font-bold gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Início da Igreja</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
