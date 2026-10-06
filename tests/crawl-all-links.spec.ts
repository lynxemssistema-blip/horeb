import { test, expect } from "@playwright/test";
import { prisma } from "../lib/prisma";

test.describe("Auditoria de Links Quebrados (Crawler Playwright) • Horeb SaaS", () => {
  let cookieValue: string;

  test.beforeAll(async () => {
    const matrizTenant = await prisma.tenant.findUnique({
      where: { slug: "matriz" },
    });
    const superadminUser = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" },
    });

    const sessionData = {
      userId: superadminUser?.id || "cmux6mo6y0001grts5gn8eqv0",
      email: superadminUser?.email || "edsonmanoel2012@gmail.com",
      name: superadminUser?.name || "Edson Manoel",
      role: "SUPERADMIN",
      tenantId: matrizTenant?.id || "cmuixxxxx",
      tenantSlug: "matriz",
    };
    cookieValue = Buffer.from(JSON.stringify(sessionData), "utf-8").toString("base64");
  });

  test.beforeEach(async ({ context }) => {
    // Autenticar com o cookie oficial horeb_auth_session
    await context.addCookies([
      {
        name: "horeb_auth_session",
        value: cookieValue,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  });

  const entryPages = [
    "http://localhost:3002/admin",
    "http://localhost:3002/select-church",
    "http://localhost:3002/matriz",
    "http://localhost:3002/matriz/perfil",
    "http://localhost:3002/matriz/admin/porteiro",
    "http://localhost:3002/matriz/admin/secretaria",
    "http://localhost:3002/matriz/admin/ebd",
    "http://localhost:3002/matriz/admin/assembleias",
    "http://localhost:3002/matriz/admin/patrimonio",
    "http://localhost:3002/matriz/admin/finance",
    "http://localhost:3002/matriz/celulas",
    "http://localhost:3002/matriz/agenda",
    "http://localhost:3002/matriz/kids",
    "http://localhost:3002/matriz/ministerios",
    "http://localhost:3002/matriz/admin/oracoes",
    "http://localhost:3002/matriz/devocional",
    "http://localhost:3002/matriz/doar",
    "http://localhost:3002/matriz/videos",
    "http://localhost:3002/matriz/membros",
    "http://localhost:3002/matriz/configuracoes",
  ];

  test("Rastrear e validar 100% dos links internos do Horeb SaaS", async ({ page }) => {
    test.setTimeout(180000); // 3 minutos para varredura completa

    const collectedLinks = new Map<string, { sourcePage: string; text: string }>();

    // 1. Coleta de todos os links presentes nas páginas principais
    for (const pageUrl of entryPages) {
      try {
        await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(500);

        const pageLinks = await page.$$eval("a[href]", (elements) =>
          elements.map((el) => ({
            href: el.getAttribute("href") || "",
            text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50),
          }))
        );

        for (const item of pageLinks) {
          const raw = item.href;
          if (
            !raw ||
            raw.startsWith("#") ||
            raw.startsWith("javascript:") ||
            raw.startsWith("mailto:") ||
            raw.startsWith("tel:")
          ) {
            continue;
          }

          let normalized = raw;
          if (raw.startsWith("/")) {
            normalized = `http://localhost:3002${raw}`;
          }

          if (normalized.startsWith("http://localhost:3002")) {
            // Ignorar parâmetros de busca efêmeros
            const cleanUrl = normalized.split("#")[0];
            if (!collectedLinks.has(cleanUrl)) {
              collectedLinks.set(cleanUrl, {
                sourcePage: pageUrl,
                text: item.text || cleanUrl,
              });
            }
          }
        }
      } catch (err: any) {
        console.error(`Erro ao coletar links da página ${pageUrl}:`, err.message);
      }
    }

    console.log(`\n============================================================`);
    console.log(`TOTAL DE LINKS ÚNICOS COLETADOS: ${collectedLinks.size}`);
    console.log(`============================================================\n`);

    const brokenLinks: {
      url: string;
      sourcePage: string;
      text: string;
      status: number | null;
      title: string;
      reason: string;
    }[] = [];

    let successCount = 0;

    // 2. Testar cada link navegando diretamente com o Playwright
    for (const [linkUrl, info] of collectedLinks.entries()) {
      try {
        const response = await page.goto(linkUrl, {
          waitUntil: "domcontentloaded",
          timeout: 12000,
        });

        const status = response?.status() || 0;
        const title = (await page.title()) || "";
        const bodyText = await page.content();

        const isNotFound =
          status === 404 ||
          title.includes("404: This page could not be found") ||
          (status !== 200 && status >= 400);

        if (isNotFound) {
          console.error(
            `❌ LINK QUEBRADO [HTTP ${status}]: ${linkUrl} (Título: "${title}", Origem: ${info.sourcePage})`
          );
          brokenLinks.push({
            url: linkUrl,
            sourcePage: info.sourcePage,
            text: info.text,
            status,
            title,
            reason: `HTTP ${status} - Página não encontrada`,
          });
        } else {
          successCount++;
          console.log(`  ✅ [HTTP ${status}] ${linkUrl} -> "${title.slice(0, 35)}"`);
        }
      } catch (err: any) {
        console.error(`❌ ERRO AO ACESSAR: ${linkUrl} -> ${err.message}`);
        brokenLinks.push({
          url: linkUrl,
          sourcePage: info.sourcePage,
          text: info.text,
          status: null,
          title: "Erro de Conexão",
          reason: err.message,
        });
      }
    }

    console.log(`\n============================================================`);
    console.log(`RELATÓRIO FINAL DE INTEGRIDADE DE LINKS:`);
    console.log(`Links funcionando com sucesso: ${successCount}/${collectedLinks.size}`);
    console.log(`Links quebrados detectados: ${brokenLinks.length}`);
    console.log(`============================================================\n`);

    if (brokenLinks.length > 0) {
      console.table(brokenLinks);
    }

    expect(brokenLinks).toHaveLength(0);
  });
});
