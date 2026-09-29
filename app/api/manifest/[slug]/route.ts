import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true, primaryColor: true, slug: true },
  });

  const churchName = tenant?.name || "App da Igreja";
  const primaryColor = tenant?.primaryColor || "#10b981";
  const churchSlug = tenant?.slug || slug;

  const manifest = {
    name: `${churchName} • App Oficial`,
    short_name: churchName,
    description: `Aplicativo oficial e portal comunitário da ${churchName}. Cultos, eventos, células, orações e dízimos.`,
    start_url: `/${churchSlug}`,
    id: `/${churchSlug}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#070709",
    theme_color: primaryColor,
    lang: "pt-BR",
    categories: ["lifestyle", "social", "utilities"],
    icons: [
      {
        src: `/api/icon/${churchSlug}`,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: `/api/icon/${churchSlug}`,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
