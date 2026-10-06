import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkChurchAccess, requirePermission } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";
import { getOfficialDocuments } from "@/app/actions/secretary";
import { SecretaryManager } from "@/components/secretary-manager";

interface SecretariaPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SecretariaPageProps) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true },
  });

  return {
    title: `Secretaria & Documentos | ${tenant?.name || "Horeb"}`,
    description: "Emissão de cartas, certificados e registros eclesiásticos oficiais.",
  };
}

export default async function AdminSecretariaPage({ params }: SecretariaPageProps) {
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
      pastorName: true,
      address: true,
      city: true,
      state: true,
      pixKey: true,
    },
  });

  if (!tenant) notFound();

  // 2. Permissão de Acesso (ADMIN, PASTOR, SUPERADMIN)
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

  // 3. Buscar documentos emitidos
  const res = await getOfficialDocuments(slug);
  const documents = res.success && res.documents ? (res.documents as any) : [];

  return (
    <div className="w-full">
      <SecretaryManager
        slug={slug}
        tenant={tenant}
        initialDocuments={documents}
        currentUserRole={auth.user.role}
      />
    </div>
  );
}
