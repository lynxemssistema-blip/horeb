"use server";

import { prisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// 1. Obter dados completos do perfil do usuário conectado
export async function getUserProfile() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            primaryColor: true,
            logoUrl: true,
            parentId: true,
          },
        },
        churchAccesses: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                primaryColor: true,
              },
            },
          },
        },
        _count: {
          select: {
            ledCells: true,
            ledMinistries: true,
            transactions: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado no banco de dados." };
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        cpf: user.cpf,
        phone: user.pastoralPhone,
        title: user.pastoralTitle,
        bio: user.pastoralBio,
        isEmailVerified: user.isEmailVerified,
        themePreference: user.themePreference || "system",
        themePalette: user.themePalette || "default",
        createdAt: user.createdAt,
        tenant: user.tenant,
        churchAccesses: user.churchAccesses,
        counts: user._count,
      },
    };
  } catch (error: any) {
    console.error("Erro ao buscar perfil do usuário:", error);
    return { success: false, error: error.message || "Falha ao carregar perfil." };
  }
}

// 2. Atualizar dados cadastrais (Nome, E-mail, Telefone/WhatsApp, CPF, Biografia)
export async function updateUserProfile(data: {
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  bio?: string;
  title?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const cleanName = data.name?.trim();
    const cleanEmail = data.email?.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: "Informe seu nome completo." };
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Informe um e-mail válido." };
    }

    // Se o e-mail mudou, verificar se já não está em uso por outro usuário
    if (cleanEmail !== session.email.toLowerCase()) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: cleanEmail,
          id: { not: session.userId },
        },
      });

      if (emailExists) {
        return { success: false, error: "Este endereço de e-mail já pertence a outro usuário." };
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: cleanName,
        email: cleanEmail,
        pastoralPhone: data.phone?.trim() || null,
        cpf: data.cpf?.trim() || null,
        pastoralBio: data.bio?.trim() || null,
        pastoralTitle: data.title?.trim() || null,
      },
    });

    // Atualiza o cookie de sessão com o novo nome e e-mail imediatamente
    await createSession({
      userId: session.userId,
      email: cleanEmail,
      name: cleanName,
      avatarUrl: session.avatarUrl,
      role: session.role,
      originalRole: session.originalRole,
      tenantId: session.tenantId,
      tenantSlug: session.tenantSlug,
    });

    revalidatePath("/");
    revalidatePath(`/${session.tenantSlug}`);

    return {
      success: true,
      message: "Dados do perfil atualizados com sucesso!",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.pastoralPhone,
        cpf: updatedUser.cpf,
        bio: updatedUser.pastoralBio,
        title: updatedUser.pastoralTitle,
      },
    };
  } catch (error: any) {
    console.error("Erro ao atualizar perfil:", error);
    return { success: false, error: error.message || "Erro ao salvar alterações do perfil." };
  }
}

// 3. Atualizar Foto de Perfil (Avatar URL ou Base64)
export async function updateUserAvatar(avatarUrl: string | null) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl },
    });

    // Atualiza a sessão com o novo avatar
    await createSession({
      userId: session.userId,
      email: session.email,
      name: session.name,
      avatarUrl: avatarUrl || undefined,
      role: session.role,
      originalRole: session.originalRole,
      tenantId: session.tenantId,
      tenantSlug: session.tenantSlug,
    });

    revalidatePath("/");
    revalidatePath(`/${session.tenantSlug}`);

    return {
      success: true,
      message: avatarUrl ? "Foto de perfil atualizada com sucesso!" : "Foto removida com sucesso.",
      avatarUrl,
    };
  } catch (error: any) {
    console.error("Erro ao atualizar foto de perfil:", error);
    return { success: false, error: error.message || "Erro ao salvar nova foto." };
  }
}

// 4. Alterar Senha com Validação de Segurança
export async function updateUserPassword(data: {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    if (!data.newPassword || data.newPassword.length < 6) {
      return { success: false, error: "A nova senha deve ter no mínimo 6 caracteres." };
    }

    if (data.newPassword !== data.confirmPassword) {
      return { success: false, error: "A confirmação da nova senha não confere." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { password: true },
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    // Se o usuário já possuía uma senha anterior cadastrada, exige e valida a senha atual
    if (user.password) {
      if (!data.currentPassword) {
        return { success: false, error: "Informe sua senha atual para autorizar a troca." };
      }

      const isCurrentValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isCurrentValid) {
        return { success: false, error: "A senha atual informada está incorreta." };
      }
    }

    // Criptografa a nova senha com bcrypt (10 rounds)
    const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedNewPassword },
    });

    return {
      success: true,
      message: "Senha alterada com sucesso! Utilize a nova senha no seu próximo login.",
    };
  } catch (error: any) {
    console.error("Erro ao alterar senha:", error);
    return { success: false, error: error.message || "Erro ao processar alteração de senha." };
  }
}

// 5. Salvar preferência de tema e paleta do usuário
export async function updateUserTheme(themePreference: string, themePalette: string) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Usuário não autenticado." };
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        themePreference,
        themePalette,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Erro ao salvar tema do usuário:", error);
    return { success: false, error: error.message };
  }
}
