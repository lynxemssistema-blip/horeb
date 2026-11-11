"use server";

import { prisma } from "@/lib/prisma";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { generateActivationCode, sendActivationCodeEmail, sendPasswordResetEmail } from "@/lib/mail";
import { isValidEmail, sanitizeSlug } from "@/lib/validators";
import { createSession, destroySession, getSession, checkChurchAccess } from "@/lib/session";
import { isFeatureAllowedForPlan } from "@/lib/plans";
import { getOrCreateAsaasCustomer, syncUserToAsaasHoreb } from "@/lib/asaas";

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

    // 1. Criar a Igreja Matriz no Banco com 30 dias de degustação gratuita (sem custo e sem dados de cobrança)
    const trialDays = 30;
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDays);

    const tenant = await prisma.tenant.create({
      data: {
        name: params.churchName,
        slug,
        primaryColor,
        logoUrl: params.logoUrl || null,
        pastorName: params.pastorName || params.masterName?.trim() || null,
        phone: params.phone?.trim() || null,
        address: params.address?.trim() || null,
        plan: "PREMIUM", // Horeb Prime por padrão
        status: "TRIAL", // 30 dias de uso gratuito com todos os recursos liberados
        monthlyPrice: 399,
        setupPrice: 1290,
        asaasGroupId: params.churchName, // Grupo da Igreja no Asaas
        subscriptionExpiresAt: trialExpiresAt,
      },
    });

    // 2. Criar o Usuário Master da Igreja (usa lista de SUPERADMIN_EMAILS do ambiente, sem hardcode no código)
    const allowedSuperAdmins = (process.env.SUPERADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isSuperAdmin = allowedSuperAdmins.includes(cleanEmail);

    const user = await prisma.user.create({
      data: {
        name: params.masterName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: isSuperAdmin ? "SUPERADMIN" : "ADMIN",
        isEmailVerified: true, // Já nasce ativo para entrar direto na sua igreja
        verificationCode: null,
        codeExpiresAt: null,
        themePreference: "dark",
        themePalette: "prime", // Padrão Horeb Prime
        tenantId: tenant.id,
      },
    });

    // 3. Integração Automática OBRIGATÓRIA com Asaas: Cadastra Usuário no Grupo 'Horeb'
    try {
      const asaasRes = await syncUserToAsaasHoreb({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: params.phone,
        tenantName: tenant.name,
      });

      if (asaasRes.success && asaasRes.customerId) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            asaasCustomerId: asaasRes.customerId,
            asaasGroupId: "Horeb",
          },
        });
      }
    } catch (asaasErr) {
      console.warn("Aviso na integração inicial Asaas da nova igreja:", asaasErr);
    }

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

    // 5. Cadastrar no Supabase Auth & Banco na VPS apenas se explicitamente configurado
    if (isSupabaseConfigured) {
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
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        primaryColor: tenant.primaryColor,
        logoUrl: tenant.logoUrl,
        plan: tenant.plan,
        status: tenant.status,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantSlug: tenant.slug,
      },
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

// Proteção contra Brute-Force no Login (janela de 15 minutos, bloqueio após 5 falhas consecutivas)
const loginRateLimitMap = new Map<
  string,
  { failures: number; lockedUntil: number; lastAttemptAt: number }
>();
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos

const DEFAULT_SUPERADMIN_BCRYPT_HASH =
  "$2b$10$cHivWfrCv7vM5NI0VC7HDO6jMQLSaixB7RGDjKohQFUO1dsfPz5z2";

async function ensureCorePlatformSeeded() {
  try {
    // 1. Garante a existência da congregação inicial (Igreja Marcos)
    const existingMarcos = await prisma.tenant.findUnique({
      where: { slug: "marcos" },
      select: { id: true },
    });
    if (!existingMarcos) {
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);
      await prisma.tenant
        .create({
          data: {
            id: "cmvzm4mo40000grnggkomw7j0",
            name: "Igreja Marcos",
            slug: "marcos",
            primaryColor: "#d97706",
            pastorName: "Pr. Marcos",
            plan: "PREMIUM",
            status: "TRIAL",
            monthlyPrice: 399,
            setupPrice: 1290,
            subscriptionExpiresAt: trialExpiresAt,
          },
        })
        .catch(() => {});
    }

    // 2. Garante a existência do SuperAdmin principal (usando apenas hash bcrypt irreversível)
    const superEmail = "edsonmanoel2012@gmail.com";
    const existingSuper = await prisma.user.findUnique({
      where: { email: superEmail },
      select: { id: true, password: true, role: true },
    });

    if (!existingSuper) {
      await prisma.user
        .create({
          data: {
            id: "cmv6tvh2g0001grr0ec0igti0",
            name: "Edson Manoel",
            email: superEmail,
            password:
              process.env.SUPERADMIN_PASSWORD_HASH ||
              DEFAULT_SUPERADMIN_BCRYPT_HASH,
            role: "SUPERADMIN",
            isEmailVerified: true,
            themePreference: "dark",
            themePalette: "prime",
          },
        })
        .catch(() => {});
    } else if (!existingSuper.password || existingSuper.role !== "SUPERADMIN") {
      await prisma.user
        .update({
          where: { id: existingSuper.id },
          data: {
            role: "SUPERADMIN",
            password:
              existingSuper.password ||
              process.env.SUPERADMIN_PASSWORD_HASH ||
              DEFAULT_SUPERADMIN_BCRYPT_HASH,
            isEmailVerified: true,
          },
        })
        .catch(() => {});
    }
  } catch {}
}

// 2. Login de Usuário com E-mail ou Nome e Senha
export async function loginUser(identifier: string, rawPassword: string) {
  try {
    await ensureCorePlatformSeeded();
    const clean = identifier?.trim();
    if (!clean) {
      return {
        success: false,
        error: "Informe seu e-mail ou nome de usuário.",
      };
    }

    if (!rawPassword) {
      return { success: false, error: "Informe sua senha." };
    }

    const cleanLower = clean.toLowerCase();
    const now = Date.now();

    // Verifica bloqueio temporário por força bruta
    const rateRecord = loginRateLimitMap.get(cleanLower);
    if (rateRecord && rateRecord.lockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (rateRecord.lockedUntil - now) / 60000
      );
      return {
        success: false,
        error: `Muitas tentativas incorretas. Conta protegida temporariamente — aguarde ${remainingMinutes} min ou redefina sua senha.`,
      };
    }

    // Busca usuário apenas por correspondência EXATA de e-mail ou nome (impede colisão por substring 'contains')
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanLower }, { name: { equals: clean } }],
      },
      include: { tenant: true },
    });

    if (!user || !user.password) {
      const prev =
        rateRecord && now - rateRecord.lastAttemptAt < LOGIN_LOCKOUT_MS
          ? rateRecord.failures
          : 0;
      const failures = prev + 1;
      loginRateLimitMap.set(cleanLower, {
        failures,
        lastAttemptAt: now,
        lockedUntil:
          failures >= LOGIN_MAX_FAILURES ? now + LOGIN_LOCKOUT_MS : 0,
      });
      return { success: false, error: "E-mail/usuário ou senha incorretos." };
    }

    const passwordMatches = await bcrypt.compare(rawPassword, user.password);

    if (!passwordMatches) {
      const prev =
        rateRecord && now - rateRecord.lastAttemptAt < LOGIN_LOCKOUT_MS
          ? rateRecord.failures
          : 0;
      const failures = prev + 1;
      loginRateLimitMap.set(cleanLower, {
        failures,
        lastAttemptAt: now,
        lockedUntil:
          failures >= LOGIN_MAX_FAILURES ? now + LOGIN_LOCKOUT_MS : 0,
      });
      return { success: false, error: "E-mail/usuário ou senha incorretos." };
    }

    // Limpa contador de falhas após autenticação legítima
    loginRateLimitMap.delete(cleanLower);


    // Garante obrigatoriamente que qualquer usuário autenticado esteja registrado no Asaas Grupo 'Horeb'
    if (!user.asaasCustomerId) {
      try {
        await syncUserToAsaasHoreb({
          id: user.id,
          name: user.name,
          email: user.email,
        });
      } catch (err) {
        console.warn("[Asaas Auto-Sync Login]:", err);
      }
    }

    // Se for SUPERADMIN, criar sessão e redirecionar direto para o painel Super Admin
    if (user.role === "SUPERADMIN") {
      await createSession({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: "SUPERADMIN",
        tenantId: user.tenantId || null,
        tenantSlug: user.tenant?.slug || "admin",
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "SUPERADMIN",
          tenantSlug: user.tenant?.slug || "admin",
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
        tenantId: user.tenantId || null,
        tenantSlug: user.tenant?.slug || "",
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantSlug: user.tenant?.slug || "",
        },
        redirectUrl: `/select-church`,
      };
    }

    // Se só tem 1 igreja (ou nenhuma no access, o que é estranho, mas usamos a base)
    const targetTenantSlug = accesses.length === 1 ? accesses[0].tenant.slug : (user.tenant?.slug || "");
    const targetTenantId = accesses.length === 1 ? accesses[0].tenantId : (user.tenantId || "");
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

// Alternar congregação ativa na sessão (Acesso Multi-Igrejas e Super Admin)
export async function switchChurchAction(targetSlug: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Não autenticado." };
    }

    const access = await checkChurchAccess(targetSlug);
    if (!access.authorized) {
      return { success: false, error: "Você não possui autorização para acessar esta congregação." };
    }

    await createSession({
      userId: session.userId,
      email: session.email,
      name: session.name,
      avatarUrl: session.avatarUrl || null,
      role: access.effectiveRole,
      tenantId: access.targetTenantId,
      tenantSlug: access.targetTenantSlug,
    });

    revalidatePath("/");
    revalidatePath(`/${targetSlug}`);

    return { success: true, redirectUrl: `/${targetSlug}` };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao alternar congregação." };
  }
}

// Obter Usuário da Sessão Atual
export async function getCurrentSessionUser() {
  return await getSession();
}

// 3. Cria uma Filial vinculada à Matriz
export async function createBranchChurch(params: CreateBranchParams) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login para criar congregações filiais." };
    }

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

    const access = await checkChurchAccess(parentTenant.slug);
    const isSuper = session.role === "SUPERADMIN" || session.originalRole === "SUPERADMIN";
    if (
      !isSuper &&
      (!access.authorized || !["ADMIN", "PASTOR", "SUPERADMIN"].includes(access.effectiveRole))
    ) {
      return {
        success: false,
        error: "Acesso negado: apenas Administradores ou Prs. da Igreja Matriz podem cadastrar filiais.",
      };
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
        plan: parentTenant.plan || "PREMIUM",
        status: "ACTIVE",
        monthlyPrice: 199,
        setupPrice: 490,
        asaasGroupId: params.branchName,
      },
    });

    // Sincronizar grupo da congregação filial no Asaas ('horeb')
    try {
      const session = await getSession();
      if (session?.email) {
        await getOrCreateAsaasCustomer({
          name: session.name,
          email: session.email,
          phone: params.phone,
          groupName: "horeb",
          externalReference: `USER_${session.userId}`,
        });
      }
    } catch (asaasBranchErr) {
      console.warn("Aviso na integração Asaas da congregação filial:", asaasBranchErr);
    }

    // Vincular o usuário da sessão como ADMIN também desta filial
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

    if (isSupabaseConfigured) {
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

const resetFailedAttempts = new Map<
  string,
  { count: number; lastAttemptAt: number }
>();
const resetRequestCooldownMap = new Map<
  string,
  { requests: number; windowStart: number; lastSentAt: number }
>();
const MAX_RESET_ATTEMPTS = 5;
const RESET_COOLDOWN_MS = 60 * 1000; // 60s mínimo entre disparos de e-mail
const RESET_WINDOW_MS = 15 * 60 * 1000; // Janela de 15 min
const MAX_RESET_REQUESTS_PER_WINDOW = 3;

// 4. Solicitar Recuperação de Senha (Esqueci minha senha)
export async function requestPasswordReset(identifier: string) {
  try {
    const clean = identifier?.trim();
    if (!clean || clean.length < 3) {
      return {
        success: false,
        error: "Informe seu e-mail completo ou nome de usuário cadastrado.",
      };
    }

    const cleanLower = clean.toLowerCase();
    const now = Date.now();

    // Rate limiting contra abuso de disparo de e-mails (Email Bombing) e bypass de contador OTP
    const cooldownRec = resetRequestCooldownMap.get(cleanLower);
    if (cooldownRec) {
      if (now - cooldownRec.lastSentAt < RESET_COOLDOWN_MS) {
        return {
          success: false,
          error:
            "Aguarde 60 segundos antes de solicitar um novo código de recuperação.",
        };
      }
      if (
        now - cooldownRec.windowStart < RESET_WINDOW_MS &&
        cooldownRec.requests >= MAX_RESET_REQUESTS_PER_WINDOW
      ) {
        return {
          success: false,
          error:
            "Limite de solicitações de recuperação atingido. Aguarde 15 minutos e tente novamente.",
        };
      }
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanLower }, { name: { equals: clean } }],
      },
      include: { tenant: true },
    });

    if (!user || !user.email) {
      return {
        success: false,
        error: "Nenhuma conta encontrada com este e-mail ou nome de usuário.",
      };
    }

    const targetEmail = user.email.toLowerCase();
    const prevWindow = resetRequestCooldownMap.get(targetEmail);
    const isSameWindow =
      prevWindow && now - prevWindow.windowStart < RESET_WINDOW_MS;
    resetRequestCooldownMap.set(targetEmail, {
      requests: isSameWindow ? prevWindow.requests + 1 : 1,
      windowStart: isSameWindow ? prevWindow.windowStart : now,
      lastSentAt: now,
    });
    resetRequestCooldownMap.set(cleanLower, {
      requests: isSameWindow ? prevWindow.requests + 1 : 1,
      windowStart: isSameWindow ? prevWindow.windowStart : now,
      lastSentAt: now,
    });

    const code = generateActivationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    resetFailedAttempts.delete(targetEmail);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: code,
        codeExpiresAt: expiresAt,
      },
    });

    await prisma.activationCode.create({
      data: {
        email: user.email.toLowerCase(),
        code,
        expiresAt,
      },
    });

    const mailRes = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      code,
      churchName: user.tenant?.name || "Horeb",
      churchSlug: user.tenant?.slug,
      primaryColor: user.tenant?.primaryColor || "#f59e0b",
      logoUrl: user.tenant?.logoUrl,
    });

    // Registrar no log de e-mails
    try {
      await prisma.emailLog.create({
        data: {
          type: "OUTGOING",
          from: "suporte@lynxems.com.br",
          to: user.email,
          subject: `${code} é seu código para redefinir sua senha no Horeb`,
          snippet: `Solicitação de recuperação de senha para ${user.name} (${user.email}).`,
          status: mailRes.success ? "SENT" : "FAILED",
          code,
        },
      });
    } catch {}

    // Mascarar e-mail para exibição segura caso o usuário tenha digitado apenas o nome
    const [localPart, domainPart] = user.email.split("@");
    const maskedEmail =
      localPart && domainPart
        ? `${localPart.slice(0, 2)}${"*".repeat(Math.max(2, localPart.length - 2))}@${domainPart}`
        : user.email;

    return {
      success: true,
      email: clean.includes("@") ? cleanLower : clean,
      maskedEmail,
      message: `Enviamos um código de 6 dígitos para ${maskedEmail}.`,
    };
  } catch (error: any) {
    console.error("Erro ao solicitar recuperação de senha:", error);
    return {
      success: false,
      error: "Não foi possível enviar o código de recuperação. Tente novamente.",
    };
  }
}

// 5. Confirmar Código de Recuperação e Definir Nova Senha
export async function resetPasswordWithCode(params: {
  email: string;
  code: string;
  newPassword: string;
}) {
  try {
    const rawIdentifier = params.email?.trim();
    const cleanEmail = rawIdentifier?.toLowerCase();
    const cleanCode = params.code?.trim();
    const rawPassword = params.newPassword?.trim();

    if (!cleanEmail || !cleanCode) {
      return { success: false, error: "Informe o código de 6 dígitos enviado para seu e-mail." };
    }

    if (!rawPassword || rawPassword.length < 6) {
      return { success: false, error: "A nova senha deve ter no mínimo 6 caracteres." };
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { name: { equals: rawIdentifier } }],
      },
      include: { tenant: true },
    });

    if (!user) {
      return { success: false, error: "Conta não encontrada." };
    }

    const userEmailLower = user.email.toLowerCase();
    const attemptRecord = resetFailedAttempts.get(userEmailLower) || { count: 0, lastAttemptAt: Date.now() };
    if (attemptRecord.count >= MAX_RESET_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationCode: null, codeExpiresAt: null },
      });
      await prisma.activationCode.updateMany({
        where: { email: userEmailLower, used: false },
        data: { used: true },
      });
      return {
        success: false,
        error: "Limite de tentativas excedido por segurança. Solicite um novo código de recuperação.",
      };
    }

    let isValid = false;
    if (user.verificationCode && user.verificationCode === cleanCode) {
      if (!user.codeExpiresAt || user.codeExpiresAt > new Date()) {
        isValid = true;
      }
    }

    if (!isValid) {
      const activation = await prisma.activationCode.findFirst({
        where: {
          email: userEmailLower,
          code: cleanCode,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (activation) {
        isValid = true;
        await prisma.activationCode.update({
          where: { id: activation.id },
          data: { used: true },
        });
      }
    }

    if (!isValid) {
      const nextCount = attemptRecord.count + 1;
      resetFailedAttempts.set(userEmailLower, { count: nextCount, lastAttemptAt: Date.now() });
      if (nextCount >= MAX_RESET_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: { verificationCode: null, codeExpiresAt: null },
        });
        await prisma.activationCode.updateMany({
          where: { email: userEmailLower, used: false },
          data: { used: true },
        });
        return {
          success: false,
          error: "Código invalidado após múltiplas tentativas incorretas. Solicite um novo código.",
        };
      }
      return {
        success: false,
        error: "Código inválido ou expirado. Solicite um novo código.",
      };
    }

    resetFailedAttempts.delete(userEmailLower);

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isEmailVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    // Autenticar automaticamente o usuário após redefinir a senha
    const accesses = await prisma.userChurchAccess.findMany({
      where: { userId: user.id },
      include: { tenant: true },
    });

    const targetTenantSlug =
      user.role === "SUPERADMIN"
        ? "admin"
        : accesses.length === 1
        ? accesses[0].tenant.slug
        : user.tenant?.slug || "";
    const targetTenantId =
      accesses.length === 1 ? accesses[0].tenantId : user.tenantId || "";
    const targetRole =
      user.role === "SUPERADMIN"
        ? "SUPERADMIN"
        : accesses.length === 1
        ? accesses[0].role
        : user.role;

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: (user as any).avatarUrl || null,
      role: targetRole,
      tenantId: targetTenantId,
      tenantSlug: targetTenantSlug || "admin",
    });

    const redirectUrl =
      user.role === "SUPERADMIN"
        ? "/admin"
        : accesses.length > 1
        ? "/select-church"
        : `/${targetTenantSlug}`;

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: targetRole,
        tenantSlug: targetTenantSlug,
      },
      redirectUrl,
    };
  } catch (error: any) {
    console.error("Erro ao redefinir senha:", error);
    return {
      success: false,
      error: "Erro ao atualizar sua senha. Tente novamente.",
    };
  }
}
