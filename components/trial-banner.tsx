"use client";

import React, { useState } from "react";
import { Sparkles, Clock, AlertTriangle, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialBannerProps {
  slug: string;
  status: string;
  plan: string;
  subscriptionExpiresAt?: Date | string | null;
  userRole?: string;
}

export function TrialBanner({
  slug,
  status,
  plan,
  subscriptionExpiresAt,
  userRole,
}: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Exibir apenas para quem está em teste (TRIAL) e não dispensou nesta sessão
  if (status !== "TRIAL" || dismissed) {
    return null;
  }

  // Apenas Administradores ou Pastores veem avisos de assinatura
  const isAdminOrPastor =
    userRole === "ADMIN" ||
    userRole === "PASTOR" ||
    userRole === "SUPERADMIN" ||
    userRole === "PRESIDENTE";

  if (!isAdminOrPastor) {
    return null;
  }

  // Cálculo dos dias restantes
  let daysLeft = 30;
  if (subscriptionExpiresAt) {
    const diff = new Date(subscriptionExpiresAt).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const isExpired = daysLeft === 0;

  return (
    <div
      className={`w-full border-b px-4 py-2 text-xs transition-all ${
        isExpired
          ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
          : "bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-amber-500/25 text-amber-200"
      }`}
    >
      <div className="max-w-[1760px] 2xl:max-w-[1920px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              isExpired
                ? "bg-rose-500/20 text-rose-400"
                : "bg-amber-500/20 text-amber-400 shadow-xs"
            }`}
          >
            {isExpired ? <AlertTriangle className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground">
              {isExpired
                ? "Seu período de degustação gratuita de 30 dias expirou."
                : "Degustação Gratuita Horeb (30 Dias):"}
            </span>

            {!isExpired && (
              <span className="text-muted-foreground">
                Sua congregação tem{" "}
                <strong className="text-amber-400 font-black">
                  {daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}
                </strong>{" "}
                com todos os módulos do plano{" "}
                <span className="font-bold text-foreground uppercase">{plan}</span> liberados sem custo
                e sem dados de cobrança.
              </span>
            )}

            {isExpired && (
              <span className="text-rose-200">
                Entre em contato com o suporte ou ative sua assinatura para manter todos os recursos ativos.
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {isExpired ? "Expirado" : `${daysLeft} dias restantes`}
          </span>

          <button
            onClick={() => setDismissed(true)}
            className="w-5 h-5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
