import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

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
    const localPath = path.join(process.cwd(), pdfUrl.replace(/^\/+/, ""));
    return await fs.readFile(localPath);
  } catch {
    return null;
  }
}

function renderStatusHtml(title: string, message: string, submessage?: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} • Biblioteca Digital Horeb</title>
</head>
<body style="margin:0;padding:0;background:#070709;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:480px;width:90%;background:#18181b;border:1px solid rgba(245,158,11,0.35);border-radius:24px;padding:32px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.8);">
    <div style="width:56px;height:56px;border-radius:16px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 16px auto;font-size:26px;">
      🔒
    </div>
    <h1 style="margin:0 0 10px 0;font-size:20px;font-weight:900;color:#ffffff;">${title}</h1>
    <p style="margin:0 0 14px 0;font-size:14px;color:#d4d4d8;line-height:1.6;">${message}</p>
    ${submessage ? `<p style="margin:0 0 20px 0;font-size:12px;color:#a1a1aa;line-height:1.5;">${submessage}</p>` : ""}
    <a href="https://horeb.lynxems.com.br/#ebooks" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:#000000;font-weight:900;font-size:13px;border-radius:12px;text-decoration:none;">
      Voltar para a Vitrine Horeb
    </a>
  </div>
</body>
</html>`;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const cleanToken = (token || "").trim();

    if (!cleanToken) {
      return new NextResponse(
        renderStatusHtml("Link Inválido", "O token de download informado não é válido."),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    let order = await prisma.ebookOrder.findUnique({
      where: { downloadToken: cleanToken },
      include: { ebook: true },
    });

    // Fallback para links gerados com paymentId (ex: pay_...) caso o banco tenha sido sincronizado depois
    if (!order && cleanToken.startsWith("pay_")) {
      order = await prisma.ebookOrder.findUnique({
        where: { asaasPaymentId: cleanToken },
        include: { ebook: true },
      });
    }

    if (!order || !order.ebook) {
      return new NextResponse(
        renderStatusHtml(
          "Link Não Encontrado",
          "Não localizamos nenhum pedido vinculado a este link de download."
        ),
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const isPaid = order.status === "RECEIVED" || order.status === "CONFIRMED";
    if (!isPaid) {
      return new NextResponse(
        renderStatusHtml(
          "Aguardando Confirmação de Pagamento",
          "O pagamento deste pedido ainda está sendo processado pelo Asaas.",
          "Assim que for confirmado, este link liberará o download do seu PDF."
        ),
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Regra estrita: o link só pode ser acessado UMA ÚNICA VEZ!
    if (order.downloadUsed) {
      const usedDateStr = order.downloadUsedAt
        ? new Date(order.downloadUsedAt).toLocaleString("pt-BR")
        : "anteriormente";
      return new NextResponse(
        renderStatusHtml(
          "Link de Uso Único Já Utilizado",
          `Este link exclusivo de download do E-book "${order.ebook.title}" era válido para apenas 1 acesso e já foi utilizado em ${usedDateStr}.`,
          "Caso precise de suporte, entre em contato pelo e-mail suporte@lynxems.com.br."
        ),
        { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Ignorar requisições de pré-visualização automática de bots (WhatsApp/ E-mail scanners que fazem HEAD)
    const userAgent = (req.headers.get("user-agent") || "").toLowerCase();
    const isBotPreview =
      userAgent.includes("whatsapp") ||
      userAgent.includes("facebookexternalhit") ||
      userAgent.includes("telegrambot") ||
      userAgent.includes("google-safety");

    if (isBotPreview) {
      return new NextResponse(
        renderStatusHtml(
          `Download Pronto: ${order.ebook.title}`,
          "Abra este link no seu navegador para baixar seu E-book em PDF (válido para 1 único acesso)."
        ),
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const pdfBuffer = await resolvePdfBuffer(order.ebook.pdfUrl);
    if (!pdfBuffer) {
      return new NextResponse(
        renderStatusHtml(
          "Arquivo Temporariamente Indisponível",
          "Não foi possível carregar o PDF neste instante. O seu link único NÃO foi consumido; tente novamente em alguns segundos."
        ),
        { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Marca imediatamente o token como UTILIZADO (uso único) de forma atômica!
    const updateResult = await prisma.ebookOrder.updateMany({
      where: {
        id: order.id,
        downloadUsed: false,
      },
      data: {
        downloadUsed: true,
        downloadUsedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      return new NextResponse(
        renderStatusHtml(
          "Link de Uso Único Já Utilizado",
          `Este link exclusivo de download do E-book "${order.ebook.title}" já foi utilizado.`
        ),
        { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const rawFileName = order.ebook.pdfFileName || `${order.ebook.title}.pdf`;
    const asciiFileName = rawFileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._ -]/g, "_");

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(
          rawFileName
        )}`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    console.error("[Single-Use Ebook Download Error]:", err);
    return new NextResponse(
      renderStatusHtml("Erro no Download", "Ocorreu um erro ao processar seu download."),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

