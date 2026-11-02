"use server";

import { prisma } from "@/lib/prisma";
import { getSession, checkChurchAccess } from "@/lib/session";
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
    const access = await checkChurchAccess(slug);
    if (!access.authorized) {
      return { success: false, error: "Acesso não autorizado a esta congregação." };
    }
    const session = access.user;
    const isLeadership = ["ADMIN", "PASTOR", "SECRETARIA", "SUPERADMIN"].includes(access.effectiveRole);
    if (!isLeadership) {
      return { success: false, error: "Acesso restrito à secretaria e liderança." };
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
    const access = await checkChurchAccess(params.slug);
    if (!access.authorized) {
      return { success: false, error: "Acesso negado a esta congregação." };
    }

    const session = access.user;
    const isLeadership =
      access.effectiveRole === "ADMIN" ||
      access.effectiveRole === "PASTOR" ||
      access.effectiveRole === "SECRETARIA" ||
      access.effectiveRole === "SUPERADMIN";

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
    let seq = count + 1;
    let documentNumber = `DOC-${year}-${String(seq).padStart(4, "0")}`;

    // Evita colisão caso algum documento anterior tenha sido excluído
    while (
      await prisma.officialDocument.findFirst({
        where: { tenantId: tenant.id, documentNumber },
        select: { id: true },
      })
    ) {
      seq++;
      documentNumber = `DOC-${year}-${String(seq).padStart(4, "0")}`;
    }

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
    const access = await checkChurchAccess(slug);
    if (!access.authorized) {
      return { success: false, error: "Acesso negado a esta congregação." };
    }

    const isLeadership =
      access.effectiveRole === "ADMIN" ||
      access.effectiveRole === "PASTOR" ||
      access.effectiveRole === "SECRETARIA" ||
      access.effectiveRole === "SUPERADMIN";

    if (!isLeadership) {
      return { success: false, error: "Permissão insuficiente." };
    }

    const existing = await prisma.officialDocument.findFirst({
      where: { id, tenantId: access.targetTenantId },
    });
    if (!existing) {
      return { success: false, error: "Documento não encontrado nesta congregação." };
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
    const access = await checkChurchAccess(slug);
    if (!access.authorized) {
      return { success: false, error: "Usuário não autorizado nesta congregação." };
    }

    const session = access.user;
    const isLeadership = ["ADMIN", "PASTOR", "SECRETARIA", "SUPERADMIN"].includes(access.effectiveRole);

    if (targetUserId && targetUserId !== session.userId && !isLeadership) {
      return { success: false, error: "Acesso negado: você só pode consultar sua própria credencial." };
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
        tenantId: true,
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

    if (access.effectiveRole !== "SUPERADMIN" && user.tenantId !== access.targetTenantId) {
      return { success: false, error: "Este membro não pertence a esta congregação." };
    }

    // Código de validação criptográfica legível em QR Code
    const tenantSlug = user.tenant?.slug ? user.tenant.slug.toUpperCase() : "MATRIZ";
    const credentialCode = `HRB-${tenantSlug}-${user.id.substring(0, 8).toUpperCase()}`;

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
