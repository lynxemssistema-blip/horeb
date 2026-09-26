"use client";

import React from "react";
import {
  Flame,
  Droplets,
  Wind,
  Mountain,
  Sparkles,
  BookOpen,
  Heart,
  Compass,
} from "lucide-react";

export function AboutHorebSection() {
  const pillars = [
    {
      icon: Flame,
      number: "01",
      title: "O Lugar do Chamado",
      biblicalEvent: "A Sarça Ardente • Êxodo 3",
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/15 border-amber-500/30",
      glowColor: "from-amber-500/10",
      description:
        "Foi no Monte Horebe que Moisés, enquanto cuidava do rebanho, presenciou o fogo que ardia sem queimar o arbusto. Ali, Deus revelou seu nome, despertou seu chamado e entregou a missão de liderar e libertar o seu povo.",
      application:
        "A plataforma Horeb nasceu para servir ao seu chamado pastoral, destravando processos operacionais para que sua liderança foque no propósito que Deus confiou às suas mãos.",
    },
    {
      icon: Droplets,
      number: "02",
      title: "A Provisão no Impossível",
      biblicalEvent: "A Água da Rocha • Êxodo 17",
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/15 border-cyan-500/30",
      glowColor: "from-cyan-500/10",
      description:
        "Quando o povo enfrentava sede extrema no deserto árido, Deus ordenou a Moisés que tocasse a rocha do Horebe com o cajado. Da dureza da pedra, jorrou água viva e abundante para saciar a sede de milhares.",
      application:
        "Cremos que Deus opera milagres onde antes parecia impossível. Com dízimos e ofertas facilitados via PIX e gestão transparente, sua congregação ganha saúde financeira para expandir o Reino.",
    },
    {
      icon: Wind,
      number: "03",
      title: "O Refúgio e a Restauração",
      biblicalEvent: "A Caverna de Elias • 1 Reis 19",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/15 border-emerald-500/30",
      glowColor: "from-emerald-500/10",
      description:
        "Esgotado física e emocionalmente, o profeta Elias caminhou 40 dias até o Horebe. Ali, não no terremoto ou no fogo destruidor, mas em uma brisa suave, Deus curou sua alma e restaurou suas forças com ternura e direção.",
      application:
        "Pastores e líderes carregam pesos imensos. A tecnologia Horeb organiza a rotina da igreja para que o pastor tenha descanso mental, paz no ministério e tempo para ouvir a voz suave do Espírito Santo.",
    },
  ];

  return (
    <section className="space-y-12 pt-8" id="origem-horeb">
      {/* Header com Inspiração Bíblica */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold tracking-widest uppercase">
          <Mountain className="w-3.5 h-3.5" />
          <span>A Origem do Nome</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
          Por que{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
            Horeb?
          </span>
        </h2>

        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto">
          Na cultura evangélica, o Monte Horebe não é apenas uma coordenada geográfica. No hebraico
          original, a palavra remete a um lugar seco e árido — mas na presença de Deus, transformou-se
          no cenário dos maiores encontros, milagres e restaurações da história.
        </p>
      </div>

      {/* Grid dos 3 Grandes Encontros no Monte */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        {pillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b ${item.glowColor} via-zinc-900/90 to-zinc-950 border border-white/[0.08] hover:border-white/20 transition-all duration-300 shadow-2xl flex flex-col justify-between group`}
            >
              <div className="space-y-5">
                {/* Top: Ícone e Badge Bíblico */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl ${item.iconBg} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className={`w-6 h-6 ${item.iconColor}`} />
                  </div>
                  <span className="text-2xl font-black font-mono text-zinc-700 select-none">
                    {item.number}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 block">
                    {item.biblicalEvent}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1 group-hover:text-amber-300 transition-colors">
                    {item.title}
                  </h3>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
              </div>

              {/* Aplicação Prática no Ministério */}
              <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>O que significa na sua igreja:</span>
                </span>
                <p className="text-xs text-zinc-200 leading-relaxed italic bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                  &ldquo;{item.application}&rdquo;
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Citação Inspiradora de Fechamento */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/50 border border-white/[0.08] backdrop-blur-md text-center max-w-3xl mx-auto space-y-3">
        <p className="text-sm sm:text-base text-zinc-200 font-medium italic leading-relaxed">
          &ldquo;Assim como Deus transformou o Horebe de um deserto árido em um monte sagrado de
          provisão e direcionamento, queremos que a sua igreja encontre na nossa tecnologia a leveza e
          a ordem necessárias para cumprir o seu propósito.&rdquo;
        </p>
        <span className="text-xs text-amber-400 font-bold block uppercase tracking-widest">
          — Horeb Soluções Para Igrejas
        </span>
      </div>
    </section>
  );
}
