import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AgentManager } from "./AgentManager";
import { requirePermission, checkChurchAccess } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";

export default async function AgentesPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  // 1. Validar Tenant e Permissões
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const auth = await requirePermission(slug, ["ADMIN", "PASTOR"], "/admin/agentes");
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

  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug },
    include: { parent: true },
  });

  if (!tenant) redirect("/");

  // Bloqueia se não for a Igreja Matriz (Sede)
  const isMatriz = !tenant.parentId;
  if (!isMatriz) {
    redirect(`/${slug}`);
  }

  // 2. Buscar Perfis
  const profiles = await prisma.agentProfile.findMany({
    where: {
      OR: [{ tenantId: tenant.id }, { tenantId: null }]
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <AgentManager initialProfiles={profiles} tenantId={tenant.id} />
    </div>
  );
}
