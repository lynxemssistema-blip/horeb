import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChurchSettingsForm } from "@/components/church-settings-form";
import { requirePermission, checkChurchAccess } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";

interface ConfiguracoesPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ConfiguracoesPage({ params }: ConfiguracoesPageProps) {
  const { slug } = await params;

  const auth = await requirePermission(slug, ["ADMIN", "PASTOR"], "/configuracoes");
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
    where: { slug },
    include: {
      parent: true,
      branches: true,
    },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ChurchSettingsForm
        tenant={{
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          primaryColor: tenant.primaryColor,
          logoUrl: tenant.logoUrl,
          pastorName: tenant.pastorName,
          phone: tenant.phone,
          address: tenant.address,
          city: tenant.city,
          state: tenant.state,
          pixKey: tenant.pixKey,
          pixKeyType: tenant.pixKeyType || "CNPJ",
          pixPresetValues: tenant.pixPresetValues || "30,50,100,200,500",
          plan: tenant.plan,
          status: tenant.status,
          isMatriz: !tenant.parentId,
          parent: tenant.parent
            ? {
                id: tenant.parent.id,
                name: tenant.parent.name,
                slug: tenant.parent.slug,
              }
            : null,
          branches: tenant.branches.map((b) => ({
            id: b.id,
            name: b.name,
            slug: b.slug,
            primaryColor: b.primaryColor,
          })),
        }}
      />
    </div>
  );
}
