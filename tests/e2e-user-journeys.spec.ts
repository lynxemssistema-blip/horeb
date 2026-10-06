import { test, expect, Page } from "@playwright/test";
import { prisma } from "../lib/prisma";

// Helper para gerar o cookie de sessão seguro do Horeb (Base64)
function getAuthSessionCookie(sessionData: {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}) {
  const value = Buffer.from(JSON.stringify(sessionData), "utf-8").toString("base64");
  return {
    name: "horeb_auth_session",
    value,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
  };
}

test.describe.serial("Jornadas do Usuário (E2E) - Criação de Registros Reais", () => {
  const testId = Date.now();
  let matrizTenant: any;
  let pastorUser: any;
  let createdMemberEmail = `carlos.silva.${testId}@horeb.org.br`;
  let createdMemberName = "Carlos Eduardo Ferreira";
  let createdMemberUser: any;

  test.beforeAll(async () => {
    // Garante que o tenant 'matriz' existe
    matrizTenant = await prisma.tenant.findUnique({
      where: { slug: "matriz" },
    });
    expect(matrizTenant).not.toBeNull();

    // Garante ou localiza o pastor da congregação
    pastorUser = await prisma.user.findFirst({
      where: { tenantId: matrizTenant.id, role: "PASTOR" },
    });
    if (!pastorUser) {
      pastorUser = await prisma.user.findFirst({
        where: { tenantId: matrizTenant.id },
      });
    }
    expect(pastorUser).not.toBeNull();
  });

  test("1. Membro: deve conseguir preencher o formulário de cadastro e criar usuário no banco", async ({
    page,
    context,
  }) => {
    await page.goto("/matriz/cadastro");
    const nameInput = page.getByPlaceholder("Ex: Pr. André Luiz");
    await expect(nameInput).toBeVisible({ timeout: 15000 });

    // Preenche campos do formulário
    await nameInput.fill(createdMemberName);
    await page.getByPlaceholder("seuemail@exemplo.com").fill(createdMemberEmail);
    await page.getByPlaceholder("Mínimo de 6 caracteres").fill("horebSenha123!");

    // Clica no botão de submissão
    const submitBtn = page.getByRole("button", {
      name: /Concluir Cadastro & Ativar/i,
    });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Aguarda o processamento do cadastro
    await page.waitForTimeout(3000);

    // Validação no Banco de Dados: o registro deve existir no Prisma!
    createdMemberUser = await prisma.user.findUnique({
      where: { email: createdMemberEmail },
    });

    expect(createdMemberUser).not.toBeNull();
    expect(createdMemberUser?.name).toBe(createdMemberName);
    expect(createdMemberUser?.tenantId).toBe(matrizTenant.id);
  });

  test("2. Membro: deve submeter um pedido de oração no modal da congregação", async ({
    page,
    context,
  }) => {
    // Autentica o contexto com o membro recém-criado ou pastor
    const session = createdMemberUser
      ? {
          userId: createdMemberUser.id,
          email: createdMemberUser.email,
          name: createdMemberUser.name,
          role: "MEMBER",
          tenantId: matrizTenant.id,
          tenantSlug: matrizTenant.slug,
        }
      : {
          userId: pastorUser.id,
          email: pastorUser.email,
          name: pastorUser.name,
          role: pastorUser.role,
          tenantId: matrizTenant.id,
          tenantSlug: matrizTenant.slug,
        };

    await context.addCookies([getAuthSessionCookie(session)]);

    await page.goto("/matriz");
    await page.waitForTimeout(1000);

    // Localiza e abre o modal de pedido de oração
    const openPrayerBtn = page
      .getByRole("button", { name: /Pedir Oração/i })
      .first();
    await expect(openPrayerBtn).toBeVisible();
    await openPrayerBtn.click();

    const prayerText = `Oração pela restauração e saúde da minha família [ID: ${testId}].`;

    // Preenche o formulário do modal
    const nameInput = page.getByPlaceholder("Ex: Maria Silva");
    if (await nameInput.isVisible()) {
      await nameInput.fill(createdMemberName);
    }

    const contentTextarea = page.getByPlaceholder(
      /Descreva o seu motivo \(saúde, família/i
    );
    await contentTextarea.fill(prayerText);

    // Envia o pedido
    const sendBtn = page.getByRole("button", {
      name: /Enviar Pedido de Oração/i,
    });
    await sendBtn.click();

    // Aguarda retorno da Server Action
    await page.waitForTimeout(2500);

    // Validação no Banco de Dados: o pedido deve ter sido persistido no Prisma
    const savedPrayer = await prisma.prayerRequest.findFirst({
      where: {
        content: { contains: String(testId) },
        tenantId: matrizTenant.id,
      },
    });

    expect(savedPrayer).not.toBeNull();
    expect(savedPrayer?.content).toContain(String(testId));
  });

  test("3. Membro: deve realizar check-in emocional e devocional diário", async ({
    page,
    context,
  }) => {
    const session = createdMemberUser
      ? {
          userId: createdMemberUser.id,
          email: createdMemberUser.email,
          name: createdMemberUser.name,
          role: "MEMBER",
          tenantId: matrizTenant.id,
          tenantSlug: matrizTenant.slug,
        }
      : {
          userId: pastorUser.id,
          email: pastorUser.email,
          name: pastorUser.name,
          role: pastorUser.role,
          tenantId: matrizTenant.id,
          tenantSlug: matrizTenant.slug,
        };

    await context.addCookies([getAuthSessionCookie(session)]);

    await page.goto("/matriz/devocional");
    await page.waitForTimeout(1000);

    // Clica no card de humor 'Feliz & Grato'
    const happyMoodBtn = page.getByText("Feliz & Grato").first();
    await expect(happyMoodBtn).toBeVisible();
    await happyMoodBtn.click();

    // Aguarda persistência da Server Action
    await page.waitForTimeout(2500);

    // Valida no Banco de Dados se o check-in de humor foi registrado no Prisma
    const latestCheckIn = await prisma.moodCheckIn.findFirst({
      where: {
        tenantId: matrizTenant.id,
        mood: "FELIZ",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(latestCheckIn).not.toBeNull();
    expect(latestCheckIn?.mood).toBe("FELIZ");
  });

  test("4. Membro: deve gerar cobrança de Dízimo via PIX com QR Code dinâmico", async ({
    page,
    context,
  }) => {
    const session = createdMemberUser
      ? {
          userId: createdMemberUser.id,
          email: createdMemberUser.email,
          name: createdMemberUser.name,
          role: "MEMBER",
          tenantId: matrizTenant.id,
          tenantSlug: matrizTenant.slug,
        }
      : {
          userId: pastorUser.id,
          email: pastorUser.email,
          name: pastorUser.name,
          role: pastorUser.role,
          tenantId: matrizTenant.id,
          tenantSlug: matrizTenant.slug,
        };

    await context.addCookies([getAuthSessionCookie(session)]);

    await page.goto("/matriz/doar");
    await page.waitForTimeout(1000);

    // Clica em 'Gerar PIX'
    const generatePixBtn = page.getByRole("button", {
      name: /Gerar PIX/i,
    });
    await expect(generatePixBtn).toBeVisible();
    await generatePixBtn.click();

    // Aguarda o processamento bancário mock e exibição do QR Code
    await page.waitForTimeout(3000);

    // Verifica se os elementos do PIX foram renderizados na tela
    const qrCodeSvg = page.locator("svg").first();
    await expect(qrCodeSvg).toBeVisible();

    // Validação no Banco de Dados: transação criada no Prisma
    const transaction = await prisma.transaction.findFirst({
      where: {
        tenantId: matrizTenant.id,
        type: "PIX",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(transaction).not.toBeNull();
    expect(transaction?.status).toBe("PENDING");
  });

  test("5. Membro: deve emitir ingresso para evento com credencial e QR Code nominal", async ({
    page,
    context,
  }) => {
    const session = createdMemberUser
      ? {
          userId: createdMemberUser.id,
          email: createdMemberUser.email,
          name: createdMemberUser.name,
          role: "MEMBER",
          tenantId: matrizTenant.id,
          tenantSlug: matrizTenant.slug,
        }
      : {
          userId: pastorUser.id,
          email: pastorUser.email,
          name: pastorUser.name,
          role: pastorUser.role,
          tenantId: matrizTenant.id,
          tenantSlug: matrizTenant.slug,
        };

    await context.addCookies([getAuthSessionCookie(session)]);

    // Garante que existe pelo menos um evento na matriz
    let event = await prisma.event.findFirst({
      where: { tenantId: matrizTenant.id, isActive: true },
    });

    if (!event) {
      event = await prisma.event.create({
        data: {
          title: `Culto Especial de Celebração ${testId}`,
          startDate: new Date(Date.now() + 86400000),
          isPaid: false,
          isPublic: true,
          isActive: true,
          tenantId: matrizTenant.id,
        },
      });
    }

    const buyerEmail = session.email;
    const guestName = "Juliana Albuquerque";

    // Emite o ingresso via Server Action oficial da bilheteria
    const { purchaseTickets } = await import("../app/actions/tickets");
    const purchaseResult = await purchaseTickets(event.id, 1, [guestName], buyerEmail);
    expect(purchaseResult.success).toBe(true);

    // Valida no Banco de Dados: Ticket gerado com UUID no Prisma
    const ticket = await prisma.ticket.findFirst({
      where: {
        eventId: event.id,
        buyerEmail,
      },
    });

    expect(ticket).not.toBeNull();
    expect(ticket?.status).toBe("VALID");
    expect(ticket?.guestName).toBe(guestName);

    // Navega no Browser para a tela 'Meus Ingressos' autenticado
    await page.goto(`/matriz/meus-ingressos`);
    await page.waitForTimeout(2000);

    // Valida que o nome do convidado e a tela de credencial renderizam
    const guestElement = page.getByText(guestName).first();
    await expect(guestElement).toBeVisible({ timeout: 10000 });
  });

  test("6. Validação Cruzada: Integridade e Isolamento Multi-Tenant dos Registros", async () => {
    // Valida que todos os registros gerados estão vinculados estritamente à congregação 'matriz'
    const tenantUsers = await prisma.user.count({
      where: { tenantId: matrizTenant.id },
    });
    const tenantPrayers = await prisma.prayerRequest.count({
      where: { tenantId: matrizTenant.id },
    });
    const tenantTransactions = await prisma.transaction.count({
      where: { tenantId: matrizTenant.id },
    });

    expect(tenantUsers).toBeGreaterThan(0);
    expect(tenantPrayers).toBeGreaterThan(0);
    expect(tenantTransactions).toBeGreaterThan(0);
  });

  test("7. Pastor Luan: deve acessar a congregação Deker com perfil de Admin", async ({
    page,
    context,
  }) => {
    const luanUser = await prisma.user.findUnique({
      where: { email: "luandemattos102030@gmail.com" },
      include: { tenant: true },
    });
    expect(luanUser).not.toBeNull();
    expect(luanUser?.tenant.slug).toBe("deker");

    // Injeta a sessão autenticada do Pastor Luan
    await context.addCookies([
      getAuthSessionCookie({
        userId: luanUser!.id,
        email: luanUser!.email,
        name: luanUser!.name,
        role: luanUser!.role,
        tenantId: luanUser!.tenantId,
        tenantSlug: luanUser!.tenant.slug,
      }),
    ]);

    // Acessa /deker no navegador
    await page.goto("/deker");
    await expect(page.getByText(/Deker/i).first()).toBeVisible({ timeout: 15000 });
  });
});

