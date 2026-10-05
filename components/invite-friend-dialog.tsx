"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
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
import { sendDirectInviteEmail } from "@/app/actions/members";
import {
  Share2,
  Copy,
  Check,
  Mail,
  Send,
  Loader2,
  Lock,
  Church,
  Sparkles,
} from "lucide-react";

interface InviteFriendDialogProps {
  churchName: string;
  churchSlug: string;
  tenantId: string;
  primaryColor: string;
  currentUserRole?: string;
  triggerButton?: React.ReactNode;
}

export function InviteFriendDialog({
  churchName,
  churchSlug,
  tenantId,
  primaryColor,
  currentUserRole = "MEMBER",
  triggerButton,
}: InviteFriendDialogProps) {
  const [open, setOpen] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Detecção dinâmica de URL (localhost ou produção)
  const [origin, setOrigin] = useState("https://horeb.lynxems.com.br");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  // Membros comuns SEMPRE convidam com o perfil MEMBER (imutável)
  const inviteRole = "MEMBER";

  const inviteUrl = `${origin}/${churchSlug}/cadastro?role=${inviteRole}&email=${encodeURIComponent(
    friendEmail.trim()
  )}&name=${encodeURIComponent(friendName.trim())}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link de convite copiado!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `A paz do Senhor! Te convido para fazer parte da nossa igreja ${churchName} no aplicativo Horeb. Complete seu cadastro através do link: ${inviteUrl}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const handleSendEmail = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!friendEmail.trim()) {
      toast.error("Informe o e-mail do amigo no campo acima.");
      const input = document.getElementById("friend-email-input");
      if (input) input.focus();
      return;
    }

    setSendingEmail(true);
    try {
      const res = await sendDirectInviteEmail({
        recipientEmail: friendEmail.trim(),
        recipientName: friendName.trim() || undefined,
        role: "MEMBER",
        tenantId,
      });

      if (res.success) {
        toast.success(`Convite enviado com sucesso para ${friendEmail}!`, {
          description: "Seu amigo receberá um e-mail oficial com o link de cadastro.",
        });
        setFriendEmail("");
        setFriendName("");
        setOpen(false);
      } else {
        toast.error(res.error || "Falha ao enviar e-mail de convite.");
      }
    } catch {
      toast.error("Erro inesperado ao disparar convite.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (triggerButton as React.ReactElement) || (
            <Button variant="outline" size="sm" className="text-xs gap-1.5 cursor-pointer">
              <Share2 className="w-3.5 h-3.5" />
              <span>Convidar Amigo</span>
            </Button>
          )
        }
      />

      <DialogContent className="max-w-md w-full p-5 sm:p-6 bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl text-zinc-100 overflow-hidden relative">
        {/* Glow Superior */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: primaryColor }}
        />

        <DialogHeader className="space-y-1.5 text-center">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg mb-1"
            style={{ backgroundColor: primaryColor }}
          >
            <Church className="w-6 h-6" />
          </div>

          <DialogTitle className="text-lg font-black text-white">
            Convidar Amigo para a Igreja
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Convide amigos e familiares para se conectarem à {churchName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Perfil Atribuído Travado como Membro */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Perfil de Acesso do Convidado:
              </span>
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
                Membro da Igreja
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Fixo</span>
            </div>
          </div>

          {/* Dados Opcionais do Convidado */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">
                Nome do Convidado (Opcional)
              </label>
              <Input
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">
                E-mail do Convidado (Opcional)
              </label>
              <Input
                id="friend-email-input"
                type="email"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                placeholder="amigo@exemplo.com"
                className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs"
              />
            </div>
          </div>

          {/* Prévia do Link Direto */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Link de Cadastro Direto:
            </span>
            <p className="font-mono text-[11px] text-zinc-300 break-all select-all line-clamp-2">
              {inviteUrl}
            </p>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button
                type="button"
                onClick={handleCopyLink}
                size="sm"
                className="flex-1 min-w-[90px] h-9 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl gap-1.5 cursor-pointer font-bold"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Copiado!" : "Copiar Link"}</span>
              </Button>

              <Button
                type="button"
                onClick={handleShareWhatsApp}
                size="sm"
                className="flex-1 min-w-[90px] h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1.5 cursor-pointer font-bold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </Button>

              <Button
                type="button"
                onClick={handleSendEmail}
                disabled={sendingEmail}
                size="sm"
                className="flex-1 min-w-[90px] h-9 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-xl gap-1.5 cursor-pointer font-bold transition-all shadow-sm"
              >
                {sendingEmail ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                <span>{sendingEmail ? "Enviando..." : "Enviar por E-mail"}</span>
              </Button>
            </div>
          </div>

          {/* Envio por E-mail (se e-mail informado) */}
          {friendEmail.trim() && (
            <form onSubmit={handleSendEmail}>
              <Button
                type="submit"
                disabled={sendingEmail}
                className="w-full h-11 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all gap-1.5 cursor-pointer"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Disparando E-mail...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Disparar E-mail Oficial de Convite</span>
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
