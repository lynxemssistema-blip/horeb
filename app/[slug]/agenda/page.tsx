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

  // Determina se o usuário tem permissão para editar eventos (Master / Admin / Pastor)
  let canEditEvents = false;
  let userRole = "GUEST";

  if (session && session.userId) {
    userRole = session.role;
    if (
      userRole === "SUPERADMIN" ||
      userRole === "ADMIN" ||
      userRole === "MASTER" ||
      userRole === "PASTOR"
    ) {
      canEditEvents = true;
    } else {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { role: true, isPastoralCounselor: true },
      });
      if (
        dbUser?.role === "SUPERADMIN" ||
        dbUser?.role === "ADMIN" ||
        dbUser?.role === "PASTOR" ||
        dbUser?.isPastoralCounselor
      ) {
        canEditEvents = true;
        userRole = dbUser.role || "PASTOR";
      }
    }
  }

  // Busca eventos locais e destaques globais da denominação (inclui inativos apenas se for Master/Pastor)
  const res = await getEventsFeed(tenant.id, isUserLoggedIn, "ALL", canEditEvents);

  return (
    <AgendaFeedView
      slug={tenant.slug}
      churchName={tenant.name}
      primaryColor={tenant.primaryColor}
      initialEvents={res.events || []}
      isUserLoggedIn={isUserLoggedIn}
      canEditEvents={canEditEvents}
      userRole={userRole}
      userEmail={session?.email || ""}
    />
  );
}


