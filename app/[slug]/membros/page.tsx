import { notFound } from "next/navigation";
import { getChurchNetworkMembers } from "@/app/actions/members";
import { ChurchMembersManager } from "@/components/church-members-manager";
import { getSession } from "@/lib/session";
import { getUserAccessRules } from "@/app/actions/permissions";

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

  const session = await getSession();
  let allowedActions: string[] = [];

  if (session && session.userId && res.currentChurch) {
    const rules = await getUserAccessRules();
    if (rules) {
      allowedActions = rules.allowedActions || [];
    }
  }

  return (
    <div className="space-y-6">
      <ChurchMembersManager
        currentChurch={res.currentChurch}
        isMatriz={res.isMatriz!}
        allNetworkChurches={res.allNetworkChurches!}
        initialUsers={res.users!}
        allowedActions={allowedActions}
      />
    </div>
  );
}
