import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PrayerRequestDialog } from "@/components/prayer-request-dialog";
import { PastoralCounselingTrigger } from "@/components/pastoral-counseling-trigger";
import { CreateChurchDialog } from "@/components/create-church-dialog";
import { MemberSignupDialog } from "@/components/member-signup-dialog";
import {
  Calendar,
  HeartHandshake,
  Baby,
  Users,
  Sparkles,
  ArrowRight,
  MapPin,
  Clock,
  Radio,
  BookOpen,
  Share2,
  MessageCircle,
  ShieldCheck,
  Church,
  PlusCircle,
  UserPlus,
  Tv,
  Bot,
  QrCode,
  Ticket,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { getUserAccessRules } from "@/app/actions/permissions";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantDashboardPage({ params }: PageProps) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      parent: true,
      branches: true,
      cellGroups: {
        include: { leader: true },
      },
      ministries: true,
      videos: true,
      users: {
        where: {
          OR: [
            { role: "PASTOR" },
            { isPastoralCounselor: true },
            { role: "ADMIN" },
          ],
        },
      },
    },
  });

  if (!tenant) notFound();

  const pastor = tenant.users[0];
  const isMatriz = !tenant.parentId;

  const session = await getSession();
  let allowedMenus: string[] = [];
  let allowedActions: string[] = [];
  
  if (session && session.userId) {
    const rules = await getUserAccessRules();
    if (rules) {
      allowedMenus = rules.allowedMenus || [];
      allowedActions = rules.allowedActions || [];
    }
  }

  // Helper function to check menu access
  const canSeeMenu = (menu: string) => allowedMenus.includes(menu) || allowedMenus.includes("ALL");
  const canDoAction = (action: string) => allowedActions.includes(action) || allowedActions.includes("ALL");

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-6">
      {/* 1. Hero / Welcome Card com Theming Dinâmico */}
      <Card className="relative overflow-hidden border-border/80 shadow-md bg-gradient-to-br from-card via-card to-muted/40">
        <div
          className="absolute top-0 left-0 right-0 h-1.5 bg-primary"
          aria-hidden="true"
        />
        <CardHeader className="pb-3 pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" />
                {isMatriz ? "Igreja Sede Matriz" : "Congregação Filial"}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Ao vivo em breve
              </span>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{isMatriz ? "Campus Principal" : `Vinculada à ${tenant.parent?.name || "Matriz"}`}</span>
            </div>
          </div>

          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
            Bem-vindo à {tenant.name}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground">
            {pastor
              ? `Sob a liderança do ${pastor.name}. Um lugar de comunhão, fé e crescimento.`
              : "Conecte-se com a sua congregação em qualquer lugar pelo celular."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* Banner do Próximo Culto */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/60 border border-border/60">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-primary">
                  Próximo Culto de Celebração
                </p>
                <p className="font-semibold text-foreground text-sm sm:text-base">
                  Culto da Família & Santa Ceia
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Domingo às 19:00
                  </span>
                  <span>•</span>
                  <span>Quarta às 20:00 (Culto de Ensino)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/${slug}/videos`}>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full sm:w-auto font-medium shadow-sm cursor-pointer gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Cultos & Mensagens Online</span>
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2 pb-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>Versículo do Dia: Salmos 133:1</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <MemberSignupDialog
              churchName={tenant.name}
              churchSlug={slug}
              primaryColor={tenant.primaryColor}
              triggerButton={
                <Button
                  size="sm"
                  className="text-xs font-bold gap-1.5 text-white shadow-md hover:brightness-110 cursor-pointer"
                  style={{ backgroundColor: tenant.primaryColor }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Quero me Cadastrar</span>
                </Button>
              }
            />

            <PrayerRequestDialog
              tenantSlug={slug}
              triggerButton={
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Pedir Oração</span>
                </Button>
              }
            />

            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              Convidar Amigo
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* 2. Grid de Recursos Principais da Congregação (Rich Visual Media Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h2 className="text-lg font-extrabold text-foreground tracking-tight">
              Serviços & Experiência Digital
            </h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/60 px-2.5 py-1 rounded-full border border-border/50">
            Horeb Mobile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Dízimos & Ofertas (PIX) */}
          <div className="group relative rounded-2xl overflow-hidden border border-border/80 hover:border-primary/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="relative h-44 sm:h-48 w-full overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80"
                alt="Dízimos e Ofertas PIX"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />
              <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay" />

              {/* Floating Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide backdrop-blur-md bg-black/60 border border-white/20 text-emerald-400 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>PIX 10 Segundos</span>
              </div>

              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>

              {/* Titles */}
              <div className="absolute bottom-3 left-3.5 right-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 drop-shadow-sm">
                  Fidelidade & Amor
                </p>
                <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover:text-primary-foreground drop-shadow-md">
                  Dízimos & Ofertas
                </h3>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between bg-card/70 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Contribuição rápida com QR Code automático e comprovante nominal para declaração do Imposto de Renda (IRPF).
              </p>
              <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                <Link href={`/${slug}/doar`} className="flex-1">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full text-xs font-bold shadow-md cursor-pointer gap-1.5"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Contribuir PIX</span>
                  </Button>
                </Link>
                {canSeeMenu("/admin/finance") && (
                  <Link href={`/${slug}/admin/finance`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                    >
                      Tesouraria (ERP)
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Pedidos de Oração */}
          <div className="group relative rounded-2xl overflow-hidden border border-border/80 hover:border-primary/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="relative h-44 sm:h-48 w-full overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80"
                alt="Pedidos de Oração"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />
              <div className="absolute inset-0 bg-rose-500/10 mix-blend-overlay" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide backdrop-blur-md bg-black/60 border border-white/20 text-rose-300 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span>Sigilo Pastoral 100%</span>
              </div>

              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="absolute bottom-3 left-3.5 right-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 drop-shadow-sm">
                  Cuidado & Intercessão
                </p>
                <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover:text-primary-foreground drop-shadow-md">
                  Pedidos de Oração
                </h3>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between bg-card/70 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sua congregação em constante clamor. Envie suas causas particulares diretamente ao gabinete ministerial.
              </p>
              <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                <PrayerRequestDialog
                  tenantSlug={slug}
                  triggerButton={
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs font-bold hover:border-primary hover:text-primary cursor-pointer gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Enviar Pedido</span>
                    </Button>
                  }
                />
                <Link href={`/${slug}/devocional`} className="flex-1">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full text-xs font-bold gap-1.5 shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Check-in</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Card 3: Agente Devocional IA */}
          {canSeeMenu("/devocional") && (
            <div className="group relative rounded-2xl overflow-hidden border border-border/80 hover:border-primary/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
              <div className="relative h-44 sm:h-48 w-full overflow-hidden shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?auto=format&fit=crop&w=800&q=80"
                  alt="Agente Devocional IA"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />
                <div className="absolute inset-0 bg-indigo-500/10 mix-blend-overlay" />

                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide backdrop-blur-md bg-black/60 border border-white/20 text-indigo-300 shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Inteligência Bíblica 24h</span>
                </div>

                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>

                <div className="absolute bottom-3 left-3.5 right-3.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 drop-shadow-sm">
                    Mentoria & Ensino
                  </p>
                  <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover:text-primary-foreground drop-shadow-md">
                    Agente Devocional IA
                  </h3>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between bg-card/70 backdrop-blur-xs">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Reflexões diárias, memorização da Palavra e mentoria cristã com inteligência artificial fundamentada nas escrituras.
                </p>
                <div className="mt-4 pt-3 border-t border-border/50">
                  <Link href={`/${slug}/devocional`} className="block w-full">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full text-xs font-bold gap-1.5 shadow-md cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Iniciar Devocional Interativo</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Check-in Kids Seguro */}
          <div className="group relative rounded-2xl overflow-hidden border border-border/80 hover:border-primary/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="relative h-44 sm:h-48 w-full overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80"
                alt="Check-in Kids Seguro"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />
              <div className="absolute inset-0 bg-amber-500/10 mix-blend-overlay" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide backdrop-blur-md bg-black/60 border border-white/20 text-amber-300 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Código & Etiqueta PIN</span>
              </div>

              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="absolute bottom-3 left-3.5 right-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 drop-shadow-sm">
                  Segurança Infantil
                </p>
                <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover:text-primary-foreground drop-shadow-md">
                  Check-in Kids Seguro
                </h3>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between bg-card/70 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Entrada segura para crianças com etiqueta, alerta de alergias e liberação estritamente com o código dos pais.
              </p>
              <div className="mt-4 pt-3 border-t border-border/50">
                <Link href={`/${slug}/kids`} className="block w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold gap-1.5 hover:border-primary hover:text-primary cursor-pointer"
                  >
                    <Baby className="w-3.5 h-3.5 text-amber-500" />
                    <span>Acessar Espaço Kids</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Card 5: Células & Grupos de Conexão */}
          <div className="group relative rounded-2xl overflow-hidden border border-border/80 hover:border-primary/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="relative h-44 sm:h-48 w-full overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80"
                alt="Células e Grupos"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />
              <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide backdrop-blur-md bg-black/60 border border-white/20 text-emerald-300 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{tenant.cellGroups.length} Células Ativas</span>
              </div>

              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="absolute bottom-3 left-3.5 right-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 drop-shadow-sm">
                  Igreja nos Lares
                </p>
                <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover:text-primary-foreground drop-shadow-md">
                  Células & Pequenos Grupos
                </h3>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between bg-card/70 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Comunhão genuína, acolhimento e estudo nos lares. Encontre o grupo mais perto da sua casa.
              </p>
              <div className="mt-4 pt-3 border-t border-border/50">
                <Link href={`/${slug}/celulas`} className="block w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold gap-1.5 hover:border-primary hover:text-primary cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Ver Grupos ({tenant.cellGroups.length})</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Card 6: Agenda, Eventos & Bilheteria */}
          <div className="group relative rounded-2xl overflow-hidden border border-border/80 hover:border-primary/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="relative h-44 sm:h-48 w-full overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80"
                alt="Agenda e Eventos"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />
              <div className="absolute inset-0 bg-sky-500/10 mix-blend-overlay" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide backdrop-blur-md bg-black/60 border border-white/20 text-sky-300 shadow-md">
                <Ticket className="w-3.5 h-3.5 text-sky-400" />
                <span>Ingressos & QR Code</span>
              </div>

              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="absolute bottom-3 left-3.5 right-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400 drop-shadow-sm">
                  Programação Oficial
                </p>
                <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover:text-primary-foreground drop-shadow-md">
                  Agenda & Bilheteria
                </h3>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between bg-card/70 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Congressos, cultos especiais, acampamentos com credenciais com QR Code e catraca antifraude na portaria.
              </p>
              <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                <Link href={`/${slug}/agenda`} className="flex-1">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full text-xs font-bold gap-1.5 shadow-md cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Ver Agenda</span>
                  </Button>
                </Link>
                <Link href={`/${slug}/meus-ingressos`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold gap-1.5 hover:border-primary hover:text-primary cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>Carteira</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Card 7: Cultos & Vídeos Online */}
          <div className="group relative rounded-2xl overflow-hidden border border-border/80 hover:border-primary/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="relative h-44 sm:h-48 w-full overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80"
                alt="Cultos e Vídeos Online"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />
              <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide backdrop-blur-md bg-black/60 border border-white/20 text-red-300 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>{tenant.videos.length > 0 ? `${tenant.videos.length} Pregações` : "Canal Oficial"}</span>
              </div>

              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="absolute bottom-3 left-3.5 right-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-400 drop-shadow-sm">
                  Transmissões YouTube
                </p>
                <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover:text-primary-foreground drop-shadow-md">
                  Cultos & Vídeos Online
                </h3>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between bg-card/70 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Assista aos cultos de celebração, pregações pastorais e louvores gravados diretamente no celular.
              </p>
              <div className="mt-4 pt-3 border-t border-border/50">
                <Link href={`/${slug}/videos`} className="block w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold gap-1.5 hover:border-primary hover:text-primary cursor-pointer"
                  >
                    <Tv className="w-3.5 h-3.5 text-red-500" />
                    <span>Assistir Mensagens ({tenant.videos.length})</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Card 8: Ministérios da Igreja */}
          <div className="group relative rounded-2xl overflow-hidden border border-border/80 hover:border-primary/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="relative h-44 sm:h-48 w-full overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80"
                alt="Ministérios da Igreja"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />
              <div className="absolute inset-0 bg-purple-500/10 mix-blend-overlay" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide backdrop-blur-md bg-black/60 border border-white/20 text-purple-300 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>{tenant.ministries.length} Ministérios Ativos</span>
              </div>

              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="absolute bottom-3 left-3.5 right-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 drop-shadow-sm">
                  Serviço & Propósito
                </p>
                <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover:text-primary-foreground drop-shadow-md">
                  Ministérios & Escalas
                </h3>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between bg-card/70 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Louvor, Dança, Mídia, Kids, Recepção e Intercessão. Gerencie atas de reunião, voluntários e tarefas.
              </p>
              <div className="mt-4 pt-3 border-t border-border/50">
                <Link href={`/${slug}/ministerios`} className="block w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-bold gap-1.5 hover:border-primary hover:text-primary cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Ver Ministérios ({tenant.ministries.length})</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Card 9: Rede, Filiais & Membresia */}
          <div className="group relative rounded-2xl overflow-hidden border border-border/80 hover:border-primary/60 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="relative h-44 sm:h-48 w-full overflow-hidden shrink-0">
              <img
                src="https://images.unsplash.com/photo-1548625361-1959779dfcf3?auto=format&fit=crop&w=800&q=80"
                alt="Rede e Filiais"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />
              <div className="absolute inset-0 bg-amber-500/10 mix-blend-overlay" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide backdrop-blur-md bg-black/60 border border-white/20 text-amber-300 shadow-md">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>{isMatriz ? `${tenant.branches.length} Filiais` : "Filial Vinculada"}</span>
              </div>

              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="absolute bottom-3 left-3.5 right-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 drop-shadow-sm">
                  Expansão & Governança
                </p>
                <h3 className="text-lg font-black text-white tracking-tight leading-tight group-hover:text-primary-foreground drop-shadow-md">
                  Rede & Congregações
                </h3>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between bg-card/70 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isMatriz
                  ? `${tenant.branches.length} congregações conectadas sob a mesma visão pastoral e ministerial.`
                  : `Filial pertencente à congregação ${tenant.parent?.name || "Matriz"}.`}
              </p>

              {isMatriz && tenant.branches.length > 0 && (
                <div className="space-y-1 mt-2 max-h-24 overflow-y-auto">
                  {tenant.branches.map((b) => (
                    <Link
                      key={b.id}
                      href={`/${b.slug}`}
                      className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground transition-colors border border-border/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: b.primaryColor }}
                        />
                        <span className="truncate font-semibold">{b.name}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}

              <div className="pt-3 mt-3 border-t border-border/50 flex flex-col gap-1.5">
                {isMatriz && canDoAction("create_church") && (
                  <CreateChurchDialog
                    defaultTab="branch"
                    parentTenantId={tenant.id}
                    existingTenants={[
                      {
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                        primaryColor: tenant.primaryColor,
                      },
                    ]}
                    triggerButton={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-bold gap-1.5 h-8 border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/10 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ Cadastrar Nova Filial</span>
                      </Button>
                    }
                  />
                )}

                {canSeeMenu("/membros") && (
                  <Link href={`/${slug}/membros`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold gap-1.5 h-8 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 transition-all cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Controle de Membros</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Seção Pastoral Local */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>Liderança Pastoral Local</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Equipe ministerial dedicada a pastorear a {tenant.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {pastor ? pastor.name.charAt(0) : "P"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {pastor ? pastor.name : "Pr. Responsável"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pastor Titular da {tenant.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PastoralCounselingTrigger
                slug={slug}
                isOnline={pastor?.isLiveAvailable}
                pastorName={pastor?.name}
              />
              <PrayerRequestDialog
                tenantSlug={slug}
                triggerButton={
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                    Pedir Oração
                  </Button>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
