import { notFound } from "next/navigation";
import { getChurchMinistries } from "@/app/actions/ministries";
import { ChurchMinistriesManager } from "@/components/church-ministries-manager";

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

  return (
    <ChurchMinistriesManager
      tenant={res.tenant}
      initialMinistries={res.ministries || []}
      potentialLeaders={res.potentialLeaders || []}
    />
  );
}
