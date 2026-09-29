import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, checkChurchAccess } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";
import { DoorScannerView } from "@/components/door-scanner-view";

interface CheckinPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CheckinPage({ params }: CheckinPageProps) {
  const { slug } = await params;

  // Guarda RBAC estrita: Apenas administradores, pastores, líderes ou voluntários autorizados desta igreja
  const auth = await requirePermission(slug, ["ADMIN", "PASTOR", "LEADER", "KIDS"]);
  if (!auth.authorized) {
    if (auth.statusCode === 401) {
      redirect(`/?auth=admin_required&church=${slug}`);
    }
    const access = await checkChurchAccess(slug);
    return (
      <AccessDeniedScreen
        user={access.authorized ? access.user : null}
        userChurchSlug={access.authorized ? access.user.tenantSlug : ""}
        requestedChurchSlug={slug}
      />
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, primaryColor: true },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <DoorScannerView
      slug={slug}
      churchName={tenant.name}
      primaryColor={tenant.primaryColor}
      validatorName={auth.user.name}
    />
  );
}
