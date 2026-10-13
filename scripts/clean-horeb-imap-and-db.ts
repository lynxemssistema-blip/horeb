import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "../lib/prisma";

const imapHost = process.env.IMAP_HOST || "imap.hostinger.com";
const imapPort = parseInt(process.env.IMAP_PORT || "993", 10);
const imapUser = process.env.IMAP_USER || "suporte@lynxems.com.br";
const imapPass = process.env.IMAP_PASS || "10207597Rdv*";

async function main() {
  console.log("🧹 Iniciando limpeza completa de Financeiro, MRR e E-mails do Horeb...\n");

  // 1. ZERAR DADOS FINANCEIROS NO BANCO DE DADOS
  console.log("1. Limpando dados financeiros do banco de dados...");
  
  // Limpar todas as faturas e dízimos
  const delTrans = await prisma.transaction.deleteMany();
  console.log(` - Dízimos/Transações excluídas: ${delTrans.count}`);

  const delSubInv = await prisma.subscriptionInvoice.deleteMany();
  console.log(` - Faturas Asaas B2B excluídas: ${delSubInv.count}`);

  const delToolInv = await (prisma as any).personalToolInvoice.deleteMany();
  console.log(` - Faturas Asaas B2C excluídas: ${delToolInv.count}`);

  // Ajustar a Igreja Matriz para status TRIAL e sem faturas falsas
  await prisma.tenant.updateMany({
    where: { slug: "matriz" },
    data: {
      status: "TRIAL",
      monthlyPrice: 0,
      asaasCustomerId: null,
      asaasSubscriptionId: null,
    },
  });
  console.log(" - Igreja Matriz atualizada: status TRIAL, R$ 0,00 MRR.");

  // Ajustar Edson Manoel para não ter assinatura Asaas pendente
  await prisma.user.updateMany({
    where: { email: "edsonmanoel2012@gmail.com" },
    data: {
      hasToolsSubscription: true,
      toolsSubscriptionStatus: "TRIAL",
      toolsAsaasCustomerId: null,
      toolsAsaasSubscriptionId: null,
    } as any,
  });
  console.log(" - Usuário Edson Manoel atualizado: cortesia SuperAdmin sem cobrança fake.");

  // 2. LIMPAR LOGS DE E-MAILS NO BANCO DE DADOS
  console.log("\n2. Limpando logs de e-mails no banco de dados...");
  const delLogs = await prisma.emailLog.deleteMany();
  console.log(` - Logs de e-mails (Entrada/Saída) excluídos do banco: ${delLogs.count}`);

  const delCodes = await prisma.activationCode.deleteMany();
  console.log(` - Códigos de ativação excluídos do banco: ${delCodes.count}`);

  // 3. LIMPAR E-MAILS DO HOREB NA CAIXA DE ENTRADA IMAP (HOSTINGER)
  console.log("\n3. Conectando ao servidor IMAP Hostinger para limpar e-mails do Horeb...");
  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: true,
    auth: {
      user: imapUser,
      pass: imapPass,
    },
    logger: false,
  });

  try {
    await client.connect();
    console.log(" - Conectado com sucesso ao IMAP Hostinger.");
    const lock = await client.getMailboxLock("INBOX");

    try {
      const uidsToDelete: number[] = [];

      for await (const msg of client.fetch("1:*", {
        envelope: true,
        source: true,
        uid: true,
      })) {
        let isHorebRelated = false;
        const subject = msg.envelope?.subject || "";
        const from = msg.envelope?.from?.[0]?.address || "";

        // Identifica e-mails com assunto ou remetente do Horeb
        if (
          subject.toLowerCase().includes("horeb") ||
          subject.toLowerCase().includes("código de segurança") ||
          subject.toLowerCase().includes("test a") ||
          subject.toLowerCase().includes("test b") ||
          from.toLowerCase().includes("horeb")
        ) {
          isHorebRelated = true;
        }

        // Identifica bounces (Undelivered Mail) de domínios horeb.org.br
        if (subject.toLowerCase().includes("undelivered mail") && msg.source) {
          try {
            const parsed = await simpleParser(msg.source as any);
            const body = (parsed.text || "") + (parsed.html || "");
            if (body.includes("horeb") || body.includes("horeb.org.br")) {
              isHorebRelated = true;
            }
          } catch {}
        }

        if (isHorebRelated) {
          console.log(`   -> Marcando para exclusão [UID ${msg.uid}]: ${subject}`);
          uidsToDelete.push(msg.uid);
        }
      }

      if (uidsToDelete.length > 0) {
        console.log(` - Excluindo ${uidsToDelete.length} e-mails do Horeb da caixa de entrada...`);
        // Adiciona flag \Deleted e expurga
        await client.messageFlagsAdd(uidsToDelete, ["\\Deleted"], { uid: true });
        await client.mailboxClose(); // fecha e expurga mensagens marcadas
        console.log(" - E-mails do Horeb expurgados do servidor Hostinger com sucesso!");
      } else {
        console.log(" - Nenhum e-mail restante do Horeb para excluir no IMAP.");
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err: any) {
    console.error(" - Aviso ao processar IMAP:", err.message);
  }

  console.log("\n🎉 LIMPEZA DE FINANCEIRO, MRR E E-MAILS CONCLUÍDA COM SUCESSO!");
}

main()
  .catch((err) => {
    console.error("❌ Erro fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
