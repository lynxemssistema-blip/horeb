import React from "react";
import { notFound } from "next/navigation";
import { getPublicEbookById } from "@/app/actions/ebooks";
import { getSession } from "@/lib/session";
import { EbookProductLanding } from "@/components/ebook-product-landing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getPublicEbookById(id);

  if (!res.success || !res.ebook) {
    return {
      title: "E-book • Biblioteca Digital Horeb",
    };
  }

  const ebook = res.ebook;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";
  const priceStr = Number(ebook.price || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });
  const originalPriceStr =
    ebook.originalPrice && ebook.originalPrice > ebook.price
      ? Number(ebook.originalPrice).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })
      : null;

  const discountPercent =
    ebook.originalPrice && ebook.originalPrice > ebook.price
      ? Math.round(((ebook.originalPrice - ebook.price) / ebook.originalPrice) * 100)
      : 0;

  // Endpoint dedicado de imagem HTTP que serve a capa real do E-book (seja arquivo local ou capa enviada pelo Super Admin)
  const coverImageUrl = `${baseUrl}/api/ebooks/cover/${ebook.id}.jpg`;
  const pageUrl = `${baseUrl}/ebooks/${ebook.id}`;

  const commercialTitle = originalPriceStr
    ? `🔥 ${ebook.title} | De R$ ${originalPriceStr} por R$ ${priceStr}${
        discountPercent > 0 ? ` (${discountPercent}% OFF)` : ""
      }`
    : `📘 ${ebook.title} | Apenas R$ ${priceStr} (E-book Completo em PDF)`;

  const commercialDescription = [
    originalPriceStr
      ? `💰 OFERTA ESPECIAL: De R$ ${originalPriceStr} por apenas R$ ${priceStr} (PIX ou Cartão)!`
      : `💰 Valor Único: R$ ${priceStr} (PIX ou Cartão)!`,
    ebook.author ? `✍️ Autor: ${ebook.author}` : null,
    `📥 Receba o PDF Completo no seu E-mail + Download Imediato após confirmação!`,
    ebook.subtitle || ebook.description,
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    title: commercialTitle,
    description: commercialDescription,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: "website",
      url: pageUrl,
      siteName: "Biblioteca Digital Horeb • Oferta Oficial",
      title: commercialTitle,
      description: commercialDescription,
      locale: "pt_BR",
      images: [
        {
          url: coverImageUrl,
          secureUrl: coverImageUrl,
          width: 900,
          height: 1200,
          alt: `${ebook.title} - Por R$ ${priceStr}`,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: commercialTitle,
      description: commercialDescription,
      images: [coverImageUrl],
    },
  };
}

export default async function EbookProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ orderId?: string }>;
}) {
  const { id } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const session = await getSession();
  const isSuperAdmin =
    session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";

  const res = await getPublicEbookById(id, resolvedSearch?.orderId);

  if (!res.success || !res.ebook) {
    notFound();
  }

  return (
    <EbookProductLanding
      ebook={JSON.parse(JSON.stringify(res.ebook))}
      initialOrder={res.initialOrder ? JSON.parse(JSON.stringify(res.initialOrder)) : null}
      isSuperAdmin={isSuperAdmin}
    />
  );
}

