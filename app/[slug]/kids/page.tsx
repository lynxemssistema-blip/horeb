"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
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

export default function KidsPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "matriz";

  const [childName, setChildName] = useState<string>("Gabriel Oliveira");
  const [room, setRoom] = useState<string>("Maternal (3 a 5 anos)");
  const [guardianName, setGuardianName] = useState<string>("Pr. Marcos / Ana");
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [securityCode, setSecurityCode] = useState<string>("");

  const handleCheckIn = () => {
    // Gerar código de segurança de 4 dígitos para liberação da criança
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
        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Protocolo de Segurança Ativo
        </span>
      </div>

      {!isCheckedIn ? (
        /* Estado 1: Formulário e BOTÃO GIGANTE de Check-in */
        <Card className="border-border/80 shadow-lg overflow-hidden">
          <div className="h-1.5 w-full bg-primary" />

          <CardHeader className="text-center pb-3 pt-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center mb-2 shadow-inner">
              <Baby className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Ministério Kids
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              Check-in rápido e seguro para os pais deixarem seus filhos na salinha infantil durante o culto.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Informações da Criança */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border/70">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nome da Criança
                </label>
                <Input
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Nome completo do filho(a)"
                  className="h-11 bg-background font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Salinha / Faixa Etária
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Berçário (0 a 2 anos)",
                    "Maternal (3 a 5 anos)",
                    "Juniores (6 a 9 anos)",
                    "Pré-Adolescentes (10+)",
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoom(r)}
                      className={`p-2.5 rounded-lg text-xs font-semibold transition-all border text-left flex items-center justify-between ${
                        room === r
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{r}</span>
                      {room === r && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Responsável Presente
                </label>
                <Input
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Nome do Pai/Mãe"
                  className="h-11 bg-background font-medium"
                />
              </div>
            </div>

            {/* BOTÃO GIGANTE FOCADO NA EXPERIÊNCIA MOBILE DOS PAIS */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleCheckIn}
                className="w-full h-16 text-lg sm:text-xl font-bold tracking-tight rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-[0.98] gap-3 flex items-center justify-center"
              >
                <UserCheck className="w-7 h-7 animate-pulse" />
                <span>Fazer Check-in Kids</span>
              </Button>
              <p className="text-[11px] text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Gera etiqueta digital e código de segurança para retirada
              </p>
            </div>
          </CardContent>

          <CardFooter className="py-3 bg-muted/20 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-500" /> Cuidado e carinho com suas crianças
            </span>
            <span>Equipe Voluntária</span>
          </CardFooter>
        </Card>
      ) : (
        /* Estado 2: Cartão de Confirmação & Etiqueta de Segurança */
        <Card className="border-border/80 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="h-2 w-full bg-emerald-500" />

          <CardHeader className="text-center pb-2 pt-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Check-in Concluído!
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Apresente este código aos voluntários para retirar a criança ao final do culto.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Badge de Segurança */}
            <div className="p-4 rounded-xl bg-card border-2 border-dashed border-primary/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    CÓDIGO DE RETIRADA
                  </span>
                  <span className="text-3xl font-extrabold tracking-wider text-primary">
                    #{securityCode}
                  </span>
                </div>
                <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center border border-border">
                  <QrCode className="w-8 h-8 text-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Criança</span>
                  <strong className="text-foreground">{childName}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Espaço Infantil</span>
                  <strong className="text-foreground">{room}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Responsável</span>
                  <strong className="text-foreground">{guardianName}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Status</span>
                  <span className="inline-flex items-center text-emerald-600 font-semibold gap-1">
                    <Clock className="w-3 h-3" /> Na Salinha
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Por segurança, a criança <strong>só será entregue</strong> mediante a apresentação do código <strong>#{securityCode}</strong>.
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="w-full text-xs font-semibold"
            >
              Fazer Novo Check-in
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
