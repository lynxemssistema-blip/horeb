import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.describe("Responsiveness & Digital Card Verification", () => {
  let user: any;
  let tenant: any;
  let cookieValue: string;

  test.beforeAll(async () => {
    tenant = await prisma.tenant.findUnique({
      where: { slug: "matriz" },
    });
    user = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" },
    });

    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    };
    cookieValue = Buffer.from(JSON.stringify(sessionData), "utf-8").toString("base64");
  });

  test.beforeEach(async ({ context }) => {
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

  const viewports = [
    { name: "Mobile Small (Android 360x740)", width: 360, height: 740 },
    { name: "Mobile Standard (iPhone 390x844)", width: 390, height: 844 },
    { name: "Tablet iPad (768x1024)", width: 768, height: 1024 },
    { name: "Desktop Full HD (1920x1080)", width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    test(`Auditoria Responsiva em ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Home da congregação
      await page.goto("http://localhost:3002/matriz");
      await page.waitForLoadState("networkidle");

      // Verificar que não há overflow horizontal na página
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

      // 2. Testar Crachá de Portaria
      const badgeTrigger = page.locator("text=Meu Crachá (Portaria)").first();
      if (await badgeTrigger.isVisible()) {
        await badgeTrigger.click();
        await page.waitForTimeout(400);

        const badgeDialog = page.locator("text=Crachá Digital de Entrada");
        await expect(badgeDialog).toBeVisible();

        // Verificar se QR Code do Crachá está visível sem estourar o viewport
        const qrCode = page.locator("svg").first();
        await expect(qrCode).toBeVisible();

        // Fechar Crachá
        const closeBadge = page.locator("text=Fechar Crachá");
        await expect(closeBadge).toBeVisible();
        await closeBadge.click();
        await page.waitForTimeout(300);
      }

      // 3. Testar Perfil & Carteirinha Digital Oficial
      await page.goto("http://localhost:3002/matriz/perfil");
      await page.waitForLoadState("networkidle");

      const cardButton = page.locator("button:has-text('Carteirinha Digital')");
      await expect(cardButton).toBeVisible({ timeout: 10000 });
      await cardButton.click();
      await page.waitForTimeout(500);

      // Conferir se o modal abriu
      const cardTitle = page.locator("text=Carteirinha Digital Oficial");
      await expect(cardTitle).toBeVisible();

      // Conferir se a frente da carteirinha está visível
      const credencialLabel = page.locator("text=Credencial Oficial");
      await expect(credencialLabel).toBeVisible();

      // Tirar screenshot para inspeção visual se necessário
      await page.screenshot({ path: `test-results/carteirinha-${vp.width}x${vp.height}.png` });

      // Testar Flip da carteirinha (clique para virar)
      const flipButton = page.locator("button:has-text('Girar Carteirinha')");
      await expect(flipButton).toBeVisible();
      await flipButton.click();
      await page.waitForTimeout(500);

      // Conferir se o verso com QR code apareceu
      await expect(page.locator("text=Validação de Membresia & Acesso")).toBeVisible();

      // Fechar modal pressionando Escape
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    });
  }
});
