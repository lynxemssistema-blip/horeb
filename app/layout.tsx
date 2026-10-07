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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#070709",
};

import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/session";
import { RoleImpersonator } from "@/components/role-impersonator";
import { ThemeProvider, ThemeScript } from "@/components/theme-provider";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getSession();
  const iconUrl = session?.tenantSlug ? `/api/icon/${session.tenantSlug}` : "/logo-horeb.png";
  const manifestUrl = session?.tenantSlug ? `/api/manifest/${session.tenantSlug}` : "/manifest.json";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br"),
    title: "Horeb SaaS • Soluções para Igrejas",
    description: "Plataforma de engajamento e gestão eclesial desenvolvida pela Lynx EMS Sistemas com motor White-Label dinâmico e arquitetura mobile-first.",
    manifest: manifestUrl,
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

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
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
