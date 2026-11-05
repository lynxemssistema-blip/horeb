import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const imapHost = process.env.IMAP_HOST || "imap.hostinger.com";
const imapPort = parseInt(process.env.IMAP_PORT || "993", 10);
const imapUser = process.env.IMAP_USER || "suporte@lynxems.com.br";
const imapPass = (process.env.IMAP_PASS || "").trim();

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

/**
 * Filtra estritamente apenas e-mails relacionados ao ecossistema do aplicativo Horeb
 * ou de usuários/congregações cadastrados no app.
 */
function isAppRelatedEmail(
  msg: { from: string; to: string; subject: string; snippet: string; text?: string },
  knownEmailsLower: Set<string>,
  knownNamesLower: string[]
): boolean {
  const combined = `${msg.from} ${msg.to} ${msg.subject} ${msg.snippet} ${msg.text || ""}`.toLowerCase();

  // 1. Menção explícita à plataforma Horeb
  if (combined.includes("horeb")) {
    return true;
  }

  // 2. Palavras-chave transacionais ou de suporte do app
  const appKeywords = [
    "congregação",
    "congregacao",
    "código de segurança",
    "codigo de seguranca",
    "código de verificação",
    "codigo de verificacao",
    "código de recuperação",
    "codigo de recuperacao",
    "redefinir sua senha",
    "recuperação de senha",
    "convite oficial",
    "biblioteca digital",
    "e-book digital",
    "ebook digital",
  ];
  if (appKeywords.some((kw) => combined.includes(kw))) {
    return true;
  }

  // 3. Remetente ou destinatário é um usuário ou e-mail registrado no app Horeb
  for (const email of knownEmailsLower) {
    if (email && email !== imapUser.toLowerCase() && combined.includes(email)) {
      return true;
    }
  }

  // 4. Menção ao nome de alguma congregação cadastrada no Horeb
  for (const name of knownNamesLower) {
    if (name && name.length >= 4 && combined.includes(name)) {
      return true;
    }
  }

  return false;
}

export async function fetchInboxEmails(
  limit = 40,
  filterOptions?: { knownEmails?: string[]; knownChurchNames?: string[] }
): Promise<{
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

  const knownEmailsLower = new Set(
    (filterOptions?.knownEmails || []).map((e) => e.trim().toLowerCase()).filter(Boolean)
  );
  const knownNamesLower = (filterOptions?.knownChurchNames || [])
    .map((n) => n.trim().toLowerCase())
    .filter((n) => n.length >= 4);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    const messages: ParsedEmailMessage[] = [];
    let totalMessages = 0;

    try {
      const mailbox = client.mailbox;
      totalMessages = mailbox ? mailbox.exists : 0;

      if (totalMessages > 0) {
        // Buscar as últimas N mensagens da caixa para filtrar apenas as relacionadas ao Horeb
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
            const candidate: ParsedEmailMessage = {
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
            };

            if (isAppRelatedEmail(candidate, knownEmailsLower, knownNamesLower)) {
              messages.push(candidate);
            }
          } catch (parseErr) {
            const fallbackCandidate: ParsedEmailMessage = {
              id: message.uid.toString(),
              seq: message.seq,
              uid: message.uid,
              from: message.envelope?.from?.[0]?.address || "Desconhecido",
              to: imapUser,
              subject: message.envelope?.subject || "(Sem assunto)",
              date: new Date(message.internalDate || Date.now()).toISOString(),
              snippet: "Conteúdo não pôde ser pré-visualizado.",
            };

            if (isAppRelatedEmail(fallbackCandidate, knownEmailsLower, knownNamesLower)) {
              messages.push(fallbackCandidate);
            }
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    const reversed = messages.reverse();
    // Total exibido passa a refletir exclusivamente as mensagens do app Horeb
    return { success: true, messages: reversed, total: reversed.length };
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
