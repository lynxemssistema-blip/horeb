"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  getOrCreateAsaasCustomer,
  createAsaasPayment,
  getAsaasPaymentPixQrCode,
  uploadAsaasPaymentDocument,
  getAsaasPayment,
} from "@/lib/asaas";

async function requireSuperAdmin() {
  const session = await getSession();
  const isSuper = session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";
  if (!session || !isSuper) {
    throw new Error("Acesso negado: exclusivo para Super Administrador.");
  }
  return session;
}

/**
 * Converte pdfUrl (data:application/pdf;base64,... ou URL externa) em Buffer binário para envio ao Asaas
 */
async function resolvePdfBuffer(pdfUrl: string): Promise<Buffer | null> {
  try {
    if (!pdfUrl) return null;
    if (pdfUrl.startsWith("data:")) {
      const base64Part = pdfUrl.split(",")[1];
      if (!base64Part) return null;
      return Buffer.from(base64Part, "base64");
    }
    if (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://")) {
      const res = await fetch(pdfUrl, { cache: "no-store" });
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    }
    return null;
  } catch (err) {
    console.warn("[resolvePdfBuffer Warning]:", err);
    return null;
  }
}

/**
 * 1. Lista E-books ativos para a Vitrine da Página Inicial (sem expor o base64 pesado do PDF)
 */
export async function getPublicEbooks() {
  try {
    const ebooks = await prisma.ebookProduct.findMany({
      where: { active: true },
      select: {
        id: true,
        title: true,
        subtitle: true,
        author: true,
        description: true,
        price: true,
        originalPrice: true,
        coverUrl: true,
        pdfFileName: true,
        badge: true,
        pagesCount: true,
        category: true,
        featured: true,
        salesCount: true,
        createdAt: true,
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });

    return { success: true, ebooks };
  } catch (error: any) {
    console.error("Erro ao carregar vitrine de e-books:", error);
    return { success: false, ebooks: [], error: error.message };
  }
}

/**
 * 2. Lista todos os E-books e Pedidos para o Painel Super Admin
 */
export async function getAdminEbooksData() {
  try {
    await requireSuperAdmin();

    const [ebooks, orders] = await Promise.all([
      prisma.ebookProduct.findMany({
        select: {
          id: true,
          title: true,
          subtitle: true,
          author: true,
          description: true,
          price: true,
          originalPrice: true,
          coverUrl: true,
          pdfFileName: true,
          badge: true,
          pagesCount: true,
          category: true,
          active: true,
          featured: true,
          salesCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.ebookOrder.findMany({
        include: {
          ebook: {
            select: {
              id: true,
              title: true,
              pdfFileName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    return { success: true, ebooks, orders };
  } catch (error: any) {
    return { success: false, ebooks: [], orders: [], error: error.message };
  }
}

/**
 * 3. Cadastra ou Atualiza um E-book (Super Admin)
 */
export async function saveEbookProduct(data: {
  id?: string;
  title: string;
  subtitle?: string;
  author?: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  coverUrl?: string | null;
  pdfUrl?: string; // Opcional na edição se não quiser substituir o PDF existente
  pdfFileName?: string;
  badge?: string | null;
  pagesCount?: number | null;
  category?: string;
  active?: boolean;
  featured?: boolean;
}) {
  try {
    await requireSuperAdmin();

    if (!data.title?.trim()) {
      return { success: false, error: "Informe o título do E-book." };
    }
    if (!data.price || Number(data.price) < 5) {
      return {
        success: false,
        error: "O valor mínimo para cobrança no Asaas é R$ 5,00.",
      };
    }

    if (data.id) {
      const existing = await prisma.ebookProduct.findUnique({
        where: { id: data.id },
      });
      if (!existing) {
        return { success: false, error: "E-book não encontrado." };
      }

      const updated = await prisma.ebookProduct.update({
        where: { id: data.id },
        data: {
          title: data.title.trim(),
          subtitle: data.subtitle?.trim() || null,
          author: data.author?.trim() || "Edson Manoel",
          description: data.description.trim(),
          price: Number(data.price),
          originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
          coverUrl: data.coverUrl !== undefined ? data.coverUrl : existing.coverUrl,
          pdfUrl: data.pdfUrl ? data.pdfUrl : existing.pdfUrl,
          pdfFileName: data.pdfFileName?.trim() || existing.pdfFileName,
          badge: data.badge?.trim() || null,
          pagesCount: data.pagesCount ? Number(data.pagesCount) : null,
          category: data.category?.trim() || "LIDERANÇA & GESTÃO",
          active: data.active !== undefined ? data.active : existing.active,
          featured: data.featured !== undefined ? data.featured : existing.featured,
        },
        select: {
          id: true,
          title: true,
          subtitle: true,
          author: true,
          description: true,
          price: true,
          originalPrice: true,
          coverUrl: true,
          pdfFileName: true,
          badge: true,
          pagesCount: true,
          category: true,
          active: true,
          featured: true,
          salesCount: true,
          createdAt: true,
        },
      });

      revalidatePath("/");
      revalidatePath("/admin");
      return { success: true, ebook: updated };
    } else {
      if (!data.pdfUrl) {
        return {
          success: false,
          error: "Envie o arquivo PDF (ou link do PDF) do E-book para entrega automática no Asaas.",
        };
      }

      const created = await prisma.ebookProduct.create({
        data: {
          title: data.title.trim(),
          subtitle: data.subtitle?.trim() || null,
          author: data.author?.trim() || "Edson Manoel",
          description: data.description.trim(),
          price: Number(data.price),
          originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
          coverUrl: data.coverUrl || null,
          pdfUrl: data.pdfUrl,
          pdfFileName: data.pdfFileName?.trim() || "ebook-horeb.pdf",
          badge: data.badge?.trim() || "LANÇAMENTO",
          pagesCount: data.pagesCount ? Number(data.pagesCount) : null,
          category: data.category?.trim() || "LIDERANÇA & GESTÃO",
          active: data.active !== undefined ? data.active : true,
          featured: data.featured !== undefined ? data.featured : false,
        },
        select: {
          id: true,
          title: true,
          subtitle: true,
          author: true,
          description: true,
          price: true,
          originalPrice: true,
          coverUrl: true,
          pdfFileName: true,
          badge: true,
          pagesCount: true,
          category: true,
          active: true,
          featured: true,
          salesCount: true,
          createdAt: true,
        },
      });

      revalidatePath("/");
      revalidatePath("/admin");
      return { success: true, ebook: created };
    }
  } catch (error: any) {
    console.error("Erro ao salvar E-book:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 4. Exclui um E-book (Super Admin)
 */
export async function deleteEbookProduct(id: string) {
  try {
    await requireSuperAdmin();
    await prisma.ebookProduct.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 5. Compra de E-book pelo Cliente na Página Inicial (Integrado 100% ao Asaas + Entrega Automática do PDF)
 * - Cria/atualiza o cliente no Asaas no grupo "Horeb"
 * - Gera a cobrança no Asaas (PIX ou Cartão/Boleto)
 * - Anexa o arquivo PDF diretamente na cobrança do Asaas com `availableAfterPayment = true`
 *   para que o próprio Asaas libere e entregue o PDF ao cliente assim que o pagamento for confirmado!
 */
export async function purchaseEbookAction(params: {
  ebookId: string;
  buyerName: string;
  buyerEmail: string;
  buyerCpf: string;
  buyerPhone?: string;
  billingType?: "PIX" | "CREDIT_CARD" | "BOLETO" | "UNDEFINED";
}) {
  try {
    const cleanCpf = (params.buyerCpf || "").replace(/\D/g, "");
    if (!params.buyerName?.trim() || !params.buyerEmail?.trim() || cleanCpf.length < 11) {
      return {
        success: false,
        error: "Preencha Nome, E-mail e um CPF/CNPJ válido para emissão da cobrança e envio do E-book.",
      };
    }

    const ebook = await prisma.ebookProduct.findUnique({
      where: { id: params.ebookId },
    });

    if (!ebook || !ebook.active) {
      return { success: false, error: "Este E-book não está disponível no momento." };
    }

    // 1. Cadastrar ou recuperar comprador no Asaas dentro do grupo 'Horeb'
    const customerRes = await getOrCreateAsaasCustomer({
      name: params.buyerName.trim(),
      email: params.buyerEmail.trim().toLowerCase(),
      cpfCnpj: cleanCpf,
      phone: params.buyerPhone?.trim(),
      groupName: "Horeb",
      externalReference: `EBOOK_BUYER_${cleanCpf}`,
    });

    if (!customerRes.success || !customerRes.customer) {
      return {
        success: false,
        error: customerRes.error || "Não foi possível validar seus dados no Asaas.",
      };
    }

    // 2. Criar cobrança avulsa no Asaas
    const todayStr = new Date().toISOString().split("T")[0];
    const billingType = params.billingType || "PIX";

    const paymentRes = await createAsaasPayment({
      customerId: customerRes.customer.id,
      value: ebook.price,
      dueDate: todayStr,
      billingType,
      description: `E-book Digital: ${ebook.title} (Entrega imediata do PDF após confirmação)`,
      externalReference: `EBOOK_${ebook.id}`,
    });

    if (!paymentRes.success || !paymentRes.payment) {
      return {
        success: false,
        error: paymentRes.error || "Não foi possível gerar a cobrança no Asaas.",
      };
    }

    const payment = paymentRes.payment;

    // 3. Anexar o PDF do E-book diretamente na cobrança do Asaas com `availableAfterPayment = true`
    // Assim o próprio Asaas libera o download do PDF para o cliente na fatura e no e-mail de confirmação!
    let asaasDocumentId: string | null = null;
    const pdfBuffer = await resolvePdfBuffer(ebook.pdfUrl);
    if (pdfBuffer) {
      const safeFileName = ebook.pdfFileName?.endsWith(".pdf")
        ? ebook.pdfFileName
        : `${ebook.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

      const docUpload = await uploadAsaasPaymentDocument({
        paymentId: payment.id,
        fileBuffer: pdfBuffer,
        fileName: safeFileName,
        availableAfterPayment: true,
      });

      if (docUpload.success && docUpload.documentId) {
        asaasDocumentId = docUpload.documentId;
      }
    }

    // 4. Obter QR Code PIX imediato
    let pixQrCode: string | null = null;
    let pixQrCodeImage: string | null = null;
    const pixRes = await getAsaasPaymentPixQrCode(payment.id);
    if (pixRes.success && pixRes.pix) {
      pixQrCode = pixRes.pix.payload;
      pixQrCodeImage = pixRes.pix.encodedImage;
    }

    // 5. Registrar o pedido no banco de dados
    const order = await prisma.ebookOrder.create({
      data: {
        ebookId: ebook.id,
        buyerName: params.buyerName.trim(),
        buyerEmail: params.buyerEmail.trim().toLowerCase(),
        buyerCpf: cleanCpf,
        buyerPhone: params.buyerPhone?.trim() || null,
        amount: ebook.price,
        billingType,
        status: payment.status || "PENDING",
        asaasCustomerId: customerRes.customer.id,
        asaasPaymentId: payment.id,
        asaasDocumentId,
        invoiceUrl: payment.invoiceUrl || null,
        pixQrCode,
        pixQrCodeImage,
      },
    });

    revalidatePath("/admin");

    return {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        amount: order.amount,
        invoiceUrl: order.invoiceUrl,
        pixQrCode: order.pixQrCode,
        pixQrCodeImage: order.pixQrCodeImage,
        asaasPaymentId: order.asaasPaymentId,
        asaasDocumentAttached: Boolean(asaasDocumentId),
      },
    };
  } catch (error: any) {
    console.error("Erro ao processar compra de E-book:", error);
    return {
      success: false,
      error: error.message || "Erro ao processar pedido do E-book.",
    };
  }
}

/**
 * 6. Verifica em tempo real se o pagamento do E-book foi confirmado no Asaas
 * e retorna os dados atualizados (incluindo link da fatura Asaas com o PDF liberado e download direto)
 */
export async function checkEbookOrderStatusAction(orderId: string) {
  try {
    const order = await prisma.ebookOrder.findUnique({
      where: { id: orderId },
      include: {
        ebook: {
          select: {
            id: true,
            title: true,
            pdfFileName: true,
            pdfUrl: true,
          },
        },
      },
    });

    if (!order) {
      return { success: false, error: "Pedido não encontrado." };
    }

    let currentStatus = order.status;
    const isAlreadyPaid = currentStatus === "RECEIVED" || currentStatus === "CONFIRMED";

    if (!isAlreadyPaid && order.asaasPaymentId) {
      const paymentCheck = await getAsaasPayment(order.asaasPaymentId);
      if (paymentCheck.success && paymentCheck.payment) {
        currentStatus = paymentCheck.payment.status;
        if (currentStatus === "RECEIVED" || currentStatus === "CONFIRMED") {
          await prisma.$transaction([
            prisma.ebookOrder.update({
              where: { id: order.id },
              data: {
                status: currentStatus,
                paidAt: new Date(),
              },
            }),
            prisma.ebookProduct.update({
              where: { id: order.ebookId },
              data: {
                salesCount: { increment: 1 },
              },
            }),
          ]);
        }
      }
    }

    const isPaid = currentStatus === "RECEIVED" || currentStatus === "CONFIRMED";

    return {
      success: true,
      status: currentStatus,
      isPaid,
      invoiceUrl: order.invoiceUrl,
      ebookTitle: order.ebook.title,
      pdfFileName: order.ebook.pdfFileName,
      // Só entrega a URL/Base64 direta se o pagamento estiver confirmado!
      pdfUrl: isPaid ? order.ebook.pdfUrl : null,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
