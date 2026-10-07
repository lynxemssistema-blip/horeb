"use client";

import React, { useState } from "react";
import {
  Camera,
  Sparkles,
  Smartphone,
  Sliders,
  Share2,
  User,
  ShieldCheck,
  Palette,
  ArrowRight,
  Flame,
  CheckCircle2,
  Lock,
  Star,
  Zap,
  Clock,
  Check,
  QrCode,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstagramCameraStudio } from "@/components/instagram-camera-studio";
import { PersonalToolsCheckoutDialog } from "@/components/personal-tools-checkout-dialog";
import { PersonalToolsConfigData } from "@/app/actions/personal-tools";

interface UserPersonalToolsSectionProps {
  churchName: string;
  churchLogo?: string | null;
  churchSlug: string;
  config?: PersonalToolsConfigData;
  subscription?: {
    hasActiveSubscription: boolean;
    status: "INACTIVE" | "TRIAL" | "ACTIVE" | "OVERDUE" | "CANCELLED";
    expiresAt: string | null;
    isTrial: boolean;
    remainingDays?: number;
    planName?: string;
  };
  user?: {
    id?: string;
    name?: string;
    email?: string;
    avatarUrl?: string | null;
    cpf?: string;
    phone?: string;
  } | null;
}

const DEFAULT_CONFIG: PersonalToolsConfigData = {
  id: "default",
  title: "Estúdio de Fotos & Instagram Pro",
  badge: "MÓDULO PESSOAL EXCLUSIVO",
  description:
    "Câmera de alta resolução com filtros de cinema para cultos e palcos de louvor, ajustes de iluminação e formatos prontos para postagem no Instagram.",
  monthlyPrice: 19.9,
  annualPrice: 199.0,
  trialDays: 30,
  active: true,
  features: [
    "Câmera Nativa do Celular & Selfie em Alta Definição",
    "8 Filtros de Cinema Exclusivos (Louvor Vivo, Golden Hour, B&W)",
    "Formatos Oficiais do Instagram: 1:1 Feed, 4:5 Retrato e 9:16 Stories",
    "Ajustes Finos de Iluminação, Contraste, Calor e Vinheta",
    "Selos de Fé e Brasão da Igreja em Alta Resolução",
    "Compartilhamento Direto no Feed ou Stories em 1 Toque",
  ],
};

export function UserPersonalToolsSection({
  churchName,
  churchLogo,
  churchSlug,
  config = DEFAULT_CONFIG,
  subscription,
  user,
}: UserPersonalToolsSectionProps) {
  const [hasSubscribed, setHasSubscribed] = useState(
    subscription?.hasActiveSubscription ?? true
  );
  const [subStatus, setSubStatus] = useState<string>(
    subscription?.status || "TRIAL"
  );
  const [remainingDays, setRemainingDays] = useState<number>(
    subscription?.remainingDays !== undefined ? subscription.remainingDays : 30
  );

  // Primeiro acesso de visitantes (usuário não logado): ativa 30 dias grátis no navegador
  React.useEffect(() => {
    if (typeof window !== "undefined" && !user?.id) {
      const storageKey = "horeb_tools_visitor_trial_expires";
      const stored = localStorage.getItem(storageKey);
      const now = Date.now();
      const trialDaysCount = config.trialDays > 0 ? config.trialDays : 30;

      if (!stored) {
        const expiresAt = now + trialDaysCount * 24 * 60 * 60 * 1000;
        localStorage.setItem(storageKey, expiresAt.toString());
        setHasSubscribed(true);
        setSubStatus("TRIAL");
        setRemainingDays(trialDaysCount);
      } else {
        const expiresTime = parseInt(stored, 10);
        if (now < expiresTime) {
          const daysLeft = Math.max(1, Math.ceil((expiresTime - now) / (1000 * 60 * 60 * 24)));
          setHasSubscribed(true);
          setSubStatus("TRIAL");
          setRemainingDays(daysLeft);
        } else {
          setHasSubscribed(false);
          setSubStatus("OVERDUE");
          setRemainingDays(0);
        }
      }
    }
  }, [user?.id, config.trialDays]);

  const displayName = user?.name ? user.name.split(" ")[0] : "Usuário";

  const handleActivationSuccess = () => {
    setHasSubscribed(true);
    setSubStatus("ACTIVE");
    setRemainingDays(365);
  };

  return (
    <section id="minhas-ferramentas" className="space-y-4 pt-2 scroll-mt-20">
      {/* Header da Seção: Destaque de Ferramentas Pessoais Exclusivas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-amber-500/15 text-pink-400 border border-pink-500/30 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Serviços Exclusivos do Usuário • Horeb Pessoal</span>
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Conta: {user?.email || "Uso Individual"}</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-1 flex items-center gap-2">
            <span>Minhas Ferramentas</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Módulo separado de uso individual. Ativo e 100% gratuito pelos primeiros 30 dias de uso.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasSubscribed ? (
            subStatus === "TRIAL" ? (
              <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>30 Dias Grátis Ativado ({remainingDays} {remainingDays === 1 ? "dia restante" : "dias restantes"})</span>
              </span>
            ) : (
              <span className="text-[11px] font-black text-pink-400 bg-pink-500/10 border border-pink-500/25 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-400" />
                <span>Assinatura VIP Ativa</span>
              </span>
            )
          ) : (
            <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>30 Dias Grátis Expirados • Assine para Liberar</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid de Ferramentas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* =========================================================================
            CARD PRINCIPAL: INSTAGRAM CAMERA STUDIO (COM PITCH DE VENDAS OU ACESSO)
           ========================================================================= */}
        <div className="md:col-span-2 group relative rounded-3xl overflow-hidden border border-pink-500/40 bg-gradient-to-br from-card via-card to-pink-950/20 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
          {/* Glow de fundo */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-bl from-pink-500/20 via-rose-500/10 to-transparent blur-3xl rounded-full" />

          {/* ========================================================
              CASO 1: MEMBRO COM ASSINATURA ATIVA (ACESSO TOTAL LIBERADO)
             ======================================================== */}
          {hasSubscribed ? (
            <>
              <div className="p-5 sm:p-6 space-y-4 relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 shrink-0 group-hover:scale-105 transition-transform">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/25">
                          {config.badge}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>{subStatus === "TRIAL" ? "Degustação Ativa" : "Assinatura VIP"}</span>
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-tight mt-0.5">
                        {config.title}
                      </h3>
                    </div>
                  </div>

                  {/* Disparador do Estúdio de Fotos */}
                  <InstagramCameraStudio
                    churchName={churchName}
                    churchLogo={churchLogo}
                    userName={user?.name || undefined}
                    triggerButton={
                      <Button className="h-11 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-xl shadow-pink-500/30 gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-pink-400/40">
                        <Camera className="w-4 h-4 text-white" />
                        <span>Abrir Câmera</span>
                      </Button>
                    }
                  />
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Seu estúdio pessoal está liberado! Tire fotos com a câmera do celular em tempo real, aplique filtros de cinema desenhados para cultos e louvor, ajuste iluminação e compartilhe diretamente no Instagram!
                </p>

                {/* Banner de Status dos 30 Dias Grátis */}
                {subStatus === "TRIAL" && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-pink-500/10 to-amber-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0 border border-emerald-500/30 text-xs">
                        30d
                      </div>
                      <div>
                        <p className="font-bold text-emerald-300">
                          🎉 Seus 30 dias de degustação gratuita estão ativados!
                        </p>
                        <p className="text-[11px] text-zinc-300">
                          Acesso completo à câmera e filtros de cinema. Restam <strong>{remainingDays} {remainingDays === 1 ? "dia" : "dias"}</strong> de uso grátis.
                        </p>
                      </div>
                    </div>

                    <PersonalToolsCheckoutDialog
                      config={config}
                      user={{
                        id: user?.id || "guest",
                        name: user?.name,
                        email: user?.email,
                        cpf: user?.cpf,
                        phone: user?.phone,
                      }}
                      churchSlug={churchSlug}
                      onSuccess={handleActivationSuccess}
                      triggerButton={
                        <button
                          type="button"
                          className="text-[11px] font-black text-pink-400 hover:text-pink-300 underline underline-offset-4 cursor-pointer shrink-0 text-left transition-colors"
                        >
                          Assinar Módulo Definitivo ➔
                        </button>
                      }
                    />
                  </div>
                )}

                {/* Destaques Técnicos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-muted/60 border border-border/70 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Smartphone className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span>Câmera & Selfie</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Lente traseira ou frontal HD.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/60 border border-border/70 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Palette className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>8 Filtros Pro</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Louvor Vivo, Clarendon e B&W.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/60 border border-border/70 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Ajustes Finos</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Luz, contraste e vinheta.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/60 border border-border/70 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Feed & Stories</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Compartilhe em 1 toque.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rodapé Liberado */}
              <div className="p-4 sm:p-5 bg-muted/30 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {subscription?.expiresAt
                      ? `Plano ativo até ${new Date(subscription.expiresAt).toLocaleDateString("pt-BR")}`
                      : "Acesso permanente ativado na sua conta"}
                  </span>
                </div>

                <InstagramCameraStudio
                  churchName={churchName}
                  churchLogo={churchLogo}
                  userName={user?.name || undefined}
                  triggerButton={
                    <button
                      type="button"
                      className="text-xs font-black text-pink-400 hover:text-pink-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Entrar no Estúdio Fotográfico</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  }
                />
              </div>
            </>
          ) : (
            /* ========================================================
                CASO 2: PROPAGANDA & PITCH DE VENDAS DENTRO DO APP
                (Exibido exclusivamente aqui para o membro assinar)
               ======================================================== */
            <div className="p-5 sm:p-7 space-y-5 relative z-10 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-pink-500/30 shrink-0">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/25">
                          Novo Serviço Pessoal
                        </span>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {config.trialDays} Dias Grátis
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                        {config.title}
                      </h3>
                    </div>
                  </div>

                  {/* Preço em Destaque Gerenciado pelo SuperAdmin */}
                  <div className="px-3.5 py-1.5 rounded-2xl bg-black/40 border border-pink-500/30 text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Assinatura a partir de</span>
                    <span className="text-lg sm:text-xl font-black text-pink-400">
                      R$ {config.monthlyPrice.toFixed(2).replace(".", ",")}
                      <span className="text-xs text-zinc-400 font-normal"> /mês</span>
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
                  Transforme os registros da sua fé, cultos de domingo e encontros em fotos de nível profissional com a câmera do seu celular. Tire fotos com enquadramento perfeito (Feed 1:1, Retrato 4:5 e Stories 9:16), filtros de cinema calibrados para iluminação de igreja e compartilhe no Instagram em segundos!
                </p>

                {/* Alerta de Expiração dos 30 dias */}
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-200">
                  <Lock className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <p className="font-bold text-rose-300">
                      Período de 30 dias de uso gratuito encerrado
                    </p>
                    <p className="text-[11px] text-rose-200/90 mt-0.5">
                      Para continuar utilizando a câmera, filtros de cinema para cultos e publicações no Instagram, assine agora o módulo pessoal com renovação Asaas.
                    </p>
                  </div>
                </div>

                {/* Grid Visual de Benefícios Exclusivos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {config.features.slice(0, 4).map((feature, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs font-semibold text-zinc-200">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de Ação: Degustação Gratuita ou Assinar com Asaas */}
              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Pagamento seguro e recorrente via Asaas (PIX ou Cartão)</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {/* Botão de Checkout Asaas */}
                  <PersonalToolsCheckoutDialog
                    config={config}
                    user={{
                      id: user?.id || "guest",
                      name: user?.name,
                      email: user?.email,
                      cpf: user?.cpf,
                      phone: user?.phone,
                    }}
                    churchSlug={churchSlug}
                    onSuccess={handleActivationSuccess}
                    triggerButton={
                      <Button className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-xl shadow-pink-500/30 gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-pink-400/40">
                        <Zap className="w-4 h-4 text-white" />
                        <span>Contratar Módulo (R$ {config.monthlyPrice.toFixed(2).replace(".", ",")}/mês)</span>
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            CARD 2: INFORMAÇÕES DO SERVIÇO PESSOAL & STATUS
           ========================================================================= */}
        <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-lg">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-amber-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/25">
                Contrato Individual
              </span>
              <h3 className="text-base font-black text-foreground mt-1">
                Serviço Autônomo B2C
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Este serviço é contratado diretamente por você e não utiliza créditos ou faturas da igreja. Sua assinatura fica vinculada ao seu e-mail pessoal.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
              <div className="p-2.5 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-between">
                <span className="font-semibold text-foreground">📸 Instagram Studio</span>
                <span className={`text-[10px] font-bold ${hasSubscribed ? "text-emerald-400" : "text-amber-400"}`}>
                  {hasSubscribed ? "Liberado" : "Disponível p/ Assinar"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span>Gerador de Artes & Versículos IA</span>
                </span>
                <span className="text-[10px] font-semibold text-amber-500">Em Breve</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span>Legendas & Hashtags Cristãs</span>
                </span>
                <span className="text-[10px] font-semibold text-amber-500">Em Breve</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-between border-t border-border/40">
            <span>Perfil: <strong className="text-foreground">{displayName}</strong></span>
            {hasSubscribed ? (
              <span className="text-emerald-400 font-bold">✓ Assinante</span>
            ) : (
              <span className="text-zinc-500">Não contratado</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
