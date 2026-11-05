import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicEbookById } from "@/app/actions/ebooks";
import fs from "fs/promises";
import path from "path";

function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

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

    // 2. Se for arquivo local em public/ (com proteção anti-Path Traversal)
    if (coverUrl.startsWith("/")) {
      const publicRoot = path.resolve(process.cwd(), "public");
      const cleanRelPath = coverUrl.split("?")[0].replace(/^\/+/, "");
      const localPath = path.resolve(publicRoot, cleanRelPath);

      if (localPath.startsWith(publicRoot + path.sep)) {
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
    }

    // 3. Se for URL externa HTTP/HTTPS (com validação anti-SSRF)
    if (
      (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) &&
      isSafeExternalUrl(coverUrl)
    ) {
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
