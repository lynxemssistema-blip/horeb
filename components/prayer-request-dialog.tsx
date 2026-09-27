"use client";

import React, { useState } from "react";
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
import { submitPrayerRequest } from "@/app/actions/prayer";
import { HeartHandshake, Loader2, Send, Shield } from "lucide-react";

interface PrayerRequestDialogProps {
  tenantSlug: string;
  triggerButton?: React.ReactNode;
}

export function PrayerRequestDialog({
  tenantSlug,
  triggerButton,
}: PrayerRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Por favor, descreva o seu pedido de oração.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await submitPrayerRequest({
        tenantSlug,
        authorName: isAnonymous ? undefined : name,
        content,
        isAnonymous,
      });

      if (res.success) {
        toast.success("Pedido Enviado!", {
          description: res.message,
        });
        setContent("");
        setName("");
        setIsAnonymous(false);
        setOpen(false);
      } else {
        toast.error(res.error || "Não foi possível enviar o pedido.");
      }
    } catch {
      toast.error("Erro inesperado ao enviar pedido.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (triggerButton as React.ReactElement) || (
            <Button variant="outline" className="gap-2">
              <HeartHandshake className="w-4 h-4 text-primary" />
              <span>Pedir Oração</span>
            </Button>
          )
        }
      />

      <DialogContent className="max-w-md w-[94vw] bg-card text-foreground border-border shadow-2xl p-5 sm:p-6 overflow-y-auto max-h-[90dvh]">
        <DialogHeader className="text-left space-y-1 pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4" />
            <span>Rede de Intercessão</span>
          </div>
          <DialogTitle className="text-xl font-bold">
            Fazer Pedido de Oração
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Sua solicitação será encaminhada para a equipe de oração e pastores da congregação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Seu Nome (Opcional)
            </label>
            <Input
              disabled={isAnonymous}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAnonymous ? "Anônimo" : "Ex: Maria Silva"}
              className="text-base sm:text-sm h-10 bg-background border-border rounded-xl"
            />
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-muted-foreground min-h-[36px]">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-border accent-primary w-4 h-4"
            />
            <span>Enviar como anônimo (não exibir meu nome)</span>
          </label>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Motivo da Oração *
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva o seu motivo (saúde, família, causa na justiça, libertação, agradecimento)..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 p-2.5 rounded-lg border border-border/60">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <span>Todos os pedidos são tratados com sigilo e respeito pastoral.</span>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !content.trim()}
            className="w-full h-11 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-md gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando Pedido...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Pedido de Oração</span>
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
