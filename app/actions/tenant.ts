"use server";

import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { generateActivationCode, sendActivationCodeEmail } from "@/lib/mail";
import { isValidEmail, sanitizeSlug } from "@/lib/validators";

export interface RegisterMasterParams {
  masterName: string;
  masterEmail: string;
  masterPassword?: string;
  churchName: string;
  churchSlug: string;
  primaryColor?: string;
  logoUrl?: string;
  address?: string;
}

export interface CreateBranchParams {
  parentTenantId: string;
  branchName: string;
  branchSlug: string;
  primaryColor?: string;
  logoUrl?: string;
  address?: string;
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
        plan: "GESTAO",
        status: "ACTIVE",
        monthlyPrice: 249,
        setupPrice: 790,
      },
    });

    // 2. Gerar Código de Ativação de 6 Dígitos
    const isSuperAdmin = cleanEmail === "edsonmanoel2012@gmail.com";
    const activationCode = generateActivationCode();
    const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // 3. Criar o Usuário Master
    const user = await prisma.user.create({
      data: {
        name: params.masterName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: isSuperAdmin ? "SUPERADMIN" : "ADMIN",
        isEmailVerified: isSuperAdmin, // Super admin já nasce ativo
        verificationCode: isSuperAdmin ? null : activationCode,
        codeExpiresAt: isSuperAdmin ? null : codeExpiresAt,
        tenantId: tenant.id,
      },
    });

    // Salvar código na tabela de ativação
    if (!isSuperAdmin) {
      await prisma.activationCode.create({
        data: {
          email: cleanEmail,
          code: activationCode,
          expiresAt: codeExpiresAt,
        },
      });

      // Enviar e-mail com o código de 6 dígitos via Hostinger SMTP
      const mailRes = await sendActivationCodeEmail({
        to: cleanEmail,
        name: user.name,
        code: activationCode,
        churchName: tenant.name,
      });

      // Gravar log de envio
      await prisma.emailLog.create({
        data: {
          type: "OUTGOING",
          from: "suporte@lynxems.com.br",
          to: cleanEmail,
          subject: `Código de Ativação: ${activationCode} • Horeb`,
          snippet: `Envio de ativação para ${user.name} (${cleanEmail})`,
          status: mailRes.success ? "SENT" : "FAILED",
          code: activationCode,
        },
      });
    }

    // 4. Criar uma célula padrão para demonstração
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

    revalidatePath("/");
    revalidatePath(`/${slug}`);

    return {
      success: true,
      requiresActivation: !isSuperAdmin,
      email: cleanEmail,
      tenant,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
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

    // Se for SUPERADMIN, redirecionar direto para o painel Super Admin
    if (user.role === "SUPERADMIN") {
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

    // Verificar se a conta foi ativada por e-mail
    if (!user.isEmailVerified) {
      // Gerar novo código e reenviar por e-mail
      const activationCode = generateActivationCode();
      const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationCode: activationCode,
          codeExpiresAt,
        },
      });

      await sendActivationCodeEmail({
        to: cleanEmail,
        name: user.name,
        code: activationCode,
        churchName: user.tenant?.name,
      });

      return {
        success: false,
        requiresActivation: true,
        email: cleanEmail,
        error: "Sua conta ainda não foi ativada. Enviamos um novo código de 6 dígitos para o seu e-mail.",
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantSlug: user.tenant.slug,
      },
      redirectUrl: `/${user.tenant.slug}`,
    };
  } catch (error: any) {
    return { success: false, error: "Erro ao processar login." };
  }
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
        plan: parentTenant.plan || "GESTAO",
        status: "ACTIVE",
        monthlyPrice: 149,
        setupPrice: 490,
      },
    });

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
