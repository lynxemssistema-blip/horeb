import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MemberRegistrationForm } from "@/components/member-registration-form";

interface CadastroPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    role?: string;
    email?: string;
    name?: string;
  }>;
}

export default async function CadastroPage({ params, searchParams }: CadastroPageProps) {
  const { slug } = await params;
  const { role, email, name } = await searchParams;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { parent: true },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <MemberRegistrationForm
        tenant={{
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          primaryColor: tenant.primaryColor,
          isMatriz: !tenant.parentId,
          parentName: tenant.parent?.name,
        }}
        initialRole={role || "MEMBER"}
        initialEmail={email || ""}
        initialName={name || ""}
      />
    </div>
  );
}
