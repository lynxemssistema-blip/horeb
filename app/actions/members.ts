"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { isValidEmail } from "@/lib/validators";
import {
  generateActivationCode,
  sendActivationCodeEmail,
  sendMemberInvitationEmail,
} from "@/lib/mail";
import { ROLE_LABELS } from "@/lib/constants";
import { createSession, getSession } from "@/lib/session";

// 1. Obter membros e toda a rede de igrejas (Matriz + Filiais)
export async function getChurchNetworkMembers(churchSlug: string) {
  try {
    const currentChurch = await prisma.tenant.findUnique({
      where: { slug: churchSlug },
      include: {
        parent: {
          include: {
            branches: true,
          },
        },
        branches: true,
      },
    });

    if (!currentChurch) {
      return { success: false, error: "Igreja não encontrada." };
    }

    const isMatriz = !currentChurch.parentId;
    
    // Obter todos os IDs de congregações pertencentes a esta rede
    let networkTenantIds: string[] = [currentChurch.id];
    let allNetworkChurches: { id: string; name: string; slug: string; primaryColor: string; isMatriz: boolean }[] = [
      {
        id: currentChurch.id,
        name: currentChurch.name,
        slug: currentChurch.slug,
        primaryColor: currentChurch.primaryColor,
        isMatriz,
      },
    ];

    if (isMatriz) {
      // Se for Matriz, inclui todas as suas filiais
      currentChurch.branches.forEach((b) => {
        networkTenantIds.push(b.id);
        allNetworkChurches.push({
          id: b.id,
          name: b.name,
          slug: b.slug,
          primaryColor: b.primaryColor,
          isMatriz: false,
        });
      });
    } else if (currentChurch.parent) {
      // Se for Filial, inclui a Sede Matriz e todas as irmãs
      networkTenantIds.push(currentChurch.parent.id);
      allNetworkChurches.unshift({
        id: currentChurch.parent.id,
        name: currentChurch.parent.name,
        slug: currentChurch.parent.slug,
        primaryColor: currentChurch.parent.primaryColor,
        isMatriz: true,
      });

      currentChurch.parent.branches.forEach((sister) => {
        if (sister.id !== currentChurch.id) {
          networkTenantIds.push(sister.id);
          allNetworkChurches.push({
            id: sister.id,
            name: sister.name,
            slug: sister.slug,
            primaryColor: sister.primaryColor,
            isMatriz: false,
          });
        }
      });
    }

    // Buscar todos os usuários desta rede (seja igreja principal ou acessos secundários)
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { tenantId: { in: networkTenantIds } },
          { churchAccesses: { some: { tenantId: { in: networkTenantIds } } } },
        ],
      },
      include: {
        tenant: true,
        churchAccesses: {
          include: {
            tenant: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      isMatriz,
      currentChurch: {
        id: currentChurch.id,
        name: currentChurch.name,
        slug: currentChurch.slug,
        primaryColor: currentChurch.primaryColor,
        plan: currentChurch.plan,
      },
      allNetworkChurches,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        role: u.role,
        roleLabel: ROLE_LABELS[u.role] || u.role,
        isEmailVerified: u.isEmailVerified,
        createdAt: u.createdAt.toISOString(),
        tenant: {
          id: u.tenant.id,
          name: u.tenant.name,
          slug: u.tenant.slug,
          primaryColor: u.tenant.primaryColor,
        },
        churchAccesses: u.churchAccesses.map((ca) => ({
          id: ca.id,
          tenantId: ca.tenantId,
          churchName: ca.tenant.name,
          churchSlug: ca.tenant.slug,
          primaryColor: ca.tenant.primaryColor,
          role: ca.role,
          roleLabel: ROLE_LABELS[ca.role] || ca.role,
        })),
      })),
    };
  } catch (error: any) {
    console.error("Erro ao buscar membros da rede:", error);
    return { success: false, error: error.message };
  }
}

// 2. Criar novo usuário com nível de acesso e congregação definida
export async function createChurchUser(params: {
  name: string;
  email: string;
  role: string;
  tenantId: string;
  password?: string;
  sendInviteEmail?: boolean;
}) {
  try {
    const cleanEmail = params.email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return { success: false, error: "Informe um e-mail válido." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Congregação de destino não encontrada." };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { churchAccesses: true },
    });

    if (existingUser) {
      // Se o usuário já existe no sistema, vincular à congregação de destino
      await prisma.userChurchAccess.upsert({
        where: {
          userId_tenantId: {
            userId: existingUser.id,
            tenantId: tenant.id,
          },
        },
        update: { role: params.role || "MEMBER" },
        create: {
          userId: existingUser.id,
          tenantId: tenant.id,
          role: params.role || "MEMBER",
        },
      });

      return {
        success: true,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: params.role,
          tempPassword: "",
        },
      };
    }

    const rawPassword = params.password || "Horeb" + Math.floor(1000 + Math.random() * 9000) + "!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const activationCode = generateActivationCode();
    const codeExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de validade

    const user = await prisma.user.create({
      data: {
        name: params.name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: params.role || "MEMBER",
        isEmailVerified: false,
        verificationCode: activationCode,
        codeExpiresAt,
        tenantId: tenant.id,
        churchAccesses: {
          create: {
            tenantId: tenant.id,
            role: params.role || "MEMBER",
          },
        },
      },
    });

    // Salvar código na tabela de ativação
    await prisma.activationCode.create({
      data: {
        email: cleanEmail,
        code: activationCode,
        expiresAt: codeExpiresAt,
      },
    });

    // Enviar e-mail de ativação e boas-vindas via Hostinger SMTP
    if (params.sendInviteEmail !== false) {
      const inviteUrl = `https://horeb.lynxems.com.br/${tenant.slug}/cadastro?email=${encodeURIComponent(
        cleanEmail
      )}&role=${params.role || "MEMBER"}`;

      await sendMemberInvitationEmail({
        to: cleanEmail,
        recipientName: params.name,
        churchName: tenant.name,
        roleName: ROLE_LABELS[params.role] || params.role,
        inviteUrl,
        primaryColor: tenant.primaryColor,
      });

      // Também envia o código numérico por segurança
      await sendActivationCodeEmail({
        to: cleanEmail,
        name: params.name,
        code: activationCode,
        churchName: tenant.name,
      });

      await prisma.emailLog.create({
        data: {
          type: "OUTGOING",
          from: "suporte@lynxems.com.br",
          to: cleanEmail,
          subject: `Convite de Membro: ${tenant.name} • Horeb`,
          snippet: `Criação direta de usuário ${params.name} (${params.role})`,
          status: "SENT",
          code: activationCode,
        },
      });
    }

    revalidatePath(`/${tenant.slug}`);
    revalidatePath(`/${tenant.slug}/membros`);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tempPassword: rawPassword,
      },
    };
  } catch (error: any) {
    console.error("Erro ao criar usuário da igreja:", error);
    return { success: false, error: error.message };
  }
}

// 3. Disparar convite por e-mail com link direto para cadastro
export async function sendDirectInviteEmail(params: {
  recipientEmail: string;
  recipientName?: string;
  role: string;
  tenantId: string;
}) {
  try {
    const cleanEmail = params.recipientEmail.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return { success: false, error: "Informe um e-mail válido." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    const inviteUrl = `https://horeb.lynxems.com.br/${tenant.slug}/cadastro?email=${encodeURIComponent(
      cleanEmail
    )}&role=${params.role}&name=${encodeURIComponent(params.recipientName || "")}`;

    const mailRes = await sendMemberInvitationEmail({
      to: cleanEmail,
      recipientName: params.recipientName,
      churchName: tenant.name,
      roleName: ROLE_LABELS[params.role] || params.role,
      inviteUrl,
      primaryColor: tenant.primaryColor,
    });

    if (mailRes.success) {
      await prisma.emailLog.create({
        data: {
          type: "OUTGOING",
          from: "suporte@lynxems.com.br",
          to: cleanEmail,
          subject: `Convite de Membresia: ${tenant.name}`,
          snippet: `Convite enviado para ${params.recipientName || cleanEmail} com perfil ${params.role}`,
          status: "SENT",
        },
      });
      return { success: true, inviteUrl };
    } else {
      return { success: false, error: mailRes.error || "Falha ao enviar e-mail via Hostinger SMTP." };
    }
  } catch (error: any) {
    console.error("Erro ao enviar convite direto:", error);
    return { success: false, error: error.message };
  }
}

// 4. Alterar nível de acesso ou congregação de um usuário
export async function updateUserRoleAndTenant(params: {
  userId: string;
  role: string;
  tenantId?: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: { tenant: true },
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    if (user.role === "SUPERADMIN") {
      return { success: false, error: "Não é permitido alterar o perfil do Super Administrador Master." };
    }

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: {
        role: params.role,
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      },
    });

    revalidatePath(`/${user.tenant.slug}/membros`);
    return { success: true, user: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Excluir usuário da congregação
export async function deleteChurchUser(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    if (user.role === "SUPERADMIN") {
      return { success: false, error: "O Super Administrador não pode ser excluído." };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath(`/${user.tenant.slug}/membros`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 6. Atualizar Dados e Identidade Visual da Igreja (Nome, Cor, Logo Base64, Endereço, PIX, etc.)
export async function updateChurchSettings(params: {
  tenantId: string;
  name: string;
  primaryColor: string;
  logoUrl?: string | null;
  pastorName?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pixKey?: string | null;
  pixKeyType?: string | null;
  pixPresetValues?: string | null;
}) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Igreja não encontrada." };
    }

    const updated = await prisma.tenant.update({
      where: { id: params.tenantId },
      data: {
        name: params.name.trim(),
        primaryColor: params.primaryColor || tenant.primaryColor,
        logoUrl: params.logoUrl !== undefined ? params.logoUrl : tenant.logoUrl,
        pastorName: params.pastorName !== undefined ? params.pastorName : tenant.pastorName,
        phone: params.phone !== undefined ? params.phone : tenant.phone,
        address: params.address !== undefined ? params.address : tenant.address,
        city: params.city !== undefined ? params.city : tenant.city,
        state: params.state !== undefined ? params.state : tenant.state,
        pixKey: params.pixKey !== undefined ? params.pixKey : tenant.pixKey,
        pixKeyType: params.pixKeyType !== undefined ? params.pixKeyType : tenant.pixKeyType,
        pixPresetValues: params.pixPresetValues !== undefined ? params.pixPresetValues : tenant.pixPresetValues,
      },
    });

    revalidatePath("/");
    revalidatePath(`/${tenant.slug}`);
    revalidatePath(`/${tenant.slug}/configuracoes`);
    revalidatePath(`/${tenant.slug}/membros`);
    revalidatePath(`/${tenant.slug}/doar`);

    return { success: true, tenant: updated };
  } catch (error: any) {
    console.error("Erro ao atualizar dados da igreja:", error);
    return { success: false, error: error.message };
  }
}

// 7. Auto-cadastro de Membro diretamente na página da igreja (Matriz ou Filial)
export async function registerMemberSelf(params: {
  name: string;
  email: string;
  password: string;
  tenantSlug: string;
}) {
  try {
    const cleanEmail = params.email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return { success: false, error: "Informe um e-mail válido." };
    }
    if (params.password.length < 6) {
      return { success: false, error: "A senha deve ter no mínimo 6 caracteres." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: params.tenantSlug },
    });

    if (!tenant) {
      return { success: false, error: "Congregação não encontrada." };
    }

    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { churchAccesses: true },
    });

    const activationCode = generateActivationCode();
    const codeExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    if (user) {
      // O usuário já existe no sistema global. Vamos verificar se já tem acesso a esta igreja específica:
      const existingAccess = user.churchAccesses.find((ca) => ca.tenantId === tenant.id);
      if (existingAccess) {
        return {
          success: false,
          error: `Você já possui cadastro na ${tenant.name}. Faça login diretamente com seu e-mail e senha!`,
        };
      }

      // Conectar este usuário a esta igreja com perfil padrão MEMBER
      await prisma.userChurchAccess.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: "MEMBER",
        },
      });

      // Auto-verificar se ainda não verificado
      if (!user.isEmailVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true },
        });
      }

      await createSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: "MEMBER",
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      });

      revalidatePath(`/${tenant.slug}`);
      revalidatePath(`/${tenant.slug}/membros`);

      return {
        success: true,
        alreadyHadAccount: true,
        requiresActivation: false,
        redirectUrl: `/${tenant.slug}`,
        message: `Você agora faz parte da congregação ${tenant.name} como Membro!`,
      };
    }

    // Criar novo usuário já ativo e com perfil de Membro
    const hashedPassword = await bcrypt.hash(params.password, 10);
    user = await prisma.user.create({
      data: {
        name: params.name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: "MEMBER",
        isEmailVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
        tenantId: tenant.id,
        churchAccesses: {
          create: {
            tenantId: tenant.id,
            role: "MEMBER",
          },
        },
      },
      include: { churchAccesses: true },
    });

    // Iniciar sessão HTTP-Only automaticamente
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: "MEMBER",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });

    revalidatePath(`/${tenant.slug}`);
    revalidatePath(`/${tenant.slug}/membros`);

    return {
      success: true,
      requiresActivation: false,
      email: cleanEmail,
      redirectUrl: `/${tenant.slug}`,
      message: `Cadastro realizado com sucesso na ${tenant.name}! Você já está conectado.`,
    };
  } catch (error: any) {
    console.error("Erro no auto-cadastro de membro:", error);
    return { success: false, error: error.message || "Erro ao realizar cadastro." };
  }
}

// 8. O Master define/altera o acesso e perfil de um usuário para qualquer igreja da rede
export async function setUserChurchAccess(params: {
  userId: string;
  tenantId: string;
  role: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    });
    if (!user) return { success: false, error: "Usuário não encontrado." };

    const access = await prisma.userChurchAccess.upsert({
      where: {
        userId_tenantId: {
          userId: params.userId,
          tenantId: params.tenantId,
        },
      },
      update: {
        role: params.role,
      },
      create: {
        userId: params.userId,
        tenantId: params.tenantId,
        role: params.role,
      },
      include: {
        tenant: true,
      },
    });

    return { success: true, access };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 9. O Master revoga o acesso de um usuário a uma igreja específica
export async function removeUserChurchAccess(params: {
  userId: string;
  tenantId: string;
}) {
  try {
    await prisma.userChurchAccess.deleteMany({
      where: {
        userId: params.userId,
        tenantId: params.tenantId,
      },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 10. Atualiza a foto de perfil do usuário (avatarUrl)
export async function updateUserAvatar(userId: string, avatarUrl: string) {
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    // Se o usuário atualizou o próprio avatar, atualiza a sessão também
    const session = await getSession();
    if (session && session.userId === userId) {
      await createSession({
        ...session,
        avatarUrl,
      });
    }

    revalidatePath("/", "layout");
    return { success: true, user: updated };
  } catch (error: any) {
    console.error("Erro ao atualizar avatar do usuário:", error);
    return { success: false, error: error.message };
  }
}
