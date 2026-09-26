import React from "react";
import { SuperAdminDashboard } from "@/components/superadmin-dashboard";
import {
  getSuperAdminMetrics,
  getAllTenants,
  getAllPlans,
  getAllUsers,
  getEmailCenterData,
} from "@/app/actions/superadmin";

export const metadata = {
  title: "Super Admin • Horeb SaaS",
  description: "Painel executivo master de gestão de assinaturas, congregações e e-mails.",
};

export default async function AdminPage() {
  const [metricsRes, tenantsRes, plansRes, usersRes, emailDataRes] =
    await Promise.all([
      getSuperAdminMetrics(),
      getAllTenants(),
      getAllPlans(),
      getAllUsers(),
      getEmailCenterData(),
    ]);

  return (
    <SuperAdminDashboard
      metrics={metricsRes.metrics}
      initialTenants={tenantsRes.tenants || []}
      initialPlans={plansRes.plans || []}
      initialUsers={usersRes.users || []}
      initialEmailLogs={emailDataRes.logs || []}
      initialInbox={emailDataRes.inbox || []}
      inboxTotal={emailDataRes.inboxTotal || 0}
      imapConnected={emailDataRes.imapConnected || false}
    />
  );
}
