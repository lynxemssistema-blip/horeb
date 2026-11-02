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
  const priceStr = Number(ebook.price || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });

  return {
    title: `${ebook.title} • E-book Oficial (R$ ${priceStr}) | Horeb`,
    description: `${ebook.description} — Pagamento via Asaas com entrega automática do PDF após confirmação!`,
    openGraph: {
      title: `${ebook.title} • E-book Digital Oficial`,
      description: ebook.subtitle || ebook.description,
      images:
        ebook.coverUrl && ebook.coverUrl.startsWith("http")
          ? [{ url: ebook.coverUrl }]
          : [],
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

