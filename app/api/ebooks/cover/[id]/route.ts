import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicEbookById } from "@/app/actions/ebooks";
import fs from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cleanId = (id || "").replace(/\.(jpg|jpeg|png|webp)$/i, "").trim();

    let ebook = await prisma.ebookProduct.findUnique({
      where: { id: cleanId },
      select: { coverUrl: true, title: true },
    });

    if (!ebook) {
      const seeded = await getPublicEbookById(cleanId);
      if (seeded.success && seeded.ebook) {
        ebook = {
          coverUrl: seeded.ebook.coverUrl,
          title: seeded.ebook.title,
        };
      }
    }

    const coverUrl = ebook?.coverUrl || "";

    // 1. Se for Data URI (base64 salvo pelo Super Admin ao trocar a capa)
    if (coverUrl.startsWith("data:")) {
      const match = coverUrl.match(/^data:([A-Za-z0-9/+.-]+);base64,(.+)$/);
      if (match && match[2]) {
        const mimeType = match[1] || "image/jpeg";
        const buf = Buffer.from(match[2], "base64");
        return new NextResponse(new Uint8Array(buf), {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=60, s-maxage=60",
          },
        });
      }
    }

    // 2. Se for arquivo local em public/ (ex: /ebooks-covers/libertacao-espiritual.jpg?v=2)
    if (coverUrl.startsWith("/")) {
      const cleanRelPath = coverUrl.split("?")[0].replace(/^\/+/, "");
      const localPath = path.join(process.cwd(), "public", cleanRelPath);
      try {
        const fileBuf = await fs.readFile(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const mime =
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";
        return new NextResponse(new Uint8Array(fileBuf), {
          status: 200,
          headers: {
            "Content-Type": mime,
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        });
      } catch {}
    }

    // 3. Se for URL externa HTTP/HTTPS
    if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) {
      try {
        const extRes = await fetch(coverUrl, { cache: "no-store" });
        if (extRes.ok) {
          const contentType = extRes.headers.get("content-type") || "image/jpeg";
          const arr = await extRes.arrayBuffer();
          return new NextResponse(new Uint8Array(arr), {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=300, s-maxage=300",
            },
          });
        }
      } catch {}
    }

    // 4. Fallback para logo oficial
    const fallbackPath = path.join(process.cwd(), "public", "logo-horeb.png");
    const fallbackBuf = await fs.readFile(fallbackPath);
    return new NextResponse(new Uint8Array(fallbackBuf), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
