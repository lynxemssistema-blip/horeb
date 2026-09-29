import Image from "next/image";
import Link from "next/link";
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
import { CreateChurchDialog } from "@/components/create-church-dialog";
import { PricingSection } from "@/components/pricing-section";
import { NativeMobileTools } from "@/components/native-mobile-tools";
import { AboutHorebSection } from "@/components/about-horeb-section";
import {
  Church,
  ArrowRight,
  ShieldCheck,
  Users,
  HeartHandshake,
  Calendar,
  BookOpen,
  MessageCircle,
  Smartphone,
  Cloud,
  Headphones,
  Sparkles,
  Layers,
  ChevronRight,
  CreditCard,
  HelpCircle,
  ShieldAlert,
  Crown,
  LogOut,
  ArrowLeftRight,
} from "lucide-react";
import { getPromotionConfig } from "@/app/actions/superadmin";
import { HelpGuideDialog } from "@/components/help-guide-dialog";
import { getSession } from "@/lib/session";
import { logoutUser } from "@/app/actions/tenant";
import { redirect } from "next/navigation";

export default async function HomePage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const isAuthRequired = searchParams.auth === "required";
  const isAdminAuthRequired = searchParams.auth === "admin_required";
  const churchSlug = typeof searchParams.church === "string" ? searchParams.church : null;
  const isSwitching = searchParams.switch === "true" || searchParams.select === "true";

  // Carregar sessão do usuário conectado para exibir ações personalizadas na home
  const session = await getSession();

  let userChurch = null;
  if (session && session.tenantSlug) {
    userChurch = await prisma.tenant.findUnique({
      where: { slug: session.tenantSlug },
      select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true },
    });
  }

  const [tenants, promoRes] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        parent: true,
        branches: true,
        cellGroups: true,
      },
    }),
    getPromotionConfig(),
  ]);

  return (
    <div className="min-h-[100dvh] bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200 relative overflow-x-hidden">
      {/* Ferramentas Nativas para Celular (PWA Banner & Instalação) */}
      <NativeMobileTools />

      {/* Botão Flutuante de Ajuda & Guia Completo */}
      <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[calc(1.25rem+env(safe-area-inset-right,0px))] z-50 shadow-2xl">
        <HelpGuideDialog
          triggerButton={
            <Button
              className="h-11 sm:h-12 px-3.5 sm:px-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-xs shadow-[0_10px_30px_rgba(245,158,11,0.4)] gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-400/40"
            >
              <HelpCircle className="w-4 h-4 text-black" />
              <span className="hidden sm:inline">Guia de Uso & Dúvidas</span>
              <span className="sm:hidden">Ajuda</span>
            </Button>
          }
        />
      </div>

      {/* Luz Ambiente / Ambient Glow no Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[450px] bg-gradient-to-b from-amber-500/15 via-yellow-500/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/2 -left-60 w-96 h-96 bg-amber-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-2/3 -right-60 w-96 h-96 bg-yellow-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-20 space-y-16 relative z-10">
        {/* Top Logo & Hero Section */}
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="relative w-64 sm:w-80 md:w-96 h-24 sm:h-32 transition-transform hover:scale-[1.03] duration-500">
            <Image
              src="/logo-horeb.png"
              alt="Horeb - Soluções Tecnologias Para Igrejas"
              fill
              sizes="(max-width: 768px) 256px, 384px"
              className="object-contain drop-shadow-[0_12px_30px_rgba(245,158,11,0.22)]"
              priority
            />
          </div>

          {/* Banner de Usuário Conectado */}
          {session && (
            <div className="w-full max-w-xl p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-zinc-900/90 to-amber-500/10 border border-amber-500/40 text-amber-200 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in-0 slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold text-white truncate">
                    Conectado como <strong className="text-amber-400">{session.name}</strong>
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    Sua Congregação: <strong className="text-zinc-200">{userChurch?.name || session.tenantSlug}</strong>
                  </p>
                </div>
              </div>

              <Link href={session.role === "SUPERADMIN" ? "/admin" : `/${session.tenantSlug}`}>
                <Button
                  size="sm"
                  className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs gap-1.5 shadow-md shadow-amber-500/30 shrink-0"
                >
                  <span>Ir para minha igreja</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}

          {/* Banner de Autenticação Necessária (Isolamento de Tenants) */}
          {isAuthRequired && (
            <div className="w-full max-w-xl p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-start gap-3.5 shadow-2xl backdrop-blur-md animate-in fade-in-0 slide-in-from-top-4 duration-300">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-left">
                <p className="font-black text-amber-300">
                  🔒 Acesso Restrito à Congregação {churchSlug ? `(${churchSlug.toUpperCase()})` : ""}
                </p>
                <p className="text-zinc-300 leading-relaxed text-xs">
                  Por política de isolamento e segurança, o acesso aos dados internos e ferramentas da congregação é exclusivo para membros e líderes logados. Faça login abaixo com sua conta ou cadastre sua igreja.
                </p>
              </div>
            </div>
          )}

          {/* Banner de Autenticação Necessária (Super Admin) */}
          {isAdminAuthRequired && (
            <div className="w-full max-w-xl p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-start gap-3.5 shadow-2xl backdrop-blur-md animate-in fade-in-0 slide-in-from-top-4 duration-300">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-left">
                <p className="font-black text-amber-300">
                  🔒 Acesso Restrito ao Painel Executivo Super Admin
                </p>
                <p className="text-zinc-300 leading-relaxed text-xs">
                  A área /admin é reservada aos administradores da Lynx EMS Sistemas. Faça login abaixo com a conta credenciada de Super Admin para prosseguir.
                </p>
              </div>
            </div>
          )}

          <a href="#origem-horeb" className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold tracking-widest uppercase shadow-sm backdrop-blur-md hover:bg-amber-500/20 transition-colors">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mais que tecnologia, é sobre propósito • Conheça a Origem</span>
          </a>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-3xl leading-[1.1] pt-1">
            TODA A SUA IGREJA CONECTADA EM UM{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
              SÓ LUGAR.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
            A Horeb é a plataforma completa e intuitiva que aproxima a igreja da sua comunidade, facilita a gestão e potencializa o seu ministério com White-Label dinâmico.
          </p>

          {/* CTA de Ações - Usuário Logado ou Visitante */}
          {session && session.tenantSlug ? (
            <div className="flex flex-col items-center gap-4 pt-3 w-full max-w-xl">
              {/* BOTÃO CHAMATIVO PRINCIPAL SOLICITADO */}
              <Link
                href={session.role === "SUPERADMIN" ? "/admin" : `/${session.tenantSlug}`}
                className="w-full group block"
              >
                <div className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-black shadow-[0_0_40px_rgba(245,158,11,0.55)] transition-all hover:scale-[1.02] active:scale-98 border-2 border-amber-300 cursor-pointer flex items-center justify-between gap-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-black/15 border border-black/10 flex items-center justify-center text-black shrink-0 shadow-inner">
                      {session.role === "SUPERADMIN" ? (
                        <Crown className="w-7 h-7 text-black" />
                      ) : (
                        <Church className="w-7 h-7 text-black" />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <span className="block text-[11px] sm:text-xs uppercase tracking-wider text-black/80 font-black leading-none mb-1">
                        {session.role === "SUPERADMIN" ? "Acesso Master Global" : "Você já está conectado"}
                      </span>
                      <span className="block text-xl sm:text-2xl font-black text-black leading-tight tracking-tight">
                        Ir para Minha Igreja
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-black/15 px-3.5 py-2 rounded-xl border border-black/15 group-hover:translate-x-1.5 transition-transform shrink-0 relative z-10">
                    <span className="text-xs font-black text-black hidden sm:inline truncate max-w-[140px]">
                      {userChurch?.name || session.tenantSlug}
                    </span>
                    <ArrowRight className="w-5 h-5 text-black" />
                  </div>
                </div>
              </Link>

              {/* Atalhos Secundários para o Usuário Conectado */}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {session.role === "SUPERADMIN" && (
                  <Link href="/admin">
                    <Button
                      variant="outline"
                      className="h-10 px-4 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs gap-1.5 backdrop-blur-md transition-all hover:scale-105"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Painel Super Admin</span>
                    </Button>
                  </Link>
                )}

                <Link href="/select-church">
                  <Button
                    variant="outline"
                    className="h-10 px-4 rounded-xl border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] hover:text-white text-zinc-200 font-bold text-xs gap-1.5 backdrop-blur-md transition-all hover:scale-105"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Trocar Congregação</span>
                  </Button>
                </Link>

                <HelpGuideDialog
                  triggerButton={
                    <Button
                      variant="outline"
                      className="h-10 px-4 rounded-xl border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 font-bold text-xs gap-1.5 backdrop-blur-md transition-all hover:scale-105"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Guia de Uso</span>
                    </Button>
                  }
                />

                <form
                  action={async () => {
                    "use server";
                    await logoutUser();
                    redirect("/?switch=true");
                  }}
                >
                  <Button
                    type="submit"
                    variant="ghost"
                    className="h-10 px-3.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 font-bold text-xs gap-1.5 transition-colors cursor-pointer"
                    title="Desconectar da conta atual"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
              <CreateChurchDialog
                existingTenants={tenants.map((t) => ({
                  id: t.id,
                  name: t.name,
                  slug: t.slug,
                  primaryColor: t.primaryColor,
                }))}
                defaultTab="master"
                triggerButton={
                  <Button className="h-12 px-6 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-sm rounded-xl shadow-xl shadow-amber-500/25 gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer">
                    <Sparkles className="w-4 h-4" />
                    <span>Cadastrar Minha Igreja (Master)</span>
                  </Button>
                }
              />

              <CreateChurchDialog
                existingTenants={tenants.map((t) => ({
                  id: t.id,
                  name: t.name,
                  slug: t.slug,
                  primaryColor: t.primaryColor,
                }))}
                defaultTab="login"
                triggerButton={
                  <Button
                    variant="outline"
                    className="h-12 px-5 border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] hover:text-white text-zinc-200 font-bold text-sm rounded-xl gap-2 backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
                  >
                    <span>Já Sou Líder • Fazer Login</span>
                  </Button>
                }
              />

              <HelpGuideDialog
                triggerButton={
                  <Button
                    variant="outline"
                    className="h-12 px-5 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-sm rounded-xl gap-2 backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>Como Funciona • Guia</span>
                  </Button>
                }
              />

              <a href="#planos">
                <Button
                  variant="ghost"
                  className="h-12 px-5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 font-bold text-sm rounded-xl gap-2 transition-all hover:scale-105 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Ver Planos & Valores</span>
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* 6 Recursos do Conceito do Designer com Glassmorphism */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: Users,
              title: "Gestão de Membros",
              desc: "Cadastros, grupos e ministérios organizados em tempo real.",
            },
            {
              icon: HeartHandshake,
              title: "Ofertas e Dízimos",
              desc: "PIX Fricção Zero com QR Code em menos de 10 segundos.",
            },
            {
              icon: Calendar,
              title: "Agenda e Eventos",
              desc: "Organize e divulgue os cultos da semana com facilidade.",
            },
            {
              icon: BookOpen,
              title: "Conteúdos e Cursos",
              desc: "Ensine, discipule e alcance mais vidas com devocionais.",
            },
            {
              icon: MessageCircle,
              title: "Comunicação",
              desc: "Mantenha sua congregação sempre informada e engajada.",
            },
            {
              icon: Smartphone,
              title: "Mobile-First (PWA)",
              desc: "Projetado para celular com Bottom Bar e Check-in Kids.",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/40 hover:bg-white/[0.04] transition-all duration-300 flex items-start gap-4 group shadow-lg shadow-black/20"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-amber-500/20 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Por que Horeb? O Significado por Trás do Nome */}
        <AboutHorebSection />

        {/* Planos Comerciais & Estrutura de Negócio Horeb */}
        <PricingSection
          existingTenants={tenants.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            primaryColor: t.primaryColor,
          }))}
          promoConfig={promoRes.config}
        />

        {/* Pilares de Confiança */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-xs text-zinc-400 pt-6 border-t border-white/[0.08]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Segurança Criptografada</span>
          </div>
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-amber-400" />
            <span>Infraestrutura em Nuvem VPS</span>
          </div>
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-amber-400" />
            <span>Suporte Especializado para Líderes</span>
          </div>
        </div>
      </div>

      {/* Footer Final com Glassmorphism */}
      <footer className="border-t border-white/[0.08] bg-black/70 backdrop-blur-xl py-6 px-4 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-zinc-300">
              Horeb • Desenvolvido e Gerenciado por <strong className="text-white">Lynx EMS Sistemas</strong>
            </span>
            <span className="text-zinc-600">•</span>
            <Link
              href="/admin"
              className="text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1 font-bold"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Painel Super Admin</span>
            </Link>
          </div>
          <span className="italic text-amber-400 font-medium tracking-wide">
            &ldquo;Juntos por um maior alcance.&rdquo;
          </span>
        </div>
      </footer>
    </div>
  );
}
