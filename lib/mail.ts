import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.hostinger.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
const smtpUser = process.env.SMTP_USER || "suporte@lynxems.com.br";
const smtpPass = process.env.SMTP_PASS || "10207597Rdv*";
const smtpFrom = process.env.SMTP_FROM || `"Horeb - Lynx EMS" <${smtpUser}>`;

export const mailTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // SSL
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
  },
});

export function generateActivationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getEmailLogoSrc(churchSlug?: string, logoUrl?: string | null): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";

  if (logoUrl && (logoUrl.startsWith("http://") || logoUrl.startsWith("https://"))) {
    return logoUrl;
  }

  if (churchSlug) {
    return `${baseUrl}/api/icon/${churchSlug}`;
  }

  return `${baseUrl}/logo-horeb.png`;
}

interface SendActivationParams {
  to: string;
  name: string;
  code: string;
  churchName?: string;
  churchSlug?: string;
  primaryColor?: string;
  logoUrl?: string;
}

export async function sendActivationCodeEmail({
  to,
  name,
  code,
  churchName = "Sua Igreja",
  churchSlug,
  primaryColor = "#f59e0b",
  logoUrl,
}: SendActivationParams) {
  try {
    const cleanTo = to.trim().toLowerCase();
    const logoSrc = getEmailLogoSrc(churchSlug, logoUrl);
    const messageId = `<horeb-auth-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@lynxems.com.br>`;

    // Versão em Texto Puro (Essencial para não cair no SPAM do Gmail/Outlook)
    const plainText = [
      `Olá, ${name}!`,
      ``,
      `Seu código de verificação para acesso à congregação ${churchName} é:`,
      `${code}`,
      ``,
      `Este código é válido por 15 minutos e garante a segurança do seu acesso ao aplicativo Horeb.`,
      `Se você não solicitou este código, por favor desconsidere este e-mail.`,
      ``,
      `Atenciosamente,`,
      `Equipe Horeb • Lynx EMS Sistemas`,
      `suporte@lynxems.com.br`,
    ].join("\n");

    const info = await mailTransporter.sendMail({
      from: smtpFrom,
      to: cleanTo,
      replyTo: "suporte@lynxems.com.br",
      subject: `${code} é seu código de segurança Horeb`,
      text: plainText,
      headers: {
        "Message-ID": messageId,
        "X-Mailer": "Horeb Mail Engine 1.0",
        "X-Priority": "3",
        "Auto-Submitted": "auto-generated",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Código de Segurança • Horeb</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 30px 15px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                  
                  <!-- Top Bar Dourada Horeb -->
                  <tr>
                    <td height="5" style="background: ${primaryColor};"></td>
                  </tr>

                  <!-- Header -->
                  <tr>
                    <td style="padding: 28px 32px 18px 32px; text-align: center;">
                      <!-- Logo da Igreja -->
                      <div style="text-align: center; margin-bottom: 14px;">
                        <img 
                          src="${logoSrc}" 
                          alt="${churchName}" 
                          width="64" 
                          height="64" 
                          style="width: 64px; height: 64px; border-radius: 16px; object-fit: cover; border: 2px solid #e4e4e7; background-color: #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.08); display: inline-block; vertical-align: middle;" 
                        />
                      </div>

                      <div style="display: inline-block; padding: 4px 14px; border-radius: 9999px; background-color: #fef3c7; color: #b45309; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                        ${churchName.toUpperCase()} • SEGURANÇA E ACESSO
                      </div>
                      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #09090b; letter-spacing: -0.3px;">
                        Código de Verificação
                      </h1>
                      <p style="margin: 10px 0 0 0; font-size: 14px; color: #52525b; line-height: 1.5;">
                        Olá, <strong>${name}</strong>! Use o código abaixo para validar seu acesso na congregação <strong>${churchName}</strong>.
                      </p>
                    </td>
                  </tr>

                  <!-- Caixa do Código -->
                  <tr>
                    <td style="padding: 10px 32px 25px 32px; text-align: center;">
                      <div style="background-color: #fafafa; border: 2px dashed #f59e0b; border-radius: 14px; padding: 20px 10px; margin: 5px 0;">
                        <span style="display: block; font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                          Seu Código de 6 Dígitos
                        </span>
                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #d97706;">
                          ${code}
                        </span>
                      </div>
                      <p style="margin: 12px 0 0 0; font-size: 12px; color: #71717a;">
                        Este código expira em <strong>15 minutos</strong>. Não compartilhe com terceiros.
                      </p>
                    </td>
                  </tr>

                  <!-- Instruções -->
                  <tr>
                    <td style="padding: 0 32px 25px 32px;">
                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; font-size: 12px; color: #475569; line-height: 1.5;">
                        <strong style="color: #0f172a;">Onde digitar:</strong><br>
                        Retorne à tela do aplicativo no seu navegador ou smartphone e digite o código de 6 dígitos acima para liberar seu acesso imediatamente.
                      </div>
                    </td>
                  </tr>

                  <!-- Footer Oficial com Identificação de Empresa -->
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #e4e4e7; padding: 18px 32px; text-align: center; font-size: 11px; color: #71717a; line-height: 1.6;">
                      Mensagem transacional automática enviada por <strong>Horeb Soluções para Igrejas</strong>.<br>
                      Desenvolvido e operado por <strong>Lynx EMS Sistemas</strong> • <a href="mailto:suporte@lynxems.com.br" style="color: #d97706; text-decoration: none;">suporte@lynxems.com.br</a><br>
                      Se você não solicitou este cadastro, ignore esta mensagem.
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("E-mail de verificação enviado com sucesso:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Falha ao enviar e-mail via Hostinger SMTP:", error);
    return { success: false, error: error.message };
  }
}

export async function sendMemberInvitationEmail({
  to,
  recipientName,
  churchName,
  churchSlug,
  roleName,
  inviteUrl,
  primaryColor = "#f59e0b",
  logoUrl,
}: {
  to: string;
  recipientName?: string;
  churchName: string;
  churchSlug?: string;
  roleName: string;
  inviteUrl: string;
  primaryColor?: string;
  logoUrl?: string;
}) {
  try {
    const cleanTo = to.trim().toLowerCase();
    const logoSrc = getEmailLogoSrc(churchSlug, logoUrl);
    const messageId = `<horeb-invite-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@lynxems.com.br>`;
    const greeting = recipientName ? `Olá, ${recipientName}!` : "A paz do Senhor!";

    const plainText = [
      `${greeting}`,
      ``,
      `Você foi convidado pela liderança da congregação ${churchName} para fazer parte da comunidade no aplicativo Horeb.`,
      `Perfil atribuído: ${roleName}`,
      ``,
      `Para ativar seu acesso, clique no link abaixo ou cole no seu navegador:`,
      `${inviteUrl}`,
      ``,
      `Atenciosamente,`,
      `Equipe Horeb • Lynx EMS Sistemas`,
      `suporte@lynxems.com.br`,
    ].join("\n");

    const info = await mailTransporter.sendMail({
      from: smtpFrom,
      to: cleanTo,
      replyTo: "suporte@lynxems.com.br",
      subject: `Convite para participar da ${churchName} no aplicativo Horeb`,
      text: plainText,
      headers: {
        "Message-ID": messageId,
        "X-Mailer": "Horeb Mail Engine 1.0",
        "X-Priority": "3",
        "Auto-Submitted": "auto-generated",
      },
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Convite de Membresia • Horeb</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 30px 15px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                  
                  <!-- Top Bar Colorida -->
                  <tr>
                    <td height="5" style="background: ${primaryColor};"></td>
                  </tr>

                  <!-- Header com Título -->
                  <tr>
                    <td style="padding: 28px 32px 18px 32px; text-align: center;">
                      <!-- Logo da Igreja -->
                      <div style="text-align: center; margin-bottom: 14px;">
                        <img 
                          src="${logoSrc}" 
                          alt="${churchName}" 
                          width="64" 
                          height="64" 
                          style="width: 64px; height: 64px; border-radius: 16px; object-fit: cover; border: 2px solid #e4e4e7; background-color: #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.08); display: inline-block; vertical-align: middle;" 
                        />
                      </div>

                      <div style="display: inline-block; padding: 4px 14px; border-radius: 9999px; background-color: #fef3c7; color: #b45309; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                        CONVITE OFICIAL • REDE DE IGREJAS
                      </div>
                      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #09090b; letter-spacing: -0.3px;">
                        Você Foi Convidado!
                      </h1>
                      <p style="margin: 10px 0 0 0; font-size: 14px; color: #52525b; line-height: 1.6;">
                        ${greeting} A liderança da congregação <strong>${churchName}</strong> convidou você para fazer parte do aplicativo Horeb.
                      </p>
                    </td>
                  </tr>

                  <!-- Card de Detalhes do Perfil -->
                  <tr>
                    <td style="padding: 10px 32px 25px 32px;">
                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; text-align: center;">
                        <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                          Seu Perfil de Acesso Atribuído
                        </span>
                        <span style="display: inline-block; padding: 5px 14px; border-radius: 9999px; background-color: #e0f2fe; color: #0369a1; font-size: 13px; font-weight: 800; border: 1px solid #bae6fd;">
                          ${roleName}
                        </span>
                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
                          Congregação: <strong style="color: #0f172a;">${churchName}</strong>
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Botão de Ação -->
                  <tr>
                    <td style="padding: 0 32px 30px 32px; text-align: center;">
                      <a href="${inviteUrl}" target="_blank" style="display: inline-block; width: 85%; padding: 13px 20px; background-color: #f59e0b; color: #000000; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(245,158,11,0.3); text-transform: uppercase; letter-spacing: 0.5px;">
                        Acessar Minha Igreja Agora &rarr;
                      </a>
                      <p style="margin: 14px 0 0 0; font-size: 11px; color: #71717a;">
                        Ou copie e cole este link no seu navegador:<br>
                        <a href="${inviteUrl}" style="color: #d97706; word-break: break-all;">${inviteUrl}</a>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #e4e4e7; padding: 18px 32px; text-align: center; font-size: 11px; color: #71717a; line-height: 1.6;">
                      Horeb • Desenvolvido e Gerenciado por <strong>Lynx EMS Sistemas</strong>.<br>
                      Plataforma Oficial de Tecnologia e Gestão Eclesial • <a href="mailto:suporte@lynxems.com.br" style="color: #d97706; text-decoration: none;">suporte@lynxems.com.br</a>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("E-mail de convite enviado com sucesso:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Falha ao enviar e-mail de convite:", error);
    return { success: false, error: error.message };
  }
}

export async function sendTicketPurchaseEmail({
  to,
  eventName,
  eventDate,
  eventLocation,
  churchName,
  churchSlug,
  primaryColor = "#f59e0b",
  logoUrl,
  tickets,
}: {
  to: string;
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  churchName: string;
  churchSlug?: string;
  primaryColor?: string;
  logoUrl?: string;
  tickets: Array<{
    id: string;
    guestName: string;
  }>;
}) {
  try {
    const cleanTo = to.trim().toLowerCase();
    const logoSrc = getEmailLogoSrc(churchSlug, logoUrl);
    const messageId = `<horeb-ticket-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@lynxems.com.br>`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://horeb.lynxems.com.br";
    const walletUrl = churchSlug ? `${baseUrl}/${churchSlug}/meus-ingressos` : `${baseUrl}`;

    const plainText = [
      `Confirmação de Ingressos • ${churchName}`,
      ``,
      `Sua compra/inscrição para o evento "${eventName}" foi confirmada com sucesso!`,
      eventDate ? `Data do Evento: ${eventDate}` : "",
      eventLocation ? `Local: ${eventLocation}` : "",
      ``,
      `Ingressos emitidos (${tickets.length}):`,
      ...tickets.map((t, i) => `${i + 1}. ${t.guestName} - Código: ${t.id}`),
      ``,
      `Acesse sua carteira digital para visualizar os ingressos e QR Codes no aplicativo:`,
      `${walletUrl}`,
      ``,
      `Atenciosamente,`,
      `Equipe Horeb • Lynx EMS Sistemas`,
      `suporte@lynxems.com.br`,
    ].filter(Boolean).join("\n");

    const ticketsHtml = tickets
      .map(
        (t, i) => `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
            Ingresso #${i + 1}
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
            ${t.guestName}
          </div>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(t.id)}" alt="QR Code" width="140" height="140" style="display: block; margin: 10px auto; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff;" />
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 13px; font-weight: 700; color: #b45309; margin-top: 6px; word-break: break-all;">
            ${t.id}
          </div>
        </div>
      `
      )
      .join("");

    const info = await mailTransporter.sendMail({
      from: smtpFrom,
      to: cleanTo,
      replyTo: "suporte@lynxems.com.br",
      subject: `Ingressos Confirmados: ${eventName} • ${churchName}`,
      text: plainText,
      headers: {
        "Message-ID": messageId,
        "X-Mailer": "Horeb Mail Engine 1.0",
        "X-Priority": "3",
        "Auto-Submitted": "auto-generated",
      },
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ingressos Confirmados • Horeb</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 30px 15px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                  
                  <!-- Top Bar Colorida -->
                  <tr>
                    <td height="5" style="background: ${primaryColor};"></td>
                  </tr>

                  <!-- Header com Título -->
                  <tr>
                    <td style="padding: 28px 32px 14px 32px; text-align: center;">
                      <!-- Logo da Igreja -->
                      <div style="text-align: center; margin-bottom: 14px;">
                        <img 
                          src="${logoSrc}" 
                          alt="${churchName}" 
                          width="64" 
                          height="64" 
                          style="width: 64px; height: 64px; border-radius: 16px; object-fit: cover; border: 2px solid #e4e4e7; background-color: #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.08); display: inline-block; vertical-align: middle;" 
                        />
                      </div>

                      <div style="display: inline-block; padding: 4px 14px; border-radius: 9999px; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; border: 1px solid #a7f3d0;">
                        INGRESSO OFICIAL CONFIRMADO
                      </div>
                      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #09090b; letter-spacing: -0.3px;">
                        ${eventName}
                      </h1>
                      <p style="margin: 8px 0 0 0; font-size: 13px; color: #52525b; line-height: 1.5;">
                        Congregação: <strong>${churchName}</strong>
                        ${eventDate ? `<br>Data: <strong>${eventDate}</strong>` : ""}
                        ${eventLocation ? `<br>Local: <strong>${eventLocation}</strong>` : ""}
                      </p>
                    </td>
                  </tr>

                  <!-- Ingressos Emitidos -->
                  <tr>
                    <td style="padding: 10px 32px 20px 32px;">
                      <div style="font-size: 12px; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                        Seus Ingressos (${tickets.length}):
                      </div>
                      ${ticketsHtml}
                      <p style="margin: 10px 0 0 0; font-size: 12px; color: #71717a; text-align: center;">
                        Apresente o QR Code na entrada do evento para validação rápida pela portaria.
                      </p>
                    </td>
                  </tr>

                  <!-- Botão de Ação -->
                  <tr>
                    <td style="padding: 0 32px 30px 32px; text-align: center;">
                      <a href="${walletUrl}" target="_blank" style="display: inline-block; width: 85%; padding: 13px 20px; background-color: #f59e0b; color: #000000; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(245,158,11,0.3); text-transform: uppercase; letter-spacing: 0.5px;">
                        Acessar Carteira de Ingressos &rarr;
                      </a>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #e4e4e7; padding: 18px 32px; text-align: center; font-size: 11px; color: #71717a; line-height: 1.6;">
                      Horeb Eventos • Desenvolvido e Gerenciado por <strong>Lynx EMS Sistemas</strong>.<br>
                      Plataforma Oficial de Tecnologia e Gestão Eclesial • <a href="mailto:suporte@lynxems.com.br" style="color: #d97706; text-decoration: none;">suporte@lynxems.com.br</a>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("E-mail de ingressos enviado com sucesso:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Falha ao enviar e-mail de ingressos:", error);
    return { success: false, error: error.message };
  }
}

export async function testSmtpConnection() {
  try {
    await mailTransporter.verify();
    return { success: true, message: "Conexão com smtp.hostinger.com:465 OK!" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

