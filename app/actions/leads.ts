"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface CapturePurchaseLeadParams {
  leadName: string;
  leadEmail: string;
  leadCpfCnpj?: string | null;
  leadPhone?: string | null;
  productType?: "EBOOK" | "B2C_TOOL" | "B2B_PLAN";
  productId?: string | null;
  productName: string;
  amount: number;
  billingType?: string;
  billingCycle?: "SINGLE" | "MONTHLY" | "YEARLY";
  status?: "CAPTURED" | "CHECKOUT_STARTED" | "PAID" | "FAILED";
  sourceUrl?: string | null;
  asaasCustomerId?: string | null;
  asaasPaymentId?: string | null;
  invoiceUrl?: string | null;
  notes?: string | null;
}

async function requireSuperAdmin() {
  const session = await getSession();
  const isSuper =
    session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";
  if (!session || !isSuper) {
    throw new Error("Acesso negado: exclusivo para Super Administrador.");
  }
  return session;
}

/**
 * Garante que a tabela PurchaseLead exista no SQLite (mesmo em ambientes com volume persistido antigo)
 * e sincroniza pedidos anteriores de E-books / Ferramentas B2C para que nenhum lead histórico seja perdido.
 */
let tableChecked = false;
async function ensurePurchaseLeadTableAndBackfill() {
  if (tableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PurchaseLead" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "classification" TEXT NOT NULL DEFAULT 'Página de Compras',
        "leadName" TEXT NOT NULL,
        "leadEmail" TEXT NOT NULL,
        "leadCpfCnpj" TEXT,
        "leadPhone" TEXT,
        "productType" TEXT NOT NULL DEFAULT 'EBOOK',
        "productId" TEXT,
        "productName" TEXT NOT NULL,
        "amount" REAL NOT NULL,
        "billingType" TEXT NOT NULL DEFAULT 'PIX',
        "billingCycle" TEXT DEFAULT 'SINGLE',
        "status" TEXT NOT NULL DEFAULT 'CAPTURED',
        "sourceUrl" TEXT,
        "asaasCustomerId" TEXT,
        "asaasPaymentId" TEXT,
        "invoiceUrl" TEXT,
        "notes" TEXT,
        "convertedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Backfill automático a partir de EbookOrders já registrados (se ainda não estiverem em PurchaseLead)
    const existingOrders = await prisma.ebookOrder.findMany({
      include: { ebook: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    for (const ord of existingOrders) {
      if (!ord.buyerEmail) continue;
      const alreadyExists = await prisma.purchaseLead.findFirst({
        where: {
          OR: [
            ...(ord.asaasPaymentId ? [{ asaasPaymentId: ord.asaasPaymentId }] : []),
            {
              leadEmail: ord.buyerEmail.toLowerCase(),
              productId: ord.ebookId,
            },
          ],
        },
      });

      const isPaid = ord.status === "RECEIVED" || ord.status === "CONFIRMED";

      if (!alreadyExists) {
        await prisma.purchaseLead.create({
          data: {
            classification: "Página de Compras",
            leadName: ord.buyerName || "Cliente",
            leadEmail: ord.buyerEmail.toLowerCase(),
            leadCpfCnpj: ord.buyerCpf || null,
            leadPhone: ord.buyerPhone || null,
            productType: "EBOOK",
            productId: ord.ebookId,
            productName: ord.ebook?.title || "E-book Oficial Horeb",
            amount: Number(ord.amount || 9.9),
            billingType: ord.billingType === "CREDIT_CARD" ? "CREDIT_CARD" : "PIX",
            billingCycle: "SINGLE",
            status: isPaid ? "PAID" : "CHECKOUT_STARTED",
            sourceUrl: `/ebooks/${ord.ebookId}`,
            asaasCustomerId: ord.asaasCustomerId || null,
            asaasPaymentId: ord.asaasPaymentId || null,
            invoiceUrl: ord.invoiceUrl || null,
            convertedAt: isPaid ? ord.paidAt || new Date() : null,
            createdAt: ord.createdAt,
          },
        });
      } else if (isPaid && alreadyExists.status !== "PAID") {
        await prisma.purchaseLead.update({
          where: { id: alreadyExists.id },
          data: {
            status: "PAID",
            convertedAt: alreadyExists.convertedAt || ord.paidAt || new Date(),
            asaasPaymentId: ord.asaasPaymentId || alreadyExists.asaasPaymentId,
            invoiceUrl: ord.invoiceUrl || alreadyExists.invoiceUrl,
          },
        });
      }
    }

    tableChecked = true;
  } catch (err) {
    console.warn("[ensurePurchaseLeadTableAndBackfill Warning]:", err);
  }
}

/**
 * 1. Captura ou atualiza automaticamente os dados pessoais informados pelo Lead na Página de Compras
 * (Funciona tanto em tempo real enquanto o visitante preenche os campos quanto no disparo do checkout)
 */
export async function capturePurchaseLeadAction(params: CapturePurchaseLeadParams) {
  try {
    await ensurePurchaseLeadTableAndBackfill();

    const cleanName = (params.leadName || "").trim();
    const cleanEmail = (params.leadEmail || "").trim().toLowerCase();
    const cleanCpf = (params.leadCpfCnpj || "").replace(/\D/g, "");
    const cleanPhone = (params.leadPhone || "").trim();

    // Precisamos de pelo menos Nome + E-mail válido (ou CPF/Telefone) para registrar o Lead
    if (!cleanName && !cleanEmail && !cleanPhone) {
      return { success: false, error: "Dados insuficientes para captura do lead." };
    }

    const effectiveName = cleanName || "Visitante Página de Compras";
    const effectiveEmail = cleanEmail || `lead.${cleanCpf || Date.now()}@pendente.horeb`;
    const productType = params.productType || "EBOOK";
    const productName = (params.productName || "Produto Horeb").trim();
    const billingType =
      params.billingType === "CREDIT_CARD" ? "CREDIT_CARD" : "PIX";
    const billingCycle = params.billingCycle || "SINGLE";

    // Verifica se já existe um Lead recente para este mesmo E-mail/CPF e mesmo Produto para atualizar sem duplicar
    const existingLead = await prisma.purchaseLead.findFirst({
      where: {
        productName,
        OR: [
          ...(cleanEmail && cleanEmail.includes("@") ? [{ leadEmail: cleanEmail }] : []),
          ...(cleanCpf.length >= 11 ? [{ leadCpfCnpj: cleanCpf }] : []),
          ...(params.asaasPaymentId ? [{ asaasPaymentId: params.asaasPaymentId }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingLead) {
      const nextStatus =
        existingLead.status === "PAID"
          ? "PAID"
          : params.status === "PAID"
          ? "PAID"
          : params.status === "CHECKOUT_STARTED" || existingLead.status === "CHECKOUT_STARTED"
          ? "CHECKOUT_STARTED"
          : params.status || existingLead.status;

      const updated = await prisma.purchaseLead.update({
        where: { id: existingLead.id },
        data: {
          classification: "Página de Compras",
          leadName: cleanName || existingLead.leadName,
          leadEmail:
            cleanEmail && cleanEmail.includes("@")
              ? cleanEmail
              : existingLead.leadEmail,
          leadCpfCnpj: cleanCpf || existingLead.leadCpfCnpj,
          leadPhone: cleanPhone || existingLead.leadPhone,
          productType,
          productId: params.productId || existingLead.productId,
          productName,
          amount: Number(params.amount ?? existingLead.amount),
          billingType,
          billingCycle,
          status: nextStatus,
          sourceUrl: params.sourceUrl || existingLead.sourceUrl,
          asaasCustomerId: params.asaasCustomerId || existingLead.asaasCustomerId,
          asaasPaymentId: params.asaasPaymentId || existingLead.asaasPaymentId,
          invoiceUrl: params.invoiceUrl || existingLead.invoiceUrl,
          notes: params.notes || existingLead.notes,
          convertedAt:
            nextStatus === "PAID"
              ? existingLead.convertedAt || new Date()
              : existingLead.convertedAt,
        },
      });

      return { success: true, leadId: updated.id };
    }

    const created = await prisma.purchaseLead.create({
      data: {
        classification: "Página de Compras",
        leadName: effectiveName,
        leadEmail: effectiveEmail,
        leadCpfCnpj: cleanCpf || null,
        leadPhone: cleanPhone || null,
        productType,
        productId: params.productId || null,
        productName,
        amount: Number(params.amount || 0),
        billingType,
        billingCycle,
        status: params.status || "CAPTURED",
        sourceUrl: params.sourceUrl || null,
        asaasCustomerId: params.asaasCustomerId || null,
        asaasPaymentId: params.asaasPaymentId || null,
        invoiceUrl: params.invoiceUrl || null,
        notes: params.notes || null,
        convertedAt: params.status === "PAID" ? new Date() : null,
      },
    });

    return { success: true, leadId: created.id };
  } catch (error: any) {
    console.warn("[capturePurchaseLeadAction Warning]:", error?.message || error);
    return { success: false, error: "Erro ao registrar lead." };
  }
}

/**
 * 2. Marca um Lead como PAGO quando o pagamento é confirmado no Asaas
 */
export async function markPurchaseLeadPaidByPaymentId(
  asaasPaymentId: string,
  buyerEmail?: string | null
) {
  try {
    await ensurePurchaseLeadTableAndBackfill();
    if (!asaasPaymentId && !buyerEmail) return;

    await prisma.purchaseLead.updateMany({
      where: {
        OR: [
          ...(asaasPaymentId ? [{ asaasPaymentId }] : []),
          ...(buyerEmail ? [{ leadEmail: buyerEmail.trim().toLowerCase() }] : []),
        ],
      },
      data: {
        status: "PAID",
        convertedAt: new Date(),
      },
    });
  } catch (err) {
    console.warn("[markPurchaseLeadPaidByPaymentId Warning]:", err);
  }
}

/**
 * 3. Lista todos os Leads classificados como "Página de Compras" (EXCLUSIVO SUPER ADMIN)
 */
export async function getSuperAdminPurchaseLeads() {
  try {
    await requireSuperAdmin();
    await ensurePurchaseLeadTableAndBackfill();

    const leads = await prisma.purchaseLead.findMany({
      orderBy: { updatedAt: "desc" },
      take: 300,
    });

    const totalLeads = leads.length;
    const totalCapturedOnly = leads.filter((l) => l.status === "CAPTURED").length;
    const totalCheckoutStarted = leads.filter(
      (l) => l.status === "CHECKOUT_STARTED"
    ).length;
    const totalPaid = leads.filter((l) => l.status === "PAID").length;
    const totalPotentialAmount = leads.reduce(
      (acc, l) => acc + Number(l.amount || 0),
      0
    );
    const totalConvertedAmount = leads
      .filter((l) => l.status === "PAID")
      .reduce((acc, l) => acc + Number(l.amount || 0), 0);

    return {
      success: true,
      leads,
      metrics: {
        totalLeads,
        totalCapturedOnly,
        totalCheckoutStarted,
        totalPaid,
        totalPotentialAmount,
        totalConvertedAmount,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      leads: [],
      metrics: {
        totalLeads: 0,
        totalCapturedOnly: 0,
        totalCheckoutStarted: 0,
        totalPaid: 0,
        totalPotentialAmount: 0,
        totalConvertedAmount: 0,
      },
      error: error.message,
    };
  }
}

/**
 * 4. Atualiza status ou observação de um Lead (EXCLUSIVO SUPER ADMIN)
 */
export async function updatePurchaseLeadStatusAction(params: {
  leadId: string;
  status?: string;
  notes?: string;
}) {
  try {
    await requireSuperAdmin();
    const updated = await prisma.purchaseLead.update({
      where: { id: params.leadId },
      data: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.notes !== undefined ? { notes: params.notes } : {}),
        ...(params.status === "PAID" ? { convertedAt: new Date() } : {}),
      },
    });
    revalidatePath("/admin");
    return { success: true, lead: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 5. Exclui um Lead da lista (EXCLUSIVO SUPER ADMIN)
 */
export async function deletePurchaseLeadAction(leadId: string) {
  try {
    await requireSuperAdmin();
    await prisma.purchaseLead.delete({
      where: { id: leadId },
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
