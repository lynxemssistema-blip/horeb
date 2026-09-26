import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando o seed do banco de dados...");

  // 1. Criar ou Obter Planos Comerciais no Banco
  const defaultPlans = [
    {
      slug: "essencial",
      name: "Essencial",
      subtitle: "Para igrejas pequenas e comunidades em formação",
      badge: null,
      setupPrice: 490,
      monthlyPrice: 149,
      targetAudience: "Até ~150 membros",
      features: JSON.stringify([
        "Cadastro e gestão de membros e visitantes",
        "Área do membro personalizada (PWA no celular)",
        "Mural de comunicados e avisos oficiais",
        "Agenda de cultos e eventos semanais",
        "Pedidos de oração interativos",
        "Conteúdos e devocionais diários",
        "Módulo Dízimos e Ofertas via PIX Instantâneo",
        "Notificações para membros",
        "Painel administrativo para liderança",
        "Suporte técnico via WhatsApp",
      ]),
      highlight: false,
      active: true,
    },
    {
      slug: "gestao",
      name: "Gestão",
      subtitle: "O plano principal para igrejas médias em franco crescimento",
      badge: "MAIS ESCOLHIDO",
      setupPrice: 790,
      monthlyPrice: 249,
      targetAudience: "Igrejas de 150 a 600 membros",
      features: JSON.stringify([
        "TUDO do Plano Essencial, mais:",
        "Gestão completa de Ministérios e Líderes",
        "Células e Pequenos Grupos nos lares",
        "Escalas de equipes, louvor e diaconia",
        "Controle de presença em cultos e células",
        "Gestão de eventos e inscrições",
        "Gestão Financeira completa (entradas, saídas e relatórios)",
        "Segmentação inteligente de membros",
        "Notificações segmentadas por grupos/ministérios",
        "Suporte prioritário ágil",
      ]),
      highlight: true,
      active: true,
    },
    {
      slug: "premium",
      name: "Premium",
      subtitle: "Para igrejas maiores, catedrais e redes com congregações",
      badge: "MULTISSEDE VIP",
      setupPrice: 1290,
      monthlyPrice: 399,
      targetAudience: "Acima de 600 membros ou multissede",
      features: JSON.stringify([
        "TUDO do Plano Gestão, mais:",
        "Múltiplas congregações (Matriz e Filiais integradas)",
        "Gestão avançada de pastores e liderança geral",
        "EBD (Escola Bíblica Dominical) e cursos",
        "Check-in Kids com etiquetas e código de segurança",
        "Relatórios analíticos e auditoria avançada",
        "Múltiplos administradores com permissões granulares",
        "Personalizações exclusivas de marca e cores",
        "Integrações via API e automações",
        "Suporte VIP dedicado com gerente de conta",
      ]),
      highlight: false,
      active: true,
    },
  ];

  for (const p of defaultPlans) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  // 2. Criar ou Obter Igreja Matriz (Sede)
  const matriz = await prisma.tenant.upsert({
    where: { slug: "matriz" },
    update: {
      plan: "GESTAO",
      status: "ACTIVE",
      monthlyPrice: 249,
      setupPrice: 790,
    },
    create: {
      name: "Igreja Matriz Sede",
      slug: "matriz",
      primaryColor: "#dc2626", // Vermelho
      plan: "GESTAO",
      status: "ACTIVE",
      monthlyPrice: 249,
      setupPrice: 790,
      logoUrl:
        "https://images.unsplash.com/photo-1548625361-16a793441094?auto=format&fit=crop&w=200&q=80",
    },
  });

  // 3. Criar ou Obter Igreja Filial
  const filial = await prisma.tenant.upsert({
    where: { slug: "filial" },
    update: {
      plan: "ESSENCIAL",
      status: "ACTIVE",
      monthlyPrice: 149,
      setupPrice: 490,
    },
    create: {
      name: "Igreja Filial Central",
      slug: "filial",
      primaryColor: "#2563eb", // Azul
      parentId: matriz.id,
      plan: "ESSENCIAL",
      status: "ACTIVE",
      monthlyPrice: 149,
      setupPrice: 490,
      logoUrl:
        "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=200&q=80",
    },
  });

  // 4. CRIAR SUPER ADMIN MASTER: Edson Manoel
  const superAdminPassword = await bcrypt.hash("10207597Rdv*", 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: "edsonmanoel2012@gmail.com" },
    update: {
      name: "Edson Manoel",
      password: superAdminPassword,
      role: "SUPERADMIN",
      isEmailVerified: true,
      tenantId: matriz.id,
    },
    create: {
      name: "Edson Manoel",
      email: "edsonmanoel2012@gmail.com",
      password: superAdminPassword,
      role: "SUPERADMIN",
      isEmailVerified: true,
      tenantId: matriz.id,
    },
  });
  console.log("👑 Super Admin criado com sucesso:", superAdmin.email);

  // Pastores de Exemplo
  const defaultPassword = await bcrypt.hash("horeb123456", 10);

  await prisma.user.upsert({
    where: { email: "marcos@matriz.org" },
    update: { isEmailVerified: true },
    create: {
      name: "Pr. Marcos Oliveira",
      email: "marcos@matriz.org",
      password: defaultPassword,
      role: "PASTOR",
      isEmailVerified: true,
      tenantId: matriz.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "andre@filial.org" },
    update: { isEmailVerified: true },
    create: {
      name: "Pr. André Santos",
      email: "andre@filial.org",
      password: defaultPassword,
      role: "PASTOR",
      isEmailVerified: true,
      tenantId: filial.id,
    },
  });

  console.log("✅ Seed finalizado com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
