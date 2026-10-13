import { prisma } from "../lib/prisma";

async function main() {
  console.log("🔍 Verificando tabelas financeiras e MRR...\n");

  const tenants = await prisma.tenant.findMany();
  console.log("Tenants:", tenants.map((t) => ({ id: t.id, name: t.name, status: t.status, monthlyPrice: t.monthlyPrice, asaasSubscriptionId: t.asaasSubscriptionId })));

  const users = await prisma.user.findMany();
  console.log("Users:", users.map((u) => ({ id: u.id, email: u.email, hasToolsSubscription: u.hasToolsSubscription, toolsSubscriptionStatus: u.toolsSubscriptionStatus, toolsAsaasSubscriptionId: u.toolsAsaasSubscriptionId })));

  const transactions = await prisma.transaction.count();
  console.log("Transactions:", transactions);

  const financialAccounts = await (prisma as any).financialAccount?.count() ?? 0;
  console.log("FinancialAccounts:", financialAccounts);

  const financialCategories = await (prisma as any).financialCategory?.count() ?? 0;
  console.log("FinancialCategories:", financialCategories);

  const subscriptionInvoices = await prisma.subscriptionInvoice.count();
  console.log("SubscriptionInvoices (Asaas B2B):", subscriptionInvoices);

  const personalToolInvoices = await (prisma as any).personalToolInvoice.count();
  console.log("PersonalToolInvoices (Asaas B2C):", personalToolInvoices);

  const discountCoupons = await prisma.discountCoupon.count();
  console.log("DiscountCoupons:", discountCoupons);
}

main().finally(() => prisma.$disconnect());
