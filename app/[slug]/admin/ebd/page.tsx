import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkChurchAccess, requirePermission } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";
import { getSundaySchoolDashboard } from "@/app/actions/sunday-school";
import { SundaySchoolManager } from "@/components/sunday-school-manager";

interface EbdPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EbdPageProps) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true },
  });

  return {
    title: `EBD & Discipulado | ${tenant?.name || "Horeb"}`,
    description: "Gestão da Escola Bíblica Dominical, frequência dominical e trilha de novos convertidos.",
  };
}

export default async function AdminEbdPage({ params }: EbdPageProps) {
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

  // 3. Buscar dados da EBD e Discipulado
  const res = await getSundaySchoolDashboard(slug);
  if (!res.success) {
    return (
      <div className="p-8 text-center text-rose-400">
        Falha ao carregar informações da Escola Bíblica Dominical.
      </div>
    );
  }

  return (
    <div className="w-full">
      <SundaySchoolManager
        slug={slug}
        initialData={{
          tenant: res.tenant,
          classes: res.classes || [],
          tracks: res.tracks || [],
          members: res.members || [],
          metrics: res.metrics || {},
          currentUserRole: auth.user.role,
        }}
      />
    </div>
  );
}
