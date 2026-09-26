import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const imapHost = process.env.IMAP_HOST || "imap.hostinger.com";
const imapPort = parseInt(process.env.IMAP_PORT || "993", 10);
const imapUser = process.env.IMAP_USER || "suporte@lynxems.com.br";
const imapPass = process.env.IMAP_PASS || "10207597Rdv*";

export interface ParsedEmailMessage {
  id: string;
  seq: number;
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  text?: string;
  html?: string;
}

export async function fetchInboxEmails(limit = 15): Promise<{
  success: boolean;
  messages: ParsedEmailMessage[];
  total?: number;
  error?: string;
}> {
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
    const lock = await client.getMailboxLock("INBOX");
    const messages: ParsedEmailMessage[] = [];
    let totalMessages = 0;

    try {
      const mailbox = client.mailbox;
      totalMessages = mailbox ? mailbox.exists : 0;

      if (totalMessages > 0) {
        // Buscar as últimas N mensagens (do fim para o início)
        const startSeq = Math.max(1, totalMessages - limit + 1);
        const range = `${startSeq}:${totalMessages}`;

        for await (const message of client.fetch(range, {
          envelope: true,
          source: true,
          uid: true,
          internalDate: true,
        })) {
          try {
            if (!message.source) continue;
            const parsed: any = await simpleParser(message.source as any);
            messages.push({
              id: message.uid.toString(),
              seq: message.seq,
              uid: message.uid,
              from: parsed.from?.text || message.envelope?.from?.[0]?.address || "Desconhecido",
              to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map((t: any) => t.text).join(", ") : parsed.to.text) : imapUser,
              subject: parsed.subject || message.envelope?.subject || "(Sem assunto)",
              date: new Date(parsed.date || message.internalDate || Date.now()).toISOString(),
              snippet: (parsed.text || "").slice(0, 160).replace(/\s+/g, " ").trim(),
              text: parsed.text || "",
              html: (parsed.html as string) || "",
            });
          } catch (parseErr) {
            messages.push({
              id: message.uid.toString(),
              seq: message.seq,
              uid: message.uid,
              from: message.envelope?.from?.[0]?.address || "Desconhecido",
              to: imapUser,
              subject: message.envelope?.subject || "(Sem assunto)",
              date: new Date(message.internalDate || Date.now()).toISOString(),
              snippet: "Conteúdo não pôde ser pré-visualizado.",
            });
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    // Inverter para mostrar os mais recentes primeiro
    return { success: true, messages: messages.reverse(), total: totalMessages };
  } catch (err: any) {
    console.error("Erro ao ler IMAP Hostinger:", err);
    return { success: false, messages: [], error: err.message };
  }
}

export async function testImapConnection() {
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
    await client.logout();
    return { success: true, message: "Conexão IMAP com Hostinger (porta 993) estabelecida com sucesso!" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
