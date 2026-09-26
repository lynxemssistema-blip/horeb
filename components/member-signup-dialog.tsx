"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Church,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
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
import { registerMemberSelf } from "@/app/actions/members";
import { ActivationDialog } from "@/components/activation-dialog";

interface MemberSignupDialogProps {
  churchName: string;
  churchSlug: string;
  primaryColor: string;
  triggerButton?: React.ReactNode;
}

export function MemberSignupDialog({
  churchName,
  churchSlug,
  primaryColor,
  triggerButton,
}: MemberSignupDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Ativação por Código de 6 Dígitos
  const [activationOpen, setActivationOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerMemberSelf({
        name,
        email,
        password,
        tenantSlug: churchSlug,
      });

      if (res.success) {
        if (res.requiresActivation) {
          toast.info("Código de ativação enviado para seu e-mail!", {
            description: `Enviamos um código de 6 dígitos para ${email}.`,
          });
          setPendingEmail(email);
          setOpen(false);
          setActivationOpen(true);
        } else {
          toast.success(res.message || "Cadastro realizado com sucesso!");
          setOpen(false);
          router.refresh();
        }
      } else {
        toast.error(res.error || "Falha ao realizar cadastro.");
      }
    } catch {
      toast.error("Erro inesperado no servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            (triggerButton as React.ReactElement) || (
              <Button
                size="sm"
                className="font-bold text-xs gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Quero me Cadastrar</span>
              </Button>
            )
          }
        />

        <DialogContent className="max-w-md w-full p-6 bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl text-zinc-100 relative overflow-hidden">
          {/* Top Glow Bar */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: primaryColor }}
          />

          <DialogHeader className="space-y-1.5 text-center">
            <div
              className="w-11 h-11 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md mb-1"
              style={{ backgroundColor: primaryColor }}
            >
              <Church className="w-5 h-5" />
            </div>

            <DialogTitle className="text-xl font-black text-white tracking-tight">
              Cadastro de Membro
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Faça parte da congregação <strong>{churchName}</strong>. Tenha acesso a células, orações, check-in infantil e avisos da igreja.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegister} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Nome Completo *</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="pl-9 bg-black/60 border-white/10 text-white rounded-xl h-11 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">E-mail *</label>
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
              <label className="text-xs font-bold text-zinc-300">Crie Sua Senha *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
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

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-zinc-400 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Por padrão, seu cadastro terá acesso como <strong>Membro Oficial</strong> na <strong>{churchName}</strong>. A liderança pastoral poderá atribuir funções adicionais.
              </span>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 font-black text-sm rounded-xl shadow-lg transition-all text-white cursor-pointer gap-2 mt-2"
              style={{ backgroundColor: primaryColor }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cadastrando & Enviando Código...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Concluir Cadastro de Membro</span>
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-[10px] text-zinc-500 pt-1">
            Plataforma Horeb • Desenvolvido por <strong>Lynx EMS Sistemas</strong>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Código de Ativação de 6 Dígitos */}
      <ActivationDialog
        isOpen={activationOpen}
        email={pendingEmail}
        onClose={() => setActivationOpen(false)}
        onSuccess={() => {
          setActivationOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
