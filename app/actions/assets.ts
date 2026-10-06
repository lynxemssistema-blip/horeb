"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getChurchAssets(
  slug: string,
  filters?: {
    category?: string;
    condition?: string;
    search?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        logoUrl: true,
        pastorName: true,
        address: true,
        city: true,
        state: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const where: any = { tenantId: tenant.id };

    if (filters?.category && filters.category !== "ALL") {
      where.category = filters.category;
    }

    if (filters?.condition && filters.condition !== "ALL") {
      where.condition = filters.condition;
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q } },
        { location: { contains: q } },
        { serialNumber: { contains: q } },
      ];
    }

    const assets = await prisma.churchAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Calcular Totais e Indicadores Financeiros do Patrimônio
    const totalAssets = assets.length;
    let totalPurchaseValue = 0;
    let needsRepairCount = 0;
    let goodConditionCount = 0;

    assets.forEach((a) => {
      totalPurchaseValue += a.purchaseValue || 0;
      if (a.condition === "NEEDS_REPAIR") needsRepairCount++;
      if (a.condition === "GOOD" || a.condition === "NEW") goodConditionCount++;
    });

    return {
      success: true,
      tenant,
      assets,
      metrics: {
        totalAssets,
        totalPurchaseValue,
        needsRepairCount,
        goodConditionCount,
      },
      currentUserRole: session.role,
    };
  } catch (error: any) {
    console.error("Erro ao listar patrimônio:", error);
    return { success: false, error: "Falha ao carregar bens patrimoniais." };
  }
}

export async function createChurchAsset(
  slug: string,
  data: {
    name: string;
    code?: string;
    category: string;
    invoiceNumber?: string;
    purchaseDate?: string;
    purchaseValue: number;
    currentValue?: number;
    location: string;
    condition: string;
    serialNumber?: string;
    photoUrl?: string;
    notes?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "PASTOR", "LEADER", "SUPERADMIN"].includes(session.role)) {
      return { success: false, error: "Apenas liderança pode cadastrar bens patrimoniais." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    // Gerar Código de Tombamento se não informado
    let assetCode = data.code?.trim();
    if (!assetCode) {
      const year = new Date().getFullYear();
      const count = await prisma.churchAsset.count({
        where: { tenantId: tenant.id },
      });
      assetCode = `PAT-${year}-${String(count + 1).padStart(4, "0")}`;
    }

    const asset = await prisma.churchAsset.create({
      data: {
        tenantId: tenant.id,
        code: assetCode,
        name: data.name,
        category: data.category,
        invoiceNumber: data.invoiceNumber || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchaseValue: Number(data.purchaseValue) || 0,
        currentValue: data.currentValue ? Number(data.currentValue) : null,
        location: data.location,
        condition: data.condition || "GOOD",
        serialNumber: data.serialNumber || null,
        photoUrl: data.photoUrl || null,
        notes: data.notes || null,
      },
    });

    revalidatePath(`/${slug}/admin/patrimonio`);
    return {
      success: true,
      message: `Bem "${asset.name}" tombado com o código ${asset.code}!`,
      asset,
    };
  } catch (error: any) {
    console.error("Erro ao criar bem patrimonial:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Já existe um bem com este código de tombamento." };
    }
    return { success: false, error: "Falha ao cadastrar bem patrimonial." };
  }
}

export async function updateChurchAsset(
  slug: string,
  assetId: string,
  data: {
    name?: string;
    code?: string;
    category?: string;
    invoiceNumber?: string;
    purchaseDate?: string;
    purchaseValue?: number;
    currentValue?: number;
    location?: string;
    condition?: string;
    serialNumber?: string;
    notes?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "PASTOR", "LEADER", "SUPERADMIN"].includes(session.role)) {
      return { success: false, error: "Permissão insuficiente." };
    }

    const updated = await prisma.churchAsset.update({
      where: { id: assetId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.code ? { code: data.code } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.invoiceNumber !== undefined ? { invoiceNumber: data.invoiceNumber || null } : {}),
        ...(data.purchaseDate ? { purchaseDate: new Date(data.purchaseDate) } : {}),
        ...(data.purchaseValue !== undefined ? { purchaseValue: Number(data.purchaseValue) } : {}),
        ...(data.currentValue !== undefined ? { currentValue: Number(data.currentValue) } : {}),
        ...(data.location ? { location: data.location } : {}),
        ...(data.condition ? { condition: data.condition } : {}),
        ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });

    revalidatePath(`/${slug}/admin/patrimonio`);
    return {
      success: true,
      message: `Item "${updated.name}" atualizado com sucesso!`,
      asset: updated,
    };
  } catch (error: any) {
    console.error("Erro ao atualizar patrimônio:", error);
    return { success: false, error: "Falha ao atualizar bem patrimonial." };
  }
}

export async function deleteChurchAsset(slug: string, assetId: string) {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "PASTOR", "SUPERADMIN"].includes(session.role)) {
      return { success: false, error: "Apenas administradores e pastores podem excluir bens." };
    }

    await prisma.churchAsset.delete({
      where: { id: assetId },
    });

    revalidatePath(`/${slug}/admin/patrimonio`);
    return {
      success: true,
      message: "Bem patrimonial removido do inventário com sucesso!",
    };
  } catch (error: any) {
    console.error("Erro ao excluir bem:", error);
    return { success: false, error: "Falha ao remover item do patrimônio." };
  }
}
