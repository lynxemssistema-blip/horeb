"use server";

import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

export interface GeneratePixParams {
  tenantId?: string;
  slug?: string;
  amount: number;
  category?: string;
}

export interface GeneratePixResponse {
  success: boolean;
  transactionId: string;
  pixCopiaECola: string;
  amount: number;
  churchName?: string;
  error?: string;
}

export async function generatePixTransaction({
  tenantId,
  slug,
  amount,
  category = "DIZIMO",
}: GeneratePixParams): Promise<GeneratePixResponse> {
  try {
    if (amount <= 0) {
      throw new Error("O valor da contribuição deve ser maior que zero.");
    }

    // 1. Simular latência de rede bancária de 1 segundo (Fintech Mock)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. Buscar informações do Tenant (Igreja) por ID ou Slug
    let tenant = null;
    if (slug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      });
    } else if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, slug: true },
      });
    }

    const resolvedTenantId = tenant?.id || tenantId || "default-tenant";
    const churchName = tenant?.name || "Igreja Local";

    // 3. Salvar no Prisma com status 'PENDING'
    const transaction = await prisma.transaction.create({
      data: {
        tenantId: resolvedTenantId,
        amount: Number(amount),
        category,
        type: "PIX",
        status: "PENDING",
      },
    });

    // 4. Gravar de forma assíncrona no Supabase na VPS (se conectado)
    try {
      await supabase.from("transactions").insert({
        tenant_id: tenantId,
        amount: Number(amount),
        category,
        type: "PIX",
        status: "PENDING",
      });
    } catch (sbErr) {
      console.warn("Supabase transaction log error (fallback ignored):", sbErr);
    }

    // 5. Gerar payload EMV padrão do Banco Central (PIX Copia e Cola)
    const formattedAmount = Number(amount).toFixed(2);
    const sanitizedChurchName = churchName.slice(0, 15).toUpperCase();
    const fakePixCopiaECola = `00020126580014br.gov.bcb.pix.mock0136${transaction.id}520400005303986540${formattedAmount}5802BR5915${sanitizedChurchName}6009SAOPAULO62070503***6304A1B2`;

    return {
      success: true,
      transactionId: transaction.id,
      pixCopiaECola: fakePixCopiaECola,
      amount: Number(amount),
      churchName,
    };
  } catch (error: any) {
    console.error("Erro ao gerar transação PIX:", error);
    return {
      success: false,
      transactionId: "",
      pixCopiaECola: "",
      amount: 0,
      error: error.message || "Falha ao gerar o código PIX.",
    };
  }
}

export async function getChurchPixConfig(slug: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        pixKey: true,
        pixKeyType: true,
        pixPresetValues: true,
      },
    });

    if (!tenant) return { success: false, error: "Igreja não encontrada." };

    return {
      success: true,
      tenant,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
