import { notFound } from "next/navigation";
import { getChurchVideos } from "@/app/actions/videos";
import { ChurchVideosManager } from "@/components/church-videos-manager";

interface VideosPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function VideosPage({ params }: VideosPageProps) {
  const { slug } = await params;
  const res = await getChurchVideos(slug);

  if (!res.success || !res.tenant) {
    notFound();
  }

  return (
    <ChurchVideosManager
      tenant={res.tenant}
      initialVideos={res.videos || []}
    />
  );
}
