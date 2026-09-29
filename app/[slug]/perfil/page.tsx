import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserProfile } from "@/app/actions/profile";
import { UserProfilePanel } from "@/components/user-profile-panel";

export const metadata = {
  title: "Meu Perfil • Painel do Usuário",
  description: "Gerencie seus dados cadastrais, altere sua senha de acesso e atualize sua foto de perfil.",
};

export default async function UserProfilePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const session = await getSession();

  if (!session) {
    redirect(`/?auth=required&church=${slug}`);
  }

  const profileRes = await getUserProfile();

  if (!profileRes.success || !profileRes.user) {
    redirect(`/${slug}`);
  }

  return (
    <div className="py-2 sm:py-6">
      <UserProfilePanel slug={slug} initialUser={profileRes.user} />
    </div>
  );
}
