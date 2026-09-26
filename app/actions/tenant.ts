"use server";

import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

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

import { isValidEmail, sanitizeSlug } from "@/lib/validators";

// 3. Cadastra o Usuário Master com Login, Senha e Igreja Sede
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
      },
    });

    // 2. Criar o Usuário Master como ADMIN com Senha Criptografada
    const user = await prisma.user.create({
      data: {
        name: params.masterName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: "ADMIN",
        tenantId: tenant.id,
      },
    });

    // 3. Criar uma célula padrão para demonstração
    await prisma.cellGroup.create({
      data: {
        name: "Célula Principal (Sede)",
        leaderId: user.id,
        tenantId: tenant.id,
      },
    });

    // 4. Cadastrar no Supabase Auth & Banco na VPS
    try {
      // Criar no Auth da VPS
      await supabase.auth.signUp({
        email: cleanEmail,
        password: rawPassword,
        options: {
          data: {
            name: user.name,
            role: "ADMIN",
            tenant_id: tenant.id,
          },
        },
      });

      // Salvar tabela pública tenants
      await supabase.from("tenants").insert({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        primary_color: tenant.primaryColor,
        logo_url: tenant.logoUrl,
        address: params.address || "Sede Principal",
      });

      // Salvar tabela pública users
      await supabase.from("users").insert({
        id: user.id,
        tenant_id: tenant.id,
        name: user.name,
        email: user.email,
        role: "ADMIN",
      });
    } catch (sbErr) {
      console.warn("Supabase auth sync warning (fallback local active):", sbErr);
    }

    revalidatePath("/");
    revalidatePath(`/${slug}`);

    return {
      success: true,
      tenant,
      user: { id: user.id, name: user.name, email: user.email },
      redirectUrl: `/${slug}`,
    };
  } catch (error: any) {
    console.error("Erro no cadastro Master:", error);
    return {
      success: false,
      error: error.message || "Erro ao processar o cadastro da igreja.",
    };
  }
}

// 4. Login de Usuário com E-mail e Senha
export async function loginUser(email: string, rawPassword: string) {
  try {
    const cleanEmail = email?.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return { success: false, error: "Informe um e-mail válido." };
    }

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

// 5. Cria uma Filial vinculada à Matriz
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
      return { success: false, error: "Igreja Matriz não encontrada." };
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
