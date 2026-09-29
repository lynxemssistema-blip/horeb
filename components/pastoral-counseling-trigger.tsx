"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PastoralCounselingDialog } from "@/components/pastoral-counseling-dialog";
import { PhoneCall, HeartHandshake } from "lucide-react";

interface PastoralCounselingTriggerProps {
  slug: string;
  isOnline?: boolean;
  pastorName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function PastoralCounselingTrigger({
  slug,
  isOnline = false,
  pastorName,
  variant = "outline",
  size = "sm",
  className,
  children,
}: PastoralCounselingTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={
          className ||
          `text-xs font-bold gap-1.5 cursor-pointer rounded-xl transition-all ${
            isOnline
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-xs ring-1 ring-emerald-500/30"
              : "border-border text-foreground hover:bg-muted"
          }`
        }
      >
        {children ? (
          children
        ) : (
          <>
            <PhoneCall className={`w-3.5 h-3.5 ${isOnline ? "text-emerald-500 animate-pulse" : "text-primary"}`} />
            <span>{isOnline ? "Falar Ao Vivo" : "Atendimento Pastoral"}</span>
            {isOnline && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            )}
          </>
        )}
      </Button>

      <PastoralCounselingDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        slug={slug}
        initialTopic={pastorName ? `Gostaria de conversar com o ${pastorName}` : undefined}
      />
    </>
  );
}
