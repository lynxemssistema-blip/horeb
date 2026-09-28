import { redirect } from "next/navigation";

interface EventosPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function EventosPage({ params }: EventosPageProps) {
  const { slug } = await params;
  redirect(`/${slug}/agenda`);
}
