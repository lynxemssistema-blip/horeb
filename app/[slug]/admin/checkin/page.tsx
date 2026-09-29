import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { DoorScannerView } from "@/components/door-scanner-view";

interface CheckinPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CheckinPage({ params }: CheckinPageProps) {
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

  // Apenas administradores, pastores ou voluntários autorizados
  if (!session) {
    redirect(`/?auth=admin_required&church=${slug}`);
  }

  return (
    <DoorScannerView
      slug={slug}
      churchName={tenant.name}
      primaryColor={tenant.primaryColor}
      validatorName={session.name}
    />
  );
}
