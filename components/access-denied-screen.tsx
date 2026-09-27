"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, Church, ArrowRight, LogOut, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/app/actions/tenant";
import { SessionData } from "@/lib/session";

interface AccessDeniedScreenProps {
  user: SessionData;
  userChurchSlug: string;
  requestedChurchSlug: string;
}

export function AccessDeniedScreen({
  user,
  userChurchSlug,
  requestedChurchSlug,
}: AccessDeniedScreenProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      router.push("/");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#070709] text-zinc-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl bg-zinc-950 border border-red-500/30 p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow de Alerta */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-red-500/15 blur-3xl rounded-full" />

        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 inline-block">
            Acesso Restrito • Isolamento Multi-Tenant
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Congregação Não Autorizada
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Você está conectado como <strong className="text-white">{user.name}</strong> ({user.email}), com cadastro ativo na congregação <span className="text-amber-400 font-mono font-bold">/{userChurchSlug}</span>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 text-xs text-zinc-300 text-left space-y-1">
          <p className="font-semibold text-white">Regra de Segurança do Horeb:</p>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Usuários logados só acessam as congregações às quais pertencem. Para acessar a congregação <strong>/{requestedChurchSlug}</strong>, solicite autorização ao Pastor Master ou faça login com a conta correspondente.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Link href={`/${userChurchSlug}`} className="w-full block">
            <Button className="w-full h-11 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg gap-2 cursor-pointer">
              <Church className="w-4 h-4" />
              <span>Ir para Minha Igreja (/{userChurchSlug})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>

          <Button
            type="button"
            variant="outline"
            disabled={loggingOut}
            onClick={handleLogout}
            className="w-full h-10 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl text-xs font-bold gap-2 cursor-pointer"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span>Trocar de Conta / Sair</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
