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
        where: { role: "PASTOR" },
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

      {/* 2. Grid de 6 Recursos da Plataforma (Conceito do Designer) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>Serviços & Engajamento</span>
          </h2>
          <span className="text-xs text-muted-foreground">
            Horeb Mobile Experience
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Card 1: Dízimos & Ofertas (PIX) */}
          <div className="group block focus:outline-none">
            <Card className="h-full border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <HeartHandshake className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Dízimos & Ofertas</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                </CardTitle>
                <CardDescription className="text-xs">
                  PIX Fricção Zero com QR Code em menos de 10 segundos.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 mt-2">
                  <Link href={`/${slug}/doar`} className="flex-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full text-xs font-semibold cursor-pointer"
                    >
                      Contribuir PIX
                    </Button>
                  </Link>
                  {canSeeMenu("/admin/finance") && (
                    <Link href={`/${slug}/admin/finance`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs font-bold border-amber-500/30 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                      >
                        Tesouraria (ERP)
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card 2: Pedidos de Oração */}
          <div className="group block focus:outline-none">
            <Card className="h-full border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Pedidos de Oração</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                </CardTitle>
                <CardDescription className="text-xs">
                  Sua igreja unida em oração. Envie seu pedido pastoral sigiloso.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 mt-2">
                  <PrayerRequestDialog
                    tenantSlug={slug}
                    triggerButton={
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs font-semibold hover:border-primary hover:text-primary cursor-pointer"
                      >
                        Enviar Pedido
                      </Button>
                    }
                  />
                  <Link href={`/${slug}/devocional`} className="flex-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full text-xs font-bold gap-1 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Check-in</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card: Agente Devocional IA */}
          {canSeeMenu("/devocional") && (
            <Link href={`/${slug}/devocional`} className="group block focus:outline-none">
              <Card className="h-full border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Bot className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>Agente Devocional IA</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comunicação, ensino e mentoria com inteligência artificial baseada na bíblia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-xs font-semibold border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Iniciar Devocional
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Card 3: Check-in Kids */}
          <Link href={`/${slug}/kids`} className="group block focus:outline-none">
            <Card className="h-full border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Baby className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Check-in Kids</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                </CardTitle>
                <CardDescription className="text-xs">
                  Entrada segura para crianças com etiqueta e código de retirada.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs font-semibold hover:border-primary hover:text-primary"
                >
                  Espaço Kids
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Card 4: Células & Grupos */}
          <Link href={`/${slug}/celulas`} className="group block focus:outline-none">
            <Card className="h-full border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Células & Grupos</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                </CardTitle>
                <CardDescription className="text-xs">
                  {tenant.cellGroups.length} pequenos grupos ativos reunindo-se nos lares.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs font-semibold hover:border-primary hover:text-primary"
                >
                  Ver Grupos ({tenant.cellGroups.length})
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Card 5: Agenda e Eventos */}
          <Link href={`/${slug}/agenda`} className="group block focus:outline-none">
            <Card className="h-full border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Agenda & Eventos</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                </CardTitle>
                <CardDescription className="text-xs">
                  Cultos semanais, congressos, vigílias e programações especiais.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs font-semibold hover:border-primary hover:text-primary cursor-pointer"
                >
                  Ver Agenda Completa
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Card: Cultos & Vídeos Online */}
          <Link href={`/${slug}/videos`} className="group block focus:outline-none">
            <Card className="h-full border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Tv className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Cultos & Vídeos Online</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                </CardTitle>
                <CardDescription className="text-xs">
                  {tenant.videos.length > 0
                    ? `${tenant.videos.length} pregações e cultos disponíveis no YouTube.`
                    : "Assista aos cultos e mensagens pastorais pelo YouTube."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs font-semibold hover:border-primary hover:text-primary"
                >
                  Assistir Vídeos ({tenant.videos.length})
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Card: Ministérios da Igreja */}
          <Link href={`/${slug}/ministerios`} className="group block focus:outline-none">
            <Card className="h-full border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Ministérios da Igreja</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                </CardTitle>
                <CardDescription className="text-xs">
                  {tenant.ministries.length > 0
                    ? `${tenant.ministries.length} ministérios em atividade (Louvor, Jovens, Casais...).`
                    : "Conheça os ministérios e áreas de atuação da congregação."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs font-semibold hover:border-primary hover:text-primary"
                >
                  Ver Ministérios ({tenant.ministries.length})
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Card 6: Gestão, Filiais & Membresia */}
          <div className="group block focus:outline-none">
            <Card className="h-full border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {isMatriz ? `${tenant.branches.length} Filiais` : "Filial Vinculada"}
                  </span>
                </div>
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>Rede & Filiais</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isMatriz
                    ? `${tenant.branches.length} congregações filiais conectadas a esta matriz.`
                    : `Filial pertencente à ${tenant.parent?.name || "Matriz"}.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {isMatriz && tenant.branches.length > 0 ? (
                  <div className="space-y-1.5 mt-1">
                    {tenant.branches.map((b) => (
                      <Link
                        key={b.id}
                        href={`/${b.slug}`}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/50 hover:bg-muted text-foreground transition-colors border border-border/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: b.primaryColor }}
                          />
                          <span className="truncate font-semibold">{b.name}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground bg-muted/60 p-2.5 rounded-lg mt-1">
                    {isMatriz
                      ? "Cadastre filiais para expandir a estrutura da sua igreja."
                      : `Conectada à ${tenant.parent?.name || "Matriz Sede"}.`}
                  </div>
                )}

                {/* Ações da Rede de Igrejas */}
                <div className="pt-2 flex flex-col gap-1.5">
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
                          className="w-full text-xs font-bold gap-1.5 h-9 border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/10 transition-all cursor-pointer"
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
                        className="w-full text-xs font-bold gap-1.5 h-9 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 transition-all cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Controle de Membros & Níveis de Acesso</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
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
            <PrayerRequestDialog
              tenantSlug={slug}
              triggerButton={
                <Button variant="outline" size="sm" className="text-xs">
                  Falar com Pastor
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
