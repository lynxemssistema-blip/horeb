"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Baby,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  UserCheck,
  Lock,
  Heart,
  QrCode,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface KidsCheckinClientProps {
  slug: string;
}

export function KidsCheckinClient({ slug }: KidsCheckinClientProps) {
  const [childName, setChildName] = useState<string>("Gabriel Oliveira");
  const [room, setRoom] = useState<string>("Maternal (3 a 5 anos)");
  const [guardianName, setGuardianName] = useState<string>("Pr. Marcos / Ana");
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [securityCode, setSecurityCode] = useState<string>("");

  const handleCheckIn = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setSecurityCode(code);
    setIsCheckedIn(true);
  };

  const handleReset = () => {
    setIsCheckedIn(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-8">
      {/* Navegação e Selo de Segurança */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Início</span>
        </Link>
        <span className="text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Check-in Seguro Ativo
        </span>
      </div>

      {!isCheckedIn ? (
        /* Formulário de Entrada */
        <Card className="border-border/80 shadow-md">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
              <Baby className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Ministério Infantil</CardTitle>
            <CardDescription className="text-xs">
              Check-in rápido e seguro para as salas infantis durante o culto.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Nome da Criança
              </label>
              <Input
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Ex: Joãozinho Santos"
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Sala / Faixa Etária
              </label>
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Berçário (0 a 2 anos)">Berçário (0 a 2 anos)</option>
                <option value="Maternal (3 a 5 anos)">Maternal (3 a 5 anos)</option>
                <option value="Juniores (6 a 9 anos)">Juniores (6 a 9 anos)</option>
                <option value="Pré-Adolescentes (10 a 12 anos)">
                  Pré-Adolescentes (10 a 12 anos)
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Responsável Presente no Culto
              </label>
              <Input
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Ex: Pai / Mãe"
                className="h-10 text-sm"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/60 border border-border/60 flex items-start gap-2.5 text-xs text-muted-foreground">
              <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Ao confirmar, um código único será emitido. A criança só poderá ser retirada da sala com a apresentação desse código.
              </span>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="button"
              onClick={handleCheckIn}
              disabled={!childName.trim()}
              className="w-full font-bold h-11 text-sm shadow-sm"
            >
              Realizar Check-in de Entrada
            </Button>
          </CardFooter>
        </Card>
      ) : (
        /* Cartão de Confirmação e Etiqueta Digital */
        <Card className="border-border/80 shadow-lg animate-in fade-in duration-300">
          <div className="h-1.5 w-full bg-emerald-500 rounded-t-lg" />
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Check-in Confirmado!
            </CardTitle>
            <CardDescription className="text-xs">
              Apresente esta credencial ao retirar a criança no final do culto.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Bloco de Código de Segurança */}
            <div className="p-4 rounded-xl bg-muted/60 border-2 border-dashed border-primary/40 text-center space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Código de Retirada da Criança
              </span>
              <div className="text-4xl font-extrabold tracking-widest text-primary font-mono">
                {securityCode}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Guarde este número ou tire um print da tela
              </p>
            </div>

            {/* Ficha Resumo da Criança */}
            <div className="space-y-2 text-xs border-t border-border/60 pt-3">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Criança:</span>
                <span className="font-semibold text-foreground">{childName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Sala Designada:</span>
                <span className="font-semibold text-foreground">{room}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Responsável:</span>
                <span className="font-semibold text-foreground">{guardianName}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>
                A equipe de professores já foi notificada da entrada da criança.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="w-full text-xs"
            >
              Fazer outro check-in
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
