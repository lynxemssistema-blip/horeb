import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkChurchAccess, requirePermission } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";
import { getFinancialDashboard, seedFinancialDemoData } from "@/app/actions/finance-admin";
import { FinanceDashboardView } from "@/components/finance-dashboard-view";

interface FinancePageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

import { getUserAccessRules } from "@/app/actions/permissions";

export default async function AdminFinancePage({
  params,
  searchParams,
}: FinancePageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const filterChurchId = typeof query.church === "string" ? query.church : undefined;

  // 1. Obter tenant no banco
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      parent: true,
      branches: true,
    },
  });

  if (!tenant) notFound();

  // 2. Verificar Sessão e RBAC Rigoroso
  const auth = await requirePermission(slug, ["ADMIN", "FINANCIAL"]);
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

  let effectiveRole = auth.role === "SUPERADMIN" || auth.role === "ADMIN" ? "MASTER" : auth.role;

  // 3. Obter dados do Dashboard Financeiro com o Motor RBAC
  let dashData = await getFinancialDashboard(effectiveRole, tenant.id, filterChurchId);

  // Se o banco estiver sem movimentações para esta igreja, rodar o seed inicial automaticamente
  if (dashData.success && dashData.transactions && dashData.transactions.length === 0) {
    await seedFinancialDemoData(slug);
    dashData = await getFinancialDashboard(effectiveRole, tenant.id, filterChurchId);
  }

  if (!dashData.success || !dashData.kpis) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <p>Não foi possível carregar os dados financeiros da congregação.</p>
      </div>
    );
  }

  return (
    <FinanceDashboardView
      initialKPIs={dashData.kpis}
      initialChartData={dashData.chartData || []}
      initialCategoryDistribution={dashData.categoryDistribution || []}
      initialTransactions={dashData.transactions || []}
      networkChurches={dashData.networkChurches || []}
      currentChurch={dashData.currentChurch!}
      isMasterRole={dashData.isMasterRole ?? true}
      userRole={effectiveRole}
    />
  );
}
