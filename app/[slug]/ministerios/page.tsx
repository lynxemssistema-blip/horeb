import { notFound } from "next/navigation";
import { getChurchMinistries } from "@/app/actions/ministries";
import { ChurchMinistriesManager } from "@/components/church-ministries-manager";
import { isFeatureAllowedForPlan } from "@/lib/plans";
import { PlanLockCard } from "@/components/plan-lock-card";

interface MinisteriosPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function MinisteriosPage({ params }: MinisteriosPageProps) {
  const { slug } = await params;
  const res = await getChurchMinistries(slug);

  if (!res.success || !res.tenant) {
    notFound();
  }

  // Controle de Plano: Ministérios é exclusivo dos Planos Gestão e Premium
  if (!isFeatureAllowedForPlan(res.tenant.plan, "MINISTRIES")) {
    return (
      <PlanLockCard
        churchSlug={res.tenant.slug}
        churchName={res.tenant.name}
        currentPlan={res.tenant.plan}
        featureKey="MINISTRIES"
        featureName="Gestão Completa de Ministérios e Líderes"
        featureDescription="Cadastre e gerencie quantos ministérios desejar: Louvor, Dança, Intercessão, Diaconia, Jovens, Casais e Missões, com líderes designados e escalas."
      />
    );
  }

  return (
    <ChurchMinistriesManager
      tenant={res.tenant}
      initialMinistries={res.ministries || []}
      potentialLeaders={res.potentialLeaders || []}
    />
  );
}
