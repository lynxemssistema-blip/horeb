import { redirect } from "next/navigation";
import { requirePermission, checkChurchAccess } from "@/lib/session";
import { AccessDeniedScreen } from "@/components/access-denied-screen";

export default async function AdminEventosLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const auth = await requirePermission(slug, ["ADMIN", "PASTOR", "LEADER"], "/admin/eventos");
  if (!auth.authorized) {
    if (auth.statusCode === 401) {
      redirect(`/?auth=required&church=${slug}`);
    }
    const access = await checkChurchAccess(slug);
    return (
      <AccessDeniedScreen
        user={access.authorized ? access.user : null}
        userChurchSlug={access.authorized ? access.user.tenantSlug : ""}
        requestedChurchSlug={slug}
      />
    );
  }

  return <>{children}</>;
}
