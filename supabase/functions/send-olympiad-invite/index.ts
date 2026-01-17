import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const payload = (await req.json()) as InvitePayload;
  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    return new Response("SMTP not configured", { status: 500, headers: corsHeaders });
  }

  const smtpClient = new SmtpClient();
  await smtpClient.connectTLS({
    hostname: smtpHost,
    port: smtpPort,
    username: smtpUser,
    password: smtpPass,
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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
