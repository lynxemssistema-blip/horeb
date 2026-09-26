import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando o seed do banco de dados...");

  // Limpar dados existentes para evitar duplicidade
  await prisma.transaction.deleteMany();
  await prisma.cellGroup.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // 1. Criar Igreja Matriz (Sede)
  const matriz = await prisma.tenant.create({
    data: {
      name: "Igreja Matriz Sede",
      slug: "matriz",
      primaryColor: "#dc2626", // Vermelho
      logoUrl: "https://images.unsplash.com/photo-1548625361-16a793441094?auto=format&fit=crop&w=200&q=80",
    },
  });

  // 2. Criar Igreja Filial (apontando parentId para a matriz)
  const filial = await prisma.tenant.create({
    data: {
      name: "Igreja Filial Central",
      slug: "filial",
      primaryColor: "#2563eb", // Azul
      parentId: matriz.id,
      logoUrl: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=200&q=80",
    },
  });

  // Criar Usuários para Matriz
  const pastorMatriz = await prisma.user.create({
    data: {
      name: "Pr. Marcos Oliveira",
      email: "marcos@matriz.org",
      role: "PASTOR",
      tenantId: matriz.id,
    },
  });

  const liderMatriz = await prisma.user.create({
    data: {
      name: "Lucas Ferreira",
      email: "lucas@matriz.org",
      role: "LEADER",
      tenantId: matriz.id,
    },
  });

  // Célula na Matriz
  await prisma.cellGroup.create({
    data: {
      name: "Célula Betel (Jovens)",
      leaderId: liderMatriz.id,
      tenantId: matriz.id,
    },
  });

  // Transação na Matriz
  await prisma.transaction.create({
    data: {
      amount: 150.0,
      status: "COMPLETED",
      type: "PIX",
      tenantId: matriz.id,
    },
  });

  // Criar Usuários para Filial
  const pastorFilial = await prisma.user.create({
    data: {
      name: "Pr. André Santos",
      email: "andre@filial.org",
      role: "PASTOR",
      tenantId: filial.id,
    },
  });

  const liderFilial = await prisma.user.create({
    data: {
      name: "Juliana Mendes",
      email: "juliana@filial.org",
      role: "LEADER",
      tenantId: filial.id,
    },
  });

  // Célula na Filial
  await prisma.cellGroup.create({
    data: {
      name: "Célula Esperança (Famílias)",
      leaderId: liderFilial.id,
      tenantId: filial.id,
    },
  });

  // Transação na Filial
  await prisma.transaction.create({
    data: {
      amount: 80.0,
      status: "COMPLETED",
      type: "PIX",
      tenantId: filial.id,
    },
  });

  console.log("✅ Seed concluído com sucesso!");
  console.log(`- Matriz criada: ${matriz.name} (${matriz.slug}) | Cor: ${matriz.primaryColor}`);
  console.log(`- Filial criada: ${filial.name} (${filial.slug}) | Cor: ${filial.primaryColor} | Matriz ID: ${filial.parentId}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
