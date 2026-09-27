import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isFeatureAllowedForPlan } from "@/lib/plans";
import { PlanLockCard } from "@/components/plan-lock-card";
import { KidsCheckinClient } from "@/components/kids-checkin-client";

interface KidsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function KidsPage({ params }: KidsPageProps) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
    },
  });

  if (!tenant) notFound();

  // Controle de Acesso por Plano: Check-in Kids é exclusivo do Plano Premium
  if (!isFeatureAllowedForPlan(tenant.plan, "KIDS_CHECKIN")) {
    return (
      <PlanLockCard
        churchSlug={tenant.slug}
        churchName={tenant.name}
        currentPlan={tenant.plan}
        featureKey="KIDS_CHECKIN"
        featureName="Check-in Kids com Etiquetas e Código de Segurança"
        featureDescription="O módulo de Check-in Kids permite cadastrar crianças, gerar etiquetas digitais e emitir códigos seguros de 4 dígitos para liberação com os pais durante os cultos."
      />
    );
  }

  return <KidsCheckinClient slug={slug} />;
}
