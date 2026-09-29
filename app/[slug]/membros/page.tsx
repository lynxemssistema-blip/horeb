import { notFound, redirect } from "next/navigation";
import { getChurchNetworkMembers } from "@/app/actions/members";
import { ChurchMembersManager } from "@/components/church-members-manager";
import { requirePermission, checkChurchAccess } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";
import { getUserAccessRules } from "@/app/actions/permissions";

interface MembrosPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function MembrosPage({ params }: MembrosPageProps) {
  const { slug } = await params;

  // Apenas Administradores (Masters) e Pastores podem gerenciar membros e níveis de acesso
  const auth = await requirePermission(slug, ["ADMIN", "PASTOR"]);
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

  const res = await getChurchNetworkMembers(slug);

  if (!res.success || !res.currentChurch) {
    notFound();
  }

  const rules = await getUserAccessRules();
  const allowedActions = rules?.allowedActions || [];

  return (
    <div className="space-y-6">
      <ChurchMembersManager
        currentChurch={res.currentChurch}
        isMatriz={res.isMatriz!}
        allNetworkChurches={res.allNetworkChurches!}
        initialUsers={res.users!}
        allowedActions={allowedActions}
      />
    </div>
  );
}
