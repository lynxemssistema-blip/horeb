import { notFound } from "next/navigation";
import { getChurchNetworkMembers } from "@/app/actions/members";
import { ChurchMembersManager } from "@/components/church-members-manager";

interface MembrosPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function MembrosPage({ params }: MembrosPageProps) {
  const { slug } = await params;
  const res = await getChurchNetworkMembers(slug);

  if (!res.success || !res.currentChurch) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ChurchMembersManager
        currentChurch={res.currentChurch}
        isMatriz={res.isMatriz!}
        allNetworkChurches={res.allNetworkChurches!}
        initialUsers={res.users!}
      />
    </div>
  );
}
