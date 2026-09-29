import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { TicketCheckoutView } from "@/components/ticket-checkout-view";

interface ComprarPageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

export default async function ComprarIngressoPage({ params }: ComprarPageProps) {
  const { slug, id } = await params;

  const [tenant, event, session] = await Promise.all([
    prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, primaryColor: true },
    }),
    prisma.event.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { name: true, slug: true },
        },
      },
    }),
    getSession(),
  ]);

  if (!tenant || !event) {
    notFound();
  }

  return (
    <TicketCheckoutView
      slug={slug}
      churchName={tenant.name}
      primaryColor={tenant.primaryColor}
      event={{
        id: event.id,
        title: event.title,
        slogan: event.slogan,
        description: event.description,
        imageUrl: event.imageUrl,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate ? event.endDate.toISOString() : null,
        isPaid: event.isPaid,
        price: event.price || 0,
      }}
      initialBuyerEmail={session?.email || ""}
      initialBuyerName={session?.name || ""}
    />
  );
}
