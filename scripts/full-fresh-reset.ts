import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fullReset() {
  console.log("=== INICIANDO LIMPEZA TOTAL DO HOREB (START FROM ZERO) ===");

  // 1. Limpeza de conversas e mensagens de IA
  try {
    const dMsgs = await prisma.message.deleteMany({});
    console.log(`- Mensagens deletadas: ${dMsgs.count}`);
    const dConvs = await prisma.conversation.deleteMany({});
    console.log(`- Conversas deletadas: ${dConvs.count}`);
  } catch (e: any) {
    console.log("- Erro ao limpar conversas:", e.message);
  }

  // 2. Limpeza de emails e códigos de ativação
  try {
    const dEmails = await prisma.emailLog.deleteMany({});
    console.log(`- Logs de Email deletados: ${dEmails.count}`);
    const dCodes = await prisma.activationCode.deleteMany({});
    console.log(`- Códigos de Ativação deletados: ${dCodes.count}`);
  } catch (e: any) {
    console.log("- Erro ao limpar emails/códigos:", e.message);
  }

  // 3. Limpeza de transações e faturas financeiras
  try {
    const dTx = await prisma.transaction.deleteMany({});
    console.log(`- Transações deletadas: ${dTx.count}`);
    const dSubInv = await prisma.subscriptionInvoice.deleteMany({});
    console.log(`- Faturas SaaS deletadas: ${dSubInv.count}`);
    const dToolInv = await prisma.personalToolInvoice.deleteMany({});
    console.log(`- Faturas Ferramentas B2C deletadas: ${dToolInv.count}`);
  } catch (e: any) {
    console.log("- Erro ao limpar finanças:", e.message);
  }

  // 4. Limpeza de acessos de usuários
  try {
    const dAccess = await prisma.userChurchAccess.deleteMany({});
    console.log(`- UserChurchAccess deletados: ${dAccess.count}`);
  } catch (e: any) {
    console.log("- Erro ao limpar acessos:", e.message);
  }

  // 5. Limpeza de ministérios, células, orações, eventos
  try {
    await prisma.ministryTask.deleteMany({});
    await prisma.ministryMember.deleteMany({});
    await prisma.ministry.deleteMany({});
    await prisma.cellGroup.deleteMany({});
    await prisma.prayerRequest.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.pastoralAppointment.deleteMany({});
    await prisma.moodCheckIn.deleteMany({});
    await prisma.officialDocument.deleteMany({});
    await prisma.serviceAttendance.deleteMany({});
    await prisma.assemblyVote.deleteMany({});
    console.log("- Tabelas secundárias limpas com sucesso.");
  } catch (e: any) {
    console.log("- Erro em tabelas secundárias:", e.message);
  }

  // 6. Limpeza de TODOS os Usuários (incluindo edsonmanoel2012@gmail.com)
  try {
    const dUsers = await prisma.user.deleteMany({});
    console.log(`- TODOS OS USUÁRIOS DELETADOS: ${dUsers.count}`);
  } catch (e: any) {
    console.log("- Erro ao limpar usuários:", e.message);
  }

  // 7. Limpeza de TODAS as Igrejas / Tenants
  try {
    const dTenants = await prisma.tenant.deleteMany({});
    console.log(`- TODAS AS IGREJAS/TENANTS DELETADAS: ${dTenants.count}`);
  } catch (e: any) {
    console.log("- Erro ao limpar tenants:", e.message);
  }

  // 8. Inicializar catálogo padrão de Ferramentas (PersonalToolsConfig)
  try {
    await prisma.personalToolsConfig.deleteMany({});
    const defaultTools = [
      {
        slug: "instagram-studio",
        title: "Estúdio de Fotos & Instagram Pro",
        badge: "MÓDULO PESSOAL EXCLUSIVO",
        category: "Mídia & Redes",
        icon: "camera",
        description: "Câmera de alta resolução com filtros de cinema para cultos e palcos de louvor, ajustes de iluminação e formatos prontos para postagem no Instagram.",
        monthlyPrice: 19.9,
        annualPrice: 199.0,
        trialDays: 30,
        active: true,
        actionType: "MODAL_INSTAGRAM",
        features: JSON.stringify([
          "Câmera Nativa do Celular & Selfie em Alta Definição",
          "8 Filtros de Cinema Exclusivos (Louvor Vivo, Golden Hour, B&W)",
          "Formatos Oficiais do Instagram: 1:1 Feed, 4:5 Retrato e 9:16 Stories",
          "Ajustes Finos de Iluminação, Contraste, Calor e Vinheta",
          "Selos de Fé e Brasão da Igreja em Alta Resolução",
          "Compartilhamento Direto no Feed ou Stories em 1 Toque"
        ]),
      },
      {
        slug: "ia-sermoes",
        title: "Copiloto IA para Sermões & Esboços",
        badge: "PASTORES & LÍDERES",
        category: "Teologia & Ensino",
        icon: "sparkles",
        description: "Inteligência Artificial bíblica para estruturação de esboços temáticos, referências cruzadas em hebraico/grego e ilustrações para mensagens.",
        monthlyPrice: 29.9,
        annualPrice: 299.0,
        trialDays: 30,
        active: true,
        actionType: "ROUTE",
        routeUrl: "/copiloto",
        features: JSON.stringify([
          "Geração de esboços homiléticos em 3 pontos",
          "Exegese rápida e análise de termos originais",
          "Ilustrações contemporâneas contextualizadas",
          "Exportação direta em PDF e slides"
        ]),
      },
      {
        slug: "banner-designer",
        title: "Designer de Banners & Cultos",
        badge: "COMUNICAÇÃO",
        category: "Mídia & Redes",
        icon: "palette",
        description: "Crie artes de culto, convites de conferência e escalas de louvor com tipografia evangélica premium e fundos cinematográficos.",
        monthlyPrice: 24.9,
        annualPrice: 249.0,
        trialDays: 30,
        active: true,
        actionType: "COMING_SOON",
        features: JSON.stringify([
          "Mais de 100 templates de cultos semanais",
          "Ajuste automático de fotos dos preletores",
          "Formatos Stories (9:16) e Feed (1:1)",
          "Exportação em alta definição sem marca d'água"
        ]),
      },
      {
        slug: "certificados-digitais",
        title: "Certificados & Carteirinhas Digitais",
        badge: "SECRETARIA VIP",
        category: "Administração",
        icon: "shieldCheck",
        description: "Emissão de carteirinhas de membro com QR Code seguro de autenticação e certificados oficiais de batismo e consagração.",
        monthlyPrice: 19.9,
        annualPrice: 199.0,
        trialDays: 30,
        active: true,
        actionType: "COMING_SOON",
        features: JSON.stringify([
          "Carteirinha digital no celular (Apple Wallet / PWA)",
          "QR Code de validação de membros em convenções",
          "Certificados de Batismo e Apresentação de Crianças",
          "Assinatura digital do Pastor Presidente"
        ]),
      }
    ];

    for (const tool of defaultTools) {
      await prisma.personalToolsConfig.create({ data: tool });
    }
    console.log("- Catálogo de 4 Ferramentas B2C criado com sucesso.");
  } catch (e: any) {
    console.log("- Erro ao criar catálogo de ferramentas:", e.message);
  }

  console.log("=== RESET COMPLETO CONCLUÍDO COM SUCESSO! APP PRONTO DO ZERO ===");
}

fullReset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
