import { test, expect } from "@playwright/test";
import { prisma } from "../lib/prisma";

test.describe("Auditoria Master Superadmin • Horeb SaaS (E2E Localhost)", () => {
  let superadminUser: any;
  let matrizTenant: any;
  let cookieValue: string;

  test.beforeAll(async () => {
    // 1. Obter tenant Matriz
    matrizTenant = await prisma.tenant.findUnique({
      where: { slug: "matriz" },
    });
    expect(matrizTenant).not.toBeNull();

    // 2. Obter ou criar Superadmin
    superadminUser = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" },
    });
    expect(superadminUser).not.toBeNull();

    // 3. Montar cookie de sessão
    const sessionData = {
      userId: superadminUser.id,
      email: superadminUser.email,
      name: superadminUser.name,
      role: "SUPERADMIN",
      tenantId: matrizTenant.id,
      tenantSlug: "matriz",
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

  // =========================================================================
  // FASE 1: NAVEGAÇÃO SUPERADMIN & GOVERNANÇA MULTI-TENANT
  // =========================================================================
  test("Fase 1.1: Painel Master Super Admin (/admin)", async ({ page }) => {
    await page.goto("http://localhost:3002/admin");
    await page.waitForLoadState("networkidle");

    // Verificar se o painel carrega com título e estatísticas
    const pageContent = await page.content();
    expect(pageContent).toContain("Super Admin");
    expect(pageContent).toContain("matriz");

    // Verificar se lista a congregação Matriz
    await expect(page.locator("text=Igreja Matriz Sede").first()).toBeVisible({ timeout: 10000 });
  });

  test("Fase 1.2: Seletor Geral de Igrejas (/select-church)", async ({ page }) => {
    await page.goto("http://localhost:3002/select-church");
    await page.waitForLoadState("networkidle");

    // Deve listar as congregações ativas
    await expect(page.locator("text=Igreja Matriz Sede").first()).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // FASE 2: HOME DO MEMBRO, CRACHÁ DIGITAL & PORTARIA
  // =========================================================================
  test("Fase 2.1: Tela Inicial da Congregação e Crachá Digital (/matriz)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz");
    await page.waitForLoadState("networkidle");

    // Verificar presença do botão "Meu Crachá (Portaria)"
    const badgeButton = page.locator("text=Meu Crachá (Portaria)");
    await expect(badgeButton).toBeVisible({ timeout: 10000 });

    // Clicar para abrir o modal do Crachá Digital
    await badgeButton.click();
    await page.waitForTimeout(500);

    // Conferir se o modal de crachá abriu com QR Code
    await expect(page.locator("text=Crachá Digital de Entrada")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("svg").first()).toBeVisible();
    await expect(page.locator("text=Fechar Crachá")).toBeVisible();

    // Fechar modal
    await page.locator("text=Fechar Crachá").click();
  });

  test("Fase 2.2: Porteiro Digital • Scanner Mobile (/matriz/admin/porteiro)", async ({ page }) => {
    // Definir viewport mobile de smartphone (390x844)
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("http://localhost:3002/matriz/admin/porteiro");
    await page.waitForLoadState("networkidle");

    // Verificar elementos da portaria
    await expect(page.locator("text=Porteiro Digital • Recepção de Culto")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Presentes Hoje")).toBeVisible();
    await expect(page.locator("text=Ativar Câmera do Celular")).toBeVisible();

    // Testar confirmação manual de presença
    const member = await prisma.user.findFirst({
      where: { tenantId: matrizTenant.id },
    });
    expect(member).not.toBeNull();

    const input = page.locator("input[placeholder*='MEM-A1B2C3']");
    await input.fill(member!.name);
    await page.locator("button:has-text('Confirmar')").click();
    await page.waitForTimeout(1000);

    // Deve acusar presença registrada ou já confirmada
    const bodyText = await page.content();
    const isSuccess = bodyText.includes("Presença") || bodyText.includes("Bem-Vindo");
    expect(isSuccess).toBe(true);

    // Testar aba de Radar de Ausência
    await page.locator("button:has-text('Radar de Ausência')").click();
    await page.waitForTimeout(1000);
    await expect(page.locator("text=Cuidado Pastoral • Membros Ausentes")).toBeVisible();
  });

  // =========================================================================
  // FASE 3: SECRETARIA DIGITAL & INFORME DE IRPF
  // =========================================================================
  test("Fase 3.1: Secretaria Digital & Documentos Oficiais (/matriz/admin/secretaria)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/admin/secretaria");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Emissão de Documentos & Certificados")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Emitir Novo Documento')")).toBeVisible();

    // Abrir modal de emissão
    await page.locator("button:has-text('Emitir Novo Documento')").click();
    await page.waitForTimeout(500);

    await expect(page.locator("text=Emitir Documento Oficial")).toBeVisible();

    // Preencher formulário de emissão
    await page.locator("input[placeholder*='Carlos Eduardo Ferreira']").fill("Irmão Teste Audit");
    await page.locator("button:has-text('Gerar Documento')").click();
    await page.waitForTimeout(2000);

    // Deve aparecer na lista de documentos
    await expect(page.locator("text=Irmão Teste Audit").first()).toBeVisible({ timeout: 10000 });
  });

  test("Fase 3.2: Informe de Rendimentos IRPF (/matriz/perfil)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/perfil");
    await page.waitForLoadState("networkidle");

    // Verificar botão Informe IRPF
    const irpfButton = page.locator("button:has-text('Informe IRPF')");
    await expect(irpfButton).toBeVisible({ timeout: 10000 });

    await irpfButton.click();
    await page.waitForTimeout(1000);

    // Verificar modal fiscal
    await expect(page.locator("text=Informe de Contribuições & Dízimos (IRPF)")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("button:has-text('Imprimir PDF')")).toBeVisible();
  });

  // =========================================================================
  // FASE 4: EBD & TRILHAS DE DISCIPULADO
  // =========================================================================
  test("Fase 4.1: Escola Bíblica Dominical & Chamada (/matriz/admin/ebd)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/admin/ebd");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Escola Bíblica Dominical & Trilhas de Discipulado")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Nova Turma EBD')")).toBeVisible();

    // Testar aba de Trilhas de Discipulado
    await page.locator("button:has-text('Trilhas de Discipulado')").click();
    await page.waitForTimeout(500);

    await expect(page.locator("text=Trilha do Novo Convertido").first()).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // FASE 5: ASSEMBLEIAS ESTATUTÁRIAS & VOTAÇÃO COM QUÓRUM
  // =========================================================================
  test("Fase 5.1: Painel de Assembleias & Quórum (/matriz/admin/assembleias)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/admin/assembleias");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Assembleias Estatutárias & Votação com Quórum")).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // FASE 6: PATRIMÔNIO & INVENTÁRIO FÍSICO
  // =========================================================================
  test("Fase 6.1: Inventário de Bens & Tombamento (/matriz/admin/patrimonio)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/admin/patrimonio");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Patrimônio & Inventário da Congregação")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Novo Bem Patrimonial')")).toBeVisible();

    // Abrir modal de novo bem
    await page.locator("button:has-text('Novo Bem Patrimonial')").click();
    await page.waitForTimeout(500);

    await page.locator("input[placeholder*='Ex: Mesa de Som']").fill("Projetor Laser 4K");
    await page.locator("input[placeholder*='Ex: Cabine de Som']").fill("Nave Principal");
    await page.locator("input[placeholder='0.00']").fill("6500");
    await page.getByRole("button", { name: "Tombar Bem" }).click();
    await page.waitForTimeout(2000);

    // Deve listar o bem cadastrado
    await expect(page.locator("text=Projetor Laser 4K").first()).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // FASE 7: GESTÃO FINANCEIRA ERP
  // =========================================================================
  test("Fase 7.1: ERP Financeiro (/matriz/admin/finance)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/admin/finance");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Gestão Financeira").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Saldo Líquido em Caixa").first()).toBeVisible();
  });

  // =========================================================================
  // FASE 8: CÉLULAS, EVENTOS, KIDS, MINISTÉRIOS E ORAÇÕES
  // =========================================================================
  test("Fase 8.1: Células & Grupos Familiares (/matriz/celulas)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/celulas");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Células").first()).toBeVisible({ timeout: 10000 });
  });

  test("Fase 8.2: Agenda & Eventos (/matriz/agenda)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/agenda");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Agenda").first()).toBeVisible({ timeout: 10000 });
  });

  test("Fase 8.3: Ministério Kids (/matriz/kids)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/kids");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Kids").first()).toBeVisible({ timeout: 10000 });
  });

  test("Fase 8.4: Ministérios da Igreja (/matriz/ministerios)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/ministerios");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Ministérios").first()).toBeVisible({ timeout: 10000 });
  });

  test("Fase 8.5: Central Pastoral de Pedidos de Oração (/matriz/admin/oracoes)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/admin/oracoes");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Pedidos de Oração").first()).toBeVisible({ timeout: 10000 });
  });

  // =========================================================================
  // FASE 9: MOTOR DE APARÊNCIA & TEMAS
  // =========================================================================
  test("Fase 9.1: Temas, Modos e Paletas (/matriz/perfil -> Aba Aparência)", async ({ page }) => {
    await page.goto("http://localhost:3002/matriz/perfil");
    await page.waitForLoadState("networkidle");

    // Clicar na aba Aparência
    await page.locator("button:has-text('Aparência')").click();
    await page.waitForTimeout(500);

    await expect(page.locator("text=Aparência & Tema de Cores")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Modo Claro").first()).toBeVisible();
    await expect(page.locator("text=Modo Escuro").first()).toBeVisible();
    await expect(page.locator("text=Preto Puro OLED").first()).toBeVisible();
  });
});
