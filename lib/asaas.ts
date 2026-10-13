/**
 * Cliente de Integração com a API v3 do Asaas para o Horeb Sistema Eclesiástico.
 * Suporta Sandbox e Produção para cobrança recorrente de assinaturas (PIX, Boleto e Cartão).
 */

export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  groups?: Array<{ name: string }>;
}

export interface AsaasCustomerGroup {
  id: string;
  name: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string;
  cycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
  description?: string;
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  value: number;
  netValue?: number;
  originalValue?: number;
  dueDate: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  status:
    | "PENDING"
    | "RECEIVED"
    | "CONFIRMED"
    | "OVERDUE"
    | "REFUNDED"
    | "RECEIVED_IN_CASH"
    | "REFUND_REQUESTED"
    | "CHARGEBACK_REQUESTED"
    | "CHARGEBACK_DISPUTE"
    | "AWAITING_CHARGEBACK_REVERSAL"
    | "DUNNING_REQUESTED"
    | "DUNNING_RECEIVED"
    | "AWAITING_RISK_ANALYSIS";
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  invoiceUrl?: string;
  bankSlipUrl?: string;
  invoiceNumber?: string;
  description?: string;
  deleted?: boolean;
}

export interface AsaasPixQrCode {
  encodedImage: string; // Base64 da imagem do QR Code
  payload: string;      // Código copia-e-cola do PIX
  expirationDate: string;
}

export function getAsaasConfig() {
  const apiKey = process.env.ASAAS_API_KEY || "";
  const env = (process.env.ASAAS_ENVIRONMENT || "sandbox").toLowerCase();
  const baseUrl =
    env === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

  return {
    apiKey,
    env,
    baseUrl,
    isConfigured: !!apiKey && apiKey.length > 5,
  };
}

function getHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    access_token: apiKey,
  };
}

/**
 * 1. Busca ou Cria Cliente no Asaas vinculado ao Grupo da Igreja (Church = Group, User = Customer)
 */
export async function getOrCreateAsaasCustomer(data: {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  groupName?: string;
  externalReference?: string;
}): Promise<{ success: boolean; customer?: AsaasCustomer; error?: string }> {
  const { apiKey, baseUrl, isConfigured } = getAsaasConfig();
  if (!isConfigured) {
    return { success: false, error: "Asaas API Key não configurada no .env" };
  }

  const cleanDoc = data.cpfCnpj ? data.cpfCnpj.replace(/\D/g, "") : "";
  const cleanEmail = data.email ? data.email.trim().toLowerCase() : "";
  const groupName = data.groupName?.trim();

  try {
    let existingCustomer: AsaasCustomer | null = null;

    // 1. Tenta buscar cliente já existente: primeiro por CPF/CNPJ (se informado), senão por e-mail
    if (cleanDoc && cleanDoc.length >= 11) {
      const searchUrl = `${baseUrl}/customers?cpfCnpj=${cleanDoc}`;
      const searchRes = await fetch(searchUrl, {
        method: "GET",
        headers: getHeaders(apiKey),
        cache: "no-store",
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          existingCustomer = searchData.data[0];
        }
      }
    }

    if (!existingCustomer && cleanEmail) {
      const searchEmailUrl = `${baseUrl}/customers?email=${encodeURIComponent(cleanEmail)}`;
      const searchEmailRes = await fetch(searchEmailUrl, {
        method: "GET",
        headers: getHeaders(apiKey),
        cache: "no-store",
      });

      if (searchEmailRes.ok) {
        const searchEmailData = await searchEmailRes.json();
        if (searchEmailData.data && searchEmailData.data.length > 0) {
          existingCustomer = searchEmailData.data[0];
        }
      }
    }

    // Se já existe, atualiza o grupo da igreja e referência se necessário
    if (existingCustomer) {
      if (groupName || data.externalReference) {
        try {
          const updateRes = await fetch(`${baseUrl}/customers/${existingCustomer.id}`, {
            method: "POST",
            headers: getHeaders(apiKey),
            body: JSON.stringify({
              groupName: groupName || undefined,
              externalReference: data.externalReference || existingCustomer.externalReference,
              mobilePhone: data.phone ? data.phone.replace(/\D/g, "") : existingCustomer.mobilePhone,
              cpfCnpj: cleanDoc && cleanDoc.length >= 11 ? cleanDoc : existingCustomer.cpfCnpj,
            }),
            cache: "no-store",
          });
          if (updateRes.ok) {
            const updated = await updateRes.json();
            return { success: true, customer: updated };
          }
        } catch (updErr) {
          console.warn("Aviso ao atualizar grupo do cliente no Asaas:", updErr);
        }
      }
      return { success: true, customer: existingCustomer };
    }

    // 2. Se não existir, cria um novo cliente vinculado ao Grupo da Igreja
    const createRes = await fetch(`${baseUrl}/customers`, {
      method: "POST",
      headers: getHeaders(apiKey),
      body: JSON.stringify({
        name: data.name.trim(),
        cpfCnpj: cleanDoc && cleanDoc.length >= 11 ? cleanDoc : undefined,
        email: cleanEmail,
        mobilePhone: data.phone ? data.phone.replace(/\D/g, "") : undefined,
        groupName: groupName || undefined,
        externalReference: data.externalReference,
        notificationDisabled: false,
      }),
      cache: "no-store",
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      const msg = createData?.errors?.[0]?.description || "Falha ao criar cliente no Asaas";
      return { success: false, error: msg };
    }

    return { success: true, customer: createData };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro de conexão com o Asaas" };
  }
}

/**
 * 2. Cria Assinatura Mensal Recorrente no Asaas
 */
export async function createAsaasSubscription(data: {
  customerId: string;
  value: number;
  nextDueDate: string; // Formato YYYY-MM-DD
  description: string;
  billingType?: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  cycle?: "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";
}): Promise<{ success: boolean; subscription?: AsaasSubscription; error?: string }> {
  const { apiKey, baseUrl, isConfigured } = getAsaasConfig();
  if (!isConfigured) {
    return { success: false, error: "Asaas API Key não configurada no .env" };
  }

  try {
    const res = await fetch(`${baseUrl}/subscriptions`, {
      method: "POST",
      headers: getHeaders(apiKey),
      body: JSON.stringify({
        customer: data.customerId,
        billingType: data.billingType || "UNDEFINED", // UNDEFINED permite o cliente pagar no PIX, Boleto ou Cartão
        value: data.value,
        nextDueDate: data.nextDueDate,
        cycle: data.cycle || "MONTHLY",
        description: data.description,
        maxPayments: null, // Sem limite de ciclos (renova até cancelamento)
      }),
      cache: "no-store",
    });

    const subData = await res.json();

    if (!res.ok) {
      const msg = subData?.errors?.[0]?.description || "Falha ao criar assinatura no Asaas";
      return { success: false, error: msg };
    }

    return { success: true, subscription: subData };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro de conexão ao criar assinatura" };
  }
}

/**
 * 3. Busca faturas geradas de uma assinatura
 */
export async function listAsaasSubscriptionPayments(
  subscriptionId: string
): Promise<{ success: boolean; payments?: AsaasPayment[]; error?: string }> {
  const { apiKey, baseUrl, isConfigured } = getAsaasConfig();
  if (!isConfigured) {
    return { success: false, error: "Asaas API Key não configurada" };
  }

  try {
    const res = await fetch(`${baseUrl}/subscriptions/${subscriptionId}/payments`, {
      method: "GET",
      headers: getHeaders(apiKey),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data?.errors?.[0]?.description || "Erro ao buscar faturas" };
    }

    return { success: true, payments: data.data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 4. Obtém o QR Code PIX e Copia-e-Cola de um pagamento
 */
export async function getAsaasPaymentPixQrCode(
  paymentId: string
): Promise<{ success: boolean; pix?: AsaasPixQrCode; error?: string }> {
  const { apiKey, baseUrl, isConfigured } = getAsaasConfig();
  if (!isConfigured) {
    return { success: false, error: "Asaas API Key não configurada" };
  }

  try {
    const res = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
      method: "GET",
      headers: getHeaders(apiKey),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data?.errors?.[0]?.description || "Erro ao obter PIX do Asaas" };
    }

    return {
      success: true,
      pix: {
        encodedImage: data.encodedImage,
        payload: data.payload,
        expirationDate: data.expirationDate,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 5. Cancela uma Assinatura no Asaas
 */
export async function cancelAsaasSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const { apiKey, baseUrl, isConfigured } = getAsaasConfig();
  if (!isConfigured) {
    return { success: false, error: "Asaas API Key não configurada" };
  }

  try {
    const res = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: getHeaders(apiKey),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data?.errors?.[0]?.description || "Erro ao cancelar assinatura" };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 6. Consulta status de uma cobrança específica
 */
export async function getAsaasPayment(
  paymentId: string
): Promise<{ success: boolean; payment?: AsaasPayment; error?: string }> {
  const { apiKey, baseUrl, isConfigured } = getAsaasConfig();
  if (!isConfigured) {
    return { success: false, error: "Asaas API Key não configurada" };
  }

  try {
    const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
      method: "GET",
      headers: getHeaders(apiKey),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data?.errors?.[0]?.description || "Erro ao buscar pagamento" };
    }

    return { success: true, payment: data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
