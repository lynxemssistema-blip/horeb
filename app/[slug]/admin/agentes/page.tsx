import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AgentManager } from "./AgentManager";

import { getUserAccessRules } from "@/app/actions/permissions";

export default async function AgentesPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  // 1. Validar Tenant e Permissões
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug },
    include: { parent: true },
  });

  if (!tenant) redirect("/");

  const rules = await getUserAccessRules();
  if (rules && !rules.allowedMenus.includes("ALL")) {
    const hasAgentsAccess = rules.allowedMenus.some(menu => "/admin/agentes".endsWith(menu));
    if (!hasAgentsAccess) {
      redirect(`/${slug}`);
    }
  }

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
