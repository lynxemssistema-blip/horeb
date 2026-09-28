"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getRolePermissions() {
  const session = await getSession();
  if (!session || (session.role !== "SUPERADMIN" && session.originalRole !== "SUPERADMIN")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    let permissions = await prisma.rolePermission.findMany();
    
    // Seed se não houver nada
    if (permissions.length === 0) {
      const defaultRoles = [
        { role: "ADMIN", menuItems: '["/devocional","/admin/finance","/celulas","/doar","/videos","/ministerios","/kids","/membros","/configuracoes","/admin/agentes"]', description: "Acesso total à congregação" },
        { role: "PASTOR", menuItems: '["/devocional","/celulas","/doar","/videos","/ministerios","/kids","/membros","/configuracoes"]', description: "Acesso pastoral (sem financeiro)" },
        { role: "LEADER", menuItems: '["/devocional","/celulas","/videos","/ministerios"]', description: "Acesso para líderes de células" },
        { role: "FINANCIAL", menuItems: '["/admin/finance","/doar"]', description: "Acesso apenas ao financeiro" },
        { role: "KIDS", menuItems: '["/kids"]', description: "Acesso ao ministério infantil" },
        { role: "MEMBER", menuItems: '["/devocional","/celulas","/doar","/videos","/ministerios"]', description: "Acesso padrão de membro" }
      ];

      await prisma.rolePermission.createMany({
        data: defaultRoles
      });
      permissions = await prisma.rolePermission.findMany();
    }

    return { success: true, permissions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateRolePermission(id: string, menuItems: string[], actions: string[]) {
  const session = await getSession();
  if (!session || (session.role !== "SUPERADMIN" && session.originalRole !== "SUPERADMIN")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.rolePermission.update({
      where: { id },
      data: {
        menuItems: JSON.stringify(menuItems),
        actions: JSON.stringify(actions)
      }
    });
    
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createRolePermission(role: string, description: string) {
  const session = await getSession();
  if (!session || (session.role !== "SUPERADMIN" && session.originalRole !== "SUPERADMIN")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const newRole = await prisma.rolePermission.create({
      data: {
        role: role.toUpperCase(),
        description,
        menuItems: "[]",
        actions: "[]"
      }
    });
    
    revalidatePath("/", "layout");
    return { success: true, newRole };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// A helper for components to check access
export async function getUserAccessRules() {
  const session = await getSession();
  if (!session) return null;
  
  if (session.role === "SUPERADMIN") {
    return { allowedMenus: ["ALL"], allowedActions: ["ALL"] };
  }

  try {
    const perm = await prisma.rolePermission.findUnique({
      where: { role: session.role }
    });

    if (!perm) {
      // Default fallback (se a tabela ainda não tiver esse role)
      return { allowedMenus: [], allowedActions: [] };
    }

    return {
      allowedMenus: JSON.parse(perm.menuItems) as string[],
      allowedActions: JSON.parse(perm.actions) as string[]
    };
  } catch {
    return { allowedMenus: [], allowedActions: [] };
  }
}
