import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

function json(status: number, body: Record<string, unknown>, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}

function securePin(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

serve(async (req: Request) => {
  const configuredOrigin = Deno.env.get("APP_URL") || "";
  const requestOrigin = req.headers.get("origin") || "";
  const allowedOrigin = configuredOrigin && requestOrigin === configuredOrigin ? configuredOrigin : "";
  if (req.method === "OPTIONS") {
    if (!allowedOrigin) return new Response("Origin not allowed", { status: 403 });
    return new Response("ok", { headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    }});
  }
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" }, allowedOrigin || "null");
  if (!allowedOrigin) return json(403, { success: false, error: "Origin is not authorized." }, "null");

  let createdUserId: string | null = null;
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !anonKey || !serviceKey) throw new Error("Server configuration is incomplete.");

    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json(401, { success: false, error: "Authenticated principal session required." }, allowedOrigin);
    }

    const principalClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: principalData, error: principalError } = await principalClient.auth.getUser();
    if (principalError || !principalData.user) {
      return json(401, { success: false, error: "Principal session is invalid." }, allowedOrigin);
    }

    const body = await req.json();
    const role = String(body.role || "");
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    if (!["teacher", "vice_principal", "bursar"].includes(role)) {
      return json(400, { success: false, error: "Unsupported staff role." }, allowedOrigin);
    }
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { success: false, error: "A valid staff name and email are required." }, allowedOrigin);
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name, invited_role: role },
      redirectTo: `${configuredOrigin}/login`,
    });
    if (inviteError || !invite.user) {
      throw new Error(inviteError?.message || "Could not create staff authentication identity.");
    }
    createdUserId = invite.user.id;

    const pin = securePin();
    const { data, error } = await principalClient.rpc("gradifi_create_staff_profile", {
      p_user_id: createdUserId,
      p_role: role,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_pin: pin,
    });
    if (error) throw new Error(error.message);
    if (!data || data.success !== true || !data.profile_id) {
      throw new Error(data?.error || "Staff profile persistence was not confirmed.");
    }

    return json(200, {
      success: true,
      profile_id: data.profile_id,
      user_id: createdUserId,
      full_name: data.full_name,
      email: data.email,
      role,
      pin,
      invitation_sent: true,
    }, allowedOrigin);
  } catch (error) {
    if (createdUserId) {
      const url = Deno.env.get("SUPABASE_URL") || "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (url && serviceKey) {
        const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
        await admin.auth.admin.deleteUser(createdUserId);
      }
    }
    return json(400, { success: false, error: error instanceof Error ? error.message : "Staff provisioning failed." }, allowedOrigin || "null");
  }
});
