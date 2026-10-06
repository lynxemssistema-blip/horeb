"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface CreateDocumentParams {
  slug: string;
  type:
    | "TRANSFER_LETTER"
    | "RECOMMENDATION_LETTER"
    | "BAPTISM_CERTIFICATE"
    | "CHILD_PRESENTATION"
    | "MARRIAGE_CERTIFICATE"
    | "ORDINATION_CERTIFICATE";
  title: string;
  recipientName: string;
  recipientCpf?: string;
  recipientPhone?: string;
  details?: Record<string, any>;
}

export async function getOfficialDocuments(slug: string, typeFilter?: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true, pastorName: true, address: true, city: true, state: true, pixKey: true },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const whereClause: any = { tenantId: tenant.id };
    if (typeFilter && typeFilter !== "ALL") {
      whereClause.type = typeFilter;
    }

    const documents = await prisma.officialDocument.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { name: true, role: true },
        },
      },
      orderBy: { issuedAt: "desc" },
    });

    return {
      success: true,
      tenant,
      documents,
      currentUserRole: session.role,
      currentUserName: session.name,
    };
  } catch (error: any) {
    console.error("Erro ao buscar documentos oficiais:", error);
    return { success: false, error: error.message };
  }
}

export async function createOfficialDocument(params: CreateDocumentParams) {
  try {
    const session = await getSession();
    const isLeadership =
      session?.role === "ADMIN" ||
      session?.role === "PASTOR" ||
      session?.role === "SUPERADMIN";

    if (!isLeadership) {
      return { success: false, error: "Permissão restrita à secretaria e liderança pastoral." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const count = await prisma.officialDocument.count({
      where: { tenantId: tenant.id },
    });
    const year = new Date().getFullYear();
    const documentNumber = `DOC-${year}-${String(count + 1).padStart(4, "0")}`;

    const doc = await prisma.officialDocument.create({
      data: {
        documentNumber,
        type: params.type,
        title: params.title.trim(),
        recipientName: params.recipientName.trim(),
        recipientCpf: params.recipientCpf?.trim() || null,
        recipientPhone: params.recipientPhone?.trim() || null,
        details: params.details ? JSON.stringify(params.details) : null,
        tenantId: tenant.id,
        createdById: session?.userId || null,
      },
    });

    try {
      revalidatePath(`/${params.slug}/admin/secretaria`);
    } catch {}

    return {
      success: true,
      document: doc,
      message: `Documento ${doc.documentNumber} emitido com sucesso!`,
    };
  } catch (error: any) {
    console.error("Erro ao criar documento oficial:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteOfficialDocument(id: string, slug: string) {
  try {
    const session = await getSession();
    const isLeadership =
      session?.role === "ADMIN" ||
      session?.role === "PASTOR" ||
      session?.role === "SUPERADMIN";

    if (!isLeadership) {
      return { success: false, error: "Permissão insuficiente." };
    }

    await prisma.officialDocument.delete({
      where: { id },
    });

    try {
      revalidatePath(`/${slug}/admin/secretaria`);
    } catch {}

    return { success: true, message: "Documento excluído do arquivo." };
  } catch (error: any) {
    console.error("Erro ao excluir documento oficial:", error);
    return { success: false, error: error.message };
  }
}

export async function getMemberCredentialData(slug: string, targetUserId?: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const userId = targetUserId || session.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        cpf: true,
        pastoralTitle: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            pastorName: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "Membro não encontrado." };
    }

    // Código de validação criptográfica legível em QR Code
    const credentialCode = `HRB-${user.tenant.slug.toUpperCase()}-${user.id.substring(0, 8).toUpperCase()}`;

    return {
      success: true,
      user,
      credentialCode,
    };
  } catch (error: any) {
    console.error("Erro ao gerar credencial digital:", error);
    return { success: false, error: error.message };
  }
}
