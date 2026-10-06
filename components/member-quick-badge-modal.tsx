"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, ShieldCheck, User, X, Sparkles, Church } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MemberQuickBadgeModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
    pastoralTitle?: string | null;
  };
  tenant: {
    name: string;
    slug: string;
    logoUrl?: string | null;
    primaryColor?: string;
  };
  triggerButton?: React.ReactNode;
}

export function MemberQuickBadgeModal({
  user,
  tenant,
  triggerButton,
}: MemberQuickBadgeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const primaryColor = tenant.primaryColor || "#f59e0b";
  const credentialCode = `MEM-${user.id.slice(-6).toUpperCase()}`;
  const qrValue = `https://horeb.lynxems.com.br/${tenant.slug}?member=${user.id}&code=${credentialCode}`;

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {triggerButton}
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-10 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-black gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span>Meu Crachá Digital</span>
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm p-6 bg-zinc-950/95 border-white/10 rounded-3xl backdrop-blur-2xl text-center">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-black text-white flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-amber-400" />
              <span>Crachá de Acesso à Portaria</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Apresente este QR Code na entrada da igreja para a recepção registrar sua presença no culto.
            </DialogDescription>
          </DialogHeader>

          {/* Cartão do Crachá Digital com Alto Contraste */}
          <div className="relative my-3 p-6 rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-white/15 shadow-2xl space-y-4 overflow-hidden">
            {/* Faixa Superior com Cor da Igreja */}
            <div
              className="absolute top-0 left-0 right-0 h-2"
              style={{ backgroundColor: primaryColor }}
            />

            {/* Cabeçalho da Congregação */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <Church className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider truncate max-w-[220px]">
                {tenant.name}
              </h3>
            </div>

            {/* Foto e Nome do Membro */}
            <div className="flex flex-col items-center">
              <Avatar className="h-18 w-18 ring-3 ring-amber-500/40 shadow-xl bg-black">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback className="text-lg font-black bg-amber-500 text-black">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <h4 className="text-base font-black text-white mt-2 leading-snug">
                {user.name}
              </h4>
              <span className="text-[11px] font-bold text-amber-400">
                {user.pastoralTitle || user.role}
              </span>
            </div>

            {/* QR Code de Alta Legibilidade */}
            <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-white inline-block">
              <QRCodeSVG
                value={qrValue}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Código de Registro */}
            <div>
              <p className="font-mono text-xs font-black text-amber-400 tracking-widest">
                {credentialCode}
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Identificador Nominal do Membro
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="w-full text-xs font-bold text-zinc-400 hover:text-white"
          >
            Fechar Crachá
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
