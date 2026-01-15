import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

type InvitePayload = {
  olympiadTitle: string;
  invitedEmail: string;
  invitedBy?: string | null;
};

const smtpHost = Deno.env.get("SMTP_HOST") ?? "";
const smtpPort = Number(Deno.env.get("SMTP_PORT") ?? "587");
const smtpUser = Deno.env.get("SMTP_USER") ?? "";
const smtpPass = Deno.env.get("SMTP_PASS") ?? "";
const smtpFrom = Deno.env.get("SMTP_FROM") ?? "";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = (await req.json()) as InvitePayload;
  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    return new Response("SMTP not configured", { status: 500 });
  }

  const smtpClient = new SMTPClient({
    connection: {
      hostname: smtpHost,
      port: smtpPort,
      tls: true,
      auth: {
        username: smtpUser,
        password: smtpPass,
      },
    },
  });

  const from = smtpFrom;
  const invitedBy = payload.invitedBy ?? "Un organisateur";

  const subject = `Invitation olympiade: ${payload.olympiadTitle}`;
  const body = [
    `Bonjour,`,
    ``,
    `${invitedBy} vous a invite a rejoindre l'olympiade "${payload.olympiadTitle}".`,
    `Connectez-vous a l'application pour accepter l'invitation.`,
    ``,
    `A bientot !`,
  ].join("\n");

  await smtpClient.send({
    from,
    to: payload.invitedEmail,
    subject,
    content: body,
  });
  await smtpClient.close();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
