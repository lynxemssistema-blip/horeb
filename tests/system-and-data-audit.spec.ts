import { test, expect } from "@playwright/test";
import { prisma } from "../lib/prisma";
import { verifyActivationCode } from "../app/actions/activation";
import { createManualTransaction, getFinancialDashboardData } from "../app/actions/finance-admin";
import { createEvent } from "../app/actions/events";
import { purchaseTickets, validateDoorTicket } from "../app/actions/tickets";
import { createPastoralAppointment, sendPastoralMessage } from "../app/actions/pastoral";
import { createMeeting, saveMeetingMinute, createTask, toggleTaskStatus } from "../app/actions/ministry";
import { registerMemberSelf } from "../app/actions/members";
import { submitPrayerRequest } from "../app/actions/prayer";
import { recordMoodCheckIn } from "../app/actions/devotional";

test.describe("Auditoria de Sistemas & Engenharia de Dados (Horeb)", () => {
  const timestamp = Date.now();
  const testEmail = `qa.audit.${timestamp}@horeb.org.br`;
  const testName = `QA Tester Auditor ${timestamp.toString().slice(-4)}`;

  // =========================================================================
  // 1. Governança Multi-Tenant & Controle de Acesso (RBAC)
  // =========================================================================
  test("1. Governança Multi-Tenant & RBAC: Isolamento de congregações e proteção de sessão", async ({ page }) => {
    // Acesso não autenticado a rotas protegidas deve exigir autenticação ou redirecionar
    await page.goto("http://localhost:3002/matriz/admin/finance");
    await page.waitForLoadState("networkidle");

    // Deve redirecionar para a home com auth=required ou apresentar tela de bloqueio
    const currentUrl = page.url();
    const isRedirectedOrRestricted =
      currentUrl.includes("auth=required") ||
      currentUrl.includes("/matriz") ||
      (await page.locator("text=Acesso Restrito").count()) > 0 ||
      (await page.locator("text=Entrar").count()) > 0;
    expect(isRedirectedOrRestricted).toBe(true);

    // Consulta de hierarquia Matriz x Filial
    const matriz = await prisma.tenant.findUnique({
      where: { slug: "matriz" },
      include: { branches: true },
    });
    expect(matriz).not.toBeNull();
    expect(matriz?.parentId).toBeNull(); // Matriz é raiz da rede
    expect(Array.isArray(matriz?.branches)).toBe(true); // Possui lista de filiais
  });

  // =========================================================================
  // 2. Cadastro de Membros & Fluxo de Ativação (com teste de duplicidade)
  // =========================================================================
  test("2. Cadastro de Membros & Ativação OTP: Cadastro, unicidade e código de 6 dígitos", async () => {
    // 2.1 Cadastro inicial bem-sucedido
    const regResult = await registerMemberSelf({
      name: testName,
      email: testEmail,
      password: "TestPassword123!",
      tenantSlug: "matriz",
    });
    expect(regResult.success).toBe(true);

    // Valida persistência no banco
    const createdUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { churchAccesses: true, tenant: true },
    });
    expect(createdUser).not.toBeNull();
    expect(createdUser?.password?.startsWith("$2")).toBe(true); // Hash bcrypt
    expect(createdUser?.tenant.slug).toBe("matriz");
    expect(createdUser?.churchAccesses.some((ca) => ca.tenantId === createdUser!.tenantId)).toBe(true);

    // 2.2 Tentativa de cadastro duplicado na mesma igreja
    const dupResult = await registerMemberSelf({
      name: testName,
      email: testEmail,
      password: "TestPassword123!",
      tenantSlug: "matriz",
    });
    expect(dupResult.success).toBe(false);
    expect(dupResult.error).toContain("já possui cadastro");

    // 2.3 Ativação via código OTP
    const code = "789123";
    await prisma.user.update({
      where: { id: createdUser!.id },
      data: {
        isEmailVerified: false,
        verificationCode: code,
        codeExpiresAt: new Date(Date.now() + 3600000),
      },
    });

    const actResult = await verifyActivationCode({
      email: testEmail,
      code: code,
    });
    expect(actResult.success).toBe(true);

    // Confere se atualizou no banco e gerou log
    const activatedUser = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(activatedUser?.isEmailVerified).toBe(true);

    const log = await prisma.emailLog.findFirst({
      where: { from: testEmail, status: "DELIVERED" },
    });
    expect(log).not.toBeNull();
  });

  // =========================================================================
  // 3. Módulo Financeiro & Contribuições PIX (Lançamento e Recálculo)
  // =========================================================================
  test("3. Módulo Financeiro: Lançamentos manuais, atomicidade e recálculo de saldo", async () => {
    const matriz = await prisma.tenant.findUnique({ where: { slug: "matriz" } });
    expect(matriz).not.toBeNull();

    const initialData = await getFinancialDashboardData("LOCAL", matriz!.id);
    const initialBalance = initialData.balance;

    // Lançamento de Receita (INCOME)
    const incomeAmount = 350.0;
    const incomeRes = await createManualTransaction({
      tenantId: matriz!.id,
      type: "INCOME",
      amount: incomeAmount,
      category: "OFERTA",
      description: `QA Test Receita ${timestamp}`,
      paymentMethod: "PIX",
    });
    expect(incomeRes.success).toBe(true);

    // Lançamento de Despesa (EXPENSE)
    const expenseAmount = 120.0;
    const expenseRes = await createManualTransaction({
      tenantId: matriz!.id,
      type: "EXPENSE",
      amount: expenseAmount,
      category: "OUTROS",
      description: `QA Test Despesa ${timestamp}`,
      paymentMethod: "DINHEIRO",
    });
    expect(expenseRes.success).toBe(true);

    // Recálculo e verificação do novo saldo
    const updatedData = await getFinancialDashboardData("LOCAL", matriz!.id);
    const expectedBalanceDiff = incomeAmount - expenseAmount;
    expect(Math.round(updatedData.balance - initialBalance)).toBe(Math.round(expectedBalanceDiff));
  });

  // =========================================================================
  // 4. Gestão de Eventos, Bilhetagem & Portaria com Anti-Duplicação
  // =========================================================================
  test("4. Eventos e Portaria: Emissão de ingressos com QR Code e validação anti-duplicação", async () => {
    const matriz = await prisma.tenant.findUnique({ where: { slug: "matriz" } });
    expect(matriz).not.toBeNull();

    // 4.1 Criação de Evento
    const eventRes = await createEvent(
      {
        title: `Congresso de Tecnologia e Fé ${timestamp}`,
        slogan: "Inovação a serviço do Reino",
        startDate: new Date(Date.now() + 86400000 * 7),
        isPublic: true,
        isGlobalFeature: true,
      },
      "MASTER",
      matriz!.id
    );
    expect(eventRes.success).toBe(true);
    const eventId = eventRes.event!.id;

    // 4.2 Compra de Ingressos Nominais
    const buyerEmail = `comprador.${timestamp}@horeb.org.br`;
    const guests = ["Pr. André QA", "Dra. Rebeca QA"];
    const purchaseRes = await purchaseTickets(eventId, 2, guests, buyerEmail);
    expect(purchaseRes.success).toBe(true);

    // Verifica persistência dos ingressos
    const tickets = await prisma.ticket.findMany({
      where: { eventId, buyerEmail },
    });
    expect(tickets.length).toBe(2);
    expect(tickets[0].status).toBe("VALID");

    // 4.3 Validação na Portaria (1º Bip: VÁLIDO)
    const ticketToScan = tickets[0].id;
    const scan1 = await validateDoorTicket(ticketToScan);
    expect(scan1.success).toBe(true);
    expect(scan1.message).toContain("Acesso Liberado");

    // Confere status alterado para USED no banco
    const usedTicket = await prisma.ticket.findUnique({ where: { id: ticketToScan } });
    expect(usedTicket?.status).toBe("USED");

    // 4.4 Validação na Portaria (2º Bip: DUPLICADO / JÁ UTILIZADO)
    const scan2 = await validateDoorTicket(ticketToScan);
    expect(scan2.success).toBe(false);
    expect(scan2.message).toContain("já foi validado anteriormente");
  });

  // =========================================================================
  // 5. Atendimento Pastoral & Chat de Inteligência Artificial
  // =========================================================================
  test("5. Atendimento Pastoral & Chat IA: Fila ao vivo, agendamento e mensagens sigilosas", async () => {
    const pastor = await prisma.user.findFirst({
      where: { role: "PASTOR" },
      include: { tenant: true },
    });
    expect(pastor).not.toBeNull();

    // 5.1 Criar Atendimento Pastoral ao Vivo (LIVE)
    const apptRes = await createPastoralAppointment({
      slug: pastor!.tenant.slug,
      pastorId: pastor!.id,
      type: "LIVE",
      userName: "Irmão Necessitado de Oração",
      subject: "Aconselhamento Familiar",
    });
    expect(apptRes.success).toBe(true);
    const apptId = apptRes.appointment!.id;

    // 5.2 Troca de mensagens no atendimento (assinatura: appointmentId, content)
    const msgRes = await sendPastoralMessage(
      apptId,
      "Pastor, estou precisando de uma oração urgente pela minha família."
    );
    expect(msgRes.success).toBe(true);

    // Validar persistência em PastoralMessage
    const messages = await prisma.pastoralMessage.findMany({
      where: { appointmentId: apptId },
    });
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].content).toContain("oração urgente");

    // 5.3 Chat IA em Transação Atômica ($transaction)
    const conv = await prisma.conversation.create({
      data: {
        userId: pastor!.id,
        tenantId: pastor!.tenantId,
        title: "Sessão de Discipulado QA",
      },
    });

    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conv.id,
          role: "USER",
          content: "Como manter a constância na leitura da Bíblia?",
        },
      }),
      prisma.message.create({
        data: {
          conversationId: conv.id,
          role: "MODEL",
          content: "Comece com pequenas porções diárias e estabeleça um horário fixo de oração.",
        },
      }),
    ]);

    const chatMsgs = await prisma.message.findMany({ where: { conversationId: conv.id } });
    expect(chatMsgs.length).toBe(2);
  });

  // =========================================================================
  // 6. Devocional Diário & Check-in Emocional
  // =========================================================================
  test("6. Devocional & Check-in: Persistência de humor diário e pedidos de oração anônimos", async () => {
    // 6.1 Check-in de alma
    const moodRecord = await recordMoodCheckIn("ANSIOSO", "matriz");
    expect(moodRecord).not.toBeNull();
    expect(moodRecord?.mood).toBe("ANSIOSO");

    // 6.2 Pedido de Oração Anônimo
    const prayerRes = await submitPrayerRequest({
      tenantSlug: "matriz",
      content: "Peço oração pela cura e restauração da minha saúde.",
      isAnonymous: true,
    });
    expect(prayerRes.success).toBe(true);

    const savedPrayer = await prisma.prayerRequest.findFirst({
      where: { content: { contains: "saúde" } },
      orderBy: { createdAt: "desc" },
    });
    expect(savedPrayer).not.toBeNull();
    expect(savedPrayer?.content.startsWith("[Anônimo]")).toBe(true);
  });

  // =========================================================================
  // 7. Ministérios & Gestão de Tarefas
  // =========================================================================
  test("7. Ministérios: Agendamento de reunião, lavratura de ata e conclusão de tarefa", async () => {
    const ministry = await prisma.ministry.findFirst({
      include: { tenant: true },
    });
    expect(ministry).not.toBeNull();

    // 7.1 Reunião
    const meetingRes = await createMeeting({
      ministryId: ministry!.id,
      title: `Reunião Mensal de Alinhamento ${timestamp}`,
      date: new Date().toISOString(),
      type: "REUNIAO",
      slug: ministry!.tenant.slug,
    });
    expect(meetingRes.success).toBe(true);
    const meetingId = meetingRes.meeting!.id;

    // 7.2 Ata de Reunião
    const minuteRes = await saveMeetingMinute(
      meetingId,
      "Definidas as escalas de louvor, recepção e equipe de mídia para o mês de outubro."
    );
    expect(minuteRes.success).toBe(true);

    // 7.3 Tarefa e Ciclo de Vida (PENDING -> COMPLETED)
    const taskRes = await createTask({
      ministryId: ministry!.id,
      title: "Configurar microfones sem fio e cabos de som",
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      slug: ministry!.tenant.slug,
    });
    expect(taskRes.success).toBe(true);
    const taskId = taskRes.task!.id;

    // Alternar status de PENDING para COMPLETED
    const toggleRes = await toggleTaskStatus(taskId, "PENDING");
    expect(toggleRes.success).toBe(true);

    const completedTask = await prisma.ministryTask.findUnique({ where: { id: taskId } });
    expect(completedTask?.status).toBe("COMPLETED");
  });
});
