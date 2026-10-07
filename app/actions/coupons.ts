"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Valida se o usuário logado é SUPERADMIN
 */
async function checkSuperAdmin() {
  const session = await getSession();
  const userEmail = session?.email?.toLowerCase();

  const isSuperAdmin =
    session?.role === "SUPERADMIN" ||
    userEmail === "edsonmanoel2012@gmail.com" ||
    userEmail === "lynxemssistema@gmail.com" ||
    userEmail === "suporte@lynxems.com.br";

  return isSuperAdmin;
}

/**
 * 1. Lista todos os cupons/palavras-chave cadastradas (SuperAdmin)
 */
export async function listDiscountCoupons() {
  try {
    const isMaster = await checkSuperAdmin();
    if (!isMaster) {
      return { success: false, error: "Acesso restrito ao Super Admin", coupons: [] };
    }

    const coupons = await prisma.discountCoupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    return { success: true, coupons };
  } catch (error: any) {
    return { success: false, error: error.message, coupons: [] };
  }
}

/**
 * 2. Cria ou atualiza uma palavra-chave de desconto (SuperAdmin)
 */
export async function createOrUpdateDiscountCoupon(data: {
  id?: string;
  code: string;
  description?: string;
  discountPercent: number;
  maxUses?: number | null;
  validUntil?: string | null;
  active?: boolean;
}) {
  try {
    const isMaster = await checkSuperAdmin();
    if (!isMaster) {
      return { success: false, error: "Apenas Super Admin pode gerenciar cupons de desconto" };
    }

    const cleanCode = data.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanCode) {
      return { success: false, error: "A palavra-chave não pode estar vazia" };
    }

    if (data.discountPercent <= 0 || data.discountPercent > 100) {
      return { success: false, error: "O desconto deve ser entre 1% e 100%" };
    }

    const validUntilDate = data.validUntil ? new Date(data.validUntil) : null;

    if (data.id) {
      const updated = await prisma.discountCoupon.update({
        where: { id: data.id },
        data: {
          code: cleanCode,
          description: data.description?.trim() || null,
          discountPercent: Math.round(data.discountPercent),
          maxUses: data.maxUses ? Number(data.maxUses) : null,
          validUntil: validUntilDate,
          active: data.active ?? true,
        },
      });
      revalidatePath("/admin");
      return { success: true, coupon: updated };
    } else {
      // Verifica se o código já existe
      const existing = await prisma.discountCoupon.findUnique({
        where: { code: cleanCode },
      });
      if (existing) {
        return { success: false, error: `A palavra-chave '${cleanCode}' já está cadastrada.` };
      }

      const created = await prisma.discountCoupon.create({
        data: {
          code: cleanCode,
          description: data.description?.trim() || null,
          discountPercent: Math.round(data.discountPercent),
          maxUses: data.maxUses ? Number(data.maxUses) : null,
          validUntil: validUntilDate,
          active: data.active ?? true,
        },
      });
      revalidatePath("/admin");
      return { success: true, coupon: created };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 3. Exclui um cupom de desconto (SuperAdmin)
 */
export async function deleteDiscountCoupon(id: string) {
  try {
    const isMaster = await checkSuperAdmin();
    if (!isMaster) {
      return { success: false, error: "Apenas Super Admin pode excluir cupons" };
    }

    await prisma.discountCoupon.delete({
      where: { id },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 4. Ativa ou Desativa um cupom (SuperAdmin)
 */
export async function toggleDiscountCoupon(id: string, active: boolean) {
  try {
    const isMaster = await checkSuperAdmin();
    if (!isMaster) {
      return { success: false, error: "Acesso restrito ao Super Admin" };
    }

    await prisma.discountCoupon.update({
      where: { id },
      data: { active },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 5. Valida uma palavra-chave digitada pelo usuário no checkout
 */
export async function validateDiscountCoupon(code: string) {
  try {
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanCode) {
      return { valid: false, error: "Digite a palavra-chave" };
    }

    const coupon = await prisma.discountCoupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon || !coupon.active) {
      return { valid: false, error: "Palavra-chave inválida ou inativa" };
    }

    // Valida data de validade
    if (coupon.validUntil && new Date(coupon.validUntil).getTime() < Date.now()) {
      return { valid: false, error: "Esta palavra-chave de desconto expirou" };
    }

    // Valida limite de usos
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: "Limite máximo de usos desta palavra-chave atingido" };
    }

    return {
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      description: coupon.description,
    };
  } catch (error: any) {
    return { valid: false, error: "Erro ao validar palavra-chave" };
  }
}
