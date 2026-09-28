import { notFound } from "next/navigation";
import { getMinistryWorkspace } from "@/app/actions/ministry";
import { MinistryWorkspaceView } from "@/components/ministry-workspace-view";

interface MinistryWorkspacePageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

export default async function MinistryWorkspacePage({
  params,
}: MinistryWorkspacePageProps) {
  const { slug, id } = await params;
  const res = await getMinistryWorkspace(id);

  if (!res.success || !res.ministry) {
    notFound();
  }

  return (
    <MinistryWorkspaceView
      slug={slug}
      initialMinistry={res.ministry}
    />
  );
}
