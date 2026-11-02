import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SuperAdminDashboard } from "@/components/superadmin-dashboard";
import {
  getSuperAdminMetrics,
  getAllTenants,
  getAllPlans,
  getAllUsers,
  getEmailCenterData,
  getPromotionConfig,
} from "@/app/actions/superadmin";
import { getAgentProfiles } from "@/app/actions/agent";
import { getRolePermissions } from "@/app/actions/permissions";
import { getAdminEbooksData } from "@/app/actions/ebooks";

export const metadata = {
  title: "Super Admin • Horeb por Lynx EMS Sistemas",
  description: "Painel executivo master de gestão de assinaturas, congregações, e-mails e promoções.",
};

export const dynamic = "force-dynamic";

function safeSerialize<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  const isSuperAdmin =
    session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";

  if (!session || !isSuperAdmin) {
    redirect("/?auth=admin_required");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const initialTab = resolvedParams?.tab || "overview";

  const [metricsRes, tenantsRes, plansRes, usersRes, emailDataRes, promoRes, agentsRes, permissionsRes, ebooksDataRes] =
    await Promise.all([
      getSuperAdminMetrics().catch(() => ({ success: false, metrics: null })),
      getAllTenants().catch(() => ({ success: false, tenants: [] })),
      getAllPlans().catch(() => ({ success: false, plans: [] })),
      getAllUsers().catch(() => ({ success: false, users: [] })),
      getEmailCenterData().catch(() => ({
        success: false,
        logs: [],
        inbox: [],
        inboxTotal: 0,
        imapConnected: false,
      })),
      getPromotionConfig().catch(() => ({ success: false, config: null })),
      getAgentProfiles(null).catch(() => ({ profiles: [] })), // null = agentes globais
      getRolePermissions().catch(() => ({ permissions: [] })),
      getAdminEbooksData().catch(() => ({ success: false, ebooks: [], orders: [] })),
    ]);

  return (
    <SuperAdminDashboard
      initialTab={initialTab}
      metrics={safeSerialize(metricsRes.metrics)}
      initialTenants={safeSerialize(tenantsRes.tenants || [])}
      initialPlans={safeSerialize(plansRes.plans || [])}
      initialUsers={safeSerialize(usersRes.users || [])}
      initialEmailLogs={safeSerialize(emailDataRes.logs || [])}
      initialInbox={safeSerialize(emailDataRes.inbox || [])}
      inboxTotal={emailDataRes.inboxTotal || 0}
      imapConnected={emailDataRes.imapConnected || false}
      initialPromoConfig={safeSerialize(promoRes.config)}
      user={safeSerialize(session)}
      initialAgents={safeSerialize(agentsRes?.profiles || [])}
      initialPermissions={safeSerialize(permissionsRes.permissions || [])}
      initialEbooks={safeSerialize(ebooksDataRes.ebooks || [])}
      initialEbookOrders={safeSerialize(ebooksDataRes.orders || [])}
    />
  );
}
