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
} from "lucide-react";

export default async function HomePage() {
  const tenants = await prisma.tenant.findMany({
    include: {
      parent: true,
      branches: true,
      cellGroups: true,
    },
  });

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200 relative overflow-x-hidden">
      {/* Ferramentas Nativas para Celular (PWA Banner & Instalação) */}
      <NativeMobileTools />

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

          {/* CTA de Ações Master */}
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

        {/* Seleção de Igrejas para Testar (Multi-Tenant White Label) */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                <Church className="w-5 h-5 text-amber-400" />
                <span>Congregações Ativas na Nuvem</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Alterne entre as igrejas para conferir o White-Label em ação e a injeção dinâmica de temas:
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <CreateChurchDialog
                existingTenants={tenants.map((t) => ({
                  id: t.id,
                  name: t.name,
                  slug: t.slug,
                  primaryColor: t.primaryColor,
                }))}
                defaultTab="branch"
                triggerButton={
                  <Button
                    size="sm"
                    className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-xl gap-1.5 h-9 px-3 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>+ Nova Filial</span>
                  </Button>
                }
              />
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                VPS Online
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tenants.map((t) => {
              const isMatriz = !t.parentId;
              return (
                <Card
                  key={t.id}
                  className="bg-zinc-900/70 border border-white/[0.08] hover:border-white/20 transition-all duration-300 relative overflow-hidden shadow-2xl group rounded-2xl backdrop-blur-md"
                >
                  {/* Linha Superior Colorida de Identidade Visual */}
                  <div
                    className="h-1.5 w-full transition-all"
                    style={{ backgroundColor: t.primaryColor }}
                  />

                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${t.primaryColor}20`,
                          color: t.primaryColor,
                          border: `1px solid ${t.primaryColor}40`,
                        }}
                      >
                        {isMatriz ? "Igreja Sede (Matriz)" : "Filial Vinculada"}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                        <span
                          className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: t.primaryColor }}
                        />
                        {t.primaryColor}
                      </span>
                    </div>

                    <CardTitle className="text-2xl font-black text-white mt-2 group-hover:text-amber-300 transition-colors">
                      {t.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                      <span>URL:</span>
                      <code className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        /{t.slug}
                      </code>
                      {t.parent && (
                        <span className="text-zinc-500 truncate ml-1 font-sans">
                          • Vinculada à {t.parent.name}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="text-xs text-zinc-400 space-y-2.5">
                    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                      <span>Células nos Lares:</span>
                      <span className="font-semibold text-zinc-200">
                        {t.cellGroups.length} ativas
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
                      <span>Módulo PIX Fricção Zero:</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Pronto para Doações
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span>Paleta White-Label:</span>
                      <span className="font-bold font-mono" style={{ color: t.primaryColor }}>
                        {t.primaryColor}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 pb-5 flex gap-2.5">
                    <Link href={`/${t.slug}`} className="flex-1">
                      <Button
                        className="w-full text-white font-extrabold h-11 rounded-xl shadow-lg transition-all group-hover:brightness-110 cursor-pointer flex items-center justify-center gap-1.5"
                        style={{ backgroundColor: t.primaryColor }}
                      >
                        <span>Entrar no App da Igreja</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>

                    <Link href={`/${t.slug}/doar`}>
                      <Button
                        variant="outline"
                        className="h-11 border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white font-bold px-3.5 rounded-xl cursor-pointer"
                        title="Doar via PIX"
                      >
                        <HeartHandshake className="w-4 h-4 text-amber-400 mr-1" />
                        <span>PIX</span>
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Planos Comerciais & Estrutura de Negócio Horeb */}
        <PricingSection
          existingTenants={tenants.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            primaryColor: t.primaryColor,
          }))}
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
              Horeb Soluções Tecnologias Para Igrejas
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
