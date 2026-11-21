import type { Metadata } from "next";
import { getPublicEbooks } from "@/app/actions/ebooks";
import { getSession } from "@/lib/session";
import { EbooksPublicStorefront } from "@/components/ebooks-public-storefront";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";

export const metadata: Metadata = {
  title: "Loja Oficial de E-books Cristãos • Biblioteca Digital Horeb",
  description:
    "Loja pública oficial com todos os E-books Bíblicos em PDF da Biblioteca Digital Horeb (Pr. Luan Demattos). Pagamento via PIX Instantâneo ou Cartão com entrega automática no e-mail.",
  alternates: {
    canonical: `${BASE_URL}/links`,
  },
  openGraph: {
    type: "website",
    url: `${BASE_URL}/links`,
    siteName: "Loja Oficial de E-books • Biblioteca Digital Horeb",
    title: "📚 Loja Oficial de E-books Bíblicos em PDF • Horeb (R$ 9,90)",
    description:
      "Conheça todos os E-books oficiais do Pr. Luan Demattos com entrega imediata em PDF após confirmação via PIX ou Cartão!",
    locale: "pt_BR",
    images: [
      {
        url: `${BASE_URL}/ebooks-covers/o-evangelho-do-rei.jpg?v=2`,
        width: 800,
        height: 1192,
        alt: "Loja Oficial de E-books Cristãos • Biblioteca Digital Horeb",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "📚 Loja Oficial de E-books Bíblicos em PDF • Horeb",
    description:
      "Todos os estudos bíblicos em PDF com entrega imediata no seu e-mail.",
    images: [`${BASE_URL}/ebooks-covers/o-evangelho-do-rei.jpg?v=2`],
  },
};

export default async function PublicEbooksStoreLinksPage() {
  const [ebooksRes, session] = await Promise.all([
    getPublicEbooks(),
    getSession().catch(() => null),
  ]);

  const ebooks = ebooksRes.success && ebooksRes.ebooks ? ebooksRes.ebooks : [];
  const isSuperAdmin =
    session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";

  return (
    <EbooksPublicStorefront
      initialEbooks={JSON.parse(JSON.stringify(ebooks))}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
