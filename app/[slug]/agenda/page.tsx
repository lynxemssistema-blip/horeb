import { notFound } from "next/navigation";
import { getEventsFeed } from "@/app/actions/events";
import { AgendaFeedView } from "@/components/agenda-feed-view";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface AgendaPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function AgendaPage({ params }: AgendaPageProps) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  if (!tenant) {
    notFound();
  }

  const session = await getSession();
  const isUserLoggedIn = Boolean(session && session.userId);

  // Busca eventos locais e destaques globais da denominação
  const res = await getEventsFeed(tenant.id, isUserLoggedIn, "ALL");

  return (
    <AgendaFeedView
      slug={tenant.slug}
      churchName={tenant.name}
      primaryColor={tenant.primaryColor}
      initialEvents={res.events || []}
      isUserLoggedIn={isUserLoggedIn}
    />
  );
}
