import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateTenantTheme } from "@/lib/theme";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { AppSidebar } from "@/components/app-sidebar";
import { getTenantBySlug } from "@/lib/supabase-service";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { primaryColor: true },
  });

  return {
    themeColor: tenant?.primaryColor || "#dc2626",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  if (!tenant) return { title: "Igreja não encontrada" };

  return {
    title: `${tenant.name} | App da Igreja`,
    description: `Portal oficial e engajamento da ${tenant.name}`,
  };
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { slug } = await params;

  // 1. Busca Server-Side com prioridade no Supabase (Nuvem VPS) e fallback no Prisma (Local)
  let tenantData: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
    logoUrl?: string | null;
    parentId?: string | null;
    parent?: { id: string; name: string; slug: string } | null;
    branches?: { id: string; name: string; slug: string; primaryColor: string }[];
  } | null = null;

  try {
    const supabaseTenant = await getTenantBySlug(slug);
    if (supabaseTenant) {
      tenantData = {
        id: supabaseTenant.id,
        name: supabaseTenant.name,
        slug: supabaseTenant.slug,
        primaryColor: supabaseTenant.primary_color || "#dc2626",
        logoUrl: supabaseTenant.logo_url,
        parentId: supabaseTenant.parent_id,
        parent: supabaseTenant.parent,
        branches: supabaseTenant.branches?.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          primaryColor: b.primary_color,
        })),
      };
    }
  } catch (err) {
    console.warn("Supabase fetch failed, falling back to Prisma", err);
  }

  if (!tenantData) {
    const prismaTenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        branches: { select: { id: true, name: true, slug: true, primaryColor: true } },
      },
    });

    if (prismaTenant) {
      tenantData = {
        id: prismaTenant.id,
        name: prismaTenant.name,
        slug: prismaTenant.slug,
        primaryColor: prismaTenant.primaryColor,
        logoUrl: prismaTenant.logoUrl,
        parentId: prismaTenant.parentId,
        parent: prismaTenant.parent,
        branches: prismaTenant.branches,
      };
    }
  }

  if (!tenantData) {
    notFound();
  }

  const tenant = tenantData;

  // 2. Motor White-Label: cálculo dinâmico de cores HSL, RGB, HEX e contraste
  const theme = generateTenantTheme(tenant.primaryColor);
  const isMatriz = !tenant.parentId;

  return (
    <div
      data-tenant={tenant.slug}
      className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased transition-colors"
      style={
        {
          "--primary": theme.hex,
          "--primary-foreground": theme.foreground,
          "--ring": theme.hex,
          "--sidebar-primary": theme.hex,
          "--sidebar-primary-foreground": theme.foreground,
          "--accent-church": theme.lightTint,
        } as React.CSSProperties
      }
    >
      {/* Injeção global no :root e escopo do Tenant */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary: ${theme.hex} !important;
              --primary-foreground: ${theme.foreground} !important;
              --ring: ${theme.hex} !important;
              --sidebar-primary: ${theme.hex} !important;
              --sidebar-primary-foreground: ${theme.foreground} !important;
            }
          `,
        }}
      />

      {/* Sidebar para Telas Desktop (md ou superior) */}
      <AppSidebar
        slug={tenant.slug}
        name={tenant.name}
        tenantId={tenant.id}
        logoUrl={tenant.logoUrl}
        primaryColor={tenant.primaryColor}
        isMatriz={isMatriz}
        parent={tenant.parent}
        branches={tenant.branches}
      />

      {/* Conteúdo Principal com Header e BottomNav */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          slug={tenant.slug}
          name={tenant.name}
          logoUrl={tenant.logoUrl}
          isMatriz={isMatriz}
          parent={tenant.parent}
          branches={tenant.branches}
        />

        <main className="flex-1 pb-24 md:pb-10 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          {children}
        </main>

        {/* Bottom Navigation Bar para Telas Mobile (abaixo de md) */}
        <BottomNav slug={tenant.slug} />
      </div>
    </div>
  );
}
