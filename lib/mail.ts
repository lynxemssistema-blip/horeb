import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.hostinger.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
const smtpUser = process.env.SMTP_USER || "suporte@lynxems.com.br";
const smtpPass = process.env.SMTP_PASS || "10207597Rdv*";
const smtpFrom = process.env.SMTP_FROM || `"Horeb Tecnologia" <${smtpUser}>`;

export const mailTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: true, // SSL na porta 465
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export function generateActivationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface SendActivationParams {
  to: string;
  name: string;
  code: string;
  churchName?: string;
}

export async function sendActivationCodeEmail({
  to,
  name,
  code,
  churchName = "Sua Igreja",
}: SendActivationParams) {
  try {
    const info = await mailTransporter.sendMail({
      from: smtpFrom,
      to,
      subject: `Código de Ativação: ${code} • Horeb Aplicativo`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ativação de Conta • Horeb</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #070709; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #070709; padding: 30px 15px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #121216; border-radius: 20px; border: 1px solid rgba(245, 158, 11, 0.25); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
                  
                  <!-- Top Bar Dourada -->
                  <tr>
                    <td height="6" style="background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b);"></td>
                  </tr>

                  <!-- Header com Logo / Título -->
                  <tr>
                    <td style="padding: 35px 35px 20px 35px; text-align: center;">
                      <div style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background-color: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px;">
                        HOREB • APLICATIVO DA IGREJA
                      </div>
                      <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                        Código de Ativação
                      </h1>
                      <p style="margin: 8px 0 0 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
                        Olá, <strong style="color: #ffffff;">${name}</strong>! Confirme seu acesso para entrar na plataforma da congregação <strong>${churchName}</strong>.
                      </p>
                    </td>
                  </tr>

                  <!-- Caixa do Código -->
                  <tr>
                    <td style="padding: 10px 35px 25px 35px; text-align: center;">
                      <div style="background-color: #09090b; border: 2px dashed #f59e0b; border-radius: 16px; padding: 22px 15px; margin: 10px 0;">
                        <span style="display: block; font-size: 11px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                          Seu Código de 6 Dígitos
                        </span>
                        <span style="font-family: 'Courier New', monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #fbbf24; text-shadow: 0 0 15px rgba(245, 158, 11, 0.4);">
                          ${code}
                        </span>
                      </div>
                      <p style="margin: 12px 0 0 0; font-size: 12px; color: #71717a;">
                        ⏳ Este código expira em <strong>15 minutos</strong>. Não o compartilhe com ninguém.
                      </p>
                    </td>
                  </tr>

                  <!-- Instruções Rápidas -->
                  <tr>
                    <td style="padding: 0 35px 30px 35px;">
                      <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; font-size: 12px; color: #d4d4d8; line-height: 1.6;">
                        <strong style="color: #f59e0b;">Como validar:</strong><br>
                        Volte para o aplicativo no seu navegador ou celular e digite o código de 6 dígitos acima para ativar sua conta e liberar o acesso completo.
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #09090b; border-top: 1px solid rgba(255,255,255,0.06); padding: 20px 35px; text-align: center; font-size: 11px; color: #52525b;">
                      Enviado automaticamente por <strong>Horeb Soluções Para Igrejas</strong>.<br>
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

    console.log("E-mail de ativação enviado com sucesso:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Falha ao enviar e-mail via Hostinger SMTP:", error);
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
