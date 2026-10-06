"use client";

import React, { useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ShieldCheck,
  Church,
  User,
  RotateCw,
  Printer,
  Download,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";

interface MemberDigitalCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
    cpf?: string | null;
    pastoralTitle?: string | null;
    createdAt: Date | string;
    tenant: {
      name: string;
      slug: string;
      logoUrl?: string | null;
      primaryColor?: string;
      pastorName?: string | null;
    };
  };
  credentialCode: string;
}

export function MemberDigitalCard({ user, credentialCode }: MemberDigitalCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const primaryColor = user.tenant.primaryColor || "#f59e0b";
  const roleTitle = user.pastoralTitle || ROLE_LABELS[user.role] || user.role;
  const admissionDate = format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ptBR });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
      {/* Container 3D com Efeito Flip */}
      <div
        className="w-full max-w-[340px] h-[520px] rounded-3xl cursor-pointer perspective-1000 select-none transition-transform"
        onClick={() => setIsFlipped(!isFlipped)}
        title="Clique para girar a carteirinha"
      >
        <div
          className={`relative w-full h-full duration-500 rounded-3xl shadow-2xl transition-all [transform-style:preserve-3d] ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* ================================================================= */}
          {/* FRENTE DA CARTEIRINHA                                            */}
          {/* ================================================================= */}
          <div className="absolute inset-0 w-full h-full rounded-3xl p-5 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-white/15 [backface-visibility:hidden]">
            {/* Top Glow & Faixa Dourada com a cor da congregação */}
            <div
              className="absolute top-0 left-0 right-0 h-2"
              style={{ backgroundColor: primaryColor }}
            />

            {/* Cabeçalho da Congregação */}
            <div className="flex items-center gap-3 pt-2">
              <div
                className="w-12 h-12 rounded-2xl p-1 bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-md"
              >
                {user.tenant.logoUrl ? (
                  <img
                    src={user.tenant.logoUrl}
                    alt={user.tenant.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <Church className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Credencial Oficial
                </span>
                <h3 className="text-sm font-black text-white truncate leading-tight">
                  {user.tenant.name}
                </h3>
              </div>
            </div>

            {/* Foto e Cargo Principal */}
            <div className="flex flex-col items-center text-center my-auto py-2">
              <div className="relative mb-3">
                <div
                  className="w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-xl bg-zinc-800"
                  style={{ borderColor: primaryColor }}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <span
                  className="absolute -bottom-1 -right-1 p-1 rounded-full text-black shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  <ShieldCheck className="w-4 h-4 text-white" />
                </span>
              </div>

              <h2 className="text-lg font-black text-white tracking-tight leading-snug px-2">
                {user.name}
              </h2>

              <div className="mt-1.5 inline-block">
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    color: primaryColor,
                    border: `1px solid ${primaryColor}50`,
                  }}
                >
                  {roleTitle}
                </span>
              </div>
            </div>

            {/* Dados de Cadastro e Validação */}
            <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
              <div className="flex justify-between items-center text-zinc-300">
                <span className="text-zinc-500 font-medium">Registro:</span>
                <span className="font-mono font-bold text-white text-[11px]">
                  {credentialCode}
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-300">
                <span className="text-zinc-500 font-medium">Membro Desde:</span>
                <span className="font-semibold text-white text-[11px]">
                  {admissionDate}
                </span>
              </div>

              {user.cpf && (
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="text-zinc-500 font-medium">CPF:</span>
                  <span className="font-mono text-zinc-300 text-[11px]">{user.cpf}</span>
                </div>
              )}
            </div>

            {/* Footer com indicação de clique */}
            <div className="text-center pt-2 text-[10px] text-zinc-500 flex items-center justify-center gap-1">
              <RotateCw className="w-3 h-3 animate-spin" />
              <span>Clique no cartão para girar e ver QR Code</span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* VERSO DA CARTEIRINHA COM QR CODE                                 */}
          {/* ================================================================= */}
          <div className="absolute inset-0 w-full h-full rounded-3xl p-6 flex flex-col justify-between bg-card border border-border [transform:rotateY(180deg)] [backface-visibility:hidden] text-center text-card-foreground">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Validação de Membresia & Acesso
              </span>
              <h4 className="text-sm font-black text-foreground mt-0.5">
                {user.tenant.name}
              </h4>
            </div>

            {/* QR Code de Autenticação */}
            <div className="my-auto flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-white inline-block">
                <QRCodeSVG
                  value={`https://horeb.lynxems.com.br/${user.tenant.slug}?member=${user.id}&code=${credentialCode}`}
                  size={150}
                  level="H"
                />
              </div>

              <p className="font-mono text-xs font-bold text-amber-400 mt-3 tracking-widest">
                {credentialCode}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[220px]">
                Aponte a câmera para autenticar a condição de membro ativo nesta congregação.
              </p>
            </div>

            <div className="text-[10px] text-zinc-500 space-y-1 pt-2 border-t border-white/10">
              <p>Pastor Responsável: {user.tenant.pastorName || "Liderança Eclesial"}</p>
              <p>Horeb SaaS • Tecnologia e Gestão Eclesial</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFlipped(!isFlipped)}
          className="text-xs font-bold gap-1.5 rounded-xl border-white/10"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Girar Carteirinha</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrint}
          className="text-xs font-bold gap-1.5 rounded-xl"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir</span>
        </Button>
      </div>
    </div>
  );
}
