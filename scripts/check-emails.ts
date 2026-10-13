import { prisma } from "../lib/prisma";
import { fetchInboxEmails } from "../lib/imap";

async function main() {
  console.log("🔍 Verificando logs de e-mails e caixa de entrada...\n");

  const emailLogs = await prisma.emailLog.findMany();
  console.log(`Logs de e-mail no Banco (EmailLog): ${emailLogs.length}`);
  emailLogs.forEach((l) => console.log(` - [${l.type}] ${l.to}: ${l.subject}`));

  const activationCodes = await prisma.activationCode.findMany();
  console.log(`\nCódigos de ativação no Banco (ActivationCode): ${activationCodes.length}`);

  try {
    const imapRes = await fetchInboxEmails(20);
    console.log(`\nMensagens na Caixa de Entrada IMAP (Hostinger): ${imapRes.total || 0}`);
    if (imapRes.messages && imapRes.messages.length > 0) {
      imapRes.messages.forEach((m) => console.log(` - UID ${m.uid} | De: ${m.from} | Assunto: ${m.subject}`));
    }
  } catch (err) {
    console.error("Erro ao verificar IMAP:", err);
  }
}

main().finally(() => prisma.$disconnect());
