import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

function newOpaqueToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, code: "METHOD_NOT_ALLOWED" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ success: false, code: "SERVER_CONFIGURATION_ERROR" }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, code: "INVALID_JSON" }, 400);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const action = String(body.action || "");

  if (action === "start") {
    const forwarded = req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || "unknown";
    const ipHash = await sha256(serviceKey + ":trial-ip:" + forwarded);
    const token = newOpaqueToken();
    const tokenHash = await sha256(token);
    const { data, error } = await admin.rpc("start_public_trial_session", {
      p_token_hash: tokenHash,
      p_ip_hash: ipHash,
    });
    if (error) return json({ success: false, code: "TRIAL_START_FAILED" }, 503);
    if (!data?.success) {
      const limited = data?.code === "TRIAL_START_RATE_LIMITED";
      return json({ success: false, code: data?.code || "TRIAL_START_DENIED" }, limited ? 429 : 400);
    }
    return json({ success: true, trialToken: token, checksRemaining: data.checksRemaining, expiresAt: data.expiresAt });
  }

  if (action === "consume") {
    const token = String(body.trialToken || "");
    if (token.length < 40 || token.length > 100) {
      return json({ success: false, code: "INVALID_TRIAL_TOKEN" }, 400);
    }
    const tokenHash = await sha256(token);
    const { data, error } = await admin.rpc("consume_public_trial_session", {
      p_token_hash: tokenHash,
    });
    if (error) return json({ success: false, code: "TRIAL_CONSUME_FAILED" }, 503);
    if (!data?.success) return json({ success: false, code: data?.code || "TRIAL_UNAVAILABLE" }, 429);
    return json({ success: true, checksRemaining: data.checksRemaining });
  }

  return json({ success: false, code: "UNKNOWN_ACTION" }, 400);
});