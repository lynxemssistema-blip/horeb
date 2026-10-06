import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkChurchAccess, requirePermission } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";
import { getChurchAssets } from "@/app/actions/assets";
import { AssetInventoryManager } from "@/components/asset-inventory-manager";

interface PatrimonioPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PatrimonioPageProps) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true },
  });

  return {
    title: `Patrimônio & Inventário | ${tenant?.name || "Horeb"}`,
    description: "Gestão de bens materiais, equipamentos de som, instrumentos e inventário físico da igreja.",
  };
}

export default async function AdminPatrimonioPage({ params }: PatrimonioPageProps) {
  const { slug } = await params;

  // 1. Obter congregação
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      logoUrl: true,
    },
  });

  if (!tenant) notFound();

  // 2. Permissão de Acesso (ADMIN, PASTOR, LEADER, SUPERADMIN)
  const auth = await requirePermission(slug, ["ADMIN", "PASTOR", "LEADER"]);
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

  // 3. Buscar bens patrimoniais
  const res = await getChurchAssets(slug);
  if (!res.success) {
    return (
      <div className="p-8 text-center text-rose-400">
        Falha ao carregar patrimônio da congregação.
      </div>
    );
  }

  return (
    <div className="w-full">
      <AssetInventoryManager
        slug={slug}
        initialData={{
          tenant: res.tenant,
          assets: res.assets || [],
          metrics: res.metrics || {},
          currentUserRole: auth.user.role,
        }}
      />
    </div>
  );
}
