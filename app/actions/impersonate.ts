"use server";

import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function setImpersonatedRole(role: string | null) {
  const session = await getSession();

  const isSuperAdmin = session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";

  // Apenas o SUPERADMIN pode usar essa funcionalidade
  if (!isSuperAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const cookieStore = await cookies();

  if (!role) {
    cookieStore.delete("horeb_simulated_role");
  } else {
    // maxAge: 2 horas, para testes
    cookieStore.set("horeb_simulated_role", role, { path: "/", maxAge: 60 * 60 * 2 });
  }

  revalidatePath("/", "layout"); // Revalida toda a aplicação para aplicar os novos acessos
  return { success: true };
}
