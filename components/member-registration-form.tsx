"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Church,
  ShieldCheck,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createChurchUser } from "@/app/actions/members";
import { ROLE_LABELS } from "@/lib/constants";
import { ActivationDialog } from "@/components/activation-dialog";

interface MemberRegistrationFormProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
    isMatriz: boolean;
    parentName?: string;
  };
  initialRole: string;
  initialEmail: string;
  initialName: string;
}

export function MemberRegistrationForm({
  tenant,
  initialRole,
  initialEmail,
  initialName,
}: MemberRegistrationFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Ativação por Código de 6 Dígitos
  const [activationOpen, setActivationOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const roleLabel = ROLE_LABELS[initialRole] || "Membro da Igreja";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Preencha seu nome e e-mail.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 dígitos.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await createChurchUser({
        name,
        email,
        password,
        role: initialRole,
        tenantId: tenant.id,
        sendInviteEmail: true,
      });

      if (res.success) {
        toast.info("Código de ativação enviado para o seu e-mail!", {
          description: `Enviamos um código de 6 dígitos para ${email}.`,
        });
        setPendingEmail(email);
        setActivationOpen(true);
      } else {
        toast.error(res.error || "Falha ao registrar cadastro.");
      }
    } catch {
      toast.error("Erro inesperado no servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-xl text-zinc-100 space-y-6">
        {/* Glow Superior com a Cor da Igreja */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 transition-all"
          style={{ backgroundColor: tenant.primaryColor }}
        />

        <div className="text-center space-y-2">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg mb-3"
            style={{ backgroundColor: tenant.primaryColor }}
          >
            <Church className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-bold text-zinc-300">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tenant.primaryColor }}
            />
            <span>{tenant.name}</span>
            {tenant.parentName && (
              <span className="text-zinc-500 font-normal">• Filial de {tenant.parentName}</span>
            )}
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            Completar Cadastro
          </h1>

          <p className="text-xs text-zinc-400">
            Você foi convidado para ingressar com o perfil:
          </p>

          <div className="pt-1">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm"
              style={{
                backgroundColor: `${tenant.primaryColor}20`,
                color: tenant.primaryColor,
                border: `1px solid ${tenant.primaryColor}50`,
              }}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Seu Nome Completo *</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pr. André Luiz"
                required
                className="pl-9 bg-black/60 border-white/10 text-white rounded-xl h-11 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Seu E-mail *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                required
                className="pl-9 bg-black/60 border-white/10 text-white rounded-xl h-11 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Defina Sua Senha *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
                className="pl-9 pr-10 bg-black/60 border-white/10 text-white rounded-xl h-11 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-zinc-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all mt-4 cursor-pointer gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando Código de Ativação...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Concluir Cadastro & Ativar</span>
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-[11px] text-zinc-500 pt-2 border-t border-white/5">
          Desenvolvido por <strong>Lynx EMS Sistemas</strong> • Horeb
        </div>
      </div>

      {/* Modal de Código de Ativação de 6 Dígitos */}
      <ActivationDialog
        isOpen={activationOpen}
        email={pendingEmail}
        onClose={() => setActivationOpen(false)}
        onSuccess={(redirectUrl) => {
          setActivationOpen(false);
          window.location.href = redirectUrl || `/${tenant.slug}`;
        }}
      />
    </>
  );
}
