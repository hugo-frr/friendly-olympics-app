import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "npm:stripe@13.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type CheckoutPayload = {
  returnUrl?: string;
};

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripePriceId = Deno.env.get("STRIPE_PRICE_ID") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const defaultSiteUrl = Deno.env.get("PUBLIC_SITE_URL") ?? "http://localhost:5173";

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!stripeSecretKey || !stripePriceId || !supabaseUrl || !supabaseServiceRoleKey) {
    return new Response("Missing server configuration", { status: 500 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await req.json().catch(() => ({}))) as CheckoutPayload;
  const siteUrl = payload.returnUrl?.trim() || defaultSiteUrl;

  const { data: subscriptionRow } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  let customerId = subscriptionRow?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.user.email ?? undefined,
      metadata: { user_id: userData.user.id },
    });
    customerId = customer.id;
    await supabase.from("user_subscriptions").upsert({
      user_id: userData.user.id,
      stripe_customer_id: customerId,
      status: "incomplete",
    });
  } else {
    await stripe.customers.update(customerId, {
      metadata: { user_id: userData.user.id },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: `${siteUrl}?checkout=success`,
    cancel_url: `${siteUrl}?checkout=cancel`,
    subscription_data: {
      metadata: { user_id: userData.user.id },
    },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
});
