import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1F3A",
};

import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/session";
import { RoleImpersonator } from "@/components/role-impersonator";
import { ThemeProvider, ThemeScript } from "@/components/theme-provider";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getSession();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";
  const iconUrl = session?.tenantSlug ? `/api/icon/${session.tenantSlug}` : "/logo-horeb.png";
  const manifestUrl = session?.tenantSlug ? `/api/manifest/${session.tenantSlug}` : "/manifest.json";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: "Horeb SaaS • Plataforma de Gestão para Igrejas & Biblioteca Cristã Digital",
      template: "%s | Horeb SaaS",
    },
    description:
      "Plataforma completa de gestão eclesiástica White-Label e Mobile-First (PWA) para igrejas: membros, células, EBD, check-in Kids, financeiro PIX, IA pastoral e E-books cristãos do Pr. Luan Demattos.",
    keywords: [
      "sistema para igrejas",
      "gestão eclesiástica",
      "aplicativo para igreja",
      "Horeb SaaS",
      "Lynx EMS Sistemas",
      "check-in kids igreja",
      "gestão de células",
      "dízimos e ofertas pix",
      "ebooks cristãos",
      "Pr. Luan Demattos",
      "Os Seis Instintos da Alma",
      "Batalha Invisível",
      "Libertação Espiritual",
    ],
    authors: [{ name: "Lynx EMS Sistemas", url: baseUrl }],
    creator: "Lynx EMS Sistemas",
    publisher: "Horeb SaaS • Lynx EMS Sistemas",
    manifest: manifestUrl,
    alternates: {
      canonical: baseUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: baseUrl,
      siteName: "Horeb SaaS • Soluções para Igrejas",
      title: "Horeb SaaS • Toda a Sua Igreja Conectada em um Só Lugar",
      description:
        "Sistema completo para igrejas com 30 dias grátis: gestão de membros, células, EBD, financeiro PIX, secretaria, IA pastoral e biblioteca de E-books cristãos.",
      images: [
        {
          url: `${baseUrl}/logo-horeb.png`,
          width: 800,
          height: 600,
          alt: "Horeb SaaS - Plataforma para Igrejas",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Horeb SaaS • Plataforma Completa para Igrejas",
      description:
        "Gestão de membros, células, EBD, financeiro PIX, IA pastoral e biblioteca de E-books cristãos.",
      images: [`${baseUrl}/logo-horeb.png`],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Horeb App",
    },
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: iconUrl,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";

  const structuredDataJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Horeb SaaS • Lynx EMS Sistemas",
        url: baseUrl,
        logo: `${baseUrl}/logo-horeb.png`,
        description:
          "Plataforma SaaS White-Label para gestão de igrejas, ministérios e biblioteca cristã digital.",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${baseUrl}/#software`,
        name: "Horeb Sistema Eclesiástico",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android (PWA)",
        url: baseUrl,
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "149.00",
          highPrice: "399.00",
          priceCurrency: "BRL",
          offerCount: 3,
        },
        description:
          "Sistema completo de gestão para igrejas com 30 dias gratuitos: membros, células, EBD, check-in Kids, tesouraria PIX, assembleias e IA pastoral.",
      },
    ],
  };

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <link rel="help" type="text/plain" href="/llms.txt" title="AI & LLM Context Documentation" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataJsonLd) }}
        />
      </head>
      <body className="min-h-[100dvh] flex flex-col bg-background text-foreground transition-colors duration-200 overflow-x-hidden">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
          {(session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN") && (
            <RoleImpersonatorWrapper session={session} />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}

// Criando um componente de wrapper para buscar os perfis do banco sem atrasar o layout principal
import { getRolePermissions } from "@/app/actions/permissions";
async function RoleImpersonatorWrapper({ session }: { session: any }) {
  const permissionsRes = await getRolePermissions();
  const dbRoles = permissionsRes.permissions || [];
  
  const customRoles = dbRoles.map((r: any) => ({
    value: r.role,
    label: r.description ? `${r.role} (${r.description})` : r.role
  }));

  return (
    <RoleImpersonator 
      originalRole={session.originalRole || session.role} 
      effectiveRole={session.role}
      customRoles={customRoles}
    />
  );
}
