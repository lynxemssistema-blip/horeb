"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  getOrCreateAsaasCustomer,
  createAsaasPayment,
  getAsaasPaymentPixQrCode,
  uploadAsaasPaymentDocument,
  getAsaasPayment,
} from "@/lib/asaas";
import { sendEbookOfferEmail, sendEbookSingleUseDownloadEmail } from "@/lib/mail";

async function requireSuperAdmin() {
  const session = await getSession();
  const isSuper = session?.role === "SUPERADMIN" || session?.originalRole === "SUPERADMIN";
  if (!session || !isSuper) {
    throw new Error("Acesso negado: exclusivo para Super Administrador.");
  }
  return session;
}

/**
 * Converte pdfUrl (data:application/pdf;base64,..., caminho local em Ebooks/ ou URL externa) em Buffer binário para envio ao Asaas
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
    // Se for caminho local relativo ao projeto (ex: "Ebooks/Os Seis Instintos da Alma.pdf")
    const localPath = path.join(process.cwd(), pdfUrl.replace(/^\/+/, ""));
    return await fs.readFile(localPath);
  } catch (err) {
    console.warn("[resolvePdfBuffer Warning]:", err);
    return null;
  }
}

let seedingPromise: Promise<void> | null = null;

/**
 * Inicializa e sincroniza os E-books oficiais da pasta Ebooks/ (incluindo Libertação Espiritual, Os Seis Instintos da Alma e Batalha Invisível)
 */
async function ensureInitialEbooksSeeded() {
  if (seedingPromise) {
    return seedingPromise;
  }

  seedingPromise = (async () => {
    try {
      const ebooksDir = path.join(process.cwd(), "Ebooks");
      const defaultItems = [
        {
          matchTitle: "Libertação Espiritual",
          title: "Libertação Espiritual — Restaurando a Ordem e o Equilíbrio",
          subtitle:
            "A verdadeira vitória não está nos gritos, mas no alinhamento do espírito, alma e corpo com a soberania de Cristo",
          author: "Pr. Luan Demattos",
          description:
            "Um guia profundo e prático para vencer a guerra na mente e guardar o coração. Compreenda a verdadeira natureza da prisão espiritual, o engano na mente e a compressão da alma, o alinhamento em Cristo, os 5 passos práticos para a verdadeira liberdade e como permanecer livre através do domínio próprio.",
          price: 9.9,
          originalPrice: 29.9,
          coverUrl: "/ebooks-covers/libertacao-espiritual.jpg?v=2",
          relativePdfPath:
            "Libertação Espiritual/Libertação Espiritual - Restaurando a Ordem e o Equilíbrio (1).pdf",
          fileName: "Libertação Espiritual - Restaurando a Ordem e o Equilíbrio.pdf",
          badge: "NOVO LANÇAMENTO",
          pagesCount: 10,
          category: "LIBERTAÇÃO & CURA INTERIOR",
          featured: true,
        },
        {
          matchTitle: "Os Seis Instintos da Alma",
          title: "Os Seis Instintos da Alma",
          subtitle: "O que é pecado e o que não é: estudo bíblico sobre santidade e equilíbrio",
          author: "Pr. Luan Demattos",
          description:
            "Estudo bíblico profundo sobre corpo, alma e espírito e os seis instintos naturais criados por Deus (Aquisição, Alimentação, Reprodução, Autoproteção, Domínio Próprio e Comunhão). Descubra onde termina o que é natural e onde começa o pecado e aprenda a quebrar os ciclos de desequilíbrio.",
          price: 9.9,
          originalPrice: 29.9,
          coverUrl: "/ebooks-covers/seis-instintos-da-alma.jpg?v=2",
          relativePdfPath:
            "Os Seis Instintos da Alm/Os Seis Instintos da Alma.pdf",
          fileName: "Os Seis Instintos da Alma.pdf",
          badge: "MAIS VENDIDO",
          pagesCount: 12,
          category: "SANTIDADE & EQUILÍBRIO",
          featured: true,
        },
        {
          matchTitle: "Batalha Invisível",
          title: "Batalha Invisível — Batalha Espiritual",
          subtitle: "A verdade que o inimigo não quer que você saiba sobre autoridade em Cristo",
          author: "Pr. Luan Demattos",
          description:
            "Conheça à luz das Escrituras as estratégias do inimigo, o papel das regiões celestiais, as ferramentas espirituais do cristão e como permanecer firme e vitorioso debaixo da autoridade de Cristo sem transformar pessoas em inimigas.",
          price: 9.9,
          originalPrice: 29.9,
          coverUrl: "/ebooks-covers/batalha-invisivel.jpg?v=2",
          relativePdfPath:
            "Batalha Invisível - E-book Completo/Batalha Invisível - E-book Completo.pdf",
          fileName: "Batalha Invisível - E-book Completo.pdf",
          badge: "DESTAQUE",
          pagesCount: 9,
          category: "BATALHA ESPIRITUAL",
          featured: true,
        },
      ];

      for (const item of defaultItems) {
        const matches = await prisma.ebookProduct.findMany({
          where: {
            title: {
              contains: item.matchTitle,
            },
          },
          select: {
            id: true,
            title: true,
            author: true,
            coverUrl: true,
            pdfUrl: true,
            _count: {
              select: { orders: true },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        // Remove duplicatas sem pedidos caso existam
        if (matches.length > 1) {
          for (let i = 1; i < matches.length; i++) {
            if (matches[i]._count.orders === 0) {
              await prisma.ebookProduct.delete({ where: { id: matches[i].id } }).catch(() => {});
            }
          }
        }

        const found = matches[0];

        let pdfDataUri = `Ebooks/${item.relativePdfPath}`;
        try {
          const fileBuf = await fs.readFile(path.join(ebooksDir, item.relativePdfPath));
          pdfDataUri = `data:application/pdf;base64,${fileBuf.toString("base64")}`;
        } catch {}

        if (!found) {
          await prisma.ebookProduct.create({
            data: {
              title: item.title,
              subtitle: item.subtitle,
              author: item.author,
              description: item.description,
              price: item.price,
              originalPrice: item.originalPrice,
              coverUrl: item.coverUrl,
              pdfUrl: pdfDataUri,
              pdfFileName: item.fileName,
              badge: item.badge,
              pagesCount: item.pagesCount,
              category: item.category,
              active: true,
              featured: item.featured,
            },
          });
        } else {
          // Atualiza se a capa ainda for antiga sem ?v=2 (exceto capas customizadas data: enviadas pelo Super Admin)
          const needsCoverUpdate =
            !found.coverUrl ||
            found.coverUrl.includes("images.unsplash.com") ||
            (found.coverUrl.startsWith("/ebooks-covers/") && !found.coverUrl.includes("?v=2"));
          const needsPdfUpdate = !found.pdfUrl || !found.pdfUrl.startsWith("data:");
          const needsAuthorUpdate =
            !found.author ||
            found.author.includes("Pastor") ||
            found.author.toLowerCase().includes("matos");

          if (needsCoverUpdate || needsPdfUpdate || needsAuthorUpdate) {
            await prisma.ebookProduct.update({
              where: { id: found.id },
              data: {
                author: needsAuthorUpdate ? item.author : found.author,
                coverUrl: needsCoverUpdate ? item.coverUrl : found.coverUrl,
                pdfUrl: needsPdfUpdate ? pdfDataUri : found.pdfUrl,
                pdfFileName: item.fileName,
                pagesCount: item.pagesCount,
              },
            });
          }
        }
      }

      // Sincroniza automaticamente pedidos de E-book recentes pagos no Asaas (garantindo envio do e-mail com PDF em anexo + link de uso único mesmo após deploy ou sem webhook secret)
      await syncRecentAsaasEbookOrdersInternal().catch((err) => {
        console.warn("[syncRecentAsaasEbookOrdersInternal Warning]:", err);
      });
    } catch (err) {
      console.warn("[ensureInitialEbooksSeeded Warning]:", err);
    } finally {
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}

/**
 * Sincroniza pedidos de E-book do Asaas com o banco local e dispara o e-mail de entrega (PDF em anexo + link de uso único) para pagamentos confirmados.
 */
async function syncRecentAsaasEbookOrdersInternal() {
  const { getAsaasConfig } = await import("@/lib/asaas");
  const { apiKey, baseUrl, isConfigured } = getAsaasConfig();
  if (!isConfigured) return;

  const res = await fetch(`${baseUrl}/payments?limit=25`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    cache: "no-store",
  });
  if (!res.ok) return;
  const data = await res.json();
  const payments: any[] = data?.data || [];

  const allEbooks = await prisma.ebookProduct.findMany({
    select: {
      id: true,
      title: true,
      price: true,
    },
  });
  if (allEbooks.length === 0) return;

  for (const p of payments) {
    const extRef = String(p.externalReference || "");
    const desc = String(p.description || "");
    if (!extRef.startsWith("EBOOK_") && !desc.toLowerCase().includes("e-book")) {
      continue;
    }

    let order = await prisma.ebookOrder.findUnique({
      where: { asaasPaymentId: p.id },
    });

    const isPaid = p.status === "RECEIVED" || p.status === "CONFIRMED";

    if (!order) {
      // Recupera o E-book correspondente (por ID no externalReference ou pelo título na descrição)
      const refId = extRef.replace("EBOOK_", "").trim();
      let matchedEbook = allEbooks.find((e) => e.id === refId);
      if (!matchedEbook) {
        matchedEbook = allEbooks.find((e) => {
          const cleanTitle = e.title.split("—")[0].trim().toLowerCase();
          return cleanTitle && desc.toLowerCase().includes(cleanTitle);
        });
      }
      if (!matchedEbook) {
        matchedEbook = allEbooks[0];
      }

      // Busca dados do comprador no Asaas
      let buyerName = "Cliente Horeb";
      let buyerEmail = "";
      let buyerCpf = "00000000000";
      let buyerPhone: string | null = null;

      if (p.customer) {
        try {
          const custRes = await fetch(`${baseUrl}/customers/${p.customer}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              access_token: apiKey,
            },
            cache: "no-store",
          });
          if (custRes.ok) {
            const cust = await custRes.json();
            buyerName = cust.name || buyerName;
            buyerEmail = (cust.email || "").trim().toLowerCase();
            buyerCpf = cust.cpfCnpj || buyerCpf;
            buyerPhone = cust.mobilePhone || cust.phone || null;
          }
        } catch {}
      }

      if (!buyerEmail) continue;

      // Usa o próprio ID da cobrança do Asaas (pay_...) como downloadToken determinístico quando sincronizado da API,
      // garantindo que mesmo se o container reiniciar, o link enviado por e-mail continue funcionando até ser usado 1 única vez!
      const deterministicToken = String(p.id || crypto.randomBytes(24).toString("hex"));

      order = await prisma.ebookOrder.create({
        data: {
          ebookId: matchedEbook.id,
          buyerName,
          buyerEmail,
          buyerCpf,
          buyerPhone,
          amount: Number(p.value || matchedEbook.price || 9.9),
          billingType: p.billingType || "PIX",
          status: p.status || "PENDING",
          asaasCustomerId: p.customer || null,
          asaasPaymentId: p.id,
          invoiceUrl: p.invoiceUrl || null,
          paidAt: isPaid ? new Date(p.paymentDate || p.clientPaymentDate || Date.now()) : null,
          downloadToken: deterministicToken,
          downloadUsed: false,
          deliveryEmailSent: false,
        },
      });
    } else if (isPaid && order.status !== "RECEIVED" && order.status !== "CONFIRMED") {
      order = await prisma.ebookOrder.update({
        where: { id: order.id },
        data: {
          status: p.status,
          paidAt: order.paidAt || new Date(),
          invoiceUrl: p.invoiceUrl || order.invoiceUrl,
        },
      });
    }

    if (isPaid && order && !order.deliveryEmailSent) {
      await triggerSingleUseEbookDeliveryEmail(order.id).catch((err) => {
        console.warn("[Auto-Delivery Email Error]:", err);
      });
    }
  }
}

/**
 * 1. Lista E-books ativos para a Vitrine da Página Inicial (sem expor o base64 pesado do PDF)
 */
export async function getPublicEbooks() {
  try {
    await ensureInitialEbooksSeeded();
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
 * 1.1 Busca um E-book específico para sua Página Exclusiva de Venda (/ebooks/[id])
 */
export async function getPublicEbookById(ebookId: string, orderId?: string) {
  try {
    await ensureInitialEbooksSeeded();
    const ebook = await prisma.ebookProduct.findUnique({
      where: { id: ebookId },
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

    if (!ebook) {
      return { success: false, error: "E-book não encontrado." };
    }

    let initialOrder: any = null;
    if (orderId) {
      const ord = await prisma.ebookOrder.findUnique({
        where: { id: orderId },
      });
      if (ord && ord.ebookId === ebook.id) {
        initialOrder = {
          id: ord.id,
          buyerName: ord.buyerName,
          buyerEmail: ord.buyerEmail,
          status: ord.status,
          amount: ord.amount,
          invoiceUrl: ord.invoiceUrl,
          pixQrCode: ord.pixQrCode,
          pixQrCodeImage: ord.pixQrCodeImage,
          asaasPaymentId: ord.asaasPaymentId,
          asaasDocumentAttached: Boolean(ord.asaasDocumentId),
        };
      }
    }

    return { success: true, ebook, initialOrder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 2. Lista todos os E-books e Pedidos para o Painel Super Admin
 */
export async function getAdminEbooksData() {
  try {
    await requireSuperAdmin();
    await ensureInitialEbooksSeeded();

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

      // Se a capa está sendo trocada ou removida, apaga a imagem anterior antes de gravar a nova
      const nextCoverUrl = data.coverUrl !== undefined ? data.coverUrl : existing.coverUrl;
      if (existing.coverUrl && existing.coverUrl !== nextCoverUrl) {
        // 1. Limpa explicitamente a capa anterior no banco de dados antes de salvar a nova
        await prisma.ebookProduct.update({
          where: { id: data.id },
          data: { coverUrl: null },
        });

        // 2. Se a capa anterior era um arquivo local customizado em public/uploads/, remove do disco com segurança
        if (existing.coverUrl.startsWith("/uploads/")) {
          const oldFilePath = path.join(
            process.cwd(),
            "public",
            existing.coverUrl.replace(/^\/+/, "")
          );
          await fs.unlink(oldFilePath).catch(() => {});
        }
      }

      const updated = await prisma.ebookProduct.update({
        where: { id: data.id },
        data: {
          title: data.title.trim(),
          subtitle: data.subtitle?.trim() || null,
          author: data.author?.trim() || "Pr. Luan Demattos",
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
      revalidatePath(`/ebooks/${data.id}`);
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
          author: data.author?.trim() || "Pr. Luan Demattos",
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

    // 2. Criar cobrança avulsa no Asaas com billingType "UNDEFINED" por padrão
    // Isso garante que a Fatura do Asaas (invoiceUrl) exiba Cartão de Crédito, PIX e Boleto para o cliente escolher!
    const todayStr = new Date().toISOString().split("T")[0];
    const selectedMethod = params.billingType || "UNDEFINED";
    // Enviamos "UNDEFINED" ao Asaas exceto se for explicitamente CREDIT_CARD, para nunca bloquear a aba de Cartão de Crédito na fatura!
    const asaasBillingType = selectedMethod === "CREDIT_CARD" ? "CREDIT_CARD" : "UNDEFINED";

    const paymentRes = await createAsaasPayment({
      customerId: customerRes.customer.id,
      value: ebook.price,
      dueDate: todayStr,
      billingType: asaasBillingType,
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

    // 5. Registrar o pedido no banco de dados com Token Exclusivo de Uso Único
    const downloadToken = crypto.randomBytes(24).toString("hex");
    const order = await prisma.ebookOrder.create({
      data: {
        ebookId: ebook.id,
        buyerName: params.buyerName.trim(),
        buyerEmail: params.buyerEmail.trim().toLowerCase(),
        buyerCpf: cleanCpf,
        buyerPhone: params.buyerPhone?.trim() || null,
        amount: ebook.price,
        billingType: selectedMethod,
        status: payment.status || "PENDING",
        asaasCustomerId: customerRes.customer.id,
        asaasPaymentId: payment.id,
        asaasDocumentId,
        invoiceUrl: payment.invoiceUrl || null,
        pixQrCode,
        pixQrCodeImage,
        downloadToken,
        downloadUsed: false,
        deliveryEmailSent: false,
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
 * Garante que o token de download de uso único exista e dispara o e-mail com o PDF em anexo + link único para o comprador.
 */
export async function triggerSingleUseEbookDeliveryEmail(
  orderId: string,
  forceResend = false
): Promise<{
  downloadToken: string;
  singleUseDownloadUrl: string;
  emailSent: boolean;
}> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";
  const order = await prisma.ebookOrder.findUnique({
    where: { id: orderId },
    include: { ebook: true },
  });

  if (!order) {
    return { downloadToken: "", singleUseDownloadUrl: "", emailSent: false };
  }

  let token = order.downloadToken;
  if (!token || (forceResend && order.downloadUsed)) {
    token = crypto.randomBytes(24).toString("hex");
    await prisma.ebookOrder.update({
      where: { id: order.id },
      data: {
        downloadToken: token,
        downloadUsed: false,
        downloadUsedAt: null,
      },
    });
  }

  const singleUseDownloadUrl = `${baseUrl}/api/ebooks/download/${token}`;

  if ((!order.deliveryEmailSent || forceResend) && order.buyerEmail) {
    // Carrega o binário do PDF para anexar diretamente no e-mail de confirmação (além do link de uso único)
    const pdfBuffer = await resolvePdfBuffer(order.ebook.pdfUrl);
    const pdfFileName = order.ebook.pdfFileName || `${order.ebook.title}.pdf`;

    const mailRes = await sendEbookSingleUseDownloadEmail({
      to: order.buyerEmail,
      buyerName: order.buyerName,
      ebookTitle: order.ebook.title,
      ebookSubtitle: order.ebook.subtitle,
      ebookAuthor: order.ebook.author,
      ebookCoverUrl: order.ebook.coverUrl,
      singleUseDownloadUrl,
      asaasInvoiceUrl: order.invoiceUrl,
      pdfBuffer,
      pdfFileName,
    });

    if (mailRes.success) {
      await prisma.ebookOrder.update({
        where: { id: order.id },
        data: { deliveryEmailSent: true },
      });

      await prisma.emailLog
        .create({
          data: {
            type: "OUTGOING",
            from: "suporte@lynxems.com.br",
            to: order.buyerEmail,
            subject: `✅ Pagamento Confirmado: Seu E-book "${order.ebook.title}" (PDF em Anexo + Link Único)`,
            snippet: `PDF anexado (${pdfFileName}) + Link de uso único enviado para ${order.buyerName}: ${singleUseDownloadUrl}`,
            status: "SENT",
          },
        })
        .catch(() => {});

      return { downloadToken: token, singleUseDownloadUrl, emailSent: true };
    }
  }

  return {
    downloadToken: token,
    singleUseDownloadUrl,
    emailSent: Boolean(order.deliveryEmailSent),
  };
}

/**
 * Permite reenviar o e-mail de confirmação com o PDF em anexo + novo link de uso único (Super Admin ou Comprador na página do pedido pago)
 */
export async function resendPaidEbookEmailAction(orderId: string) {
  try {
    const order = await prisma.ebookOrder.findUnique({
      where: { id: orderId },
      include: { ebook: true },
    });
    if (!order) {
      return { success: false, error: "Pedido não encontrado." };
    }

    let status = order.status;
    if (status !== "RECEIVED" && status !== "CONFIRMED" && order.asaasPaymentId) {
      const check = await getAsaasPayment(order.asaasPaymentId);
      if (check.success && check.payment) {
        status = check.payment.status;
        if (status === "RECEIVED" || status === "CONFIRMED") {
          await prisma.ebookOrder.update({
            where: { id: order.id },
            data: { status, paidAt: new Date() },
          });
        }
      }
    }

    if (status !== "RECEIVED" && status !== "CONFIRMED") {
      return {
        success: false,
        error: "Este pedido ainda aguarda confirmação de pagamento no Asaas.",
      };
    }

    const res = await triggerSingleUseEbookDeliveryEmail(order.id, true);
    if (!res.emailSent) {
      return {
        success: false,
        error: "Não foi possível enviar o e-mail no momento. Verifique o endereço de e-mail.",
      };
    }

    revalidatePath("/admin");
    return {
      success: true,
      singleUseDownloadUrl: res.singleUseDownloadUrl,
      buyerEmail: order.buyerEmail,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 6. Verifica em tempo real se o pagamento do E-book foi confirmado no Asaas
 * e dispara automaticamente o link de download de uso único para o e-mail do comprador!
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
    let singleUseDownloadUrl: string | null = null;
    let deliveryEmailSent = order.deliveryEmailSent;

    if (isPaid) {
      const delivery = await triggerSingleUseEbookDeliveryEmail(order.id);
      singleUseDownloadUrl = !order.downloadUsed ? delivery.singleUseDownloadUrl : null;
      deliveryEmailSent = delivery.emailSent;
    }

    return {
      success: true,
      status: currentStatus,
      isPaid,
      buyerEmail: order.buyerEmail,
      deliveryEmailSent,
      downloadUsed: order.downloadUsed,
      invoiceUrl: order.invoiceUrl,
      ebookTitle: order.ebook.title,
      pdfFileName: order.ebook.pdfFileName,
      // Aponta para o link de uso único (se ainda não utilizado)
      pdfUrl: isPaid && !order.downloadUsed ? singleUseDownloadUrl : null,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 7. Disparo Direto do Super Admin (WhatsApp e/ou E-mail) com Página Exclusiva do Produto + Link de Pagamento do Asaas
 * - Se o Super Admin informar Nome + CPF/CNPJ + E-mail do cliente, gera imediatamente a cobrança no Asaas (no grupo "Horeb"),
 *   anexa o PDF do E-book na cobrança (`availableAfterPayment = true`), obtém o Link de Pagamento Oficial do Asaas (`invoiceUrl`)
 *   e o PIX Copia-e-Cola, dispara por E-mail (se solicitado) e retorna o link pronto para disparo no WhatsApp!
 * - Se o Super Admin quiser apenas disparar a Página Exclusiva de Venda (`/ebooks/[id]`) sem CPF ainda, envia o convite/oferta por E-mail e/ou gera o link do WhatsApp!
 */
export async function dispatchEbookOfferByAdminAction(params: {
  ebookId: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientCpf?: string;
  generateAsaasPayment: boolean;
  billingType?: "PIX" | "UNDEFINED";
  sendEmail: boolean;
  customMessage?: string;
}) {
  try {
    await requireSuperAdmin();

    const ebook = await prisma.ebookProduct.findUnique({
      where: { id: params.ebookId },
    });
    if (!ebook) {
      return { success: false, error: "E-book não encontrado." };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";
    let productPageUrl = `${baseUrl}/ebooks/${ebook.id}`;
    let asaasInvoiceUrl: string | null = null;
    let pixQrCode: string | null = null;
    let pixQrCodeImage: string | null = null;
    let createdOrder: any = null;

    // 1. Se o Super Admin escolheu gerar o Link de Pagamento Direto no Asaas agora
    if (params.generateAsaasPayment) {
      const cleanCpf = (params.recipientCpf || "").replace(/\D/g, "");
      if (!params.recipientName?.trim() || cleanCpf.length < 11) {
        return {
          success: false,
          error:
            "Para gerar o Link de Pagamento direto no Asaas com o PDF anexado, informe o Nome e o CPF/CNPJ do cliente (ou desmarque para enviar apenas o link da Página Exclusiva de Venda).",
        };
      }

      const fallbackEmail =
        params.recipientEmail?.trim().toLowerCase() ||
        `cliente.${cleanCpf}@lynxems.com.br`;

      const pubRes = await purchaseEbookAction({
        ebookId: ebook.id,
        buyerName: params.recipientName.trim(),
        buyerEmail: fallbackEmail,
        buyerCpf: cleanCpf,
        buyerPhone: params.recipientPhone?.trim(),
        billingType: params.billingType || "UNDEFINED",
      });

      if (!pubRes.success || !pubRes.order) {
        return {
          success: false,
          error: pubRes.error || "Falha ao gerar cobrança no Asaas.",
        };
      }

      createdOrder = pubRes.order;
      asaasInvoiceUrl = pubRes.order.invoiceUrl || null;
      pixQrCode = pubRes.order.pixQrCode || null;
      pixQrCodeImage = pubRes.order.pixQrCodeImage || null;
      productPageUrl = `${baseUrl}/ebooks/${ebook.id}?orderId=${pubRes.order.id}`;
    }

    // 2. Se solicitou disparo por E-mail e informou e-mail válido
    let emailSent = false;
    let emailError: string | null = null;
    if (params.sendEmail && params.recipientEmail?.trim()) {
      const mailRes = await sendEbookOfferEmail({
        to: params.recipientEmail.trim(),
        recipientName: params.recipientName?.trim(),
        ebookTitle: ebook.title,
        ebookSubtitle: ebook.subtitle,
        ebookAuthor: ebook.author,
        ebookDescription: ebook.description,
        ebookPrice: ebook.price,
        ebookOriginalPrice: ebook.originalPrice,
        ebookCoverUrl: ebook.coverUrl,
        productPageUrl,
        asaasInvoiceUrl,
        pixQrCode,
        customMessage: params.customMessage?.trim() || null,
      });

      if (mailRes.success) {
        emailSent = true;
        await prisma.emailLog
          .create({
            data: {
              type: "OUTGOING",
              from: "suporte@lynxems.com.br",
              to: params.recipientEmail.trim().toLowerCase(),
              subject: `E-book "${ebook.title}" • Link de Pagamento Asaas`,
              snippet: `Página Exclusiva: ${productPageUrl} ${
                asaasInvoiceUrl ? `| Fatura Asaas: ${asaasInvoiceUrl}` : ""
              }`,
              status: "SENT",
            },
          })
          .catch(() => {});
      } else {
        emailError = mailRes.error || "Falha no envio SMTP.";
      }
    }

    // 3. Montar texto e URL de disparo direto para o WhatsApp
    const cleanPhone = (params.recipientPhone || "").replace(/\D/g, "");
    const formattedPhone = cleanPhone
      ? cleanPhone.startsWith("55")
        ? cleanPhone
        : `55${cleanPhone}`
      : "";

    const priceFormatted = Number(ebook.price).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    });
    const origFormatted =
      ebook.originalPrice && ebook.originalPrice > ebook.price
        ? Number(ebook.originalPrice).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })
        : null;
    const discountPct =
      ebook.originalPrice && ebook.originalPrice > ebook.price
        ? Math.round(((ebook.originalPrice - ebook.price) / ebook.originalPrice) * 100)
        : 0;

    const whatsappLines = [
      `🔥 *OFERTA ESPECIAL — E-BOOK OFICIAL HOREB*`,
      params.recipientName?.trim()
        ? `Olá, *${params.recipientName.trim()}*! A paz do Senhor! 🙏`
        : `Olá! A paz do Senhor! 🙏`,
      ``,
      params.customMessage?.trim() ||
        `Preparei para você o acesso ao E-book digital *${ebook.title}* (${ebook.author}).`,
      ``,
      `📘 *E-book:* ${ebook.title}`,
      ebook.subtitle ? `_${ebook.subtitle}_` : "",
      origFormatted
        ? `💰 *Oferta Especial:* De ~R$ ${origFormatted}~ por apenas *R$ ${priceFormatted}* (${discountPct}% OFF!)`
        : `💰 *Valor Único:* R$ ${priceFormatted} (PIX ou Cartão)`,
      `📥 *Entrega Automática:* Assim que o pagamento é confirmado, você recebe o arquivo PDF anexado no seu E-mail + Link de Download Imediato!`,
      ``,
      asaasInvoiceUrl
        ? `💳 *Link Direto de Pagamento no Asaas (PIX / Cartão / Boleto + PDF):*\n${asaasInvoiceUrl}\n`
        : "",
      `👉 *Página Oficial do E-book:*\n${productPageUrl}`,
    ].filter(Boolean);

    const whatsappMessage = whatsappLines.join("\n");
    const whatsappUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

    return {
      success: true,
      productPageUrl,
      asaasInvoiceUrl,
      pixQrCode,
      pixQrCodeImage,
      order: createdOrder,
      emailSent,
      emailError,
      whatsappMessage,
      whatsappUrl,
    };
  } catch (error: any) {
    console.error("Erro ao disparar oferta do E-book:", error);
    return { success: false, error: error.message };
  }
}
