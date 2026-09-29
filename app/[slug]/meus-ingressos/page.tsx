import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getUserTickets } from "@/app/actions/tickets";
import { UserTicketsWalletView } from "@/components/user-tickets-wallet-view";

interface MeusIngressosPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function MeusIngressosPage({ params }: MeusIngressosPageProps) {
  const { slug } = await params;

  const [tenant, session] = await Promise.all([
    prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, primaryColor: true },
    }),
    getSession(),
  ]);

  if (!tenant) {
    notFound();
  }

  // Se não estiver logado, redireciona para login
  if (!session || !session.email) {
    redirect(`/?auth=required&church=${slug}`);
  }

  const res = await getUserTickets(session.email);

  return (
    <UserTicketsWalletView
      slug={slug}
      churchName={tenant.name}
      primaryColor={tenant.primaryColor}
      userEmail={session.email}
      userName={session.name}
      initialTickets={res.tickets || []}
    />
  );
}
