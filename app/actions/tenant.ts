"use server";

import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { generateActivationCode, sendActivationCodeEmail } from "@/lib/mail";
import { isValidEmail, sanitizeSlug } from "@/lib/validators";
import { createSession, destroySession, getSession } from "@/lib/session";
import { isFeatureAllowedForPlan } from "@/lib/plans";

export interface RegisterMasterParams {
  masterName: string;
  masterEmail: string;
  masterPassword?: string;
  churchName: string;
  churchSlug: string;
  primaryColor?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  pastorName?: string;
}

export interface CreateBranchParams {
  parentTenantId: string;
  branchName: string;
  branchSlug: string;
  primaryColor?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  pastorName?: string;
}

// 1. Cadastra o Usuário Master com Login, Senha, Igreja Sede e Envio de Código de Ativação
export async function registerMasterAndChurch(params: RegisterMasterParams) {
  try {
    const cleanEmail = params.masterEmail?.trim().toLowerCase();

    // Validação estrita de e-mail válido
    if (!isValidEmail(cleanEmail)) {
      return {
        success: false,
        error: "Por favor, informe um endereço de e-mail válido (ex: pastor@igreja.com.br).",
      };
    }

    if (!params.masterName || params.masterName.trim().length < 2) {
      return { success: false, error: "Informe seu nome completo ou nome de usuário." };
    }

    // Validação de senha
    const rawPassword = params.masterPassword || "horeb123456";
    if (rawPassword.length < 6) {
      return { success: false, error: "A senha deve ter pelo menos 6 caracteres." };
    }

    const slug = sanitizeSlug(params.churchSlug || params.churchName);
    if (!slug) {
      return { success: false, error: "O identificador (slug) da igreja é inválido." };
    }

    // Verificar se o e-mail já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Este endereço de e-mail já está cadastrado no sistema. Faça login.",
      };
    }

    // Verificar se o slug já existe
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      return {
        success: false,
        error: `A URL '/${slug}' já está em uso por outra congregação. Escolha outro nome ou slug.`,
      };
    }

    // Hash seguro da senha
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const primaryColor = params.primaryColor || "#dc2626";

    // 1. Criar a Igreja Matriz no Banco (Prisma)
    const tenant = await prisma.tenant.create({
      data: {
        name: params.churchName,
        slug,
        primaryColor,
        logoUrl: params.logoUrl || null,
        pastorName: params.pastorName || params.masterName?.trim() || null,
        phone: params.phone?.trim() || null,
        address: params.address?.trim() || null,
        plan: "GESTAO",
        status: "ACTIVE",
        monthlyPrice: 249,
        setupPrice: 790,
      },
    });

    // 2. Gerar Código de Ativação de 6 Dígitos
    // 2. Criar o Usuário Master da Igreja (já nasce ativo e autenticado como Administrador/Master)
    const isSuperAdmin = cleanEmail === "edsonmanoel2012@gmail.com" || cleanEmail === "lynxemssistema@gmail.com";

    const user = await prisma.user.create({
      data: {
        name: params.masterName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: isSuperAdmin ? "SUPERADMIN" : "ADMIN",
        isEmailVerified: true, // Já nasce ativo para entrar direto na sua igreja
        verificationCode: null,
        codeExpiresAt: null,
        tenantId: tenant.id,
      },
    });

    // 3. Criar registro de acesso e controle total em UserChurchAccess
    await prisma.userChurchAccess.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: isSuperAdmin ? "SUPERADMIN" : "ADMIN",
      },
    });

    // 4. Criar uma célula principal para demonstração
    await prisma.cellGroup.create({
      data: {
        name: "Célula Principal (Sede)",
        leaderId: user.id,
        tenantId: tenant.id,
      },
    });

    // 5. Cadastrar no Supabase Auth & Banco na VPS (fallback)
    try {
      await supabase.auth.signUp({
        email: cleanEmail,
        password: rawPassword,
        options: {
          data: {
            name: user.name,
            role: user.role,
            tenant_id: tenant.id,
          },
        },
      });

      await supabase.from("tenants").insert({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        primary_color: tenant.primaryColor,
        logo_url: tenant.logoUrl,
        address: params.address || "Sede Principal",
      });

      await supabase.from("users").insert({
        id: user.id,
        tenant_id: tenant.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (sbErr) {
      console.warn("Supabase auth sync warning (fallback local active):", sbErr);
    }

    // 6. Iniciar imediatamente a Sessão HTTP-Only para o Usuário Master
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });

    revalidatePath("/");
    revalidatePath(`/${slug}`);

    return {
      success: true,
      requiresActivation: false,
      email: cleanEmail,
      tenant,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantSlug: tenant.slug },
      redirectUrl: isSuperAdmin ? "/admin" : `/${slug}`,
    };
  } catch (error: any) {
    console.error("Erro no cadastro Master:", error);
    return {
      success: false,
      error: error.message || "Erro ao processar o cadastro da igreja.",
    };
  }
}

// 2. Login de Usuário com E-mail e Senha
export async function loginUser(email: string, rawPassword: string) {
  try {
    const cleanEmail = email?.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return { success: false, error: "Informe um e-mail válido." };
    }

    // Super Admin Master Hardcoded check ou busca no banco
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { tenant: true },
    });

    if (!user || !user.password) {
      return { success: false, error: "E-mail ou senha incorretos." };
    }

    const passwordMatches = await bcrypt.compare(rawPassword, user.password);
    if (!passwordMatches) {
      return { success: false, error: "E-mail ou senha incorretos." };
    }

    // Se for SUPERADMIN, criar sessão e redirecionar direto para o painel Super Admin
    if (user.role === "SUPERADMIN") {
      await createSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: "SUPERADMIN",
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug || "matriz",
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "SUPERADMIN",
          tenantSlug: user.tenant?.slug || "matriz",
        },
        redirectUrl: "/admin",
      };
    }

    // Se a conta ainda não estava marcada como verificada no banco, ativamos agora que a senha foi validada com sucesso
    if (!user.isEmailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          verificationCode: null,
          codeExpiresAt: null,
        },
      });
    }

    // Buscar todos os acessos do usuário a diferentes igrejas
    const accesses = await prisma.userChurchAccess.findMany({
      where: { userId: user.id },
      include: { tenant: true },
    });

    if (accesses.length > 1) {
      // Usuário tem acesso a mais de uma igreja. Gravar sessão parcial ou apenas redirecionar para a escolha
      // Vamos gravar a sessão com a igreja principal (tenantId do User) e ele escolhe lá
      await createSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role, // Papel base
        tenantId: user.tenantId,
        tenantSlug: user.tenant.slug,
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantSlug: user.tenant.slug,
        },
        redirectUrl: `/select-church`,
      };
    }

    // Se só tem 1 igreja (ou nenhuma no access, o que é estranho, mas usamos a base)
    const targetTenantSlug = accesses.length === 1 ? accesses[0].tenant.slug : user.tenant.slug;
    const targetTenantId = accesses.length === 1 ? accesses[0].tenantId : user.tenantId;
    const targetRole = accesses.length === 1 ? accesses[0].role : user.role;

    // Gravar Cookie de Sessão HTTP-Only no Navegador
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: (user as any).avatarUrl || null,
      role: targetRole,
      tenantId: targetTenantId,
      tenantSlug: targetTenantSlug,
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: (user as any).avatarUrl || null,
        role: targetRole,
        tenantSlug: targetTenantSlug,
      },
      redirectUrl: `/${targetTenantSlug}`,
    };
  } catch (error: any) {
    return { success: false, error: "Erro ao processar login." };
  }
}

// Logout do Usuário e Limpeza da Sessão
export async function logoutUser() {
  await destroySession();
  revalidatePath("/");
  return { success: true, redirectUrl: "/" };
}

// Obter Usuário da Sessão Atual
export async function getCurrentSessionUser() {
  return await getSession();
}

// 3. Cria uma Filial vinculada à Matriz
export async function createBranchChurch(params: CreateBranchParams) {
  try {
    const slug = sanitizeSlug(params.branchSlug || params.branchName);

    if (!slug) {
      return { success: false, error: "O slug da congregação filial é inválido." };
    }

    const parentTenant = await prisma.tenant.findUnique({
      where: { id: params.parentTenantId },
    });

    if (!parentTenant) {
      return { success: false, error: "Igreja sede (matriz) não encontrada." };
    }

    // Verificar se o plano da Matriz permite múltiplas congregações (Plano Premium)
    if (!isFeatureAllowedForPlan(parentTenant.plan, "BRANCHES")) {
      return {
        success: false,
        error: `A congregação sede está atualmente no Plano ${parentTenant.plan}. O cadastro de múltiplas congregações (Matriz e Filiais integradas) é um recurso exclusivo do Plano Premium.`,
      };
    }

    const existingSlug = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      return {
        success: false,
        error: `O slug '/${slug}' já está sendo utilizado.`,
      };
    }

    const primaryColor = params.primaryColor || "#2563eb";

    const branch = await prisma.tenant.create({
      data: {
        name: params.branchName,
        slug,
        primaryColor,
        parentId: parentTenant.id,
        logoUrl: params.logoUrl || parentTenant.logoUrl,
        pastorName: params.pastorName?.trim() || null,
        phone: params.phone?.trim() || null,
        address: params.address?.trim() || null,
        plan: parentTenant.plan || "GESTAO",
        status: "ACTIVE",
        monthlyPrice: 149,
        setupPrice: 490,
      },
    });

    // Vincular o usuário da sessão como ADMIN também desta filial
    const session = await getSession();
    if (session?.userId) {
      await prisma.userChurchAccess.upsert({
        where: {
          userId_tenantId: {
            userId: session.userId,
            tenantId: branch.id,
          },
        },
        update: { role: "ADMIN" },
        create: {
          userId: session.userId,
          tenantId: branch.id,
          role: "ADMIN",
        },
      });
    }

    try {
      await supabase.from("tenants").insert({
        id: branch.id,
        name: branch.name,
        slug: branch.slug,
        primary_color: branch.primaryColor,
        parent_id: branch.parentId,
        logo_url: branch.logoUrl,
        address: params.address || `Filial de ${parentTenant.name}`,
      });
    } catch (sbErr) {
      console.warn("Supabase branch sync warning:", sbErr);
    }

    revalidatePath("/");
    revalidatePath(`/${parentTenant.slug}`);
    revalidatePath(`/${slug}`);

    return {
      success: true,
      branch,
      redirectUrl: `/${slug}`,
    };
  } catch (error: any) {
    console.error("Erro ao criar filial:", error);
    return {
      success: false,
      error: error.message || "Erro ao criar congregação filial.",
    };
  }
}
