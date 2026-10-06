import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkChurchAccess, requirePermission } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";
import { getChurchAssemblies } from "@/app/actions/assembly";
import { AssemblyManager } from "@/components/assembly-manager";

interface AssembleiasPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AssembleiasPageProps) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true },
  });

  return {
    title: `Assembleias & Votação | ${tenant?.name || "Horeb"}`,
    description: "Convocação estatutária, votação de pautas, quórum em tempo real e ata para cartório.",
  };
}

export default async function AdminAssembleiasPage({ params }: AssembleiasPageProps) {
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

  // 2. Permissão de Acesso (qualquer membro da igreja pode acessar para votar, líderes controlam)
  const access = await checkChurchAccess(slug);
  if (!access.authorized) {
    redirect(`/?auth=required&church=${slug}`);
  }

  // 3. Buscar dados de assembleias
  const res = await getChurchAssemblies(slug);
  if (!res.success) {
    return (
      <div className="p-8 text-center text-rose-400">
        Falha ao carregar assembleias da congregação.
      </div>
    );
  }

  return (
    <div className="w-full">
      <AssemblyManager
        slug={slug}
        initialData={{
          tenant: res.tenant,
          assemblies: res.assemblies || [],
          totalEligibleMembers: res.totalEligibleMembers || 0,
          currentUser: res.currentUser || {
            id: access.user.userId,
            name: access.user.name,
            role: access.user.role,
          },
        }}
      />
    </div>
  );
}
