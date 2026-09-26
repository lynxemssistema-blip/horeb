"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyActivationCode, resendActivationCode } from "@/app/actions/activation";
import {
  Mail,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
} from "lucide-react";

interface ActivationDialogProps {
  isOpen: boolean;
  email: string;
  onClose?: () => void;
  onSuccess?: (redirectUrl: string) => void;
}

export function ActivationDialog({
  isOpen,
  email,
  onClose,
  onSuccess,
}: ActivationDialogProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      toast.error("Por favor, digite o código de 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyActivationCode({
        email,
        code: code.trim(),
      });

      if (res.success) {
        toast.success(res.message || "Conta ativada com sucesso!");
        if (onSuccess) {
          onSuccess(res.redirectUrl || "/");
        } else if (res.redirectUrl) {
          router.push(res.redirectUrl);
        }
      } else {
        toast.error(res.error || "Código inválido ou expirado.");
      }
    } catch {
      toast.error("Erro inesperado na validação.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await resendActivationCode(email);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in-0">
      <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Mail className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Validação de Segurança • Horeb</span>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight">
            Ative sua Conta
          </h3>

          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Enviamos um código de 6 dígitos para o e-mail:
            <strong className="block text-amber-300 font-mono mt-0.5">{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block text-center">
              Digite o Código de 6 Dígitos
            </label>
            <Input
              required
              autoFocus
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="h-14 text-center font-mono text-3xl font-black tracking-[12px] bg-zinc-900 border-amber-500/40 text-amber-300 rounded-2xl shadow-inner focus-visible:ring-amber-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full h-12 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validando Código...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Entrar no App</span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
            <span>Não recebeu o e-mail?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer flex items-center gap-1"
            >
              {resending ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              <span>Reenviar Código</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
