import { test, expect } from "@playwright/test";
import { prisma } from "../lib/prisma";
import { getPersonalToolsConfig, getUserToolsSubscription } from "../app/actions/personal-tools";

test.describe("Auditoria Completa: Minhas Ferramentas (30 Dias Grátis) & Copiloto Flutuante", () => {
  let cookieValue: string;
  let testUser: any;
  let tenant: any;

  test.beforeAll(async () => {
    // Buscar tenant e superadmin para autenticação oficial
    tenant = await prisma.tenant.findFirst({
      where: { slug: "deker-filial" },
    }) || await prisma.tenant.findFirst();

    testUser = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" },
    });

    if (!testUser) {
      testUser = await prisma.user.findFirst();
    }

    if (testUser && tenant) {
      const sessionData = {
        userId: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: "SUPERADMIN",
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      };
      cookieValue = Buffer.from(JSON.stringify(sessionData), "utf-8").toString("base64");
    }
  });

  test.beforeEach(async ({ context }) => {
    if (cookieValue) {
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
    }
  });

  test("TC01 - Primeiro Acesso: Deve conceder 30 dias grátis e liberar o Estúdio de Câmera sem bloqueio", async ({ page }) => {
    // Garantir estado de primeiro acesso para o usuário de teste
    if (testUser) {
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          hasToolsSubscription: false,
          toolsSubscriptionStatus: "INACTIVE",
          toolsSubscriptionExpiresAt: null,
        } as any,
      });
    }

    // Acessa congregação
    await page.goto("/deker-filial");
    await page.waitForLoadState("domcontentloaded");

    // Rolar até Minhas Ferramentas
    const toolsSection = page.locator("#minhas-ferramentas");
    await expect(toolsSection).toBeVisible({ timeout: 15000 });

    // Validar título da seção
    await expect(toolsSection.locator("h2")).toContainText("Minhas Ferramentas");

    // Validar badge de 30 Dias Grátis Ativado
    const trialBadge = toolsSection.locator("text=/30 Dias Grátis/i");
    await expect(trialBadge).toBeVisible();

    // Validar contador regressivo de dias
    const daysCountdown = toolsSection.locator("text=/dias restantes|dia restante/i");
    await expect(daysCountdown).toBeVisible();

    // Validar banner informativo dos 30 dias de uso gratuito
    const trialBanner = toolsSection.locator("text=/Seus 30 dias de degustação gratuita estão ativados/i");
    await expect(trialBanner).toBeVisible();

    // Validar botão de ação direta "Abrir Câmera"
    const openCameraButton = toolsSection.locator("button:has-text('Abrir Câmera')");
    await expect(openCameraButton).toBeVisible();
    await openCameraButton.click();

    // Validar que o modal do Estúdio Fotográfico do Instagram abriu com sucesso
    const cameraStudioModal = page.locator("text=Estúdio de Fotos & Instagram");
    await expect(cameraStudioModal).toBeVisible();

    // Validar formatos oficiais do Instagram (1:1, 4:5, 9:16)
    await expect(page.locator("button:has-text('1:1')")).toBeVisible();
    await expect(page.locator("button:has-text('4:5')")).toBeVisible();
    await expect(page.locator("button:has-text('9:16')")).toBeVisible();

    // Fechar modal do estúdio
    const closeStudioBtn = page.locator("button:has-text('Fechar Câmera')");
    if (await closeStudioBtn.isVisible()) {
      await closeStudioBtn.click();
    }
  });

  test("TC02 - Simulação de Expiração (Pós-30 Dias): Deve bloquear a câmera e exibir checkout Asaas", async ({ page }) => {
    // Simular que os 30 dias expiraram no banco para o usuário
    if (testUser) {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          hasToolsSubscription: false,
          toolsSubscriptionStatus: "OVERDUE",
          toolsSubscriptionExpiresAt: thirtyOneDaysAgo,
        } as any,
      });
    }

    await page.goto("/deker-filial");
    await page.waitForLoadState("domcontentloaded");

    const toolsSection = page.locator("#minhas-ferramentas");
    await expect(toolsSection).toBeVisible({ timeout: 15000 });

    // Deve exibir badge de 30 dias grátis expirados
    const expiredBadge = toolsSection.locator("text=/30 Dias Grátis Expirados/i");
    await expect(expiredBadge).toBeVisible();

    // Deve exibir alerta de encerramento dos 30 dias
    const expiredAlert = toolsSection.locator("text=/Período de 30 dias de uso gratuito encerrado/i");
    await expect(expiredAlert).toBeVisible();

    // Botão de acesso direto à câmera NÃO deve existir no estado bloqueado
    const directCameraBtn = toolsSection.locator("button:has-text('Abrir Câmera')");
    await expect(directCameraBtn).toHaveCount(0);

    // Botão de contratação Asaas DEVE estar visível
    const checkoutTrigger = toolsSection.locator("button:has-text('Contratar Módulo')");
    await expect(checkoutTrigger).toBeVisible();

    // Clicar para abrir o checkout Asaas
    await checkoutTrigger.click();

    // Validar abertura do modal de contratação Asaas
    const checkoutModal = page.locator("text=Forma de Pagamento (Asaas)");
    await expect(checkoutModal).toBeVisible();
    await expect(page.locator("button:has-text('PIX Instantâneo')")).toBeVisible();
    await expect(page.locator("button:has-text('Cartão de Crédito')")).toBeVisible();
    await expect(page.locator("input#cpf")).toBeVisible();
  });

  test("TC03 - Copiloto Flutuante Não-Bloqueante: Transição de alturas e interação ao vivo com o app", async ({ page }) => {
    // Restaurar trial ativo
    if (testUser) {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: testUser.id },
        data: {
          hasToolsSubscription: true,
          toolsSubscriptionStatus: "TRIAL",
          toolsSubscriptionExpiresAt: futureDate,
        } as any,
      });
    }

    await page.goto("/deker-filial");
    await page.waitForLoadState("domcontentloaded");

    // Localizar gatilho do Copiloto Flutuante
    const copilotTrigger = page.locator("button:has-text('Copiloto de Ajuda')");
    await expect(copilotTrigger).toBeVisible({ timeout: 15000 });

    // Clicar para abrir o Copiloto no modo Compacto
    await copilotTrigger.click();

    // Validar que o Copiloto abriu em bottom-sheet
    const copilotSheet = page.locator("#horeb-copilot-root");
    await expect(copilotSheet).toBeVisible();
    await expect(page.locator("text=Copiloto Horeb")).toBeVisible();

    // Validar botões de controle do roteiro
    const nextBtn = page.locator("button:has-text('Próximo')");
    await expect(nextBtn).toBeVisible();

    // Testar minimização para o modo Mini de rodapé
    const minimizeBtn = page.locator("button[title*='Minimizar']");
    if (await minimizeBtn.isVisible()) {
      await minimizeBtn.click();
      await expect(page.locator("text=Copiloto Horeb")).toBeVisible();
    }
  });

  test("TC04 - Backend Action: getPersonalToolsConfig e getUserToolsSubscription", async () => {
    // 1. Validar getPersonalToolsConfig retornando 30 dias
    const configRes = await getPersonalToolsConfig();
    expect(configRes.success).toBe(true);
    expect(configRes.config.trialDays).toBeGreaterThanOrEqual(30);

    // 2. Validar getUserToolsSubscription com usuário existente
    if (testUser?.id) {
      const subRes = await getUserToolsSubscription(testUser.id);
      expect(subRes).toBeDefined();
      expect(subRes.hasActiveSubscription).toBe(true);
      expect(subRes.status).toBe("TRIAL");
      expect(subRes.isTrial).toBe(true);
      expect(subRes.remainingDays).toBeGreaterThan(0);
    }
  });
});
