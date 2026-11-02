"use server";

import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface GeneratePixParams {
  tenantId?: string;
  slug?: string;
  amount: number;
  category?: string;
  description?: string;
}

export interface GeneratePixResponse {
  success: boolean;
  transactionId: string;
  pixCopiaECola: string;
  amount: number;
  churchName?: string;
  memberName?: string;
  pixKey?: string;
  pixKeyType?: string;
  error?: string;
}

/**
 * Formata um campo TLV (Tag-Length-Value) no padrão EMVCo / BACEN BRCode
 */
function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/**
 * Remove acentos e caracteres especiais para o padrão EMV do Banco Central
 */
function sanitizeEmvText(text: string, maxLength: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

/**
 * Normaliza a chave PIX conforme o tipo exigido pelo DICT / Banco Central
 */
function normalizePixKey(rawKey: string, keyType?: string | null): string {
  const trimmed = rawKey.trim();
  const type = (keyType || "CNPJ").toUpperCase();

  if (type === "CNPJ" || type === "CPF") {
    return trimmed.replace(/\D/g, "");
  }
  if (type === "TELEFONE") {
    const digits = trimmed.replace(/\D/g, "");
    if (trimmed.startsWith("+")) return `+${digits}`;
    return digits.startsWith("55") && digits.length >= 12 ? `+${digits}` : `+55${digits}`;
  }
  if (type === "EMAIL") {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

/**
 * Calcula o checksum CRC16-CCITT (0xFFFF, polinômio 0x1021) exigido pelo Banco Central
 */
function computeCRC16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Monta o payload oficial PIX Copia e Cola (BRCode EMVCo Banco Central)
 * Direto para a conta da igreja (sem intermediários / não passa pelo Asaas)
 */
function buildRealPixPayload(params: {
  pixKey: string;
  pixKeyType?: string | null;
  merchantName: string;
  merchantCity?: string | null;
  amount: number;
  txId?: string;
}): string {
  const normalizedKey = normalizePixKey(params.pixKey, params.pixKeyType);
  const gui = formatEmvField("00", "br.gov.bcb.pix");
  const keyField = formatEmvField("01", normalizedKey);
  const merchantAccountInfo = formatEmvField("26", `${gui}${keyField}`);

  const merchantCategoryCode = formatEmvField("52", "0000");
  const transactionCurrency = formatEmvField("53", "986");
  const transactionAmount = formatEmvField("54", Number(params.amount).toFixed(2));
  const countryCode = formatEmvField("58", "BR");
  const merchantName = formatEmvField(
    "59",
    sanitizeEmvText(params.merchantName || "IGREJA", 25) || "IGREJA"
  );
  const merchantCity = formatEmvField(
    "60",
    sanitizeEmvText(params.merchantCity || "BRASIL", 15) || "BRASIL"
  );

  const cleanTxId =
    (params.txId || "***").replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";
  const additionalDataField = formatEmvField("62", formatEmvField("05", cleanTxId));

  const payloadWithoutCrc =
    formatEmvField("00", "01") +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantName +
    merchantCity +
    additionalDataField +
    "6304";

  const crc = computeCRC16(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}

export async function generatePixTransaction({
  tenantId,
  slug,
  amount,
  category = "DIZIMO",
  description,
}: GeneratePixParams): Promise<GeneratePixResponse> {
  try {
    if (amount <= 0) {
      throw new Error("O valor da contribuição deve ser maior que zero.");
    }

    // 1. Buscar informações do Tenant (Igreja) e Sessão do Membro Logado (se houver)
    const session = await getSession();
    let tenant = null;
    if (slug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          pixKey: true,
          pixKeyType: true,
        },
      });
    } else if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          pixKey: true,
          pixKeyType: true,
        },
      });
    }

    if (!tenant) {
      throw new Error("Congregação não encontrada para geração da contribuição.");
    }

    // 2. Bloquear geração de PIX caso o usuário Master / Pr. ainda não tenha cadastrado a Chave PIX oficial da igreja
    const cleanPixKey = tenant.pixKey?.trim() || "";
    if (!cleanPixKey) {
      return {
        success: false,
        transactionId: "",
        pixCopiaECola: "",
        amount: 0,
        error:
          "O PIX desta igreja está temporariamente desativado. O Pr. / Administrador Master precisa cadastrar a Chave PIX oficial da igreja nas Configurações.",
      };
    }

    const resolvedTenantId = tenant.id;
    const churchName = tenant.name;
    const memberId = session?.userId || null;
    const memberName = session?.name || undefined;

    const categoryLabel =
      category === "DIZIMO"
        ? "Dízimo"
        : category === "MISSOES"
          ? "Oferta de Missões"
          : "Oferta Voluntária";

    const autoDescription =
      description?.trim() ||
      (memberName
        ? `${categoryLabel} via App PIX • ${memberName}`
        : `${categoryLabel} via App PIX (Anônimo)`);

    // 3. Salvar no Prisma já integrado ao Financeiro da Igreja (status 'COMPLETED') e vínculo nominal do membro logado
    const transaction = await prisma.transaction.create({
      data: {
        tenantId: resolvedTenantId,
        amount: Number(amount),
        category,
        description: autoDescription,
        type: "INCOME",
        paymentMethod: "PIX",
        status: "COMPLETED",
        memberId,
      },
    });

    // 4. Gravar de forma assíncrona no Supabase na VPS (se conectado)
    try {
      await supabase.from("transactions").insert({
        tenant_id: resolvedTenantId,
        amount: Number(amount),
        category,
        description: autoDescription,
        type: "INCOME",
        paymentMethod: "PIX",
        status: "COMPLETED",
        member_id: memberId,
      });
    } catch (sbErr) {
      console.warn("Supabase transaction log error (fallback ignored):", sbErr);
    }

    try {
      revalidatePath(`/${tenant.slug}/admin/finance`);
      revalidatePath(`/${tenant.slug}`);
    } catch {}

    // 5. Gerar payload EMV padrão oficial do Banco Central (BRCode com CRC16) direto para a chave PIX da igreja
    const pixCopiaECola = buildRealPixPayload({
      pixKey: cleanPixKey,
      pixKeyType: tenant.pixKeyType || "CNPJ",
      merchantName: churchName,
      merchantCity: tenant.city || "BRASIL",
      amount: Number(amount),
      txId: `HOREB${transaction.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15).toUpperCase()}`,
    });

    return {
      success: true,
      transactionId: transaction.id,
      pixCopiaECola,
      amount: Number(amount),
      churchName,
      memberName,
      pixKey: cleanPixKey,
      pixKeyType: tenant.pixKeyType || "CNPJ",
    };
  } catch (error: any) {
    console.error("Erro ao gerar transação PIX:", error);
    return {
      success: false,
      transactionId: "",
      pixCopiaECola: "",
      amount: 0,
      error: error.message || "Falha ao gerar o código PIX.",
    };
  }
}

/**
 * Permite que o membro informe na tela de doação que já realizou a transferência PIX no seu banco,
 * atualizando a descrição para facilitar a conferência imediata da Tesouraria da igreja.
 */
export async function notifyPixPaymentDone(transactionId: string, slug?: string) {
  try {
    if (!transactionId) {
      return { success: false, error: "Transação não informada." };
    }

    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { id: true, description: true, status: true, tenant: { select: { slug: true } } },
    });

    if (!tx) {
      return { success: false, error: "Registro de contribuição não encontrado." };
    }

    const currentDesc = tx.description || "Contribuição via App PIX";
    const updatedDesc = currentDesc.includes("[Pago pelo Membro]")
      ? currentDesc
      : `${currentDesc} • [Pago pelo Membro - Aguardando Conferência]`;

    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        description: updatedDesc,
      },
    });

    const targetSlug = slug || tx.tenant?.slug;
    if (targetSlug) {
      try {
        revalidatePath(`/${targetSlug}/admin/finance`);
      } catch {}
    }

    return {
      success: true,
      message: "Comunicação de pagamento enviada à Tesouraria da igreja!",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro ao registrar confirmação.",
    };
  }
}

export async function getChurchPixConfig(slug: string) {
  try {
    const [tenant, session] = await Promise.all([
      prisma.tenant.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          primaryColor: true,
          pixKey: true,
          pixKeyType: true,
          pixPresetValues: true,
        },
      }),
      getSession(),
    ]);

    if (!tenant) return { success: false, error: "Igreja não encontrada." };

    const canConfigurePix =
      !!session &&
      (session.role === "SUPERADMIN" ||
        ((session.role === "ADMIN" || session.role === "PASTOR") &&
          session.tenantId === tenant.id));

    return {
      success: true,
      tenant,
      canConfigurePix,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
