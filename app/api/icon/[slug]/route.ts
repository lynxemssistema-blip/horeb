import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function GET(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true, primaryColor: true, logoUrl: true },
  });

  // Se o tenant tiver uma URL ou Base64 de imagem direta
  if (tenant?.logoUrl) {
    if (tenant.logoUrl.startsWith("data:")) {
      const matches = tenant.logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        if (mimeType.startsWith("image/") && !mimeType.includes("svg")) {
          const buffer = Buffer.from(matches[2], "base64");
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": mimeType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        }
      }
    } else if (
      (tenant.logoUrl.startsWith("http://") || tenant.logoUrl.startsWith("https://")) &&
      isSafeExternalUrl(tenant.logoUrl)
    ) {
      try {
        const imgRes = await fetch(tenant.logoUrl, {
          signal: AbortSignal.timeout(3000),
          redirect: "error",
        });
        if (imgRes.ok) {
          const contentType = imgRes.headers.get("content-type") || "image/png";
          if (contentType.startsWith("image/") && !contentType.includes("svg")) {
            const arrayBuffer = await imgRes.arrayBuffer();
            return new NextResponse(Buffer.from(arrayBuffer), {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
              },
            });
          }
        }
      } catch {
        // Fallback automático para o SVG vetorial se a URL externa falhar ou der 404
      }
    }
  }

  // Gera ícone vetorial SVG dinâmico e de altíssima fidelidade com as cores e monograma da igreja
  const rawChurchName = tenant?.name || "Igreja";
  const rawColor = tenant?.primaryColor || "#10b981";
  const primaryColor = /^#[0-9A-Fa-f]{3,8}$/.test(rawColor.trim()) ? rawColor.trim() : "#10b981";
  const initial = escapeXml(rawChurchName.trim().charAt(0).toUpperCase() || "I");
  const safeShortName = escapeXml(rawChurchName.slice(0, 15).toUpperCase());

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="50%" stop-color="#0c0c0e" />
      <stop offset="100%" stop-color="#050507" />
    </linearGradient>
    <radialGradient id="glowGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.9" />
      <stop offset="45%" stop-color="${primaryColor}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.2" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Fundo Squircle Suave Estilo App Store / PWA -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  <rect width="512" height="512" rx="128" fill="url(#glowGrad)" />
  <rect width="502" height="502" x="5" y="5" rx="123" fill="none" stroke="url(#borderGrad)" stroke-width="8" />

  <!-- Símbolo Monograma Central -->
  <g filter="url(#shadow)">
    <!-- Cruz / Símbolo de Fé no Topo -->
    <path d="M256 95 V155 M230 115 H282" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-opacity="0.85" />
    
    <!-- Letra Inicial da Igreja -->
    <text 
      x="256" 
      y="345" 
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
      font-size="195" 
      font-weight="900" 
      fill="#ffffff" 
      text-anchor="middle"
      letter-spacing="-4"
    >${initial}</text>
  </g>

  <!-- Nome Curto no Rodapé do Ícone -->
  <rect x="106" y="408" width="300" height="42" rx="21" fill="#000000" fill-opacity="0.55" stroke="${primaryColor}" stroke-opacity="0.4" stroke-width="2" />
  <text 
    x="256" 
    y="437" 
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
    font-size="20" 
    font-weight="800" 
    fill="#ffffff" 
    text-anchor="middle"
    letter-spacing="2"
  >${safeShortName}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
