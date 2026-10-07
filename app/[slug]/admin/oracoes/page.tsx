import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkChurchAccess, requirePermission } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";
import { getChurchPrayerRequests } from "@/app/actions/prayer";
import { PrayerRequestsManager } from "@/components/prayer-requests-manager";

interface OracoesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: OracoesPageProps) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true },
  });

  return {
    title: `Pedidos de Oração | ${tenant?.name || "Horeb"}`,
    description: "Gestão e atendimento pastoral de pedidos de oração da congregação.",
  };
}

export default async function AdminOracoesPage({ params }: OracoesPageProps) {
  const { slug } = await params;

  // 1. Obter tenant no banco
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
    },
  });

  if (!tenant) notFound();

  // 2. Verificar Sessão e RBAC Rigoroso (ADMIN, PASTOR, SUPERADMIN ou concedido via RBAC)
  const auth = await requirePermission(slug, ["ADMIN", "PASTOR"], "/admin/oracoes");
  if (!auth.authorized) {
    if (auth.statusCode === 401) {
      redirect(`/?auth=required&church=${slug}`);
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

  // 3. Buscar pedidos de oração da congregação
  const result = await getChurchPrayerRequests(slug);
  const requests = result.success && result.requests ? (result.requests as any) : [];

  return (
    <div className="w-full">
      <PrayerRequestsManager
        slug={slug}
        churchName={tenant.name}
        primaryColor={tenant.primaryColor}
        initialRequests={requests}
        currentUserRole={auth.user.role}
        currentUserName={auth.user.name}
      />
    </div>
  );
}
