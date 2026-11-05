import type { MetadataRoute } from "next";
import { getPublicEbooks } from "@/app/actions/ebooks";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    const ebooksRes = await getPublicEbooks();
    if (ebooksRes.success && ebooksRes.ebooks) {
      for (const ebook of ebooksRes.ebooks) {
        routes.push({
          url: `${baseUrl}/ebooks/${ebook.id}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.9,
        });
      }
    }
  } catch {}

  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { slug: true, updatedAt: true },
      take: 100,
    });
    for (const t of tenants) {
      if (t.slug && t.slug !== "admin") {
        routes.push({
          url: `${baseUrl}/${t.slug}/agenda`,
          lastModified: t.updatedAt || new Date(),
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    }
  } catch {}

  return routes;
}
