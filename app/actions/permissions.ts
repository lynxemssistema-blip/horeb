"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { SYSTEM_PROTECTED_ROLES } from "@/lib/roles";

const DEFAULT_ROLE_PERMISSIONS = [
  {
    role: "ADMIN",
    menuItems: JSON.stringify([
      "/devocional",
      "/admin/finance",
      "/celulas",
      "/doar",
      "/videos",
      "/agenda",
      "/meus-ingressos",
      "/ministerios",
      "/kids",
      "/membros",
      "/configuracoes",
      "/admin/agentes",
      "/admin/oracoes",
      "/admin/secretaria",
      "/admin/ebd",
      "/admin/assembleias",
      "/admin/patrimonio",
      "/admin/porteiro",
      "/admin/checkin",
      "/admin/eventos",
      "/perfil",
    ]),
    actions: JSON.stringify([
      "create_cell",
      "delete_cell",
      "create_video",
      "delete_video",
      "create_event",
      "delete_event",
      "create_member",
      "create_ministry",
      "delete_ministry",
      "create_church",
      "manage_finance",
      "manage_prayers",
      "issue_documents",
      "manage_ebd",
      "create_assembly",
      "manage_patrimony",
      "scan_badge",
      "kids_checkin",
      "manage_tickets",
      "export_tax_statement",
    ]),
    description: "Acesso total a todas as áreas administrativas e operacionais da congregação",
  },
  {
    role: "PASTOR",
    menuItems: JSON.stringify([
      "/devocional",
      "/celulas",
      "/doar",
      "/videos",
      "/agenda",
      "/meus-ingressos",
      "/ministerios",
      "/kids",
      "/membros",
      "/configuracoes",
      "/admin/oracoes",
      "/admin/secretaria",
      "/admin/ebd",
      "/admin/assembleias",
      "/admin/porteiro",
      "/admin/eventos",
      "/perfil",
    ]),
    actions: JSON.stringify([
      "create_cell",
      "delete_cell",
      "create_video",
      "delete_video",
      "create_event",
      "create_member",
      "create_ministry",
      "manage_prayers",
      "issue_documents",
      "manage_ebd",
      "create_assembly",
      "scan_badge",
      "export_tax_statement",
    ]),
    description: "Liderança pastoral plena, atendimento a fiéis, secretaria e congregação",
  },
  {
    role: "SECRETARIA",
    menuItems: JSON.stringify([
      "/admin/secretaria",
      "/membros",
      "/admin/assembleias",
      "/admin/ebd",
      "/agenda",
      "/admin/porteiro",
      "/perfil",
    ]),
    actions: JSON.stringify([
      "create_member",
      "issue_documents",
      "create_assembly",
      "manage_ebd",
      "create_event",
      "scan_badge",
      "export_tax_statement",
    ]),
    description: "Secretaria eclesiástica, registros, atas, certidões e membros",
  },
  {
    role: "LEADER",
    menuItems: JSON.stringify([
      "/devocional",
      "/celulas",
      "/videos",
      "/agenda",
      "/meus-ingressos",
      "/ministerios",
      "/perfil",
    ]),
    actions: JSON.stringify(["create_cell", "create_event"]),
    description: "Líderes de células, discipulado e pequenos grupos",
  },
  {
    role: "FINANCIAL",
    menuItems: JSON.stringify(["/admin/finance", "/doar", "/perfil"]),
    actions: JSON.stringify(["manage_finance", "export_tax_statement"]),
    description: "Acesso especializado à tesouraria, fluxo de caixa e relatórios fiscais",
  },
  {
    role: "KIDS",
    menuItems: JSON.stringify(["/kids", "/admin/checkin", "/perfil"]),
    actions: JSON.stringify(["kids_checkin"]),
    description: "Professores e voluntários do departamento infantil e check-in",
  },
  {
    role: "PORTEIRO",
    menuItems: JSON.stringify(["/admin/porteiro", "/admin/checkin", "/perfil"]),
    actions: JSON.stringify(["scan_badge", "kids_checkin"]),
    description: "Recepção, portaria digital e scanner de QR Code na entrada dos cultos",
  },
  {
    role: "MEMBER",
    menuItems: JSON.stringify([
      "/devocional",
      "/celulas",
      "/doar",
      "/videos",
      "/agenda",
      "/meus-ingressos",
      "/ministerios",
      "/perfil",
    ]),
    actions: JSON.stringify([]),
    description: "Acesso padrão para membros da igreja e frequentadores assíduos",
  },
];

export async function getRolePermissions() {
  const session = await getSession();
  if (!session || (session.role !== "SUPERADMIN" && session.originalRole !== "SUPERADMIN")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    let permissions = await prisma.rolePermission.findMany({
      orderBy: { role: "asc" },
    });

    // Seed se não houver nada
    if (permissions.length === 0) {
      await prisma.rolePermission.createMany({
        data: DEFAULT_ROLE_PERMISSIONS,
      });
      permissions = await prisma.rolePermission.findMany({
        orderBy: { role: "asc" },
      });
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
        actions: JSON.stringify(actions),
      },
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
    const formattedRole = role.trim().toUpperCase().replace(/\s+/g, "_");

    const existing = await prisma.rolePermission.findUnique({
      where: { role: formattedRole },
    });

    if (existing) {
      return { success: false, error: `O perfil "${formattedRole}" já existe no sistema.` };
    }

    const newRole = await prisma.rolePermission.create({
      data: {
        role: formattedRole,
        description,
        menuItems: JSON.stringify(["/perfil"]),
        actions: JSON.stringify([]),
      },
    });

    revalidatePath("/", "layout");
    return { success: true, newRole };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteRolePermission(id: string) {
  const session = await getSession();
  if (!session || (session.role !== "SUPERADMIN" && session.originalRole !== "SUPERADMIN")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const roleRecord = await prisma.rolePermission.findUnique({
      where: { id },
    });

    if (!roleRecord) {
      return { success: false, error: "Perfil não encontrado." };
    }

    if (SYSTEM_PROTECTED_ROLES.includes(roleRecord.role)) {
      return {
        success: false,
        error: `O perfil nativo "${roleRecord.role}" é fundamental para o funcionamento do sistema e não pode ser excluído.`,
      };
    }

    await prisma.rolePermission.delete({
      where: { id },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resetRolePermissionsToDefaults() {
  const session = await getSession();
  if (!session || (session.role !== "SUPERADMIN" && session.originalRole !== "SUPERADMIN")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    for (const def of DEFAULT_ROLE_PERMISSIONS) {
      await prisma.rolePermission.upsert({
        where: { role: def.role },
        update: {
          menuItems: def.menuItems,
          actions: def.actions,
          description: def.description,
        },
        create: def,
      });
    }

    const updated = await prisma.rolePermission.findMany({
      orderBy: { role: "asc" },
    });

    revalidatePath("/", "layout");
    return { success: true, permissions: updated };
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
      where: { role: session.role },
    });

    if (!perm) {
      // Default fallback (se a tabela ainda não tiver esse role)
      return { allowedMenus: [], allowedActions: [] };
    }

    return {
      allowedMenus: JSON.parse(perm.menuItems) as string[],
      allowedActions: JSON.parse(perm.actions) as string[],
    };
  } catch {
    return { allowedMenus: [], allowedActions: [] };
  }
}
