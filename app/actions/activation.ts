"use server";

import { prisma } from "@/lib/prisma";
import { generateActivationCode, sendActivationCodeEmail } from "@/lib/mail";
import { createSession } from "@/lib/session";

interface VerifyCodeParams {
  email: string;
  code: string;
}

export async function verifyActivationCode({ email, code }: VerifyCodeParams) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail || !cleanCode) {
      return { success: false, error: "Informe seu e-mail e o código de 6 dígitos." };
    }

    // 1. Buscar o usuário
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { tenant: true },
    });

    if (!user) {
      return { success: false, error: "Usuário não encontrado. Realize o cadastro novamente." };
    }

    // Se já está verificado
    if (user.isEmailVerified) {
      return {
        success: true,
        message: "Sua conta já está ativada!",
        redirectUrl: user.role === "SUPERADMIN" ? "/admin" : `/${user.tenant.slug}`,
      };
    }

    // 2. Verificar o código no modelo User ou ActivationCode
    let isValid = false;

    if (user.verificationCode && user.verificationCode === cleanCode) {
      if (user.codeExpiresAt && user.codeExpiresAt > new Date()) {
        isValid = true;
      }
    }

    // Fallback: verificar tabela ActivationCode
    if (!isValid) {
      const activation = await prisma.activationCode.findFirst({
        where: {
          email: cleanEmail,
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
      return {
        success: false,
        error: "Código de ativação inválido ou expirado. Clique em 'Reenviar Código'.",
      };
    }

    // 3. Ativar o usuário
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    // Registrar no log
    await prisma.emailLog.create({
      data: {
        type: "INCOMING",
        from: cleanEmail,
        to: "suporte@lynxems.com.br",
        subject: "Conta Ativada com Sucesso",
        snippet: `O usuário ${user.name} (${user.email}) ativou sua conta com sucesso.`,
        status: "DELIVERED",
        code: cleanCode,
      },
    });

    const redirectUrl =
      user.role === "SUPERADMIN"
        ? "/admin"
        : `/${user.tenant.slug}`;

    // Iniciar sessão HTTP-Only após validação do código
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
    });

    return {
      success: true,
      message: "Conta ativada com sucesso! Bem-vindo ao Horeb.",
      redirectUrl,
      role: user.role,
    };
  } catch (error: any) {
    console.error("Erro ao verificar código de ativação:", error);
    return { success: false, error: "Erro interno ao validar o código." };
  }
}

export async function resendActivationCode(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { tenant: true },
    });

    if (!user) {
      return { success: false, error: "E-mail não encontrado no sistema." };
    }

    if (user.isEmailVerified) {
      return { success: true, message: "Sua conta já está ativada!" };
    }

    // Gerar novo código de 6 dígitos
    const code = generateActivationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: code,
        codeExpiresAt: expiresAt,
      },
    });

    await prisma.activationCode.create({
      data: {
        email: cleanEmail,
        code,
        expiresAt,
      },
    });

    // Enviar e-mail
    const emailRes = await sendActivationCodeEmail({
      to: cleanEmail,
      name: user.name,
      code,
      churchName: user.tenant.name,
      churchSlug: user.tenant.slug,
      primaryColor: user.tenant.primaryColor,
      logoUrl: user.tenant.logoUrl || undefined,
    });

    // Gravar log de saída
    await prisma.emailLog.create({
      data: {
        type: "OUTGOING",
        from: "suporte@lynxems.com.br",
        to: cleanEmail,
        subject: `Código de Ativação: ${code} • Horeb`,
        snippet: `Reenvio de código de ativação para ${user.name}`,
        status: emailRes.success ? "SENT" : "FAILED",
        code,
      },
    });

    if (!emailRes.success) {
      return {
        success: false,
        error: "Falha ao enviar e-mail. Verifique o endereço ou tente novamente.",
      };
    }

    return {
      success: true,
      message: `Novo código enviado com sucesso para ${cleanEmail}!`,
    };
  } catch (error: any) {
    console.error("Erro ao reenviar código:", error);
    return { success: false, error: "Erro interno ao reenviar código." };
  }
}
