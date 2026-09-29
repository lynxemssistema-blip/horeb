import { getSession } from "@/lib/session";
import { SoulCheckInClient } from "./soul-checkin-client";

export const metadata = {
  title: "Check-in de Alma • Momento de Conexão",
  description: "Espaço acolhedor e seguro para oração, escuta e cuidado pastoral com inteligência artificial.",
};

export default async function SoulCheckInPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const session = await getSession();

  return <SoulCheckInClient slug={slug} initialUser={session} />;
}
