import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkChurchAccess, requirePermission } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";
import { getWorshipServices } from "@/app/actions/worship-checkin";
import { PorteiroDigitalScanner } from "@/components/porteiro-digital-scanner";

interface PorteiroPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PorteiroPageProps) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true },
  });

  return {
    title: `Porteiro Digital • Recepção | ${tenant?.name || "Horeb"}`,
    description: "Recepção de membros via leitura de QR Code no smartphone e controle de presença no culto.",
  };
}

export default async function AdminPorteiroPage({ params }: PorteiroPageProps) {
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

  // 2. Permissão de Acesso (Recepção / Liderança ou concedido via RBAC)
  const auth = await requirePermission(
    slug,
    ["ADMIN", "PASTOR", "LEADER", "SECRETARIA", "PORTEIRO"],
    "/admin/porteiro"
  );
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

  // 3. Buscar cultos e presenças de hoje
  const res = await getWorshipServices(slug);
  if (!res.success) {
    return (
      <div className="p-8 text-center text-rose-400">
        Falha ao carregar informações da portaria digital.
      </div>
    );
  }

  return (
    <div className="w-full">
      <PorteiroDigitalScanner
        slug={slug}
        initialData={{
          tenant: res.tenant,
          services: res.services || [],
          todayAttendances: res.todayAttendances || [],
          totalToday: res.totalToday || 0,
          totalEligibleMembers: res.totalEligibleMembers || 0,
          todayYMD: res.todayYMD || new Date().toISOString().split("T")[0],
          currentUser: {
            id: auth.user.userId,
            name: auth.user.name,
            role: auth.user.role,
          },
        }}
      />
    </div>
  );
}
