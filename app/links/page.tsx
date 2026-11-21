import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublicEbooks } from "@/app/actions/ebooks";
import {
  BookOpen,
  Sparkles,
  ShoppingBag,
  Church,
  MessageCircle,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Camera,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";

export const metadata: Metadata = {
  title: "Links Oficiais • Horeb Apps & E-books Cristãos (@horeb_tecnologia)",
  description:
    "Acesse os E-books Bíblicos oficiais do Pr. Luan Demattos (por apenas R$ 9,90 com entrega imediata em PDF) e conheça o App White-Label Horeb para Igrejas.",
  alternates: {
    canonical: `${BASE_URL}/links`,
  },
  openGraph: {
    type: "website",
    url: `${BASE_URL}/links`,
    siteName: "Horeb • Tecnologia & Literatura Cristã",
    title: "📚 Biblioteca de E-books Bíblicos (R$ 9,90) & App Horeb para Igrejas",
    description:
      "Escolha seu E-book em PDF do Pr. Luan Demattos com entrega imediata no e-mail ou teste gratuitamente o App Horeb na sua igreja!",
    locale: "pt_BR",
    images: [
      {
        url: `${BASE_URL}/ebooks-covers/seis-instintos-da-alma.jpg?v=2`,
        width: 800,
        height: 1071,
        alt: "Biblioteca Digital Horeb • E-books Cristãos",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "📚 Biblioteca de E-books Bíblicos (R$ 9,90) & App Horeb",
    description:
      "Estudos bíblicos profundos em PDF com entrega imediata + Plataforma para Igrejas.",
    images: [`${BASE_URL}/ebooks-covers/seis-instintos-da-alma.jpg?v=2`],
  },
};

export default async function OfficialBioLinksPage() {
  const ebooksRes = await getPublicEbooks();
  const ebooks = ebooksRes.success && ebooksRes.ebooks ? ebooksRes.ebooks : [];

  const whatsappUrl =
    "https://wa.me/5531973651924?text=" +
    encodeURIComponent(
      "Paz do Senhor! Vim pelo Instagram @horeb_tecnologia e gostaria de saber mais sobre os E-books e o App Horeb."
    );

  return (
    <div className="min-h-[100dvh] bg-[#060608] text-zinc-100 relative overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* Iluminação de fundo premium */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[560px] h-[320px] bg-gradient-to-b from-amber-500/20 via-yellow-500/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[480px] h-[240px] bg-emerald-500/10 blur-3xl rounded-full" />
      </div>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-8 sm:py-12 space-y-7">
        {/* Cabeçalho @horeb_tecnologia */}
        <header className="flex flex-col items-center text-center space-y-3">
          <div className="relative w-44 h-16">
            <Image
              src="/logo-horeb.png"
              alt="Horeb • Tecnologia & Literatura Cristã"
              fill
              sizes="176px"
              className="object-contain drop-shadow-[0_8px_24px_rgba(245,158,11,0.28)]"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[11px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Central Oficial • @horeb_tecnologia</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
            Literatura Bíblica que Edifica &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
              Tecnologia para o Reino
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-md leading-relaxed">
            Toque no estudo bíblico desejado para receber o{" "}
            <strong className="text-zinc-200">PDF completo imediatamente no seu e-mail</strong> após
            a confirmação via PIX ou Cartão.
          </p>
        </header>

        {/* Seção 1: Vitrine Rápida dos E-books (1 Toque) */}
        <section className="space-y-3.5" aria-label="Biblioteca Digital de E-books">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
              <BookOpen className="w-4 h-4" />
              E-books Oficiais em PDF
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              Liberação Imediata
            </span>
          </div>

          {ebooks.map((ebook) => {
            const priceFormatted = Number(ebook.price || 9.9).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            });
            const originalFormatted =
              ebook.originalPrice && ebook.originalPrice > ebook.price
                ? Number(ebook.originalPrice).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })
                : null;
            const coverSrc = ebook.coverUrl || `/api/ebooks/cover/${ebook.id}.jpg?v=3`;

            return (
              <Link
                key={ebook.id}
                href={`/ebooks/${ebook.id}`}
                prefetch={false}
                className="group block rounded-2xl bg-zinc-900/90 hover:bg-zinc-900 border border-amber-500/25 hover:border-amber-400/70 p-3.5 shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex gap-3.5 items-center">
                  {/* Capa 4:5 sem cortes */}
                  <div className="relative w-20 sm:w-24 aspect-[3/4] rounded-xl overflow-hidden shrink-0 border border-white/10 bg-zinc-950 shadow-lg">
                    <img
                      src={coverSrc}
                      alt={ebook.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="eager"
                    />
                  </div>

                  {/* Informações + CTA */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ebook.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/35">
                          {ebook.badge}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-zinc-400 truncate">
                        ✍️ {ebook.author || "Pr. Luan Demattos"}
                      </span>
                    </div>

                    <h2 className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">
                      {ebook.title}
                    </h2>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {ebook.subtitle || ebook.description}
                    </p>

                    <div className="pt-1 flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-1.5">
                        {originalFormatted && (
                          <span className="text-[11px] text-zinc-500 line-through">
                            R$ {originalFormatted}
                          </span>
                        )}
                        <span className="text-base sm:text-lg font-black text-emerald-400">
                          R$ {priceFormatted}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-xs shadow-md shadow-amber-500/20 group-hover:brightness-110">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Comprar PDF</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        {/* Garantias rápidas */}
        <div className="grid grid-cols-2 gap-2.5 text-[11px] text-zinc-300">
          <div className="flex items-center gap-2 rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Checkout Seguro Asaas (PIX ou Cartão)</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-zinc-900/70 border border-white/10 px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>PDF enviado na hora para seu E-mail</span>
          </div>
        </div>

        {/* Seção 2: Plataforma Horeb para Igrejas & Atendimento */}
        <section className="space-y-2.5 pt-2 border-t border-white/10">
          <p className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
            Para Pastores, Líderes & Congregações
          </p>

          <Link
            href="/?home=true"
            prefetch={false}
            className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-amber-500/10 border border-amber-500/35 hover:border-amber-400 transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Church className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white truncate">
                  App Próprio & Gestão para sua Igreja
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  Teste 30 dias grátis • Células, Financeiro, EBD & Secretaria
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-emerald-200 truncate">
                  Falar com a Equipe Horeb no WhatsApp
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  Dúvidas sobre os E-books ou implantação na sua igreja
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </a>

          <a
            href="https://www.instagram.com/horeb_tecnologia/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-white/10 transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-zinc-200 truncate">
                  Seguir @horeb_tecnologia no Instagram
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  Novos estudos bíblicos e novidades toda semana
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </section>

        <footer className="pt-2 text-center text-[11px] text-zinc-500">
          © {new Date().getFullYear()} Horeb SaaS • Lynx EMS Sistemas
        </footer>
      </main>
    </div>
  );
}
