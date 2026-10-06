import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🔄 Iniciando correções de acesso e banco...");

  // 1. Atualizar slugs de 'feker' para 'deker'
  const dekerMatriz = await prisma.tenant.findUnique({ where: { slug: "feker" } });
  if (dekerMatriz) {
    await prisma.tenant.update({
      where: { id: dekerMatriz.id },
      data: { slug: "deker" },
    });
    console.log("✅ Slug da Deker Matriz atualizado: feker -> deker");
  }

  const dekerFilial = await prisma.tenant.findUnique({ where: { slug: "feker-filial" } });
  if (dekerFilial) {
    await prisma.tenant.update({
      where: { id: dekerFilial.id },
      data: { slug: "deker-filial" },
    });
    console.log("✅ Slug da Deker Filial atualizado: feker-filial -> deker-filial");
  }

  // 2. Senha padrão segura para quem não tem senha e para o Pastor Luan
  const defaultHash = await bcrypt.hash("horeb123456", 10);

  // Define senha para Pastor Luan explicitamente
  await prisma.user.updateMany({
    where: { email: "luandemattos102030@gmail.com" },
    data: {
      password: defaultHash,
      isEmailVerified: true,
      role: "ADMIN",
    },
  });
  console.log("✅ Conta de Pastor Luan atualizada (senha: horeb123456, verificada: true)");

  // 3. Atualizar todos os usuários sem senha
  const usersWithoutPass = await prisma.user.findMany({
    where: { OR: [{ password: null }, { password: "" }] },
  });

  for (const u of usersWithoutPass) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        password: defaultHash,
        isEmailVerified: true,
      },
    });
    console.log(`✅ Senha definida para: ${u.email}`);
  }

  // 4. Marcar todos os usuários existentes como verificados
  await prisma.user.updateMany({
    data: { isEmailVerified: true },
  });
  console.log("✅ Todos os usuários marcados como verificados.");

  // 5. Exibir conferência final
  const allTenants = await prisma.tenant.findMany({
    select: { name: true, slug: true },
  });
  console.log("⛪ Igrejas disponíveis:", allTenants);

  const allUsers = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      role: true,
      isEmailVerified: true,
      tenant: { select: { slug: true } },
    },
  });
  console.log(`👥 Total de ${allUsers.length} usuários prontos e habilitados.`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao ajustar contas:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
